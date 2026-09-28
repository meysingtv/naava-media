import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import type { Session } from "@supabase/supabase-js";

import { dialog } from "@/components/dialog";

import { clipRechteNeuLaden } from "./clips-server";
import { serverVerbunden, supabase } from "./supabase";

/**
 * Eigenes Konto der Lern-App – unabhängig von der Fahrschul-Software.
 * Ohne Server (oder wenn jemand erst schauen will) läuft die App als Gast;
 * der Lernstand bleibt dann auf dem Gerät.
 */

export type Profil = {
  id: string;
  name: string;
  benutzername: string;
  klasse: string;
  avatar_farbe: string;
  xp: number;
  xp_woche: number;
  bundesland: string | null;
  elo: number;
  bild_pfad: string | null;
  /** Fahrschüler oder Fahrlehrer – Fahrlehrer dürfen Clips hochladen. */
  rolle: Rolle;
};

export type Rolle = "schueler" | "fahrlehrer";

type Registrierung = {
  rolle: Rolle;
  vorname: string;
  nachname: string;
  benutzername: string;
  telefon: string | null;
  /** ISO-Datum (JJJJ-MM-TT) oder null. */
  geburtsdatum: string | null;
  email: string;
  passwort: string;
  klasse: string;
  bundesland: string | null;
};

/** Ergebnis von „Mit Google/Apple anmelden“. */
export type SozialErgebnis = { fehler?: string; abgebrochen?: boolean };

type KontoKontext = {
  laedt: boolean;
  session: Session | null;
  profil: Profil | null;
  gast: boolean;
  drin: boolean;
  anzeigeName: string;
  registrieren: (d: Registrierung) => Promise<{ fehler?: string; bestaetigen?: boolean }>;
  /** Anmelden mit E-Mail oder Benutzername. */
  anmelden: (kennung: string, passwort: string) => Promise<string | null>;
  mitGoogle: (rolle?: Rolle) => Promise<SozialErgebnis>;
  mitApple: (rolle?: Rolle) => Promise<SozialErgebnis>;
  rolleSetzen: (rolle: Rolle) => Promise<string | null>;
  passwortVergessen: (email: string) => Promise<string | null>;
  passwortAendern: (neu: string) => Promise<string | null>;
  abmelden: () => Promise<void>;
  alsGast: (name: string) => Promise<void>;
  profilSpeichern: (teil: { name?: string; klasse?: string; bundesland?: string | null }) => Promise<string | null>;
  benutzernameFrei: (name: string) => Promise<boolean | null>;
  benutzernameAendern: (neu: string) => Promise<string | null>;
  profilNeuLaden: () => Promise<void>;
  /** Über den Link „Passwort zurücksetzen“ angemeldet – neues Passwort fällig. */
  passwortNeuFaellig: boolean;
  passwortNeuErledigt: () => void;
};

const GAST = "spur-gast";
/**
 * Links aus Bestätigungs- und Passwort-Mails öffnen die App. In Supabase unter
 * Authentication → URL Configuration → Redirect URLs „spur://**“ eintragen.
 */
const APP_LINK = "spur://";
const Kontext = createContext<KontoKontext | null>(null);

function email(roh: string): string {
  return roh.trim().toLowerCase();
}

function fehlerText(meldung: string): string {
  if (/already registered|already exists/i.test(meldung)) return "Diese E-Mail ist schon registriert. Melde dich einfach an.";
  if (/invalid login credentials/i.test(meldung)) return "E-Mail oder Passwort stimmt nicht. Tippe auf das Auge, um dein Passwort zu prüfen.";
  if (/email not confirmed/i.test(meldung)) return "Bitte bestätige zuerst deine E-Mail-Adresse.";
  if (/password/i.test(meldung) && /(short|least|characters)/i.test(meldung)) return "Das Passwort braucht mindestens 8 Zeichen.";
  if (/valid email|invalid email/i.test(meldung)) return "Bitte gib eine gültige E-Mail-Adresse ein.";
  if (/network|fetch/i.test(meldung)) return "Keine Verbindung. Bitte prüfe dein Internet.";
  if (/rate limit/i.test(meldung)) return "Zu viele Versuche. Bitte warte kurz.";
  if (/provider is not enabled|unsupported provider/i.test(meldung)) return "Diese Anmeldung ist auf dem Server noch nicht eingeschaltet.";
  if (/lern_profil_name_laenge/.test(meldung)) return "Der Name darf höchstens 40 Zeichen lang sein.";
  if (/lern_profil_bundesland_gueltig/.test(meldung)) return "Bitte wähle ein Bundesland aus der Liste.";
  if (/code verifier/i.test(meldung))
    return "Öffne den Link bitte auf dem Handy, auf dem du ihn angefordert hast. War es die Bestätigungs-Mail, ist deine Adresse trotzdem bestätigt – melde dich einfach an.";
  return meldung;
}

/** Parameter eines Rückkehr-Links – aus „?…“ und „#…“ zusammen. */
function linkParameter(url: string): URLSearchParams {
  const frage = url.indexOf("?");
  const raute = url.indexOf("#");
  const abfrage = frage >= 0 ? url.slice(frage + 1, raute > frage ? raute : undefined) : "";
  const anker = raute >= 0 ? url.slice(raute + 1) : "";
  const p = new URLSearchParams(abfrage);
  new URLSearchParams(anker).forEach((wert, name) => p.set(name, wert));
  return p;
}

/**
 * Einmal-Code aus einem Rückkehr-Link einlösen (PKCE). Das klappt nur mit
 * dem Geheimnis, das diese App beim Start der Anmeldung gespeichert hat –
 * fremde oder abgefangene Links melden niemanden an. null = kein Anmelde-Link.
 */
async function codeEinloesen(url: string): Promise<{ fehler: string | null } | null> {
  const p = linkParameter(url);
  const fehler = p.get("error_description");
  if (fehler) return { fehler: fehler.replace(/\+/g, " ") };
  const code = p.get("code");
  if (!code) return null;
  const flowId = p.get("sb_flow_id");
  const { error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
  return { fehler: error ? fehlerText(error.message) : null };
}

export function KontoProvider({ children }: { children: ReactNode }) {
  const [laedt, setLaedt] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [gastName, setGastName] = useState<string | null>(null);
  const [passwortNeuFaellig, setPasswortNeuFaellig] = useState(false);
  /** Läuft gerade eine Anmeldung im Browser? Dann löst imBrowser() den Rückkehr-Link ein. */
  const imBrowserAktiv = useRef(false);

  const profilLaden = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfil(null);
      return;
    }
    const spalten = "id, name, benutzername, klasse, avatar_farbe, xp, xp_woche, bundesland, elo";
    const voll = await supabase.from("lern_profil").select(`${spalten}, bild_pfad, rolle`).eq("id", s.user.id).maybeSingle<Profil>();
    if (!voll.error) {
      setProfil(voll.data ? { ...voll.data, rolle: voll.data.rolle === "fahrlehrer" ? "fahrlehrer" : "schueler" } : null);
      return;
    }
    // Älteres Schema ohne Rolle oder Profilbild: trotzdem das Profil laden.
    const mitBild = await supabase.from("lern_profil").select(`${spalten}, bild_pfad`).eq("id", s.user.id).maybeSingle<Omit<Profil, "rolle">>();
    if (!mitBild.error) {
      setProfil(mitBild.data ? { ...mitBild.data, rolle: "schueler" } : null);
      return;
    }
    const { data } = await supabase.from("lern_profil").select(spalten).eq("id", s.user.id).maybeSingle<Omit<Profil, "bild_pfad" | "rolle">>();
    setProfil(data ? { ...data, bild_pfad: null, rolle: "schueler" } : null);
  }, []);

  useEffect(() => {
    let aktiv = true;
    (async () => {
      try {
        const gespeichert = await AsyncStorage.getItem(GAST);
        if (aktiv && gespeichert) setGastName((JSON.parse(gespeichert) as { name: string }).name);
      } catch {
        // kein Gast gespeichert
      }
      if (serverVerbunden) {
        const { data } = await supabase.auth.getSession();
        if (!aktiv) return;
        setSession(data.session);
        await profilLaden(data.session);
      }
      if (aktiv) setLaedt(false);
    })();

    const { data: abo } = serverVerbunden
      ? supabase.auth.onAuthStateChange((ereignis, s) => {
          setSession(s);
          profilLaden(s);
          // Über den Link „Passwort zurücksetzen“ angemeldet → neues Passwort fällig.
          if (ereignis === "PASSWORD_RECOVERY") setPasswortNeuFaellig(true);
        })
      : { data: null };
    return () => {
      aktiv = false;
      abo?.subscription.unsubscribe();
    };
  }, [profilLaden]);

  const registrieren = useCallback(async (d: Registrierung) => {
    if (!serverVerbunden) return { fehler: "Die App ist noch mit keinem Server verbunden. Du kannst sie vorerst ohne Konto nutzen." };
    const { data, error } = await supabase.auth.signUp({
      email: email(d.email),
      password: d.passwort,
      options: {
        emailRedirectTo: APP_LINK,
        // Telefon, Nachname und Geburtsdatum bleiben privat im Konto (nicht im öffentlichen Profil).
        data: {
          name: d.vorname.trim(),
          nachname: d.nachname.trim(),
          benutzername: d.benutzername.trim().toLowerCase(),
          rolle: d.rolle,
          telefon: d.telefon,
          geburtsdatum: d.geburtsdatum,
          klasse: d.klasse,
          bundesland: d.bundesland,
        },
      },
    });
    if (error) return { fehler: fehlerText(error.message) };
    // Supabase meldet ein schon vorhandenes Konto nicht als Fehler, sondern mit leerer Identitätsliste.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { fehler: "Mit dieser E-Mail gibt es schon ein Konto. Melde dich an – oder setz dein Passwort über „Passwort vergessen?“ zurück." };
    }
    if (!data.session) return { bestaetigen: true };
    await AsyncStorage.removeItem(GAST).catch(() => {});
    setGastName(null);
    return {};
  }, []);

  const anmelden = useCallback(async (kennung: string, passwort: string) => {
    if (!serverVerbunden) return "Die App ist noch mit keinem Server verbunden.";
    let adresse = kennung.trim();
    if (!adresse.includes("@") || adresse.startsWith("@")) {
      // Benutzername: Der Server gibt die E-Mail nur heraus, wenn das Passwort stimmt.
      const { data, error } = await supabase.rpc("lern_anmelde_email", { p_benutzername: adresse, p_passwort: passwort });
      if (error) {
        if (/lern_anmelde_email|schema cache|function/i.test(error.message)) return "Anmelden mit Benutzername ist noch nicht eingerichtet – bitte mit deiner E-Mail anmelden.";
        return fehlerText(error.message);
      }
      if (!data) return "Benutzername oder Passwort stimmt nicht.";
      adresse = String(data);
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email(adresse), password: passwort });
    if (error) return fehlerText(error.message);
    await AsyncStorage.removeItem(GAST).catch(() => {});
    setGastName(null);
    return null;
  }, []);

  /** Nach Google/Apple: Gastmodus beenden und – wenn gewählt – als Fahrlehrer eintragen. */
  const nachSozialAnmeldung = useCallback(async (rolle?: Rolle) => {
    await AsyncStorage.removeItem(GAST).catch(() => {});
    setGastName(null);
    if (rolle === "fahrlehrer") {
      await supabase.rpc("lern_rolle_setzen", { p_rolle: "fahrlehrer" });
      clipRechteNeuLaden();
    }
  }, []);

  /** Anmeldung über die Seite des Anbieters im Browser (Google, Apple außerhalb des iPhones). */
  const imBrowser = useCallback(
    async (anbieter: "google" | "apple", rolle?: Rolle): Promise<SozialErgebnis> => {
      if (!serverVerbunden) return { fehler: "Die App ist noch mit keinem Server verbunden." };
      const name = anbieter === "google" ? "Google" : "Apple";
      const ziel = Linking.createURL("auth-callback");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: anbieter,
        options: { redirectTo: ziel, skipBrowserRedirect: true, queryParams: anbieter === "google" ? { prompt: "select_account" } : undefined },
      });
      if (error || !data?.url) return { fehler: fehlerText(error?.message ?? `${name}-Anmeldung konnte nicht starten.`) };
      imBrowserAktiv.current = true;
      const antwort = await WebBrowser.openAuthSessionAsync(data.url, ziel).finally(() => {
        imBrowserAktiv.current = false;
      });
      if (antwort.type !== "success") return { abgebrochen: true };
      const e = await codeEinloesen(antwort.url);
      if (!e) return { fehler: `${name} hat keine Anmeldung zurückgegeben. Bitte versuch es noch einmal.` };
      if (e.fehler) return { fehler: e.fehler };
      await nachSozialAnmeldung(rolle);
      return {};
    },
    [nachSozialAnmeldung],
  );

  const mitGoogle = useCallback((rolle?: Rolle) => imBrowser("google", rolle), [imBrowser]);

  const mitApple = useCallback(
    async (rolle?: Rolle): Promise<SozialErgebnis> => {
      if (!serverVerbunden) return { fehler: "Die App ist noch mit keinem Server verbunden." };
      // Auf dem iPhone mit Apples eigener Anmeldung, sonst über die Apple-Seite im Browser.
      const nativ = Platform.OS === "ios" && (await AppleAuthentication.isAvailableAsync().catch(() => false));
      if (!nativ) return imBrowser("apple", rolle);
      try {
        // Einmalwert gegen wiederverwendete Apple-Anmeldungen: Apple bekommt
        // den Hash, der Server prüft ihn gegen den Rohwert.
        const nonce = Crypto.randomUUID();
        const nonceHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, nonce);
        const cred = await AppleAuthentication.signInAsync({
          requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
          nonce: nonceHash,
        });
        if (!cred.identityToken) return { fehler: "Apple hat keine Anmeldung zurückgegeben." };
        const { data, error } = await supabase.auth.signInWithIdToken({ provider: "apple", token: cred.identityToken, nonce });
        if (error) return { fehler: fehlerText(error.message) };
        // Den Namen gibt Apple nur beim allerersten Mal heraus – dann gleich übernehmen.
        const vorname = cred.fullName?.givenName?.trim();
        if (vorname && data.user) {
          await supabase.auth.updateUser({ data: { name: vorname, nachname: cred.fullName?.familyName?.trim() ?? null } });
          await supabase.from("lern_profil").update({ name: vorname }).eq("id", data.user.id);
        }
        await nachSozialAnmeldung(rolle);
        return {};
      } catch (e) {
        if ((e as { code?: string }).code === "ERR_REQUEST_CANCELED") return { abgebrochen: true };
        return { fehler: "Die Anmeldung mit Apple hat nicht geklappt. Bitte versuch es noch einmal." };
      }
    },
    [nachSozialAnmeldung, imBrowser],
  );

  const passwortVergessen = useCallback(async (adresse: string) => {
    if (!serverVerbunden) return "Die App ist noch mit keinem Server verbunden.";
    const { error } = await supabase.auth.resetPasswordForEmail(email(adresse), { redirectTo: APP_LINK });
    return error ? fehlerText(error.message) : null;
  }, []);

  const passwortAendern = useCallback(async (neu: string) => {
    if (neu.length < 8) return "Das Passwort braucht mindestens 8 Zeichen.";
    const { error } = await supabase.auth.updateUser({ password: neu });
    return error ? fehlerText(error.message) : null;
  }, []);

  const abmelden = useCallback(async () => {
    if (session) await supabase.auth.signOut();
    await AsyncStorage.removeItem(GAST).catch(() => {});
    setGastName(null);
    setSession(null);
    setProfil(null);
  }, [session]);

  const alsGast = useCallback(async (name: string) => {
    const n = name.trim() || "Du";
    await AsyncStorage.setItem(GAST, JSON.stringify({ name: n })).catch(() => {});
    setGastName(n);
  }, []);

  const profilSpeichern = useCallback(
    async (teil: { name?: string; klasse?: string; bundesland?: string | null }) => {
      if (!session) {
        if (teil.name) await alsGast(teil.name);
        return null;
      }
      const { error } = await supabase.from("lern_profil").update(teil).eq("id", session.user.id);
      if (error) return fehlerText(error.message);
      await profilLaden(session);
      return null;
    },
    [session, alsGast, profilLaden],
  );

  const benutzernameFrei = useCallback(async (name: string) => {
    if (!serverVerbunden) return null;
    const { data, error } = await supabase.rpc("lern_benutzername_frei", { p_name: name.trim().toLowerCase() });
    return error ? null : Boolean(data);
  }, []);

  // Links aus den Mails (Bestätigung, Passwort zurücksetzen) melden direkt an –
  // aber nur mit dem Einmal-Code, den diese App selbst angefordert hat.
  useEffect(() => {
    if (!serverVerbunden) return;
    async function verarbeiten(url: string | null) {
      if (!url) return;
      // Google/Apple im Browser löst imBrowser() selbst ein – außer die App
      // wurde währenddessen beendet und startet mit dem Rückkehr-Link neu.
      if (url.includes("auth-callback") && imBrowserAktiv.current) return;
      const e = await codeEinloesen(url);
      if (!e) return;
      if (e.fehler) {
        dialog("Link nicht gültig", `${e.fehler}\n\nFordere sonst einfach einen neuen Link an.`);
        return;
      }
      await AsyncStorage.removeItem(GAST).catch(() => {});
      setGastName(null);
    }
    Linking.getInitialURL().then(verarbeiten);
    const abo = Linking.addEventListener("url", ({ url }) => verarbeiten(url));
    return () => abo.remove();
  }, []);

  const rolleSetzen = useCallback(
    async (rolle: Rolle) => {
      if (!session) return "Bitte melde dich an.";
      const { error } = await supabase.rpc("lern_rolle_setzen", { p_rolle: rolle });
      if (error) return /lern_rolle_setzen|schema cache|function/i.test(error.message) ? "Das geht erst, wenn der Server aktualisiert ist." : fehlerText(error.message);
      await profilLaden(session);
      clipRechteNeuLaden();
      return null;
    },
    [session, profilLaden],
  );

  const benutzernameAendern = useCallback(
    async (neu: string) => {
      if (!session) return "Bitte melde dich an.";
      const { error } = await supabase.rpc("lern_benutzername_aendern", { p_name: neu.trim().toLowerCase() });
      if (error) return /duplicate|vergeben/i.test(error.message) ? "Dieser Benutzername ist schon vergeben." : fehlerText(error.message);
      await profilLaden(session);
      return null;
    },
    [session, profilLaden],
  );

  const wert = useMemo<KontoKontext>(() => {
    const gast = !session && gastName != null;
    return {
      laedt,
      session,
      profil,
      gast,
      drin: Boolean(session) || gast,
      anzeigeName: profil?.name || gastName || session?.user.email?.split("@")[0] || "Du",
      registrieren,
      anmelden,
      mitGoogle,
      mitApple,
      rolleSetzen,
      passwortVergessen,
      passwortAendern,
      abmelden,
      alsGast,
      profilSpeichern,
      benutzernameFrei,
      benutzernameAendern,
      profilNeuLaden: () => profilLaden(session),
      passwortNeuFaellig,
      passwortNeuErledigt: () => setPasswortNeuFaellig(false),
    };
  }, [
    laedt,
    session,
    profil,
    gastName,
    registrieren,
    anmelden,
    mitGoogle,
    mitApple,
    rolleSetzen,
    passwortVergessen,
    passwortAendern,
    abmelden,
    alsGast,
    profilSpeichern,
    benutzernameFrei,
    benutzernameAendern,
    profilLaden,
    passwortNeuFaellig,
  ]);

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

export function useKonto(): KontoKontext {
  const k = useContext(Kontext);
  if (!k) throw new Error("useKonto außerhalb von KontoProvider");
  return k;
}
