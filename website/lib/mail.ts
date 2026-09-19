import type { DemoLead } from "@/lib/validation";

/**
 * Zustellung einer Demo-Anfrage.
 *
 * Adapter-Struktur, damit du die Persistenz frei wählen kannst:
 *  - Ist RESEND_API_KEY gesetzt, wird die Anfrage per Resend-API als E-Mail
 *    an DEMO_RECIPIENT_EMAIL gesendet (keine zusätzliche Abhängigkeit nötig).
 *  - Sonst wird die Anfrage serverseitig geloggt (Fallback für lokale
 *    Entwicklung). An dieser Stelle kannst du stattdessen eine Datenbank,
 *    ein CRM oder SMTP (z. B. via nodemailer) anbinden – siehe README.
 *
 * Es werden niemals Secrets im Browser oder in Fehlermeldungen ausgegeben.
 */
export async function deliverLead(lead: DemoLead): Promise<{ ok: boolean; via: "resend" | "log" }> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.DEMO_RECIPIENT_EMAIL;
  const from = process.env.DEMO_FROM_EMAIL || "FahrschulApp <onboarding@resend.dev>";

  const zeilen = [
    `Name: ${lead.name}`,
    `Fahrschule: ${lead.fahrschule}`,
    `Ort: ${lead.ort}`,
    `E-Mail: ${lead.email}`,
    `Telefon: ${lead.telefon}`,
    `Anzahl Fahrlehrer: ${lead.fahrlehrer}`,
    lead.nachricht ? `Nachricht: ${lead.nachricht}` : "",
  ].filter(Boolean);

  if (key && to) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [to],
          reply_to: lead.email,
          subject: `Neue Demo-Anfrage – ${lead.fahrschule}`,
          text: zeilen.join("\n"),
        }),
      });
      if (!res.ok) {
        console.error("[demo] Resend-Fehler:", res.status);
        return { ok: false, via: "resend" };
      }
      // Optionale Eingangsbestätigung an den Absender (best effort)
      void fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [lead.email],
          subject: "Deine Demo-Anfrage bei FahrschulApp",
          text: `Hallo ${lead.name},\n\ndanke für deine Anfrage – wir melden uns zeitnah persönlich, um einen Demo-Termin abzustimmen.\n\nViele Grüße\nDein FahrschulApp-Team`,
        }),
      }).catch(() => {});
      return { ok: true, via: "resend" };
    } catch (err) {
      console.error("[demo] Zustellung fehlgeschlagen:", err instanceof Error ? err.message : "unbekannt");
      return { ok: false, via: "resend" };
    }
  }

  // Fallback: serverseitig protokollieren (hier später DB/CRM anschließen)
  console.info("[demo] Neue Anfrage (kein Mailversand konfiguriert):\n" + zeilen.join("\n"));
  return { ok: true, via: "log" };
}
