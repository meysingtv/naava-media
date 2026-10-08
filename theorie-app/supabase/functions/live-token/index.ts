// Live-Stream in Clips: gibt Zugänge für LiveKit aus. Senden dürfen der Inhaber
// der App und freigeschaltete Creator (jeweils nur in ihr eigenes Live), alle
// anderen (auch Gäste) nur zuschauen. Der Inhaber kann ein Live außerdem sofort
// schließen: Dann wird der LiveKit-Raum gelöscht und alle fliegen raus. Die
// LiveKit-Schlüssel bleiben auf dem Server und kommen nie in die App.
//
// Einrichten (Anleitung im README, Abschnitt „Live-Stream“):
//   Secrets: LIVEKIT_URL (wss://…livekit.cloud), LIVEKIT_API_KEY und
//            LIVEKIT_API_SECRET (alle drei aus cloud.livekit.io → Settings → API Keys)
//   Deploy:  supabase functions deploy live-token --no-verify-jwt
//            (Gäste schauen ohne Konto zu; wer senden will, wird hier geprüft.)

import { AccessToken, RoomServiceClient } from "npm:livekit-server-sdk@2.19.1";
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
  const rolle = eingang?.rolle;
  const admin = createClient(url, dienst, { auth: { persistSession: false, autoRefreshToken: false } });

  // Wer fragt? Gäste schicken nur den öffentlichen Schlüssel – fürs Zuschauen reicht das.
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  let uid: string | null = null;
  if (jwt && jwt !== anon) {
    const { data } = await admin.auth.getUser(jwt);
    uid = data.user?.id ?? null;
  }
  // Rechte-Prüfungen mit dem Zugang der Person selbst (wie in der App).
  const ich = () =>
    createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

  if (rolle === "senden") {
    if (!uid) return antwort({ fehler: "anmelden" }, 401);
    // Ohne SQL-Abschnitt 22 gibt es lern_darf_live noch nicht – dann wie früher nur der Inhaber.
    const darf = await ich().rpc("lern_darf_live");
    const ok = darf.error ? (await ich().rpc("lern_ist_inhaber")).data === true : darf.data === true;
    if (!ok) return antwort({ fehler: "kein_inhaber" }, 403);

    // Nur das eigene, noch nicht beendete Live.
    let suche = await admin
      .from("lern_live")
      .select("id, raum")
      .eq("gastgeber_id", uid)
      .neq("status", "beendet")
      .order("erstellt_am", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (suche.error && darf.error) {
      suche = await admin.from("lern_live").select("id, raum").neq("status", "beendet").order("erstellt_am", { ascending: false }).limit(1).maybeSingle();
    }
    const live = suche.data;
    if (!live) return antwort({ fehler: "kein_live" }, 404);

    const zugang = new AccessToken(schluessel, geheim, { identity: `gastgeber-${uid}`, ttl: "8h" });
    zugang.addGrant({ room: live.raum, roomJoin: true, canPublish: true, canSubscribe: true, canPublishData: true });
    return antwort({ url: livekitUrl, token: await zugang.toJwt(), live: live.id });
  }

  if (rolle === "beenden") {
    // Nur der Inhaber: Live sofort schließen – Status und LiveKit-Raum.
    if (!uid) return antwort({ fehler: "anmelden" }, 401);
    const { data: inhaber } = await ich().rpc("lern_ist_inhaber");
    if (inhaber !== true) return antwort({ fehler: "kein_inhaber" }, 403);
    const liveId = typeof eingang?.live === "string" ? eingang.live : null;
    const raeume: string[] = Array.isArray(eingang?.raeume) ? eingang.raeume.filter((r: unknown) => typeof r === "string") : [];
    if (liveId) {
      const { data: live } = await admin.from("lern_live").select("raum, status").eq("id", liveId).maybeSingle();
      if (live?.raum) raeume.push(live.raum);
      if (live && live.status !== "beendet") {
        await admin.from("lern_live").update({ status: "beendet", beendet_am: new Date().toISOString(), beendet_von: "inhaber" }).eq("id", liveId);
      }
    }
    const raumDienst = new RoomServiceClient(livekitUrl.replace(/^ws/, "http"), schluessel, geheim);
    for (const raum of new Set(raeume)) {
      // Den Raum gibt es nicht (mehr)? Dann ist er schon zu.
      await raumDienst.deleteRoom(raum).catch(() => {});
    }
    return antwort({ ok: true });
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
