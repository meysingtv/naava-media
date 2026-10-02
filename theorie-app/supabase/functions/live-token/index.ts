// Live-Stream in Clips: gibt Zugänge für LiveKit aus. Nur der Inhaber der App
// darf senden, alle anderen (auch Gäste) nur zuschauen. Die LiveKit-Schlüssel
// bleiben auf dem Server und kommen nie in die App.
//
// Einrichten (Anleitung im README, Abschnitt „Live-Stream“):
//   Secrets: LIVEKIT_URL (wss://…livekit.cloud), LIVEKIT_API_KEY und
//            LIVEKIT_API_SECRET (alle drei aus cloud.livekit.io → Settings → API Keys)
//   Deploy:  supabase functions deploy live-token --no-verify-jwt
//            (Gäste schauen ohne Konto zu; wer senden will, wird hier geprüft.)

import { AccessToken } from "npm:livekit-server-sdk@2.19.1";
import { createClient } from "npm:@supabase/supabase-js@2";

const KOPF = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function antwort(inhalt: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(inhalt), { status, headers: { ...KOPF, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: KOPF });
  if (req.method !== "POST") return antwort({ fehler: "methode" }, 405);

  const livekitUrl = Deno.env.get("LIVEKIT_URL");
  const schluessel = Deno.env.get("LIVEKIT_API_KEY");
  const geheim = Deno.env.get("LIVEKIT_API_SECRET");
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const dienst = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!livekitUrl || !schluessel || !geheim || !url || !anon || !dienst) {
    console.error("Live: LIVEKIT_URL, LIVEKIT_API_KEY oder LIVEKIT_API_SECRET fehlt (Edge Function Secrets).");
    return antwort({ fehler: "nicht_eingerichtet" }, 503);
  }

  const eingang = await req.json().catch(() => null);
  const senden = eingang?.rolle === "senden";
  const admin = createClient(url, dienst, { auth: { persistSession: false, autoRefreshToken: false } });

  // Wer fragt? Gäste schicken nur den öffentlichen Schlüssel – fürs Zuschauen reicht das.
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  let uid: string | null = null;
  if (jwt && jwt !== anon) {
    const { data } = await admin.auth.getUser(jwt);
    uid = data.user?.id ?? null;
  }

  if (senden) {
    if (!uid) return antwort({ fehler: "anmelden" }, 401);
    // Inhaber-Prüfung mit dem Zugang der Person selbst (wie in der App).
    const ich = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: inhaber } = await ich.rpc("lern_ist_inhaber");
    if (inhaber !== true) return antwort({ fehler: "kein_inhaber" }, 403);

    const { data: live } = await admin
      .from("lern_live")
      .select("id, raum")
      .neq("status", "beendet")
      .order("erstellt_am", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!live) return antwort({ fehler: "kein_live" }, 404);

    const zugang = new AccessToken(schluessel, geheim, { identity: `gastgeber-${uid}`, ttl: "8h" });
    zugang.addGrant({ room: live.raum, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true });
    return antwort({ url: livekitUrl, token: await zugang.toJwt(), live: live.id });
  }

  // Zuschauen: nur, wenn gerade ein Live läuft.
  const { data: aktuell } = await admin.rpc("lern_live_aktuell");
  const liveId = (aktuell as { id?: string } | null)?.id;
  if (!liveId) return antwort({ fehler: "kein_live" }, 404);
  const { data: live } = await admin.from("lern_live").select("raum").eq("id", liveId).maybeSingle();
  if (!live) return antwort({ fehler: "kein_live" }, 404);

  const zugang = new AccessToken(schluessel, geheim, { identity: uid ? `z-${uid}` : `g-${crypto.randomUUID()}`, ttl: "6h" });
  // Zuschauer senden kein Bild und keinen Ton – nur Herzen (Datennachrichten).
  zugang.addGrant({ room: live.raum, roomJoin: true, canPublish: false, canSubscribe: true, canPublishData: true });
  return antwort({ url: livekitUrl, token: await zugang.toJwt(), live: liveId });
});
