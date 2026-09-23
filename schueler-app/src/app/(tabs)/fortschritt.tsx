import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Badge, ProgressBar, Row, Screen, ScreenHeader, Section } from "@/components/ui";
import { pflichtFuer } from "@/lib/constants";
import { ladeFahrstunden, ladePruefungen, ladeSchueler } from "@/lib/daten";
import { formatDatum } from "@/lib/format";
import { useLoader } from "@/lib/use-loader";
import { useTheme } from "@/lib/theme-context";
import { radius, space } from "@/lib/theme";

function Balken({ label, ist, soll }: { label: string; ist: number; soll: number }) {
  const { colors } = useTheme();
  const fertig = soll > 0 && ist >= soll;
  return (
    <View style={{ paddingHorizontal: space(4), paddingVertical: space(3), gap: space(2) }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 16, color: colors.text }}>{label}</Text>
        <Text style={{ fontSize: 15, fontWeight: "600", color: fertig ? colors.success : colors.textMuted }}>
          {ist} von {soll}
        </Text>
      </View>
      <ProgressBar value={ist} max={soll} color={fertig ? colors.success : undefined} />
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
  const sonderFertig =
    zaehle("ueberland") >= pflicht.ueberland && zaehle("autobahn") >= pflicht.autobahn && zaehle("nacht") >= pflicht.nacht;
  const theorieOk = Boolean(schueler.data?.theorie_bestanden);
  const lernstand = schueler.data?.lernstatus ?? 0;

  function neu() {
    schueler.refresh();
    stunden.refresh();
    pruefungen.refresh();
  }

  return (
    <Screen>
      <ScreenHeader title="Fortschritt" subtitle={`Klasse ${klasse}`} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: space(4), paddingBottom: space(10) }}
        refreshControl={<RefreshControl refreshing={stunden.refreshing} onRefresh={neu} tintColor={colors.accent} />}
      >
        {theorieOk && sonderFertig ? (
          <View
            style={{
              flexDirection: "row",
              gap: space(3),
              alignItems: "center",
              backgroundColor: colors.success + "1F",
              borderRadius: radius.lg,
              padding: space(4),
              marginBottom: space(6),
            }}
          >
            <Ionicons name="trophy" size={26} color={colors.success} />
            <Text style={{ flex: 1, fontSize: 15, color: colors.text }}>
              Du bist prüfungsreif! Sprich mit deinem Fahrlehrer über den Prüfungstermin.
            </Text>
          </View>
        ) : null}

        <Section title="Theorie">
          {theorieOk ? (
            <Row title="Theorieprüfung" trailing={<Badge label="Bestanden" tone="success" />} />
          ) : (
            <Balken label="Lernstand Theorie-App" ist={lernstand} soll={100} />
          )}
        </Section>

        <Section title="Sonderfahrten" footer="Gesetzlich vorgeschrieben, je 45 Minuten.">
          <Balken label="Überlandfahrten" ist={zaehle("ueberland")} soll={pflicht.ueberland} />
          <Balken label="Autobahnfahrten" ist={zaehle("autobahn")} soll={pflicht.autobahn} />
          <Balken label="Nachtfahrten" ist={zaehle("nacht")} soll={pflicht.nacht} />
        </Section>

        <Section title="Fahrstunden">
          <Row title="Übungsstunden gefahren" value={String(zaehle("normal"))} />
          <Row title="Insgesamt gefahren" value={`${(minuten / 60).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Std.`} />
        </Section>

        <Section title="Prüfungen">
          {(pruefungen.data ?? []).length === 0 ? (
            <Row title="Noch keine Prüfung eingetragen" />
          ) : (
            (pruefungen.data ?? []).map((p) => (
              <Row
                key={p.id}
                title={`${p.art === "theorie" ? "Theorieprüfung" : "Praktische Prüfung"}${p.versuch > 1 ? ` · ${p.versuch}. Versuch` : ""}`}
                subtitle={[formatDatum(p.datum), p.uhrzeit ? `${p.uhrzeit.slice(0, 5)} Uhr` : null, p.pruefstelle].filter(Boolean).join(" · ")}
                trailing={
                  <Badge
                    label={p.ergebnis === "bestanden" ? "Bestanden" : p.ergebnis === "nicht_bestanden" ? "Nicht bestanden" : "Geplant"}
                    tone={p.ergebnis === "bestanden" ? "success" : p.ergebnis === "nicht_bestanden" ? "danger" : "accent"}
                  />
                }
              />
            ))
          )}
        </Section>
      </ScrollView>
    </Screen>
  );
}
