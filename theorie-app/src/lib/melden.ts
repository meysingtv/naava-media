import { Alert, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { frageVon } from "./fragen";

const SUPPORT = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;
const SCHLUESSEL = "spur-meldungen";

type Grund = "Fehler in der Frage" | "Antwort stimmt nicht" | "Bild unklar";

async function speichern(id: string, grund: Grund) {
  try {
    const alt = JSON.parse((await AsyncStorage.getItem(SCHLUESSEL)) ?? "[]") as { id: string; grund: Grund; zeit: string }[];
    await AsyncStorage.setItem(SCHLUESSEL, JSON.stringify([...alt, { id, grund, zeit: new Date().toISOString() }].slice(-200)));
  } catch {
    // Meldung ist nur ein Hinweis – ohne Speicher geht nichts verloren, was die App braucht.
  }
}

async function senden(id: string, grund: Grund) {
  await speichern(id, grund);
  const frage = frageVon(id);
  if (SUPPORT) {
    const betreff = encodeURIComponent(`Frage ${id} melden: ${grund}`);
    const text = encodeURIComponent(`${grund}\n\nFrage ${id}: ${frage?.text ?? ""}\n\nWas ist dir aufgefallen?\n`);
    const ok = await Linking.openURL(`mailto:${SUPPORT}?subject=${betreff}&body=${text}`).then(
      () => true,
      () => false,
    );
    if (ok) return;
  }
  Alert.alert("Danke für den Hinweis", "Wir haben die Frage vorgemerkt und schauen sie uns an.");
}

/** Frage melden – mit kurzer Auswahl, was nicht stimmt. */
export function frageMelden(id: string) {
  Alert.alert("Frage melden", "Was stimmt an dieser Frage nicht?", [
    { text: "Fehler in der Frage", onPress: () => senden(id, "Fehler in der Frage") },
    { text: "Antwort stimmt nicht", onPress: () => senden(id, "Antwort stimmt nicht") },
    { text: "Bild unklar", onPress: () => senden(id, "Bild unklar") },
    { text: "Abbrechen", style: "cancel" },
  ]);
}
