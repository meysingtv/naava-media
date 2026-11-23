import { SvgXml } from "react-native-svg";

// Linien-Icons im Fahrschul-Pro-Stil (lila Outline, 24 × 24). Quelle: SVG-Dateien
// aus den Design-Paketen, hier als Text eingebettet, damit sie überall laufen.

const ICONS = {
  "auto-bei-schlechtem-wetter": "<g stroke=\"FARBE\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"> <path d=\"M4 14.5h1.2l1.4-3.2A2 2 0 0 1 8.43 10H14.6a2 2 0 0 1 1.83 1.2l1.02 2.3H20a1 1 0 0 1 1 1v1.5H3v-1.5a1 1 0 0 1 1-1Z\"/> <circle cx=\"8\" cy=\"16.5\" r=\"1.5\"/> <circle cx=\"16\" cy=\"16.5\" r=\"1.5\"/> <path d=\"M7 10h7.5\"/> <path d=\"M6 6.2 5.4 8\"/> <path d=\"M10 5.2 9.4 7\"/> <path d=\"M14 6.2 13.4 8\"/> <path d=\"M4 19c.8-.6 1.6-.6 2.4 0 .8.6 1.6.6 2.4 0\"/> <path d=\"M12 19c.8-.6 1.6-.6 2.4 0 .8.6 1.6.6 2.4 0\"/> </g>",
  "einparken": "<g stroke=\"FARBE\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"> <path d=\"M4.5 14.5h1l1.3-3A2 2 0 0 1 8.63 10H13.7a2 2 0 0 1 1.84 1.22l.92 2.28H18a1 1 0 0 1 1 1V16H3.5v-1.5a1 1 0 0 1 1-1Z\"/> <circle cx=\"8\" cy=\"16\" r=\"1.4\"/> <circle cx=\"15\" cy=\"16\" r=\"1.4\"/> <path d=\"M7.2 10h6\"/> <path d=\"M20 6v12\"/> <path d=\"M17.5 6H20a2.5 2.5 0 0 1 0 5h-2.5Z\"/> </g>",
  "kreisverkehr": "<g stroke=\"FARBE\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"> <path d=\"M8.2 7.8a5.5 5.5 0 0 1 6.7-1.1\"/> <path d=\"m14.9 4.9.6 2.1-2.1.6\"/> <path d=\"M16.2 8.2a5.5 5.5 0 0 1 1.1 6.7\"/> <path d=\"m19.1 14.9-2.1.6-.6-2.1\"/> <path d=\"M15.8 16.2a5.5 5.5 0 0 1-6.7 1.1\"/> <path d=\"m9.1 19.1-.6-2.1 2.1-.6\"/> <path d=\"M7.8 15.8a5.5 5.5 0 0 1-1.1-6.7\"/> <path d=\"m4.9 9.1 2.1-.6.6 2.1\"/> </g>",
  "kurzvideos": "<g stroke=\"FARBE\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"> <rect x=\"4\" y=\"6.5\" width=\"11\" height=\"11\" rx=\"2.2\"/> <path d=\"m9 10 3.5 2L9 14v-4Z\"/> <path d=\"M18.2 7.5 16.8 11h2.1l-1.1 5 3.1-4H19l1.1-4.5Z\"/> </g>",
  "praxis": "<g stroke=\"FARBE\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"> <circle cx=\"12\" cy=\"12\" r=\"5.5\"/> <circle cx=\"12\" cy=\"12\" r=\"1.5\"/> <path d=\"M12 10.5V6.5\"/> <path d=\"m10.7 12.8-3.7 2.1\"/> <path d=\"m13.3 12.8 3.7 2.1\"/> </g>",
  "technik": "<g stroke=\"FARBE\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"> <path d=\"M6 15.5 4.5 17l2.5 2.5 1.5-1.5\"/> <path d=\"M8.5 15.5 12 12\"/> <path d=\"M13 6.2h1.2l.4-1.4 1.8.7-.2 1.4a4.9 4.9 0 0 1 1.1.9l1.3-.5.9 1.7-1.1.9c.1.4.2.8.2 1.2s-.1.8-.2 1.2l1.1.9-.9 1.7-1.3-.5a4.9 4.9 0 0 1-1.1.9l.2 1.4-1.8.7-.4-1.4H13a5 5 0 0 1-1.2 0l-.4 1.4-1.8-.7.2-1.4a4.9 4.9 0 0 1-1.1-.9l-1.3.5-.9-1.7 1.1-.9a5 5 0 0 1 0-2.4l-1.1-.9.9-1.7 1.3.5a4.9 4.9 0 0 1 1.1-.9l-.2-1.4 1.8-.7.4 1.4c.4-.04.8-.04 1.2 0Z\"/> <circle cx=\"13.6\" cy=\"11.5\" r=\"1.7\"/> </g>",
  "theorie": "<g stroke=\"FARBE\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"> <path d=\"M4.5 6.5h5.7A3.3 3.3 0 0 1 13 7.8v10.7a3.3 3.3 0 0 0-2.8-1.3H4.5Z\"/> <path d=\"M19.5 6.5h-5.7A3.3 3.3 0 0 0 11 7.8v10.7a3.3 3.3 0 0 1 2.8-1.3h5.7Z\"/> </g>",
  "verhalten-im-notfall": "<g stroke=\"FARBE\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"> <path d=\"M9 9c0-2 1.6-3.5 3-3.5S15 7 15 9v4H9V9Z\"/> <path d=\"M8 13h8\"/> <path d=\"M10 13v2.2a2 2 0 0 0 .73 1.55L12 17.8l1.27-1.05A2 2 0 0 0 14 15.2V13\"/> <path d=\"M12 3.5V2.2\"/> <path d=\"M7.6 5.1 6.7 4.2\"/> <path d=\"M16.4 5.1l.9-.9\"/> <path d=\"M6 9H4.7\"/> <path d=\"M19.3 9H18\"/> </g>",
  "verkehrszeichen": "<g stroke=\"FARBE\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"> <path d=\"M12 6 17 15H7l5-9Z\"/> <path d=\"M12 15v4\"/> <path d=\"M10 20h4\"/> </g>",
  "video": "<rect x=\"3\" y=\"5\" width=\"14\" height=\"14\" rx=\"2\"/><path d=\"m17 9 5-3v12l-5-3\"/>",
  "crosshair": "<circle cx=\"12\" cy=\"12\" r=\"8\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 1v4M12 19v4M1 12h4M19 12h4\"/>",
  "bolt": "<path d=\"m14 2-9 11h7l-2 9 9-12h-7z\"/>",
  "graduation-cap": "<path d=\"m2 9 10-6 10 6-10 6z\"/><path d=\"M6 11v6c3 3 9 3 12 0v-6M22 9v7\"/>",
  "user-circle": "<circle cx=\"12\" cy=\"12\" r=\"10\"/><circle cx=\"12\" cy=\"9\" r=\"3\"/><path d=\"M6 19c0-4 12-4 12 0\"/>",
  "leaf": "<path d=\"M20 4C7 4 4 8 4 14a6 6 0 0 0 6 6c6 0 10-5 10-16zM4 20c3-6 7-9 12-11\"/>",
  "road": "<path d=\"M8 2 3 22M16 2l5 20M12 2v4M12 10v4M12 18v4\"/>",
  "car": "<path d=\"M4 11 6 5h12l2 6M3 11h18v8H3zM6 19v2M18 19v2\"/><circle cx=\"7\" cy=\"15\" r=\"1\"/><circle cx=\"17\" cy=\"15\" r=\"1\"/>",
  "stern": "<path d=\"m12 2 3 6.5 7 .9-5.1 5 1.2 7L12 18l-6.1 3.4 1.2-7L2 9.4l7-.9z\"/>",
  "schloss": "<rect x=\"5\" y=\"10\" width=\"14\" height=\"11\" rx=\"2\"/><path d=\"M8 10V7a4 4 0 0 1 8 0v3\"/>",
  "zielsymbol": "<circle cx=\"12\" cy=\"12\" r=\"8\"/><circle cx=\"12\" cy=\"12\" r=\"4\"/><circle cx=\"12\" cy=\"12\" r=\"1\"/><path d=\"M12 1v3m0 16v3M1 12h3m16 0h3\"/>",
  "funken": "<path d=\"m12 2 2 7 7 3-7 2-2 8-2-8-7-2 7-3z\"/>",
  "raster": "<rect x=\"3\" y=\"3\" width=\"7\" height=\"7\" rx=\"1\"/><rect x=\"14\" y=\"3\" width=\"7\" height=\"7\" rx=\"1\"/><rect x=\"3\" y=\"14\" width=\"7\" height=\"7\" rx=\"1\"/><rect x=\"14\" y=\"14\" width=\"7\" height=\"7\" rx=\"1\"/>",
  "liste": "<path d=\"M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01\"/>",
  "filter": "<path d=\"M3 4h18l-7 8v7l-4 2v-9z\"/>",
  "suche": "<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m16 16 5 5\"/>",
  "kamera": "<path d=\"M3 7h4l2-3h6l2 3h4v13H3z\"/><circle cx=\"12\" cy=\"13\" r=\"4\"/>",
  "kamera-scannen": "<path d=\"M3 8V4h4m10 0h4v4M3 16v4h4m10 0h4v-4\"/><circle cx=\"12\" cy=\"12\" r=\"4\"/>",
  "check": "<path d=\"m4 12 5 5L20 6\"/>",
  "zurueck": "<path d=\"m15 18-6-6 6-6\"/>",
} as const;

export type LinienIconName = keyof typeof ICONS;

export function LinienIcon({ name, size = 24, color = "#6D28D9" }: { name: LinienIconName; size?: number; color?: string }) {
  const inhalt = ICONS[name].replaceAll("FARBE", color);
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inhalt}</svg>`;
  return <SvgXml xml={xml} width={size} height={size} />;
}

/** Passendes Icon zu einem Kursthema: erst nach Stichwort im Titel, sonst nach Kategorie. */
export function themaIcon(titel: string, kategorie: string): LinienIconName {
  const t = titel.toLowerCase();
  if (/kreisverkehr/.test(t)) return "kreisverkehr";
  if (/zeichen|schild/.test(t)) return "verkehrszeichen";
  if (/park/.test(t)) return "einparken";
  if (/wetter|regen|nebel|glätte|glaette|schnee/.test(t)) return "auto-bei-schlechtem-wetter";
  if (/notfall|unfall|erste hilfe|rettung/.test(t)) return "verhalten-im-notfall";
  if (/umwelt|sprit|emission/.test(t)) return "leaf";
  if (/autobahn|überhol|ueberhol/.test(t)) return "road";
  if (/technik|motor/.test(t)) return "technik";
  return kategorie === "praxis" ? "praxis" : kategorie === "technik" ? "technik" : kategorie === "kurzvideos" ? "kurzvideos" : "theorie";
}
