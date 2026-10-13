import { Linking, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";

import { Badge, Button, CenterInfo, Row, Screen, Section } from "@/components/ui";
import { useBezahlen, ZahlungsErgebnis } from "@/components/bezahlen";
import { ladeRechnung, ladeSchueler, ladeSchule } from "@/lib/daten";
import { formatDatum, formatEuro } from "@/lib/format";
import { useLoader } from "@/lib/use-loader";
import { useRealtime } from "@/lib/use-realtime";
import { useTheme } from "@/lib/theme-context";
import { karte, radius, space } from "@/lib/theme";
import { ladeOnlineZahlung, ladeZahlungen, zahlartText } from "@/lib/zahlung";

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

function Info({ icon, farbe, text }: { icon: keyof typeof Ionicons.glyphMap; farbe: string; text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space(2.5), backgroundColor: farbe + "17", borderRadius: radius.lg, padding: space(3.5), marginBottom: space(6) }}>
      <Ionicons name={icon} size={18} color={farbe} />
      <Text style={{ flex: 1, fontSize: 14, color: colors.text, lineHeight: 19 }}>{text}</Text>
    </View>
  );
}

export default function RechnungScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const daten = useLoader(() => ladeRechnung(String(id)), { cacheKey: `s-rechnung-${id}` });
  const schule = useLoader(ladeSchule, { cacheKey: "s-schule" });
  const schueler = useLoader(ladeSchueler, { cacheKey: "s-schueler" });
  const online = useLoader(ladeOnlineZahlung, { cacheKey: "s-online-zahlung" });
  const zahlungen = useLoader(ladeZahlungen, { cacheKey: "s-zahlungen" });
  const { bezahle, laeuft, ergebnis, schliessen } = useBezahlen(() => Promise.all([daten.refresh(), zahlungen.refresh()]));

  useRealtime(`s-rechnung-${id}-vorgang`, "zahlungsvorgang", () => {
    daten.refresh();
    zahlungen.refresh();
  });

  if (daten.loading) return <CenterInfo loading />;
  if (!daten.data) return <CenterInfo error text={daten.error ?? "Rechnung nicht gefunden."} />;

  const { rechnung: r, positionen } = daten.data;
  const st = STATUS[r.status];
  const steuer = Number(r.betrag_brutto) - Number(r.betrag_netto);
  const offen = r.status !== "bezahlt";
  const perLastschrift = Boolean(schueler.data?.sepa_mandat_ref);
  const vorgaenge = zahlungen.data ?? [];
  const inPruefung = vorgaenge.some((z) => z.status === "in_pruefung" && z.rechnung_ids.includes(r.id));
  const zahlart = vorgaenge.find((z) => z.status === "bezahlt" && z.rechnung_ids.includes(r.id))?.zahlart ?? null;
  const kannOnline = offen && Boolean(online.data) && !perLastschrift && !inPruefung;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: space(4), paddingBottom: space(10) }}>
        <View style={[karte(colors), { padding: space(5), marginBottom: space(6), gap: space(1) }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 15, color: colors.textMuted }}>Rechnung {r.nummer}</Text>
            <Badge label={inPruefung ? "In Prüfung" : st.label} tone={inPruefung ? "warning" : st.tone} />
          </View>
          <Text style={{ fontSize: 32, fontWeight: "700", color: colors.text }}>{formatEuro(r.betrag_brutto)}</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>
            vom {formatDatum(r.rechnungsdatum)}
            {r.status === "bezahlt" && r.bezahlt_am
              ? ` · bezahlt am ${formatDatum(r.bezahlt_am)}${zahlart ? ` mit ${zahlartText(zahlart)}` : ""}`
              : r.faelligkeitsdatum
                ? ` · fällig am ${formatDatum(r.faelligkeitsdatum)}`
                : ""}
          </Text>

          {kannOnline ? (
            <View style={{ marginTop: space(4), gap: space(2.5) }}>
              <Button
                title={`Jetzt bezahlen · ${formatEuro(r.betrag_brutto)}`}
                icon="lock-closed"
                loading={laeuft !== null}
                onPress={() => bezahle([r.id])}
              />
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space(1.5) }}>
                <Ionicons name="shield-checkmark" size={14} color={colors.success} />
                <Text style={{ fontSize: 12, color: colors.textMuted }}>Sicher über Stripe · Apple Pay, Karte, Lastschrift und mehr</Text>
              </View>
            </View>
          ) : null}
        </View>

        {offen && perLastschrift ? (
          <Info icon="repeat" farbe={colors.accent} text="Dieser Betrag wird per SEPA-Lastschrift eingezogen – du musst nichts tun." />
        ) : null}
        {offen && inPruefung ? (
          <Info icon="time" farbe={colors.warning} text="Deine Lastschrift wird geprüft. Danach wird die Rechnung automatisch als bezahlt markiert." />
        ) : null}

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

        {offen && !perLastschrift && !inPruefung ? (
          <>
            {!online.data && schule.data?.zahlungslink ? (
              <View style={{ marginBottom: space(6) }}>
                <Button title="Online bezahlen" icon="open-outline" onPress={() => Linking.openURL(schule.data!.zahlungslink!)} />
              </View>
            ) : null}
            {schule.data?.iban ? (
              <Section
                title={online.data ? "Oder per Überweisung" : "Per Überweisung"}
                footer="Bitte immer die Rechnungsnummer als Verwendungszweck angeben."
              >
                <Zeile label="Empfänger" wert={schule.data.kontoinhaber ?? schule.data.name} />
                <Zeile label="IBAN" wert={schule.data.iban} />
                <Zeile label="Betrag" wert={formatEuro(r.betrag_brutto)} />
                <Zeile label="Verwendungszweck" wert={r.nummer} />
              </Section>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <ZahlungsErgebnis ergebnis={ergebnis} onClose={schliessen} />
    </Screen>
  );
}
