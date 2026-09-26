import type { ImageSourcePropType } from "react-native";

import type { ThemaId } from "./fragen";

/**
 * Fotos der App. Alle Bilder stehen unter freien Lizenzen (CC0, Public Domain,
 * CC BY 2.0, CC BY-SA 2.0) und wurden für die App verkleinert. Die Nachweise
 * stehen unten und in der App unter Einstellungen → Bildnachweise.
 */
export const FOTOS = {
  tagesziel: require("../../assets/images/fotos/tagesziel.jpg"),
  lernen: require("../../assets/images/fotos/lernen.jpg"),
  simulation: require("../../assets/images/fotos/simulation.jpg"),
  pruefung: require("../../assets/images/fotos/pruefung.jpg"),
  grundstoff: require("../../assets/images/fotos/grundstoff.jpg"),
  gefahren: require("../../assets/images/fotos/gefahren.jpg"),
  vorfahrt: require("../../assets/images/fotos/vorfahrt.jpg"),
  zeichen: require("../../assets/images/fotos/zeichen.jpg"),
  umwelt: require("../../assets/images/fotos/umwelt.jpg"),
  technik: require("../../assets/images/fotos/technik.jpg"),
  verhalten: require("../../assets/images/fotos/verhalten.jpg"),
  tempo: require("../../assets/images/fotos/tempo.jpg"),
  parken: require("../../assets/images/fotos/parken.jpg"),
  autobahn: require("../../assets/images/fotos/autobahn.jpg"),
  mensch: require("../../assets/images/fotos/mensch.jpg"),
  zahlen: require("../../assets/images/fotos/zahlen.jpg"),
  strasse1: require("../../assets/images/fotos/strasse1.jpg"),
  strasse2: require("../../assets/images/fotos/strasse2.jpg"),
  strasse3: require("../../assets/images/fotos/strasse3.jpg"),
  baeume: require("../../assets/images/fotos/baeume.jpg"),
} satisfies Record<string, ImageSourcePropType>;

export type FotoKey = keyof typeof FOTOS;

const THEMA_FOTO: Record<ThemaId, FotoKey> = {
  gefahren: "gefahren",
  vorfahrt: "vorfahrt",
  zeichen: "zeichen",
  umwelt: "umwelt",
  technik: "technik",
  manoever: "verhalten",
  tempo: "tempo",
  parken: "parken",
  autobahn: "autobahn",
  mensch: "mensch",
  zahlen: "zahlen",
};

export function themaFoto(thema: ThemaId): ImageSourcePropType {
  return FOTOS[THEMA_FOTO[thema]];
}

/** Straßenfotos für die Fahrersicht bei Zeichenfragen – je Frage fest gewählt. */
const STRASSEN: FotoKey[] = ["strasse1", "strasse2", "strasse3"];

export function strassenFoto(schluessel: string): ImageSourcePropType {
  let h = 0;
  for (let i = 0; i < schluessel.length; i++) h = (h * 31 + schluessel.charCodeAt(i)) >>> 0;
  return FOTOS[STRASSEN[h % STRASSEN.length]];
}

export type Nachweis = { foto: FotoKey; titel: string; urheber: string; lizenz: string; seite: string };

const LIZENZ_NAME: Record<string, string> = {
  "by 2.0": "CC BY 2.0",
  "by-sa 2.0": "CC BY-SA 2.0",
  "cc0 1.0": "CC0 1.0 (gemeinfrei)",
  "pdm 1.0": "Public Domain Mark 1.0",
};

export const LIZENZ_LINK: Record<string, string> = {
  "CC BY 2.0": "https://creativecommons.org/licenses/by/2.0/",
  "CC BY-SA 2.0": "https://creativecommons.org/licenses/by-sa/2.0/",
  "CC0 1.0 (gemeinfrei)": "https://creativecommons.org/publicdomain/zero/1.0/",
  "Public Domain Mark 1.0": "https://creativecommons.org/publicdomain/mark/1.0/",
};

const roh: [FotoKey, string, string, string, string][] = [
  ["tagesziel", "Smile", "Zach Dischner", "by 2.0", "https://www.flickr.com/photos/35557234@N07/15541431101"],
  ["lernen", "Winding Road @ Sunset", "tan ah beng", "by 2.0", "https://www.flickr.com/photos/38243549@N02/4272752951"],
  ["simulation", "Examiner filling in driver's license road test form", "f0976531950157", "pdm 1.0", "https://www.flickr.com/photos/203928447@N02/54999169448"],
  ["pruefung", "View windscreen Audi interior two-lane", "rawpixel", "cc0 1.0", "https://www.rawpixel.com/image/3300549/free-photo-image-automobile-car-images-pictures"],
  ["grundstoff", "The road to Cusco, Peru", "Dimitry B", "by 2.0", "https://www.flickr.com/photos/61533954@N00/15001243695"],
  ["gefahren", "long way down", "paul bica", "by 2.0", "https://www.flickr.com/photos/99771506@N00/14319678044"],
  ["vorfahrt", "MS19 MS35 North Signs - Yield Intersection MS14", "formulanone", "by-sa 2.0", "https://www.flickr.com/photos/30552029@N00/27027102147"],
  ["zeichen", "Speed Limit: 30 mph", "mikecogh", "by 2.0", "https://www.flickr.com/photos/89165847@N00/2442970873"],
  ["umwelt", "Mecklenburg-Vorpommern", "ThomasKohler", "by 2.0", "https://www.flickr.com/photos/28077296@N02/5632654454"],
  ["technik", "1974 SAAB 99LE engine", "liftarn", "by-sa 2.0", "https://www.flickr.com/photos/8543480@N06/1437963023"],
  ["verhalten", "Bus Stop on the Dunsmuir Separated Bike Lane", "Paul Krueger", "by 2.0", "https://www.flickr.com/photos/30604571@N00/5134405164"],
  ["tempo", "speedometer", "Sean MacEntee", "by 2.0", "https://www.flickr.com/photos/18090920@N07/5546966357"],
  ["parken", "Electric Car License Plates", "jurvetson", "by 2.0", "https://www.flickr.com/photos/44124348109@N01/3391637194"],
  ["autobahn", "Curve 80", "96dpi", "by 2.0", "https://www.flickr.com/photos/67499195@N00/2778343149"],
  ["mensch", "View windshield road dusk", "rawpixel", "cc0 1.0", "https://www.rawpixel.com/image/3282756/free-photo-image-driving-car-asphalt"],
  ["zahlen", "Dashboard", "Photo Monkey", "by 2.0", "https://www.flickr.com/photos/87374213@N00/12746989"],
  ["strasse1", "Country road", "prague.czech.photo", "by 2.0", "https://www.flickr.com/photos/99424477@N04/15214051925"],
  ["strasse2", "Euro Road Trip 2012 - 090", "Kyle Taylor, Dream It. Do It.", "by 2.0", "https://www.flickr.com/photos/95672737@N00/7345496698"],
  ["strasse3", "Landstrasse", "ThomasKohler", "by 2.0", "https://www.flickr.com/photos/28077296@N02/8586132860"],
  ["baeume", "The drive from Arbury Hall - North Lodge", "ell brown", "by-sa 2.0", "https://www.flickr.com/photos/39415781@N06/33556283563"],
];

export const NACHWEISE: Nachweis[] = roh.map(([foto, titel, urheber, lizenz, seite]) => ({ foto, titel, urheber, lizenz: LIZENZ_NAME[lizenz] ?? lizenz, seite }));
