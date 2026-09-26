import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";

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
};

type Registrierung = { name: string; benutzername: string; email: string; passwort: string; klasse: string; bundesland: string | null };

type KontoKontext = {
  laedt: boolean;
  session: Session | null;
  profil: Profil | null;
  gast: boolean;
  drin: boolean;
  anzeigeName: string;
  registrieren: (d: Registrierung) => Promise<{ fehler?: string; bestaetigen?: boolean }>;
  anmelden: (email: string, passwort: string) => Promise<string | null>;
  passwortVergessen: (email: string) => Promise<string | null>;
  passwortAendern: (neu: string) => Promise<string | null>;
  abmelden: () => Promise<void>;
  alsGast: (name: string) => Promise<void>;
  profilSpeichern: (teil: { name?: string; klasse?: string; bundesland?: string | null }) => Promise<string | null>;
  benutzernameFrei: (name: string) => Promise<boolean | null>;
  profilNeuLaden: () => Promise<void>;
};

const GAST = "spur-gast";
const Kontext = createContext<KontoKontext | null>(null);

function fehlerText(meldung: string): string {
  if (/already registered|already exists/i.test(meldung)) return "Diese E-Mail ist schon registriert. Melde dich einfach an.";
  if (/invalid login credentials/i.test(meldung)) return "E-Mail oder Passwort stimmt nicht.";
  if (/email not confirmed/i.test(meldung)) return "Bitte bestätige zuerst deine E-Mail-Adresse.";
  if (/password/i.test(meldung) && /(short|least|characters)/i.test(meldung)) return "Das Passwort braucht mindestens 8 Zeichen.";
  if (/valid email|invalid email/i.test(meldung)) return "Bitte gib eine gültige E-Mail-Adresse ein.";
  if (/network|fetch/i.test(meldung)) return "Keine Verbindung. Bitte prüfe dein Internet.";
  if (/rate limit/i.test(meldung)) return "Zu viele Versuche. Bitte warte kurz.";
  return meldung;
}

export function KontoProvider({ children }: { children: ReactNode }) {
  const [laedt, setLaedt] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [gastName, setGastName] = useState<string | null>(null);

  const profilLaden = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfil(null);
      return;
    }
    const { data } = await supabase
      .from("lern_profil")
      .select("id, name, benutzername, klasse, avatar_farbe, xp, xp_woche, bundesland, elo")
      .eq("id", s.user.id)
      .maybeSingle<Profil>();
    setProfil(data ?? null);
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
      ? supabase.auth.onAuthStateChange((_ereignis, s) => {
          setSession(s);
          profilLaden(s);
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
      email: d.email.trim(),
      password: d.passwort,
      options: { data: { name: d.name.trim(), benutzername: d.benutzername.trim().toLowerCase(), klasse: d.klasse, bundesland: d.bundesland } },
    });
    if (error) return { fehler: fehlerText(error.message) };
    if (!data.session) return { bestaetigen: true };
    await AsyncStorage.removeItem(GAST).catch(() => {});
    setGastName(null);
    return {};
  }, []);

  const anmelden = useCallback(async (email: string, passwort: string) => {
    if (!serverVerbunden) return "Die App ist noch mit keinem Server verbunden.";
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: passwort });
    if (error) return fehlerText(error.message);
    await AsyncStorage.removeItem(GAST).catch(() => {});
    setGastName(null);
    return null;
  }, []);

  const passwortVergessen = useCallback(async (email: string) => {
    if (!serverVerbunden) return "Die App ist noch mit keinem Server verbunden.";
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
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
      passwortVergessen,
      passwortAendern,
      abmelden,
      alsGast,
      profilSpeichern,
      benutzernameFrei,
      profilNeuLaden: () => profilLaden(session),
    };
  }, [laedt, session, profil, gastName, registrieren, anmelden, passwortVergessen, passwortAendern, abmelden, alsGast, profilSpeichern, benutzernameFrei, profilLaden]);

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

export function useKonto(): KontoKontext {
  const k = useContext(Kontext);
  if (!k) throw new Error("useKonto außerhalb von KontoProvider");
  return k;
}
