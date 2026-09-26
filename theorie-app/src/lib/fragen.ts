// Beispielfragen für „Spur“ – selbst formuliert, NICHT aus dem amtlichen
// Fragenkatalog (der ist lizenzpflichtig). Aufbau wie in der echten Prüfung:
// Mehrfachauswahl mit 1–3 richtigen Antworten oder Zahlenfragen, 2–5
// Fehlerpunkte je Frage. Der amtliche Katalog kann später im selben Format
// eingespielt werden.

import type { Ionicons } from "@expo/vector-icons";

export type ZeichenKey =
  | "z101"
  | "z201"
  | "z205"
  | "z206"
  | "z209"
  | "z215"
  | "z220"
  | "z267"
  | "z274_30"
  | "z276"
  | "z283"
  | "z286"
  | "z301"
  | "z306"
  | "z314"
  | "z350";

export type LageKey =
  | "lage_rechts_vor_links"
  | "lage_links_abbiegen"
  | "lage_kreisverkehr"
  | "lage_rechts_abbiegen_rad"
  | "lage_rettungsgasse"
  | "lage_schulbus";

export type BildKey = ZeichenKey | LageKey;

export type ThemaId = "gefahren" | "vorfahrt" | "zeichen" | "tempo" | "manoever" | "parken" | "autobahn" | "technik" | "mensch" | "zahlen";

export type Antwort = { text: string; richtig: boolean };

export type Frage = {
  id: string;
  thema: ThemaId;
  punkte: 2 | 3 | 4 | 5;
  text: string;
  bild?: BildKey;
  erklaerung: string;
} & ({ art: "auswahl"; antworten: Antwort[] } | { art: "zahl"; loesung: number; einheit: string });

export type Thema = {
  id: ThemaId;
  titel: string;
  kurz: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export const THEMEN: Thema[] = [
  { id: "gefahren", titel: "Gefahrenlehre", kurz: "Gefahren früh erkennen und richtig reagieren", icon: "warning-outline" },
  { id: "vorfahrt", titel: "Vorfahrt", kurz: "Wer fährt zuerst – an Kreuzungen und im Kreisverkehr", icon: "git-merge-outline" },
  { id: "zeichen", titel: "Verkehrszeichen", kurz: "Gefahr-, Vorschrift- und Richtzeichen", icon: "triangle-outline" },
  { id: "tempo", titel: "Tempo & Abstand", kurz: "Geschwindigkeit, Sicherheitsabstand, Sicht", icon: "speedometer-outline" },
  { id: "manoever", titel: "Überholen & Abbiegen", kurz: "Überholen, Abbiegen, Einordnen", icon: "swap-horizontal-outline" },
  { id: "parken", titel: "Halten & Parken", kurz: "Wo du halten und parken darfst", icon: "car-outline" },
  { id: "autobahn", titel: "Autobahn & Sonderfälle", kurz: "Rettungsgasse, Bahnübergang, Schulbus", icon: "trail-sign-outline" },
  { id: "technik", titel: "Technik & Umwelt", kurz: "Reifen, Bremsen, spritsparend fahren", icon: "construct-outline" },
  { id: "mensch", titel: "Mensch & Recht", kurz: "Alkohol, Müdigkeit, Probezeit, Handy", icon: "person-outline" },
  { id: "zahlen", titel: "Zahlen & Formeln", kurz: "Reaktionsweg, Bremsweg, Anhalteweg", icon: "calculator-outline" },
];

export function themaVon(id: ThemaId): Thema {
  return THEMEN.find((t) => t.id === id) ?? THEMEN[0];
}

const a = (text: string, richtig = false): Antwort => ({ text, richtig });

export const FRAGEN: Frage[] = [
  // ---------------------------------------------------------------- Gefahrenlehre
  {
    id: "g1",
    thema: "gefahren",
    punkte: 4,
    art: "auswahl",
    text: "Am Straßenrand spielen Kinder mit einem Ball. Wie verhältst du dich?",
    antworten: [
      a("Geschwindigkeit verringern und bremsbereit sein", true),
      a("Hupen, damit die Kinder auf mich aufmerksam werden"),
      a("Damit rechnen, dass ein Kind plötzlich auf die Fahrbahn läuft", true),
    ],
    erklaerung: "Kinder schätzen Gefahren oft falsch ein und folgen spontan dem Ball. Langsamer werden und bremsbereit sein gibt dir die nötige Reserve.",
  },
  {
    id: "g2",
    thema: "gefahren",
    punkte: 3,
    art: "auswahl",
    text: "Warum wird der Bremsweg auf nasser Fahrbahn länger?",
    antworten: [
      a("Die Reifen haften schlechter auf der Straße", true),
      a("Nasse Bremsen funktionieren grundsätzlich nicht mehr"),
      a("Ein Wasserfilm kann die Reifen von der Fahrbahn trennen", true),
    ],
    erklaerung: "Nässe verringert die Haftung. Bei viel Wasser schwimmt der Reifen im Extremfall auf (Aquaplaning) und überträgt keine Kräfte mehr.",
  },
  {
    id: "g3",
    thema: "gefahren",
    punkte: 4,
    art: "auswahl",
    text: "Dein Auto gerät bei starkem Regen ins Aufschwimmen (Aquaplaning). Was ist richtig?",
    antworten: [a("Auskuppeln bzw. Gas wegnehmen und das Lenkrad ruhig halten", true), a("Kräftig bremsen"), a("Schnell gegenlenken")],
    erklaerung: "Solange die Reifen schwimmen, bewirken Bremsen und Lenken nichts – greifen sie wieder, kann das Auto ausbrechen. Also Tempo rausnehmen und geradeaus halten.",
  },
  {
    id: "g4",
    thema: "gefahren",
    punkte: 3,
    art: "auswahl",
    text: "Womit musst du bei Dunkelheit besonders rechnen?",
    antworten: [
      a("Mit schlecht erkennbaren Fußgängern und Radfahrern", true),
      a("Mit Blendung durch entgegenkommende Fahrzeuge", true),
      a("Mit einem kürzeren Bremsweg"),
    ],
    erklaerung: "Nachts siehst du weniger weit und dunkel gekleidete Menschen erst spät. Der Bremsweg bleibt gleich – deshalb musst du langsamer fahren.",
  },
  {
    id: "g5",
    thema: "gefahren",
    punkte: 4,
    art: "auswahl",
    text: "Nebel, die Sichtweite liegt unter 50 Metern. Was gilt?",
    antworten: [
      a("Ich darf höchstens 50 km/h fahren", true),
      a("Ich darf die Nebelschlussleuchte einschalten", true),
      a("Ich schalte das Fernlicht ein"),
    ],
    erklaerung: "Unter 50 m Sicht durch Nebel sind höchstens 50 km/h erlaubt, und die Nebelschlussleuchte darf eingeschaltet werden. Fernlicht blendet dich im Nebel selbst.",
  },
  {
    id: "g6",
    thema: "gefahren",
    punkte: 3,
    art: "auswahl",
    text: "Ältere Menschen überqueren langsam die Fahrbahn. Wie verhältst du dich?",
    antworten: [
      a("Rücksicht nehmen und ihnen genug Zeit lassen", true),
      a("Mit Hupen zur Eile auffordern"),
      a("Mit unsicherem Verhalten rechnen, zum Beispiel plötzlichem Stehenbleiben", true),
    ],
    erklaerung: "Ältere Menschen brauchen oft mehr Zeit und reagieren langsamer. Geduld und Bremsbereitschaft vermeiden gefährliche Situationen.",
  },

  // ---------------------------------------------------------------- Vorfahrt
  {
    id: "v1",
    thema: "vorfahrt",
    punkte: 5,
    art: "auswahl",
    bild: "lage_rechts_vor_links",
    text: "Kreuzung ohne Verkehrszeichen. Du (blau) willst geradeaus fahren, von rechts kommt ein oranges Auto. Wer darf zuerst fahren?",
    antworten: [a("Das orange Auto, weil es von rechts kommt", true), a("Ich, weil ich geradeaus fahre"), a("Wer zuerst an der Kreuzung ist")],
    erklaerung: "Ohne Zeichen und Ampel gilt „rechts vor links“: Das Fahrzeug von rechts hat Vorfahrt – auch wenn du geradeaus fährst.",
  },
  {
    id: "v2",
    thema: "vorfahrt",
    punkte: 4,
    art: "auswahl",
    bild: "z205",
    text: "Was bedeutet dieses Verkehrszeichen?",
    antworten: [a("Vorfahrt gewähren", true), a("Vorfahrt an der nächsten Kreuzung"), a("Halten nur zum Ein- und Aussteigen")],
    erklaerung: "Das auf der Spitze stehende Dreieck heißt „Vorfahrt gewähren“. Du lässt den Querverkehr durch – anhalten musst du nur, wenn nötig.",
  },
  {
    id: "v3",
    thema: "vorfahrt",
    punkte: 5,
    art: "auswahl",
    bild: "z206",
    text: "Was schreibt dieses Zeichen vor?",
    antworten: [a("Anhalten – auch wenn die Straße frei ist", true), a("Vorfahrt gewähren", true), a("Nur anhalten, wenn Verkehr kommt")],
    erklaerung: "Beim Stoppschild musst du immer vollständig anhalten, an der Haltlinie oder dort, wo du die Straße einsehen kannst – und danach Vorfahrt gewähren.",
  },
  {
    id: "v4",
    thema: "vorfahrt",
    punkte: 4,
    art: "auswahl",
    bild: "z306",
    text: "Was bedeutet dieses Zeichen?",
    antworten: [
      a("Ich befinde mich auf einer Vorfahrtstraße", true),
      a("Ich habe an den folgenden Kreuzungen Vorfahrt, bis die Vorfahrtstraße endet", true),
      a("Ich muss an jeder Kreuzung anhalten"),
    ],
    erklaerung: "Die gelbe Raute kennzeichnet eine Vorfahrtstraße. Die Vorfahrt gilt, bis ein Zeichen sie aufhebt.",
  },
  {
    id: "v5",
    thema: "vorfahrt",
    punkte: 4,
    art: "auswahl",
    bild: "lage_links_abbiegen",
    text: "Du (blau) willst links abbiegen. Das orange Auto kommt dir entgegen und fährt geradeaus. Wie verhältst du dich?",
    antworten: [a("Ich lasse das orange Auto zuerst fahren", true), a("Ich fahre zuerst, weil ich schon blinke"), a("Ich biege zügig vor dem orangen Auto ab")],
    erklaerung: "Wer links abbiegt, muss den Gegenverkehr durchlassen, der geradeaus fährt oder rechts abbiegt.",
  },
  {
    id: "v6",
    thema: "vorfahrt",
    punkte: 4,
    art: "auswahl",
    bild: "lage_kreisverkehr",
    text: "Du fährst in einen Kreisverkehr mit den Zeichen „Kreisverkehr“ und „Vorfahrt gewähren“. Was ist richtig?",
    antworten: [
      a("Fahrzeuge im Kreis haben Vorfahrt", true),
      a("Beim Hineinfahren blinke ich nicht", true),
      a("Beim Hinausfahren blinke ich nicht"),
    ],
    erklaerung: "Im Kreis hat Vorfahrt, wer schon drin ist. Beim Einfahren ist Blinken verboten, beim Ausfahren rechts blinken ist Pflicht.",
  },

  // ---------------------------------------------------------------- Verkehrszeichen
  {
    id: "z1",
    thema: "zeichen",
    punkte: 3,
    art: "auswahl",
    bild: "z274_30",
    text: "Was bedeutet dieses Zeichen?",
    antworten: [a("Ich darf höchstens 30 km/h fahren", true), a("Ich muss mindestens 30 km/h fahren"), a("30 km/h sind nur empfohlen")],
    erklaerung: "Eine Zahl im roten Kreis ist eine zulässige Höchstgeschwindigkeit – eine feste Obergrenze, keine Empfehlung.",
  },
  {
    id: "z2",
    thema: "zeichen",
    punkte: 4,
    art: "auswahl",
    bild: "z267",
    text: "Was bedeutet dieses Zeichen?",
    antworten: [a("Einfahrt verboten", true), a("Einbahnstraße – Einfahrt erlaubt"), a("Durchfahrt nur für Anlieger")],
    erklaerung: "Der rote Kreis mit weißem Balken verbietet die Einfahrt. Du siehst ihn zum Beispiel am Ende einer Einbahnstraße.",
  },
  {
    id: "z3",
    thema: "zeichen",
    punkte: 3,
    art: "auswahl",
    bild: "z220",
    text: "Was zeigt dieses Zeichen an?",
    antworten: [a("Eine Einbahnstraße in Pfeilrichtung", true), a("Die vorgeschriebene Fahrtrichtung an der nächsten Kreuzung"), a("Eine Autobahnauffahrt")],
    erklaerung: "In einer Einbahnstraße darfst du nur in Pfeilrichtung fahren.",
  },
  {
    id: "z4",
    thema: "zeichen",
    punkte: 4,
    art: "auswahl",
    bild: "z283",
    text: "Was bedeutet dieses Zeichen?",
    antworten: [a("Halten ist hier verboten", true), a("Parken erlaubt, Halten verboten"), a("Kurzes Halten zum Be- und Entladen ist erlaubt")],
    erklaerung: "Das rote Kreuz steht für das absolute Halteverbot – nicht einmal kurz halten ist erlaubt.",
  },
  {
    id: "z5",
    thema: "zeichen",
    punkte: 4,
    art: "auswahl",
    bild: "z350",
    text: "Du näherst dich diesem Zeichen. Was gilt?",
    antworten: [
      a("Fußgängern, die erkennbar hinüber wollen, das Überqueren ermöglichen", true),
      a("Hier darf ich nicht überholen", true),
      a("Fußgänger müssen warten, bis kein Auto mehr kommt"),
    ],
    erklaerung: "Am Fußgängerüberweg haben Fußgänger Vorrang. Du fährst mit mäßiger Geschwindigkeit heran – Überholen ist dort verboten.",
  },
  {
    id: "z6",
    thema: "zeichen",
    punkte: 4,
    art: "auswahl",
    bild: "z276",
    text: "Was bedeutet dieses Zeichen?",
    antworten: [
      a("Ich darf mehrspurige Kraftfahrzeuge nicht überholen", true),
      a("Einspurige Fahrzeuge wie Motorräder darf ich überholen", true),
      a("Ich darf hier nicht überholt werden"),
    ],
    erklaerung: "Das Überholverbot gilt für Kraftfahrzeuge mit mehr als zwei Rädern. Motorräder ohne Beiwagen, Mofas und Fahrräder darfst du überholen.",
  },
  {
    id: "z7",
    thema: "zeichen",
    punkte: 3,
    art: "auswahl",
    bild: "z101",
    text: "Was kündigt dieses Zeichen an?",
    antworten: [a("Eine Gefahrstelle – besonders aufmerksam fahren", true), a("Das Ende aller Verbote"), a("Den Beginn einer Vorfahrtstraße")],
    erklaerung: "Gefahrzeichen sind Dreiecke mit Spitze nach oben. Das Ausrufezeichen warnt vor einer Gefahrstelle, die kein eigenes Zeichen hat.",
  },

  // ---------------------------------------------------------------- Tempo & Abstand
  {
    id: "t1",
    thema: "tempo",
    punkte: 3,
    art: "zahl",
    text: "Wie schnell darfst du mit dem Pkw innerorts höchstens fahren, wenn kein Zeichen etwas anderes anordnet?",
    loesung: 50,
    einheit: "km/h",
    erklaerung: "Innerorts gilt für alle Fahrzeuge höchstens 50 km/h, außer Zeichen erlauben mehr oder schreiben weniger vor.",
  },
  {
    id: "t2",
    thema: "tempo",
    punkte: 3,
    art: "zahl",
    text: "Welche Höchstgeschwindigkeit gilt für Pkw außerorts (nicht Autobahn), wenn nichts anderes angeordnet ist?",
    loesung: 100,
    einheit: "km/h",
    erklaerung: "Außerhalb geschlossener Ortschaften dürfen Pkw höchstens 100 km/h fahren.",
  },
  {
    id: "t3",
    thema: "tempo",
    punkte: 3,
    art: "zahl",
    text: "Welche Richtgeschwindigkeit gilt auf der Autobahn?",
    loesung: 130,
    einheit: "km/h",
    erklaerung: "Die Richtgeschwindigkeit ist eine Empfehlung. Wer schneller fährt, kann bei einem Unfall trotzdem mithaften.",
  },
  {
    id: "t4",
    thema: "tempo",
    punkte: 4,
    art: "zahl",
    text: "Welchen Sicherheitsabstand ergibt die Faustregel „halber Tacho“ außerorts bei 100 km/h?",
    loesung: 50,
    einheit: "m",
    erklaerung: "Halber Tacho: Geschwindigkeit halbieren und als Meter nehmen. Bei 100 km/h also 50 m Abstand.",
  },
  {
    id: "t5",
    thema: "tempo",
    punkte: 4,
    art: "auswahl",
    text: "Wann musst du langsamer fahren als erlaubt?",
    antworten: [
      a("Bei schlechter Sicht, zum Beispiel Nebel oder starkem Regen", true),
      a("Wenn die Fahrbahn glatt ist", true),
      a("Wenn hinter mir jemand drängelt"),
    ],
    erklaerung: "Die erlaubte Höchstgeschwindigkeit gilt nur bei guten Bedingungen. Sicht, Wetter und Fahrbahn bestimmen, wie schnell du sicher fahren kannst.",
  },
  {
    id: "t6",
    thema: "tempo",
    punkte: 4,
    art: "auswahl",
    text: "Wie schnell darfst du fahren?",
    antworten: [
      a("So schnell, dass ich innerhalb der überschaubaren Strecke anhalten kann", true),
      a("Immer so schnell, wie es das Schild erlaubt"),
      a("So schnell wie der Verkehr vor mir"),
    ],
    erklaerung: "Du musst jederzeit innerhalb der Strecke anhalten können, die du überblickst – vor Kurven und Kuppen also langsamer.",
  },

  // ---------------------------------------------------------------- Überholen & Abbiegen
  {
    id: "m1",
    thema: "manoever",
    punkte: 4,
    art: "zahl",
    text: "Welchen seitlichen Abstand musst du beim Überholen von Radfahrern innerorts mindestens einhalten?",
    loesung: 1.5,
    einheit: "m",
    erklaerung: "Innerorts mindestens 1,5 m, außerorts mindestens 2 m Seitenabstand zu Rad- und Fußverkehr.",
  },
  {
    id: "m2",
    thema: "manoever",
    punkte: 4,
    art: "zahl",
    text: "Und außerorts – welcher Seitenabstand gilt beim Überholen von Radfahrern mindestens?",
    loesung: 2,
    einheit: "m",
    erklaerung: "Außerorts sind es mindestens 2 m. Passt der Abstand nicht, wird nicht überholt.",
  },
  {
    id: "m3",
    thema: "manoever",
    punkte: 5,
    art: "auswahl",
    text: "Wann ist Überholen verboten?",
    antworten: [a("Bei unklarer Verkehrslage", true), a("Wenn ich den Gegenverkehr behindern könnte", true), a("Wenn das Fahrzeug vor mir langsamer ist")],
    erklaerung: "Überholen darfst du nur, wenn die Lage klar ist und niemand gefährdet oder behindert wird.",
  },
  {
    id: "m4",
    thema: "manoever",
    punkte: 3,
    art: "auswahl",
    text: "Auf welcher Seite überholst du grundsätzlich?",
    antworten: [a("Links", true), a("Rechts"), a("Dort, wo gerade Platz ist")],
    erklaerung: "Überholt wird links. Rechts überholen ist nur in Ausnahmen erlaubt, etwa bei Linksabbiegern, die sich eingeordnet haben.",
  },
  {
    id: "m5",
    thema: "manoever",
    punkte: 5,
    art: "auswahl",
    bild: "lage_rechts_abbiegen_rad",
    text: "Du (blau) biegst rechts ab. Rechts neben dir fährt ein Radfahrer geradeaus weiter. Was tust du?",
    antworten: [a("Den Radfahrer zuerst geradeaus fahren lassen", true), a("Vor dem Abbiegen über die rechte Schulter blicken", true), a("Zügig vor dem Radfahrer abbiegen")],
    erklaerung: "Beim Abbiegen hat der Radverkehr, der geradeaus fährt, Vorrang. Der Schulterblick zeigt dir Radfahrer im toten Winkel.",
  },
  {
    id: "m6",
    thema: "manoever",
    punkte: 3,
    art: "auswahl",
    text: "Du willst links abbiegen. Wie ordnest du dich ein?",
    antworten: [
      a("Rechtzeitig blinken und mich zur Fahrbahnmitte hin einordnen", true),
      a("Erst direkt an der Kreuzung blinken"),
      a("Am rechten Fahrbahnrand bleiben"),
    ],
    erklaerung: "Links einordnen bis zur Mitte der Fahrbahn – in Einbahnstraßen möglichst weit links – und rechtzeitig blinken.",
  },

  // ---------------------------------------------------------------- Halten & Parken
  {
    id: "p1",
    thema: "parken",
    punkte: 3,
    art: "auswahl",
    bild: "z286",
    text: "Was gilt bei diesem Zeichen?",
    antworten: [a("Parken ist verboten", true), a("Kurz halten, höchstens drei Minuten, ist erlaubt", true), a("Ich darf hier den ganzen Tag parken")],
    erklaerung: "Eingeschränktes Halteverbot: länger als drei Minuten halten ist verboten – außer zum Ein- und Aussteigen oder zum Be- und Entladen.",
  },
  {
    id: "p2",
    thema: "parken",
    punkte: 2,
    art: "auswahl",
    bild: "z314",
    text: "Was bedeutet dieses Zeichen?",
    antworten: [a("Hier ist Parken erlaubt", true), a("Hier darf ich nur halten"), a("Hier ist Parken verboten")],
    erklaerung: "Das weiße P auf Blau kennzeichnet einen Parkplatz. Zusatzzeichen können das Parken einschränken, etwa zeitlich.",
  },
  {
    id: "p3",
    thema: "parken",
    punkte: 4,
    art: "zahl",
    text: "Bis zu wie vielen Metern vor und hinter Kreuzungen und Einmündungen ist das Parken verboten?",
    loesung: 5,
    einheit: "m",
    erklaerung: "Gemessen wird ab den Schnittpunkten der Fahrbahnkanten. So bleibt die Sicht für Abbiegende frei.",
  },
  {
    id: "p4",
    thema: "parken",
    punkte: 4,
    art: "auswahl",
    text: "Wo ist das Parken verboten?",
    antworten: [a("Vor Grundstücksein- und -ausfahrten", true), a("In zweiter Reihe", true), a("Auf einem gekennzeichneten Parkplatz mit gültigem Parkschein")],
    erklaerung: "Ein- und Ausfahrten müssen frei bleiben, und in zweiter Reihe darfst du nicht parken.",
  },
  {
    id: "p5",
    thema: "parken",
    punkte: 3,
    art: "auswahl",
    text: "Du parkst an einer Straße mit Gefälle, die Front zeigt bergab. Was ist sinnvoll?",
    antworten: [a("Handbremse fest anziehen", true), a("Den Rückwärtsgang einlegen", true), a("Den Leerlauf einlegen")],
    erklaerung: "Bergab den Rückwärtsgang, bergauf den ersten Gang einlegen – zusätzlich immer die Handbremse.",
  },
  {
    id: "p6",
    thema: "parken",
    punkte: 4,
    art: "auswahl",
    text: "Du willst auf der Fahrerseite aussteigen. Worauf achtest du?",
    antworten: [
      a("Vor dem Öffnen auf den Verkehr hinter mir achten", true),
      a("Die Tür mit der rechten Hand öffnen, damit ich mich automatisch umdrehe", true),
      a("Die Tür zügig ganz aufstoßen"),
    ],
    erklaerung: "Mit dem Griff über Kreuz drehst du Oberkörper und Blick nach hinten – so übersiehst du keinen Radfahrer.",
  },

  // ---------------------------------------------------------------- Autobahn & Sonderfälle
  {
    id: "a1",
    thema: "autobahn",
    punkte: 5,
    art: "auswahl",
    bild: "lage_rettungsgasse",
    text: "Stau auf einer Autobahn mit drei Fahrstreifen. Du (blau) fährst ganz links. Wohin weichst du für die Rettungsgasse aus?",
    antworten: [a("Nach links", true), a("Nach rechts"), a("Auf den Seitenstreifen")],
    erklaerung: "Die Rettungsgasse entsteht zwischen dem linken und dem rechts daneben liegenden Fahrstreifen. Wer ganz links fährt, weicht nach links aus, alle anderen nach rechts.",
  },
  {
    id: "a2",
    thema: "autobahn",
    punkte: 4,
    art: "auswahl",
    text: "Wann musst du eine Rettungsgasse bilden?",
    antworten: [
      a("Sobald der Verkehr nur noch in Schrittgeschwindigkeit fließt oder steht", true),
      a("Erst, wenn ich ein Martinshorn höre"),
      a("Nur, wenn die Polizei es anordnet"),
    ],
    erklaerung: "Die Rettungsgasse wird schon bei stockendem Verkehr gebildet – nicht erst, wenn Einsatzfahrzeuge da sind.",
  },
  {
    id: "a3",
    thema: "autobahn",
    punkte: 4,
    art: "auswahl",
    bild: "z201",
    text: "Was bedeutet dieses Zeichen?",
    antworten: [a("Schienenfahrzeuge haben hier Vorrang", true), a("Kreuzung mit Vorfahrt von rechts"), a("Achtung Wildwechsel")],
    erklaerung: "Das Andreaskreuz steht am Bahnübergang. Züge und Straßenbahnen haben Vorrang – bei Rotlicht oder geschlossener Schranke wird gewartet.",
  },
  {
    id: "a4",
    thema: "autobahn",
    punkte: 5,
    art: "auswahl",
    bild: "lage_schulbus",
    text: "Ein Schulbus steht mit eingeschaltetem Warnblinklicht an der Haltestelle. Was gilt?",
    antworten: [a("Nur mit Schrittgeschwindigkeit vorbeifahren", true), a("Wenn nötig anhalten und warten", true), a("Mit normalem Tempo und Hupe vorbeifahren")],
    erklaerung: "Kinder können hinter dem Bus hervorlaufen. Vorbeifahren nur mit Schrittgeschwindigkeit und so, dass niemand gefährdet wird – notfalls warten.",
  },
  {
    id: "a5",
    thema: "autobahn",
    punkte: 4,
    art: "auswahl",
    text: "Hinter dir blaues Blinklicht und Einsatzhorn. Was tust du?",
    antworten: [a("Sofort freie Bahn schaffen", true), a("Weiterfahren, bis ein Parkplatz kommt"), a("Nur reagieren, wenn es von vorne kommt")],
    erklaerung: "Blaulicht zusammen mit Einsatzhorn heißt: sofort Platz machen – egal aus welcher Richtung.",
  },
  {
    id: "a6",
    thema: "autobahn",
    punkte: 5,
    art: "auswahl",
    text: "Was ist auf der Autobahn verboten?",
    antworten: [a("Wenden", true), a("Rückwärtsfahren – auch auf dem Seitenstreifen", true), a("Auf dem linken Fahrstreifen überholen")],
    erklaerung: "Wenden und Rückwärtsfahren sind auf Autobahnen immer verboten. Hast du eine Ausfahrt verpasst, fährst du bis zur nächsten.",
  },

  // ---------------------------------------------------------------- Technik & Umwelt
  {
    id: "k1",
    thema: "technik",
    punkte: 3,
    art: "zahl",
    text: "Wie tief muss das Reifenprofil gesetzlich mindestens sein?",
    loesung: 1.6,
    einheit: "mm",
    erklaerung: "1,6 mm sind das gesetzliche Minimum. Für Nässe und Winter empfehlen Fachleute deutlich mehr Profil.",
  },
  {
    id: "k2",
    thema: "technik",
    punkte: 3,
    art: "auswahl",
    text: "Wie fährst du umweltbewusst?",
    antworten: [
      a("Früh hochschalten und niedertourig fahren", true),
      a("Vorausschauend fahren und unnötiges Bremsen vermeiden", true),
      a("Den Motor im Stand warmlaufen lassen"),
    ],
    erklaerung: "Niedrige Drehzahlen und gleichmäßiges Fahren sparen Sprit. Warmlaufenlassen im Stand ist unnötig und sogar verboten.",
  },
  {
    id: "k3",
    thema: "technik",
    punkte: 3,
    art: "auswahl",
    text: "Du wartest mehrere Minuten vor einer geschlossenen Bahnschranke. Was tust du?",
    antworten: [a("Den Motor abstellen", true), a("Den Motor laufen lassen, damit er warm bleibt"), a("Im Leerlauf ab und zu Gas geben")],
    erklaerung: "Bei längerem Warten spart Motor-Aus Kraftstoff und vermeidet Lärm und Abgase.",
  },
  {
    id: "k4",
    thema: "technik",
    punkte: 4,
    art: "auswahl",
    text: "Welche Folgen hat zu niedriger Reifendruck?",
    antworten: [a("Höherer Kraftstoffverbrauch", true), a("Schlechteres Fahrverhalten in Kurven", true), a("Ein kürzerer Bremsweg")],
    erklaerung: "Zu wenig Luft erhöht den Rollwiderstand, lässt den Reifen walken und macht das Auto schwammig.",
  },
  {
    id: "k5",
    thema: "technik",
    punkte: 5,
    art: "auswahl",
    text: "Das Bremspedal fühlt sich weich an und lässt sich weit durchtreten. Was tust du?",
    antworten: [a("Nicht weiterfahren und die Bremse prüfen lassen", true), a("Einfach fester bremsen"), a("Weiterfahren und bei Gelegenheit in die Werkstatt")],
    erklaerung: "Ein weiches Pedal kann auf Luft oder Flüssigkeitsverlust im Bremssystem hindeuten – das ist lebensgefährlich.",
  },
  {
    id: "k6",
    thema: "technik",
    punkte: 3,
    art: "auswahl",
    text: "Wann brauchst du Winterreifen (oder Ganzjahresreifen mit Alpine-Symbol)?",
    antworten: [a("Bei Glatteis, Schneeglätte oder Schneematsch", true), a("Nur von Oktober bis Ostern"), a("Immer, wenn es regnet")],
    erklaerung: "In Deutschland gilt eine situative Winterreifenpflicht: Entscheidend ist das Wetter, nicht das Datum.",
  },

  // ---------------------------------------------------------------- Mensch & Recht
  {
    id: "h1",
    thema: "mensch",
    punkte: 5,
    art: "zahl",
    text: "Welche Promillegrenze gilt für dich in der Probezeit?",
    loesung: 0,
    einheit: "‰",
    erklaerung: "In der Probezeit und bis 21 gilt ein absolutes Alkoholverbot am Steuer – also 0,0 Promille.",
  },
  {
    id: "h2",
    thema: "mensch",
    punkte: 4,
    art: "zahl",
    text: "Ab wie viel Promille begehen erfahrene Fahrer auch ohne Ausfallerscheinungen eine Ordnungswidrigkeit?",
    loesung: 0.5,
    einheit: "‰",
    erklaerung: "Ab 0,5 Promille ist Fahren eine Ordnungswidrigkeit. Mit Ausfallerscheinungen kann schon ab 0,3 Promille eine Straftat vorliegen.",
  },
  {
    id: "h3",
    thema: "mensch",
    punkte: 3,
    art: "zahl",
    text: "Wie lange dauert die Probezeit normalerweise?",
    loesung: 2,
    einheit: "Jahre",
    erklaerung: "Die Probezeit dauert zwei Jahre. Bei schweren Verstößen verlängert sie sich auf vier Jahre.",
  },
  {
    id: "h4",
    thema: "mensch",
    punkte: 4,
    art: "auswahl",
    text: "Du wirst während der Fahrt müde. Was hilft wirklich?",
    antworten: [a("Eine Pause einlegen, am besten mit kurzem Schlaf", true), a("Fenster öffnen und laute Musik hören"), a("Schneller fahren, um früher anzukommen")],
    erklaerung: "Frische Luft und Musik helfen nur kurz. Gegen Müdigkeit hilft nur eine Pause – Sekundenschlaf ist lebensgefährlich.",
  },
  {
    id: "h5",
    thema: "mensch",
    punkte: 4,
    art: "auswahl",
    text: "Darfst du dein Handy während der Fahrt benutzen?",
    antworten: [
      a("Nur mit Sprachsteuerung oder Freisprecheinrichtung, ohne es in die Hand zu nehmen", true),
      a("Ja, solange ich langsamer als 30 km/h fahre"),
      a("Ja, an der roten Ampel mit laufendem Motor"),
    ],
    erklaerung: "In die Hand nehmen ist nur erlaubt, wenn das Auto steht und der Motor vollständig aus ist.",
  },
  {
    id: "h6",
    thema: "mensch",
    punkte: 3,
    art: "auswahl",
    text: "Welche Medikamente können deine Fahrtüchtigkeit beeinträchtigen?",
    antworten: [a("Schlaf- und Beruhigungsmittel", true), a("Auch manche Erkältungsmittel", true), a("Nur Medikamente, die Alkohol enthalten")],
    erklaerung: "Viele Medikamente machen müde oder verlangsamen die Reaktion. Beipackzettel lesen und im Zweifel nicht fahren.",
  },

  // ---------------------------------------------------------------- Zahlen & Formeln
  {
    id: "f1",
    thema: "zahlen",
    punkte: 3,
    art: "zahl",
    text: "Wie lang ist der Reaktionsweg nach der Faustformel bei 50 km/h?",
    loesung: 15,
    einheit: "m",
    erklaerung: "Reaktionsweg = (Geschwindigkeit ÷ 10) × 3. Bei 50 km/h: 5 × 3 = 15 m.",
  },
  {
    id: "f2",
    thema: "zahlen",
    punkte: 4,
    art: "zahl",
    text: "Wie lang ist der normale Bremsweg nach der Faustformel bei 80 km/h?",
    loesung: 64,
    einheit: "m",
    erklaerung: "Bremsweg = (Geschwindigkeit ÷ 10)². Bei 80 km/h: 8 × 8 = 64 m.",
  },
  {
    id: "f3",
    thema: "zahlen",
    punkte: 4,
    art: "zahl",
    text: "Wie lang ist der Anhalteweg (Reaktionsweg plus normaler Bremsweg) bei 100 km/h?",
    loesung: 130,
    einheit: "m",
    erklaerung: "Reaktionsweg 10 × 3 = 30 m plus Bremsweg 10 × 10 = 100 m ergibt 130 m.",
  },
  {
    id: "f4",
    thema: "zahlen",
    punkte: 4,
    art: "zahl",
    text: "Wie lang ist der Bremsweg bei einer Gefahrenbremsung aus 60 km/h (Faustformel)?",
    loesung: 18,
    einheit: "m",
    erklaerung: "Bei einer Gefahrenbremsung halbiert sich der normale Bremsweg: (6 × 6) ÷ 2 = 18 m.",
  },
  {
    id: "f5",
    thema: "zahlen",
    punkte: 3,
    art: "zahl",
    text: "Wie lang ist der Reaktionsweg bei 70 km/h (Faustformel)?",
    loesung: 21,
    einheit: "m",
    erklaerung: "(70 ÷ 10) × 3 = 7 × 3 = 21 m.",
  },
  {
    id: "f6",
    thema: "zahlen",
    punkte: 4,
    art: "auswahl",
    text: "Wie verändert sich der Bremsweg, wenn du doppelt so schnell fährst?",
    antworten: [a("Er wird etwa viermal so lang", true), a("Er verdoppelt sich"), a("Er bleibt gleich")],
    erklaerung: "Die Geschwindigkeit geht im Quadrat in den Bremsweg ein: doppeltes Tempo, vierfacher Bremsweg.",
  },
];

export function frageVon(id: string): Frage | undefined {
  return FRAGEN.find((f) => f.id === id);
}

export function fragenZuThema(thema: ThemaId): Frage[] {
  return FRAGEN.filter((f) => f.thema === thema);
}

export function istZeichen(bild?: BildKey): boolean {
  return Boolean(bild && bild.startsWith("z"));
}

/** Zahl aus einer Eingabe wie „1,5“ oder „0,0“ lesen. */
export function zahlLesen(eingabe: string): number | null {
  const t = eingabe.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Zahl deutsch formatieren: 1.5 → „1,5“. */
export function zahlText(n: number): string {
  return String(n).replace(".", ",");
}

/** Ist die gegebene Antwort richtig? */
export function antwortRichtig(frage: Frage, auswahl: number[], eingabe: string): boolean {
  if (frage.art === "zahl") {
    const n = zahlLesen(eingabe);
    return n != null && Math.abs(n - frage.loesung) < 0.001;
  }
  return frage.antworten.every((ant, i) => ant.richtig === auswahl.includes(i));
}
