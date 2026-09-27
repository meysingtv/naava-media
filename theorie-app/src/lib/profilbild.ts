import { useEffect, useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";

/**
 * Profilbild – bleibt auf dem Gerät (als Daten-URL im Speicher der App).
 * Ohne Bild zeigt die App die Initialen.
 */

const SCHLUESSEL = "spur-profilbild";
let bild: string | null = null;
let geladen = false;
const hoerer = new Set<() => void>();

function melden() {
  for (const h of hoerer) h();
}

async function laden() {
  if (geladen) return;
  geladen = true;
  try {
    bild = await AsyncStorage.getItem(SCHLUESSEL);
  } catch {
    bild = null;
  }
  melden();
}

export function useProfilbild(): string | null {
  useEffect(() => {
    laden();
  }, []);
  return useSyncExternalStore(
    (h) => {
      hoerer.add(h);
      return () => {
        hoerer.delete(h);
      };
    },
    () => bild,
    () => bild,
  );
}

/** Bild aus der Mediathek wählen und quadratisch zuschneiden. */
export async function profilbildWaehlen(): Promise<boolean> {
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.45,
    base64: true,
  });
  const datei = r.canceled ? null : r.assets?.[0];
  if (!datei?.base64) return false;
  bild = `data:${datei.mimeType ?? "image/jpeg"};base64,${datei.base64}`;
  melden();
  await AsyncStorage.setItem(SCHLUESSEL, bild).catch(() => {});
  return true;
}

export async function profilbildEntfernen() {
  bild = null;
  melden();
  await AsyncStorage.removeItem(SCHLUESSEL).catch(() => {});
}
