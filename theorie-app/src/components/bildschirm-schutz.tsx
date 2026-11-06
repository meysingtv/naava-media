import { useEffect, useSyncExternalStore } from "react";
import { Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { requireOptionalNativeModule } from "expo";
import * as ScreenCapture from "expo-screen-capture";

import { useClipRechte } from "@/lib/clips-server";

/**
 * Sperre gegen Bildschirmaufnahmen und Screenshots in der ganzen App. Nur der
 * Inhaber darf aufnehmen (für Trailer und TikTok) – in den Einstellungen kann
 * er das zum Testen ausschalten.
 *
 * Android: FLAG_SECURE über expo-screen-capture – Aufnahmen und Screenshots
 * bleiben schwarz, die App-Übersicht ist leer.
 * iOS: Das eigene Modul modules/aufnahme-schutz legt bei einer Aufnahme (oder
 * Bildschirmspiegelung) ein verschwommenes Fenster über die ganze App – das
 * landet so auch in der Aufnahme. Dazu expo-screen-capture nur für die
 * verschwommene App-Übersicht. Screenshots lassen sich auf iOS nicht sperren.
 * Im Browser lässt sich das nicht verhindern. Braucht einen neuen nativen Build.
 */

const SCHLUESSEL = "app";
const SPEICHER = "spur-aufnahme-erlaubt";

type Nativ = { setzen(an: boolean): Promise<void>; letzteAusnahme?(): string | null };
const nativ = Platform.OS === "ios" ? requireOptionalNativeModule<Nativ>("AufnahmeSchutz") : null;

// --- Schalter für den Inhaber: Aufnahmen für mich erlauben (Standard: ja) ------
let erlaubt = true;
let geladen = false;
const hoerer = new Set<() => void>();

/** Gespeicherte Wahl erst nach dem Start lesen, nicht schon beim Laden der Datei. */
function wahlLaden() {
  if (geladen) return;
  geladen = true;
  AsyncStorage.getItem(SPEICHER)
    .then((w) => {
      if (w === "nein") {
        erlaubt = false;
        hoerer.forEach((h) => h());
      }
    })
    .catch(() => {});
}

function abonnieren(h: () => void) {
  hoerer.add(h);
  return () => {
    hoerer.delete(h);
  };
}

/** Darf der Inhaber aufnehmen? Zum Testen der Sperre lässt sich das ausschalten. */
export function useInhaberAufnahme(): [boolean, (an: boolean) => void] {
  const wert = useSyncExternalStore(abonnieren, () => erlaubt);
  useEffect(wahlLaden, []);
  const setzen = (an: boolean) => {
    erlaubt = an;
    hoerer.forEach((h) => h());
    AsyncStorage.setItem(SPEICHER, an ? "ja" : "nein").catch(() => {});
  };
  return [wert, setzen];
}

export function BildschirmSchutz() {
  const { inhaber } = useClipRechte();

  // Hat ein natives Modul beim letzten Mal eine Ausnahme geworfen (abgefangen
  // in modules/aufnahme-schutz/ios/AusnahmeFang.m), kurz anzeigen – zur Fehlersuche.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const text = typeof nativ?.letzteAusnahme === "function" ? nativ.letzteAusnahme() : null;
        if (text) Alert.alert("Technischer Hinweis", `${text}\n\nBitte schick uns einen Screenshot davon.`);
      } catch {
        // nur zur Fehlersuche
      }
    }, 3000);
    return () => clearTimeout(t);
  }, []);
  const [inhaberDarf] = useInhaberAufnahme();
  const frei = inhaber && inhaberDarf;

  useEffect(() => {
    // Alles abgesichert: Ein Fehler hier darf die App nie beenden.
    const sicher = (aufruf: () => unknown) => {
      try {
        const r = aufruf();
        if (r && typeof (r as Promise<unknown>).catch === "function") (r as Promise<unknown>).catch(() => {});
      } catch {
        // Sperre dann eben aus
      }
    };
    if (Platform.OS === "android") {
      // FLAG_SECURE: Aufnahmen und Screenshots bleiben schwarz
      sicher(() => (frei ? ScreenCapture.allowScreenCaptureAsync(SCHLUESSEL) : ScreenCapture.preventScreenCaptureAsync(SCHLUESSEL)));
    } else if (Platform.OS === "ios") {
      // Nicht preventScreenCaptureAsync: Das hängt die Fensterebene in ein
      // Passwortfeld um – auf neuen iOS-Versionen wirkungslos und ein
      // Absturzrisiko beim Start. Stattdessen das eigene Modul (Unschärfe).
      // Kurz nach dem Start, damit es nicht mit dem Hochfahren kollidiert.
      const t = setTimeout(() => {
        sicher(() => (typeof nativ?.setzen === "function" ? nativ.setzen(!frei) : undefined));
        sicher(() => (frei ? ScreenCapture.disableAppSwitcherProtectionAsync() : ScreenCapture.enableAppSwitcherProtectionAsync(0.9)));
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [frei]);

  return null;
}
