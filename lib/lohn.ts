/** Lohn eines Fahrlehrers im Monat: Satz je Fahrstunde vor Stundenlohn, ohne Satz 0. */
export function lohnVon(z: { anzahl: number; minuten: number; proFahrstunde: number | null; stundenlohn: number | null }): number {
  if (z.proFahrstunde != null) return z.anzahl * z.proFahrstunde;
  if (z.stundenlohn != null) return (z.minuten / 60) * z.stundenlohn;
  return 0;
}
