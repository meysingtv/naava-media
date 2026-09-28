import { useCallback, useRef } from "react";
import { Pressable, TextInput, View } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import { T } from "@/components/ui";
import { FrageBild } from "@/components/frage-bild";
import { antwortReihenfolge, antwortRichtig, themaVon, zahlLesen, zahlText, type Frage } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { abstand, farben, schrift } from "@/lib/theme";

type Zustand = "offen" | "gewaehlt" | "richtig" | "verpasst" | "falsch" | "aus";

/**
 * Merkt sich je Frage, in welcher Reihenfolge die Antworten gezeigt werden –
 * solange der Bildschirm offen ist. Beim nächsten Mal wird neu gewürfelt.
 */
export function useAntwortReihenfolge(): (frage: Frage) => number[] {
  const gemerkt = useRef(new Map<string, number[]>());
  return useCallback((frage: Frage) => {
    let r = gemerkt.current.get(frage.id);
    if (!r) {
      r = antwortReihenfolge(frage);
      gemerkt.current.set(frage.id, r);
    }
    return r;
  }, []);
}

/** Antworten enden wie in der Prüfung mit Punkt. */
function mitPunkt(text: string): string {
  return /[.!?…)]$/.test(text.trim()) ? text : `${text}.`;
}

/** Eckiges Kästchen wie im Prüfungsbogen – es können mehrere Antworten richtig sein. */
function Kaestchen({ zustand }: { zustand: Zustand }) {
  const gefuellt = zustand === "gewaehlt" || zustand === "richtig" || zustand === "falsch";
  const farbe =
    zustand === "gewaehlt" ? farben.orange : zustand === "richtig" || zustand === "verpasst" ? farben.gruen : zustand === "falsch" ? farben.rot : "#5C636B";
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 7,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: gefuellt ? farbe : "transparent",
        borderWidth: gefuellt ? 0 : 2,
        borderColor: farbe,
      }}
    >
      {zustand === "falsch" ? (
        <Icon name="close" size={16} color="#FFFFFF" />
      ) : gefuellt || zustand === "verpasst" ? (
        <Icon name="checkmark" size={zustand === "verpasst" ? 14 : 16} color={gefuellt ? "#FFFFFF" : farben.gruen} />
      ) : null}
    </View>
  );
}

/** Kleine Kapsel über der Frage („Übung“, „4 Punkte“). */
function Etikett({ text, farbe, icon }: { text: string; farbe?: string; icon?: IconName }) {
  const f = farbe ?? farben.text2;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        height: 26,
        paddingHorizontal: 10,
        borderRadius: 13,
        backgroundColor: farbe ? farbe + "1F" : "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: farbe ? farbe + "55" : "rgba(255,255,255,0.08)",
      }}
    >
      {icon ? <Icon name={icon} size={12} color={f} /> : null}
      <T v="klein" farbe={f} style={{ ...schrift.textHalb, fontSize: 12.5 }}>
        {text}
      </T>
    </View>
  );
}

/** Was nach dem Prüfen oben über den Antworten steht. */
function statusText(frage: Frage, auswahl: number[], richtig: boolean): string {
  if (richtig) return frage.art === "zahl" ? "Richtig gerechnet" : "Richtig beantwortet";
  if (frage.art === "zahl") return `Leider falsch – richtig ist ${zahlText(frage.loesung)} ${frage.einheit}`;
  if (auswahl.length === 0) return "Keine Antwort ausgewählt";
  return auswahl.some((i) => !frage.antworten[i]?.richtig) ? "Falsche Antwort ausgewählt" : "Nicht alle richtigen Antworten ausgewählt";
}

function Status({ richtig, text }: { richtig: boolean; text: string }) {
  const farbe = richtig ? farben.gruen : farben.rot;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 11,
        paddingHorizontal: 12,
        borderRadius: 14,
        backgroundColor: richtig ? farben.gruenDunkel : "#2A1615",
        borderWidth: 1,
        borderColor: farbe + "55",
      }}
    >
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: farbe, alignItems: "center", justifyContent: "center" }}>
        <Icon name={richtig ? "checkmark" : "close"} size={14} color="#FFFFFF" />
      </View>
      <T v="textStark" farbe={farbe} style={{ flex: 1, fontSize: 14.5, lineHeight: 19 }}>
        {text}
      </T>
    </View>
  );
}

/** Erklärung nach dem Prüfen: was richtig ist und was man sich merken sollte. */
function Erklaerung({ frage, richtig }: { frage: Frage; richtig: boolean }) {
  const richtige = frage.art === "auswahl" ? frage.antworten.filter((a) => a.richtig) : [];
  return (
    <View
      style={{
        padding: 14,
        gap: 12,
        borderRadius: 20,
        backgroundColor: farben.flaeche,
        borderWidth: 1,
        borderColor: "rgba(252,91,14,0.4)",
        shadowColor: farben.orange,
        shadowOpacity: 0.18,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 0 },
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: farben.orangeSoft, alignItems: "center", justifyContent: "center" }}>
          <Icon name="bulb" size={17} color={farben.orange} />
        </View>
        <T v="h3" style={{ flex: 1 }}>
          Erklärung
        </T>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            height: 26,
            paddingHorizontal: 10,
            borderRadius: 13,
            backgroundColor: richtig ? farben.gruenSoft : farben.rotSoft,
          }}
        >
          <Icon name={richtig ? "checkmark" : "close"} size={13} color={richtig ? farben.gruen : farben.rot} />
          <T v="klein" farbe={richtig ? farben.gruen : farben.rot} style={{ ...schrift.textHalb, fontSize: 12.5 }}>
            {richtig ? "Richtig" : "Falsch"}
          </T>
        </View>
      </View>

      <View style={{ padding: 12, gap: 6, borderRadius: 14, backgroundColor: "rgba(78,208,83,0.08)", borderWidth: 1, borderColor: "rgba(78,208,83,0.25)" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <Icon name="checkmark-circle" size={16} color={farben.gruen} />
          <T v="textStark" farbe={farben.gruen} style={{ fontSize: 14.5 }}>
            Richtig ist:
          </T>
        </View>
        {frage.art === "zahl" ? (
          <T v="textStark" style={{ fontSize: 16, lineHeight: 22 }}>
            {zahlText(frage.loesung)} {frage.einheit}
          </T>
        ) : (
          richtige.map((a, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 8 }}>
              {richtige.length > 1 ? (
                <T v="textStark" style={{ fontSize: 15.5, lineHeight: 21 }}>
                  •
                </T>
              ) : null}
              <T v="textStark" style={{ flex: 1, fontSize: 15.5, lineHeight: 21 }}>
                {mitPunkt(a.text)}
              </T>
            </View>
          ))
        )}
      </View>

      <View style={{ padding: 12, gap: 6, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <Icon name="bulb-outline" size={16} color={farben.gelb} />
          <T v="textStark" farbe={farben.gelb} style={{ fontSize: 14.5 }}>
            Merke dir:
          </T>
        </View>
        <T v="text" farbe="#E6E8EB" style={{ fontSize: 15, lineHeight: 21 }}>
          {frage.erklaerung}
        </T>
      </View>
    </View>
  );
}

/**
 * Eine Frage im Karten-Stil: oben die Frage in einer eigenen Karte (Bild,
 * Kapseln, Text), darunter die Antworten mit Kästchen. Nach dem Prüfen
 * zeigt eine Leiste, ob es gepasst hat, und eine Karte erklärt die Lösung.
 */
export function FrageAnsicht({
  frage,
  auswahl,
  onAuswahl,
  eingabe,
  onEingabe,
  aufgedeckt,
  ohneErklaerung,
  ohneMeta,
  kompakt,
  etikett,
  reihenfolge,
}: {
  frage: Frage;
  auswahl: number[];
  onAuswahl: (neu: number[]) => void;
  eingabe: string;
  onEingabe: (text: string) => void;
  aufgedeckt: boolean;
  ohneErklaerung?: boolean;
  ohneMeta?: boolean;
  /** Für Duelle: Zeichen ohne Fahrersicht. */
  kompakt?: boolean;
  /** Erste Kapsel über der Frage, z. B. „Übung“ oder „Prüfung“. */
  etikett?: string;
  /** Anzeige-Reihenfolge der Antworten (ursprüngliche Positionen); sonst wie im Katalog. */
  reihenfolge?: number[];
}) {
  const richtig = antwortRichtig(frage, auswahl, eingabe);
  const mitAufloesung = aufgedeckt && !ohneErklaerung;
  const ordnung =
    frage.art === "auswahl"
      ? reihenfolge && reihenfolge.length === frage.antworten.length
        ? reihenfolge
        : frage.antworten.map((_, i) => i)
      : [];

  return (
    <View style={{ gap: 12 }}>
      <View style={{ padding: 14, gap: 12, borderRadius: 20, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" }}>
        {frage.bild ? <FrageBild bild={frage.bild} thema={frage.thema} punkte={frage.punkte} kompakt={kompakt} /> : null}
        {!ohneMeta ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            <Etikett text={etikett ?? (kompakt ? themaVon(frage.thema).titel : "Übung")} />
            <Etikett text={`${frage.punkte} Punkte`} farbe={frage.punkte >= 5 ? farben.orange : undefined} />
          </View>
        ) : null}
        <T v="h2" style={{ fontSize: 20, lineHeight: 27 }}>
          {frage.text}
        </T>
      </View>

      {mitAufloesung ? <Status richtig={richtig} text={statusText(frage, auswahl, richtig)} /> : null}

      {frage.art === "auswahl" ? (
        <View style={{ gap: 8 }}>
          {ordnung.map((i) => {
            const antwort = frage.antworten[i];
            const gewaehlt = auswahl.includes(i);
            let zustand: Zustand = gewaehlt ? "gewaehlt" : "offen";
            if (aufgedeckt) {
              if (antwort.richtig && gewaehlt) zustand = "richtig";
              else if (antwort.richtig) zustand = "verpasst";
              else if (gewaehlt) zustand = "falsch";
              else zustand = "aus";
            }
            const rand =
              zustand === "gewaehlt"
                ? farben.orange
                : zustand === "richtig" || zustand === "verpasst"
                  ? farben.gruen
                  : zustand === "falsch"
                    ? farben.rot
                    : "rgba(255,255,255,0.09)";
            const flaeche =
              zustand === "gewaehlt" ? farben.orangeSoft : zustand === "richtig" ? farben.gruenOption : zustand === "falsch" ? farben.rotSoft : farben.flaeche;

            return (
              <Pressable
                key={i}
                disabled={aufgedeckt}
                onPress={() => {
                  tippen();
                  onAuswahl(gewaehlt ? auswahl.filter((x) => x !== i) : [...auswahl, i]);
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: gewaehlt, disabled: aufgedeckt }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 13,
                  minHeight: 56,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: rand,
                  backgroundColor: flaeche,
                  opacity: zustand === "aus" ? 0.55 : pressed ? 0.85 : 1,
                  ...(zustand === "richtig" ? { shadowColor: farben.gruen, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } } : null),
                })}
              >
                <Kaestchen zustand={zustand} />
                <T v="textStark" style={{ flex: 1, ...schrift.textMittel, fontSize: 15.5, lineHeight: 21 }}>
                  {mitPunkt(antwort.text)}
                </T>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <ZahlEingabe frage={frage} eingabe={eingabe} onEingabe={onEingabe} aufgedeckt={aufgedeckt} loesungZeigen={aufgedeckt && Boolean(ohneErklaerung)} />
      )}

      {mitAufloesung ? <Erklaerung frage={frage} richtig={richtig} /> : null}
    </View>
  );
}

function ZahlEingabe({
  frage,
  eingabe,
  onEingabe,
  aufgedeckt,
  loesungZeigen,
}: {
  frage: Extract<Frage, { art: "zahl" }>;
  eingabe: string;
  onEingabe: (t: string) => void;
  aufgedeckt: boolean;
  loesungZeigen: boolean;
}) {
  const wert = zahlLesen(eingabe);
  const richtig = wert != null && Math.abs(wert - frage.loesung) < 0.001;
  const rand = !aufgedeckt ? (eingabe ? farben.orange : "rgba(255,255,255,0.12)") : richtig ? farben.gruen : farben.rot;

  return (
    <View style={{ gap: abstand(2) }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          height: 76,
          paddingHorizontal: abstand(5),
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: rand,
          backgroundColor: aufgedeckt ? (richtig ? farben.gruenOption : farben.rotSoft) : farben.flaeche,
        }}
      >
        <TextInput
          value={eingabe}
          onChangeText={(t) => onEingabe(t.replace(/[^0-9.,]/g, "").slice(0, 7))}
          editable={!aufgedeckt}
          keyboardType="decimal-pad"
          keyboardAppearance="dark"
          placeholder="0"
          placeholderTextColor={farben.text4}
          selectionColor={farben.orange}
          style={{ flex: 1, minWidth: 0, ...schrift.titel, fontSize: 36, color: farben.text, fontVariant: ["tabular-nums"] }}
        />
        <T v="h3" farbe={farben.text3}>
          {frage.einheit}
        </T>
      </View>
      {loesungZeigen && !richtig ? (
        <T v="textStark" farbe={farben.gruen}>
          Richtig: {zahlText(frage.loesung)} {frage.einheit}
        </T>
      ) : null}
    </View>
  );
}
