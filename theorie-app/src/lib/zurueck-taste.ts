import { useCallback, useRef } from "react";
import { BackHandler, Platform } from "react-native";
import { useFocusEffect } from "expo-router";

/**
 * Android-Zurück-Taste bzw. -Geste auf Seiten, die auf dem iPhone nicht per
 * Wischen schließen (Training, Prüfung, Duell …): statt sofort zu schließen
 * dasselbe wie der Schließen-Knopf – meist eine Rückfrage.
 */
export function useZurueckTaste(schliessen: () => void) {
  const aktuell = useRef(schliessen);
  aktuell.current = schliessen;
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== "android") return;
      const abo = BackHandler.addEventListener("hardwareBackPress", () => {
        aktuell.current();
        return true;
      });
      return () => abo.remove();
    }, []),
  );
}
