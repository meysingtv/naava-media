import { useEffect, useState } from "react";
import { useIsFocused } from "@react-navigation/native";

import { dialog } from "@/components/dialog";
import { APP_ICONS, aktivesIcon } from "@/lib/app-icon";
import { useClipRechte } from "@/lib/clips-server";
import { useBewerbungen, useMeineBewerbung } from "@/lib/creator";
import { useDarstellung } from "@/lib/darstellung";
import { erinnerungPlanen } from "@/lib/erinnerung";
import { useKonto } from "@/lib/konto";
import { liveAboSetzen, liveAboStatus } from "@/lib/live";
import { useStand } from "@/lib/stand";

// Zustand und Aktionen der Einstellungen – gemeinsam für Handy und PC, damit
// beide Fassungen dieselben Setter und Dialoge nutzen.

export const ZIELE = [15, 30, 50, 80];
export const ZEITEN: [number, number][] = [
  [7, 0],
  [12, 30],
  [17, 0],
  [19, 0],
  [21, 0],
];
export const ZIEL_STUFE: Record<number, string> = { 15: "Locker", 30: "Normal", 50: "Ehrgeizig", 80: "Intensiv" };

export function useEinstellungen() {
  const { stand, setzen, zuruecksetzen } = useStand();
  const konto = useKonto();
  const { session, profil, anzeigeName, profilSpeichern, benutzernameFrei, benutzernameAendern, rolleSetzen } = konto;
  const rechte = useClipRechte();
  const { liste: bewerbungen } = useBewerbungen(rechte.inhaber);
  const offeneBewerbungen = (bewerbungen ?? []).filter((b) => b.status === "offen").length;
  // Beim Zurückkommen von der Icon-Seite neu lesen
  const fokus = useIsFocused();
  const iconTitel = fokus ? (APP_ICONS.find((i) => i.id === aktivesIcon())?.titel ?? "Standard") : "";
  const { bewerbung: meineBewerbung } = useMeineBewerbung();
  const darstellung = useDarstellung();
  const [name, setName] = useState(anzeigeName);
  const [nameAngefasst, setNameAngefasst] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  const [benutzer, setBenutzer] = useState(profil?.benutzername ?? "");
  const [benutzerAngefasst, setBenutzerAngefasst] = useState(false);
  const [frei, setFrei] = useState<boolean | null>(null);
  const [speichertBenutzer, setSpeichertBenutzer] = useState(false);

  // Werte übernehmen, sobald das Profil geladen ist (solange nichts getippt wurde).
  useEffect(() => {
    if (!nameAngefasst) setName(anzeigeName);
  }, [anzeigeName, nameAngefasst]);
  useEffect(() => {
    if (!benutzerAngefasst) setBenutzer(profil?.benutzername ?? "");
  }, [profil?.benutzername, benutzerAngefasst]);

  const benutzerGueltig = /^[a-z0-9_.]{3,20}$/.test(benutzer);
  const benutzerGeaendert = Boolean(profil) && benutzer !== profil?.benutzername;

  // Verfügbarkeit prüfen, kurz nachdem man aufgehört hat zu tippen.
  useEffect(() => {
    setFrei(null);
    if (!benutzerGeaendert || !benutzerGueltig) return;
    const t = setTimeout(async () => setFrei(await benutzernameFrei(benutzer)), 450);
    return () => clearTimeout(t);
  }, [benutzer, benutzerGeaendert, benutzerGueltig, benutzernameFrei]);

  async function benutzerSpeichern() {
    setSpeichertBenutzer(true);
    const f = await benutzernameAendern(benutzer);
    setSpeichertBenutzer(false);
    if (f) dialog("Nicht gespeichert", f);
    else {
      setBenutzerAngefasst(false);
      dialog("Gespeichert", `Du heißt jetzt @${benutzer}.`);
    }
  }
  const [liveAbo, setLiveAbo] = useState(false);

  useEffect(() => {
    if (session) liveAboStatus().then(setLiveAbo);
  }, [session]);

  async function liveAboAendern(an: boolean) {
    setLiveAbo(an);
    try {
      const ergebnis = await liveAboSetzen(an);
      if (ergebnis === "keine_erlaubnis") {
        setLiveAbo(false);
        dialog("Mitteilungen sind aus", "Erlaube Mitteilungen für Fahrschul Pro in den iPhone-Einstellungen, dann sagen wir dir Bescheid, wenn ein Live startet.");
        return;
      }
      setLiveAbo(ergebnis);
    } catch (e) {
      setLiveAbo(!an);
      dialog("Nicht gespeichert", (e as Error).message);
    }
  }

  async function erinnerungAendern(an: boolean, stunde = stand.erinnerung.stunde, minute = stand.erinnerung.minute) {
    const ok = await erinnerungPlanen(an, stunde, minute);
    if (!ok) {
      dialog("Mitteilungen sind aus", "Erlaube Mitteilungen für Fahrschul Pro in den iPhone-Einstellungen, dann klappt die Erinnerung.");
      setzen({ erinnerung: { an: false, stunde, minute } });
      return;
    }
    setzen({ erinnerung: { an, stunde, minute } });
  }

  async function klasseAendern(k: string) {
    setzen({ klasse: k });
    if (session) await profilSpeichern({ klasse: k });
  }

  async function nameSpeichern() {
    setSpeichert(true);
    const f = await profilSpeichern({ name: name.trim() });
    setSpeichert(false);
    if (f) dialog("Nicht gespeichert", f);
    else setNameAngefasst(false);
  }

  /** Name tippen – ab dann nicht mehr vom Profil überschreiben. */
  function nameTippen(t: string) {
    setNameAngefasst(true);
    setName(t);
  }

  /** Benutzername tippen: nur erlaubte Zeichen, höchstens 20. */
  function benutzerTippen(t: string) {
    setBenutzerAngefasst(true);
    setBenutzer(
      t
        .toLowerCase()
        .replace(/[^a-z0-9_.]/g, "")
        .slice(0, 20),
    );
  }

  async function bundeslandWaehlen(b: string) {
    const f = await profilSpeichern({ bundesland: profil?.bundesland === b ? null : b });
    if (f) dialog("Nicht gespeichert", f);
  }

  async function rolleWaehlen(id: "schueler" | "fahrlehrer") {
    if (profil?.rolle === id) return;
    const f = await rolleSetzen(id);
    if (f) dialog("Nicht gespeichert", f);
  }

  function zuruecksetzenFragen() {
    dialog("Fortschritt zurücksetzen?", "Alle Antworten, Serien, Abzeichen und Simulationen auf diesem Gerät werden gelöscht. Das lässt sich nicht rückgängig machen.", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Zurücksetzen", style: "destructive", onPress: zuruecksetzen },
    ]);
  }

  return {
    stand,
    setzen,
    konto,
    rechte,
    offeneBewerbungen,
    meineBewerbung,
    iconTitel,
    darstellung,
    name,
    nameTippen,
    speichert,
    nameSpeichern,
    benutzer,
    benutzerTippen,
    benutzerGueltig,
    benutzerGeaendert,
    frei,
    speichertBenutzer,
    benutzerSpeichern,
    liveAbo,
    liveAboAendern,
    erinnerungAendern,
    klasseAendern,
    bundeslandWaehlen,
    rolleWaehlen,
    zuruecksetzenFragen,
  };
}

export type Einstellungen = ReturnType<typeof useEinstellungen>;
