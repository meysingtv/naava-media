import { NextResponse } from "next/server";

import { rateLimit } from "@/lib/rate-limit";
import { deliverLead } from "@/lib/mail";
import { validateDemo } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // IP für Rate-Limit ermitteln (hinter Proxy/Vercel über x-forwarded-for)
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const limit = rateLimit(`demo:${ip}`, 5, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Zu viele Anfragen. Bitte versuche es in einer Minute erneut." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
  }

  const result = validateDemo(body);
  if (!result.ok) {
    // Honeypot ausgelöst -> für Bots wie Erfolg aussehen lassen
    if (result.errors._bot) return NextResponse.json({ ok: true });
    return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
  }

  try {
    const delivered = await deliverLead(result.value);
    if (!delivered.ok) {
      return NextResponse.json({ ok: false, error: "Anfrage konnte nicht zugestellt werden. Bitte versuche es später erneut oder ruf uns an." }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Es ist ein Fehler aufgetreten. Bitte versuche es später erneut." }, { status: 500 });
  }
}
