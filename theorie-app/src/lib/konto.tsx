import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";

import { dialog } from "@/components/dialog";

import { clipRechteNeuLaden } from "./clips-server";
import { serverVerbunden, supabase } from "./supabase";
import { blockiertLaden } from "./blockieren";

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

/** Angaben für ein neues Konto – gespeichert, sobald der Code aus der E-Mail stimmt. */
export type Registrierung = {
  rolle: Rolle;
  vorname: string;
  nachname: string;
  benutzername: string;
  telefon: string | null;
  /** ISO-Datum (JJJJ-MM-TT) oder null. */
  geburtsdatum: string | null;
  klasse: string;
  bundesland: string | null;
};

/**
 * Stellen des Codes aus der E-Mail. Muss zu Supabase → Authentication →
 * Providers → Email → „Email OTP Length“ passen.
 */
export const CODE_LAENGE = 6;
/** So lange wartet „Code erneut senden“ (Supabase lässt pro Adresse nur eine Mail je Minute zu). */
const NEU_SENDEN_SEKUNDEN = 60;

type KontoKontext = {
  laedt: boolean;
  session: Session | null;
  profil: Profil | null;
  gast: boolean;
  drin: boolean;
  anzeigeName: string;
  /**
   * Schickt einen Anmelde-Code an die E-Mail. Mit `neu` entsteht dabei ein
   * Konto (Registrieren), ohne nur für schon vorhandene Konten (Anmelden).
   */
  codeSenden: (email: string, neu?: Registrierung) => Promise<string | null>;
  /** Code aus der E-Mail einlösen – danach ist man angemeldet. */
  codePruefen: (email: string, code: string) => Promise<string | null>;
  rolleSetzen: (rolle: Rolle) => Promise<string | null>;
  abmelden: () => Promise<void>;
  alsGast: (name: string) => Promise<void>;
  profilSpeichern: (teil: { name?: string; klasse?: string; bundesland?: string | null }) => Promise<string | null>;
  benutzernameFrei: (name: string) => Promise<boolean | null>;
  benutzernameAendern: (neu: string) => Promise<string | null>;
  profilNeuLaden: () => Promise<void>;
};

const GAST = "spur-gast";
const Kontext = createContext<KontoKontext | null>(null);

function email(roh: string): string {
  return roh.trim().toLowerCase();
}

function fehlerText(meldung: string): string {
  if (/signups not allowed|user not found/i.test(meldung)) return "Zu dieser E-Mail gibt es noch kein Konto. Registriere dich zuerst.";
  if (/token has expired|invalid token|otp.*(expired|invalid)|expired or is invalid/i.test(meldung)) return "Der Code stimmt nicht oder ist abgelaufen. Prüf die Ziffern oder lass dir einen neuen schicken.";
  if (/valid email|invalid email|unable to validate email/i.test(meldung)) return "Bitte gib eine gültige E-Mail-Adresse ein.";
  if (/network|fetch/i.test(meldung)) return "Keine Verbindung. Bitte prüfe dein Internet.";
  if (/rate limit|security purposes|only request this after/i.test(meldung)) return "Zu viele Versuche. Bitte warte kurz und versuch es dann noch einmal.";
  if (/user is banned|banned/i.test(meldung)) return "Dein Zugang ist pausiert oder gesperrt. Wende dich bei Fragen an deine Fahrschule.";
  if (/lern_profil_name_laenge/.test(meldung)) return "Der Name darf höchstens 40 Zeichen lang sein.";
  if (/lern_profil_bundesland_gueltig/.test(meldung)) return "Bitte wähle ein Bundesland aus der Liste.";
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

  const codeSenden = useCallback(async (adresse: string, neu?: Registrierung) => {
    if (!serverVerbunden) return "Die App ist noch mit keinem Server verbunden.";
    const { error } = await supabase.auth.signInWithOtp({
      email: email(adresse),
      options: neu
        ? {
            shouldCreateUser: true,
            // Telefon, Nachname und Geburtsdatum bleiben privat im Konto (nicht im öffentlichen Profil).
            // Gibt es die Adresse schon, bleibt das Konto, wie es ist – man wird einfach angemeldet.
            data: {
              name: neu.vorname.trim(),
              nachname: neu.nachname.trim(),
              benutzername: neu.benutzername.trim().toLowerCase(),
              rolle: neu.rolle,
              telefon: neu.telefon,
              geburtsdatum: neu.geburtsdatum,
              klasse: neu.klasse,
              bundesland: neu.bundesland,
            },
          }
        : { shouldCreateUser: false },
    });
    return error ? fehlerText(error.message) : null;
  }, []);

  const codePruefen = useCallback(async (adresse: string, code: string) => {
    if (!serverVerbunden) return "Die App ist noch mit keinem Server verbunden.";
    const { error } = await supabase.auth.verifyOtp({ email: email(adresse), token: code.replace(/\D/g, ""), type: "email" });
    if (error) return fehlerText(error.message);
    await AsyncStorage.removeItem(GAST).catch(() => {});
    setGastName(null);
    clipRechteNeuLaden();
    return null;
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

  // Blockierte Personen des angemeldeten Kontos laden (oder beim Abmelden leeren).
  const blockId = session?.user.id ?? null;
  useEffect(() => {
    blockiertLaden(blockId);
  }, [blockId]);

  // Im Manager pausiert oder gesperrt: abmelden und Bescheid geben. Geprüft
  // beim Start und jedes Mal, wenn die App wieder nach vorn kommt. Fehlt das
  // SQL-Update (Abschnitt 26), gibt es die Abfrage nicht – dann nichts tun.
  const nutzerId = session?.user.id ?? null;
  useEffect(() => {
    if (!serverVerbunden || !nutzerId) return;
    let aktiv = true;
    async function pruefen() {
      const { data, error } = await supabase.rpc("lern_mein_zugang");
      if (!aktiv || error || (data !== "pausiert" && data !== "gesperrt")) return;
      await supabase.auth.signOut().catch(() => {});
      setSession(null);
      setProfil(null);
      dialog(
        data === "pausiert" ? "Zugang pausiert" : "Zugang gesperrt",
        data === "pausiert" ? "Dein Zugang ist gerade pausiert. Wende dich bei Fragen an deine Fahrschule." : "Dein Zugang wurde gesperrt. Wende dich bei Fragen an deine Fahrschule.",
      );
    }
    pruefen();
    const abo = AppState.addEventListener("change", (s) => {
      if (s === "active") pruefen();
    });
    return () => {
      aktiv = false;
      abo.remove();
    };
  }, [nutzerId]);

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
      codeSenden,
      codePruefen,
      rolleSetzen,
      abmelden,
      alsGast,
      profilSpeichern,
      benutzernameFrei,
      benutzernameAendern,
      profilNeuLaden: () => profilLaden(session),
    };
  }, [
    laedt,
    session,
    profil,
    gastName,
    codeSenden,
    codePruefen,
    rolleSetzen,
    abmelden,
    alsGast,
    profilSpeichern,
    benutzernameFrei,
    benutzernameAendern,
    profilLaden,
  ]);

  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

export function useKonto(): KontoKontext {
  const k = useContext(Kontext);
  if (!k) throw new Error("useKonto außerhalb von KontoProvider");
  return k;
}

/** Zustand von „Code per E-Mail“ – für Anmelden und Registrieren gleich. */
export type CodeAblauf = {
  /** An diese Adresse ging der letzte Code – null, solange noch keiner verschickt ist. */
  gesendetAn: string | null;
  code: string;
  setCode: (c: string) => void;
  laedt: boolean;
  fehler: string | null;
  setFehler: (f: string | null) => void;
  /** Sekunden, bis „Code erneut senden“ wieder geht. */
  warten: number;
  senden: (adresse: string, neu?: Registrierung) => Promise<boolean>;
  /** Prüft den Code; true = angemeldet. */
  pruefen: (code?: string) => Promise<boolean>;
  nochmalSenden: () => Promise<void>;
  /** Zurück zur Eingabe der E-Mail. */
  andereAdresse: () => void;
};

export function useCodeAblauf(): CodeAblauf {
  const { codeSenden, codePruefen } = useKonto();
  const [gesendetAn, setGesendetAn] = useState<string | null>(null);
  const [code, setCodeRoh] = useState("");
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [warten, setWarten] = useState(0);
  // Fürs erneute Senden: dieselben Angaben wie beim ersten Mal.
  const letzteAngaben = useRef<Registrierung | undefined>(undefined);

  useEffect(() => {
    if (warten <= 0) return;
    const t = setTimeout(() => setWarten((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [warten]);

  const senden = useCallback(
    async (adresse: string, neu?: Registrierung) => {
      setFehler(null);
      setLaedt(true);
      const f = await codeSenden(adresse, neu);
      setLaedt(false);
      if (f) {
        setFehler(f);
        return false;
      }
      letzteAngaben.current = neu;
      setGesendetAn(email(adresse));
      setCodeRoh("");
      setWarten(NEU_SENDEN_SEKUNDEN);
      return true;
    },
    [codeSenden],
  );

  const pruefen = useCallback(
    async (eingabe?: string) => {
      const c = (eingabe ?? code).replace(/\D/g, "");
      if (!gesendetAn || laedt || c.length < CODE_LAENGE) return false;
      setFehler(null);
      setLaedt(true);
      const f = await codePruefen(gesendetAn, c);
      setLaedt(false);
      if (f) {
        setFehler(f);
        setCodeRoh("");
        return false;
      }
      return true;
    },
    [code, gesendetAn, laedt, codePruefen],
  );

  const nochmalSenden = useCallback(async () => {
    if (!gesendetAn || warten > 0 || laedt) return;
    await senden(gesendetAn, letzteAngaben.current);
  }, [gesendetAn, warten, laedt, senden]);

  return {
    gesendetAn,
    code,
    setCode: (c) => setCodeRoh(c.replace(/\D/g, "").slice(0, CODE_LAENGE)),
    laedt,
    fehler,
    setFehler,
    warten,
    senden,
    pruefen,
    nochmalSenden,
    andereAdresse: () => {
      setGesendetAn(null);
      setCodeRoh("");
      setFehler(null);
    },
  };
}
