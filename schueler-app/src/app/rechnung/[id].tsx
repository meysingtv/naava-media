import { Linking, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { Badge, Button, CenterInfo, Row, Screen, Section } from "@/components/ui";
import { ladeRechnung, ladeSchule } from "@/lib/daten";
import { formatDatum, formatEuro } from "@/lib/format";
import { useLoader } from "@/lib/use-loader";
import { useTheme } from "@/lib/theme-context";
import { karte, space } from "@/lib/theme";

const STATUS = {
  offen: { label: "Offen", tone: "warning" as const },
  bezahlt: { label: "Bezahlt", tone: "success" as const },
  ueberfaellig: { label: "Überfällig", tone: "danger" as const },
};

function Zeile({ label, wert, fett }: { label: string; wert: string; fett?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space(3), paddingHorizontal: space(4), paddingVertical: space(3) }}>
      <Text style={{ fontSize: 16, color: fett ? colors.text : colors.textMuted, fontWeight: fett ? "600" : "400" }}>{label}</Text>
      <Text selectable style={{ fontSize: 16, color: colors.text, fontWeight: fett ? "700" : "500", flexShrink: 1, textAlign: "right" }}>
        {wert}
      </Text>
    </View>
  );
}

export default function RechnungScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const daten = useLoader(() => ladeRechnung(String(id)), { cacheKey: `s-rechnung-${id}` });
  const schule = useLoader(ladeSchule, { cacheKey: "s-schule" });

  if (daten.loading) return <CenterInfo loading />;
  if (!daten.data) return <CenterInfo error text={daten.error ?? "Rechnung nicht gefunden."} />;

  const { rechnung: r, positionen } = daten.data;
  const st = STATUS[r.status];
  const steuer = Number(r.betrag_brutto) - Number(r.betrag_netto);

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space(4), paddingBottom: space(10) }}>
        <View style={[karte(colors), { padding: space(5), marginBottom: space(6), gap: space(1) }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 15, color: colors.textMuted }}>Rechnung {r.nummer}</Text>
            <Badge label={st.label} tone={st.tone} />
          </View>
          <Text style={{ fontSize: 32, fontWeight: "700", color: colors.text }}>{formatEuro(r.betrag_brutto)}</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>
            vom {formatDatum(r.rechnungsdatum)}
            {r.status === "bezahlt" && r.bezahlt_am
              ? ` · bezahlt am ${formatDatum(r.bezahlt_am)}`
              : r.faelligkeitsdatum
                ? ` · fällig am ${formatDatum(r.faelligkeitsdatum)}`
                : ""}
          </Text>
        </View>

        <Section title="Positionen">
          {positionen.length === 0 ? (
            <Row title="Keine Positionen" />
          ) : (
            positionen.map((p) => (
              <Row
                key={p.id}
                title={p.beschreibung}
                subtitle={`${Number(p.menge).toLocaleString("de-DE")} ${p.einheit ?? "×"} à ${formatEuro(p.einzelpreis)}`}
                value={formatEuro(Number(p.menge) * Number(p.einzelpreis))}
              />
            ))
          )}
        </Section>

        <Section title="Summe">
          <Zeile label="Netto" wert={formatEuro(r.betrag_netto)} />
          <Zeile label={`MwSt. ${r.steuersatz} %`} wert={formatEuro(steuer)} />
          <Zeile label="Gesamt" wert={formatEuro(r.betrag_brutto)} fett />
        </Section>

        {r.status !== "bezahlt" ? (
          <>
            {schule.data?.zahlungslink ? (
              <View style={{ marginBottom: space(6) }}>
                <Button title="Online bezahlen" onPress={() => Linking.openURL(schule.data!.zahlungslink!)} />
              </View>
            ) : null}
            {schule.data?.iban ? (
              <Section title="Per Überweisung" footer="Bitte immer die Rechnungsnummer als Verwendungszweck angeben.">
                <Zeile label="Empfänger" wert={schule.data.kontoinhaber ?? schule.data.name} />
                <Zeile label="IBAN" wert={schule.data.iban} />
                <Zeile label="Betrag" wert={formatEuro(r.betrag_brutto)} />
                <Zeile label="Verwendungszweck" wert={r.nummer} />
              </Section>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
