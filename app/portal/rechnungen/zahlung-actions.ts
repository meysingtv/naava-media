"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { checkoutStarten } from "@/lib/zahlung/checkout";

/** Portal: Stripe-Bezahlseite für eine Rechnung öffnen – danach zurück zur Rechnung. */
export async function portalBezahlen(formData: FormData): Promise<void> {
  const rechnungId = String(formData.get("rechnung_id") ?? "");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/portal/login");

  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const protokoll = h.get("x-forwarded-proto") ?? (/^(localhost|127\.|192\.168\.)/.test(host) ? "http" : "https");
  const rechnungUrl = `${protokoll}://${host}/portal/rechnungen/${encodeURIComponent(rechnungId)}`;

  const ergebnis = await checkoutStarten({
    userId: user.id,
    email: user.email ?? null,
    rechnungIds: [rechnungId],
    erfolgUrl: (vorgang) => `${rechnungUrl}?zahlung=erfolg&vorgang=${vorgang}`,
    abbruchUrl: () => `${rechnungUrl}?zahlung=abbruch`,
  });
  if ("fehler" in ergebnis) {
    redirect(`/portal/rechnungen/${encodeURIComponent(rechnungId)}?zahlung=fehler&grund=${encodeURIComponent(ergebnis.fehler)}`);
  }
  redirect(ergebnis.url);
}
