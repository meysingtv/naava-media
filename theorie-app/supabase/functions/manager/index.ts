// Manager (Web-Panel /manager): Der Inhaber der App legt Zugänge an, ändert
// Rolle, Klasse und Fahrlehrer, pausiert, sperrt oder löscht Konten. Dafür
// braucht es den Dienstschlüssel von Supabase – der liegt nur hier auf dem
// Server, die App schickt nur ihren Anmelde-Token. Jede Anfrage prüft zuerst,
// ob sie vom Inhaber kommt (lern_ist_inhaber, wie in der App).
//
// Einrichten (Anleitung im README, Abschnitt „Web-Panel & Manager“):
//   SQL:     supabase/update-manager.sql (Abschnitt 26) ausführen
//   Deploy:  supabase functions deploy manager
// Secrets braucht es keine: SUPABASE_URL, SUPABASE_ANON_KEY und
// SUPABASE_SERVICE_ROLE_KEY stellt Supabase selbst bereit.

import { createClient, type User } from "npm:@supabase/supabase-js@2";

const KOPF = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Gesperrt bzw. ohne Enddatum pausiert: Supabase-Sperre über 100 Jahre. */
const FUER_IMMER = "876000h";

const ROLLEN = ["schueler", "fahrlehrer"] as const;
const STATUS = ["aktiv", "pausiert", "gesperrt"] as const;

type Rolle = (typeof ROLLEN)[number];
type Status = (typeof STATUS)[number];

function antwort(inhalt: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(inhalt), { status, headers: { ...KOPF, "Content-Type": "application/json" } });
}

function fehler(text: string, status = 400): Response {
  return antwort({ fehler: text }, status);
}

const istUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
const istEmail = (v: unknown): v is string => typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) && v.length <= 254;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Fehlermeldungen von Supabase Auth auf Deutsch. */
function authFehler(nachricht: string): string {
  if (/already (been )?registered|already exists|duplicate/i.test(nachricht)) return "Für diese E-Mail gibt es schon ein Konto.";
  if (/password/i.test(nachricht) && /(short|weak|least|characters)/i.test(nachricht)) return "Das Passwort ist zu kurz oder zu einfach (mindestens 8 Zeichen).";
  if (/email/i.test(nachricht) && /invalid/i.test(nachricht)) return "Die E-Mail-Adresse ist ungültig.";
  return nachricht;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: KOPF });
  if (req.method !== "POST") return fehler("Nur POST.", 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const dienst = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !dienst) return fehler("Server nicht eingerichtet.", 503);

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!jwt || jwt === anon) return fehler("Bitte melde dich an.", 401);

  const admin = createClient(url, dienst, { auth: { persistSession: false, autoRefreshToken: false } });
  const ich = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: wer } = await admin.auth.getUser(jwt);
  const meineId = wer.user?.id;
  if (!meineId) return fehler("Bitte melde dich an.", 401);
  const { data: inhaber } = await ich.rpc("lern_ist_inhaber");
  if (inhaber !== true) return fehler("Nur für den Inhaber der App.", 403);

  const eingang = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const aktion = eingang?.aktion;

  /** Adressen der Inhaber – diese Konten lassen sich nicht sperren oder löschen. */
  async function inhaberAdressen(): Promise<Set<string>> {
    const { data } = await admin.from("lern_inhaber").select("email");
    return new Set((data ?? []).map((z: { email: string }) => z.email.toLowerCase()));
  }

  async function alleNutzer(): Promise<User[]> {
    const alle: User[] = [];
    for (let seite = 1; seite <= 50; seite++) {
      const { data, error } = await admin.auth.admin.listUsers({ page: seite, perPage: 1000 });
      if (error) throw error;
      alle.push(...data.users);
      if (data.users.length < 1000) break;
    }
    return alle;
  }

  /** Ziel prüfen: nicht man selbst und kein Inhaber-Konto. */
  async function geschuetzt(id: string): Promise<string | null> {
    if (id === meineId) return "Dein eigenes Konto kannst du hier nicht sperren oder löschen.";
    const { data } = await admin.auth.admin.getUserById(id);
    if (!data.user) return "Konto nicht gefunden.";
    if (data.user.email && (await inhaberAdressen()).has(data.user.email.toLowerCase())) return "Inhaber-Konten lassen sich nicht sperren oder löschen.";
    return null;
  }

  async function verwaltungSetzen(id: string, werte: Record<string, unknown>) {
    const { error } = await admin.from("lern_verwaltung").upsert({ user_id: id, ...werte, geaendert_am: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) throw error;
  }

  async function clipRechtSetzen(id: string, an: boolean) {
    if (an) await admin.from("lern_clip_ersteller").upsert({ user_id: id }, { onConflict: "user_id" });
    else await admin.from("lern_clip_ersteller").delete().eq("user_id", id);
  }

  async function fahrlehrerPruefen(id: unknown): Promise<string | null | undefined> {
    if (id === null || id === "") return null;
    if (!istUuid(id)) return undefined;
    const { data } = await admin.from("lern_profil").select("rolle").eq("id", id).maybeSingle();
    return data?.rolle === "fahrlehrer" ? id : undefined;
  }

  try {
    // ------------------------------------------------------------------ Liste
    if (aktion === "liste") {
      const [nutzer, profile, verwaltung, ersteller, adressen] = await Promise.all([
        alleNutzer(),
        admin.from("lern_profil").select("id, name, benutzername, klasse, rolle, avatar_farbe, bild_pfad, xp, serie, fragen_gesamt, fragen_richtig"),
        admin.from("lern_verwaltung").select("user_id, status, pausiert_bis, fahrlehrer_id, notiz, geaendert_am"),
        admin.from("lern_clip_ersteller").select("user_id"),
        inhaberAdressen(),
      ]);
      if (profile.error) throw profile.error;
      if (verwaltung.error) return fehler("Das SQL-Update für den Manager fehlt noch (supabase/update-manager.sql).", 409);

      const profilVon = new Map((profile.data ?? []).map((p: Record<string, unknown>) => [p.id as string, p]));
      const verwVon = new Map((verwaltung.data ?? []).map((v: Record<string, unknown>) => [v.user_id as string, v]));
      const darfClips = new Set((ersteller.data ?? []).map((e: { user_id: string }) => e.user_id));
      const jetzt = Date.now();
      const abgelaufen: string[] = [];

      const liste = nutzer.map((u) => {
        const p = profilVon.get(u.id) ?? {};
        const v = verwVon.get(u.id) ?? {};
        let status = (v.status as Status) ?? "aktiv";
        const bis = (v.pausiert_bis as string | null) ?? null;
        if (status === "pausiert" && bis && Date.parse(bis) <= jetzt) {
          status = "aktiv";
          abgelaufen.push(u.id);
        }
        return {
          id: u.id,
          email: u.email ?? "",
          name: (p.name as string) ?? "",
          benutzername: (p.benutzername as string) ?? "",
          klasse: (p.klasse as string) ?? "B",
          rolle: (p.rolle as Rolle) === "fahrlehrer" ? "fahrlehrer" : "schueler",
          avatar_farbe: (p.avatar_farbe as string) ?? null,
          bild_pfad: (p.bild_pfad as string) ?? null,
          xp: (p.xp as number) ?? 0,
          serie: (p.serie as number) ?? 0,
          fragen_gesamt: (p.fragen_gesamt as number) ?? 0,
          fragen_richtig: (p.fragen_richtig as number) ?? 0,
          status,
          pausiert_bis: status === "pausiert" ? bis : null,
          fahrlehrer_id: (v.fahrlehrer_id as string) ?? null,
          notiz: (v.notiz as string) ?? "",
          darf_clips: darfClips.has(u.id),
          inhaber: !!u.email && adressen.has(u.email.toLowerCase()),
          ich: u.id === meineId,
          anbieter: (u.app_metadata?.provider as string) ?? "email",
          bestaetigt: !!u.email_confirmed_at,
          erstellt_am: u.created_at,
          zuletzt_aktiv: u.last_sign_in_at ?? null,
        };
      });

      // Abgelaufene Pausen aufräumen (die Supabase-Sperre ist dann schon vorbei).
      if (abgelaufen.length) {
        await admin.from("lern_verwaltung").update({ status: "aktiv", pausiert_bis: null }).in("user_id", abgelaufen);
      }
      return antwort({ nutzer: liste });
    }

    // ---------------------------------------------------------------- Anlegen
    if (aktion === "anlegen") {
      const email = text(eingang?.email, 254).toLowerCase();
      const passwort = typeof eingang?.passwort === "string" ? eingang.passwort : "";
      const name = text(eingang?.name, 40);
      const benutzername = text(eingang?.benutzername, 20).toLowerCase().replace(/^@/, "");
      const rolle: Rolle = eingang?.rolle === "fahrlehrer" ? "fahrlehrer" : "schueler";
      const klasse = text(eingang?.klasse, 4).toUpperCase() || "B";
      const notiz = text(eingang?.notiz, 500);
      if (!istEmail(email)) return fehler("Die E-Mail-Adresse ist ungültig.");
      if (passwort.length < 8 || passwort.length > 72) return fehler("Das Passwort braucht 8 bis 72 Zeichen.");
      if (!name) return fehler("Bitte gib einen Namen ein.");
      if (benutzername && !/^[a-z0-9_.]{3,20}$/.test(benutzername)) return fehler("Benutzername: 3–20 Zeichen, nur a–z, 0–9, Punkt und Unterstrich.");
      if (!/^[A-Z0-9]{1,4}$/.test(klasse)) return fehler("Ungültige Führerscheinklasse.");
      const fahrlehrer = rolle === "schueler" ? await fahrlehrerPruefen(eingang?.fahrlehrer_id ?? null) : null;
      if (fahrlehrer === undefined) return fehler("Der gewählte Fahrlehrer wurde nicht gefunden.");

      if (benutzername) {
        const { data: belegt } = await admin.from("lern_profil").select("id").eq("benutzername", benutzername).maybeSingle();
        if (belegt) return fehler("Der Benutzername ist schon vergeben.");
      }

      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: passwort,
        email_confirm: true,
        user_metadata: { name, benutzername: benutzername || undefined, klasse, rolle },
      });
      if (error || !data.user) return fehler(authFehler(error?.message ?? "Konto konnte nicht angelegt werden."));
      const id = data.user.id;

      // Profil legt der Trigger lern_neuer_nutzer an – Rolle und Klasse sicherheitshalber nachziehen.
      await admin.from("lern_profil").update({ rolle, klasse, ...(name ? { name } : {}) }).eq("id", id);
      await verwaltungSetzen(id, { status: "aktiv", pausiert_bis: null, fahrlehrer_id: fahrlehrer, notiz, angelegt_von: meineId });
      if (eingang?.darf_clips === true) await clipRechtSetzen(id, true);
      return antwort({ id });
    }

    // ---------------------------------------------------------------- Ändern
    if (aktion === "aendern") {
      const id = eingang?.id;
      if (!istUuid(id)) return fehler("Konto fehlt.");
      const profil: Record<string, unknown> = {};
      if (eingang?.name !== undefined) {
        const name = text(eingang.name, 40);
        if (!name) return fehler("Bitte gib einen Namen ein.");
        profil.name = name;
      }
      if (eingang?.benutzername !== undefined) {
        const b = text(eingang.benutzername, 20).toLowerCase().replace(/^@/, "");
        if (!/^[a-z0-9_.]{3,20}$/.test(b)) return fehler("Benutzername: 3–20 Zeichen, nur a–z, 0–9, Punkt und Unterstrich.");
        const { data: belegt } = await admin.from("lern_profil").select("id").eq("benutzername", b).neq("id", id).maybeSingle();
        if (belegt) return fehler("Der Benutzername ist schon vergeben.");
        profil.benutzername = b;
      }
      if (eingang?.klasse !== undefined) {
        const k = text(eingang.klasse, 4).toUpperCase();
        if (!/^[A-Z0-9]{1,4}$/.test(k)) return fehler("Ungültige Führerscheinklasse.");
        profil.klasse = k;
      }
      if (eingang?.rolle !== undefined) {
        if (!ROLLEN.includes(eingang.rolle as Rolle)) return fehler("Unbekannte Rolle.");
        profil.rolle = eingang.rolle;
      }
      if (Object.keys(profil).length) {
        const { error } = await admin.from("lern_profil").update(profil).eq("id", id);
        if (error) return fehler(error.message);
      }

      const verw: Record<string, unknown> = {};
      if (eingang?.notiz !== undefined) verw.notiz = text(eingang.notiz, 500);
      if (eingang?.fahrlehrer_id !== undefined) {
        const fl = await fahrlehrerPruefen(eingang.fahrlehrer_id);
        if (fl === undefined) return fehler("Der gewählte Fahrlehrer wurde nicht gefunden.");
        if (fl === id) return fehler("Ein Konto kann nicht sein eigener Fahrlehrer sein.");
        verw.fahrlehrer_id = fl;
      }
      // Wer Fahrlehrer wird, hat selbst keinen Fahrlehrer mehr.
      if (profil.rolle === "fahrlehrer") verw.fahrlehrer_id = null;
      if (Object.keys(verw).length) await verwaltungSetzen(id, verw);

      if (typeof eingang?.darf_clips === "boolean") await clipRechtSetzen(id, eingang.darf_clips);

      const auth: { email?: string; email_confirm?: boolean; password?: string } = {};
      if (eingang?.email !== undefined) {
        const email = text(eingang.email, 254).toLowerCase();
        if (!istEmail(email)) return fehler("Die E-Mail-Adresse ist ungültig.");
        auth.email = email;
        auth.email_confirm = true;
      }
      if (eingang?.passwort !== undefined) {
        const pw = typeof eingang.passwort === "string" ? eingang.passwort : "";
        if (pw.length < 8 || pw.length > 72) return fehler("Das Passwort braucht 8 bis 72 Zeichen.");
        auth.password = pw;
      }
      if (Object.keys(auth).length) {
        const { error } = await admin.auth.admin.updateUserById(id, auth);
        if (error) return fehler(authFehler(error.message));
      }
      return antwort({ ok: true });
    }

    // ---------------------------------------------------------------- Status
    if (aktion === "status") {
      const id = eingang?.id;
      const status = eingang?.status as Status;
      if (!istUuid(id)) return fehler("Konto fehlt.");
      if (!STATUS.includes(status)) return fehler("Unbekannter Status.");
      const schutz = await geschuetzt(id);
      if (schutz) return fehler(schutz, 403);

      let bis: string | null = null;
      let sperre = "none";
      if (status === "gesperrt") sperre = FUER_IMMER;
      if (status === "pausiert") {
        const tage = Number(eingang?.tage);
        if (Number.isFinite(tage) && tage >= 1 && tage <= 365) {
          sperre = `${Math.round(tage * 24)}h`;
          bis = new Date(Date.now() + Math.round(tage) * 86_400_000).toISOString();
        } else {
          sperre = FUER_IMMER;
        }
      }
      // Die Sperre von Supabase verhindert neue Anmeldungen und das Verlängern
      // der Sitzung; die App fragt zusätzlich lern_mein_zugang und meldet ab.
      const { error } = await admin.auth.admin.updateUserById(id, { ban_duration: sperre });
      if (error) return fehler(authFehler(error.message));
      await verwaltungSetzen(id, { status, pausiert_bis: bis });
      return antwort({ ok: true, pausiert_bis: bis });
    }

    // --------------------------------------------------------------- Löschen
    if (aktion === "loeschen") {
      const id = eingang?.id;
      if (!istUuid(id)) return fehler("Konto fehlt.");
      const schutz = await geschuetzt(id);
      if (schutz) return fehler(schutz, 403);
      // Profilbild mit wegräumen; alles andere hängt am Profil und fällt mit.
      const { data: bilder } = await admin.storage.from("lern-profilbilder").list(id);
      if (bilder?.length) await admin.storage.from("lern-profilbilder").remove(bilder.map((b) => `${id}/${b.name}`));
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) return fehler(authFehler(error.message));
      return antwort({ ok: true });
    }

    return fehler("Unbekannte Aktion.");
  } catch (e) {
    console.error("Manager:", e);
    return fehler(e instanceof Error ? e.message : "Unerwarteter Fehler.", 500);
  }
});
