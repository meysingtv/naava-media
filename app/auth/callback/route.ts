import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Tauscht den OAuth-/E-Mail-Code gegen eine Session (E-Mail-Bestätigung,
 * Passwort-Reset) und leitet anschließend weiter.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const weiterParam = searchParams.get("weiter") ?? "/dashboard";
  const weiter = weiterParam.startsWith("/") ? weiterParam : "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${weiter}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?fehler=bestaetigung`);
}
