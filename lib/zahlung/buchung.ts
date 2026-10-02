import "server-only";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getStripe, zahlartText } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Vorgang = {
  id: string;
  fahrschule_id: string;
  rechnung_ids: string[];
  status: string;
  stripe_session_id: string | null;
};

/** Heutiges Datum in Deutschland (YYYY-MM-DD) – für Buchungs- und Zahldatum. */
function heuteBerlin(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
}

/**
 * Vorgang zur Checkout-Sitzung – nur wenn die Sitzung von uns stammt und das
 * Ereignis vom Stripe-Konto genau dieser Fahrschule kommt. Eine andere
 * verbundene Fahrschule kann so keine fremden Rechnungen als bezahlt melden.
 */
async function vorgangZurSitzung(admin: SupabaseClient, sitzung: Stripe.Checkout.Session, konto: string | undefined): Promise<Vorgang | null> {
  const id = sitzung.metadata?.vorgang_id ?? sitzung.client_reference_id;
  if (!id || !konto) return null;

  const { data: vorgang } = await admin
    .from("zahlungsvorgang")
    .select("id, fahrschule_id, rechnung_ids, status, stripe_session_id")
    .eq("id", id)
    .maybeSingle<Vorgang>();
  if (!vorgang) return null;
  if (vorgang.stripe_session_id && vorgang.stripe_session_id !== sitzung.id) return null;

  const { data: schule } = await admin.from("fahrschule").select("stripe_konto_id").eq("id", vorgang.fahrschule_id).maybeSingle();
  if (!schule?.stripe_konto_id || schule.stripe_konto_id !== konto) return null;
  return vorgang;
}

/** Tatsächlich genutzte Zahlart (Apple Pay, Karte, Lastschrift …) – nur zur Anzeige. */
async function zahlartLesen(stripe: Stripe, paymentIntent: string | null, konto: string): Promise<string | null> {
  if (!paymentIntent) return null;
  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntent, { expand: ["latest_charge"] }, { stripeAccount: konto });
    const charge = intent.latest_charge && typeof intent.latest_charge === "object" ? intent.latest_charge : null;
    const details = charge?.payment_method_details;
    return details?.card?.wallet?.type ?? details?.type ?? null;
  } catch {
    return null;
  }
}

/**
 * Zahlung verbuchen: Eingang je Rechnung in public.zahlung, Rechnungen auf
 * „bezahlt“, Vorgang abschließen. Jeder Schritt ist wiederholbar – schickt
 * Stripe das Ereignis erneut, entsteht keine Doppelbuchung.
 */
async function verbuchen(stripe: Stripe, admin: SupabaseClient, sitzung: Stripe.Checkout.Session, konto: string) {
  const vorgang = await vorgangZurSitzung(admin, sitzung, konto);
  if (!vorgang) return;

  const paymentIntent = typeof sitzung.payment_intent === "string" ? sitzung.payment_intent : (sitzung.payment_intent?.id ?? null);
  const zahlart = await zahlartLesen(stripe, paymentIntent, konto);
  const heute = heuteBerlin();

  const { data: rechnungen, error: rechnungFehler } = await admin
    .from("rechnung")
    .select("id, schueler_id, betrag_brutto")
    .in("id", vorgang.rechnung_ids);
  if (rechnungFehler) throw new Error(rechnungFehler.message);

  const { data: gebucht } = await admin.from("zahlung").select("rechnung_id").eq("zahlungsvorgang_id", vorgang.id);
  const schonGebucht = new Set((gebucht ?? []).map((z) => z.rechnung_id as string));
  const neu = (rechnungen ?? [])
    .filter((r) => !schonGebucht.has(r.id))
    .map((r) => ({
      fahrschule_id: vorgang.fahrschule_id,
      schueler_id: r.schueler_id,
      rechnung_id: r.id,
      betrag: r.betrag_brutto,
      datum: heute,
      art: "online",
      notiz: `Online bezahlt über Stripe (${zahlartText(zahlart)})`,
      zahlungsvorgang_id: vorgang.id,
    }));
  if (neu.length > 0) {
    const { error } = await admin.from("zahlung").insert(neu);
    if (error && error.code !== "23505") throw new Error(error.message);
  }

  const { error: statusFehler } = await admin
    .from("rechnung")
    .update({ status: "bezahlt", bezahlt_am: heute, mahnstufe: 0 })
    .in("id", vorgang.rechnung_ids);
  if (statusFehler) throw new Error(statusFehler.message);

  const { error: vorgangFehler } = await admin
    .from("zahlungsvorgang")
    .update({
      status: "bezahlt",
      bezahlt_am: new Date().toISOString(),
      stripe_session_id: sitzung.id,
      stripe_payment_intent: paymentIntent,
      zahlart,
      fehler: null,
    })
    .eq("id", vorgang.id);
  if (vorgangFehler) throw new Error(vorgangFehler.message);
}

async function statusSetzen(
  admin: SupabaseClient,
  sitzung: Stripe.Checkout.Session,
  konto: string,
  status: "in_pruefung" | "fehlgeschlagen" | "abgebrochen",
  nurAus?: string[],
) {
  const vorgang = await vorgangZurSitzung(admin, sitzung, konto);
  if (!vorgang || vorgang.status === "bezahlt") return;
  if (nurAus && !nurAus.includes(vorgang.status)) return;
  await admin.from("zahlungsvorgang").update({ status, stripe_session_id: sitzung.id }).eq("id", vorgang.id).neq("status", "bezahlt");
}

/**
 * Fragt den Stand eines Vorgangs direkt bei Stripe ab und verbucht ihn – beim
 * Rücksprung von der Bezahlseite. So ist die Rechnung sofort bezahlt, auch wenn
 * der Webhook noch unterwegs oder (lokal) nicht eingerichtet ist. Gebucht wird
 * nur, was Stripe selbst als bezahlt meldet. Gibt den aktuellen Status zurück.
 */
export async function vorgangAbgleichen(vorgangId: string): Promise<string | null> {
  const stripe = getStripe();
  const admin = createAdminClient();
  if (!stripe || !admin || !UUID.test(vorgangId)) return null;

  const { data: vorgang } = await admin
    .from("zahlungsvorgang")
    .select("id, fahrschule_id, status, stripe_session_id")
    .eq("id", vorgangId)
    .maybeSingle<{ id: string; fahrschule_id: string; status: string; stripe_session_id: string | null }>();
  if (!vorgang) return null;
  if (vorgang.status === "bezahlt" || !vorgang.stripe_session_id) return vorgang.status;

  const { data: schule } = await admin.from("fahrschule").select("stripe_konto_id").eq("id", vorgang.fahrschule_id).maybeSingle();
  const konto: string | null = schule?.stripe_konto_id ?? null;
  if (!konto) return vorgang.status;

  try {
    const sitzung = await stripe.checkout.sessions.retrieve(vorgang.stripe_session_id, undefined, { stripeAccount: konto });
    if (sitzung.status !== "complete") return vorgang.status;
    if (sitzung.payment_status === "paid") {
      await verbuchen(stripe, admin, sitzung, konto);
      return "bezahlt";
    }
    await statusSetzen(admin, sitzung, konto, "in_pruefung");
    return "in_pruefung";
  } catch (e) {
    console.error("[zahlung] Abgleich fehlgeschlagen:", e instanceof Error ? e.message : e);
    return vorgang.status;
  }
}

/** Verarbeitet ein geprüftes Stripe-Ereignis. Wirft bei Datenbankfehlern (Stripe versucht es dann erneut). */
export async function stripeEreignisVerarbeiten(event: Stripe.Event, stripe: Stripe, admin: SupabaseClient) {
  const konto = event.account;

  switch (event.type) {
    case "checkout.session.completed": {
      if (!konto) return;
      const sitzung = event.data.object;
      // Lastschrift & Co.: Der Schüler hat abgeschlossen, das Geld kommt erst in einigen Tagen.
      if (sitzung.payment_status === "paid") await verbuchen(stripe, admin, sitzung, konto);
      else await statusSetzen(admin, sitzung, konto, "in_pruefung");
      return;
    }
    case "checkout.session.async_payment_succeeded":
      if (konto) await verbuchen(stripe, admin, event.data.object, konto);
      return;
    case "checkout.session.async_payment_failed":
      if (konto) await statusSetzen(admin, event.data.object, konto, "fehlgeschlagen");
      return;
    case "checkout.session.expired":
      if (konto) await statusSetzen(admin, event.data.object, konto, "abgebrochen", ["offen"]);
      return;
    case "account.updated": {
      const account = event.data.object;
      await admin.from("fahrschule").update({ stripe_bereit: Boolean(account.charges_enabled) }).eq("stripe_konto_id", account.id);
      return;
    }
    default:
      return;
  }
}
