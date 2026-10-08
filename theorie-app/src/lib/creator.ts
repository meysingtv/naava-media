import { useCallback, useEffect, useState } from "react";

import { useClipRechte } from "@/lib/clips-server";
import { useKonto } from "@/lib/konto";
import { kanalName, liveSofortBeenden, meldung } from "@/lib/live";
import { serverVerbunden, supabase } from "@/lib/supabase";

// Live-Creator (SQL Abschnitt 22): Wer live gehen möchte, bewirbt sich mit einem
// Formular. Der Inhaber sieht alle Bewerbungen in Echtzeit, nimmt an oder lehnt
// ab und kann den Zugang jederzeit entziehen – dann endet ein laufendes Live sofort.

export type CreatorStatus = "offen" | "angenommen" | "abgelehnt" | "entzogen" | "zurueckgezogen";

/** Die eigene (neueste) Bewerbung. */
export type MeineBewerbung = { id: string; status: CreatorStatus; notiz: string; name: string; erstellt_am: string; entschieden_am: string | null };

/** Eine Bewerbung aus Sicht des Inhabers. */
export type Bewerbung = {
  id: string;
  user_id: string;
  name: string;
  telefon: string;
  alter_jahre: number;
  beruf: string;
  ort: string;
  themen: string;
  erfahrung: string;
  social: string;
  status: CreatorStatus;
  notiz: string;
  erstellt_am: string;
  entschieden_am: string | null;
  benutzername: string | null;
  bild_pfad: string | null;
  avatar_farbe: string | null;
  email: string | null;
  /** Läuft gerade ein Live dieser Person? */
  live_id: string | null;
};

export type BewerbungDaten = { name: string; telefon: string; alter: number; beruf: string; ort: string; themen: string; erfahrung: string; social: string };

/** Eigene Bewerbung, aktualisiert sich in Echtzeit (z. B. wenn der Inhaber entscheidet). */
export function useMeineBewerbung(): { bewerbung: MeineBewerbung | null; geladen: boolean; neuLaden: () => Promise<void> } {
  const { session } = useKonto();
  const ich = session?.user.id ?? null;
  const [bewerbung, setBewerbung] = useState<MeineBewerbung | null>(null);
  const [geladen, setGeladen] = useState(false);

  const neuLaden = useCallback(async () => {
    if (!ich || !serverVerbunden) {
      setBewerbung(null);
      setGeladen(true);
      return;
    }
    const { data, error } = await supabase.rpc("lern_creator_status");
    if (!error) setBewerbung((data ?? null) as MeineBewerbung | null);
    setGeladen(true);
  }, [ich]);

  useEffect(() => {
    neuLaden();
    if (!ich || !serverVerbunden) return;
    const kanal = supabase
      .channel(kanalName(`creator-${ich}`))
      .on("postgres_changes", { event: "*", schema: "public", table: "lern_creator_bewerbung", filter: `user_id=eq.${ich}` }, () => neuLaden())
      .subscribe();
    return () => {
      supabase.removeChannel(kanal);
    };
  }, [ich, neuLaden]);

  return { bewerbung, geladen, neuLaden };
}

/** Darf ich live gehen? Inhaber immer, sonst mit angenommener Bewerbung. */
export function useDarfLive(): { darf: boolean; creator: boolean; inhaber: boolean } {
  const rechte = useClipRechte();
  const { bewerbung } = useMeineBewerbung();
  const creator = bewerbung?.status === "angenommen";
  return { darf: rechte.inhaber || creator, creator, inhaber: rechte.inhaber };
}

export async function creatorBewerben(d: BewerbungDaten): Promise<void> {
  const { error } = await supabase.rpc("lern_creator_bewerben", {
    p_name: d.name,
    p_telefon: d.telefon,
    p_alter: d.alter,
    p_beruf: d.beruf,
    p_ort: d.ort,
    p_themen: d.themen,
    p_erfahrung: d.erfahrung,
    p_social: d.social,
  });
  if (error) throw new Error(meldung(error));
}

export async function creatorZurueckziehen(): Promise<void> {
  const { error } = await supabase.rpc("lern_creator_zurueckziehen");
  if (error) throw new Error(meldung(error));
}

// ---------------------------------------------------------------------------
// Inhaber
// ---------------------------------------------------------------------------

/** Alle Bewerbungen – in Echtzeit (neue Bewerbung, Entscheidung, Live an/aus). */
export function useBewerbungen(aktiv: boolean): { liste: Bewerbung[] | null; fehler: string | null; neuLaden: () => Promise<void> } {
  const [liste, setListe] = useState<Bewerbung[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  const neuLaden = useCallback(async () => {
    if (!serverVerbunden) {
      setListe([]);
      return;
    }
    const { data, error } = await supabase.rpc("lern_creator_liste");
    if (error) setFehler(meldung(error));
    else {
      setFehler(null);
      setListe((data ?? []) as Bewerbung[]);
    }
  }, []);

  useEffect(() => {
    if (!aktiv) return;
    neuLaden();
    if (!serverVerbunden) return;
    let plan: ReturnType<typeof setTimeout> | null = null;
    // Viele Änderungen kurz hintereinander nur einmal laden.
    const bald = () => {
      if (plan) clearTimeout(plan);
      plan = setTimeout(() => neuLaden(), 250);
    };
    const kanal = supabase
      .channel(kanalName("creator-liste"))
      .on("postgres_changes", { event: "*", schema: "public", table: "lern_creator_bewerbung" }, bald)
      .on("postgres_changes", { event: "*", schema: "public", table: "lern_live" }, bald)
      .subscribe();
    // Ein Live ohne Lebenszeichen endet nach 2 Minuten ohne Änderung in der Tabelle – darum auch so nachsehen.
    const takt = setInterval(neuLaden, 30_000);
    return () => {
      if (plan) clearTimeout(plan);
      clearInterval(takt);
      supabase.removeChannel(kanal);
    };
  }, [aktiv, neuLaden]);

  return { liste, fehler, neuLaden };
}

export async function creatorEntscheiden(id: string, annehmen: boolean, notiz: string): Promise<void> {
  const { error } = await supabase.rpc("lern_creator_entscheiden", { p_id: id, p_annehmen: annehmen, p_notiz: notiz });
  if (error) throw new Error(meldung(error));
}

/** Zugang entziehen – laufende Lives der Person enden sofort (auch der LiveKit-Raum). */
export async function creatorEntziehen(userId: string, notiz: string): Promise<void> {
  const { data, error } = await supabase.rpc("lern_creator_entziehen", { p_user: userId, p_notiz: notiz });
  if (error) throw new Error(meldung(error));
  const raeume = (data ?? []) as string[];
  if (raeume.length) await liveSofortBeenden({ raeume });
}

export const STATUS_TEXT: Record<CreatorStatus, string> = {
  offen: "Wird geprüft",
  angenommen: "Freigeschaltet",
  abgelehnt: "Abgelehnt",
  entzogen: "Zugang entzogen",
  zurueckgezogen: "Zurückgezogen",
};
