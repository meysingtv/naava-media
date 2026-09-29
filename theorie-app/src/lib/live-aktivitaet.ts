import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo";

/**
 * Live-Aktivitäten (Sperrbildschirm + Dynamic Island) – nur iPhone ab iOS 16.2.
 * Native Seite: modules/live-aktivitaet, Ansichten: targets/pruefung-live.
 * Auf Android, im Web und in Expo Go gibt es das Modul nicht; dann passiert einfach nichts.
 */
type Nativ = {
  verfuegbar(): boolean;
  simulationStarten(gesamt: number, startMs: number): boolean;
  simulationAktualisieren(frage: number, beantwortet: number): void;
  simulationAbgeben(fehlerpunkte: number, bestanden: boolean, richtig: number, beantwortet: number, endeMs: number): void;
  simulationBeenden(): void;
  pruefungstagStarten(terminMs: number, hinweis: string): boolean;
  pruefungstagLaeuft(terminMs: number): boolean;
  pruefungstagBeenden(): void;
};

const nativ = Platform.OS === "ios" ? requireOptionalNativeModule<Nativ>("LiveAktivitaet") : null;

function sicher<T>(aufruf: (n: Nativ) => T, ersatz: T): T {
  if (!nativ) return ersatz;
  try {
    return aufruf(nativ);
  } catch {
    return ersatz;
  }
}

/** Gibt es Live-Aktivitäten auf diesem Gerät (und sind sie in den Einstellungen erlaubt)? */
export const liveAktivitaetMoeglich = () => sicher((n) => n.verfuegbar(), false);

export const liveSimulation = {
  starten: (gesamt: number, startMs: number) => sicher((n) => n.simulationStarten(gesamt, startMs), false),
  aktualisieren: (frage: number, beantwortet: number) => sicher((n) => n.simulationAktualisieren(frage, beantwortet), undefined),
  abgeben: (e: { fehlerpunkte: number; bestanden: boolean; richtig: number; beantwortet: number; endeMs: number }) =>
    sicher((n) => n.simulationAbgeben(e.fehlerpunkte, e.bestanden, e.richtig, e.beantwortet, e.endeMs), undefined),
  beenden: () => sicher((n) => n.simulationBeenden(), undefined),
};

export const livePruefungstag = {
  starten: (terminMs: number, hinweis: string) => sicher((n) => n.pruefungstagStarten(terminMs, hinweis), false),
  laeuft: (terminMs: number) => sicher((n) => n.pruefungstagLaeuft(terminMs), false),
  beenden: () => sicher((n) => n.pruefungstagBeenden(), undefined),
};
