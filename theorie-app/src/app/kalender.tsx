import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { getoent, Kopf } from "@/components/ui";
import { serieAktuell, tagKey, useStand, wochenStart } from "@/lib/stand";
import { farben, schrift } from "@/lib/theme";

const WOCHEN = 12;
const TAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function farbeFuer(n: number): string {
  if (n <= 0) return farben.flaeche2;
  if (n < 10) return getoent(farben.orange, 0.35);
  if (n < 30) return getoent(farben.orange, 0.65);
  return farben.orange;
}

/** Lernkalender: die letzten Wochen als Kacheln – je mehr Fragen, desto kräftiger. */
export default function Kalender() {
  const insets = useSafeAreaInsets();
  const { stand } = useStand();
  const start = wochenStart();
  start.setDate(start.getDate() - 7 * (WOCHEN - 1));
  const heute = tagKey();
  const spalten = Array.from({ length: WOCHEN }, (_, w) =>
    Array.from({ length: 7 }, (_, t) => {
      const d = new Date(start);
      d.setDate(start.getDate() + w * 7 + t);
      const key = tagKey(d);
      return { key, n: stand.antwortenTage[key] ?? 0, zukunft: key > heute };
    }),
  );
  const gelernteTage = Object.values(stand.antwortenTage).filter((n) => n > 0).length;
  const summe = Object.values(stand.antwortenTage).reduce((a, b) => a + b, 0);

  return (
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <Kopf titel="Lernkalender" schliessen />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24, gap: 16 }}>
        <View style={{ padding: 16, borderRadius: 16, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <View style={{ justifyContent: "space-between", paddingVertical: 1 }}>
              {TAGE.map((t) => (
                <Text key={t} style={{ ...schrift.text, fontSize: 10.5, lineHeight: 18, color: farben.text3 }}>
                  {t}
                </Text>
              ))}
            </View>
            <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between" }}>
              {spalten.map((woche, i) => (
                <View key={i} style={{ gap: 4 }}>
                  {woche.map((tag) => (
                    <View
                      key={tag.key}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        backgroundColor: tag.zukunft ? "transparent" : farbeFuer(tag.n),
                        borderWidth: tag.key === heute ? 1.5 : 0,
                        borderColor: farben.text,
                      }}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 5, marginTop: 12 }}>
            <Text style={{ ...schrift.text, fontSize: 11, color: farben.text3 }}>weniger</Text>
            {[0, 5, 20, 40].map((n) => (
              <View key={n} style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: farbeFuer(n) }} />
            ))}
            <Text style={{ ...schrift.text, fontSize: 11, color: farben.text3 }}>mehr</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          {[
            { icon: "flame" as const, farbe: farben.flamme, wert: String(serieAktuell(stand)), label: "Tage in Folge" },
            { icon: "calendar-outline" as const, farbe: farben.blau, wert: String(gelernteTage), label: "Lerntage" },
            { icon: "checkmark-circle" as const, farbe: farben.gruen, wert: String(summe), label: "Antworten" },
          ].map((k) => (
            <View key={k.label} style={{ flex: 1, alignItems: "center", gap: 6, paddingVertical: 14, borderRadius: 16, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie }}>
              <Icon name={k.icon} size={24} color={k.farbe} />
              <Text style={{ ...schrift.titelFett, fontSize: 20, color: farben.text }}>{k.wert}</Text>
              <Text style={{ ...schrift.text, fontSize: 12.5, color: farben.text3 }}>{k.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
