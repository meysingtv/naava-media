import { type ReactNode } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { router, usePathname } from "expo-router";

import { Logo } from "@/components/grafik";
import { Icon, type IconName } from "@/components/icon";
import { ProfilBild } from "@/components/profilbild";
import { B, Balken, Kachel, Knopf, n, TOENE, Wert, zahlen, type Ton, type Zustand, webDunkel } from "@/components/web/bunt";
import { useClipRechte } from "@/lib/clips-server";
import { FRAGEN_AKTIV } from "@/lib/funktionen";
import { SEITENLEISTE, SEITENLEISTE_SCHMAL } from "@/lib/fenster";
import { useKonto } from "@/lib/konto";
import { useLive } from "@/lib/live";
import { tageBis, terminDatum } from "@/lib/pruefungstag";
import { ligaVon } from "@/lib/rangliste";
import { ALBUM } from "@/lib/schilder-jagd";
import { heuteBeantwortet, serieAktuell, useStand } from "@/lib/stand";

// Rahmen der Lern-App im Browser: links eine breite Leiste mit großen, bunten
// Symbolen (bei schmalem Fenster nur die Symbole), rechts auf den Hauptseiten
// eine Spalte mit Serie, XP, Tagesziel und Liga.

type Punkt = { pfad: string; titel: string; an: IconName; aus: IconName; ton: Ton };

const HAUPT: Punkt[] = [
  { pfad: "/heute", titel: "Home", an: "home", aus: "home-outline", ton: TOENE.orange },
  { pfad: "/lernen", titel: "Lernen", an: "book", aus: "book-outline", ton: TOENE.gruen },
  // Prüfung nur mit Fragen (lib/funktionen.ts)
  ...(FRAGEN_AKTIV ? [{ pfad: "/pruefen", titel: "Prüfung", an: "shield-checkmark", aus: "shield-checkmark-outline", ton: TOENE.blau } as Punkt] : []),
  { pfad: "/clips", titel: "Clips", an: "film", aus: "film-outline", ton: TOENE.pink },
  { pfad: "/profil", titel: "Profil", an: "person-circle", aus: "person-circle-outline", ton: TOENE.lila },
];

const EINSTELLUNGEN: Punkt = { pfad: "/einstellungen", titel: "Einstellungen", an: "settings", aus: "settings-outline", ton: { farbe: "#8A8F96", kante: "#6E737A", hell: "#F0F1F2" } };

const MEHR: Punkt[] = FRAGEN_AKTIV
  ? [
      { pfad: "/statistik", titel: "Statistik", an: "stats-chart", aus: "stats-chart-outline", ton: TOENE.indigo },
      { pfad: "/karteikarten", titel: "Karteikarten", an: "albums", aus: "albums-outline", ton: TOENE.tuerkis },
      { pfad: "/crew", titel: "Crew", an: "people", aus: "people-outline", ton: TOENE.koralle },
      EINSTELLUNGEN,
    ]
  : [
      { pfad: "/zeichen", titel: "Verkehrszeichen", an: "warning", aus: "warning-outline", ton: TOENE.rot },
      { pfad: "/kurz-erklaert", titel: "Kurz erklärt", an: "bulb", aus: "bulb-outline", ton: TOENE.koralle },
      { pfad: "/formeln", titel: "Formeln", an: "calculator", aus: "calculator-outline", ton: TOENE.bernstein },
      { pfad: "/schilder-jagd", titel: "Schilder-Jagd", an: "camera", aus: "camera-outline", ton: TOENE.tuerkis },
      EINSTELLUNGEN,
    ];

/** Punkt der Seitenleiste – auch für den Manager. */
export function LeistenPunkt({ titel, an, aus, ton, aktiv, schmal, punkt, zahl, onPress }: { titel: string; an: IconName; aus: IconName; ton: Ton; aktiv: boolean; schmal: boolean; punkt?: boolean; zahl?: number; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={titel}
      accessibilityState={{ selected: aktiv }}
      style={(z: Zustand) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: schmal ? "center" : "flex-start",
        gap: 16,
        height: 46,
        paddingHorizontal: schmal ? 0 : 12,
        borderRadius: 12,
        backgroundColor: aktiv ? B.ton : z.hovered ? B.hover : "transparent",
      })}
    >
      <View>
        <Icon name={aktiv ? an : aus} size={23} color={aktiv ? ton.farbe : B.text3} />
        {punkt ? <View style={{ position: "absolute", top: -2, right: -3, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FF2D55", borderWidth: 2, borderColor: B.grund }} /> : null}
      </View>
      {schmal ? null : <Text style={{ flex: 1, ...n.fett, fontSize: 15.5, color: aktiv ? B.text : B.text2 }}>{titel}</Text>}
      {!schmal && zahl != null ? <Text style={{ ...n.fett, fontSize: 13.5, color: B.text3, fontVariant: ["tabular-nums"] }}>{zahl}</Text> : null}
    </Pressable>
  );
}

function NavPunkt({ p, aktiv, schmal, punkt }: { p: Punkt; aktiv: boolean; schmal: boolean; punkt?: boolean }) {
  return <LeistenPunkt titel={p.titel} an={p.an} aus={p.aus} ton={p.ton} aktiv={aktiv} schmal={schmal} punkt={punkt} onPress={() => router.navigate(p.pfad as never)} />;
}

/** Leiste links – ersetzt am PC die Tab-Leiste. */
export function WebSeitenleiste() {
  const pfad = usePathname();
  const bereich = "/" + pfad.replace(/^\//, "").split("/")[0];
  const { width } = useWindowDimensions();
  const schmal = width < 1200;
  const { anzeigeName } = useKonto();
  const rechte = useClipRechte();
  const { live } = useLive();
  const mehr = rechte.inhaber ? [...MEHR, { pfad: "/manager", titel: "Manager", an: "grid", aus: "grid-outline", ton: TOENE.gelb } as Punkt] : MEHR;

  return (
    <View style={{ width: schmal ? SEITENLEISTE_SCHMAL : SEITENLEISTE, height: "100%", paddingHorizontal: schmal ? 12 : 16, paddingTop: 22, paddingBottom: 16, borderRightWidth: 1.5, borderRightColor: B.linie, backgroundColor: B.grund }}>
      <Pressable onPress={() => router.navigate("/heute")} accessibilityLabel="Fahrschul Pro – Home" style={{ paddingHorizontal: schmal ? 0 : 10, alignItems: schmal ? "center" : "flex-start", marginBottom: 26 }}>
        <Logo groesse={schmal ? 34 : 28} mitText={!schmal} hell={!webDunkel()} />
      </Pressable>
      <View style={{ gap: 2 }}>
        {HAUPT.map((p) => (
          <NavPunkt key={p.pfad} p={p} aktiv={bereich === p.pfad} schmal={schmal} punkt={p.pfad === "/clips" && Boolean(live)} />
        ))}
      </View>
      <View style={{ height: 1.5, backgroundColor: B.linie, marginVertical: 14, marginHorizontal: 6 }} />
      <View style={{ gap: 2 }}>
        {mehr.map((p) => (
          <NavPunkt key={p.pfad} p={p} aktiv={bereich === p.pfad} schmal={schmal} />
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <Pressable
        onPress={() => router.navigate("/profil")}
        style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", justifyContent: schmal ? "center" : "flex-start", gap: 12, padding: 8, borderRadius: 14, backgroundColor: z.hovered ? B.ton : "transparent" })}
      >
        <ProfilBild name={anzeigeName} groesse={38} rand={0} />
        {schmal ? null : (
          <Text style={{ flex: 1, ...n.fett, fontSize: 15, color: B.text }} numberOfLines={1}>
            {anzeigeName}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Rechte Spalte
// ---------------------------------------------------------------------------

/** Serie, XP, Tagesziel und Liga – rechts neben dem Inhalt der Hauptseiten. */
export function RechteSpalte({ children }: { children?: ReactNode }) {
  return FRAGEN_AKTIV ? <SpalteMitFragen>{children}</SpalteMitFragen> : <SpalteOhneFragen>{children}</SpalteOhneFragen>;
}

/** Solange die Fragen aus sind: Prüfungstermin, Schilder-Jagd und Lernvideos statt Serie, XP und Liga. */
function SpalteOhneFragen({ children }: { children?: ReactNode }) {
  const { stand } = useStand();
  const termin = terminDatum(stand.pruefungstermin);
  const tage = termin ? tageBis(termin) : null;
  const gefunden = ALBUM.filter((k) => stand.schilder[k]).length;
  return (
    <View style={{ gap: 20 }}>
      <Kachel onPress={() => router.push("/pruefungstermin")} style={{ padding: 20, gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: TOENE.orange.farbe, alignItems: "center", justifyContent: "center", borderBottomWidth: 4, borderBottomColor: "rgba(0,0,0,0.18)" }}>
            <Icon name="calendar" size={24} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...n.schwarz, fontSize: 17, color: B.text }}>
              {tage !== null && tage >= 0 ? (tage === 0 ? "Heute ist Prüfung" : tage === 1 ? "Morgen ist Prüfung" : `Noch ${tage} Tage`) : "Prüfungstermin"}
            </Text>
            <Text style={{ ...n.halb, fontSize: 13.5, color: B.text2 }}>{tage !== null && tage >= 0 ? "bis zur Theorieprüfung" : "Trag deinen Termin ein"}</Text>
          </View>
        </View>
      </Kachel>

      <Kachel onPress={() => router.push("/schilder-jagd")} style={{ padding: 20, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ ...n.schwarz, fontSize: 18, color: B.text }}>Schilder-Jagd</Text>
          <Text style={{ ...n.fett, fontSize: 14, color: B.text3, fontVariant: ["tabular-nums"] }}>
            {gefunden} / {ALBUM.length}
          </Text>
        </View>
        <Balken anteil={ALBUM.length ? gefunden / ALBUM.length : 0} ton={TOENE.tuerkis} />
        <Text style={{ ...n.halb, fontSize: 13.5, color: B.text2 }}>Echte Schilder mit der Kamera sammeln</Text>
      </Kachel>

      <Kachel onPress={() => router.push("/lernen")} style={{ padding: 20, gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icon name="play-circle" size={30} color={TOENE.gruen.farbe} />
          <View style={{ flex: 1 }}>
            <Text style={{ ...n.schwarz, fontSize: 17, color: B.text }}>Lernvideos</Text>
            <Text style={{ ...n.halb, fontSize: 13.5, color: B.text2 }}>Alle Themen kurz und einfach erklärt</Text>
          </View>
        </View>
      </Kachel>

      {children}
    </View>
  );
}

function SpalteMitFragen({ children }: { children?: ReactNode }) {
  const { stand } = useStand();
  const serie = serieAktuell(stand);
  const heute = heuteBeantwortet(stand);
  const ziel = stand.tagesziel;
  const liga = ligaVon(stand.xp);
  const ligaStart = liga.bis === 6000 ? 2000 : 0;
  const geschafft = heute >= ziel;

  return (
    <View style={{ gap: 20 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Wert icon="flame" ton={serie > 0 ? TOENE.orange : { ...TOENE.orange, farbe: B.text3 }} wert={String(serie)} titel="Serie" onPress={() => router.push("/statistik")} />
        <Wert icon="flash" ton={TOENE.gelb} wert={zahlen(stand.xp)} titel="XP" onPress={() => router.push("/liga")} />
        <Wert icon="trophy" ton={TOENE.blau} wert={liga.name.split("-")[0]} titel="Liga" onPress={() => router.push("/liga")} />
      </View>

      <Kachel style={{ padding: 20, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ ...n.schwarz, fontSize: 18, color: B.text }}>Tagesziel</Text>
          <Text style={{ ...n.fett, fontSize: 14, color: geschafft ? B.gruen : B.text3 }}>{geschafft ? "Geschafft!" : `${Math.max(0, ziel - heute)} fehlen`}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icon name={geschafft ? "trophy" : "flag"} size={30} color={geschafft ? B.gelb : B.orange} />
          <View style={{ flex: 1, gap: 6 }}>
            <Balken anteil={ziel ? heute / ziel : 0} ton={geschafft ? TOENE.gruen : TOENE.orange} />
            <Text style={{ ...n.halb, fontSize: 13.5, color: B.text2, fontVariant: ["tabular-nums"] }}>
              {Math.min(heute, 999)} / {ziel} Fragen heute
            </Text>
          </View>
        </View>
      </Kachel>

      <Kachel onPress={() => router.push("/liga")} style={{ padding: 20, gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: liga.farbe, alignItems: "center", justifyContent: "center", borderBottomWidth: 4, borderBottomColor: "rgba(0,0,0,0.18)" }}>
            <Icon name="trophy" size={26} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...n.schwarz, fontSize: 17, color: B.text }}>{liga.name}</Text>
            <Text style={{ ...n.halb, fontSize: 13.5, color: B.text2 }}>{liga.naechste && liga.bis ? `Noch ${zahlen(liga.bis - stand.xp)} XP bis ${liga.naechste}` : "Höchste Liga erreicht"}</Text>
          </View>
        </View>
        {liga.bis ? <Balken anteil={(stand.xp - ligaStart) / (liga.bis - ligaStart)} ton={TOENE.blau} hoehe={12} /> : null}
      </Kachel>

      {children}
    </View>
  );
}

/** Seite mit Inhalt in der Mitte und der rechten Spalte – volle Fensterbreite. */
export function WebSeite({ children, rechts, ohneRechts }: { children: ReactNode; rechts?: ReactNode; ohneRechts?: boolean }) {
  const { width } = useWindowDimensions();
  const mitRechts = !ohneRechts && width >= 1180;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: B.grund }} contentContainerStyle={{ paddingHorizontal: width >= 1400 ? 48 : 32, paddingTop: 32, paddingBottom: 64 }}>
      <View style={{ flexDirection: "row", gap: 40, alignItems: "flex-start", width: "100%", maxWidth: 1480, alignSelf: "center" }}>
        <View style={{ flex: 1, minWidth: 0, gap: 32 }}>{children}</View>
        {mitRechts ? <View style={{ width: 340 }}>{rechts ?? <RechteSpalte />}</View> : null}
      </View>
    </ScrollView>
  );
}

/** Kasten „Konto erstellen“ für Gäste. */
export function KontoHinweis() {
  return (
    <Kachel style={{ padding: 20, gap: 14 }}>
      <Text style={{ ...n.schwarz, fontSize: 18, color: B.text }}>Fortschritt sichern</Text>
      <Text style={{ ...n.halb, fontSize: 14.5, lineHeight: 20, color: B.text2 }}>
        {FRAGEN_AKTIV ? "Mit einem kostenlosen Konto gehen Liga, Crew und Duelle – und nichts geht verloren." : "Mit einem kostenlosen Konto kannst du liken, kommentieren und ein Profilbild zeigen – und nichts geht verloren."}
      </Text>
      <Knopf titel="Konto erstellen" ton="gruen" onPress={() => router.push("/registrieren")} />
      <Knopf titel="Anmelden" art="rand" ton="blau" onPress={() => router.push("/anmelden")} />
    </Kachel>
  );
}
