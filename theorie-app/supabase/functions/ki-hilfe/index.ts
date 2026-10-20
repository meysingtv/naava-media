// KI-Hilfe für Fahrschul Pro: erklärt eine Prüfungsfrage oder beantwortet freie
// Fragen. Läuft als Supabase Edge Function – der API-Schlüssel bleibt auf dem
// Server und kommt nie in die App.
//
// Einrichten (Anleitung im README, Abschnitt „KI-Hilfe“):
//   Secrets: ANTHROPIC_API_KEY (Schlüssel von console.anthropic.com) und
//            KI_MODELL (Modell-ID von Anthropic)
//   Deploy:  supabase functions deploy ki-hilfe
// Solange etwas davon fehlt, antwortet die App aus dem eigenen Lernstoff.

import Anthropic from "npm:@anthropic-ai/sdk@0.129.0";
import { createClient } from "npm:@supabase/supabase-js@2";

/** Anfragen je Person und Tag. */
const LIMIT_PRO_TAG = 40;
const MAX_NACHRICHTEN = 12;
const MAX_ZEICHEN = 1500;

const KOPF = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function antwort(inhalt: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(inhalt), { status, headers: { ...KOPF, "Content-Type": "application/json" } });
}

const ANLEITUNG = `Du bist die KI-Hilfe in „Fahrschul Pro“, einer App, mit der man sich auf die theoretische Führerscheinprüfung (Klasse B) in Deutschland vorbereitet. Du sprichst die Lernenden mit „du“ an – locker, freundlich und ermutigend, wie ein guter Fahrlehrer.

So antwortest du:
- Auf Deutsch, kurz und klar: meist zwei bis sechs Sätze oder eine kurze Liste, ohne lange Einleitung.
- Mit einfachen Wörtern; Fachbegriffe erklärst du kurz.
- Als einfacher Text: Listenpunkte beginnen mit „• “, wichtige Wörter darfst du mit **fett** markieren. Keine Überschriften mit #, keine Tabellen.
- Nach den Regeln in Deutschland (StVO, Fahrerlaubnis-Verordnung). Bist du dir bei einer Regel nicht sicher, sag das ehrlich.
- Sagt jemand „Ich verstehe diese Frage nicht“, erklärst du, worum es in der Frage geht, welche Regel dahintersteckt und warum die richtigen Antworten richtig und die falschen falsch sind. Zum Schluss ein kurzer Merksatz.
- Du beantwortest auch Fragen, die nichts mit der Prüfungsfrage oder dem Führerschein zu tun haben – hilfsbereit und kurz.`;

type Antwortmoeglichkeit = { text: string; richtig: boolean };

function text(x: unknown, max = MAX_ZEICHEN): string {
  return typeof x === "string" ? x.slice(0, max).trim() : "";
}

/** Die Frage, die gerade offen ist – als Hintergrund für die KI. */
function kontext(roh: unknown): string {
  const f = (roh && typeof roh === "object" ? roh : {}) as Record<string, unknown>;
  const zeilen = [`Die Person übt gerade diese Prüfungsfrage (Thema: ${text(f.thema, 80) || "unbekannt"}):`, `„${text(f.text, 600)}“`];
  const bild = text(f.bild, 200);
  if (bild) zeilen.push(`Zur Frage gehört ein Bild: ${bild}.`);
  const antworten = Array.isArray(f.antworten) ? (f.antworten as Antwortmoeglichkeit[]).slice(0, 6) : [];
  if (antworten.length) {
    zeilen.push("Antworten:");
    antworten.forEach((a, i) => zeilen.push(`${i + 1}. ${text(a?.text, 300)} – ${a?.richtig === true ? "richtig" : "falsch"}`));
  }
  const loesung = text(f.loesung, 80);
  if (loesung) zeilen.push(`Richtige Lösung: ${loesung}`);
  const erklaerung = text(f.erklaerung, 800);
  if (erklaerung) zeilen.push(`Erklärung aus der App: ${erklaerung}`);
  const gewaehlt = text(f.gewaehlt, 400);
  if (gewaehlt) zeilen.push(`Die Person hat geantwortet: ${gewaehlt}`);
  return zeilen.join("\n");
}

/** Verlauf aus der App: abwechselnd Person und KI, beginnt und endet mit der Person. */
function nachrichten(roh: unknown): Anthropic.Beta.BetaMessageParam[] {
  const liste = (Array.isArray(roh) ? roh : [])
    .map((m) => ({ role: m?.rolle === "assistant" ? ("assistant" as const) : ("user" as const), content: text(m?.text) }))
    .filter((m) => m.content)
    .slice(-MAX_NACHRICHTEN);
  while (liste.length && liste[0].role !== "user") liste.shift();
  return liste;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: KOPF });
  if (req.method !== "POST") return antwort({ fehler: "methode" }, 405);

  const schluessel = Deno.env.get("ANTHROPIC_API_KEY");
  const modell = Deno.env.get("KI_MODELL");
  const url = Deno.env.get("SUPABASE_URL");
  const dienst = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!schluessel || !modell || !url || !dienst) {
    console.error("KI-Hilfe: ANTHROPIC_API_KEY oder KI_MODELL fehlt (Edge Function Secrets).");
    return antwort({ fehler: "nicht_eingerichtet" }, 503);
  }

  // Nur angemeldete Nutzer – geprüft mit ihrem eigenen Zugangs-Token.
  const admin = createClient(url, dienst, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: nutzer } = await admin.auth.getUser(token);
  const uid = nutzer.user?.id;
  if (!uid) return antwort({ fehler: "anmelden" }, 401);

  // Tageslimit (Tabelle lern_limit aus schema.sql)
  const seit = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: zaehlFehler } = await admin.from("lern_limit").select("user_id", { count: "exact", head: true }).eq("user_id", uid).eq("art", "ki_hilfe").gt("zeit", seit);
  if (zaehlFehler) {
    console.error("KI-Hilfe: Tageslimit nicht prüfbar", zaehlFehler.message);
    return antwort({ fehler: "nicht_eingerichtet" }, 503);
  }
  if ((count ?? 0) >= LIMIT_PRO_TAG) return antwort({ fehler: "limit" }, 429);

  const eingang = await req.json().catch(() => null);
  const verlauf = nachrichten(eingang?.verlauf);
  if (!verlauf.length || verlauf[verlauf.length - 1].role !== "user") return antwort({ fehler: "eingabe" }, 400);

  await admin.from("lern_limit").insert({ user_id: uid, art: "ki_hilfe" });
  await admin.from("lern_limit").delete().eq("user_id", uid).lt("zeit", seit);

  const client = new Anthropic({ apiKey: schluessel, timeout: 40_000, maxRetries: 1 });
  try {
    const r = await client.beta.messages.create({
      model: modell,
      max_tokens: 4000,
      // Lehnt das Modell aus Sicherheitsgründen ab, springt serverseitig ein anderes ein.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" },
      cache_control: { type: "ephemeral" },
      system: [
        { type: "text", text: ANLEITUNG },
        { type: "text", text: kontext(eingang?.frage) },
      ],
      messages: verlauf,
    });

    console.log(JSON.stringify({ ki: "antwort", ein: r.usage.input_tokens, aus: r.usage.output_tokens, cache: r.usage.cache_read_input_tokens ?? 0, stopp: r.stop_reason }));
    if (r.stop_reason === "refusal") return antwort({ text: "Dazu kann ich leider nichts sagen. Frag mich gern etwas anderes!" });
    const inhalt = r.content
      .flatMap((b) => (b.type === "text" ? [b.text] : []))
      .join("")
      .trim();
    if (!inhalt) return antwort({ fehler: "leer" }, 502);
    return antwort({ text: r.stop_reason === "max_tokens" ? `${inhalt} …` : inhalt });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError || e instanceof Anthropic.InternalServerError || e instanceof Anthropic.APIConnectionError) {
      console.error("KI-Hilfe: Anthropic gerade nicht erreichbar", e.message);
      return antwort({ fehler: "ausgelastet" }, 502);
    }
    if (e instanceof Anthropic.APIError) {
      // 401/403: Schlüssel falsch, 404: KI_MODELL unbekannt, 400: Anfrage oder Guthaben
      console.error("KI-Hilfe: Anfrage abgelehnt – ANTHROPIC_API_KEY und KI_MODELL prüfen", e.status, e.message);
      return antwort({ fehler: "nicht_eingerichtet" }, 503);
    }
    console.error("KI-Hilfe: unerwarteter Fehler", e);
    return antwort({ fehler: "unbekannt" }, 500);
  }
});
