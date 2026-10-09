import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFenster } from "@/lib/fenster";
import { Glas } from "@/components/glas";
import { Kopfzeile, StartKnopf } from "@/components/home";
import { Icon } from "@/components/icon";
import { Baustellen, Eckdaten, ErgebnisListe, FehlerpunkteVerlauf, Instrumententafel, PruefungsTicket, RegelListe, Tacho, type Baustelle, type Regel } from "@/components/pruefen";
import { useInhaltUnten } from "@/components/tab-leiste";
import { FarbweltBereich, useDarstellung } from "@/lib/darstellung";
import { THEMEN, fragenZuThema } from "@/lib/fragen";
import { useLeistenScroll } from "@/lib/leisten-scroll";
import { countdownMoeglich, tageText, terminDatum } from "@/lib/pruefungstag";
import { fortschritt, useStand } from "@/lib/stand";
import { RAND, schrift } from "@/lib/theme";

const REGELN: Regel[] = [
  { icon: "layers-outline", text: "Fragen aus allen Themen, gemischt" },
  { icon: "alert-circle-outline", text: "Jede Frage zählt 2 bis 5 Fehlerpunkte" },
  { icon: "shield-checkmark-outline", text: "Bestanden mit höchstens 10 Fehlerpunkten – außer bei zwei falschen 5-Punkte-Fragen" },
  { icon: "eye-off-outline", text: "Die Auflösung siehst du erst nach dem Abgeben" },
  { icon: "time-outline", text: "Nach 45 Minuten wird automatisch abgegeben" },
];

export default function Pruefen() {
  const insets = useSafeAreaInsets();
  const { width } = useFenster();
  const inhaltUnten = useInhaltUnten();
  const leistenScroll = useLeistenScroll();
  const fokus = useIsFocused();
  const { farbwelt: f } = useDarstellung();
  const { stand } = useStand();

  const reife = fortschritt(stand);
  const pruefungen = stand.pruefungen;
  const bestanden = pruefungen.filter((p) => p.bestanden).length;
  const termin = terminDatum(stand.pruefungstermin);
  const wann = termin ? tageText(termin) : null;
  const starten = () => router.push({ pathname: "/pruefung", params: { direkt: "1" } });

  // Die schwächsten begonnenen Themen – vor der Prüfung noch einmal üben.
  const baustellen: Baustelle[] = THEMEN.map((t) => {
    const liste = fragenZuThema(t.id);
    const p = fortschritt(stand, liste);
    return { id: t.id, anteil: p.anteil, offen: p.gesamt - p.richtig, begonnen: liste.some((q) => stand.fragen[q.id]) };
  })
    .filter((t) => t.begonnen && t.offen > 0)
    .sort((a, b) => a.anteil - b.anteil)
    .slice(0, 3)
    .map(({ id, anteil, offen }) => ({ id, anteil, offen }));

  const tachoGroesse = Math.min(width - 56, 316);
  const tachoOben = insets.top + 92;
  const heldHoehe = Math.round(tachoOben + tachoGroesse * 0.9 + 96);
  const kopfText = f.hell ? "#14171B" : "#FFFFFF";
  const terminChip = !termin || wann === "vorbei" ? "Termin?" : wann === "heute" ? "Heute" : wann === "morgen" ? "Morgen" : wann;

  return (
    <FarbweltBereich farbwelt={f}>
      {fokus ? <StatusBar style={f.hell ? "dark" : "light"} /> : null}
      <View style={{ flex: 1, backgroundColor: f.grund }}>
        <ScrollView {...leistenScroll} contentContainerStyle={{ paddingBottom: inhaltUnten + 12 }} showsVerticalScrollIndicator={false}>
          <Instrumententafel hoehe={heldHoehe} lichtY={tachoOben + tachoGroesse / 2}>
            <View style={{ position: "absolute", top: insets.top + 4, left: RAND, right: RAND, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
              <View>
                <Text style={{ ...schrift.titel, fontSize: 34, lineHeight: 40, color: kopfText, letterSpacing: -0.5 }}>Prüfung</Text>
                <Text style={{ ...schrift.textMittel, fontSize: 15, color: f.hell ? "rgba(20,23,27,0.66)" : "rgba(255,255,255,0.72)", marginTop: 1 }}>Theorieprüfung · Klasse {stand.klasse}</Text>
              </View>
              <Pressable onPress={() => router.push("/pruefungstermin")} accessibilityLabel={termin ? `Prüfungstermin, ${wann}` : "Prüfungstermin eintragen"} hitSlop={6}>
                <Glas klar hell={f.hell} style={{ height: 38, borderRadius: 19, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 13, marginTop: 2 }}>
                  <Icon name="calendar" size={15} color={f.orange} />
                  <Text style={{ ...schrift.textHalb, fontSize: 13.5, color: kopfText }}>{terminChip}</Text>
                </Glas>
              </Pressable>
            </View>

            <View style={{ position: "absolute", top: tachoOben, left: 0, right: 0, alignItems: "center" }}>
              <Tacho anteil={reife.anteil} sicher={reife.richtig} gesamt={reife.gesamt} groesse={tachoGroesse} />
            </View>
          </Instrumententafel>

          <View style={{ marginTop: -80, paddingHorizontal: RAND }}>
            <StartKnopf titel="Simulation starten" unter="30 Fragen · 45 Minuten · wie beim TÜV" onPress={starten} />
          </View>

          <Kopfzeile titel="Dein Prüfungstag" style={{ marginTop: 32 }} />
          <PruefungsTicket
            termin={termin}
            wann={wann}
            hinweis={countdownMoeglich() ? "Countdown auf dem Sperrbildschirm" : "Erinnerung am Prüfungsmorgen"}
            hinweisIcon={countdownMoeglich() ? "lock-closed" : "notifications"}
            onPress={() => router.push("/pruefungstermin")}
            style={{ marginHorizontal: RAND }}
          />

          <Kopfzeile titel="Deine Simulationen" link={pruefungen.length > 0 ? `${bestanden} von ${pruefungen.length} bestanden` : undefined} style={{ marginTop: 32 }} />
          <FehlerpunkteVerlauf pruefungen={pruefungen} style={{ marginHorizontal: RAND }} />
          {pruefungen.length > 0 ? <ErgebnisListe pruefungen={pruefungen.slice(0, 3)} style={{ marginHorizontal: RAND, marginTop: 10 }} /> : null}

          {baustellen.length > 0 ? (
            <>
              <Kopfzeile titel="Vorher noch üben" link="Alle Themen" onLink={() => router.navigate("/lernen")} style={{ marginTop: 32 }} />
              <Baustellen themen={baustellen} onThema={(id) => router.push({ pathname: "/training", params: { modus: "thema", thema: id } })} style={{ marginHorizontal: RAND }} />
            </>
          ) : null}

          <Kopfzeile titel="So läuft es ab" style={{ marginTop: 32 }} />
          <Eckdaten style={{ marginHorizontal: RAND }} />
          <RegelListe regeln={REGELN} style={{ marginHorizontal: RAND, marginTop: 10 }} />
        </ScrollView>
      </View>
    </FarbweltBereich>
  );
}
