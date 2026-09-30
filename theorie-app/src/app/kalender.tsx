import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { GrossKopf, Seite } from "@/components/seite";
import { kartenFlaeche } from "@/components/ui";
import { useDarstellung } from "@/lib/darstellung";
import { serieAktuell, tagKey, useStand, wochenStart } from "@/lib/stand";
import { farben, mitDeckkraft, RAND, schrift } from "@/lib/theme";

const WOCHEN = 12;
const TAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** Farbe eines Tages: je mehr Fragen, desto kräftiger das Orange. */
function tagesFarbe(n: number, hell: boolean, orange: string): string {
  if (n <= 0) return hell ? "#ECE7DF" : "#161C22";
  if (n < 10) return mitDeckkraft(orange, 0.3);
  if (n < 30) return mitDeckkraft(orange, 0.62);
  return orange;
}

/** Lernkalender: die letzten Wochen als Kacheln – je mehr Fragen, desto kräftiger. */
export default function Kalender() {
  const insets = useSafeAreaInsets();
  const { farbwelt: f } = useDarstellung();
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
    <Seite>
      <GrossKopf titel="Lernkalender" unter="Die letzten 12 Wochen auf einen Blick" schliessen />
      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: 16, paddingBottom: insets.bottom + 24, gap: 14 }} showsVerticalScrollIndicator={false}>
        <View style={[{ padding: 18, borderRadius: 24 }, kartenFlaeche(f)]}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <View style={{ justifyContent: "space-between", paddingVertical: 1 }}>
              {TAGE.map((t) => (
                <Text key={t} style={{ ...schrift.textMittel, fontSize: 10.5, lineHeight: 18, color: f.text3 }}>
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
                        backgroundColor: tag.zukunft ? "transparent" : tagesFarbe(tag.n, f.hell, f.orange),
                        borderWidth: tag.key === heute ? 1.5 : 0,
                        borderColor: f.hell ? "#14171B" : "#FFFFFF",
                      }}
                    />
                  ))}
                </View>
              ))}
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 5, marginTop: 14 }}>
            <Text style={{ ...schrift.text, fontSize: 11, color: f.text3 }}>weniger</Text>
            {[0, 5, 20, 40].map((n) => (
              <View key={n} style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: tagesFarbe(n, f.hell, f.orange) }} />
            ))}
            <Text style={{ ...schrift.text, fontSize: 11, color: f.text3 }}>mehr</Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          {[
            { icon: "flame" as const, farbe: "#FF8A2A", wert: String(serieAktuell(stand)), label: "Tage in Folge" },
            { icon: "calendar-outline" as const, farbe: farben.blau, wert: String(gelernteTage), label: "Lerntage" },
            { icon: "checkmark-circle" as const, farbe: f.hell ? "#23A548" : "#4ED053", wert: String(summe), label: "Antworten" },
          ].map((k) => (
            <View key={k.label} style={[{ flex: 1, alignItems: "center", gap: 6, paddingVertical: 16, borderRadius: 22 }, kartenFlaeche(f)]}>
              <Icon name={k.icon} size={24} color={k.farbe} />
              <Text style={{ ...schrift.titel, fontSize: 20, color: f.text, fontVariant: ["tabular-nums"] }}>{k.wert}</Text>
              <Text style={{ ...schrift.textMittel, fontSize: 12.5, color: f.text3 }}>{k.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Seite>
  );
}
