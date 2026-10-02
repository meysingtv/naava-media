import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { Badge, Button, IconKachel, Segmented, Ueberschrift } from "@/components/ui";
import { GradientKopf, KopfSeite } from "@/components/kopf";
import { useBezahlen, ZahlungsErgebnis } from "@/components/bezahlen";
import { ladeRechnungen, ladeSchueler, ladeSchule } from "@/lib/daten";
import { formatDatum, formatEuro, formatZeitpunkt } from "@/lib/format";
import { useTabZaehlerMelden } from "@/lib/tab-zaehler";
import { useLoader } from "@/lib/use-loader";
import { useRealtime } from "@/lib/use-realtime";
import { useTheme } from "@/lib/theme-context";
import { karte, radius, space } from "@/lib/theme";
import { ladeOnlineZahlung, ladeZahlungen, zahlartText, type Zahlungsvorgang } from "@/lib/zahlung";
import type { Rechnung, Schule } from "@/lib/types";

const RECHNUNG_STATUS: Record<Rechnung["status"], { label: string; tone: "warning" | "success" | "danger" }> = {
  offen: { label: "Offen", tone: "warning" },
  bezahlt: { label: "Bezahlt", tone: "success" },
  ueberfaellig: { label: "Überfällig", tone: "danger" },
};

type Ansicht = "offen" | "bezahlt";

function zahlartIcon(zahlart: string | null): keyof typeof Ionicons.glyphMap {
  if (zahlart === "apple_pay") return "logo-apple";
  if (zahlart === "google_pay") return "logo-google";
  if (zahlart === "paypal") return "logo-paypal";
  if (zahlart === "sepa_debit") return "business";
  return "card";
}

/** Überweisungsdaten und optionaler eigener Zahlungslink – wenn es (noch) kein Stripe gibt. */
function Ueberweisung({ schule, betrag }: { schule: Schule | null; betrag: number }) {
  const { colors } = useTheme();
  if (!schule?.iban && !schule?.zahlungslink) {
    return <Text style={{ fontSize: 14, color: colors.textMuted }}>Die Zahlungsinfos bekommst du von deiner Fahrschule.</Text>;
  }
  return (
    <View style={{ gap: space(3) }}>
      {schule.zahlungslink ? <Button title="Online bezahlen" icon="open-outline" onPress={() => Linking.openURL(schule.zahlungslink!)} /> : null}
      {schule.iban ? (
        <View style={{ backgroundColor: colors.cardAlt, borderRadius: radius.lg, padding: space(4), gap: space(1.5) }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.4 }}>PER ÜBERWEISUNG</Text>
          <Text selectable style={{ fontSize: 15, color: colors.text }}>
            {schule.kontoinhaber ?? schule.name}
          </Text>
          <Text selectable style={{ fontSize: 16, fontWeight: "700", color: colors.text, letterSpacing: 0.5 }}>
            {schule.iban}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textMuted }}>
            {formatEuro(betrag)} · Verwendungszweck: die Rechnungsnummer
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function BezahlenScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [ansicht, setAnsicht] = useState<Ansicht>("offen");

  const rechnungen = useLoader(ladeRechnungen, { cacheKey: "s-rechnungen" });
  const schueler = useLoader(ladeSchueler, { cacheKey: "s-schueler" });
  const schule = useLoader(ladeSchule, { cacheKey: "s-schule" });
  const online = useLoader(ladeOnlineZahlung, { cacheKey: "s-online-zahlung" });
  const zahlungen = useLoader(ladeZahlungen, { cacheKey: "s-zahlungen" });

  const { bezahle, laeuft, ergebnis, schliessen } = useBezahlen(() => Promise.all([rechnungen.refresh(), zahlungen.refresh()]));
  useRealtime("s-bezahlen-vorgang", "zahlungsvorgang", () => {
    rechnungen.refresh();
    zahlungen.refresh();
  });

  function neu() {
    return Promise.all([rechnungen.refresh(), schueler.refresh(), schule.refresh(), online.refresh(), zahlungen.refresh()]);
  }

  const liste = rechnungen.data ?? [];
  const offen = liste.filter((r) => r.status !== "bezahlt");
  const bezahlt = liste.filter((r) => r.status === "bezahlt");
  const summeOffen = offen.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);
  const perLastschrift = Boolean(schueler.data?.sepa_mandat_ref);
  const kannOnline = Boolean(online.data) && !perLastschrift;

  const vorgaenge: Zahlungsvorgang[] = zahlungen.data ?? [];
  const inPruefung = vorgaenge.filter((z) => z.status === "in_pruefung");
  const gesperrt = new Set(inPruefung.flatMap((z) => z.rechnung_ids));
  const bezahlbar = offen.filter((r) => !gesperrt.has(r.id));
  const summeBezahlbar = bezahlbar.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);
  const naechsteFaellig = offen
    .map((r) => r.faelligkeitsdatum)
    .filter((d): d is string => Boolean(d))
    .sort()[0];
  const zahlartZu = (id: string) => vorgaenge.find((z) => z.status === "bezahlt" && z.rechnung_ids.includes(id))?.zahlart ?? null;
  const verlauf = vorgaenge.filter((z) => z.status !== "in_pruefung");

  useTabZaehlerMelden("rechnungen", rechnungen.data && schueler.data ? (perLastschrift ? 0 : offen.length) : null);

  const angezeigt = ansicht === "offen" ? offen : bezahlt;

  return (
    <>
      <KopfSeite onRefresh={neu} kopf={<GradientKopf titel="Bezahlen" untertitel="Rechnungen und Zahlungen" unten={space(16)} />}>
        <View style={{ paddingHorizontal: space(4), marginTop: -space(11), gap: space(6) }}>
          {/* Offener Betrag + Bezahlen */}
          <View style={[karte(colors), { padding: space(5), gap: space(4) }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space(4) }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: colors.textMuted }}>Noch zu bezahlen</Text>
                <Text style={{ fontSize: 34, fontWeight: "800", color: summeOffen > 0 ? colors.text : colors.success, marginTop: 2 }}>
                  {formatEuro(summeOffen)}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
                  {offen.length === 0
                    ? rechnungen.loading
                      ? "Lädt …"
                      : "Alles bezahlt – danke!"
                    : `${offen.length === 1 ? "1 offene Rechnung" : `${offen.length} offene Rechnungen`}${
                        naechsteFaellig ? ` · fällig ab ${formatDatum(naechsteFaellig)}` : ""
                      }`}
                </Text>
              </View>
              <IconKachel
                name={summeOffen > 0 ? "wallet" : "checkmark-circle"}
                farbe={summeOffen > 0 ? colors.accent : colors.success}
                groesse={52}
              />
            </View>

            {summeOffen > 0 ? (
              perLastschrift ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: space(2.5), backgroundColor: colors.accentSoft, borderRadius: radius.lg, padding: space(3.5) }}>
                  <Ionicons name="repeat" size={18} color={colors.accent} />
                  <Text style={{ flex: 1, fontSize: 14, color: colors.text }}>Wird per SEPA-Lastschrift eingezogen – du musst nichts tun.</Text>
                </View>
              ) : kannOnline ? (
                bezahlbar.length > 0 ? (
                  <View style={{ gap: space(2.5) }}>
                    <Button
                      title={`${bezahlbar.length > 1 ? "Alles bezahlen" : "Jetzt bezahlen"} · ${formatEuro(summeBezahlbar)}`}
                      icon="lock-closed"
                      loading={laeuft === "alle"}
                      disabled={laeuft !== null && laeuft !== "alle"}
                      onPress={() => bezahle(bezahlbar.map((r) => r.id), "alle")}
                    />
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space(1.5) }}>
                      <Ionicons name="shield-checkmark" size={14} color={colors.success} />
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>Sicher über Stripe · Apple Pay, Karte, Lastschrift und mehr</Text>
                    </View>
                  </View>
                ) : null
              ) : (
                <Ueberweisung schule={schule.data} betrag={summeOffen} />
              )
            ) : null}
          </View>

          {/* Lastschrift in Prüfung */}
          {inPruefung.length > 0 ? (
            <View style={[karte(colors), { flexDirection: "row", alignItems: "center", gap: space(3.5), padding: space(4), backgroundColor: colors.warning + "14", shadowOpacity: 0 }]}>
              <IconKachel name="time" farbe={colors.warning} groesse={42} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: colors.text }}>Zahlung wird geprüft</Text>
                <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
                  {formatEuro(inPruefung.reduce((s, z) => s + Number(z.betrag), 0))} per Lastschrift · meist 2 bis 5 Werktage
                </Text>
              </View>
            </View>
          ) : null}

          {/* Rechnungen */}
          <View style={{ gap: space(3) }}>
            <Segmented<Ansicht>
              options={[
                { value: "offen", label: `Offen (${offen.length})` },
                { value: "bezahlt", label: `Bezahlt (${bezahlt.length})` },
              ]}
              value={ansicht}
              onChange={setAnsicht}
            />

            {angezeigt.length === 0 ? (
              <View style={[karte(colors), { padding: space(6), alignItems: "center", gap: space(3) }]}>
                <IconKachel
                  name={ansicht === "offen" ? "checkmark-done" : "receipt-outline"}
                  farbe={ansicht === "offen" ? colors.success : colors.accent}
                  groesse={52}
                />
                <Text style={{ fontSize: 15, color: colors.textMuted }}>
                  {rechnungen.loading ? "Lädt …" : ansicht === "offen" ? "Keine offenen Rechnungen." : "Noch keine bezahlten Rechnungen."}
                </Text>
              </View>
            ) : (
              angezeigt.map((r) => {
                const st = RECHNUNG_STATUS[r.status];
                const farbe = st.tone === "success" ? colors.success : st.tone === "danger" ? colors.danger : colors.warning;
                const zahlart = r.status === "bezahlt" ? zahlartZu(r.id) : null;
                const knopf = r.status !== "bezahlt" && kannOnline && !gesperrt.has(r.id);
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => router.push({ pathname: "/rechnung/[id]", params: { id: r.id } })}
                    style={({ pressed }) => [
                      karte(colors),
                      { flexDirection: "row", alignItems: "center", gap: space(3.5), padding: space(4), transform: [{ scale: pressed ? 0.98 : 1 }] },
                    ]}
                  >
                    <IconKachel name="receipt" farbe={farbe} groesse={44} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>{r.nummer}</Text>
                      <Text style={{ fontSize: 13, color: r.status === "ueberfaellig" ? colors.danger : colors.textMuted }} numberOfLines={1}>
                        {r.status === "bezahlt"
                          ? `${r.bezahlt_am ? `bezahlt am ${formatDatum(r.bezahlt_am)}` : `vom ${formatDatum(r.rechnungsdatum)}`}${zahlart ? ` · ${zahlartText(zahlart)}` : ""}`
                          : r.faelligkeitsdatum
                            ? `fällig am ${formatDatum(r.faelligkeitsdatum)}`
                            : `vom ${formatDatum(r.rechnungsdatum)}`}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>{formatEuro(r.betrag_brutto)}</Text>
                      {knopf ? (
                        <Pressable
                          onPress={() => bezahle([r.id])}
                          disabled={laeuft !== null}
                          hitSlop={8}
                          accessibilityLabel={`Rechnung ${r.nummer} bezahlen`}
                          style={({ pressed }) => ({
                            minWidth: 84,
                            alignItems: "center",
                            backgroundColor: colors.accent,
                            paddingHorizontal: space(3),
                            paddingVertical: 5,
                            borderRadius: radius.full,
                            opacity: laeuft !== null && laeuft !== r.id ? 0.45 : pressed ? 0.85 : 1,
                          })}
                        >
                          {laeuft === r.id ? (
                            <ActivityIndicator size="small" color={colors.onAccent} />
                          ) : (
                            <Text style={{ color: colors.onAccent, fontSize: 12, fontWeight: "800" }}>Bezahlen</Text>
                          )}
                        </Pressable>
                      ) : (
                        <Badge label={gesperrt.has(r.id) ? "In Prüfung" : st.label} tone={gesperrt.has(r.id) ? "warning" : st.tone} />
                      )}
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>

          {/* Verlauf der Online-Zahlungen */}
          {verlauf.length > 0 ? (
            <View>
              <Ueberschrift>Online-Zahlungen</Ueberschrift>
              <View style={[karte(colors), { overflow: "hidden" }]}>
                {verlauf.map((z, i) => {
                  const ok = z.status === "bezahlt";
                  return (
                    <View
                      key={z.id}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: space(3),
                        paddingHorizontal: space(4),
                        paddingVertical: space(3.5),
                        borderTopWidth: i > 0 ? StyleSheet.hairlineWidth : 0,
                        borderTopColor: colors.separator,
                      }}
                    >
                      <IconKachel name={zahlartIcon(z.zahlart)} farbe={ok ? colors.success : colors.danger} groesse={38} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>{ok ? zahlartText(z.zahlart) : "Zahlung fehlgeschlagen"}</Text>
                        <Text style={{ fontSize: 13, color: colors.textMuted }}>
                          {formatZeitpunkt(z.bezahlt_am ?? z.created_at)} · {z.rechnung_ids.length === 1 ? "1 Rechnung" : `${z.rechnung_ids.length} Rechnungen`}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: "800", color: ok ? colors.text : colors.textMuted }}>{formatEuro(z.betrag)}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      </KopfSeite>

      <ZahlungsErgebnis ergebnis={ergebnis} onClose={schliessen} />
    </>
  );
}
