import { Alert } from "react-native";

/**
 * Fängt JavaScript-Fehler ab, bevor React Native daraus einen Absturz macht.
 *
 * Hintergrund: Im Release-Build meldet React Native einen fatalen JS-Fehler an
 * den ExceptionsManager. Der wirft daraufhin eine NSException – auf iOS 26+
 * wird die auf dem falschen Thread verarbeitet, und die App stürzt sofort ab,
 * ohne dass man den eigentlichen Fehler sieht (facebook/react-native#54859).
 *
 * Fatale Fehler kommen auf zwei Wegen: über ErrorUtils (z. B. in Timern) und
 * direkt aus React (Fehler beim Zeichnen oder in Effekten, die keine
 * Fehlergrenze auffängt – das geht an ErrorUtils vorbei). Deshalb wird hier
 * ExceptionsManager.handleException selbst ersetzt: Fatale Fehler werden nur
 * noch angezeigt und als „nicht fatal“ gemeldet, die App bleibt offen.
 *
 * Wird in index.js als Allererstes geladen. Nur im Release-Build aktiv.
 */

type Melden = (fehler: unknown, fatal: boolean) => void;

let gezeigt = false;

function textVon(fehler: unknown): string {
  if (fehler instanceof Error) return `${fehler.name}: ${fehler.message}`;
  try {
    return String(fehler);
  } catch {
    return "Unbekannter Fehler";
  }
}

function anzeigen(fehler: unknown) {
  const text = textVon(fehler);
  console.error("Fataler Fehler:", text);
  if (gezeigt) return;
  gezeigt = true;
  setTimeout(() => {
    try {
      Alert.alert("Da ist etwas schiefgelaufen", `${text}\n\nBitte schick uns einen Screenshot davon.`);
    } catch {
      // Ohne Alert bleibt es beim Eintrag im Protokoll
    }
  }, 800);
}

if (!__DEV__) {
  // 1) ExceptionsManager – hier landen auch Fehler aus React
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const modul = require("react-native/Libraries/Core/ExceptionsManager");
    const em: { handleException?: Melden } = modul?.default ?? modul;
    const original = em?.handleException;
    if (em && typeof original === "function") {
      em.handleException = (fehler: unknown, fatal: boolean) => {
        if (fatal) {
          anzeigen(fehler);
          return;
        }
        try {
          original(fehler, false);
        } catch {
          // Melden darf nie selbst abstürzen
        }
      };
    }
  } catch {
    // Wenn sich der Aufbau von React Native ändert, bleibt es beim Standard
  }

  // 2) ErrorUtils – globale Fehler außerhalb von React
  const eu = (globalThis as { ErrorUtils?: { getGlobalHandler(): Melden; setGlobalHandler(h: Melden): void } }).ErrorUtils;
  if (eu) {
    const vorher = eu.getGlobalHandler();
    eu.setGlobalHandler((fehler, fatal) => {
      if (fatal) anzeigen(fehler);
      else vorher(fehler, false);
    });
  }
}
