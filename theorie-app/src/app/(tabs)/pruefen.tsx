import { ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Abschnitt, Gruppe, Knopf, KopfTaste, T, Zeile, type IconName } from "@/components/ui";
import { FotoFlaeche } from "@/components/foto";
import { Ring } from "@/components/grafik";
import { INHALT_UNTEN } from "@/components/tab-leiste";
import { FOTOS } from "@/lib/fotos";
import { FRAGEN } from "@/lib/fragen";
import { datumKurz } from "@/lib/format";
import { fortschritt, useStand } from "@/lib/stand";
import { abstand, farben, RAND } from "@/lib/theme";

const REGELN: { icon: IconName; text: string }[] = [
  { icon: "layers-outline", text: "30 Fragen aus allen Themen, gemischt" },
  { icon: "alert-circle-outline", text: "Jede Frage zählt 2 bis 5 Fehlerpunkte" },
  { icon: "shield-checkmark-outline", text: "Bestanden mit höchstens 10 Fehlerpunkten – außer bei zwei falschen 5-Punkte-Fragen" },
  { icon: "eye-off-outline", text: "Die Auflösung siehst du erst nach dem Abgeben" },
];

function Wert({ wert, label, farbe }: { wert: string; label: string; farbe?: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center", paddingVertical: abstand(3.5), borderRadius: 18, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linieStark }}>
      <T v="zahl" farbe={farbe} style={{ fontSize: 24, lineHeight: 29 }}>
        {wert}
      </T>
      <T v="klein" farbe={farben.text2} style={{ fontSize: 12.5 }}>
        {label}
      </T>
    </View>
  );
}

export default function Pruefen() {
  const insets = useSafeAreaInsets();
  const { stand } = useStand();
  const reife = fortschritt(stand).anteil;
  const bestanden = stand.pruefungen.filter((p) => p.bestanden).length;
  const beste = stand.pruefungen.length ? Math.min(...stand.pruefungen.map((p) => p.fehlerpunkte)) : null;
  const starten = () => router.push({ pathname: "/pruefung", params: { direkt: "1" } });

  return (
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <View style={{ paddingTop: insets.top + abstand(1.5), paddingHorizontal: RAND - 8 }}>
        <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center" }}>
          <View pointerEvents="none" style={{ position: "absolute", left: 56, right: 56, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <T v="h3" style={{ fontSize: 19 }}>
              Prüfung
            </T>
          </View>
          <KopfTaste icon="arrow-back" label="Zur Startseite" onPress={() => router.navigate("/heute")} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: abstand(2), paddingBottom: INHALT_UNTEN, gap: abstand(5) }}
        showsVerticalScrollIndicator={false}
      >
        <FotoFlaeche quelle={FOTOS.pruefung} verlauf="stark" style={{ height: 290, borderRadius: 24 }}>
          <View style={{ flex: 1, padding: abstand(5), justifyContent: "flex-end", gap: abstand(3) }}>
            <View style={{ gap: 2 }}>
              <T v="mini" farbe={farben.orange}>
                Prüfungssimulation
              </T>
              <T v="titel" style={{ fontSize: 28, lineHeight: 33, textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 8 }}>
                Wie in der echten Prüfung.
              </T>
              <T v="text" farbe="#E4E6EA">
                {Math.min(30, FRAGEN.length)} Fragen · Fehlerpunkte wie beim TÜV oder der DEKRA
              </T>
            </View>
            <Knopf titel="Simulation starten" icon="arrow-forward" onPress={starten} style={{ alignSelf: "flex-start", paddingHorizontal: abstand(7) }} />
          </View>
        </FotoFlaeche>

        <View style={{ flexDirection: "row", alignItems: "center", gap: abstand(4), padding: abstand(4), borderRadius: 20, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie }}>
          <Ring anteil={reife} groesse={74} dicke={7} farbe={reife >= 0.9 ? farben.gruen : farben.orange}>
            <T v="h3" style={{ fontSize: 17 }}>
              {Math.round(reife * 100)}%
            </T>
          </Ring>
          <View style={{ flex: 1, gap: 3 }}>
            <T v="h3">Prüfungsreife</T>
            <T v="klein">{reife >= 0.9 ? "Du bist bereit – mach zur Sicherheit noch eine Simulation." : "Ab 90 % richtig beantworteter Fragen bist du gut aufgestellt."}</T>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: abstand(2.5) }}>
          <Wert wert={String(stand.pruefungen.length)} label="Simulationen" />
          <Wert wert={String(bestanden)} label="bestanden" farbe={bestanden > 0 ? farben.gruen : undefined} />
          <Wert wert={beste == null ? "–" : String(beste)} label="beste Fehlerpkt." />
        </View>

        <View>
          <Abschnitt titel="So läuft es ab" />
          <Gruppe>
            {REGELN.map((r) => (
              <Zeile key={r.text} icon={r.icon} iconFarbe={farben.orange} titel={r.text} />
            ))}
          </Gruppe>
        </View>

        {stand.pruefungen.length > 0 ? (
          <View>
            <Abschnitt titel="Letzte Simulationen" />
            <Gruppe>
              {stand.pruefungen.slice(0, 8).map((p) => (
                <Zeile
                  key={p.datum}
                  icon={p.bestanden ? "checkmark-circle" : "close-circle"}
                  iconFarbe={p.bestanden ? farben.gruen : farben.rot}
                  titel={p.bestanden ? "Bestanden" : "Nicht bestanden"}
                  unter={`${datumKurz(p.datum)} · ${p.richtig} von ${p.gesamt} richtig`}
                  wert={`${p.fehlerpunkte} FP`}
                />
              ))}
            </Gruppe>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: abstand(3), padding: abstand(4), borderRadius: 18, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie }}>
            <Ionicons name="time-outline" size={22} color={farben.text3} />
            <T v="klein" style={{ flex: 1 }}>
              Deine Simulationen erscheinen hier – mit Fehlerpunkten und Ergebnis.
            </T>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
