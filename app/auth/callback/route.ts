import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/**
 * Schließt E-Mail-Logins ab und leitet weiter. Unterstützt zwei Varianten:
 *  - token_hash + type  -> verifyOtp (Einladung, Passwort-Reset, Bestätigung;
 *    funktioniert auch geräteübergreifend, da kein Code-Verifier nötig ist)
 *  - code               -> exchangeCodeForSession (OAuth / selber Browser)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const weiterParam = searchParams.get("weiter") ?? searchParams.get("next") ?? "/dashboard";
  const weiter = weiterParam.startsWith("/") ? weiterParam : "/dashboard";

  const supabase = createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${weiter}`);
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${weiter}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?fehler=bestaetigung`);
}
