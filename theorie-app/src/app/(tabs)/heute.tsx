import { useState } from "react";
import { Pressable, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useFenster } from "@/lib/fenster";
import { CrewBereich } from "@/components/crew";
import { FokusKarte, GRUSS, Handschrift, HeldWerte, heldHoehe, KinoHeld, Kopfzeile, PruefungKarte, Schnellstart, StartKnopf, tageszeit, ThemenKarussell, ZitatKarte } from "@/components/home";
import { Icon } from "@/components/icon";
import { ProfilBild } from "@/components/profilbild";
import { useInhaltUnten } from "@/components/tab-leiste";
import { FarbweltBereich, useDarstellung } from "@/lib/darstellung";
import { FRAGEN, THEMEN, type ThemaId } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { heuteDran } from "@/lib/karteikarten";
import { useKonto } from "@/lib/konto";
import { useLeistenScroll } from "@/lib/leisten-scroll";
import { tageBis, terminDatum } from "@/lib/pruefungstag";
import { fehlerIds, fortschritt, gemerktIds, heuteBeantwortet, serieAktuell, useStand } from "@/lib/stand";
import { RAND, schrift } from "@/lib/theme";

const ZITATE: [string, string][] = [
  ["Kleine Schritte.", "Große Freiheit."],
  ["Heute üben.", "Morgen bestehen."],
  ["Jede Frage zählt.", "Du packst das."],
  ["Dranbleiben.", "Die Straße wartet."],
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const { width } = useFenster();
  const inhaltUnten = useInhaltUnten();
  const leistenScroll = useLeistenScroll();
  const fokus = useIsFocused();
  const { farbwelt: f } = useDarstellung();
  const { stand } = useStand();
  const { anzeigeName } = useKonto();
  const [ueberFoto, setUeberFoto] = useState(true);

  const jetzt = new Date();
  const zeit = tageszeit(jetzt.getHours());
  const vorname = anzeigeName.split(" ")[0] || "Gast";
  const gesamt = fortschritt(stand);
  const serie = serieAktuell(stand);
  const heute = heuteBeantwortet(stand);
  const rest = Math.max(0, stand.tagesziel - heute);
  const termin = terminDatum(stand.pruefungstermin);
  const tage = termin ? tageBis(termin) : null;
  const kommend = tage !== null && tage >= 0 ? tage : null;

  // Die Handschrift zählt bis zur Prüfung – ohne Termin der Slogan wie immer.
  const zeilen =
    kommend === null ? ["Mach", "deinen Führerschein", "möglich."] : kommend === 0 ? ["Heute ist", "dein Tag."] : kommend === 1 ? ["Morgen", "ist Prüfung."] : [`Noch ${kommend} Tage`, "bis zur Prüfung."];

  // Stand je Thema; Fokus ist das schwächste bereits begonnene Thema.
  const themen = THEMEN.map((t) => {
    const liste = FRAGEN.filter((q) => q.thema === t.id);
    const p = fortschritt(stand, liste);
    const begonnen = liste.some((q) => stand.fragen[q.id]);
    return { id: t.id as ThemaId, anteil: p.anteil, offen: p.gesamt - p.richtig, begonnen };
  });
  const offeneThemen = themen.filter((t) => t.offen > 0);
  const fokusThema = [...offeneThemen.filter((t) => t.begonnen)].sort((a, b) => a.anteil - b.anteil)[0] ?? offeneThemen[0] ?? themen[0];

  const letzte = stand.pruefungen[0] ?? null;
  const zitat = ZITATE[jetzt.getDate() % ZITATE.length];
  const glockePunkt = !stand.erinnerung.an;

  // Über dem Foto hell, darunter (im hellen Modus) dunkle Statusleiste.
  const schwelle = heldHoehe(width) - insets.top - 60;
  function beimScrollen(e: NativeSyntheticEvent<NativeScrollEvent>) {
    leistenScroll.onScroll?.(e);
    const oben = e.nativeEvent.contentOffset.y < schwelle;
    if (oben !== ueberFoto) setUeberFoto(oben);
  }

  return (
    <FarbweltBereich farbwelt={f}>
      {fokus ? <StatusBar style={f.hell && !ueberFoto ? "dark" : "light"} /> : null}
      <View style={{ flex: 1, backgroundColor: f.grund }}>
        <ScrollView onScroll={beimScrollen} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: inhaltUnten + 12 }} showsVerticalScrollIndicator={false}>
          <KinoHeld zeit={zeit}>
            {/* Begrüßung */}
            <View style={{ position: "absolute", top: insets.top + 2, left: 26, right: RAND, flexDirection: "row", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ ...schrift.text, fontSize: 17, color: "rgba(255,255,255,0.92)", textShadowColor: "rgba(0,0,0,0.35)", textShadowRadius: 6 }}>{GRUSS[zeit]}</Text>
                <Text style={{ ...schrift.titel, fontSize: 38, lineHeight: 44, color: "#FFFFFF", letterSpacing: -0.5, textShadowColor: "rgba(0,0,0,0.35)", textShadowRadius: 8 }} numberOfLines={1}>
                  {vorname}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  tippen();
                  router.push("/einstellungen");
                }}
                accessibilityLabel="Erinnerungen"
                hitSlop={8}
                style={{ marginTop: 20, marginRight: 18 }}
              >
                <Icon name="notifications" size={24} color="#FFFFFF" />
                {glockePunkt ? (
                  <View style={{ position: "absolute", top: -3, right: -3, width: 9, height: 9, borderRadius: 4.5, backgroundColor: f.orange, borderWidth: 1.5, borderColor: "rgba(0,0,0,0.4)" }} />
                ) : null}
              </Pressable>
              <Pressable
                onPress={() => {
                  tippen();
                  router.navigate("/profil");
                }}
                accessibilityLabel="Profil"
                style={{ marginTop: 6 }}
              >
                <ProfilBild name={anzeigeName} groesse={50} />
              </Pressable>
            </View>

            <Handschrift zeilen={zeilen} style={{ position: "absolute", left: 30, top: insets.top + 112 }} />

            <View style={{ position: "absolute", left: RAND, right: RAND, bottom: 104 }}>
              <HeldWerte
                reife={gesamt.anteil}
                sicher={gesamt.richtig}
                gesamt={gesamt.gesamt}
                serie={serie}
                heute={heute}
                ziel={stand.tagesziel}
                onReife={() => router.push("/statistik")}
                onSerie={() => router.push("/statistik")}
                onHeute={() => router.push({ pathname: "/training", params: { modus: "smart" } })}
              />
            </View>
          </KinoHeld>

          <View style={{ marginTop: -80, paddingHorizontal: RAND }}>
            <StartKnopf
              titel={heute > 0 ? "Weiterlernen" : "Lernen starten"}
              unter={rest > 0 ? `Noch ${rest} Fragen bis zum Tagesziel` : "Tagesziel geschafft – jede Frage zählt extra"}
              onPress={() => router.push({ pathname: "/training", params: { modus: "smart" } })}
            />
          </View>

          <Schnellstart
            style={{ marginTop: 18 }}
            ziele={[
              { icon: "heart", titel: "Favoriten", zahl: gemerktIds(stand).length, onPress: () => router.push("/favoriten") },
              { icon: "refresh", titel: "Fehler üben", zahl: fehlerIds(stand).length, onPress: () => router.push({ pathname: "/training", params: { modus: "fehler" } }) },
              { icon: "albums-outline", titel: "Karteikarten", zahl: heuteDran(stand).gesamt, onPress: () => router.push("/karteikarten") },
              { icon: "camera", titel: "Schilder-Jagd", onPress: () => router.push("/schilder-jagd") },
              { icon: "flash", titel: "Duell", onPress: () => router.push("/duell") },
              { icon: "stats-chart", titel: "Statistik", onPress: () => router.push("/statistik") },
            ]}
          />

          <Kopfzeile titel="Dein Fokus heute" style={{ marginTop: 30 }} />
          <View style={{ paddingHorizontal: RAND }}>
            <FokusKarte
              thema={fokusThema.id}
              anteil={fokusThema.anteil}
              offen={fokusThema.offen}
              onPress={() => router.push({ pathname: "/training", params: { modus: "thema", thema: fokusThema.id } })}
            />
          </View>

          <Kopfzeile titel="Deine Themen" link="Alle ansehen" onLink={() => router.navigate("/lernen")} style={{ marginTop: 30 }} />
          <ThemenKarussell themen={themen} onThema={(id) => router.push({ pathname: "/thema/[id]", params: { id } })} />

          <Kopfzeile titel="Deine Prüfung" style={{ marginTop: 30 }} />
          <View style={{ paddingHorizontal: RAND }}>
            <PruefungKarte tage={kommend} letzte={letzte} onPress={() => router.navigate("/pruefen")} onTermin={() => router.push("/pruefungstermin")} />
          </View>

          {/* Crew: gemeinsame Flamme und Wochen-Boss */}
          <CrewBereich style={{ marginHorizontal: RAND }} kopf={<Kopfzeile titel="Deine Crew" link="Öffnen" onLink={() => router.push("/crew")} style={{ marginTop: 30, marginHorizontal: -RAND }} />} />

          <View style={{ paddingHorizontal: RAND, marginTop: 30 }}>
            <ZitatKarte zeilen={zitat} />
          </View>
        </ScrollView>
      </View>
    </FarbweltBereich>
  );
}
