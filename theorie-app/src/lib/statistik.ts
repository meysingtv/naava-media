import { tagKey, wochenStart, type Stand, type Zeitraum } from "@/lib/stand";

// Rechnungen der Seite „Mein Fortschritt“ – am Handy und am PC gleich.

/** Ab diesem Anteil sicherer Fragen gilt man als prüfungsreif. */
export const REIF = 0.9;

const MONATE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

export type Saeule = { label: string; wert: number };

function tagVerschoben(basis: Date, tage: number): Date {
  const d = new Date(basis);
  d.setDate(d.getDate() + tage);
  return d;
}

/** Beantwortete Fragen als Säulen: Woche = Tage, Monat = Wochen, Gesamt = Monate. */
export function aktivitaet(s: Stand, zeitraum: Zeitraum): Saeule[] {
  const antworten = (d: Date) => s.antwortenTage[tagKey(d)] ?? 0;
  if (zeitraum === "woche") {
    const start = wochenStart();
    return ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((label, i) => ({ label, wert: antworten(tagVerschoben(start, i)) }));
  }
  if (zeitraum === "monat") {
    const start = wochenStart();
    return [3, 2, 1, 0].map((zurueck) => {
      const montag = tagVerschoben(start, -7 * zurueck);
      let summe = 0;
      for (let i = 0; i < 7; i++) summe += antworten(tagVerschoben(montag, i));
      return { label: zurueck === 0 ? "Diese" : `−${zurueck} W`, wert: summe };
    });
  }
  const heute = new Date();
  return [5, 4, 3, 2, 1, 0].map((zurueck) => {
    const m = new Date(heute.getFullYear(), heute.getMonth() - zurueck, 1);
    let summe = 0;
    for (const [tag, n] of Object.entries(s.antwortenTage)) {
      const [j, mo] = tag.split("-").map(Number);
      if (j === m.getFullYear() && mo === m.getMonth() + 1) summe += n;
    }
    return { label: MONATE[m.getMonth()], wert: summe };
  });
}

/** Erfolgsquote über einen Tagesbereich (0 = heute). */
export function quote(s: Stand, vonTagen: number, bisTagen: number): number | null {
  let r = 0;
  let f = 0;
  for (let i = vonTagen; i < bisTagen; i++) {
    const t = s.themaTage[tagKey(tagVerschoben(new Date(), -i))];
    if (!t) continue;
    for (const [rr, ff] of Object.values(t)) {
      r += rr ?? 0;
      f += ff ?? 0;
    }
  }
  return r + f > 0 ? r / (r + f) : null;
}

/** Trend der Trefferquote im Zeitraum gegenüber dem Zeitraum davor. */
export function trendVon(s: Stand, zeitraum: Zeitraum) {
  const tage = zeitraum === "woche" ? 7 : zeitraum === "monat" ? 30 : 3650;
  const jetzt = quote(s, 0, Math.min(tage, 3650));
  const vorher = zeitraum === "gesamt" ? null : quote(s, tage, tage * 2);
  const trend = jetzt != null && vorher != null ? Math.round((jetzt - vorher) * 100) : null;
  const text = trend != null ? `${trend >= 0 ? "+" : "−"}${Math.abs(trend)} %` : jetzt != null ? `${Math.round(jetzt * 100)} %` : "–";
  const label = trend != null ? (zeitraum === "woche" ? "zur Vorwoche" : "zum Vormonat") : "Trefferquote";
  return { text, label, positiv: trend == null || trend >= 0 };
}

export type Ampel = "sitzt" | "fast" | "ueben";

export function ampelVon(quote: number): Ampel {
  return quote >= 0.75 ? "sitzt" : quote >= 0.4 ? "fast" : "ueben";
}
