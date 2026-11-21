import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";
import * as ImagePicker from "expo-image-picker";

// Greenscreen im Live (nur iPhone, nur Gastgeber): Im gesendeten Kamerabild wird
// die Person freigestellt, dahinter liegt ein Bild oder Video aus der Galerie –
// immer über den ganzen Ausschnitt, nicht verschieb- oder skalierbar. Gerechnet
// wird nativ (modules/live-greenscreen) direkt vor dem Senden, die Zuschauer
// bekommen das fertige Bild. Ohne neu gebaute App fehlt das Modul – dann ist der
// Greenscreen einfach nicht da.

type Nativ = {
  verfuegbar(): boolean;
  setzeBild(uri: string): Promise<boolean>;
  setzeVideo(uri: string): Promise<boolean>;
  entfernen(): void;
};

const nativ = Platform.OS === "ios" ? requireOptionalNativeModule<Nativ>("LiveGreenscreen") : null;

/** Name des Effekts – derselbe steht in GreenscreenProzessor.swift. */
export const GREENSCREEN_EFFEKT = "fahrschul-greenscreen";

export const greenscreenMoeglich = Boolean(nativ);

export type Greenscreen = { art: "bild" | "video"; uri: string };

/** Bild oder Video aus der Galerie wählen (null = abgebrochen). */
export async function greenscreenWaehlen(): Promise<Greenscreen | null> {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images", "videos"], quality: 1, videoMaxDuration: 600 });
  const datei = r.canceled ? null : r.assets?.[0];
  if (!datei) return null;
  return { art: datei.type === "video" ? "video" : "bild", uri: datei.uri };
}

/** Hintergrund im nativen Teil setzen. Liefert false, wenn die Datei nicht lesbar ist. */
export async function greenscreenSetzen(g: Greenscreen): Promise<boolean> {
  if (!nativ) return false;
  try {
    return g.art === "video" ? await nativ.setzeVideo(g.uri) : await nativ.setzeBild(g.uri);
  } catch {
    return false;
  }
}

export function greenscreenEntfernen() {
  try {
    nativ?.entfernen();
  } catch {
    // Modul fehlt oder schon leer
  }
}

/**
 * Video-Effekte der eigenen Kameraspur setzen (react-native-webrtc). Die Liste
 * ersetzt die alte – darum Greenscreen und zweite Kamera immer zusammen setzen.
 */
export function effekteAnSpur(spur: unknown, namen: string[]) {
  const mst = (spur as { mediaStreamTrack?: { _setVideoEffects?: (namen: string[]) => void } } | undefined)?.mediaStreamTrack;
  try {
    mst?._setVideoEffects?.(nativ ? namen : []);
  } catch {
    // Spur schon beendet
  }
}
