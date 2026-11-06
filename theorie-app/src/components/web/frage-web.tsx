import { useEffect, useRef } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";

import { FrageBild } from "@/components/frage-bild";
import { Icon, type IconName } from "@/components/icon";
import { B, Chip, Knopf, n, Symbol, THEMA_TON, TOENE, type TonName, type Ton, type Zustand } from "@/components/web/bunt";
import { antwortRichtig, themaVon, zahlText, type Frage } from "@/lib/fragen";
import { frageKarteId, useStand } from "@/lib/stand";

// Eine Frage am PC (Training, Prüfung): Thema und Punkte, der Fragetext, das
// Bild links daneben und die Antworten als große Kacheln mit Tastenkürzel.

export const BUCHSTABEN = ["A", "B", "C", "D", "E", "F"];

export function mitPunkt(text: string): string {
  return /[.!?…)]$/.test(text.trim()) ? text : `${text}.`;
}

export function statusText(frage: Frage, auswahl: number[], richtig: boolean): string {
  if (richtig) return frage.art === "zahl" ? "Richtig gerechnet." : "Sauber beantwortet.";
  if (frage.art === "zahl") return `Richtig ist ${zahlText(frage.loesung)} ${frage.einheit}.`;
  if (auswahl.length === 0) return "Keine Antwort ausgewählt.";
  return auswahl.some((i) => !frage.antworten[i]?.richtig) ? "Da war eine falsche Antwort dabei." : "Nicht alle richtigen Antworten ausgewählt.";
}

/** Tasten im Browser abhören, solange der Bildschirm offen ist. */
export function useTasten(handler: (e: KeyboardEvent) => void, { immer = false }: { immer?: boolean } = {}) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    // Nur im Browser: In der App gibt es `window` zwar auch, aber ohne
    // addEventListener – der Aufruf würde die App beim Start abstürzen lassen.
    if (Platform.OS !== "web" || typeof window === "undefined" || typeof window.addEventListener !== "function") return;
    const h = (e: KeyboardEvent) => {
      // Ist ein Dialog offen, gehören die Tasten ihm – nicht der Seite darunter.
      if (tastenSperre.an && !immer) return;
      // Nicht in Eingabefeldern (Zahl-Frage, KI-Hilfe) – außer Enter/Escape.
      const ziel = e.target as HTMLElement | null;
      const imFeld = ziel?.tagName === "INPUT" || ziel?.tagName === "TEXTAREA";
      if (imFeld && e.key !== "Enter" && e.key !== "Escape") return;
      ref.current(e);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [immer]);
}

/** Gesetzt, solange ein Dialog offen ist (dialog.tsx). */
export const tastenSperre = { an: false };

/** Kleine Taste mit Buchstabe oder Kürzel. */
function Taste({ text, ton, hell }: { text: string; ton?: Ton; hell?: boolean }) {
  return (
    <View style={{ minWidth: 34, height: 34, paddingHorizontal: 8, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 2, borderBottomWidth: 4, borderColor: ton ? ton.farbe : B.linie, backgroundColor: hell ? B.flaeche : ton ? ton.farbe : B.flaeche }}>
      <Text style={{ ...n.schwarz, fontSize: 14, color: ton && !hell ? "#FFFFFF" : ton ? ton.kante : B.text3 }}>{text}</Text>
    </View>
  );
}

type AntwortZustand = "offen" | "gewaehlt" | "richtig" | "verpasst" | "falsch" | "aus";

function Antwort({ text, buchstabe, zustand, onPress, gesperrt }: { text: string; buchstabe: string; zustand: AntwortZustand; onPress: () => void; gesperrt: boolean }) {
  const ton = zustand === "gewaehlt" ? TOENE.blau : zustand === "richtig" || zustand === "verpasst" ? TOENE.gruen : zustand === "falsch" ? TOENE.rot : null;
  const unter = zustand === "verpasst" ? "Auch richtig – hättest du ankreuzen müssen" : zustand === "falsch" ? "Diese Antwort ist falsch" : null;
  return (
    <Pressable
      disabled={gesperrt}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: zustand === "gewaehlt" || zustand === "richtig" || zustand === "falsch" }}
      accessibilityLabel={`Antwort ${buchstabe}: ${text}`}
      style={(z: Zustand) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        minHeight: 72,
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderRadius: 18,
        borderWidth: 2,
        borderBottomWidth: z.pressed && !gesperrt ? 2 : 5,
        marginTop: z.pressed && !gesperrt ? 3 : 0,
        borderStyle: zustand === "verpasst" ? "dashed" : "solid",
        borderColor: ton ? ton.farbe : z.hovered && !gesperrt ? B.kante : B.linie,
        borderBottomColor: ton ? ton.kante : B.kante,
        backgroundColor: ton ? ton.hell : z.hovered && !gesperrt ? B.hover : B.flaeche,
        opacity: zustand === "aus" ? 0.5 : 1,
      })}
    >
      {zustand === "richtig" || zustand === "falsch" ? (
        <View style={{ width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: zustand === "richtig" ? B.gruen : B.rot }}>
          <Icon name={zustand === "richtig" ? "checkmark" : "close"} size={22} color="#FFFFFF" />
        </View>
      ) : (
        <Taste text={buchstabe} ton={ton ?? undefined} />
      )}
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ ...n.halb, fontSize: 17, lineHeight: 24, color: ton ? ton.kante : B.text }}>{mitPunkt(text)}</Text>
        {unter ? <Text style={{ ...n.fett, fontSize: 13, color: zustand === "falsch" ? B.rotKante : B.gruenKante }}>{unter}</Text> : null}
      </View>
    </Pressable>
  );
}


/** Anzeige-Reihenfolge der Antworten (ursprüngliche Positionen). */
export function ordnungVon(frage: Frage, reihenfolge?: number[]): number[] {
  if (frage.art !== "auswahl") return [];
  return reihenfolge && reihenfolge.length === frage.antworten.length ? reihenfolge : frage.antworten.map((_, i) => i);
}

/** Antwort per Taste (1–6, A–F) an- oder abwählen. Gibt true zurück, wenn die Taste passte. */
export function antwortTaste(e: KeyboardEvent, frage: Frage, ordnung: number[], auswahl: number[], onAuswahl: (a: number[]) => void): boolean {
  if (frage.art !== "auswahl") return false;
  const taste = e.key.toUpperCase();
  const pos = /^[1-6]$/.test(taste) ? Number(taste) - 1 : BUCHSTABEN.indexOf(taste);
  if (pos < 0 || pos >= ordnung.length) return false;
  const i = ordnung[pos];
  onAuswahl(auswahl.includes(i) ? auswahl.filter((x) => x !== i) : [...auswahl, i]);
  return true;
}

export function FrageFlaeche({
  frage,
  auswahl,
  onAuswahl,
  eingabe,
  onEingabe,
  aufgedeckt,
  reihenfolge,
  etikett,
  xp,
  onEnter,
}: {
  frage: Frage;
  auswahl: number[];
  onAuswahl: (a: number[]) => void;
  eingabe: string;
  onEingabe: (t: string) => void;
  aufgedeckt: boolean;
  reihenfolge?: number[];
  /** Zusätzliche Kapsel vorne, z. B. „Frage 4 · Prüfung“. */
  etikett?: string;
  xp?: number;
  /** Enter im Zahlenfeld (das Feld fängt die Taste selbst ab). */
  onEnter?: () => void;
}) {
  const thema = themaVon(frage.thema);
  const ton = THEMA_TON[frage.thema];
  const richtig = antwortRichtig(frage, auswahl, eingabe);
  const ordnung = ordnungVon(frage, reihenfolge);
  const umschalten = (i: number) => onAuswahl(auswahl.includes(i) ? auswahl.filter((x) => x !== i) : [...auswahl, i]);

  return (
    <View style={{ gap: 26 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Symbol icon={thema.icon as IconName} ton={ton} groesse={40} />
        <Text style={{ ...n.fett, fontSize: 15, color: ton.kante }}>{thema.titel}</Text>
        {etikett ? <Chip text={etikett} ton={TOENE.blau} /> : null}
        <Chip icon={frage.punkte >= 5 ? "flame" : undefined} text={`${frage.punkte} Punkte`} ton={frage.punkte >= 5 ? TOENE.rot : TOENE.gelb} />
        {xp && aufgedeckt ? <Chip icon="flash" text={`+${xp} XP`} ton={TOENE.gelb} /> : null}
      </View>

      <View style={{ flexDirection: "row", gap: 40, alignItems: "flex-start", flexWrap: "wrap" }}>
        {frage.bild ? (
          <View style={{ flex: 1, minWidth: 340, maxWidth: 540, borderRadius: 22, overflow: "hidden", borderWidth: 2, borderColor: B.linie, borderBottomWidth: 5, borderBottomColor: B.kante }}>
            <FrageBild bild={frage.bild} thema={frage.thema} punkte={frage.punkte} randlos />
          </View>
        ) : null}
        <View style={{ flex: 1, minWidth: 380, gap: 22 }}>
          <Text style={{ ...n.schwarz, fontSize: 28, lineHeight: 36, color: B.text }}>{frage.text}</Text>
          {frage.art === "auswahl" ? (
            <>
              {!aufgedeckt ? <Text style={{ ...n.halb, fontSize: 14.5, color: B.text3, marginTop: -10 }}>Eine oder mehrere Antworten sind richtig · Tasten 1–{ordnung.length} oder A–{BUCHSTABEN[ordnung.length - 1]}</Text> : null}
              <View style={{ gap: 12 }}>
                {ordnung.map((i, pos) => {
                  const a = frage.antworten[i];
                  const gewaehlt = auswahl.includes(i);
                  let zustand: AntwortZustand = gewaehlt ? "gewaehlt" : "offen";
                  if (aufgedeckt) zustand = a.richtig && gewaehlt ? "richtig" : a.richtig ? "verpasst" : gewaehlt ? "falsch" : "aus";
                  return <Antwort key={i} text={a.text} buchstabe={BUCHSTABEN[pos] ?? String(pos + 1)} zustand={zustand} gesperrt={aufgedeckt} onPress={() => umschalten(i)} />;
                })}
              </View>
            </>
          ) : (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 14, height: 96, paddingHorizontal: 24, borderRadius: 20, borderWidth: 2, borderBottomWidth: 5, borderColor: aufgedeckt ? (richtig ? B.gruen : B.rot) : eingabe ? B.blau : B.linie, borderBottomColor: aufgedeckt ? (richtig ? B.gruenKante : B.rotKante) : eingabe ? B.blauKante : B.kante, backgroundColor: aufgedeckt ? (richtig ? B.gruenHell : B.rotHell) : B.flaeche }}>
                <Icon name="calculator" size={30} color={B.text3} />
                <TextInput
                  value={eingabe}
                  onChangeText={(t) => onEingabe(t.replace(/[^0-9.,]/g, "").slice(0, 7))}
                  editable={!aufgedeckt}
                  autoFocus={!aufgedeckt}
                  placeholder="0"
                  placeholderTextColor={B.text3}
                  inputMode="decimal"
                  onSubmitEditing={onEnter}
                  blurOnSubmit={false}
                  accessibilityLabel="Deine Antwort"
                  style={{ flex: 1, minWidth: 0, ...n.schwarz, fontSize: 44, color: B.text, outlineWidth: 0, fontVariant: ["tabular-nums"] }}
                />
                <Text style={{ ...n.schwarz, fontSize: 22, color: B.text3 }}>{frage.einheit}</Text>
              </View>
              {aufgedeckt && !richtig ? (
                <Text style={{ ...n.fett, fontSize: 15.5, color: B.gruenKante }}>
                  Richtig: {zahlText(frage.loesung)} {frage.einheit}
                </Text>
              ) : null}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

/** „Karteikarte“: macht aus der Frage eine Karte (Frage vorn, Lösung und Merksatz hinten) – oder nimmt sie wieder heraus. */
export function KarteKnopf({ frageId, ton = "blau" }: { frageId: string; ton?: TonName }) {
  const { stand, frageKarteUmschalten } = useStand();
  const gespeichert = stand.karteikarten.karten.some((k) => k.id === frageKarteId(frageId));
  return <Knopf titel={gespeichert ? "Als Karte gespeichert" : "Karteikarte"} icon={gespeichert ? "checkmark" : "albums-outline"} art="rand" ton={ton} onPress={() => frageKarteUmschalten(frageId)} />;
}
