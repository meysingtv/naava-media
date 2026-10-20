import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

// Das iPhone rechnet Clip-Videos schon beim Auswählen auf 720p herunter
// (videoExportPreset im Bild-Picker). Android kann das nicht – hier macht
// es diese Funktion nach: H.264, längste Seite 1280 px, ~2,5 Mbit/s.
// In Expo Go fehlt das native Modul; dann bleibt das Original.

type Kompressor = typeof import("react-native-compressor");

function kompressor(): Kompressor | null {
  try {
    // Erst hier laden – in Expo Go gibt es das Modul nicht.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native-compressor") as Kompressor;
  } catch {
    return null;
  }
}

/** Braucht diese Plattform das Verkleinern? (iPhone: macht der Picker.) */
export const verkleinernNoetig = Platform.OS === "android";

/**
 * Video verkleinern. Liefert die neue Datei samt Größe – oder null, wenn es
 * hier nicht geht (dann das Original verwenden).
 */
export async function videoVerkleinern(
  uri: string,
  onFortschritt?: (anteil: number) => void,
  abbruch?: { aktuell: (() => void) | null },
): Promise<{ uri: string; groesse: number | null } | null> {
  if (!verkleinernNoetig) return null;
  const k = kompressor();
  if (!k?.Video?.compress) return null;
  try {
    const neu = await k.Video.compress(
      uri,
      {
        compressionMethod: "manual",
        maxSize: 1280,
        bitrate: 2_500_000,
        progressDivider: 2,
        getCancellationId: (id) => {
          if (abbruch) abbruch.aktuell = () => k.Video.cancelCompression(id);
        },
      },
      (p) => onFortschritt?.(Math.max(0, Math.min(1, p))),
    );
    const info = await FileSystem.getInfoAsync(neu);
    return { uri: neu, groesse: info.exists && "size" in info ? info.size : null };
  } catch {
    return null;
  } finally {
    if (abbruch) abbruch.aktuell = null;
  }
}
