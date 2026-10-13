// Sprechen mit der KI: Spracherkennung (expo-speech-recognition) und
// Vorlesen (expo-speech). Beide Module stecken erst ab dem nächsten
// App-Build in der App – in älteren Builds und in Expo Go fehlen sie, dann
// geht nur Tippen und die Antwort wird nicht vorgelesen.

type ErkennungModul = typeof import("expo-speech-recognition");
type SprachModul = typeof import("expo-speech");

function erkennungLaden(): ErkennungModul | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-speech-recognition") as ErkennungModul;
  } catch {
    return null;
  }
}

function spracheLaden(): SprachModul | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-speech") as SprachModul;
  } catch {
    return null;
  }
}

const erkennung = erkennungLaden();
const sprache = spracheLaden();

/** Kann diese App-Version zuhören? */
export function zuhoerenMoeglich(): boolean {
  try {
    return !!erkennung?.ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    return false;
  }
}

export type Zuhoeren = {
  /** Fertig sprechen lassen – das Ergebnis kommt als letzter Text. */
  stoppen: () => void;
  /** Abbrechen ohne Ergebnis. */
  abbrechen: () => void;
};

export type ZuhoerenFehler = "nicht_verfuegbar" | "erlaubnis" | "nichts_gehoert" | "netz" | "fehler";

/** Begriffe, die die Erkennung sonst gern falsch versteht. */
const FACHWOERTER = ["Vorfahrt", "rechts vor links", "Anhalteweg", "Bremsweg", "Reaktionsweg", "Probezeit", "Rettungsgasse", "Fahrschule", "Theorieprüfung", "Promille", "Tempo 30"];

/**
 * Zuhören starten. `onText` kommt laufend mit dem bisher Erkannten,
 * `onPegel` mit der Lautstärke (0 bis 1) für die Kugel.
 */
export async function zuhoerenStarten(h: {
  onText: (text: string, fertig: boolean) => void;
  onPegel: (pegel: number) => void;
  onEnde: () => void;
  onFehler: (f: ZuhoerenFehler) => void;
}): Promise<Zuhoeren | null> {
  const m = erkennung?.ExpoSpeechRecognitionModule;
  if (!m || !zuhoerenMoeglich()) {
    h.onFehler("nicht_verfuegbar");
    return null;
  }
  const erlaubnis = await m.requestPermissionsAsync().catch(() => null);
  if (!erlaubnis?.granted) {
    h.onFehler("erlaubnis");
    return null;
  }

  let aus = false;
  const abos = [
    m.addListener("result", (e) => h.onText(e.results[0]?.transcript ?? "", e.isFinal)),
    m.addListener("volumechange", (e) => h.onPegel(Math.min(1, Math.max(0, (e.value + 1) / 9)))),
    m.addListener("error", (e) => {
      if (e.error === "aborted") return;
      h.onFehler(e.error === "not-allowed" ? "erlaubnis" : e.error === "no-speech" || e.error === "speech-timeout" ? "nichts_gehoert" : e.error === "network" ? "netz" : "fehler");
    }),
    m.addListener("end", () => {
      aufraeumen();
      h.onEnde();
    }),
  ];
  function aufraeumen() {
    if (aus) return;
    aus = true;
    abos.forEach((a) => a.remove());
  }

  m.start({
    lang: "de-DE",
    interimResults: true,
    continuous: false,
    addsPunctuation: true,
    contextualStrings: FACHWOERTER,
    volumeChangeEventOptions: { enabled: true, intervalMillis: 70 },
    androidIntentOptions: { EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1400 },
  });

  return {
    stoppen: () => m.stop(),
    abbrechen: () => {
      aufraeumen();
      m.abort();
    },
  };
}

// ---------------------------------------------------------------------------
// Vorlesen
// ---------------------------------------------------------------------------

/** Kann diese App-Version vorlesen? */
export const vorlesenMoeglich = !!sprache;

let stimme: string | undefined;
let stimmeGesucht = false;

/** Die schönste deutsche Stimme auf dem Gerät (erweiterte Qualität bevorzugt). */
async function besteStimme(): Promise<string | undefined> {
  if (stimmeGesucht || !sprache) return stimme;
  stimmeGesucht = true;
  try {
    const alle = (await sprache.getAvailableVoicesAsync()).filter((v) => v.language.toLowerCase().startsWith("de"));
    const gut = alle.find((v) => v.quality === sprache.VoiceQuality.Enhanced && v.language === "de-DE") ?? alle.find((v) => v.language === "de-DE") ?? alle[0];
    stimme = gut?.identifier;
  } catch {
    stimme = undefined;
  }
  return stimme;
}

/** Markdown, Aufzählungszeichen und Emojis raus – sonst liest die Stimme sie vor. */
export function zumVorlesen(text: string): string {
  return text
    .replace(/\*\*/g, "")
    .replace(/^[•\-–]\s*/gm, "")
    .replace(/ /g, " ")
    .replace(/km\/h/g, "Kilometer pro Stunde")
    .replace(/(\d)\s?m\b/g, "$1 Meter")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, ", ")
    .trim();
}

/** Text vorlesen; `onEnde` kommt auch beim Abbrechen. */
export async function vorlesen(text: string, h: { onStart?: () => void; onEnde: () => void }): Promise<void> {
  if (!sprache) {
    h.onEnde();
    return;
  }
  const id = await besteStimme();
  sprache.stop();
  sprache.speak(zumVorlesen(text), {
    language: "de-DE",
    voice: id,
    rate: 1.0,
    pitch: 1.0,
    onStart: h.onStart,
    onDone: h.onEnde,
    onStopped: h.onEnde,
    onError: h.onEnde,
  });
}

export function vorlesenStoppen() {
  sprache?.stop();
}
