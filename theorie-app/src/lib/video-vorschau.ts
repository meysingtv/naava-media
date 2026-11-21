import { useEffect, useState } from "react";
import { Platform } from "react-native";
import * as VideoThumbnails from "expo-video-thumbnails";

// Vorschaubild aus einem Video (ein Bild nach gut einer Sekunde). Auf dem
// Handy einmal je Sitzung erzeugt und gemerkt; im Browser gibt es keins –
// dann zeigt die Seite das Themenbild.

const fertig = new Map<string, string | null>();
const laeuft = new Map<string, Promise<string | null>>();

function erzeugen(url: string): Promise<string | null> {
  const offen = laeuft.get(url);
  if (offen) return offen;
  const p = VideoThumbnails.getThumbnailAsync(url, { time: 1200, quality: 0.6 })
    .then((b) => b.uri)
    .catch(() => null)
    .then((uri) => {
      fertig.set(url, uri);
      laeuft.delete(url);
      return uri;
    });
  laeuft.set(url, p);
  return p;
}

export function useVideoVorschau(url: string | null): string | null {
  const [uri, setUri] = useState<string | null>(() => (url ? fertig.get(url) ?? null : null));
  useEffect(() => {
    if (!url || Platform.OS === "web") return;
    if (fertig.has(url)) {
      setUri(fertig.get(url) ?? null);
      return;
    }
    let aktiv = true;
    erzeugen(url).then((u) => aktiv && setUri(u));
    return () => {
      aktiv = false;
    };
  }, [url]);
  return uri;
}
