import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Abschnitt, Chip, Karte, Knopf, Plakette, T, type IconName } from "@/components/ui";
import { Streckenplan } from "@/components/strecke";
import { INHALT_UNTEN } from "@/components/tab-leiste";
import { FRAGEN, THEMEN, istBildfrage, istZeichen } from "@/lib/fragen";
import { fehlerIds, gemerktIds, statistik, themaStatistik, useStand } from "@/lib/stand";
import { abstand, farben, RAND } from "@/lib/theme";

type Modus = { id: string; titel: string; anzahl: number; icon: IconName; farbe: string };

export default function Lernen() {
  const insets = useSafeAreaInsets();
  const { stand } = useStand();
  const gesamt = statistik(stand);
  const themen = THEMEN.map((thema) => ({ thema, stat: themaStatistik(stand, thema.id) }));

  const modi: Modus[] = [
    { id: "alle", titel: "Alle Fragen", anzahl: FRAGEN.length, icon: "list", farbe: farben.text2 },
    { id: "bild", titel: "Bildfragen", anzahl: FRAGEN.filter((f) => istBildfrage(f.bild)).length, icon: "image-outline", farbe: farben.blau },
    { id: "zeichen", titel: "Zeichenfragen", anzahl: FRAGEN.filter((f) => istZeichen(f.bild)).length, icon: "triangle-outline", farbe: farben.orange },
    { id: "zahl", titel: "Zahlenfragen", anzahl: FRAGEN.filter((f) => f.art === "zahl").length, icon: "calculator-outline", farbe: farben.gelb },
    { id: "gemerkt", titel: "Gemerkt", anzahl: gemerktIds(stand).length, icon: "bookmark-outline", farbe: farben.blau },
    { id: "fehler", titel: "Fehler", anzahl: fehlerIds(stand).length, icon: "refresh", farbe: farben.rot },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: farben.grund }}
      contentContainerStyle={{ paddingTop: insets.top + abstand(3), paddingBottom: INHALT_UNTEN, gap: abstand(7) }}
    >
      <View style={{ paddingHorizontal: RAND, gap: abstand(1) }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <T v="titel">Lernen</T>
          <Chip text={`Klasse ${stand.klasse}`} icon="swap-horizontal" onPress={() => router.push("/einstellungen")} />
        </View>
        <T v="klein">
          {FRAGEN.length} Fragen · {THEMEN.length} Themen · {gesamt.sicher} sicher
        </T>
      </View>

      {/* Prüfungssimulation */}
      <View style={{ paddingHorizontal: RAND }}>
        <Karte hervorgehoben style={{ gap: abstand(4) }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: abstand(3.5) }}>
            <Plakette icon="school-outline" groesse={46} />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="h3">Prüfungssimulation</T>
              <T v="klein">30 Fragen · Fehlerpunkte wie in der echten Prüfung</T>
            </View>
          </View>
          <Knopf titel="Simulation starten" icon="arrow-forward" klein onPress={() => router.push("/pruefung")} />
        </Karte>
      </View>

      {/* Lernmodi */}
      <View>
        <Abschnitt titel="Lernmodi" style={{ paddingHorizontal: RAND }} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: RAND, gap: abstand(3) }}>
          {modi.map((m) => {
            const leer = m.anzahl === 0;
            return (
              <Karte
                key={m.id}
                onPress={leer ? undefined : () => router.push({ pathname: "/training", params: { modus: m.id } })}
                style={{ width: 138, padding: abstand(4), gap: abstand(5), opacity: leer ? 0.45 : 1 }}
              >
                <Plakette icon={m.icon} farbe={m.farbe} groesse={36} />
                <View style={{ gap: 2 }}>
                  <T v="h3" numberOfLines={1}>
                    {m.titel}
                  </T>
                  <T v="klein">{m.anzahl === 1 ? "1 Frage" : `${m.anzahl} Fragen`}</T>
                </View>
              </Karte>
            );
          })}
        </ScrollView>
      </View>

      {/* Streckenplan */}
      <View style={{ paddingHorizontal: RAND }}>
        <Abschnitt titel="Dein Streckenplan" />
        <T v="klein" style={{ marginTop: -abstand(1), marginBottom: abstand(3) }}>
          Jedes Thema ist eine Haltestelle. Ab 80 % sicher ist sie geschafft.
        </T>
        <Streckenplan themen={themen} onWahl={(thema) => router.push({ pathname: "/thema/[id]", params: { id: thema.id } })} />
      </View>
    </ScrollView>
  );
}
