import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, inCent, plattformGebuehr } from "@/lib/stripe";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CheckoutErgebnis = { url: string; vorgangId: string } | { fehler: string; status: number };

/**
 * Startet eine Stripe-Checkout-Seite für offene Rechnungen eines Schülers –
 * direkt auf dem Stripe-Konto seiner Fahrschule (das Geld geht an die
 * Fahrschule). Wird von der App (Bearer-Token) und dem Portal (Cookie)
 * genutzt; `userId` muss vorher geprüft sein.
 */
export async function checkoutStarten(opts: {
  userId: string;
  email: string | null;
  rechnungIds: string[];
  erfolgUrl: (vorgangId: string) => string;
  abbruchUrl: (vorgangId: string) => string;
}): Promise<CheckoutErgebnis> {
  const stripe = getStripe();
  const admin = createAdminClient();
  if (!stripe || !admin) return { fehler: "Online-Zahlung ist noch nicht eingerichtet.", status: 503 };

  const ids = Array.from(new Set(opts.rechnungIds)).filter((id) => UUID.test(id)).slice(0, 20);
  if (ids.length === 0) return { fehler: "Keine Rechnung ausgewählt.", status: 400 };

  const { data: schueler } = await admin
    .from("fahrschueler")
    .select("id, fahrschule_id, vorname, nachname, email, sepa_mandat_ref")
    .eq("user_id", opts.userId)
    .maybeSingle();
  if (!schueler) return { fehler: "Dieses Konto ist mit keinem Fahrschüler verknüpft.", status: 403 };
  if (schueler.sepa_mandat_ref) {
    return { fehler: "Deine Rechnungen werden per Lastschrift eingezogen – du musst nichts tun.", status: 409 };
  }

  const { data: schule, error: schulFehler } = await admin
    .from("fahrschule")
    .select("id, name, stripe_konto_id, stripe_bereit, online_zahlung_aktiv")
    .eq("id", schueler.fahrschule_id)
    .maybeSingle();
  if (schulFehler) return { fehler: "Online-Zahlung ist noch nicht eingerichtet (Datenbank-Update 0021 fehlt).", status: 503 };
  if (!schule?.online_zahlung_aktiv || !schule.stripe_bereit || !schule.stripe_konto_id) {
    return { fehler: "Deine Fahrschule bietet noch keine Online-Zahlung an.", status: 409 };
  }
  const konto: string = schule.stripe_konto_id;

  const { data: rechnungen } = await admin
    .from("rechnung")
    .select("id, nummer, betrag_brutto, status")
    .in("id", ids)
    .eq("schueler_id", schueler.id)
    .eq("fahrschule_id", schule.id);
  if (!rechnungen || rechnungen.length !== ids.length) return { fehler: "Rechnung nicht gefunden.", status: 404 };
  if (rechnungen.some((r) => r.status === "bezahlt")) return { fehler: "Diese Rechnung ist schon bezahlt.", status: 409 };

  const cent = rechnungen.reduce((summe, r) => summe + inCent(Number(r.betrag_brutto)), 0);
  if (cent < 50) return { fehler: "Der Betrag ist zu klein für eine Online-Zahlung.", status: 400 };

  // Läuft für diese Rechnungen schon eine Zahlung? Offene Checkout-Seiten
  // schließen, damit niemand aus Versehen zweimal zahlt.
  const { data: laufende } = await admin
    .from("zahlungsvorgang")
    .select("id, status, stripe_session_id")
    .eq("schueler_id", schueler.id)
    .in("status", ["offen", "in_pruefung"])
    .overlaps("rechnung_ids", ids);
  if (laufende?.some((v) => v.status === "in_pruefung")) {
    return { fehler: "Für diese Rechnung läuft schon eine Zahlung – eine Lastschrift wird gerade geprüft.", status: 409 };
  }
  for (const v of laufende ?? []) {
    if (v.stripe_session_id) {
      try {
        await stripe.checkout.sessions.expire(v.stripe_session_id, undefined, { stripeAccount: konto });
      } catch {
        const alt = await stripe.checkout.sessions.retrieve(v.stripe_session_id, undefined, { stripeAccount: konto }).catch(() => null);
        if (alt?.status === "complete") {
          return { fehler: "Diese Rechnung wurde gerade bezahlt – die Bestätigung kommt gleich.", status: 409 };
        }
      }
    }
    await admin.from("zahlungsvorgang").update({ status: "abgebrochen" }).eq("id", v.id).eq("status", "offen");
  }

  const { data: vorgang, error: vorgangFehler } = await admin
    .from("zahlungsvorgang")
    .insert({ fahrschule_id: schule.id, schueler_id: schueler.id, rechnung_ids: ids, betrag: cent / 100 })
    .select("id")
    .single();
  if (vorgangFehler || !vorgang) {
    return { fehler: "Online-Zahlung ist noch nicht eingerichtet (Datenbank-Update 0021 fehlt).", status: 503 };
  }

  const nummern = rechnungen.map((r) => r.nummer).join(", ");
  const gebuehr = plattformGebuehr(cent);
  const email = opts.email ?? schueler.email ?? undefined;

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        locale: "de",
        customer_email: email || undefined,
        client_reference_id: vorgang.id,
        line_items: rechnungen.map((r) => ({
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: inCent(Number(r.betrag_brutto)),
            product_data: { name: `Rechnung ${r.nummer}`, description: `${schule.name} · ${schueler.vorname} ${schueler.nachname}` },
          },
        })),
        payment_intent_data: {
          description: `${schule.name} – Rechnung ${nummern}`,
          metadata: { vorgang_id: vorgang.id, fahrschule_id: schule.id },
          ...(gebuehr ? { application_fee_amount: gebuehr } : {}),
        },
        metadata: { vorgang_id: vorgang.id, fahrschule_id: schule.id },
        success_url: opts.erfolgUrl(vorgang.id),
        cancel_url: opts.abbruchUrl(vorgang.id),
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      },
      { stripeAccount: konto, idempotencyKey: `checkout-${vorgang.id}` },
    );
    if (!session.url) throw new Error("Stripe hat keine Bezahlseite geliefert.");

    await admin.from("zahlungsvorgang").update({ stripe_session_id: session.id }).eq("id", vorgang.id);
    return { url: session.url, vorgangId: vorgang.id };
  } catch (e) {
    const meldung = e instanceof Error ? e.message : String(e);
    console.error("[zahlung] Checkout fehlgeschlagen:", meldung);
    await admin.from("zahlungsvorgang").update({ status: "fehlgeschlagen", fehler: meldung.slice(0, 500) }).eq("id", vorgang.id);
    return { fehler: "Die Zahlung konnte nicht gestartet werden. Bitte versuch es später noch einmal.", status: 502 };
  }
}
