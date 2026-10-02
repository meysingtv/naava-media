import type { Frage, LageKey } from "@/lib/fragen";

/**
 * Erklär-Animationen für Fragen mit Lageplan: Die Fahrzeuge fahren Schritt für
 * Schritt in der richtigen Reihenfolge, dazu ein kurzer Text. Gezeichnet wird in
 * components/erklaer-animation.tsx (Koordinaten wie die Lagepläne: 300 × 220,
 * du bist blau, andere orange).
 */

export type Punkt = [number, number];

export type Akteur = {
  id: string;
  art: "auto" | "rad" | "kind" | "einsatz";
  farbe?: "du" | "andere" | "neutral";
  /** Weg als Punktfolge – der erste Punkt ist der Start. */
  weg: Punkt[];
  /** Feste Richtung (Grad, 0 = nach oben) statt der Fahrtrichtung – für Autos im Stau, die nur seitlich rücken. */
  winkel?: number;
  /** Den geplanten Weg gepunktet anzeigen (wie im Lageplan). */
  wegZeigen?: boolean;
};

export type Schritt = {
  text: string;
  /** Wer fährt in diesem Schritt bis zu welchem Punkt seines Wegs („ende“ = letzter Punkt). */
  fahren?: { akteur: string; bis: number | "ende" }[];
  /** Dauer der Bewegung in Sekunden (0 = nur Text). */
  dauer: number;
  /** Danach stehen lassen, damit man den Text lesen kann (Sekunden). */
  halten?: number;
  /** Diese Akteure pulsieren. */
  hervor?: string[];
  /** Nummer über einem Akteur – bleibt ab diesem Schritt stehen. */
  nummer?: { akteur: string; n: number }[];
  blinker?: { akteur: string; seite: "links" | "rechts" }[];
  /** Kurzer Hinweis über einem Akteur (nur in diesem Schritt). */
  schild?: { akteur: string; text: string };
  /** Sichtkegel „Schulterblick“ nach rechts hinten. */
  schulterblick?: string;
};

export type ErklaerAnimation = {
  grund: "kreuzung" | "kreuzung_rad" | "kreisverkehr" | "autobahn" | "schulbus";
  akteure: Akteur[];
  schritte: Schritt[];
};

/** Punkte auf einer quadratischen Kurve (ohne Startpunkt). */
function kurve(a: Punkt, c: Punkt, b: Punkt, n = 8): Punkt[] {
  const aus: Punkt[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    aus.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  return aus;
}

/** Punkte auf einem Kreisbogen (Bildschirm-Koordinaten, Winkel in Grad, y nach unten). */
function bogen(cx: number, cy: number, r: number, winkel: number[]): Punkt[] {
  return winkel.map((w) => [cx + r * Math.cos((w * Math.PI) / 180), cy + r * Math.sin((w * Math.PI) / 180)]);
}

// Kreisverkehr: Mitte (150, 112), Fahrbahnmitte im Kreis bei r = 50, gefahren
// wird gegen den Uhrzeigersinn (Winkel werden kleiner).
const KREIS_ANDERE = bogen(150, 112, 50, [215, 200, 185, 170, 155, 140, 125, 110, 95, 80, 65, 50, 35, 20]);
const KREIS_DU = bogen(150, 112, 50, [70, 55, 40, 25, 10, -5, -20, -35, -50, -65, -80]);

const ANIMATIONEN: Partial<Record<LageKey, ErklaerAnimation>> = {
  lage_rechts_vor_links: {
    grund: "kreuzung",
    akteure: [
      { id: "du", art: "auto", farbe: "du", weg: [[167, 262], [167, 184], [167, 34]], wegZeigen: true },
      { id: "andere", art: "auto", farbe: "andere", weg: [[340, 97], [252, 97], [40, 97]], wegZeigen: true },
    ],
    schritte: [
      { text: "Kreuzung ohne Schilder und ohne Ampel. Beide kommen gleichzeitig an.", fahren: [{ akteur: "du", bis: 1 }, { akteur: "andere", bis: 1 }], dauer: 1.6, halten: 0.9 },
      { text: "Das orange Auto kommt von rechts – es hat Vorfahrt: „rechts vor links“.", dauer: 0, halten: 2.4, hervor: ["andere"], nummer: [{ akteur: "andere", n: 1 }] },
      { text: "Es fährt zuerst über die Kreuzung.", fahren: [{ akteur: "andere", bis: "ende" }], dauer: 1.9, halten: 0.4 },
      { text: "Danach fährst du – auch wenn du nur geradeaus willst.", fahren: [{ akteur: "du", bis: "ende" }], dauer: 1.9, halten: 1.4, nummer: [{ akteur: "du", n: 2 }] },
    ],
  },

  lage_links_abbiegen: {
    grund: "kreuzung",
    akteure: [
      { id: "du", art: "auto", farbe: "du", weg: [[167, 262], [167, 184], [167, 128], ...kurve([167, 128], [167, 97], [130, 97]), [40, 97]], wegZeigen: true },
      { id: "andere", art: "auto", farbe: "andere", weg: [[133, -60], [133, 40], [133, 192]], wegZeigen: true },
    ],
    schritte: [
      { text: "Du willst links abbiegen. Das orange Auto kommt dir entgegen.", fahren: [{ akteur: "du", bis: 1 }, { akteur: "andere", bis: 1 }], dauer: 1.6, halten: 0.8, blinker: [{ akteur: "du", seite: "links" }] },
      { text: "Fahr bis zur Mitte der Kreuzung vor – und warte dort.", fahren: [{ akteur: "du", bis: 2 }], dauer: 1.1, halten: 1.2, blinker: [{ akteur: "du", seite: "links" }] },
      {
        text: "Gegenverkehr, der geradeaus fährt, hat Vorrang: erst durchlassen.",
        fahren: [{ akteur: "andere", bis: "ende" }],
        dauer: 1.9,
        halten: 0.4,
        hervor: ["andere"],
        nummer: [{ akteur: "andere", n: 1 }],
        blinker: [{ akteur: "du", seite: "links" }],
      },
      { text: "Jetzt ist frei – du biegst ab.", fahren: [{ akteur: "du", bis: "ende" }], dauer: 2.1, halten: 1.4, nummer: [{ akteur: "du", n: 2 }], blinker: [{ akteur: "du", seite: "links" }] },
    ],
  },

  lage_kreisverkehr: {
    grund: "kreisverkehr",
    akteure: [
      { id: "du", art: "auto", farbe: "du", weg: [[162, 262], [162, 202], [164, 180], ...KREIS_DU, [162, 34]], wegZeigen: true },
      { id: "andere", art: "auto", farbe: "andere", weg: [...KREIS_ANDERE, [226, 125], [270, 125]] },
    ],
    schritte: [
      { text: "Kreisverkehr mit „Vorfahrt gewähren“. Du hältst an der Einfahrt.", fahren: [{ akteur: "du", bis: 1 }, { akteur: "andere", bis: 4 }], dauer: 1.7, halten: 0.8 },
      { text: "Wer schon im Kreis fährt, hat Vorfahrt – erst durchlassen.", fahren: [{ akteur: "andere", bis: "ende" }], dauer: 2.3, halten: 0.4, hervor: ["andere"], nummer: [{ akteur: "andere", n: 1 }] },
      { text: "Jetzt einfahren – dabei nicht blinken.", fahren: [{ akteur: "du", bis: 10 }], dauer: 2.2, halten: 0.5, nummer: [{ akteur: "du", n: 2 }] },
      { text: "Vor dem Ausfahren rechts blinken.", fahren: [{ akteur: "du", bis: "ende" }], dauer: 2.0, halten: 1.4, blinker: [{ akteur: "du", seite: "rechts" }] },
    ],
  },

  lage_rechts_abbiegen_rad: {
    grund: "kreuzung_rad",
    akteure: [
      { id: "du", art: "auto", farbe: "du", weg: [[167, 262], [167, 184], [167, 162], ...kurve([167, 162], [167, 132], [196, 132]), [262, 132]], wegZeigen: true },
      { id: "rad", art: "rad", weg: [[195, 262], [195, 176], [195, 32]], wegZeigen: true },
    ],
    schritte: [
      { text: "Du willst rechts abbiegen. Rechts neben dir fährt ein Radfahrer geradeaus.", fahren: [{ akteur: "du", bis: 1 }, { akteur: "rad", bis: 1 }], dauer: 1.7, halten: 0.7, blinker: [{ akteur: "du", seite: "rechts" }] },
      { text: "Schulterblick nach rechts: Radfahrer sind oft im toten Winkel.", dauer: 0, halten: 2.3, schulterblick: "du", hervor: ["rad"], blinker: [{ akteur: "du", seite: "rechts" }] },
      { text: "Der Radfahrer fährt geradeaus und hat Vorrang. Du wartest.", fahren: [{ akteur: "rad", bis: "ende" }], dauer: 2.0, halten: 0.4, nummer: [{ akteur: "rad", n: 1 }], blinker: [{ akteur: "du", seite: "rechts" }] },
      { text: "Jetzt ist frei – du biegst ab.", fahren: [{ akteur: "du", bis: "ende" }], dauer: 2.1, halten: 1.4, nummer: [{ akteur: "du", n: 2 }], blinker: [{ akteur: "du", seite: "rechts" }] },
    ],
  },

  lage_rettungsgasse: {
    grund: "autobahn",
    akteure: [
      // Linker Fahrstreifen weicht nach links aus, die anderen beiden nach rechts.
      ...[36, 92].map((y, i): Akteur => ({ id: `l${i}`, art: "auto", farbe: "neutral", winkel: 0, weg: [[85, y], [70, y]] })),
      { id: "du", art: "auto", farbe: "du", winkel: 0, weg: [[85, 150], [70, 150]] },
      ...[36, 92, 150].map((y, i): Akteur => ({ id: `m${i}`, art: "auto", farbe: "neutral", winkel: 0, weg: [[135, y], [151, y]] })),
      ...[36, 92, 150].map((y, i): Akteur => ({ id: `r${i}`, art: "auto", farbe: "neutral", winkel: 0, weg: [[185, y], [198, y]] })),
      { id: "einsatz", art: "einsatz", weg: [[135, 262], [135, 208], [113, 176], [110, 130], [110, 40]] },
    ],
    schritte: [
      { text: "Stau auf drei Fahrstreifen. Von hinten kommt ein Einsatzfahrzeug.", fahren: [{ akteur: "einsatz", bis: 1 }], dauer: 1.5, halten: 0.9, hervor: ["einsatz"] },
      {
        text: "Du fährst ganz links: Du weichst nach links aus – alle anderen nach rechts.",
        fahren: ["l0", "l1", "du", "m0", "m1", "m2", "r0", "r1", "r2"].map((akteur) => ({ akteur, bis: "ende" as const })),
        dauer: 1.6,
        halten: 1.0,
        hervor: ["du"],
        schild: { akteur: "du", text: "nach links" },
      },
      { text: "So entsteht die Rettungsgasse – zwischen dem linken und dem mittleren Fahrstreifen.", fahren: [{ akteur: "einsatz", bis: "ende" }], dauer: 2.6, halten: 1.4 },
    ],
  },

  lage_schulbus: {
    grund: "schulbus",
    akteure: [
      { id: "du", art: "auto", farbe: "du", weg: [[-44, 130], [56, 130], [116, 130], ...kurve([116, 130], [140, 130], [152, 106], 5), ...kurve([152, 106], [160, 92], [182, 92], 4), [276, 92]] },
      { id: "kind", art: "kind", weg: [[158, 168], [158, 150], [158, 168]] },
    ],
    schritte: [
      { text: "Ein Schulbus steht mit Warnblinklicht an der Haltestelle.", fahren: [{ akteur: "du", bis: 1 }], dauer: 1.6, halten: 0.8 },
      { text: "Achtung: Kinder können plötzlich hinter dem Bus hervorlaufen.", fahren: [{ akteur: "kind", bis: 1 }], dauer: 0.9, halten: 1.4, hervor: ["kind"] },
      { text: "Nur mit Schrittgeschwindigkeit heranfahren – notfalls anhalten und warten.", fahren: [{ akteur: "du", bis: 2 }], dauer: 2.4, halten: 0.6, schild: { akteur: "du", text: "Schritttempo" } },
      { text: "Das Kind geht zurück auf den Gehweg.", fahren: [{ akteur: "kind", bis: "ende" }], dauer: 0.9, halten: 0.5 },
      { text: "Erst jetzt vorsichtig vorbei – weiter im Schritttempo.", fahren: [{ akteur: "du", bis: "ende" }], dauer: 6, halten: 1.0, schild: { akteur: "du", text: "Schritttempo" } },
    ],
  },
};

/** Animation zur Frage (nur Fragen mit Lageplan). */
export function animationFuer(frage: Pick<Frage, "bild"> | undefined): ErklaerAnimation | null {
  const bild = frage?.bild;
  if (!bild || !bild.startsWith("lage_")) return null;
  return ANIMATIONEN[bild as LageKey] ?? null;
}

// ---------------------------------------------------------------------------
// Zeitplan: wo steht jeder Akteur zu welcher Zeit
// ---------------------------------------------------------------------------

type Abschnitt = { t0: number; t1: number; von: number; bis: number };

/** Zeichen pro Sekunde, die man bequem mitlesen kann. */
const LESETEMPO = 16;

export type Zeitplan = {
  gesamt: number;
  /** Beginn jedes Schritts (Sekunden). */
  starts: number[];
  /** Weglänge bis zu jedem Punkt, je Akteur. */
  laengen: Record<string, number[]>;
  abschnitte: Record<string, Abschnitt[]>;
};

export function zeitplan(a: ErklaerAnimation): Zeitplan {
  const laengen: Record<string, number[]> = {};
  for (const ak of a.akteure) {
    const l = [0];
    for (let i = 1; i < ak.weg.length; i++) l.push(l[i - 1] + Math.hypot(ak.weg[i][0] - ak.weg[i - 1][0], ak.weg[i][1] - ak.weg[i - 1][1]));
    laengen[ak.id] = l;
  }
  const stand: Record<string, number> = {};
  const abschnitte: Record<string, Abschnitt[]> = {};
  const starts: number[] = [];
  let t = 0;
  for (const s of a.schritte) {
    starts.push(t);
    for (const f of s.fahren ?? []) {
      const l = laengen[f.akteur];
      if (!l) continue;
      const ziel = f.bis === "ende" ? l[l.length - 1] : l[Math.min(f.bis, l.length - 1)];
      const von = stand[f.akteur] ?? 0;
      (abschnitte[f.akteur] ??= []).push({ t0: t, t1: t + Math.max(0.01, s.dauer), von, bis: ziel });
      stand[f.akteur] = ziel;
    }
    // Jeder Schritt bleibt mindestens so lange, dass man den Text lesen kann.
    t += Math.max(s.dauer + (s.halten ?? 1), s.text.length / LESETEMPO + 0.5);
  }
  return { gesamt: t, starts, laengen, abschnitte };
}

/** Anfahren, gleichmäßig fahren, bremsen (je 30 % der Zeit) – wie ein echtes Auto. */
const RAMPE = 0.3;
function sanft(u: number): number {
  const v = 1 / (1 - RAMPE);
  if (u <= 0) return 0;
  if (u >= 1) return 1;
  if (u < RAMPE) return (v * u * u) / (2 * RAMPE);
  if (u > 1 - RAMPE) return 1 - (v * (1 - u) * (1 - u)) / (2 * RAMPE);
  return v * (u - RAMPE / 2);
}

/** Zurückgelegter Weg eines Akteurs zur Zeit t – und wohin er gerade fährt (sonst = d). */
function strecke(p: Zeitplan, id: string, t: number): { d: number; ziel: number } {
  let d = 0;
  for (const s of p.abschnitte[id] ?? []) {
    if (t >= s.t1) d = s.bis;
    else if (t > s.t0) return { d: s.von + (s.bis - s.von) * sanft((t - s.t0) / (s.t1 - s.t0)), ziel: s.bis };
    else return { d: s.von, ziel: s.von };
  }
  return { d, ziel: d };
}

/** Punkt nach Weglänge d; `i` ist der nächste Wegpunkt dahinter. */
function punktBei(w: Punkt[], l: number[], d: number): { x: number; y: number; i: number } {
  if (w.length < 2) return { x: w[0]?.[0] ?? 0, y: w[0]?.[1] ?? 0, i: w.length };
  let i = 1;
  while (i < w.length - 1 && l[i] < d) i++;
  const a = w[i - 1];
  const b = w[i];
  const k = Math.min(1, Math.max(0, (d - l[i - 1]) / Math.max(1e-6, l[i] - l[i - 1])));
  return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, i };
}

const grad = (dx: number, dy: number) => (Math.atan2(dx, -dy) * 180) / Math.PI;

/**
 * Position, Richtung (Grad, 0 = nach oben) und Index des nächsten Wegpunkts
 * eines Akteurs zur Zeit t. Die Richtung kommt aus zwei Punkten kurz davor und
 * danach – so drehen sich Fahrzeuge in Kurven weich statt in Stufen. Wer steht,
 * schaut in die Richtung, aus der er gekommen ist.
 */
export function lageZurZeit(p: Zeitplan, ak: Akteur, t: number): { x: number; y: number; winkel: number; naechster: number } {
  const w = ak.weg;
  const l = p.laengen[ak.id];
  const { d, ziel } = strecke(p, ak.id, t);
  const hier = punktBei(w, l, d);
  let winkel = ak.winkel ?? 0;
  if (ak.winkel == null && w.length >= 2) {
    const vor = punktBei(w, l, Math.max(0, d - 6));
    const nach = punktBei(w, l, Math.min(ziel, d + 6));
    if (Math.hypot(nach.x - vor.x, nach.y - vor.y) > 1e-3) winkel = grad(nach.x - vor.x, nach.y - vor.y);
    else {
      const a = w[hier.i - 1];
      const b = w[hier.i];
      winkel = grad(b[0] - a[0], b[1] - a[1]);
    }
  }
  return { x: hier.x, y: hier.y, winkel, naechster: hier.i };
}

/** Index des Schritts zur Zeit t. */
export function schrittBei(p: Zeitplan, t: number): number {
  let i = 0;
  while (i + 1 < p.starts.length && p.starts[i + 1] <= t) i++;
  return i;
}
