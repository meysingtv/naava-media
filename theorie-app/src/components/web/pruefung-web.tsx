import { Pressable, ScrollView, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import { B, Chip, DickRing, Kachel, Knopf, n, TOENE, type Zustand } from "@/components/web/bunt";
import { antwortTaste, FrageFlaeche, KarteKnopf, ordnungVon, useTasten } from "@/components/web/frage-web";
import { dauer } from "@/lib/format";
import { frageVon, type Frage } from "@/lib/fragen";

// Prüfungssimulation am PC im Vollbild: links die Nummern aller Fragen zum
// Springen, oben die Uhr und „Abgeben“, in der Mitte die Frage. Nach dem
// Abgeben das Ergebnis mit der Auflösung aller falschen Fragen darunter.
// Tastatur: 1–6 bzw. A–F wählt, ← → blättert, Enter geht zur nächsten Frage.

type Antwort = { auswahl: number[]; eingabe: string };

export function PruefungLaeuftWeb({
  ids,
  index,
  antworten,
  beantwortet,
  rest,
  knapp,
  reihenfolge,
  onAntwort,
  onGehe,
  onAbgeben,
  onAbbrechen,
}: {
  ids: string[];
  index: number;
  antworten: Record<string, Antwort>;
  beantwortet: (i: number) => boolean;
  rest: number;
  knapp: boolean;
  reihenfolge: (f: Frage) => number[];
  onAntwort: (teil: Partial<Antwort>) => void;
  onGehe: (i: number) => void;
  onAbgeben: () => void;
  onAbbrechen: () => void;
}) {
  const frage = frageVon(ids[index]);
  const a = (frage && antworten[frage.id]) ?? { auswahl: [], eingabe: "" };
  const erledigt = ids.filter((_, i) => beantwortet(i)).length;

  useTasten((e) => {
    if (!frage) return;
    if (e.key === "Escape") return onAbbrechen();
    if (e.key === "ArrowLeft" && index > 0) return onGehe(index - 1);
    if (e.key === "ArrowRight" && index + 1 < ids.length) return onGehe(index + 1);
    if (e.key === "Enter") {
      // Aus dem Zahlenfeld kommt Enter über onEnter – nicht doppelt auslösen.
      if ((e.target as HTMLElement | null)?.tagName === "INPUT") return;
      e.preventDefault();
      return index + 1 < ids.length ? onGehe(index + 1) : onAbgeben();
    }
    antwortTaste(e, frage, ordnungVon(frage, reihenfolge(frage)), a.auswahl, (auswahl) => onAntwort({ auswahl }));
  });

  if (!frage) return null;

  return (
    <View style={{ flex: 1, backgroundColor: B.grund }}>
      {/* Kopf */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 18, paddingHorizontal: 28, height: 84, borderBottomWidth: 2, borderBottomColor: B.linie }}>
        <Pressable onPress={onAbbrechen} accessibilityLabel="Simulation abbrechen (Esc)" style={(z: Zustand) => ({ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: z.hovered ? B.ton : "transparent" })}>
          <Icon name="close" size={30} color={B.text3} />
        </Pressable>
        <Text style={{ ...n.schwarz, fontSize: 20, color: B.text }}>Prüfungssimulation</Text>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 44, paddingHorizontal: 16, borderRadius: 14, backgroundColor: knapp ? B.rotHell : B.ton }}>
          <Icon name="time" size={22} color={knapp ? B.rot : B.text2} />
          <Text style={{ ...n.schwarz, fontSize: 18, color: knapp ? B.rotKante : B.text, fontVariant: ["tabular-nums"] }}>{dauer(rest)}</Text>
        </View>
        <Knopf titel="Abgeben" icon="checkmark-done" ton="blau" onPress={onAbgeben} />
      </View>

      <View style={{ flex: 1, flexDirection: "row" }}>
        {/* Nummern */}
        <ScrollView style={{ width: 300, flexGrow: 0, borderRightWidth: 2, borderRightColor: B.linie }} contentContainerStyle={{ padding: 24, gap: 16 }}>
          <View>
            <Text style={{ ...n.schwarz, fontSize: 16, color: B.text }}>
              {erledigt} von {ids.length} beantwortet
            </Text>
            <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>Klick auf eine Nummer zum Springen</Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {ids.map((_, i) => {
              const ist = i === index;
              const fertig = beantwortet(i);
              const ton = ist ? TOENE.blau : fertig ? TOENE.gruen : null;
              return (
                <Pressable
                  key={i}
                  onPress={() => onGehe(i)}
                  accessibilityLabel={`Frage ${i + 1}${fertig ? ", beantwortet" : ""}`}
                  style={(z: Zustand) => ({
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderBottomWidth: 4,
                    borderColor: ton ? ton.farbe : B.linie,
                    borderBottomColor: ton ? ton.kante : B.kante,
                    backgroundColor: ist ? ton!.farbe : fertig ? TOENE.gruen.hell : z.hovered ? B.ton : B.flaeche,
                  })}
                >
                  <Text style={{ ...n.schwarz, fontSize: 14, color: ist ? "#FFFFFF" : fertig ? B.gruenKante : B.text3, fontVariant: ["tabular-nums"] }}>{i + 1}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={{ ...n.halb, fontSize: 13, lineHeight: 19, color: B.text3 }}>Tasten: 1–6 wählen · ← → blättern · Enter weiter</Text>
        </ScrollView>

        {/* Frage */}
        <View style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 40, paddingTop: 32, paddingBottom: 40 }}>
            <View style={{ width: "100%", maxWidth: 1100, alignSelf: "center" }}>
              <FrageFlaeche
                frage={frage}
                auswahl={a.auswahl}
                onAuswahl={(auswahl) => onAntwort({ auswahl })}
                eingabe={a.eingabe}
                onEingabe={(eingabe) => onAntwort({ eingabe })}
                aufgedeckt={false}
                reihenfolge={reihenfolge(frage)}
                etikett={`Frage ${index + 1} von ${ids.length}`}
                onEnter={() => (index + 1 < ids.length ? onGehe(index + 1) : onAbgeben())}
              />
            </View>
          </ScrollView>
          <View style={{ borderTopWidth: 2, borderTopColor: B.linie }}>
            <View style={{ width: "100%", maxWidth: 1180, alignSelf: "center", paddingHorizontal: 40, paddingVertical: 20, flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
              <Knopf titel="Zurück" icon="arrow-back" art="rand" ton="blau" groesse="gross" deaktiviert={index === 0} onPress={() => onGehe(index - 1)} />
              {index + 1 < ids.length ? (
                <Knopf titel="Nächste Frage" icon="arrow-forward" ton="blau" groesse="gross" onPress={() => onGehe(index + 1)} style={{ minWidth: 240 }} />
              ) : (
                <Knopf titel="Abgeben" icon="checkmark-done" ton="gruen" groesse="gross" onPress={onAbgeben} style={{ minWidth: 240 }} />
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export function PruefungErgebnisWeb({
  ids,
  antworten,
  ergebnis,
  zeit,
  xp,
  text,
  reihenfolge,
  onFertig,
  onNochmal,
}: {
  ids: string[];
  antworten: Record<string, Antwort>;
  ergebnis: { fehlerpunkte: number; bestanden: boolean; richtig: number; falsche: string[]; zeitAbgelaufen: boolean };
  zeit: string;
  xp?: number;
  text: string;
  reihenfolge: (f: Frage) => number[];
  onFertig: () => void;
  onNochmal: () => void;
}) {
  const ok = ergebnis.bestanden;
  const ton = ok ? TOENE.gruen : TOENE.rot;

  useTasten((e) => {
    if (e.key === "Escape") onFertig();
  });

  return (
    <View style={{ flex: 1, backgroundColor: B.grund }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 40, paddingTop: 48, paddingBottom: 48 }}>
        <View style={{ width: "100%", maxWidth: 1100, alignSelf: "center", gap: 36 }}>
          <View style={{ alignItems: "center", gap: 16 }}>
            <DickRing anteil={Math.min(1, ergebnis.fehlerpunkte / 10)} groesse={190} dicke={20} ton={ton}>
              <Text style={{ ...n.schwarz, fontSize: 52, color: B.text, fontVariant: ["tabular-nums"] }}>{ergebnis.fehlerpunkte}</Text>
              <Text style={{ ...n.fett, fontSize: 13, color: ton.kante }}>Fehlerpunkte</Text>
            </DickRing>
            <View style={{ paddingHorizontal: 22, paddingVertical: 8, borderRadius: 14, borderWidth: 3, borderColor: ton.farbe, transform: [{ rotate: "-3deg" }] }}>
              <Text style={{ ...n.schwarz, fontSize: 26, letterSpacing: 2, color: ton.farbe }}>{ok ? "BESTANDEN" : "NICHT BESTANDEN"}</Text>
            </View>
            <Text style={{ ...n.halb, fontSize: 17, lineHeight: 24, color: B.text2, textAlign: "center", maxWidth: 560 }}>{text}</Text>
            {ergebnis.zeitAbgelaufen ? <Chip icon="time" text="Zeit abgelaufen – offene Fragen zählen als falsch" ton={TOENE.rot} /> : null}
          </View>

          <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
            {[
              { icon: "checkmark-circle" as IconName, ton: TOENE.gruen, wert: `${ergebnis.richtig}/${ids.length}`, titel: "richtig" },
              { icon: "time" as IconName, ton: TOENE.blau, wert: zeit, titel: "Zeit" },
              ...(xp != null ? [{ icon: "flash" as IconName, ton: TOENE.gelb, wert: `+${xp}`, titel: "XP" }] : []),
            ].map((w) => (
              <Kachel key={w.titel} style={{ flex: 1, minWidth: 200, padding: 20, alignItems: "center", gap: 6, borderColor: w.ton.farbe, borderBottomColor: w.ton.kante }}>
                <Text style={{ ...n.fett, fontSize: 13, color: w.ton.kante }}>{w.titel}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Icon name={w.icon} size={28} color={w.ton.farbe} />
                  <Text style={{ ...n.schwarz, fontSize: 28, color: B.text, fontVariant: ["tabular-nums"] }}>{w.wert}</Text>
                </View>
              </Kachel>
            ))}
          </View>

          <View style={{ gap: 18 }}>
            <Text style={{ ...n.schwarz, fontSize: 24, color: B.text }}>{ergebnis.falsche.length ? `Auflösung · ${ergebnis.falsche.length} falsch` : "Alle Fragen richtig – besser geht es nicht!"}</Text>
            {ergebnis.falsche.map((id) => {
              const q = frageVon(id);
              if (!q) return null;
              const a = antworten[id] ?? { auswahl: [], eingabe: "" };
              return (
                <Kachel key={id} style={{ padding: 28, gap: 18 }}>
                  <FrageFlaeche frage={q} auswahl={a.auswahl} onAuswahl={() => {}} eingabe={a.eingabe} onEingabe={() => {}} aufgedeckt reihenfolge={reihenfolge(q)} etikett={`Frage ${ids.indexOf(id) + 1}`} />
                  <View style={{ padding: 16, borderRadius: 14, backgroundColor: B.gelbHell }}>
                    <Text style={{ ...n.halb, fontSize: 15, lineHeight: 22, color: B.text }}>
                      <Text style={{ ...n.schwarz, color: B.gelbKante }}>Merke dir: </Text>
                      {q.erklaerung}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row" }}>
                    <KarteKnopf frageId={id} />
                  </View>
                </Kachel>
              );
            })}
          </View>
        </View>
      </ScrollView>
      <View style={{ borderTopWidth: 2, borderTopColor: B.linie }}>
        <View style={{ width: "100%", maxWidth: 1100, alignSelf: "center", paddingHorizontal: 40, paddingVertical: 20, flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
          <Knopf titel="Neue Simulation" icon="refresh" art="rand" ton="blau" groesse="gross" onPress={onNochmal} />
          <Knopf titel="Fertig" icon="checkmark" ton={ok ? "gruen" : "blau"} groesse="gross" onPress={onFertig} style={{ minWidth: 200 }} />
        </View>
      </View>
    </View>
  );
}

export function PruefungStartWeb({ anzahl, onStart, onSchliessen }: { anzahl: number; onStart: () => void; onSchliessen: () => void }) {
  useTasten((e) => {
    if (e.key === "Enter") onStart();
    if (e.key === "Escape") onSchliessen();
  });
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: B.grund }}>
      <View style={{ maxWidth: 620, gap: 22, alignItems: "center" }}>
        <View style={{ width: 110, height: 110, borderRadius: 34, backgroundColor: B.blau, borderBottomWidth: 6, borderBottomColor: B.blauKante, alignItems: "center", justifyContent: "center" }}>
          <Icon name="shield-checkmark" size={58} color="#FFFFFF" />
        </View>
        <Text style={{ ...n.schwarz, fontSize: 38, color: B.text, textAlign: "center" }}>Wie in der echten Prüfung.</Text>
        <Text style={{ ...n.halb, fontSize: 17, lineHeight: 25, color: B.text2, textAlign: "center" }}>Ohne Hilfe, mit Uhr – die Auflösung gibt es erst am Ende. Bestanden mit höchstens 10 Fehlerpunkten, außer bei zwei falschen 5-Punkte-Fragen.</Text>
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <Chip icon="help-circle" text={`${anzahl} Fragen`} ton={TOENE.blau} />
          <Chip icon="time" text="45 Minuten" ton={TOENE.blau} />
          <Chip icon="alert-circle" text="max. 10 Fehlerpunkte" ton={TOENE.blau} />
        </View>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
          <Knopf titel="Zurück" art="rand" ton="blau" groesse="gross" onPress={onSchliessen} />
          <Knopf titel="Simulation starten" icon="play" ton="blau" groesse="gross" onPress={onStart} />
        </View>
      </View>
    </View>
  );
}
