// Uhr nach der Serverzeit: Countdowns, Quiz, Prüfung und Themenrad laufen so auf
// jedem Handy gleich, auch wenn dessen Uhr ein paar Sekunden falsch geht.

let versatz = 0;

/** Uhr nach einer Server-Antwort stellen (`jetzt` = Serverzeit, vorher/nachher = Handyzeit). */
export function uhrStellen(jetzt: string | undefined, vorher: number, nachher: number) {
  const server = jetzt ? Date.parse(jetzt) : NaN;
  if (Number.isFinite(server) && nachher - vorher < 2500) versatz = server - (vorher + nachher) / 2;
}

/** Aktuelle Serverzeit in Millisekunden (nach der zuletzt gestellten Uhr). */
export function serverJetzt(): number {
  return Date.now() + versatz;
}
