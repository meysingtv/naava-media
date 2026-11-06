import { useEffect } from "react";
import { Platform } from "react-native";
import * as ScreenCapture from "expo-screen-capture";

import { useClipRechte } from "@/lib/clips-server";

/**
 * Sperre gegen Bildschirmaufnahmen und Screenshots in der ganzen App – nur der
 * Inhaber darf aufnehmen (z. B. für Trailer und TikTok).
 *
 * Android: FLAG_SECURE – Aufnahmen und Screenshots bleiben schwarz, in der
 * App-Übersicht ist die App leer. iOS: Während einer Aufnahme liegt eine
 * schwarze Fläche über der App, Screenshots zeigen nichts, in der App-Übersicht
 * ist die App verschwommen. Im Browser lässt sich das nicht verhindern.
 * Braucht einen neuen nativen Build (expo-screen-capture).
 */

const SCHLUESSEL = "app";

export function BildschirmSchutz() {
  const { inhaber } = useClipRechte();

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (inhaber) {
      ScreenCapture.allowScreenCaptureAsync(SCHLUESSEL).catch(() => {});
      if (Platform.OS === "ios") ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => {});
    } else {
      ScreenCapture.preventScreenCaptureAsync(SCHLUESSEL).catch(() => {});
      if (Platform.OS === "ios") ScreenCapture.enableAppSwitcherProtectionAsync(0.9).catch(() => {});
    }
  }, [inhaber]);

  return null;
}
