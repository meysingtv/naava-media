import "server-only";
import Stripe from "stripe";

let client: Stripe | null | undefined;

/**
 * Stripe-Client der Plattform (NUR serverseitig). `null`, solange kein
 * STRIPE_SECRET_KEY gesetzt ist – die Oberfläche zeigt dann einen Hinweis.
 */
export function getStripe(): Stripe | null {
  if (client === undefined) {
    const key = process.env.STRIPE_SECRET_KEY;
    client = key ? new Stripe(key, { appInfo: { name: "FahrschulApp" }, maxNetworkRetries: 2 }) : null;
  }
  return client;
}

/** Öffentliche Basis-URL der Web-App – Ziel der Rücksprünge von Stripe. */
export function basisUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

export function inCent(euro: number): number {
  return Math.round(euro * 100);
}

/**
 * Optionale Plattformgebühr je Zahlung in Prozent (STRIPE_PLATTFORM_GEBUEHR_PROZENT,
 * höchstens 10 %). Ohne Wert geht der volle Betrag an die Fahrschule.
 */
export function plattformGebuehr(cent: number): number | undefined {
  const prozent = Number(process.env.STRIPE_PLATTFORM_GEBUEHR_PROZENT ?? 0);
  if (!Number.isFinite(prozent) || prozent <= 0) return undefined;
  return Math.round((cent * Math.min(prozent, 10)) / 100);
}

const ZAHLART_TEXT: Record<string, string> = {
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  link: "Link",
  card: "Karte",
  sepa_debit: "SEPA-Lastschrift",
  klarna: "Klarna",
  paypal: "PayPal",
  giropay: "giropay",
  sofort: "Sofort",
  eps: "eps",
  revolut_pay: "Revolut Pay",
  amazon_pay: "Amazon Pay",
};

/** Zahlart aus Stripe lesbar machen (card → „Karte“, apple_pay → „Apple Pay“ …). */
export function zahlartText(zahlart: string | null | undefined): string {
  if (!zahlart) return "online";
  return ZAHLART_TEXT[zahlart] ?? zahlart;
}
