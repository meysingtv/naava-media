import { Text, View } from "react-native";
import { router } from "expo-router";

import { Icon, type IconName } from "@/components/icon";
import { Abschnitt, B, Balken, Chip, DickRing, Kachel, Knopf, n, Raster, SeitenTitel, Spalte, Symbol, THEMA_TON, TOENE } from "@/components/web/bunt";
import { WebSeite } from "@/components/web/rahmen";
import { datumKurz } from "@/lib/format";
import { THEMEN, fragenZuThema, themaVon } from "@/lib/fragen";
import { tageText, terminDatum, terminText } from "@/lib/pruefungstag";
import { fortschritt, useStand } from "@/lib/stand";

// Prüfung am PC: Prüfungsreife als großer Ring mit dem Start der Simulation,
// der Prüfungstag, die letzten Simulationen als Säulen (Linie bei 10 Punkten),
// was vorher noch zu üben ist und wie die Prüfung abläuft.

const REGELN: { icon: IconName; text: string }[] = [
  { icon: "layers", text: "Fragen aus allen Themen, gemischt" },
  { icon: "alert-circle", text: "Jede Frage zählt 2 bis 5 Fehlerpunkte" },
  { icon: "shield-checkmark", text: "Bestanden mit höchstens 10 Fehlerpunkten – außer bei zwei falschen 5-Punkte-Fragen" },
  { icon: "eye-off", text: "Die Auflösung siehst du erst nach dem Abgeben" },
  { icon: "time", text: "Nach 45 Minuten wird automatisch abgegeben" },
];

export function PruefenWeb() {
  const { stand } = useStand();
  const reife = fortschritt(stand);
  const pruefungen = stand.pruefungen;
  const bestanden = pruefungen.filter((p) => p.bestanden).length;
  const termin = terminDatum(stand.pruefungstermin);
  const wann = termin ? tageText(termin) : null;
  const starten = () => router.push({ pathname: "/pruefung", params: { direkt: "1" } });

  const baustellen = THEMEN.map((t) => {
    const liste = fragenZuThema(t.id);
    const p = fortschritt(stand, liste);
    return { id: t.id, anteil: p.anteil, offen: p.gesamt - p.richtig, begonnen: liste.some((q) => stand.fragen[q.id]) };
  })
    .filter((t) => t.begonnen && t.offen > 0)
    .sort((a, b) => a.anteil - b.anteil)
    .slice(0, 3);

  // Säulen: die letzten 12 Simulationen, die älteste links.
  const saeulen = pruefungen.slice(0, 12).reverse();
  const hoechst = Math.max(20, ...saeulen.map((p) => p.fehlerpunkte));

  return (
    <WebSeite ohneRechts>
      <Spalte>
      <SeitenTitel
        titel="Prüfung"
        unter={`Theorieprüfung · Klasse ${stand.klasse}`}
        rechts={<Chip icon="calendar" text={!termin || wann === "vorbei" ? "Termin eintragen" : `Prüfung ${wann}`} ton={TOENE.blau} onPress={() => router.push("/pruefungstermin")} />}
      />

      <Kachel style={{ padding: 28, flexDirection: "row", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
        <DickRing anteil={reife.anteil} groesse={140} dicke={12} ton={TOENE.blau}>
          <Text style={{ ...n.schwarz, fontSize: 32, color: B.text, fontVariant: ["tabular-nums"] }}>{Math.round(reife.anteil * 100)}%</Text>
          <Text style={{ ...n.fett, fontSize: 12.5, color: B.blauKante }}>bereit</Text>
        </DickRing>
        <View style={{ flex: 1, minWidth: 280, gap: 16 }}>
          <View>
            <Text style={{ ...n.schwarz, fontSize: 24, color: B.text }}>{reife.anteil >= 0.9 ? "Du bist prüfungsreif!" : "Bereit für den Ernstfall?"}</Text>
            <Text style={{ ...n.halb, fontSize: 15.5, color: B.text2, marginTop: 2 }}>
              {reife.richtig} von {reife.gesamt} Fragen sitzen sicher. {reife.anteil >= 0.9 ? "Jetzt eine Simulation zur Probe." : "Ab 90 % bist du prüfungsreif."}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
            <Chip icon="help-circle" text="30 Fragen" ton={TOENE.blau} />
            <Chip icon="time" text="45 Minuten" ton={TOENE.blau} />
            <Chip icon="alert-circle" text="max. 10 Fehlerpunkte" ton={TOENE.blau} />
          </View>
          <View style={{ flexDirection: "row" }}>
            <Knopf titel="Simulation starten" icon="play" ton="blau" groesse="gross" onPress={starten} style={{ minWidth: 280 }} />
          </View>
        </View>
      </Kachel>

      <View style={{ flexDirection: "row", gap: 20, flexWrap: "wrap" }}>
        <Kachel onPress={() => router.push("/pruefungstermin")} style={{ flex: 1, minWidth: 280, padding: 22, flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Symbol icon="calendar" ton={TOENE.lila} groesse={44} />
          <View style={{ flex: 1 }}>
            <Text style={{ ...n.schwarz, fontSize: 18, color: B.text }}>Dein Prüfungstag</Text>
            <Text style={{ ...n.halb, fontSize: 14.5, color: B.text2 }}>{termin && wann !== "vorbei" ? `${terminText(termin)} · ${wann}` : "Noch kein Termin – trag ihn ein für Countdown und Erinnerung."}</Text>
          </View>
          <Icon name="chevron-forward" size={22} color={B.text3} />
        </Kachel>
        <Kachel style={{ flex: 1, minWidth: 280, padding: 22, flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Symbol icon="ribbon" ton={TOENE.gelb} groesse={44} />
          <View style={{ flex: 1 }}>
            <Text style={{ ...n.schwarz, fontSize: 18, color: B.text }}>{pruefungen.length ? `${bestanden} von ${pruefungen.length} bestanden` : "Noch keine Simulation"}</Text>
            <Text style={{ ...n.halb, fontSize: 14.5, color: B.text2 }}>{pruefungen.length ? `Zuletzt ${pruefungen[0].fehlerpunkte} Fehlerpunkte am ${datumKurz(pruefungen[0].datum)}` : "Deine Ergebnisse erscheinen hier."}</Text>
          </View>
        </Kachel>
      </View>

      <View>
        <Abschnitt titel="Deine Simulationen" />
        <Kachel style={{ padding: 24 }}>
          {saeulen.length ? (
            <View style={{ gap: 10 }}>
              <View style={{ height: 200, flexDirection: "row", alignItems: "flex-end", gap: 12 }}>
                {/* Grenze: bis 10 Fehlerpunkte bestanden */}
                <View style={{ position: "absolute", left: 0, right: 0, bottom: (10 / hoechst) * 200, height: 0, borderTopWidth: 2, borderStyle: "dashed", borderTopColor: B.gruen }} />
                {saeulen.map((p, i) => (
                  <View key={i} style={{ flex: 1, maxWidth: 56, alignItems: "center", gap: 6 }}>
                    <Text style={{ ...n.schwarz, fontSize: 13, color: p.bestanden ? B.gruenKante : B.rotKante }}>{p.fehlerpunkte}</Text>
                    <View style={{ width: "100%", height: Math.max(8, (p.fehlerpunkte / hoechst) * 170), borderRadius: 10, backgroundColor: p.bestanden ? B.gruen : B.rot, borderBottomWidth: 4, borderBottomColor: p.bestanden ? B.gruenKante : B.rotKante }} />
                  </View>
                ))}
              </View>
              <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>Fehlerpunkte je Simulation · gestrichelt die Grenze von 10 Punkten</Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <Icon name="bar-chart" size={40} color={B.text3} />
              <Text style={{ flex: 1, ...n.halb, fontSize: 15, color: B.text2 }}>Mach deine erste Simulation – danach siehst du hier, wie sich deine Fehlerpunkte entwickeln.</Text>
            </View>
          )}
        </Kachel>
      </View>

      {baustellen.length ? (
        <View>
          <Abschnitt titel="Vorher noch üben" link="Alle Themen" onLink={() => router.navigate("/lernen")} />
          <Raster min={240}>
            {baustellen.map((t) => {
              const ton = THEMA_TON[t.id];
              const thema = themaVon(t.id);
              return (
                <Kachel key={t.id} onPress={() => router.push({ pathname: "/training", params: { modus: "thema", thema: t.id } })} style={{ padding: 18, gap: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <Symbol icon={thema.icon as IconName} ton={ton} groesse={44} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...n.schwarz, fontSize: 16, color: B.text }} numberOfLines={1}>
                        {thema.titel}
                      </Text>
                      <Text style={{ ...n.halb, fontSize: 13, color: B.text2 }}>{t.offen} Fragen offen</Text>
                    </View>
                  </View>
                  <Balken anteil={t.anteil} ton={ton} hoehe={14} />
                </Kachel>
              );
            })}
          </Raster>
        </View>
      ) : null}

      <View>
        <Abschnitt titel="So läuft es ab" />
        <Kachel>
          {REGELN.map((r, i) => (
            <View key={r.text} style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: i ? 1.5 : 0, borderTopColor: B.ton }}>
              <Icon name={r.icon} size={21} color={B.blau} />
              <Text style={{ flex: 1, ...n.halb, fontSize: 15, color: B.text }}>{r.text}</Text>
            </View>
          ))}
        </Kachel>
      </View>
      </Spalte>
    </WebSeite>
  );
}
