import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Screen } from "@/components/ui";
import { TerminKarte } from "@/components/termin-karte";
import { Wortmarke } from "@/components/wortmarke";
import { istAnstehend, pflichtFuer } from "@/lib/constants";
import { ladeAnfragen, ladeFahrstunden, ladeLehrer, ladeRechnungen, ladeRegeln, ladeSchueler, ladeSchule } from "@/lib/daten";
import { formatEuro } from "@/lib/format";
import { useLoader } from "@/lib/use-loader";
import { useRealtime } from "@/lib/use-realtime";
import { useTheme } from "@/lib/theme-context";
import { radius, space } from "@/lib/theme";

function Kachel({
  titel,
  wert,
  sub,
  farbe,
  onPress,
}: {
  titel: string;
  wert: string;
  sub?: string;
  farbe?: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: pressed ? colors.cardAlt : colors.card,
        borderRadius: radius.lg,
        padding: space(4),
        gap: 2,
      })}
    >
      <Text style={{ fontSize: 13, color: colors.textMuted }}>{titel}</Text>
      <Text style={{ fontSize: 22, fontWeight: "700", color: farbe ?? colors.text }} numberOfLines={1}>
        {wert}
      </Text>
      {sub ? <Text style={{ fontSize: 12, color: colors.textMuted }}>{sub}</Text> : null}
    </Pressable>
  );
}

export default function StartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const schueler = useLoader(ladeSchueler, { cacheKey: "s-schueler" });
  const schule = useLoader(ladeSchule, { cacheKey: "s-schule" });
  const stunden = useLoader(ladeFahrstunden, { cacheKey: "s-stunden" });
  const regeln = useLoader(ladeRegeln, { cacheKey: "s-regeln" });
  const lehrer = useLoader(ladeLehrer, { cacheKey: "s-lehrer" });
  const rechnungen = useLoader(ladeRechnungen, { cacheKey: "s-rechnungen" });
  const anfragen = useLoader(ladeAnfragen, { cacheKey: "s-anfragen" });

  useRealtime("s-start-stunden", "fahrstunde", () => stunden.refresh());
  useRealtime("s-start-anfragen", "fahrstunde_anfrage", () => {
    anfragen.refresh();
    regeln.refresh();
  });

  function allesNeu() {
    schueler.refresh();
    schule.refresh();
    stunden.refresh();
    regeln.refresh();
    lehrer.refresh();
    rechnungen.refresh();
    anfragen.refresh();
  }

  const liste = stunden.data ?? [];
  const naechste = liste.find((s) => istAnstehend(s));
  const gefahren = liste.filter((s) => s.status === "abgeschlossen");
  const klasse = schueler.data?.fuehrerscheinklassen?.[0] ?? "B";
  const pflicht = pflichtFuer(klasse);
  const sollSonder = pflicht.ueberland + pflicht.autobahn + pflicht.nacht;
  const istSonder =
    Math.min(gefahren.filter((s) => s.typ === "ueberland").length, pflicht.ueberland) +
    Math.min(gefahren.filter((s) => s.typ === "autobahn").length, pflicht.autobahn) +
    Math.min(gefahren.filter((s) => s.typ === "nacht").length, pflicht.nacht);
  const offen = (rechnungen.data ?? []).filter((r) => r.status !== "bezahlt").reduce((sum, r) => sum + Number(r.betrag_brutto ?? 0), 0);
  const offeneAnfragen = (anfragen.data ?? []).filter((a) => a.status === "offen").length;
  const erlaubt = Boolean(regeln.data?.erlaubt);
  const lehrerName = (id: string | null) => (lehrer.data ?? []).find((l) => l.id === id)?.name;
  const theorie = schueler.data?.theorie_bestanden ? "Bestanden" : `${schueler.data?.lernstatus ?? 0} %`;

  return (
    <Screen>
      <View
        style={{
          paddingTop: insets.top + space(1.5),
          paddingHorizontal: space(4),
          paddingBottom: space(2),
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Wortmarke />
        <Pressable onPress={() => router.push("/profil")} hitSlop={10} accessibilityLabel="Profil">
          <Ionicons name="person-circle-outline" size={30} color={colors.accent} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: space(4), paddingBottom: space(10), gap: space(5) }}
        refreshControl={<RefreshControl refreshing={stunden.refreshing} onRefresh={allesNeu} tintColor={colors.accent} />}
      >
        <View>
          <Text style={{ fontSize: 30, fontWeight: "700", color: colors.text }}>
            Hallo{schueler.data?.vorname ? ` ${schueler.data.vorname}` : ""}!
          </Text>
          {schule.data?.name ? <Text style={{ fontSize: 15, color: colors.textMuted, marginTop: 2 }}>{schule.data.name}</Text> : null}
        </View>

        <View style={{ gap: space(2) }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.4 }}>
            Nächste Fahrstunde
          </Text>
          {naechste ? (
            <TerminKarte stunde={naechste} lehrer={lehrerName(naechste.fahrlehrer_id)} aktionen beiAenderung={stunden.refresh} />
          ) : (
            <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: space(5), alignItems: "center" }}>
              <Text style={{ color: colors.textMuted, fontSize: 15 }}>
                {stunden.loading ? "Lädt …" : "Noch keine Fahrstunde geplant."}
              </Text>
            </View>
          )}
        </View>

        {erlaubt ? (
          <View style={{ gap: space(2) }}>
            <Button title="Fahrstunde anfragen" onPress={() => router.push("/anfrage")} />
            {offeneAnfragen > 0 ? (
              <Pressable onPress={() => router.push("/(tabs)/termine")} hitSlop={6}>
                <Text style={{ textAlign: "center", color: colors.accent, fontSize: 14 }}>
                  {offeneAnfragen === 1 ? "1 Anfrage wartet auf Antwort" : `${offeneAnfragen} Anfragen warten auf Antwort`}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <View style={{ gap: space(3) }}>
          <View style={{ flexDirection: "row", gap: space(3) }}>
            <Kachel titel="Gefahren" wert={String(gefahren.length)} sub="Fahrstunden" onPress={() => router.push("/(tabs)/fortschritt")} />
            <Kachel
              titel="Sonderfahrten"
              wert={`${istSonder}/${sollSonder}`}
              sub={istSonder >= sollSonder ? "alle erledigt" : "Überland, Autobahn, Nacht"}
              farbe={istSonder >= sollSonder ? colors.success : undefined}
              onPress={() => router.push("/(tabs)/fortschritt")}
            />
          </View>
          <View style={{ flexDirection: "row", gap: space(3) }}>
            <Kachel
              titel="Theorie"
              wert={theorie}
              sub={schueler.data?.theorie_bestanden ? "Prüfung bestanden" : "Lernstand"}
              farbe={schueler.data?.theorie_bestanden ? colors.success : undefined}
              onPress={() => router.push("/(tabs)/fortschritt")}
            />
            <Kachel
              titel="Offen"
              wert={formatEuro(offen)}
              sub={offen > 0 ? "zu bezahlen" : "alles bezahlt"}
              farbe={offen > 0 ? colors.warning : colors.success}
              onPress={() => router.push("/(tabs)/rechnungen")}
            />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
