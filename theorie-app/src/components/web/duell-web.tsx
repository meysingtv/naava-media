import { useEffect, useState, type ReactNode } from "react";
import { Animated, Pressable, ScrollView, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";

import { Icon, type IconName } from "@/components/icon";
import { Lader } from "@/components/lader";
import { B, Chip, Kachel, Knopf, n, Symbol, TOENE, type TonName, type Ton, type Zustand } from "@/components/web/bunt";
import { antwortTaste, FrageFlaeche, ordnungVon, useTasten } from "@/components/web/frage-web";
import { frageVon, type Frage } from "@/lib/fragen";
import { erfolg } from "@/lib/haptik";

// Duelle am PC im Vollbild (gegen einen Übungsgegner und online): eine ruhige
// Bühne vor dem Start, in der Runde oben die Anzeigetafel mit Zeitbalken, in
// der Mitte die Frage mit großen Antwortkacheln, unten die Leiste zum Abgeben.
// Tastatur: 1–6 bzw. A–F wählt, Enter gibt ab, Esc verlässt das Duell.

const BREITE = 1240;
const GRAU: Ton = { farbe: "#8A8F96", kante: "#6E737A", hell: "#F0F1F2" };

export type DuellSpieler = { name: string; bild: ReactNode; unter?: string };

/** Ergebnis einer Runde (für die Punkte oben und die Auswertung). */
export type RundenErgebnis = { frage: string; ich: boolean; gegner?: boolean | null };

function SchliessenTaste({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={`${label} (Esc)`} style={(z: Zustand) => ({ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: z.hovered ? B.ton : "transparent" })}>
      <Icon name="close" size={30} color={B.text3} />
    </Pressable>
  );
}

/** Kleiner Hinweis auf eine Taste („Enter“). */
function TastenHinweis({ taste, text }: { taste: string; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={{ height: 26, paddingHorizontal: 8, borderRadius: 7, borderWidth: 1.5, borderBottomWidth: 3, borderColor: B.linie, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ ...n.fett, fontSize: 12, color: B.text2 }}>{taste}</Text>
      </View>
      <Text style={{ ...n.halb, fontSize: 14, color: B.text3 }}>{text}</Text>
    </View>
  );
}

/** Punkte je Runde: grün richtig, rot falsch, grau offen, die aktuelle Runde umrandet. */
function RundenPunkte({ anzahl, aktuell, ergebnisse }: { anzahl: number; aktuell: number; ergebnisse: (boolean | null)[] }) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {Array.from({ length: anzahl }, (_, i) => {
        const e = ergebnisse[i];
        const farbe = e === true ? B.gruen : e === false ? B.rot : B.ton;
        return <View key={i} style={{ width: 22, height: 8, borderRadius: 4, backgroundColor: farbe, borderWidth: i === aktuell && e == null ? 1.5 : 0, borderColor: B.kante }} />;
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Bühne: vor dem Start
// ---------------------------------------------------------------------------

function BuehnenSpieler({ s, versatz }: { s: DuellSpieler; versatz?: Animated.AnimatedInterpolation<number> }) {
  return (
    <Animated.View style={{ width: 240, alignItems: "center", gap: 14, transform: versatz ? [{ translateX: versatz }] : undefined }}>
      {s.bild}
      <View style={{ alignItems: "center", gap: 2 }}>
        <Text style={{ ...n.schwarz, fontSize: 24, color: B.text }} numberOfLines={1}>
          {s.name}
        </Text>
        {s.unter ? (
          <Text style={{ ...n.halb, fontSize: 14.5, color: B.text2, textAlign: "center" }} numberOfLines={2}>
            {s.unter}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

/** Zwei Spieler nebeneinander, dazwischen ein Blitz – vor dem Start eines Duells. */
export function DuellBuehneWeb({
  ich,
  gegner,
  etikett,
  text,
  einblenden,
  onSchliessen,
  onStart,
  startTitel,
}: {
  ich: DuellSpieler;
  gegner: DuellSpieler;
  etikett: string;
  text: string;
  /** 0 → 1: Spieler fahren von außen ein. */
  einblenden?: Animated.Value;
  onSchliessen: () => void;
  onStart?: () => void;
  startTitel?: string;
}) {
  useTasten((e) => {
    if (e.key === "Escape") onSchliessen();
    if (e.key === "Enter" && onStart) {
      e.preventDefault();
      onStart();
    }
  });
  const links = einblenden?.interpolate({ inputRange: [0, 1], outputRange: [-160, 0] });
  const rechts = einblenden?.interpolate({ inputRange: [0, 1], outputRange: [160, 0] });

  return (
    <View style={{ flex: 1, backgroundColor: B.grund }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 32, height: 84, width: "100%", maxWidth: BREITE, alignSelf: "center" }}>
        <SchliessenTaste onPress={onSchliessen} label="Duell verlassen" />
      </View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingBottom: 84, gap: 40 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 24 }}>
          <BuehnenSpieler s={ich} versatz={links} />
          <Animated.View style={{ alignItems: "center", gap: 10, marginTop: 20, opacity: einblenden ?? 1 }}>
            <Symbol icon="flash" ton={TOENE.gelb} groesse={64} />
            <Text style={{ ...n.fett, fontSize: 15, color: B.text3 }}>gegen</Text>
          </Animated.View>
          <BuehnenSpieler s={gegner} versatz={rechts} />
        </View>
        <Animated.View style={{ alignItems: "center", gap: 14, maxWidth: 560, opacity: einblenden ?? 1 }}>
          <Chip icon="flash" text={etikett} ton={TOENE.orange} />
          <Text style={{ ...n.halb, fontSize: 16.5, lineHeight: 24, color: B.text2, textAlign: "center" }}>{text}</Text>
          {onStart ? (
            <View style={{ alignItems: "center", gap: 12, marginTop: 10 }}>
              <Knopf titel={startTitel ?? "Los geht's"} icon="play" groesse="gross" onPress={onStart} style={{ minWidth: 240 }} />
              <TastenHinweis taste="Enter" text="startet" />
            </View>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Runde
// ---------------------------------------------------------------------------

function TafelSpieler({ s, status, statusTon, rechts }: { s: DuellSpieler; status: string; statusTon: Ton; rechts?: boolean }) {
  return (
    <View style={{ flex: 1, flexDirection: rechts ? "row-reverse" : "row", alignItems: "center", gap: 14, minWidth: 0 }}>
      {s.bild}
      <View style={{ flexShrink: 1, alignItems: rechts ? "flex-end" : "flex-start" }}>
        <Text style={{ ...n.schwarz, fontSize: 17, color: B.text }} numberOfLines={1}>
          {s.name}
        </Text>
        <Text style={{ ...n.fett, fontSize: 13.5, color: statusTon.kante }} numberOfLines={1}>
          {status}
        </Text>
      </View>
    </View>
  );
}

export type DuellRundeWebProps = {
  titel: string;
  runde: number;
  anzahl: number;
  ergebnisse: (boolean | null)[];
  /** 1 → 0 über die Rundenzeit. */
  zeit: Animated.Value;
  sekunden: number;
  ich: DuellSpieler;
  ichStatus: string;
  ichTon: Ton;
  gegner: DuellSpieler;
  gegnerStatus: string;
  gegnerTon: Ton;
  /** Mitte der Tafel, z. B. „2 : 1“. */
  stand: string;
  standUnter: string;
  frage: Frage;
  reihenfolge: number[];
  auswahl: number[];
  onAuswahl: (a: number[]) => void;
  /** Antwort ist abgegeben (Antworten gesperrt). */
  gesperrt: boolean;
  /** Lösung wird gezeigt. */
  aufgedeckt: boolean;
  /** Nach dem Aufdecken: war meine Antwort richtig? */
  richtig: boolean | null;
  /** Zusatz unten nach dem Aufdecken, z. B. „Mia lag auch richtig“. */
  nachricht?: string;
  knopf: string;
  onAbgeben: () => void;
  onSchliessen: () => void;
};

export function DuellRundeWeb(p: DuellRundeWebProps) {
  const { frage, auswahl, gesperrt, aufgedeckt } = p;
  const ordnung = ordnungVon(frage, p.reihenfolge);
  const kannAbgeben = !gesperrt && auswahl.length > 0;

  useTasten((e) => {
    if (e.key === "Escape") return p.onSchliessen();
    if (e.key === "Enter") {
      e.preventDefault();
      if (kannAbgeben) p.onAbgeben();
      return;
    }
    if (!gesperrt) antwortTaste(e, frage, ordnung, auswahl, p.onAuswahl);
  });

  const fussTon = aufgedeckt && p.richtig !== null ? (p.richtig ? TOENE.gruen : TOENE.rot) : null;
  // Restsekunden neben dem Zeitbalken – ändern sich nur einmal pro Sekunde.
  const [rest, setRest] = useState(p.sekunden);
  useEffect(() => {
    const id = p.zeit.addListener(({ value }) => setRest(Math.ceil(value * p.sekunden)));
    return () => p.zeit.removeListener(id);
  }, [p.zeit, p.sekunden]);

  const balkenFarbe = p.zeit.interpolate({ inputRange: [0, 0.25, 1], outputRange: [B.rot, B.orange, B.orange] });

  return (
    <View style={{ flex: 1, backgroundColor: B.grund }}>
      {/* Kopf */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 20, paddingHorizontal: 32, height: 84, width: "100%", maxWidth: BREITE, alignSelf: "center" }}>
        <SchliessenTaste onPress={p.onSchliessen} label="Duell verlassen" />
        <Text style={{ ...n.schwarz, fontSize: 17, color: B.text }}>{p.titel}</Text>
        <View style={{ flex: 1 }} />
        <RundenPunkte anzahl={p.anzahl} aktuell={p.runde} ergebnisse={p.ergebnisse} />
      </View>

      {/* Anzeigetafel */}
      <View style={{ width: "100%", maxWidth: BREITE, alignSelf: "center", paddingHorizontal: 32 }}>
        <Kachel style={{ paddingHorizontal: 24, paddingTop: 18, paddingBottom: 20, gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
            <TafelSpieler s={p.ich} status={p.ichStatus} statusTon={p.ichTon} />
            <View style={{ alignItems: "center", minWidth: 120 }}>
              <Text style={{ ...n.schwarz, fontSize: 34, lineHeight: 40, color: B.text, fontVariant: ["tabular-nums"] }}>{p.stand}</Text>
              <Text style={{ ...n.halb, fontSize: 12.5, color: B.text3 }}>{p.standUnter}</Text>
            </View>
            <TafelSpieler s={p.gegner} status={p.gegnerStatus} statusTon={p.gegnerTon} rechts />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Icon name="time" size={18} color={B.text3} />
            <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: B.ton, overflow: "hidden" }}>
              <Animated.View style={{ height: "100%", borderRadius: 5, backgroundColor: balkenFarbe, width: p.zeit.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }} />
            </View>
            <Text style={{ width: 40, textAlign: "right", ...n.schwarz, fontSize: 14, color: rest <= 5 && !gesperrt ? B.rotKante : B.text2, fontVariant: ["tabular-nums"] }}>{rest} s</Text>
          </View>
        </Kachel>
      </View>

      {/* Frage */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 32, paddingTop: 28, paddingBottom: 40 }}>
        <View style={{ width: "100%", maxWidth: BREITE - 64, alignSelf: "center" }}>
          <FrageFlaeche frage={frage} auswahl={auswahl} onAuswahl={(a) => !gesperrt && p.onAuswahl(a)} eingabe="" onEingabe={() => {}} aufgedeckt={aufgedeckt} reihenfolge={p.reihenfolge} />
        </View>
      </ScrollView>

      {/* Leiste unten */}
      <View style={{ borderTopWidth: 2, borderTopColor: fussTon ? fussTon.hell : B.linie, backgroundColor: fussTon ? fussTon.hell : B.flaeche }}>
        <View style={{ width: "100%", maxWidth: BREITE, alignSelf: "center", paddingHorizontal: 32, paddingVertical: 20, flexDirection: "row", alignItems: "center", gap: 18 }}>
          {fussTon ? (
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 16 }}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: B.flaeche, alignItems: "center", justifyContent: "center" }}>
                <Icon name={p.richtig ? "checkmark" : "close"} size={32} color={fussTon.farbe} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ ...n.schwarz, fontSize: 21, color: fussTon.kante }}>{p.richtig ? "Richtig!" : "Leider falsch"}</Text>
                {p.nachricht ? <Text style={{ ...n.fett, fontSize: 14.5, color: fussTon.kante }}>{p.nachricht}</Text> : null}
              </View>
            </View>
          ) : (
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
              {gesperrt ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Lader color={B.text3} size={18} />
                  <Text style={{ ...n.halb, fontSize: 14.5, color: B.text2 }}>{p.nachricht ?? "Antwort abgegeben"}</Text>
                </View>
              ) : (
                <TastenHinweis taste="Enter" text="gibt die Antwort ab" />
              )}
            </View>
          )}
          {aufgedeckt ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, height: 54 }}>
              <Lader color={fussTon ? fussTon.kante : B.text3} size={18} />
              <Text style={{ ...n.fett, fontSize: 15.5, color: fussTon ? fussTon.kante : B.text2 }}>{p.knopf}</Text>
            </View>
          ) : (
            <Knopf titel={p.knopf} ton="gruen" groesse="gross" deaktiviert={!kannAbgeben} onPress={p.onAbgeben} style={{ minWidth: 220 }} />
          )}
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Auswertung
// ---------------------------------------------------------------------------

export function DuellEndeWeb({
  icon,
  ton,
  titel,
  stand,
  unter,
  chips,
  runden,
  gegnerName,
  extra,
  haupt,
  neben,
  onSchliessen,
}: {
  icon: IconName;
  ton: Ton;
  titel: string;
  stand?: string;
  unter: string;
  chips?: ReactNode;
  runden?: RundenErgebnis[];
  gegnerName?: string;
  extra?: ReactNode;
  haupt?: { titel: string; icon?: IconName; ton?: TonName; onPress: () => void };
  neben: { titel: string; onPress: () => void };
  onSchliessen: () => void;
}) {
  useTasten((e) => {
    if (e.key === "Escape") onSchliessen();
    if (e.key === "Enter") {
      e.preventDefault();
      (haupt ?? neben).onPress();
    }
  });
  const mitGegner = runden?.some((r) => r.gegner != null);

  return (
    <View style={{ flex: 1, backgroundColor: B.grund }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 32, height: 84, width: "100%", maxWidth: BREITE, alignSelf: "center" }}>
        <SchliessenTaste onPress={onSchliessen} label="Schließen" />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 32, paddingBottom: 40 }}>
        <View style={{ width: "100%", maxWidth: runden?.length ? 1080 : 620, alignSelf: "center", flexDirection: "row", gap: 48, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          <View style={{ flex: 1, minWidth: 360, maxWidth: 520, alignItems: "center", gap: 14 }}>
            <Symbol icon={icon} ton={ton} groesse={96} />
            <Text style={{ ...n.schwarz, fontSize: 38, lineHeight: 46, color: B.text, textAlign: "center" }}>{titel}</Text>
            {stand ? <Text style={{ ...n.schwarz, fontSize: 52, lineHeight: 58, color: ton.kante, fontVariant: ["tabular-nums"] }}>{stand}</Text> : null}
            <Text style={{ ...n.halb, fontSize: 16.5, lineHeight: 24, color: B.text2, textAlign: "center" }}>{unter}</Text>
            {chips ? <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 4 }}>{chips}</View> : null}
            {extra}
          </View>

          {runden?.length ? (
            <Kachel style={{ flex: 1, minWidth: 380, maxWidth: 520 }}>
              <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingTop: 16, paddingBottom: 10, gap: 12 }}>
                <Text style={{ flex: 1, ...n.schwarz, fontSize: 17, color: B.text }}>Die Runden</Text>
                <Text style={{ width: 44, textAlign: "center", ...n.fett, fontSize: 13, color: B.text3 }}>Du</Text>
                {mitGegner ? (
                  <Text style={{ width: 44, textAlign: "center", ...n.fett, fontSize: 13, color: B.text3 }} numberOfLines={1}>
                    {gegnerName}
                  </Text>
                ) : null}
              </View>
              {runden.map((r, i) => {
                const f = frageVon(r.frage);
                return (
                  <View key={r.frage + i} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: 18, paddingVertical: 8, borderTopWidth: 1.5, borderTopColor: B.ton }}>
                    <Text style={{ width: 22, ...n.schwarz, fontSize: 14, color: B.text3 }}>{i + 1}</Text>
                    <Text style={{ flex: 1, ...n.halb, fontSize: 14.5, lineHeight: 20, color: B.text }} numberOfLines={2}>
                      {f?.text ?? "Frage"}
                    </Text>
                    <Marke ok={r.ich} />
                    {mitGegner ? <Marke ok={r.gegner ?? null} /> : null}
                  </View>
                );
              })}
            </Kachel>
          ) : null}
        </View>
      </ScrollView>
      <View style={{ borderTopWidth: 2, borderTopColor: B.linie }}>
        <View style={{ width: "100%", maxWidth: BREITE, alignSelf: "center", paddingHorizontal: 32, paddingVertical: 20, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <TastenHinweis taste="Enter" text={haupt ? haupt.titel : neben.titel} />
          </View>
          <Knopf titel={neben.titel} art={haupt ? "rand" : "voll"} ton={haupt ? "blau" : "orange"} groesse="gross" onPress={neben.onPress} style={haupt ? undefined : { minWidth: 220 }} />
          {haupt ? <Knopf titel={haupt.titel} icon={haupt.icon} ton={haupt.ton ?? "orange"} groesse="gross" onPress={haupt.onPress} style={{ minWidth: 220 }} /> : null}
        </View>
      </View>
    </View>
  );
}

function Marke({ ok }: { ok: boolean | null }) {
  const ton = ok === true ? TOENE.gruen : ok === false ? TOENE.rot : GRAU;
  return (
    <View style={{ width: 44, alignItems: "center" }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: ok == null ? B.ton : ton.farbe, alignItems: "center", justifyContent: "center" }}>
        <Icon name={ok === true ? "checkmark" : ok === false ? "close" : "remove"} size={17} color={ok == null ? B.text3 : "#FFFFFF"} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Laden, Gast
// ---------------------------------------------------------------------------

export function DuellHinweisWeb({ text, onSchliessen, children, icon, titel }: { text: string; onSchliessen: () => void; children?: ReactNode; icon?: IconName; titel?: string }) {
  useTasten((e) => {
    if (e.key === "Escape") onSchliessen();
  });
  return (
    <View style={{ flex: 1, backgroundColor: B.grund }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 32, height: 84, width: "100%", maxWidth: BREITE, alignSelf: "center" }}>
        <SchliessenTaste onPress={onSchliessen} label="Schließen" />
      </View>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, paddingBottom: 84, gap: 16 }}>
        {icon ? <Symbol icon={icon} ton={TOENE.blau} groesse={88} /> : <Lader color={B.text3} size={30} />}
        {titel ? <Text style={{ ...n.schwarz, fontSize: 30, color: B.text, textAlign: "center" }}>{titel}</Text> : null}
        <Text style={{ ...n.halb, fontSize: 16, lineHeight: 23, color: B.text2, textAlign: "center", maxWidth: 480 }}>{text}</Text>
        {children ? <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>{children}</View> : null}
      </View>
    </View>
  );
}

/** Duell-Code zum Weitergeben – mit Kopieren. */
export function DuellCodeWeb({ code, text }: { code: string; text: string }) {
  const [kopiert, setKopiert] = useState(false);
  useEffect(() => {
    if (!kopiert) return;
    const t = setTimeout(() => setKopiert(false), 2000);
    return () => clearTimeout(t);
  }, [kopiert]);
  return (
    <Kachel style={{ alignSelf: "stretch", marginTop: 12, padding: 22, alignItems: "center", gap: 10 }}>
      <Text style={{ ...n.fett, fontSize: 14, color: B.text3 }}>Dein Duell-Code</Text>
      <Text selectable style={{ ...n.schwarz, fontSize: 40, letterSpacing: 6, color: B.text, fontVariant: ["tabular-nums"] }}>
        {code}
      </Text>
      <Knopf
        titel={kopiert ? "Kopiert" : "Code kopieren"}
        icon={kopiert ? "checkmark" : "copy"}
        art="rand"
        ton="blau"
        groesse="klein"
        onPress={async () => {
          await Clipboard.setStringAsync(text);
          erfolg();
          setKopiert(true);
        }}
      />
    </Kachel>
  );
}

/** Platzhalter, solange der Gegner noch nicht feststeht. */
export function OffenerGegner({ groesse }: { groesse: number }) {
  return (
    <View style={{ width: groesse, height: groesse, borderRadius: groesse / 2, borderWidth: 2, borderStyle: "dashed", borderColor: B.kante, alignItems: "center", justifyContent: "center" }}>
      <Icon name="help" size={groesse * 0.42} color={B.text3} />
    </View>
  );
}
