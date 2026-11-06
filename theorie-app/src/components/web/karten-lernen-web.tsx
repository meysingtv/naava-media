import { Fragment } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import { B, Balken, Chip, DickRing, Kachel, Knopf, n, Symbol, TOENE, type Ton, type Zustand } from "@/components/web/bunt";
import { useTasten } from "@/components/web/frage-web";
import { KarteWeb, TastenKappe } from "@/components/web/karteikarten-web";
import type { KartenInhalt } from "@/lib/karteikarten";
import { KARTEN_ABSTAENDE } from "@/lib/stand";

// Karteikarten lernen am PC im Vollbild: oben Schließen, Fortschritt und der
// Stapel, in der Mitte groß die Karte, unten die Bewertung. Tastatur:
// Leertaste dreht um, 1 = gewusst, 2 = nochmal, Esc schließt.

const BREITE = 860;

export type KartenLernenWebProps = {
  inhalt: KartenInhalt;
  fach: number | null;
  nummer: number;
  anzahl: number;
  titel: string;
  umgedreht: boolean;
  gesehen: boolean;
  xp: number;
  /** Unter den Knöpfen: wann die Karte wiederkommt. */
  textNochmal: string;
  textGewusst: string;
  onUmdrehen: () => void;
  onBewerten: (gewusst: boolean) => void;
  onSchliessen: () => void;
};

function Hinweise({ eintraege }: { eintraege: [string, string][] }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18, flexWrap: "wrap" }}>
      {eintraege.map(([taste, text]) => (
        <View key={taste} style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <TastenKappe text={taste} />
          <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>{text}</Text>
        </View>
      ))}
    </View>
  );
}

export function KartenLernenWeb(p: KartenLernenWebProps) {
  useTasten((e) => {
    if (e.key === "Escape") return p.onSchliessen();
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (e.key === "Enter" && p.gesehen) return;
      return p.onUmdrehen();
    }
    if (!p.gesehen) return;
    if (e.key === "1") p.onBewerten(true);
    else if (e.key === "2") p.onBewerten(false);
  });

  return (
    <View style={{ flex: 1, backgroundColor: B.grund }}>
      {/* Kopf */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 20, paddingHorizontal: 32, height: 84, width: "100%", maxWidth: 1240, alignSelf: "center" }}>
        <Pressable onPress={p.onSchliessen} accessibilityLabel="Lernen beenden (Esc)" style={(z: Zustand) => ({ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: z.hovered ? B.ton : "transparent" })}>
          <Icon name="close" size={30} color={B.text3} />
        </Pressable>
        <Balken anteil={(p.nummer - 1) / p.anzahl} ton={TOENE.tuerkis} hoehe={18} style={{ flex: 1 }} />
        <Text style={{ ...n.schwarz, fontSize: 16, color: B.text3, fontVariant: ["tabular-nums"] }}>
          {p.nummer} / {p.anzahl}
        </Text>
        {p.xp > 0 ? <Chip icon="flash" text={`+${p.xp} XP`} ton={TOENE.gelb} /> : null}
        <Chip icon="albums" text={p.titel} ton={TOENE.tuerkis} />
      </View>

      {/* Karte */}
      <View style={{ flex: 1, paddingHorizontal: 32, paddingTop: 8, paddingBottom: 24, alignItems: "center", justifyContent: "center" }}>
        <KarteWeb key={p.inhalt.id + p.nummer} inhalt={p.inhalt} umgedreht={p.umgedreht} onDruck={p.onUmdrehen} fach={p.fach} gross hinweis="Klicken oder Leertaste zum Umdrehen" style={{ width: "100%", maxWidth: BREITE, flex: 1, maxHeight: 600 }} />
      </View>

      {/* Leiste unten */}
      <View style={{ borderTopWidth: 2, borderTopColor: B.linie }}>
        <View style={{ width: "100%", maxWidth: BREITE + 64, alignSelf: "center", paddingHorizontal: 32, paddingTop: 20, paddingBottom: 18, gap: 16, minHeight: 150, justifyContent: "center" }}>
          {p.gesehen ? (
            <View style={{ flexDirection: "row", gap: 16 }}>
              <View style={{ flex: 1, gap: 8 }}>
                <Knopf titel="Gewusst" icon="checkmark" ton="gruen" groesse="gross" onPress={() => p.onBewerten(true)} />
                <Text style={{ ...n.halb, fontSize: 13.5, color: B.text3, textAlign: "center" }}>{p.textGewusst}</Text>
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <Knopf titel="Nochmal" icon="refresh" art="rand" ton="rot" groesse="gross" onPress={() => p.onBewerten(false)} />
                <Text style={{ ...n.halb, fontSize: 13.5, color: B.text3, textAlign: "center" }}>{p.textNochmal}</Text>
              </View>
            </View>
          ) : (
            <Knopf titel="Antwort zeigen" icon="sync" ton="tuerkis" groesse="gross" onPress={p.onUmdrehen} style={{ alignSelf: "center", minWidth: 320 }} />
          )}
          <Hinweise
            eintraege={
              p.gesehen
                ? [
                    ["1", "gewusst"],
                    ["2", "nochmal"],
                    ["Leertaste", "umdrehen"],
                    ["Esc", "beenden"],
                  ]
                : [
                    ["Leertaste", "Antwort zeigen"],
                    ["Esc", "beenden"],
                  ]
            }
          />
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Auswertung und leerer Zustand
// ---------------------------------------------------------------------------

export function KartenErgebnisWeb({
  gewusst,
  nochmal,
  xp,
  rest,
  onFertig,
  onWeiter,
}: {
  gewusst: number;
  nochmal: number;
  /** undefined = XP ausgeblendet (Belohnungen aus). */
  xp?: number;
  rest: number;
  onFertig: () => void;
  onWeiter?: () => void;
}) {
  const gesamt = gewusst + nochmal;
  const quote = gesamt ? gewusst / gesamt : 0;
  const ton = quote >= 0.8 ? TOENE.gruen : quote >= 0.5 ? TOENE.orange : TOENE.rot;
  const ueberschrift = quote >= 0.9 ? "Sitzt richtig gut." : quote >= 0.6 ? "Gute Runde." : "Dranbleiben lohnt sich.";

  useTasten((e) => {
    if (e.key === "Escape") onFertig();
    else if (e.key === "Enter") (onWeiter ?? onFertig)();
  });

  const werte: { icon: IconName; ton: Ton; wert: string; titel: string }[] = [
    { icon: "checkmark-circle", ton: TOENE.gruen, wert: String(gewusst), titel: "gewusst" },
    { icon: "refresh", ton: TOENE.rot, wert: String(nochmal), titel: "nochmal" },
    xp ? { icon: "flash", ton: TOENE.gelb, wert: `+${xp}`, titel: "XP" } : { icon: "albums", ton: TOENE.tuerkis, wert: String(rest), titel: "noch dran" },
  ];
  const stufen = KARTEN_ABSTAENDE.slice(1);

  return (
    <View style={{ flex: 1, backgroundColor: B.grund }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 56, paddingBottom: 40 }}>
        <View style={{ width: "100%", maxWidth: 960, alignSelf: "center", gap: 36 }}>
          <View style={{ alignItems: "center", gap: 18 }}>
            <DickRing anteil={quote} groesse={180} dicke={20} ton={ton}>
              <Text style={{ ...n.schwarz, fontSize: 44, color: B.text, fontVariant: ["tabular-nums"] }}>{Math.round(quote * 100)}%</Text>
            </DickRing>
            <Text style={{ ...n.schwarz, fontSize: 38, color: B.text }}>{ueberschrift}</Text>
            <Text style={{ ...n.halb, fontSize: 17, color: B.text2 }}>
              {gewusst} von {gesamt} {gesamt === 1 ? "Karte" : "Karten"} gewusst
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
            {werte.map((w) => (
              <Kachel key={w.titel} style={{ flex: 1, minWidth: 200, padding: 20, alignItems: "center", gap: 6 }}>
                <Text style={{ ...n.fett, fontSize: 13.5, color: B.text3 }}>{w.titel}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Icon name={w.icon} size={28} color={w.ton.farbe} />
                  <Text style={{ ...n.schwarz, fontSize: 28, color: B.text, fontVariant: ["tabular-nums"] }}>{w.wert}</Text>
                </View>
              </Kachel>
            ))}
          </View>

          <Kachel style={{ padding: 24, gap: 18 }}>
            <View style={{ gap: 4 }}>
              <Text style={{ ...n.schwarz, fontSize: 18, color: B.text }}>So geht es weiter</Text>
              <Text style={{ ...n.halb, fontSize: 15, lineHeight: 22, color: B.text2 }}>Gewusste Karten machen Pause und rücken ein Fach weiter. Was du nicht wusstest, kommt heute noch einmal dran.</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {stufen.map((t, i) => (
                <Fragment key={t}>
                  {i > 0 ? <Icon name="chevron-forward" size={16} color={B.text3} /> : null}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 36, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: B.linie }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i + 1 >= 3 ? B.gruen : B.orange }} />
                    <Text style={{ ...n.fett, fontSize: 13.5, color: B.text }}>Fach {i + 1}</Text>
                    <Text style={{ ...n.halb, fontSize: 13.5, color: B.text3 }}>{t === 1 ? "1 Tag" : `${t} Tage`}</Text>
                  </View>
                </Fragment>
              ))}
            </View>
          </Kachel>
        </View>
      </ScrollView>
      <View style={{ borderTopWidth: 2, borderTopColor: B.linie }}>
        <View style={{ width: "100%", maxWidth: 960, alignSelf: "center", paddingHorizontal: 32, paddingVertical: 22, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
          {onWeiter ? (
            <>
              <Text style={{ flex: 1, ...n.halb, fontSize: 14.5, color: B.text2 }}>
                Noch {rest} {rest === 1 ? "Karte" : "Karten"} dran
              </Text>
              <Knopf titel="Fertig" art="rand" groesse="gross" ton="tuerkis" onPress={onFertig} style={{ minWidth: 160 }} />
              <Knopf titel="Weiter lernen" icon="arrow-forward" ton="tuerkis" groesse="gross" onPress={onWeiter} style={{ minWidth: 220 }} />
            </>
          ) : (
            <Knopf titel="Fertig" icon="checkmark" ton="gruen" groesse="gross" onPress={onFertig} style={{ minWidth: 220 }} />
          )}
        </View>
      </View>
    </View>
  );
}

export function KartenLeerWeb({ icon, titel, text, aktion, onZurueck }: { icon: IconName; titel: string; text: string; aktion?: { titel: string; icon: IconName; onPress: () => void }; onZurueck: () => void }) {
  useTasten((e) => {
    if (e.key === "Escape") onZurueck();
    else if (e.key === "Enter") (aktion?.onPress ?? onZurueck)();
  });
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, backgroundColor: B.grund }}>
      <View style={{ maxWidth: 480, alignItems: "center", gap: 16 }}>
        <Symbol icon={icon} ton={TOENE.tuerkis} groesse={96} />
        <Text style={{ ...n.schwarz, fontSize: 32, color: B.text, textAlign: "center" }}>{titel}</Text>
        <Text style={{ ...n.halb, fontSize: 16.5, lineHeight: 24, color: B.text2, textAlign: "center" }}>{text}</Text>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
          <Knopf titel="Zurück" art={aktion ? "rand" : "voll"} ton="tuerkis" groesse="gross" onPress={onZurueck} style={{ minWidth: 160 }} />
          {aktion ? <Knopf titel={aktion.titel} icon={aktion.icon} ton="tuerkis" groesse="gross" onPress={aktion.onPress} style={{ minWidth: 220 }} /> : null}
        </View>
      </View>
    </View>
  );
}
