// Schalter für Teile der App, die vorübergehend aus sind.
//
// FRAGEN_AKTIV: Alles rund um Prüfungsfragen (Training, Prüfungssimulation,
// Duelle, Karteikarten, Favoriten, Statistik, Liga, Crew, Live-Quiz) ist aus,
// bis die Lizenz für den amtlichen Fragenkatalog da ist. Nichts ist gelöscht –
// auf `true` stellen und die App neu bauen, dann ist alles wieder da.
// Erklärvideos, Verkehrszeichen, Formeln, Kurz erklärt, Schilder-Jagd und Clips
// bleiben in jedem Fall sichtbar.

export const FRAGEN_AKTIV = false;

/** Seiten, die nur mit Fragen Sinn ergeben (bei FRAGEN_AKTIV = false gesperrt). */
export const FRAGEN_SEITEN = new Set([
  "training",
  "pruefung",
  "duell",
  "online-duell",
  "karteikarten",
  "karten-lernen",
  "karte-bearbeiten",
  "stapel",
  "favoriten",
  "statistik",
  "liga",
  "elo",
  "crew",
  "crew-beitreten",
  "crew-boss",
  "erklaerung",
  "pruefen",
]);
