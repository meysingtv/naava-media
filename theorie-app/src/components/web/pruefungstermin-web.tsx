import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { Icon, type IconName } from "@/components/icon";
import { B, Kachel, Knopf, n, Raster, Spalte, UnterKopf, type Zustand } from "@/components/web/bunt";
import { WebSeite } from "@/components/web/rahmen";
import { uhrzeit } from "@/lib/format";
import { erfolg } from "@/lib/haptik";
import { pruefungstagErinnerungPlanen, tageText, terminDatum, terminText } from "@/lib/pruefungstag";
import { tagKey, useStand } from "@/lib/stand";

// Prüfungstermin am PC: links ein Monatskalender zum Anklicken, rechts die
// Uhrzeit (Stunde und Minute als Kacheln) und darunter der gewählte Termin mit
// „Speichern“. Gleiche Speicherung wie am Handy.

const TAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const STUNDEN = Array.from({ length: 12 }, (_, i) => i + 7);
const MINUTEN = Array.from({ length: 12 }, (_, i) => i * 5);

/** Vorschlag, wenn noch nichts eingetragen ist: in zwei Wochen um 10 Uhr. */
function vorschlag(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  d.setHours(10, 0, 0, 0);
  return d;
}

function Pfeil({ icon, label, onPress, aus }: { icon: IconName; label: string; onPress: () => void; aus?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={aus} accessibilityRole="button" accessibilityLabel={label} style={(z: Zustand) => ({ width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: B.linie, backgroundColor: z.hovered && !aus ? B.ton : B.flaeche, opacity: aus ? 0.35 : 1 })}>
      <Icon name={icon} size={18} color={B.text} />
    </Pressable>
  );
}

/** Kleine wählbare Kachel für Stunde oder Minute. */
function Zeitwahl({ text, aktiv, onPress }: { text: string; aktiv: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: aktiv }}
      style={(z: Zustand) => ({
        height: 38,
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: aktiv ? B.orange : z.hovered ? B.kante : B.linie,
        backgroundColor: aktiv ? B.orangeHell : B.flaeche,
      })}
    >
      <Text style={{ ...n.fett, fontSize: 14, color: aktiv ? B.orangeKante : B.text, fontVariant: ["tabular-nums"] }}>{text}</Text>
    </Pressable>
  );
}

export function PruefungsterminWeb() {
  const { stand, setzen } = useStand();
  const gespeichert = terminDatum(stand.pruefungstermin);
  const [wert, setWert] = useState<Date>(() => gespeichert ?? vorschlag());
  const [monat, setMonat] = useState(() => new Date(wert.getFullYear(), wert.getMonth(), 1));
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const inEinemJahr = new Date(heute);
  inEinemJahr.setFullYear(heute.getFullYear() + 1);
  const vergangen = wert.getTime() <= Date.now();
  const heuteKey = tagKey(heute);
  const gewaehlt = tagKey(wert);

  const jahr = monat.getFullYear();
  const m = monat.getMonth();
  const tageImMonat = new Date(jahr, m + 1, 0).getDate();
  const versatz = (new Date(jahr, m, 1).getDay() + 6) % 7;
  const felder: (Date | null)[] = [...Array.from({ length: versatz }, () => null), ...Array.from({ length: tageImMonat }, (_, i) => new Date(jahr, m, i + 1))];
  while (felder.length % 7) felder.push(null);
  const wochen = Array.from({ length: felder.length / 7 }, (_, w) => felder.slice(w * 7, w * 7 + 7));
  const ersterMonat = jahr === heute.getFullYear() && m === heute.getMonth();
  const letzterMonat = jahr === inEinemJahr.getFullYear() && m === inEinemJahr.getMonth();

  function datumSetzen(d: Date) {
    setWert((alt) => {
      const neu = new Date(alt);
      neu.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
      return neu;
    });
  }

  function zeitSetzen(stunde: number, minute: number) {
    setWert((alt) => {
      const neu = new Date(alt);
      neu.setHours(stunde, minute, 0, 0);
      return neu;
    });
  }

  function speichern() {
    const iso = wert.toISOString();
    setzen({ pruefungstermin: iso });
    erfolg();
    pruefungstagErinnerungPlanen(iso, true);
    router.back();
  }

  function entfernen() {
    setzen({ pruefungstermin: null });
    router.back();
  }

  return (
    <WebSeite ohneRechts>
      <Spalte>
        <UnterKopf titel="Prüfungstermin" unter="Wann ist deine Theorieprüfung?" />

        <View style={{ flexDirection: "row", gap: 24, alignItems: "flex-start" }}>
          {/* Datum */}
          <Kachel style={{ flex: 1, minWidth: 0, padding: 24, gap: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={{ flex: 1, ...n.schwarz, fontSize: 22, color: B.text }}>
                {MONATE[m]} {jahr}
              </Text>
              <Pfeil icon="chevron-back" label="Vorheriger Monat" onPress={() => setMonat(new Date(jahr, m - 1, 1))} aus={ersterMonat} />
              <Pfeil icon="chevron-forward" label="Nächster Monat" onPress={() => setMonat(new Date(jahr, m + 1, 1))} aus={letzterMonat} />
            </View>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {TAGE.map((t) => (
                  <Text key={t} style={{ flex: 1, textAlign: "center", ...n.fett, fontSize: 12.5, color: B.text3 }}>
                    {t}
                  </Text>
                ))}
              </View>
              {wochen.map((woche, w) => (
                <View key={w} style={{ flexDirection: "row", gap: 8 }}>
                  {woche.map((d, i) => {
                    if (!d) return <View key={i} style={{ flex: 1, minWidth: 0, height: 52 }} />;
                    const key = tagKey(d);
                    const moeglich = d >= heute && d <= inEinemJahr;
                    const aktiv = key === gewaehlt;
                    const istHeute = key === heuteKey;
                    return (
                      <Pressable
                        key={key}
                        disabled={!moeglich}
                        onPress={() => datumSetzen(d)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: aktiv, disabled: !moeglich }}
                        accessibilityLabel={`${d.getDate()}. ${MONATE[m]}`}
                        style={(z: Zustand) => ({
                          flex: 1,
                          minWidth: 0,
                          height: 52,
                          borderRadius: 14,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: aktiv ? B.orange : z.hovered && moeglich ? B.ton : "transparent",
                        })}
                      >
                        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 14, borderWidth: istHeute && !aktiv ? 2 : 0, borderColor: B.linie }} />
                        <Text style={{ ...(aktiv || istHeute ? n.schwarz : n.halb), fontSize: 16, color: aktiv ? "#FFFFFF" : moeglich ? B.text : B.text3, opacity: moeglich ? 1 : 0.5, fontVariant: ["tabular-nums"] }}>{d.getDate()}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </Kachel>

          {/* Uhrzeit und Termin */}
          <View style={{ width: 360, gap: 20 }}>
            <Kachel style={{ padding: 22, gap: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
                <Text style={{ ...n.schwarz, fontSize: 17, color: B.text }}>Uhrzeit</Text>
                <Text style={{ ...n.schwarz, fontSize: 17, color: B.orangeKante, fontVariant: ["tabular-nums"] }}>{uhrzeit(wert.getHours(), wert.getMinutes())} Uhr</Text>
              </View>
              <View style={{ gap: 8 }}>
                <Text style={{ ...n.fett, fontSize: 13, color: B.text3 }}>Stunde</Text>
                <Raster min={40} max={6} abstand={6}>
                  {STUNDEN.map((h) => (
                    <Zeitwahl key={h} text={String(h)} aktiv={wert.getHours() === h} onPress={() => zeitSetzen(h, wert.getMinutes())} />
                  ))}
                </Raster>
              </View>
              <View style={{ gap: 8 }}>
                <Text style={{ ...n.fett, fontSize: 13, color: B.text3 }}>Minute</Text>
                <Raster min={40} max={6} abstand={6}>
                  {MINUTEN.map((mi) => (
                    <Zeitwahl key={mi} text={String(mi).padStart(2, "0")} aktiv={Math.floor(wert.getMinutes() / 5) * 5 === mi} onPress={() => zeitSetzen(wert.getHours(), mi)} />
                  ))}
                </Raster>
              </View>
            </Kachel>

            <Kachel style={{ padding: 22, gap: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <Icon name={vergangen ? "alert-circle" : "flag"} size={26} color={vergangen ? B.rot : B.gruen} />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...n.fett, fontSize: 13.5, color: vergangen ? B.rotKante : B.text3 }}>{vergangen ? "Dieser Zeitpunkt ist schon vorbei" : `Prüfung ${tageText(wert)}`}</Text>
                  <Text style={{ ...n.schwarz, fontSize: 16.5, lineHeight: 22, color: B.text }}>{terminText(wert)}</Text>
                </View>
              </View>
              <Knopf titel="Termin speichern" icon="checkmark" groesse="gross" onPress={speichern} deaktiviert={vergangen} />
              {gespeichert ? <Knopf titel="Termin löschen" icon="trash-outline" art="rand" ton="rot" onPress={entfernen} /> : null}
              <Text style={{ ...n.halb, fontSize: 13, lineHeight: 18, color: B.text3 }}>Der Termin erscheint auf Home, bei der Prüfungssimulation und im Lernkalender.</Text>
            </Kachel>
          </View>
        </View>
      </Spalte>
    </WebSeite>
  );
}
