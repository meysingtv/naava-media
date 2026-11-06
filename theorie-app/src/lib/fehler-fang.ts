import { Alert } from "react-native";

/**
 * Fängt JavaScript-Fehler ab, bevor React Native daraus einen Absturz macht.
 *
 * Hintergrund: In React Native 0.81 meldet der Standard-Handler einen fatalen
 * JS-Fehler im Release-Build an den ExceptionsManager. Der wirft daraufhin eine
 * NSException, die auf iOS 26+ auf dem falschen Thread in einen JS-Fehler
 * umgewandelt wird – das zerstört den Speicher von Hermes und die App stürzt
 * direkt ab, ohne dass man den eigentlichen Fehler sieht
 * (facebook/react-native#54859). Hier wird der Fehler stattdessen angezeigt,
 * die App bleibt offen.
 *
 * Wird in index.js als Allererstes geladen.
 */

type Handler = (fehler: unknown, fatal?: boolean) => void;
type FehlerUtils = { getGlobalHandler(): Handler; setGlobalHandler(h: Handler): void };

const eu = (globalThis as { ErrorUtils?: FehlerUtils }).ErrorUtils;
let gezeigt = false;

if (eu && !__DEV__) {
  const vorher = eu.getGlobalHandler();
  eu.setGlobalHandler((fehler, fatal) => {
    if (!fatal) {
      vorher(fehler, false);
      return;
    }
    const text = fehler instanceof Error ? `${fehler.name}: ${fehler.message}` : String(fehler);
    console.error("Fataler Fehler:", text);
    if (gezeigt) return;
    gezeigt = true;
    setTimeout(() => {
      Alert.alert("Da ist etwas schiefgelaufen", `${text}\n\nBitte schick uns einen Screenshot davon.`);
    }, 800);
  });
}
