import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

// Die Anmeldung (Zugangs-Tokens) liegt verschlüsselt im Schlüsselbund (iOS)
// bzw. im Android-Keystore statt im normalen App-Speicher. SecureStore mag
// nur kleine Werte – längere werden in Stücke geteilt. Was noch im alten
// Speicher liegt, wird beim ersten Lesen übernommen und dort gelöscht.

const STUECK = 1800;

/** SecureStore erlaubt nur Buchstaben, Ziffern, Punkt, Minus und Unterstrich. */
function sicher(schluessel: string): string {
  return schluessel.replace(/[^A-Za-z0-9._-]/g, "_");
}

async function lesen(k: string): Promise<string | null> {
  const anzahl = Number(await SecureStore.getItemAsync(`${k}.n`));
  if (!anzahl) return null;
  let wert = "";
  for (let i = 0; i < anzahl; i++) {
    const teil = await SecureStore.getItemAsync(`${k}.${i}`);
    if (teil == null) return null;
    wert += teil;
  }
  return wert;
}

async function schreiben(k: string, wert: string): Promise<void> {
  const vorher = Number(await SecureStore.getItemAsync(`${k}.n`)) || 0;
  const teile = Math.max(1, Math.ceil(wert.length / STUECK));
  for (let i = 0; i < teile; i++) await SecureStore.setItemAsync(`${k}.${i}`, wert.slice(i * STUECK, (i + 1) * STUECK));
  await SecureStore.setItemAsync(`${k}.n`, String(teile));
  for (let i = teile; i < vorher; i++) await SecureStore.deleteItemAsync(`${k}.${i}`);
}

async function entfernen(k: string): Promise<void> {
  const vorher = Number(await SecureStore.getItemAsync(`${k}.n`)) || 0;
  await SecureStore.deleteItemAsync(`${k}.n`);
  for (let i = 0; i < vorher; i++) await SecureStore.deleteItemAsync(`${k}.${i}`);
}

/** Speicher für die Supabase-Anmeldung (gleiche Form wie AsyncStorage). */
export const sichererSpeicher = {
  async getItem(schluessel: string): Promise<string | null> {
    const k = sicher(schluessel);
    try {
      const wert = await lesen(k);
      if (wert != null) return wert;
      const alt = await AsyncStorage.getItem(schluessel);
      if (alt != null) {
        await schreiben(k, alt);
        await AsyncStorage.removeItem(schluessel);
      }
      return alt;
    } catch {
      // Schlüsselbund nicht erreichbar (sehr selten): lieber angemeldet bleiben.
      return AsyncStorage.getItem(schluessel);
    }
  },
  async setItem(schluessel: string, wert: string): Promise<void> {
    try {
      await schreiben(sicher(schluessel), wert);
      await AsyncStorage.removeItem(schluessel);
    } catch {
      await AsyncStorage.setItem(schluessel, wert);
    }
  },
  async removeItem(schluessel: string): Promise<void> {
    await entfernen(sicher(schluessel)).catch(() => {});
    await AsyncStorage.removeItem(schluessel);
  },
};
