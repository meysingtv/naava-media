/** Welches Update eine fehlende Spalte/Tabelle mitbringt – für einen gezielten Hinweis. */
function hinweis(meldung: string): string {
  if (/bestaetigt_am|abgesagt_am|bestaetigung_token|erinnerung_gesendet_am|termin_/i.test(meldung)) {
    return " (Update 0019_terminbestaetigung.sql einspielen)";
  }
  if (/anfrage|anfragen_/i.test(meldung)) return " (Update 0020_fahrstunden_anfragen.sql einspielen)";
  if (/stripe_|online_zahlung|zahlungsvorgang/i.test(meldung)) return " (Update 0021_online_zahlung.sql einspielen)";
  return "";
}

/**
 * Übersetzt typische Supabase-Fehler in klare Hinweise – und lässt alle
 * anderen Meldungen unverändert, damit die Ursache sichtbar bleibt.
 */
export function dbFehlerText(meldung: string): string {
  // PostgREST kennt neue Spalten/Funktionen noch nicht (Schema-Cache veraltet).
  if (/schema cache/i.test(meldung)) {
    return "Supabase hat das Datenbank-Update noch nicht geladen. Im Supabase SQL-Editor einmal ausführen: notify pgrst, 'reload schema';  – danach die Seite neu laden.";
  }
  // Spalte, Tabelle oder Funktion fehlt wirklich in der Datenbank.
  if (/(column|relation|function) .* does not exist/i.test(meldung)) {
    return `Ein Datenbank-Update fehlt: ${meldung}${hinweis(meldung)}`;
  }
  return meldung;
}
