import { Pressable, ScrollView, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Abschnitt, IconQuadrat, Knopf, T, type IconName } from "@/components/ui";
import { FotoFlaeche, FotoKachel, LeuchtSaeulen } from "@/components/foto";
import { Ring } from "@/components/grafik";
import { INHALT_UNTEN } from "@/components/tab-leiste";
import { TempoZeichen, Verkehrszeichen } from "@/components/zeichen";
import { CLIPS } from "@/lib/clips";
import { FOTOS } from "@/lib/fotos";
import { tippen } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import { fortschritt, heuteBeantwortet, serieAktuell, serieGeschuetzt, useStand, xpHeute } from "@/lib/stand";
import { abstand, farben, RAND, schrift } from "@/lib/theme";

function RundTaste({ children, onPress, label, orange }: { children: React.ReactNode; onPress: () => void; label: string; orange?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityLabel={label}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: orange ? farben.orangeDunkel : farben.flaeche,
        borderWidth: orange ? 1.5 : 1,
        borderColor: orange ? farben.orange : farben.linieStark,
        opacity: pressed ? 0.8 : 1,
        ...(orange ? { shadowColor: farben.orange, shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } } : null),
      })}
    >
      {children}
    </Pressable>
  );
}

function Kennzahl({ icon, farbe, wert, label }: { icon: IconName; farbe: string; wert: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", gap: abstand(1.5) }}>
      <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: farbe + "2E", alignItems: "center", justifyContent: "center" }}>
        <Ionicons name={icon} size={23} color={farbe} />
      </View>
      <T v="zahl" style={{ fontSize: 27, lineHeight: 31 }}>
        {wert}
      </T>
      <T v="klein" farbe={farben.text2} style={{ fontSize: 13, marginTop: -2 }}>
        {label}
      </T>
    </View>
  );
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const { stand } = useStand();
  const { anzeigeName } = useKonto();

  const beantwortet = heuteBeantwortet(stand);
  const ziel = stand.tagesziel;
  const serie = serieAktuell(stand);
  const gesamt = fortschritt(stand);
  const vorname = anzeigeName.split(" ")[0];
  const zielAnteil = Math.min(1, beantwortet / ziel);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: farben.grund }}
      contentContainerStyle={{ paddingTop: insets.top + abstand(3), paddingHorizontal: RAND, paddingBottom: INHALT_UNTEN, gap: abstand(5) }}
      showsVerticalScrollIndicator={false}
    >
      {/* Begrüßung */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: abstand(3) }}>
        <View style={{ flex: 1 }}>
          <T v="textStark" style={{ fontSize: 17 }}>
            Willkommen zurück,
          </T>
          <T v="display" numberOfLines={1} style={{ fontSize: 36, lineHeight: 42 }}>
            {vorname}
          </T>
        </View>
        <RundTaste label="Erinnerungen" onPress={() => router.push("/einstellungen")}>
          <Ionicons name="notifications" size={22} color={farben.text} />
        </RundTaste>
        <RundTaste label="Spur Plus" orange onPress={() => router.push("/premium")}>
          <MaterialCommunityIcons name="crown" size={25} color={farben.orange} />
        </RundTaste>
      </View>

      {/* Kennzahlen */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: abstand(4),
          borderRadius: 22,
          backgroundColor: farben.flaeche,
          borderWidth: 1,
          borderColor: farben.linieStark,
        }}
      >
        <Kennzahl icon="flame" farbe={farben.orange} wert={String(serie)} label="Tages-Streak" />
        <View style={{ width: 1, height: 64, backgroundColor: farben.linieStark }} />
        <Kennzahl icon="stats-chart" farbe={farben.orange} wert={`${Math.round(gesamt.anteil * 100)}%`} label="Fortschritt" />
        <View style={{ width: 1, height: 64, backgroundColor: farben.linieStark }} />
        <Kennzahl icon="star" farbe={farben.gelb} wert={String(xpHeute(stand))} label="Heute Punkte" />
      </View>

      {serieGeschuetzt(stand) ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: abstand(2), padding: abstand(3), borderRadius: 14, backgroundColor: farben.blauSoft }}>
          <Ionicons name="shield-checkmark" size={16} color={farben.blau} />
          <T v="klein" farbe={farben.text} style={{ flex: 1 }}>
            Gestern Pause – dein Serien-Schutz hält die Serie. Lern heute, sonst ist sie weg.
          </T>
        </View>
      ) : null}

      {/* Tagesziel */}
      <FotoFlaeche quelle={FOTOS.tagesziel} verlauf="links" style={{ height: 214, borderRadius: 24 }}>
        <View style={{ flex: 1, padding: abstand(5), justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <View style={{ flex: 1, gap: 2 }}>
              <T v="titel" style={{ fontSize: 29, lineHeight: 34, textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 8 }}>
                Tagesziel
              </T>
              <T v="textStark" farbe="#F0F1F3" style={{ fontSize: 16, fontFamily: schrift.textMittel, textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 6 }}>
                Beantworte {ziel} Fragen
              </T>
            </View>
            <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: "rgba(10,11,14,0.62)", alignItems: "center", justifyContent: "center" }}>
              <Ring anteil={zielAnteil} groesse={88} dicke={7} spur="rgba(255,255,255,0.14)">
                <T v="h3" style={{ fontSize: 18, fontVariant: ["tabular-nums"] }}>
                  {Math.min(beantwortet, 999)}/{ziel}
                </T>
              </Ring>
            </View>
          </View>
          <View style={{ gap: abstand(3.5) }}>
            <View style={{ width: "64%", height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.22)", overflow: "hidden" }}>
              <View style={{ width: `${zielAnteil * 100}%`, height: "100%", borderRadius: 5, backgroundColor: farben.orange }} />
            </View>
            <Knopf
              titel={beantwortet >= ziel ? "Weiter lernen" : beantwortet === 0 ? "Jetzt starten" : "Weiter lernen"}
              icon="arrow-forward"
              klein
              onPress={() => router.push({ pathname: "/training", params: { modus: "smart" } })}
              style={{ alignSelf: "flex-start", paddingHorizontal: abstand(6), height: 50 }}
            />
          </View>
        </View>
      </FotoFlaeche>

      {/* Schnellstart */}
      <View>
        <T v="titel" style={{ fontSize: 25, marginBottom: abstand(3.5) }}>
          Schnellstart
        </T>
        <View style={{ gap: abstand(3) }}>
          <View style={{ flexDirection: "row", gap: abstand(3) }}>
            <FotoKachel quelle={FOTOS.lernen} titel="Lernen" unter="Wissen aufbauen" oben={<IconQuadrat icon="book" />} onPress={() => router.navigate("/lernen")} />
            <FotoKachel quelle={FOTOS.simulation} titel="Simulation" unter="Prüfung üben" oben={<IconQuadrat icon="clipboard" />} onPress={() => router.navigate("/pruefen")} />
          </View>
          <View style={{ flexDirection: "row", gap: abstand(3) }}>
            <FotoKachel
              quelle={FOTOS.baeume}
              titel="Verkehrszeichen"
              unter="Alle Zeichen lernen"
              onPress={() => router.push("/zeichen")}
              hintergrund={
                <View pointerEvents="none" style={{ position: "absolute", top: 8, left: 10, right: 8, flexDirection: "row", alignItems: "flex-start" }}>
                  <View style={{ marginTop: 12 }}>
                    <Verkehrszeichen zeichen="z205" groesse={50} />
                  </View>
                  <View style={{ marginLeft: -4 }}>
                    <TempoZeichen zahl={50} groesse={62} />
                  </View>
                </View>
              }
            />
            <FotoKachel
              titel="Statistiken"
              unter="Deine Fortschritte"
              oben={<IconQuadrat icon="stats-chart" hell={false} />}
              onPress={() => router.navigate("/profil")}
              hintergrund={
                <View pointerEvents="none" style={{ position: "absolute", right: 14, top: 14 }}>
                  <LeuchtSaeulen hoehe={70} />
                </View>
              }
            />
          </View>
        </View>
      </View>

      {/* Mehr */}
      <View>
        <Abschnitt titel="Kurz erklärt" aktion="Alle Clips" onAktion={() => router.push("/clips")} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -RAND }} contentContainerStyle={{ paddingHorizontal: RAND, gap: abstand(3) }}>
          {CLIPS.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => {
                tippen();
                router.push({ pathname: "/clips", params: { start: c.id } });
              }}
              style={({ pressed }) => ({
                width: 200,
                padding: abstand(4),
                gap: abstand(2),
                borderRadius: 18,
                backgroundColor: farben.flaeche,
                borderWidth: 1,
                borderColor: farben.linie,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="play-circle" size={18} color={farben.orange} />
                <T v="mini" farbe={farben.orange} numberOfLines={1}>
                  {c.kategorie}
                </T>
              </View>
              <T v="textStark" numberOfLines={2} style={{ minHeight: 42 }}>
                {c.titel}
              </T>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <Pressable
        onPress={() => {
          tippen();
          router.navigate("/liga");
        }}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: abstand(3.5),
          padding: abstand(4),
          borderRadius: 20,
          backgroundColor: farben.flaeche,
          borderWidth: 1,
          borderColor: farben.linie,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: farben.orangeSoft, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="flash" size={22} color={farben.orange} />
        </View>
        <View style={{ flex: 1 }}>
          <T v="h3">Duell starten</T>
          <T v="klein">Tritt gegen andere Fahrschüler an</T>
        </View>
        <Ionicons name="chevron-forward" size={18} color={farben.text3} />
      </Pressable>
    </ScrollView>
  );
}
