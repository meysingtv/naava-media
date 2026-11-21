"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { dbFehlerText } from "@/lib/db-fehler";
import { basisUrl, getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";

const EINSTELLUNGEN = "/einstellungen?bereich=zahlung";

/**
 * „Mit Stripe verbinden“: legt beim ersten Mal ein eigenes Stripe-Konto für
 * die Fahrschule an (volles Stripe-Dashboard, Gebühren und Rückbuchungen
 * trägt das Konto selbst) und öffnet die Einrichtung bei Stripe.
 */
export async function stripeVerbinden(): Promise<void> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule || kontext.fahrlehrer?.rolle !== "chef") redirect("/dashboard");
  const stripe = getStripe();
  const admin = createAdminClient();
  if (!stripe || !admin) redirect(`${EINSTELLUNGEN}&stripe=fehlt`);

  const schule = kontext.fahrschule;
  let ziel: string;
  try {
    let konto = schule.stripe_konto_id ?? null;
    if (!konto) {
      const website = schule.website && /^https?:\/\//i.test(schule.website) ? schule.website : undefined;
      const account = await stripe.accounts.create({
        country: "DE",
        email: schule.email ?? kontext.fahrlehrer?.email ?? undefined,
        business_profile: { name: schule.name, ...(website ? { url: website } : {}) },
        controller: {
          fees: { payer: "account" },
          losses: { payments: "stripe" },
          requirement_collection: "stripe",
          stripe_dashboard: { type: "full" },
        },
        metadata: { fahrschule_id: schule.id },
      });
      konto = account.id;
      const { error } = await admin.from("fahrschule").update({ stripe_konto_id: konto, stripe_bereit: false }).eq("id", schule.id);
      if (error) throw new Error(dbFehlerText(error.message));
    }

    const link = await stripe.accountLinks.create({
      account: konto,
      type: "account_onboarding",
      refresh_url: `${basisUrl()}${EINSTELLUNGEN}&stripe=erneut`,
      return_url: `${basisUrl()}${EINSTELLUNGEN}&stripe=zurueck`,
    });
    ziel = link.url;
  } catch (e) {
    const meldung = e instanceof Error ? e.message : String(e);
    console.error("[stripe] Verbinden fehlgeschlagen:", meldung);
    redirect(`${EINSTELLUNGEN}&stripe=fehler&grund=${encodeURIComponent(meldung.slice(0, 180))}`);
  }
  redirect(ziel);
}

/** Schalter „Schüler können online bezahlen“. */
export async function onlineZahlungSetzen(aktiv: boolean): Promise<{ error?: string; message?: string }> {
  const kontext = await getKontext();
  if (!kontext?.fahrschule || kontext.fahrlehrer?.rolle !== "chef") {
    return { error: "Nur die Geschäftsführung darf das ändern." };
  }
  if (aktiv && !kontext.fahrschule.stripe_bereit) {
    return { error: "Bitte zuerst die Einrichtung bei Stripe abschließen." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("fahrschule").update({ online_zahlung_aktiv: aktiv }).eq("id", kontext.fahrschule.id);
  if (error) return { error: dbFehlerText(error.message) };

  revalidatePath("/einstellungen");
  return { message: aktiv ? "Deine Schüler können jetzt online bezahlen." : "Online-Zahlung ist ausgeschaltet." };
}
