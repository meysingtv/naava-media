import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo";

/**
 * Live-Aktivitäten (Sperrbildschirm + Dynamic Island) – nur iPhone ab iOS 16.2.
 * Native Seite: modules/live-aktivitaet, Ansichten: targets/pruefung-live.
 * Auf Android, im Web und in Expo Go gibt es das Modul nicht; dann passiert einfach nichts.
 */
type Nativ = {
  verfuegbar(): boolean;
  simulationStarten(gesamt: number, startMs: number, fristMs: number): boolean;
  simulationAktualisieren(frage: number, beantwortet: number): void;
  simulationAbgeben(fehlerpunkte: number, bestanden: boolean, richtig: number, beantwortet: number, endeMs: number): void;
  simulationBeenden(): void;
  pruefungstagStarten(terminMs: number, hinweis: string): boolean;
  pruefungstagLaeuft(terminMs: number): boolean;
  pruefungstagBeenden(): void;
  /** Warum zuletzt keine Live-Aktivität gestartet ist (fehlt in älteren Builds). */
  letzterFehler?(): string;
};

const nativ = Platform.OS === "ios" ? requireOptionalNativeModule<Nativ>("LiveAktivitaet") : null;
let jsFehler = "";

function sicher<T>(aufruf: (n: Nativ) => T, ersatz: T): T {
  if (!nativ) return ersatz;
  try {
    return aufruf(nativ);
  } catch (e) {
    jsFehler = String(e);
    return ersatz;
  }
}

/**
 * Nur beim Entwickeln: im Terminal (und unten im Simulator) zeigen, ob die Live-Aktivität
 * gestartet ist – und wenn nicht, warum.
 */
function melden(was: string, gestartet: boolean, erfolgZeigen = true) {
  if (!__DEV__ || Platform.OS !== "ios") return;
  if (gestartet) {
    if (erfolgZeigen) console.log(`Live-Aktivität (${was}) gestartet – zu sehen auf dem Home-Bildschirm (Simulator: ⇧⌘H) und dem Sperrbildschirm (⌘L).`);
    return;
  }
  let grund: string;
  if (!nativ) {
    grund = "Das native Modul fehlt, die App ist ohne Live-Aktivität gebaut. Einmal „npx expo prebuild --clean -p ios“, dann „npx expo run:ios“.";
  } else if (!liveAktivitaetMoeglich()) {
    grund =
      "iOS erlaubt sie nicht. Entweder fehlt NSSupportsLiveActivities (App mit „npx expo prebuild --clean -p ios“ neu bauen) oder Live-Aktivitäten sind unter Einstellungen → Fahrschul Pro aus.";
  } else {
    grund = sicher((n) => n.letzterFehler?.() ?? "", "") || jsFehler || "unbekannt";
  }
  console.warn(`Live-Aktivität (${was}) nicht gestartet: ${grund}`);
}

/** Gibt es Live-Aktivitäten auf diesem Gerät (und sind sie in den Einstellungen erlaubt)? */
export const liveAktivitaetMoeglich = () => sicher((n) => n.verfuegbar(), false);

export const liveSimulation = {
  starten: (gesamt: number, startMs: number, fristMs: number) => {
    const ok = sicher((n) => n.simulationStarten(gesamt, startMs, fristMs), false);
    melden("Prüfungssimulation", ok);
    return ok;
  },
  aktualisieren: (frage: number, beantwortet: number) => sicher((n) => n.simulationAktualisieren(frage, beantwortet), undefined),
  abgeben: (e: { fehlerpunkte: number; bestanden: boolean; richtig: number; beantwortet: number; endeMs: number }) =>
    sicher((n) => n.simulationAbgeben(e.fehlerpunkte, e.bestanden, e.richtig, e.beantwortet, e.endeMs), undefined),
  beenden: () => sicher((n) => n.simulationBeenden(), undefined),
};

export const livePruefungstag = {
  starten: (terminMs: number, hinweis: string) => {
    const ok = sicher((n) => n.pruefungstagStarten(terminMs, hinweis), false);
    // Läuft bei jedem Öffnen der App – daher nur Fehler melden.
    melden("Prüfungstag", ok, false);
    return ok;
  },
  laeuft: (terminMs: number) => sicher((n) => n.pruefungstagLaeuft(terminMs), false),
  beenden: () => sicher((n) => n.pruefungstagBeenden(), undefined),
};
