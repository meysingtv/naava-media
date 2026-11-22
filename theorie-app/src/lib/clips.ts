import type { ThemaId } from "./fragen";

export type ClipBildKey =
  | "leuchten"
  | "rechts_vor_links"
  | "anhalteweg"
  | "rettungsgasse"
  | "kreisverkehr"
  | "abstand"
  | "schulbus"
  | "radfahrer"
  | "abknickend"
  | "stopp"
  | "gruenpfeil"
  | "linksabbiegen"
  | "strassenbahn"
  | "tempolimits"
  | "naesse"
  | "reissverschluss"
  | "auffahren"
  | "rechtsfahren"
  | "stauende"
  | "ueberholverbot"
  | "schulterblick"
  | "rechtsabbiegen"
  | "bahnuebergang"
  | "zebrastreifen";

export type Clip = {
  id: string;
  bild: ClipBildKey;
  kategorie: string;
  titel: string;
  punkte: string[];
  thema: ThemaId;
  /** Grundwert für „Gefällt mir“ (Übungswert, bis Clips online gezählt werden). */
  basis: number;
};

/** Kurz erklärt: je ein Thema, drei Sätze, eine bewegte Grafik. */
export const CLIPS: Clip[] = [
  {
    id: "c-leuchten",
    bild: "leuchten",
    kategorie: "Technik",
    titel: "Was dir die Lichter im Cockpit sagen",
    punkte: ["Rot: sofort sicher anhalten und den Motor abstellen.", "Gelb: vorsichtig weiter – bald in die Werkstatt.", "Blau oder Grün: nur ein Hinweis, zum Beispiel Fernlicht."],
    thema: "technik",
    basis: 412,
  },
  {
    id: "c-rechts",
    bild: "rechts_vor_links",
    kategorie: "Vorfahrt",
    titel: "Rechts vor links in fünf Sekunden",
    punkte: ["Gilt, wenn weder Zeichen noch Ampel etwas regeln.", "Wer von rechts kommt, fährt zuerst – auch wenn er abbiegt.", "Im Zweifel Blickkontakt suchen und lieber warten."],
    thema: "vorfahrt",
    basis: 689,
  },
  {
    id: "c-anhalteweg",
    bild: "anhalteweg",
    kategorie: "Formeln",
    titel: "Warum 50 km/h schon 40 Meter brauchen",
    punkte: ["Reaktionsweg: (50 ÷ 10) × 3 = 15 m.", "Bremsweg: (50 ÷ 10)² = 25 m.", "Zusammen 40 m – auf nasser Straße deutlich mehr."],
    thema: "zahlen",
    basis: 530,
  },
  {
    id: "c-rettungsgasse",
    bild: "rettungsgasse",
    kategorie: "Autobahn",
    titel: "Rettungsgasse: ganz links nach links, alle anderen nach rechts",
    punkte: ["Schon bei Schrittgeschwindigkeit bilden – nicht erst beim Martinshorn.", "Die Gasse liegt zwischen dem linken und dem Fahrstreifen daneben.", "Hinter Einsatzfahrzeugen herfahren ist verboten."],
    thema: "autobahn",
    basis: 947,
  },
  {
    id: "c-kreisverkehr",
    bild: "kreisverkehr",
    kategorie: "Vorfahrt",
    titel: "Kreisverkehr: Wann wird geblinkt?",
    punkte: ["Beim Hineinfahren nicht blinken.", "Beim Hinausfahren rechts blinken.", "Wer schon im Kreis fährt, hat Vorfahrt."],
    thema: "vorfahrt",
    basis: 574,
  },
  {
    id: "c-abstand",
    bild: "abstand",
    kategorie: "Tempo",
    titel: "Halber Tacho – der einfachste Abstand",
    punkte: ["Außerorts: halbe Geschwindigkeit in Metern.", "Bei 100 km/h also mindestens 50 m.", "Leitpfosten stehen alle 50 m – zähl einfach mit."],
    thema: "tempo",
    basis: 318,
  },
  {
    id: "c-schulbus",
    bild: "schulbus",
    kategorie: "Besondere Lagen",
    titel: "Schulbus mit Warnblinklicht",
    punkte: ["Nur mit Schrittgeschwindigkeit vorbeifahren.", "Das gilt auch für den Gegenverkehr.", "Kinder können plötzlich hinter dem Bus hervorlaufen."],
    thema: "autobahn",
    basis: 402,
  },
  {
    id: "c-radfahrer",
    bild: "radfahrer",
    kategorie: "Überholen",
    titel: "Radfahrer überholen: 1,5 m und 2 m",
    punkte: ["Innerorts mindestens 1,5 m Seitenabstand.", "Außerorts mindestens 2 m.", "Passt der Abstand nicht, bleibst du dahinter."],
    thema: "manoever",
    basis: 455,
  },
  // Paket 1: Vorfahrt und Tempo
  {
    id: "c-abknickend",
    bild: "abknickend",
    kategorie: "Vorfahrt",
    titel: "Abknickende Vorfahrt: Wer blinkt?",
    punkte: [
      "Das Zusatzzeichen unter dem Vorfahrtsschild zeigt, wohin die Vorfahrtstraße abknickt.",
      "Folgst du ihr, hast du Vorfahrt – musst aber blinken.",
      "Auf den Nebenstraßen gilt untereinander rechts vor links.",
    ],
    thema: "vorfahrt",
    basis: 0,
  },
  {
    id: "c-stopp",
    bild: "stopp",
    kategorie: "Vorfahrt",
    titel: "Stoppschild: Wirklich stehen bleiben",
    punkte: [
      "An der Haltlinie anhalten, bis die Räder stillstehen.",
      "Ohne Haltlinie dort halten, wo du die Kreuzung einsehen kannst.",
      "Dann Vorfahrt gewähren – in beide Richtungen.",
    ],
    thema: "vorfahrt",
    basis: 0,
  },
  {
    id: "c-gruenpfeil",
    bild: "gruenpfeil",
    kategorie: "Vorfahrt",
    titel: "Grünpfeil-Schild: erst halten, dann abbiegen",
    punkte: [
      "Bei Rot mit grünem Pfeilschild darfst du rechts abbiegen – nach dem Anhalten an der Haltlinie.",
      "Fußgänger und Radfahrer mit Grün haben Vorrang.",
      "Nur vom rechten Fahrstreifen aus und ohne andere zu behindern.",
    ],
    thema: "vorfahrt",
    basis: 0,
  },
  {
    id: "c-linksabbiegen",
    bild: "linksabbiegen",
    kategorie: "Vorfahrt",
    titel: "Linksabbiegen: Gegenverkehr geht vor",
    punkte: [
      "Gegenverkehr, der geradeaus fährt oder rechts abbiegt, darf zuerst.",
      "Fahr bis zur Mitte der Kreuzung vor und warte dort.",
      "Biegen zwei gegenüber links ab, fahrt ihr voreinander vorbei.",
    ],
    thema: "vorfahrt",
    basis: 0,
  },
  {
    id: "c-strassenbahn",
    bild: "strassenbahn",
    kategorie: "Besondere Lagen",
    titel: "Straßenbahn hält: Fahrgäste haben Vorrang",
    punkte: [
      "Steigen an der Haltestelle Leute ein oder aus, rechts nur mit Schrittgeschwindigkeit vorbei.",
      "Fahrgäste dürfen nicht behindert werden – wenn nötig: warten.",
      "Achte auf Leute, die über die Fahrbahn zur Bahn laufen.",
    ],
    thema: "manoever",
    basis: 0,
  },
  {
    id: "c-tempolimits",
    bild: "tempolimits",
    kategorie: "Tempo",
    titel: "50 · 100 · 130 – die Grundtempos",
    punkte: [
      "Innerorts gilt höchstens 50 km/h.",
      "Außerorts gilt für Pkw höchstens 100 km/h.",
      "Auf der Autobahn gibt es oft kein Limit – empfohlen sind 130 km/h (Richtgeschwindigkeit).",
    ],
    thema: "tempo",
    basis: 0,
  },
  {
    id: "c-naesse",
    bild: "naesse",
    kategorie: "Tempo",
    titel: "Nasse Straße: Bremsweg wird länger",
    punkte: [
      "Auf nasser Fahrbahn kann der Bremsweg etwa doppelt so lang werden.",
      "Bei Schnee und Eis noch viel länger.",
      "Deshalb langsamer fahren und mehr Abstand halten.",
    ],
    thema: "tempo",
    basis: 0,
  },
  {
    id: "c-reissverschluss",
    bild: "reissverschluss",
    kategorie: "Tempo",
    titel: "Reißverschluss: bis zum Ende fahren",
    punkte: [
      "Endet ein Fahrstreifen, fährst du bis kurz vor die Engstelle.",
      "Dort wird abwechselnd eingefädelt: einer von links, einer von rechts.",
      "Früh rüberziehen bringt nichts – es macht nur den Stau länger.",
    ],
    thema: "tempo",
    basis: 0,
  },
  // Paket 2: Autobahn, Überholen und Abbiegen, besondere Lagen
  {
    id: "c-auffahren",
    bild: "auffahren",
    kategorie: "Autobahn",
    titel: "Auffahren: den ganzen Streifen nutzen",
    punkte: [
      "Auf dem Beschleunigungsstreifen Gas geben und an das Tempo auf der Autobahn anpassen.",
      "Der Verkehr auf der Autobahn hat Vorfahrt – du suchst dir eine Lücke.",
      "Links blinken, Schulterblick, dann einfädeln.",
    ],
    thema: "autobahn",
    basis: 0,
  },
  {
    id: "c-rechtsfahren",
    bild: "rechtsfahren",
    kategorie: "Autobahn",
    titel: "Rechts fahren, links überholen",
    punkte: [
      "Fahr so weit rechts wie möglich – auch auf der Autobahn.",
      "Überholt wird links, rechts überholen ist grundsätzlich verboten.",
      "Nach dem Überholen wieder nach rechts – mit Blinker.",
    ],
    thema: "autobahn",
    basis: 0,
  },
  {
    id: "c-stauende",
    bild: "stauende",
    kategorie: "Autobahn",
    titel: "Stauende: warnen statt auffahren",
    punkte: [
      "Kommt ein Stau, früh bremsen und Abstand halten.",
      "Warnblinker an – so warnst du die Autos hinter dir.",
      "Steht alles, gleich eine Rettungsgasse bilden.",
    ],
    thema: "autobahn",
    basis: 0,
  },
  {
    id: "c-ueberholverbot",
    bild: "ueberholverbot",
    kategorie: "Überholen",
    titel: "Überholverbot: Wen darfst du noch überholen?",
    punkte: [
      "Das Schild verbietet, mehrspurige Kraftfahrzeuge zu überholen – also Autos und Lkw.",
      "Einspurige wie Fahrräder und Motorräder darfst du überholen.",
      "Der Seitenabstand zum Rad gilt trotzdem: innerorts 1,5 m, außerorts 2 m.",
    ],
    thema: "manoever",
    basis: 0,
  },
  {
    id: "c-schulterblick",
    bild: "schulterblick",
    kategorie: "Überholen",
    titel: "Schulterblick: der tote Winkel",
    punkte: [
      "Was im Spiegel fehlt, steckt im toten Winkel.",
      "Schulterblick vor dem Anfahren, beim Spurwechsel und beim Abbiegen.",
      "Erst wenn frei ist, losfahren.",
    ],
    thema: "manoever",
    basis: 0,
  },
  {
    id: "c-rechtsabbiegen",
    bild: "rechtsabbiegen",
    kategorie: "Abbiegen",
    titel: "Rechts abbiegen: Radfahrer zuerst",
    punkte: [
      "Radfahrer und Fußgänger, die geradeaus wollen, haben Vorrang.",
      "Vor dem Abbiegen rechts in den Spiegel und über die Schulter schauen.",
      "Langsam abbiegen und notfalls warten.",
    ],
    thema: "manoever",
    basis: 0,
  },
  {
    id: "c-bahnuebergang",
    bild: "bahnuebergang",
    kategorie: "Besondere Lagen",
    titel: "Bahnübergang: Der Zug hat Vorrang",
    punkte: [
      "Am Andreaskreuz haben Züge immer Vorrang.",
      "Bei rotem Blinklicht oder sich senkenden Schranken: vor dem Kreuz warten.",
      "Nie auf den Gleisen anhalten – erst losfahren, wenn hinter den Gleisen Platz ist.",
    ],
    thema: "gefahren",
    basis: 0,
  },
  {
    id: "c-zebrastreifen",
    bild: "zebrastreifen",
    kategorie: "Besondere Lagen",
    titel: "Zebrastreifen: Fußgänger haben Vorrang",
    punkte: [
      "Will jemand erkennbar über den Zebrastreifen gehen, lässt du ihn gehen – wenn nötig, hältst du an.",
      "Langsam heranfahren und bremsbereit sein.",
      "Am Zebrastreifen nicht überholen.",
    ],
    thema: "gefahren",
    basis: 0,
  },
];
