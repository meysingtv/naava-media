import "server-only";

import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Fahrschule } from "@/lib/types";

export type StripeStatus = {
  /** Stripe-Schlüssel und Service-Role sind auf dem Server hinterlegt. */
  serverBereit: boolean;
  webhookBereit: boolean;
  migrationFehlt: boolean;
  kontoId: string | null;
  /** Stripe erlaubt Zahlungen (charges_enabled). */
  bereit: boolean;
  /** Schalter „Schüler können online bezahlen“. */
  aktiv: boolean;
};

/** Stand der Stripe-Verbindung – gleicht während der Einrichtung mit Stripe ab. */
export async function stripeStatusLaden(fahrschule: Fahrschule): Promise<StripeStatus> {
  const stripe = getStripe();
  const admin = createAdminClient();
  const status: StripeStatus = {
    serverBereit: Boolean(stripe && admin),
    webhookBereit: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    migrationFehlt: fahrschule.online_zahlung_aktiv === undefined,
    kontoId: fahrschule.stripe_konto_id ?? null,
    bereit: Boolean(fahrschule.stripe_bereit),
    aktiv: Boolean(fahrschule.online_zahlung_aktiv),
  };
  if (!stripe || !admin || !status.kontoId || status.bereit) return status;

  try {
    const konto = await stripe.accounts.retrieve(status.kontoId);
    if (konto.charges_enabled) {
      status.bereit = true;
      await admin.from("fahrschule").update({ stripe_bereit: true }).eq("id", fahrschule.id);
    }
  } catch (e) {
    console.error("[stripe] Konto nicht abrufbar:", e instanceof Error ? e.message : e);
  }
  return status;
}
