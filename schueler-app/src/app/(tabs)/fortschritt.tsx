import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Badge, IconKachel, ProgressBar, Screen, Ueberschrift } from "@/components/ui";
import { GradientKopf } from "@/components/kopf";
import { Ring } from "@/components/ring";
import { TYP_FARBE, pflichtFuer } from "@/lib/constants";
import { ladeFahrstunden, ladePruefungen, ladeSchueler } from "@/lib/daten";
import { formatDatum } from "@/lib/format";
import { useLoader } from "@/lib/use-loader";
import { useTheme } from "@/lib/theme-context";
import { karte, space } from "@/lib/theme";

function Balken({ label, ist, soll, farbe }: { label: string; ist: number; soll: number; farbe: string }) {
  const { colors } = useTheme();
  const fertig = soll > 0 && ist >= soll;
  return (
    <View style={{ gap: space(2) }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.text }}>{label}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {fertig ? <Ionicons name="checkmark-circle" size={15} color={colors.success} /> : null}
          <Text style={{ fontSize: 14, fontWeight: "700", color: fertig ? colors.success : colors.textMuted }}>
            {Math.min(ist, soll)} / {soll}
          </Text>
        </View>
      </View>
      <ProgressBar value={ist} max={soll} color={fertig ? colors.success : farbe} hoehe={10} />
    </View>
  );
}

export default function FortschrittScreen() {
  const { colors } = useTheme();
  const schueler = useLoader(ladeSchueler, { cacheKey: "s-schueler" });
  const stunden = useLoader(ladeFahrstunden, { cacheKey: "s-stunden" });
  const pruefungen = useLoader(ladePruefungen, { cacheKey: "s-pruefungen" });

  const klasse = schueler.data?.fuehrerscheinklassen?.[0] ?? "B";
  const pflicht = pflichtFuer(klasse);
  const gefahren = (stunden.data ?? []).filter((s) => s.status === "abgeschlossen");
  const zaehle = (typ: string) => gefahren.filter((s) => s.typ === typ).length;
  const minuten = gefahren.reduce((sum, s) => sum + s.dauer_minuten, 0);
  const sollSonder = pflicht.ueberland + pflicht.autobahn + pflicht.nacht;
  const istSonder =
    Math.min(zaehle("ueberland"), pflicht.ueberland) + Math.min(zaehle("autobahn"), pflicht.autobahn) + Math.min(zaehle("nacht"), pflicht.nacht);
  const theorieOk = Boolean(schueler.data?.theorie_bestanden);
  const lernstand = schueler.data?.lernstatus ?? 0;
  const theorieAnteil = theorieOk ? 1 : lernstand / 100;
  const sonderAnteil = sollSonder > 0 ? istSonder / sollSonder : 1;
  const gesamt = Math.round(((theorieAnteil + sonderAnteil) / 2) * 100);
  const pruefungsreif = theorieOk && istSonder >= sollSonder;

  function neu() {
    schueler.refresh();
    stunden.refresh();
    pruefungen.refresh();
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingBottom: space(10) }}
        refreshControl={<RefreshControl refreshing={stunden.refreshing} onRefresh={neu} tintColor={colors.accent} />}
      >
        <GradientKopf titel="Fortschritt" untertitel={`Führerschein Klasse ${klasse}`} unten={space(16)} />

        <View style={{ paddingHorizontal: space(4), marginTop: -space(11), gap: space(6) }}>
          {/* Gesamt */}
          <View style={[karte(colors), { padding: space(5), flexDirection: "row", alignItems: "center", gap: space(5) }]}>
            <Ring anteil={gesamt / 100} farbe={pruefungsreif ? colors.success : colors.accent} groesse={96} dicke={10} mitte={`${gesamt}%`} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>
                {pruefungsreif ? "Prüfungsreif!" : gesamt >= 50 ? "Mehr als die Hälfte geschafft" : "Du bist auf dem Weg"}
              </Text>
              <Text style={{ fontSize: 14, color: colors.textMuted, lineHeight: 20 }}>
                {pruefungsreif
                  ? "Sprich mit deinem Fahrlehrer über den Prüfungstermin."
                  : "Theorie und Sonderfahrten zusammen – so nah bist du am Führerschein."}
              </Text>
            </View>
          </View>

          {/* Theorie */}
          <View>
            <Ueberschrift>Theorie</Ueberschrift>
            <View style={[karte(colors), { padding: space(4), flexDirection: "row", alignItems: "center", gap: space(4) }]}>
              <IconKachel name="book" farbe="#0EA5E9" groesse={46} />
              <View style={{ flex: 1, gap: space(2) }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
                  {theorieOk ? "Theorieprüfung bestanden" : `Lernstand ${lernstand} %`}
                </Text>
                {theorieOk ? (
                  <Badge label="Bestanden" tone="success" />
                ) : (
                  <ProgressBar value={lernstand} max={100} color="#0EA5E9" hoehe={10} />
                )}
              </View>
            </View>
          </View>

          {/* Sonderfahrten */}
          <View>
            <Ueberschrift>Sonderfahrten</Ueberschrift>
            <View style={[karte(colors), { padding: space(4), gap: space(4.5) }]}>
              <Balken label="Überlandfahrten" ist={zaehle("ueberland")} soll={pflicht.ueberland} farbe={TYP_FARBE.ueberland} />
              <Balken label="Autobahnfahrten" ist={zaehle("autobahn")} soll={pflicht.autobahn} farbe={TYP_FARBE.autobahn} />
              <Balken label="Nachtfahrten" ist={zaehle("nacht")} soll={pflicht.nacht} farbe={TYP_FARBE.nacht} />
              <Text style={{ fontSize: 12, color: colors.textMuted }}>Gesetzlich vorgeschrieben, je 45 Minuten.</Text>
            </View>
          </View>

          {/* Fahrstunden */}
          <View style={{ flexDirection: "row", gap: space(3) }}>
            <View style={[karte(colors), { flex: 1, padding: space(4), gap: space(2) }]}>
              <IconKachel name="car-sport" farbe="#8B5CF6" />
              <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text }}>{zaehle("normal")}</Text>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>Übungsstunden</Text>
            </View>
            <View style={[karte(colors), { flex: 1, padding: space(4), gap: space(2) }]}>
              <IconKachel name="time" farbe="#F59E0B" />
              <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text }}>
                {(minuten / 60).toLocaleString("de-DE", { maximumFractionDigits: 1 })}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textMuted }}>Stunden gefahren</Text>
            </View>
          </View>

          {/* Prüfungen */}
          <View>
            <Ueberschrift>Prüfungen</Ueberschrift>
            <View style={[karte(colors), { padding: space(4), gap: space(4) }]}>
              {(pruefungen.data ?? []).length === 0 ? (
                <Text style={{ fontSize: 15, color: colors.textMuted }}>Noch keine Prüfung eingetragen.</Text>
              ) : (
                (pruefungen.data ?? []).map((p) => {
                  const ton = p.ergebnis === "bestanden" ? "success" : p.ergebnis === "nicht_bestanden" ? "danger" : "accent";
                  return (
                    <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: space(3) }}>
                      <IconKachel
                        name={p.art === "theorie" ? "document-text" : "car"}
                        farbe={ton === "success" ? colors.success : ton === "danger" ? colors.danger : colors.accent}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>
                          {p.art === "theorie" ? "Theorieprüfung" : "Praktische Prüfung"}
                          {p.versuch > 1 ? ` · ${p.versuch}. Versuch` : ""}
                        </Text>
                        <Text style={{ fontSize: 13, color: colors.textMuted }} numberOfLines={1}>
                          {[formatDatum(p.datum), p.uhrzeit ? `${p.uhrzeit.slice(0, 5)} Uhr` : null, p.pruefstelle].filter(Boolean).join(" · ")}
                        </Text>
                      </View>
                      <Badge
                        label={p.ergebnis === "bestanden" ? "Bestanden" : p.ergebnis === "nicht_bestanden" ? "Nicht bestanden" : "Geplant"}
                        tone={ton}
                      />
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
