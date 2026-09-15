import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Erkennt, ob der Request über eine Schüler-Portal-Domain kommt.
 * Konfigurierbar über die Env-Variable PORTAL_HOSTS (kommagetrennt),
 * zusätzlich greifen die üblichen Sub-Domains mein./schueler./portal.
 */
function istPortalHost(host: string): boolean {
  const hostname = host.split(":")[0].toLowerCase();
  const konfiguriert = (process.env.PORTAL_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (konfiguriert.includes(hostname)) return true;
  return /^(mein|schueler|portal)\./.test(hostname);
}

/**
 * Aktualisiert die Supabase-Session bei jeder Anfrage und übernimmt den
 * Zugriffsschutz – getrennt für das Büro (Admin) und das Schüler-Portal.
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

  // Routing-Entscheidung aus der LOKALEN Session – kein Netzwerk-Roundtrip zum
  // Auth-Server pro Navigation. Die eigentliche Sicherheit liegt in der
  // Row-Level-Security der Datenbank: Dort wird das JWT bei jeder Abfrage
  // serverseitig geprüft, ein gefälschtes Cookie bekommt also keine Daten.
  // getSession() erneuert ein abgelaufenes Token bei Bedarf still im Hintergrund.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  // Frisch gesetzte Session-Cookies auf eine andere Antwort übertragen.
  function mitCookies(res: NextResponse): NextResponse {
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c.name, c.value));
    return res;
  }

  const host = request.headers.get("host") ?? "";
  const portal = istPortalHost(host);
  const path = request.nextUrl.pathname;

  // Auf der Portal-Domain werden alle Wurzelpfade intern unter /portal bedient
  // (der Schüler sieht saubere URLs wie mein.fahrschule.de/termine).
  let effektiv = path;
  let umschreiben = false;
  if (portal && !path.startsWith("/portal")) {
    effektiv = `/portal${path === "/" ? "" : path}`;
    umschreiben = true;
  }

  const imPortal = effektiv.startsWith("/portal");
  const portalOeffentlich = effektiv === "/portal/login";

  // ---- Schüler-Portal ----
  if (imPortal) {
    if (!user && !portalOeffentlich) {
      const url = request.nextUrl.clone();
      url.pathname = "/portal/login";
      url.search = "";
      return mitCookies(NextResponse.redirect(url));
    }
    if (user && portalOeffentlich) {
      const url = request.nextUrl.clone();
      url.pathname = "/portal";
      url.search = "";
      return mitCookies(NextResponse.redirect(url));
    }
    if (umschreiben) {
      const url = request.nextUrl.clone();
      url.pathname = effektiv;
      return mitCookies(NextResponse.rewrite(url));
    }
    return supabaseResponse;
  }

  // ---- Büro / Admin (bestehende Logik) ----
  const istAuthSeite = path.startsWith("/auth");

  if (!user && !istAuthSeite) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("weiter", path);
    return mitCookies(NextResponse.redirect(url));
  }

  if (user && (path === "/auth/login" || path === "/auth/registrieren" || path === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return mitCookies(NextResponse.redirect(url));
  }

  return supabaseResponse;
}
