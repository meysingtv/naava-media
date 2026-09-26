import { ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Abschnitt, Gruppe, Knopf, Kopf, T, Zeile } from "@/components/ui";
import { FotoFlaeche } from "@/components/foto";
import { Ring } from "@/components/grafik";
import { Verkehrszeichen } from "@/components/zeichen";
import { Kontrollleuchte } from "@/components/leuchten";
import { fragenZuThema, istZeichen, themaVon, type LeuchteKey, type ThemaId, type ZeichenKey } from "@/lib/fragen";
import { themaFoto } from "@/lib/fotos";
import { fortschritt, themaStatistik, useStand } from "@/lib/stand";
import { abstand, farben, RAND } from "@/lib/theme";

export default function ThemaSeite() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { stand } = useStand();
  const thema = themaVon(id as ThemaId);
  const fragen = fragenZuThema(thema.id);
  const stat = themaStatistik(stand, thema.id);
  const fort = fortschritt(stand, fragen);

  const status = (frageId: string) => {
    const fs = stand.fragen[frageId];
    if (!fs || fs.r + fs.f === 0) return { farbe: farben.text4, text: "neu" };
    if (fs.l === 0) return { farbe: farben.rot, text: "falsch" };
    if (fs.box >= 3) return { farbe: farben.gruen, text: "sicher" };
    return { farbe: farben.orange, text: "geübt" };
  };

  return (
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <Kopf titel={thema.titel} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: abstand(1), paddingBottom: abstand(8), gap: abstand(5) }}>
        <FotoFlaeche quelle={themaFoto(thema.id)} verlauf="links" style={{ height: 200, borderRadius: 22 }}>
          <View style={{ flex: 1, padding: abstand(5), flexDirection: "row", alignItems: "flex-end", gap: abstand(3) }}>
            <View style={{ flex: 1, gap: abstand(1) }}>
              <T v="titel" style={{ fontSize: 26, textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 8 }}>
                {thema.titel}
              </T>
              <T v="text" farbe="#E4E6EA" style={{ textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 6 }}>
                {thema.kurz}
              </T>
            </View>
            <View style={{ width: 86, height: 86, borderRadius: 43, backgroundColor: "rgba(10,11,14,0.62)" }}>
              <Ring anteil={fort.anteil} groesse={86} dicke={7} spur="rgba(255,255,255,0.14)">
                <T v="h3" style={{ fontSize: 18 }}>
                  {Math.round(fort.anteil * 100)}%
                </T>
              </Ring>
            </View>
          </View>
        </FotoFlaeche>

        <View style={{ flexDirection: "row", gap: abstand(2) }}>
          {[
            { w: stat.gesamt, l: "Fragen", f: farben.text },
            { w: stat.gesehen, l: "gesehen", f: farben.text },
            { w: stat.sicher, l: "sicher", f: farben.gruen },
            { w: stat.fehler, l: "offen", f: stat.fehler > 0 ? farben.rot : farben.text },
          ].map((x) => (
            <View key={x.l} style={{ flex: 1, paddingVertical: abstand(3), alignItems: "center", borderRadius: 14, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie }}>
              <T v="h2" farbe={x.f}>
                {x.w}
              </T>
              <T v="klein" style={{ fontSize: 12 }}>
                {x.l}
              </T>
            </View>
          ))}
        </View>

        <View style={{ gap: abstand(3) }}>
          <Knopf titel="Thema lernen" icon="arrow-forward" onPress={() => router.push({ pathname: "/training", params: { modus: "thema", thema: thema.id } })} />
          {stat.fehler > 0 ? (
            <Knopf
              titel={`Nur Fehler üben (${stat.fehler})`}
              art="sekundaer"
              onPress={() => router.push({ pathname: "/training", params: { modus: "fehler", thema: thema.id } })}
            />
          ) : null}
        </View>

        <View>
          <Abschnitt titel="Fragen in diesem Thema" />
          <Gruppe>
            {fragen.map((f) => {
              const s = status(f.id);
              return (
                <Zeile
                  key={f.id}
                  titel={f.text}
                  titelZeilen={2}
                  unter={`${f.punkte} Punkte · ${s.text}`}
                  rechts={
                    f.bild ? (
                      istZeichen(f.bild) ? (
                        <Verkehrszeichen zeichen={f.bild as ZeichenKey} groesse={30} />
                      ) : f.bild.startsWith("leuchte_") ? (
                        <Kontrollleuchte leuchte={f.bild as LeuchteKey} groesse={30} />
                      ) : (
                        <Ionicons name="map-outline" size={17} color={farben.text3} />
                      )
                    ) : undefined
                  }
                  icon="ellipse"
                  iconFarbe={s.farbe}
                  onPress={() => router.push({ pathname: "/training", params: { modus: "thema", thema: thema.id, start: f.id } })}
                />
              );
            })}
          </Gruppe>
        </View>
      </ScrollView>
      <View style={{ height: insets.bottom }} />
    </View>
  );
}
