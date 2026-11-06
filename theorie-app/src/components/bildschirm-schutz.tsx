import { useEffect, useSyncExternalStore } from "react";
import { Platform } from "react-native";
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
 * landet so auch in der Aufnahme. Dazu expo-screen-capture für leere
 * Screenshots und die verschwommene App-Übersicht.
 * Im Browser lässt sich das nicht verhindern. Braucht einen neuen nativen Build.
 */

const SCHLUESSEL = "app";
const SPEICHER = "spur-aufnahme-erlaubt";

type Nativ = { setzen(an: boolean): Promise<void> };
const nativ = Platform.OS === "ios" ? requireOptionalNativeModule<Nativ>("AufnahmeSchutz") : null;

// --- Schalter für den Inhaber: Aufnahmen für mich erlauben (Standard: ja) ------
let erlaubt = true;
const hoerer = new Set<() => void>();
AsyncStorage.getItem(SPEICHER)
  .then((w) => {
    if (w === "nein") {
      erlaubt = false;
      hoerer.forEach((h) => h());
    }
  })
  .catch(() => {});

function abonnieren(h: () => void) {
  hoerer.add(h);
  return () => {
    hoerer.delete(h);
  };
}

/** Darf der Inhaber aufnehmen? Zum Testen der Sperre lässt sich das ausschalten. */
export function useInhaberAufnahme(): [boolean, (an: boolean) => void] {
  const wert = useSyncExternalStore(abonnieren, () => erlaubt);
  const setzen = (an: boolean) => {
    erlaubt = an;
    hoerer.forEach((h) => h());
    AsyncStorage.setItem(SPEICHER, an ? "ja" : "nein").catch(() => {});
  };
  return [wert, setzen];
}

export function BildschirmSchutz() {
  const { inhaber } = useClipRechte();
  const [inhaberDarf] = useInhaberAufnahme();
  const frei = inhaber && inhaberDarf;

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (frei) {
      ScreenCapture.allowScreenCaptureAsync(SCHLUESSEL).catch(() => {});
      if (Platform.OS === "ios") ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => {});
      nativ?.setzen(false).catch(() => {});
    } else {
      ScreenCapture.preventScreenCaptureAsync(SCHLUESSEL).catch(() => {});
      if (Platform.OS === "ios") ScreenCapture.enableAppSwitcherProtectionAsync(0.9).catch(() => {});
      nativ?.setzen(true).catch(() => {});
    }
  }, [frei]);

  return null;
}
