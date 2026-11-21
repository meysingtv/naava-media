import { useRef } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import { KiBlase, type KiAnker } from "@/components/ki-hilfe";
import { B, Balken, DickRing, Kachel, Knopf, n, Symbol, TOENE, type Zustand } from "@/components/web/bunt";
import { antwortTaste, FrageFlaeche, KarteKnopf, mitPunkt, ordnungVon, statusText, useTasten } from "@/components/web/frage-web";
import { antwortRichtig, frageVon, zahlLesen, zahlText, type Frage } from "@/lib/fragen";

// Training am PC im Vollbild: oben Schließen, ein dicker Fortschrittsbalken und
// das Herz, in der Mitte die Frage (mit Bild links daneben), die Antworten als
// große Kacheln mit Tastenkürzel. Unten eine Leiste mit „Prüfen“ – nach dem
// Prüfen färbt sie sich grün oder rot und zeigt die Erklärung.
// Tastatur: 1–6 bzw. A–F wählt eine Antwort, Enter prüft und geht weiter,
// Esc schließt.

/** Knopf „KI-Hilfe“ – merkt sich seine Lage, damit die Blase darauf zeigt. */
function KiTaste({ onOeffnen, ton = "lila" }: { onOeffnen: (a: KiAnker) => void; ton?: "lila" | "gruen" | "rot" }) {
  const ref = useRef<View>(null);
  return (
    <View ref={ref} collapsable={false}>
      <Knopf titel="KI-Hilfe" icon="sparkles" art="rand" ton={ton} onPress={() => ref.current?.measureInWindow((x, y, breite, hoehe) => onOeffnen({ x, y, breite, hoehe, text: "KI-Hilfe" }))} />
    </View>
  );
}

export type TrainingWebProps = {
  frage: Frage;
  nummer: number;
  anzahl: number;
  ergebnisse: { id: string; richtig: boolean }[];
  auswahl: number[];
  onAuswahl: (a: number[]) => void;
  eingabe: string;
  onEingabe: (t: string) => void;
  aufgedeckt: boolean;
  reihenfolge: number[];
  xp?: number;
  gemerkt: boolean;
  letzte: boolean;
  erklaerbar: boolean;
  erklaerVideo: boolean;
  kiAnker: KiAnker | null;
  onKi: (a: KiAnker | null) => void;
  onPruefen: () => void;
  onWeiter: () => void;
  onSchliessen: () => void;
  onMerken: () => void;
  onErklaerung: () => void;
  onMelden: () => void;
};

export function TrainingWeb(p: TrainingWebProps) {
  const { frage, auswahl, aufgedeckt } = p;
  const richtig = antwortRichtig(frage, auswahl, p.eingabe);
  const kannPruefen = frage.art === "auswahl" ? auswahl.length > 0 : zahlLesen(p.eingabe) != null;
  const ordnung = ordnungVon(frage, p.reihenfolge);
  const fertig = p.ergebnisse.length;

  useTasten((e) => {
    if (p.kiAnker) return;
    if (e.key === "Escape") return p.onSchliessen();
    if (e.key === "Enter") {
      // Aus dem Zahlenfeld kommt Enter über onEnter – nicht doppelt auslösen.
      if ((e.target as HTMLElement | null)?.tagName === "INPUT") return;
      e.preventDefault();
      if (aufgedeckt) p.onWeiter();
      else if (kannPruefen) p.onPruefen();
      return;
    }
    if (!aufgedeckt) antwortTaste(e, frage, ordnung, auswahl, p.onAuswahl);
  });

  const fussTon = aufgedeckt ? (richtig ? TOENE.gruen : TOENE.rot) : null;

  return (
    <View style={{ flex: 1, backgroundColor: B.grund }}>
      {/* Kopf */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 20, paddingHorizontal: 32, height: 84, width: "100%", maxWidth: 1240, alignSelf: "center" }}>
        <Pressable onPress={p.onSchliessen} accessibilityLabel="Training beenden (Esc)" style={(z: Zustand) => ({ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: z.hovered ? B.ton : "transparent" })}>
          <Icon name="close" size={30} color={B.text3} />
        </Pressable>
        <Balken anteil={fertig / p.anzahl} ton={TOENE.gruen} hoehe={18} style={{ flex: 1 }} />
        <Text style={{ ...n.schwarz, fontSize: 16, color: B.text3, fontVariant: ["tabular-nums"] }}>
          {p.nummer} / {p.anzahl}
        </Text>
        <Pressable onPress={p.onMerken} accessibilityLabel={p.gemerkt ? "Aus den Favoriten entfernen" : "Zu den Favoriten"} style={(z: Zustand) => ({ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: z.hovered ? B.ton : "transparent" })}>
          <Icon name={p.gemerkt ? "heart" : "heart-outline"} size={28} color={p.gemerkt ? TOENE.pink.farbe : B.text3} />
        </Pressable>
      </View>

      {/* Frage */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 12, paddingBottom: 40 }}>
        <View style={{ width: "100%", maxWidth: 1240, alignSelf: "center", gap: 26 }}>
          <FrageFlaeche frage={frage} auswahl={auswahl} onAuswahl={p.onAuswahl} eingabe={p.eingabe} onEingabe={p.onEingabe} aufgedeckt={aufgedeckt} reihenfolge={p.reihenfolge} xp={p.xp} onEnter={() => (aufgedeckt ? p.onWeiter() : kannPruefen ? p.onPruefen() : undefined)} />
        </View>
      </ScrollView>

      {/* Leiste unten */}
      <View style={{ borderTopWidth: 2, borderTopColor: fussTon ? fussTon.hell : B.linie, backgroundColor: fussTon ? fussTon.hell : B.flaeche }}>
        <View style={{ width: "100%", maxWidth: 1240, alignSelf: "center", paddingHorizontal: 32, paddingVertical: 22, flexDirection: "row", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          {aufgedeckt && fussTon ? (
            <View style={{ flex: 1, minWidth: 320, flexDirection: "row", alignItems: "flex-start", gap: 18 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: B.flaeche, alignItems: "center", justifyContent: "center" }}>
                <Icon name={richtig ? "checkmark" : "close"} size={40} color={fussTon.farbe} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ ...n.schwarz, fontSize: 24, color: fussTon.kante }}>{richtig ? "Richtig!" : "Leider falsch"}</Text>
                <Text style={{ ...n.fett, fontSize: 15, color: fussTon.kante }}>{statusText(frage, auswahl, richtig)}</Text>
                <Text style={{ ...n.halb, fontSize: 15, lineHeight: 22, color: B.text, marginTop: 4 }}>
                  <Text style={{ ...n.schwarz, color: fussTon.kante }}>Merke dir: </Text>
                  {frage.erklaerung}
                </Text>
              </View>
            </View>
          ) : (
            <View style={{ flex: 1, minWidth: 320, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <KiTaste onOeffnen={p.onKi} />
              {p.erklaerbar ? <Knopf titel={p.erklaerVideo ? "Video" : "Erklärung"} icon={p.erklaerVideo ? "play-circle" : "bulb"} art="rand" ton="lila" onPress={p.onErklaerung} /> : null}
              <Knopf titel="Melden" icon="flag" art="rand" ton="rot" groesse="mittel" onPress={p.onMelden} />
            </View>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {aufgedeckt ? (
              <>
                <KiTaste onOeffnen={p.onKi} ton={richtig ? "gruen" : "rot"} />
                <KarteKnopf frageId={frage.id} ton={richtig ? "gruen" : "rot"} />
                {p.erklaerbar ? <Knopf titel={p.erklaerVideo ? "Video" : "Erklärung"} icon={p.erklaerVideo ? "play-circle" : "bulb"} art="rand" ton={richtig ? "gruen" : "rot"} onPress={p.onErklaerung} /> : null}
                <Knopf titel={p.letzte ? "Auswertung" : "Weiter"} icon="arrow-forward" ton={richtig ? "gruen" : "rot"} groesse="gross" onPress={p.onWeiter} style={{ minWidth: 200 }} />
              </>
            ) : (
              <Knopf titel="Prüfen" ton="gruen" groesse="gross" deaktiviert={!kannPruefen} onPress={p.onPruefen} style={{ minWidth: 200 }} />
            )}
          </View>
        </View>
      </View>

      <KiBlase key={frage.id} kontext={{ frage, auswahl: aufgedeckt ? auswahl : undefined, eingabe: aufgedeckt ? p.eingabe : undefined }} anker={p.kiAnker} onSchliessen={() => p.onKi(null)} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Auswertung und leerer Zustand
// ---------------------------------------------------------------------------

export function TrainingErgebnisWeb({
  ergebnisse,
  xp,
  zeit,
  serie,
  heute,
  ziel,
  zielJetzt,
  onFertig,
  onFehler,
}: {
  ergebnisse: { id: string; richtig: boolean }[];
  xp?: number;
  zeit: string;
  serie: number;
  heute: number;
  ziel: number;
  zielJetzt: boolean;
  onFertig: () => void;
  onFehler: () => void;
}) {
  const richtig = ergebnisse.filter((e) => e.richtig).length;
  const quote = ergebnisse.length ? richtig / ergebnisse.length : 0;
  const falsche = ergebnisse.filter((e) => !e.richtig);
  const ton = quote >= 0.8 ? TOENE.gruen : quote >= 0.5 ? TOENE.orange : TOENE.rot;
  const ueberschrift = quote >= 0.9 ? "Stark gefahren!" : quote >= 0.6 ? "Gute Runde!" : "Dranbleiben lohnt sich!";

  useTasten((e) => {
    if (e.key === "Enter" || e.key === "Escape") onFertig();
  });

  return (
    <View style={{ flex: 1, backgroundColor: B.grund }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 48, paddingBottom: 40 }}>
        <View style={{ width: "100%", maxWidth: 960, alignSelf: "center", gap: 32 }}>
          <View style={{ alignItems: "center", gap: 18 }}>
            <DickRing anteil={quote} groesse={180} dicke={20} ton={ton}>
              <Text style={{ ...n.schwarz, fontSize: 44, color: B.text, fontVariant: ["tabular-nums"] }}>{Math.round(quote * 100)}%</Text>
            </DickRing>
            <Text style={{ ...n.schwarz, fontSize: 38, color: B.text }}>{ueberschrift}</Text>
            <Text style={{ ...n.halb, fontSize: 17, color: B.text2 }}>
              {richtig} von {ergebnisse.length} richtig{zielJetzt ? " · Tagesziel geschafft!" : ""}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
            {[
              xp != null ? { icon: "flash" as IconName, ton: TOENE.gelb, wert: `+${xp}`, titel: "XP" } : { icon: "time" as IconName, ton: TOENE.blau, wert: zeit, titel: "Zeit" },
              { icon: "flame" as IconName, ton: TOENE.orange, wert: String(serie), titel: serie === 1 ? "Tag Serie" : "Tage Serie" },
              { icon: "flag" as IconName, ton: heute >= ziel ? TOENE.gruen : TOENE.koralle, wert: `${Math.min(heute, 999)}/${ziel}`, titel: "heute" },
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

          <View style={{ gap: 14 }}>
            <Text style={{ ...n.schwarz, fontSize: 22, color: B.text }}>{falsche.length ? `Nochmal ansehen · ${falsche.length} ${falsche.length === 1 ? "Fehler" : "Fehler"}` : "Fehlerfrei!"}</Text>
            {falsche.length ? (
              falsche.map((e) => {
                const fr = frageVon(e.id);
                if (!fr) return null;
                const richtige = fr.art === "auswahl" ? fr.antworten.filter((a) => a.richtig).map((a) => mitPunkt(a.text)) : [`${zahlText(fr.loesung)} ${fr.einheit}`];
                return (
                  <Kachel key={e.id} style={{ padding: 20, gap: 10 }}>
                    <Text style={{ ...n.schwarz, fontSize: 17, lineHeight: 23, color: B.text }}>{fr.text}</Text>
                    <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                      <Icon name="checkmark-circle" size={22} color={B.gruen} />
                      <Text style={{ flex: 1, ...n.fett, fontSize: 15, lineHeight: 21, color: B.gruenKante }}>{richtige.join(" · ")}</Text>
                    </View>
                    <Text style={{ ...n.halb, fontSize: 14.5, lineHeight: 21, color: B.text2 }}>{fr.erklaerung}</Text>
                  </Kachel>
                );
              })
            ) : (
              <Kachel style={{ padding: 22, flexDirection: "row", alignItems: "center", gap: 16, borderColor: B.gruen, borderBottomColor: B.gruenKante, backgroundColor: B.gruenHell }}>
                <Icon name="trophy" size={40} color={B.gelb} />
                <Text style={{ flex: 1, ...n.fett, fontSize: 16, color: B.gruenKante }}>Keine einzige Frage falsch – genau so darf es in der Prüfung laufen.</Text>
              </Kachel>
            )}
          </View>
        </View>
      </ScrollView>
      <View style={{ borderTopWidth: 2, borderTopColor: B.linie }}>
        <View style={{ width: "100%", maxWidth: 960, alignSelf: "center", paddingHorizontal: 32, paddingVertical: 22, flexDirection: "row", justifyContent: "flex-end", gap: 12 }}>
          {falsche.length ? <Knopf titel="Fehler üben" icon="refresh" art="rand" ton="rot" groesse="gross" onPress={onFehler} /> : null}
          <Knopf titel="Fertig" icon="checkmark" ton="gruen" groesse="gross" onPress={onFertig} style={{ minWidth: 200 }} />
        </View>
      </View>
    </View>
  );
}

export function TrainingLeerWeb({ titel, text, onZurueck, icon }: { titel: string; text: string; onZurueck: () => void; icon: IconName }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: B.grund }}>
      <View style={{ maxWidth: 460, alignItems: "center", gap: 16 }}>
        <Symbol icon={icon} ton={TOENE.gruen} groesse={96} />
        <Text style={{ ...n.schwarz, fontSize: 32, color: B.text, textAlign: "center" }}>{titel}</Text>
        <Text style={{ ...n.halb, fontSize: 16.5, lineHeight: 24, color: B.text2, textAlign: "center" }}>{text}</Text>
        <Knopf titel="Zurück" ton="gruen" groesse="gross" onPress={onZurueck} style={{ minWidth: 220, marginTop: 8 }} />
      </View>
    </View>
  );
}
