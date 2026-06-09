import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Aktualisiert die Supabase-Session bei jeder Anfrage und übernimmt den
 * grundlegenden Zugriffsschutz: Nicht angemeldete Nutzer werden auf die
 * Login-Seite geleitet, angemeldete Nutzer von den Auth-Seiten weg.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // WICHTIG: getUser() validiert das Token serverseitig und erneuert es.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const istAuthSeite = path.startsWith("/auth");

  // Nicht angemeldet + geschützter Bereich -> Login
  if (!user && !istAuthSeite) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("weiter", path);
    return NextResponse.redirect(url);
  }

  // Angemeldet + Login/Registrierung -> Dashboard
  if (
    user &&
    (path === "/auth/login" || path === "/auth/registrieren" || path === "/")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    const redirect = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c.name, c.value));
    return redirect;
  }

  return supabaseResponse;
}
