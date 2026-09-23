/**
 * Übersetzt typische Supabase-Fehler in klare Hinweise – und lässt alle
 * anderen Meldungen unverändert, damit die Ursache sichtbar bleibt.
 */
export function dbFehlerText(meldung: string, update = "0020"): string {
  // PostgREST kennt neue Spalten/Funktionen noch nicht (Schema-Cache veraltet).
  if (/schema cache/i.test(meldung)) {
    return "Supabase hat das Datenbank-Update noch nicht geladen. Im Supabase SQL-Editor einmal ausführen: notify pgrst, 'reload schema';  – danach die Seite neu laden.";
  }
  // Spalte, Tabelle oder Funktion fehlt wirklich in der Datenbank.
  if (/(column|relation|function) .* does not exist/i.test(meldung)) {
    return `Datenbank-Update ${update} fehlt oder ist unvollständig: ${meldung}`;
  }
  return meldung;
}
