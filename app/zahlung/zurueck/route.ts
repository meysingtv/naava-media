import { NextResponse, type NextRequest } from "next/server";

export const dynamic = "force-dynamic";

/** Erlaubte Rücksprünge in die Schüler-App (eigenes Schema oder Expo Go). */
const APP_RUECKSPRUNG = /^(fahrbar-schueler|exps?):\/\//i;

/**
 * Rücksprung von der Stripe-Bezahlseite. Kommt der Schüler aus der App,
 * geht es direkt zurück in die App (das Bezahlfenster schließt sich dabei);
 * sonst zeigt eine kleine Seite das Ergebnis.
 */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const ergebnis = params.get("ergebnis") === "erfolg" ? "erfolg" : "abbruch";
  const vorgang = (params.get("vorgang") ?? "").replace(/[^0-9a-f-]/gi, "");
  const ziel = params.get("ziel");

  if (ziel && APP_RUECKSPRUNG.test(ziel)) {
    const trenner = ziel.includes("?") ? "&" : "?";
    return NextResponse.redirect(`${ziel}${trenner}ergebnis=${ergebnis}&vorgang=${vorgang}`, 302);
  }

  const erfolg = ergebnis === "erfolg";
  const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${erfolg ? "Zahlung abgeschlossen" : "Zahlung abgebrochen"}</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #F1F5FB; color: #0F172A;
         font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 360px; margin: 24px; padding: 32px 28px; text-align: center; background: #fff; border-radius: 22px;
         box-shadow: 0 10px 30px rgba(30, 58, 138, 0.08); }
  .symbol { width: 64px; height: 64px; margin: 0 auto 16px; border-radius: 50%; display: grid; place-items: center;
            font-size: 32px; color: #fff; background: ${erfolg ? "#12A150" : "#64748B"}; }
  h1 { margin: 0 0 8px; font-size: 22px; }
  p { margin: 0; color: #64748B; }
</style>
</head>
<body>
<main>
  <div class="symbol">${erfolg ? "&#10003;" : "&#10005;"}</div>
  <h1>${erfolg ? "Danke für deine Zahlung!" : "Zahlung abgebrochen"}</h1>
  <p>${erfolg ? "Die Bestätigung erscheint gleich in deiner App und im Portal." : "Es wurde nichts abgebucht. Du kannst jederzeit neu starten."} Du kannst dieses Fenster schließen.</p>
</main>
</body>
</html>`;
  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
