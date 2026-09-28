import { useCallback, useRef } from "react";
import { ActionSheetIOS, Platform, Share } from "react-native";
import { router } from "expo-router";

import { auswahlBlatt } from "@/components/auswahl-blatt";
import { dialog } from "@/components/dialog";

import { clipLoeschen, clipMelden, dateiUrl, folgenSetzen, geteiltMelden, likeSetzen, useClipRechte, type ClipEintrag } from "./clips-server";
import { useKonto } from "./konto";

/** Natives Auswahlmenü (iOS) bzw. Auswahlblatt – liefert den gewählten Eintrag oder null. */
export function auswahl(titel: string, optionen: { text: string; gefahr?: boolean }[]): Promise<number | null> {
  return new Promise((fertig) => {
    if (Platform.OS === "ios") {
      const texte = [...optionen.map((o) => o.text), "Abbrechen"];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: titel,
          options: texte,
          cancelButtonIndex: texte.length - 1,
          destructiveButtonIndex: optionen.flatMap((o, i) => (o.gefahr ? [i] : [])),
          userInterfaceStyle: "dark",
        },
        (i) => fertig(i === texte.length - 1 ? null : i),
      );
      return;
    }
    // Android: eigenes Blatt – ein Dialog zeigt dort höchstens drei Knöpfe.
    auswahlBlatt(titel, optionen).then(fertig);
  });
}

export function anmeldenFragen(was: string) {
  dialog("Konto nötig", `${was} geht mit einem kostenlosen Konto. Dein Lernstand bleibt dabei erhalten.`, [
    { text: "Abbrechen", style: "cancel" },
    { text: "Anmelden", onPress: () => router.push("/anmelden") },
    { text: "Konto erstellen", onPress: () => router.push("/registrieren") },
  ]);
}

type Liste = {
  /** Einen Clip überall in der Liste ändern. */
  aendern: (id: string, teil: (c: ClipEintrag) => Partial<ClipEintrag>) => void;
  /** Nach Folgen/Entfolgen: alle Clips dieser Person anpassen. */
  folgenGesetzt: (autor: string, wert: boolean) => void;
  /** Clip wurde gelöscht. */
  entfernt: (id: string) => void;
};

/**
 * Gefällt mir, Folgen, Teilen und „Mehr“ für eine Clip-Liste – sofort in der
 * Anzeige, auf dem Server nacheinander je Clip bzw. Person (keine Wettläufe).
 */
export function useClipAktionen(liste: Liste) {
  const { session } = useKonto();
  const rechte = useClipRechte();
  const ich = useRef<string | null>(null);
  ich.current = session?.user.id ?? null;
  const inhaber = useRef(false);
  inhaber.current = rechte.inhaber;
  const l = useRef(liste);
  l.current = liste;
  const warteschlange = useRef(new Map<string, Promise<unknown>>());

  const nacheinander = useCallback((schluessel: string, aufgabe: () => Promise<unknown>) => {
    const vorher = warteschlange.current.get(schluessel) ?? Promise.resolve();
    const danach = vorher.catch(() => {}).then(aufgabe);
    warteschlange.current.set(schluessel, danach);
    return danach;
  }, []);

  const onLike = useCallback(
    (clip: ClipEintrag, an: boolean) => {
      if (!ich.current) {
        anmeldenFragen("Liken");
        return;
      }
      l.current.aendern(clip.id, (c) => (c.gemocht === an ? {} : { gemocht: an, likes: Math.max(0, c.likes + (an ? 1 : -1)) }));
      nacheinander(`like-${clip.id}`, () => likeSetzen(clip.id, an))
        .then((n) => l.current.aendern(clip.id, (c) => (c.gemocht === an ? { likes: Number(n) } : {})))
        .catch(() => l.current.aendern(clip.id, (c) => (c.gemocht === an ? { gemocht: !an, likes: Math.max(0, c.likes + (an ? -1 : 1)) } : {})));
    },
    [nacheinander],
  );

  const onFolgen = useCallback(
    (clip: ClipEintrag, an: boolean) => {
      if (!ich.current) {
        anmeldenFragen("Folgen");
        return;
      }
      l.current.folgenGesetzt(clip.autor, an);
      nacheinander(`folgen-${clip.autor}`, () => folgenSetzen(clip.autor, an)).catch(() => l.current.folgenGesetzt(clip.autor, !an));
    },
    [nacheinander],
  );

  const onTeilen = useCallback(async (clip: ClipEintrag) => {
    try {
      const text = `„${clip.titel}“ – ${clip.autor_name || clip.autor_benutzername} in Fahrschule Pro`;
      const link = dateiUrl(clip.video_pfad);
      // Android übernimmt nur „message“, iOS zeigt den Link als eigenen Anhang.
      const r = await Share.share(Platform.OS === "ios" ? { message: text, url: link } : { message: `${text}\n${link}` });
      if (r.action === Share.sharedAction && ich.current) {
        const n = await geteiltMelden(clip.id);
        if (n != null) l.current.aendern(clip.id, () => ({ geteilt: n }));
      }
    } catch {
      // Teilen abgebrochen
    }
  }, []);

  const onMehr = useCallback(async (clip: ClipEintrag) => {
    const darfLoeschen = clip.autor === ich.current || inhaber.current;
    const wahl = await auswahl(clip.titel, [{ text: "Melden" }, ...(darfLoeschen ? [{ text: "Clip löschen", gefahr: true }] : [])]);
    if (wahl === 0) {
      if (!ich.current) {
        anmeldenFragen("Melden");
        return;
      }
      const gruende = ["Unangemessen", "Falsche Information", "Spam", "Etwas anderes"];
      const g = await auswahl("Warum meldest du den Clip?", gruende.map((text) => ({ text })));
      if (g == null) return;
      try {
        await clipMelden(clip.id, gruende[g]);
        dialog("Danke!", "Wir schauen uns den Clip an.");
      } catch (e) {
        dialog("Nicht gemeldet", (e as Error).message);
      }
    } else if (wahl === 1 && darfLoeschen) {
      dialog("Clip löschen?", "Der Clip verschwindet für alle. Das lässt sich nicht rückgängig machen.", [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Löschen",
          style: "destructive",
          onPress: async () => {
            try {
              await clipLoeschen(clip);
              l.current.entfernt(clip.id);
            } catch (e) {
              dialog("Nicht gelöscht", (e as Error).message);
            }
          },
        },
      ]);
    }
  }, []);

  /** Tippen auf Name/Profilbild: zum Profil der Person. */
  const onProfil = useCallback((clip: ClipEintrag) => {
    router.push({ pathname: "/nutzer/[id]", params: { id: clip.autor } });
  }, []);

  return { onLike, onFolgen, onTeilen, onMehr, onProfil };
}
