import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { dialog } from "@/components/dialog";
import { Icon } from "@/components/icon";
import { LilaLeisteSeite } from "@/components/lila-leiste";
import { LilaAbschnitt, LilaBlatt, LilaFigurBlase, LilaGruppe, LilaKarte, LilaKnopf, LILA_RAND, LilaTitel, LilaZeile, LilaZurueck, lilaSchrift, useLila } from "@/components/lila-teile";
import { tippen } from "@/lib/haptik";
import {
  erledigtSetzen,
  euro,
  PREISE,
  preiseZuruecksetzen,
  preisSetzen,
  rechnen,
  SONDER_PFLICHT,
  stundenGeplantSetzen,
  useKosten,
  zahlungHinzufuegen,
  zahlungLoeschen,
  type Kosten,
  type PreisId,
} from "@/lib/kosten";
import { tageBis, terminDatum } from "@/lib/pruefungstag";
import { useStand } from "@/lib/stand";

// Führerschein-Kostenplaner: Gesamtkosten (eigene Preise oder Durchschnitt),
// Zahlungen, Fahrstunden und Sonderfahrten, Sparziel bis zur Prüfung.
// Alles bleibt auf dem Gerät.

/** Zahl eingeben: „1.240,50“ → 1240.5 */
function zahlLesen(t: string): number | null {
  const z = Number(t.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, ""));
  return isFinite(z) && t.trim() ? z : null;
}

function Zaehler({ wert, onWert, max = 150 }: { wert: number; onWert: (n: number) => void; max?: number }) {
  const l = useLila();
  const taste = (icon: "remove" | "add", aus: boolean, n: number) => (
    <Pressable
      onPress={() => {
        if (aus) return;
        tippen();
        onWert(n);
      }}
      accessibilityRole="button"
      accessibilityLabel={icon === "add" ? "Mehr" : "Weniger"}
      hitSlop={6}
      style={({ pressed }) => ({ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: aus ? l.spur : pressed ? "#D9C9FF" : l.lilaZart, opacity: aus ? 0.5 : 1 })}
    >
      <Icon name={icon} size={18} color="#6A3FE6" />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      {taste("remove", wert <= 0, wert - 1)}
      <Text style={{ ...lilaSchrift.textFett, fontSize: 17, color: l.tinte, minWidth: 26, textAlign: "center", fontVariant: ["tabular-nums"] }}>{wert}</Text>
      {taste("add", wert >= max, wert + 1)}
    </View>
  );
}

export default function KostenSeite() {
  const insets = useSafeAreaInsets();
  const l = useLila();
  const k = useKosten();
  const { stand } = useStand();
  const r = rechnen(k);
  const [preisOffen, setPreisOffen] = useState<PreisId | null>(null);
  const [eingabe, setEingabe] = useState("");
  const [zahlungOffen, setZahlungOffen] = useState(false);
  const [betrag, setBetrag] = useState("");
  const [notiz, setNotiz] = useState("");
  const anteil = r.gesamt > 0 ? Math.min(1, r.bezahlt / r.gesamt) : 0;

  const termin = terminDatum(stand.pruefungstermin);
  const tage = termin ? tageBis(termin) : null;
  const wochen = tage !== null && tage > 0 ? Math.max(1, Math.ceil(tage / 7)) : null;

  const preisBearbeiten = (id: PreisId) => {
    setEingabe(String(k.preise[id]).replace(".", ","));
    setPreisOffen(id);
  };
  const preisSichern = () => {
    const z = zahlLesen(eingabe);
    if (preisOffen && z !== null) preisSetzen(preisOffen, z);
    setPreisOffen(null);
  };
  const zahlungSichern = () => {
    const z = zahlLesen(betrag);
    if (z === null || z <= 0) return;
    zahlungHinzufuegen(z, notiz);
    setBetrag("");
    setNotiz("");
    setZahlungOffen(false);
  };

  const feld = (props: React.ComponentProps<typeof TextInput>) => (
    <TextInput
      placeholderTextColor={l.tinte3}
      selectionColor="#8A5FFF"
      {...props}
      style={{ height: 56, borderRadius: 16, paddingHorizontal: 16, backgroundColor: l.karte, borderWidth: 1.5, borderBottomWidth: 4, borderColor: l.linie, borderBottomColor: l.kante, ...lilaSchrift.textHalb, fontSize: 18, color: l.tinte }}
    />
  );

  const sonder: { id: keyof Kosten["erledigt"] & keyof typeof SONDER_PFLICHT; titel: string }[] = [
    { id: "ueberland", titel: "Überlandfahrten" },
    { id: "autobahn", titel: "Autobahnfahrten" },
    { id: "nacht", titel: "Nachtfahrten" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: l.grund }}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 24, paddingHorizontal: LILA_RAND, width: "100%", maxWidth: 560, alignSelf: "center", gap: 18 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View>
          <LilaZurueck />
          <LilaTitel style={{ marginTop: 14 }}>Kostenplaner</LilaTitel>
          <LilaFigurBlase figur="denken" text="Behalte deine Führerschein-Kosten im Blick!" style={{ marginTop: 4 }} />
        </View>

        {/* Überblick */}
        <LilaKarte>
          <View style={{ padding: 18, gap: 12 }}>
            <Text style={{ ...lilaSchrift.textHalb, fontSize: 14, color: l.tinte2 }}>Bisher bezahlt</Text>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: -6 }}>
              <Text style={{ ...lilaSchrift.titel, fontSize: 46, lineHeight: 50, color: l.tinte, fontVariant: ["tabular-nums"] }}>{euro(r.bezahlt)}</Text>
              <Text style={{ ...lilaSchrift.textMittel, fontSize: 15, color: l.tinte2, marginBottom: 8 }}>von ca. {euro(r.gesamt)}</Text>
            </View>
            <View style={{ height: 12, borderRadius: 6, backgroundColor: l.spur, overflow: "hidden" }}>
              <View style={{ width: `${anteil * 100}%`, height: "100%", borderRadius: 6, backgroundColor: "#8A5FFF" }} />
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {[
                { titel: "Fahrschule", wert: r.posten.fahrschule },
                { titel: "Prüfungen", wert: r.posten.pruefung },
                { titel: "Sonstiges", wert: r.posten.sonstiges },
              ].map((p) => (
                <View key={p.titel} style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12, backgroundColor: l.lilaFlaeche }}>
                  <Text style={{ ...lilaSchrift.textFett, fontSize: 15, color: l.tinte }}>{euro(p.wert)}</Text>
                  <Text style={{ ...lilaSchrift.textMittel, fontSize: 12, color: l.tinte2 }}>{p.titel}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
              <Text style={{ ...lilaSchrift.textHalb, fontSize: 15.5, color: l.tinte }}>Noch offen</Text>
              <Text style={{ ...lilaSchrift.titel, fontSize: 24, color: "#6A3FE6" }}>ca. {euro(r.offen)}</Text>
            </View>
            {!r.eigenePreise ? <Text style={{ ...lilaSchrift.text, fontSize: 12.5, lineHeight: 17, color: l.tinte3 }}>Geschätzt mit Durchschnittspreisen – trag unten die Preise deiner Fahrschule ein, dann wird es genau.</Text> : null}
          </View>
        </LilaKarte>

        {/* Sparziel */}
        {r.offen > 0 ? (
          <LilaKarte>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16 }}>
              <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: l.lilaZart, alignItems: "center", justifyContent: "center" }}>
                <Icon name="wallet-outline" size={24} color="#6A3FE6" />
              </View>
              <View style={{ flex: 1 }}>
                {wochen ? (
                  <>
                    <Text style={{ ...lilaSchrift.titel, fontSize: 22, color: l.tinte }}>ca. {euro(Math.ceil(r.offen / wochen))} pro Woche</Text>
                    <Text style={{ ...lilaSchrift.textMittel, fontSize: 13.5, color: l.tinte2 }}>
                      zurücklegen bis zur Prüfung in {wochen === 1 ? "1 Woche" : `${wochen} Wochen`}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={{ ...lilaSchrift.titel, fontSize: 22, color: l.tinte }}>ca. {euro(Math.ceil(r.offen / 12))} pro Woche</Text>
                    <Text style={{ ...lilaSchrift.textMittel, fontSize: 13.5, color: l.tinte2 }}>wenn du in 12 Wochen fertig sein willst. Trag deinen Prüfungstermin ein für ein genaues Sparziel.</Text>
                  </>
                )}
              </View>
            </View>
          </LilaKarte>
        ) : null}

        {/* Zahlungen */}
        <View>
          <LilaAbschnitt titel="Zahlungen" />
          <LilaKnopf titel="Zahlung eintragen" icon="add" onPress={() => setZahlungOffen(true)} />
          {k.zahlungen.length ? (
            <LilaGruppe style={{ marginTop: 12 }}>
              {k.zahlungen.map((z) => (
                <LilaZeile
                  key={z.id}
                  icon="checkmark-circle-outline"
                  titel={euro(z.betrag, z.betrag % 1 !== 0)}
                  unter={[new Date(z.datum).toLocaleDateString("de-DE"), z.notiz].filter(Boolean).join(" · ")}
                  rechts={
                    <Pressable
                      onPress={() =>
                        dialog("Zahlung löschen?", `${euro(z.betrag, z.betrag % 1 !== 0)} vom ${new Date(z.datum).toLocaleDateString("de-DE")}`, [
                          { text: "Abbrechen", style: "cancel" },
                          { text: "Löschen", style: "destructive", onPress: () => zahlungLoeschen(z.id) },
                        ])
                      }
                      hitSlop={8}
                      accessibilityLabel="Zahlung löschen"
                    >
                      <Icon name="trash-outline" size={19} color={l.tinte3} />
                    </Pressable>
                  }
                />
              ))}
            </LilaGruppe>
          ) : null}
        </View>

        {/* Fahrstunden */}
        <View>
          <LilaAbschnitt titel="Fahrstunden" />
          <LilaGruppe>
            <LilaZeile icon="car-outline" titel="Gefahren" unter="normale Übungsstunden" rechts={<Zaehler wert={k.erledigt.fahrstunden} onWert={(n) => erledigtSetzen("fahrstunden", n)} />} />
            <LilaZeile icon="flag-outline" titel="Geplant insgesamt" unter="Schnitt sind etwa 25–35" rechts={<Zaehler wert={k.stundenGeplant} onWert={stundenGeplantSetzen} />} />
            {sonder.map((s) => (
              <LilaZeile
                key={s.id}
                icon={k.erledigt[s.id] >= SONDER_PFLICHT[s.id] ? "checkmark-circle" : "time-outline"}
                titel={s.titel}
                unter={`${k.erledigt[s.id]} von ${SONDER_PFLICHT[s.id]} Pflicht`}
                rechts={<Zaehler wert={k.erledigt[s.id]} onWert={(n) => erledigtSetzen(s.id, n)} max={20} />}
              />
            ))}
          </LilaGruppe>
        </View>

        {/* Preise */}
        {(["fahrschule", "pruefung", "sonstiges"] as const).map((g) => (
          <View key={g}>
            <LilaAbschnitt titel={g === "fahrschule" ? "Preise deiner Fahrschule" : g === "pruefung" ? "Prüfungen" : "Sonstiges"} />
            <LilaGruppe>
              {PREISE.filter((p) => p.gruppe === g).map((p) => (
                <LilaZeile
                  key={p.id}
                  icon={k.eigen[p.id] ? "pricetag" : "pricetag-outline"}
                  titel={p.titel}
                  unter={k.eigen[p.id] ? p.unter : `${p.unter} · Durchschnitt`}
                  rechts={
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ ...lilaSchrift.textFett, fontSize: 16, color: k.eigen[p.id] ? l.tinte : l.tinte2 }}>{euro(k.preise[p.id])}</Text>
                      <Icon name="chevron-forward" size={16} color={l.tinte3} />
                    </View>
                  }
                  onPress={() => preisBearbeiten(p.id)}
                />
              ))}
            </LilaGruppe>
          </View>
        ))}

        {r.eigenePreise ? (
          <Pressable
            onPress={() =>
              dialog("Preise zurücksetzen?", "Alle Preise werden wieder auf Durchschnittswerte gestellt.", [
                { text: "Abbrechen", style: "cancel" },
                { text: "Zurücksetzen", style: "destructive", onPress: preiseZuruecksetzen },
              ])
            }
            style={{ alignSelf: "center", paddingVertical: 6 }}
            hitSlop={8}
          >
            <Text style={{ ...lilaSchrift.textHalb, fontSize: 14.5, color: "#6A3FE6" }}>Preise zurücksetzen</Text>
          </Pressable>
        ) : null}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center" }}>
          <Icon name="lock-closed-outline" size={14} color={l.tinte3} />
          <Text style={{ ...lilaSchrift.text, fontSize: 12.5, color: l.tinte3 }}>Deine Zahlen bleiben nur auf diesem Gerät.</Text>
        </View>
      </ScrollView>
      <LilaLeisteSeite aktiv="heute" />

      <LilaBlatt offen={preisOffen !== null} titel={PREISE.find((p) => p.id === preisOffen)?.titel ?? "Preis"} onSchliessen={() => setPreisOffen(null)}>
        <View style={{ gap: 12 }}>
          {feld({ value: eingabe, onChangeText: setEingabe, keyboardType: "decimal-pad", autoFocus: true, placeholder: "Betrag in €", onSubmitEditing: preisSichern, returnKeyType: "done" })}
          <LilaKnopf titel="Speichern" icon="checkmark" onPress={preisSichern} />
        </View>
      </LilaBlatt>

      <LilaBlatt offen={zahlungOffen} titel="Zahlung eintragen" onSchliessen={() => setZahlungOffen(false)}>
        <View style={{ gap: 12 }}>
          {feld({ value: betrag, onChangeText: setBetrag, keyboardType: "decimal-pad", autoFocus: true, placeholder: "Betrag in €, z. B. 250" })}
          {feld({ value: notiz, onChangeText: setNotiz, placeholder: "Wofür? z. B. Grundbetrag (optional)", maxLength: 60, returnKeyType: "done", onSubmitEditing: zahlungSichern })}
          <LilaKnopf titel="Eintragen" icon="checkmark" onPress={zahlungSichern} />
        </View>
      </LilaBlatt>
    </View>
  );
}
