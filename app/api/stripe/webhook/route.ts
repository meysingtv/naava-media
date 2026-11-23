import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { stripeEreignisVerarbeiten } from "@/lib/zahlung/buchung";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Stripe-Webhook (Connect): bestätigt Zahlungen und den Stand der
 * verbundenen Stripe-Konten. Die Signatur wird mit STRIPE_WEBHOOK_SECRET
 * geprüft (mehrere Secrets kommagetrennt möglich).
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const admin = createAdminClient();
  const secrets = (process.env.STRIPE_WEBHOOK_SECRET ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!stripe || !admin || secrets.length === 0) {
    return NextResponse.json({ fehler: "Stripe ist auf dem Server nicht eingerichtet." }, { status: 503 });
  }

  const signatur = request.headers.get("stripe-signature") ?? "";
  const rohdaten = await request.text();
  let event: Stripe.Event | null = null;
  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(rohdaten, signatur, secret);
      break;
    } catch {
      // nächstes Secret probieren
    }
  }
  if (!event) return NextResponse.json({ fehler: "Ungültige Signatur." }, { status: 400 });

  try {
    await stripeEreignisVerarbeiten(event, stripe, admin);
  } catch (e) {
    console.error("[stripe-webhook]", event.type, e);
    return NextResponse.json({ fehler: "Verarbeitung fehlgeschlagen." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
