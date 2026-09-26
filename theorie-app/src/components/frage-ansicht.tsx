import { Pressable, TextInput, View } from "react-native";

import { Icon } from "@/components/icon";
import { T } from "@/components/ui";
import { FrageBild } from "@/components/frage-bild";
import { antwortRichtig, themaVon, zahlLesen, zahlText, type Frage } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { abstand, farben, schrift } from "@/lib/theme";

type Zustand = "offen" | "gewaehlt" | "richtig" | "verpasst" | "falsch" | "aus";

function Auswahlkreis({ zustand }: { zustand: Zustand }) {
  const gefuellt = zustand === "gewaehlt" || zustand === "richtig" || zustand === "falsch";
  const farbe =
    zustand === "gewaehlt" ? farben.orange : zustand === "richtig" || zustand === "verpasst" ? farben.gruen : zustand === "falsch" ? farben.rot : "#8E939A";
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: gefuellt ? farbe : "transparent",
        borderWidth: gefuellt ? 0 : 2,
        borderColor: farbe,
      }}
    >
      {zustand === "falsch" ? (
        <Icon name="close" size={15} color="#FFFFFF" />
      ) : gefuellt || zustand === "verpasst" ? (
        <Icon name="checkmark" size={zustand === "verpasst" ? 13 : 15} color={gefuellt ? "#FFFFFF" : farben.gruen} />
      ) : null}
    </View>
  );
}

/** Rückmeldung nach dem Aufdecken – grün bei richtig, rot bei falsch, mit Erklärung. */
export function Rueckmeldung({ richtig, text }: { richtig: boolean; text: string }) {
  const farbe = richtig ? farben.gruen : farben.rot;
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 12,
        padding: 13,
        borderRadius: 14,
        backgroundColor: richtig ? farben.gruenDunkel : "#2A1615",
        borderWidth: 1,
        borderColor: farbe + "55",
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: farbe,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: farbe,
          shadowOpacity: 0.55,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 0 },
        }}
      >
        <Icon name={richtig ? "checkmark" : "close"} size={22} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <T v="h3" farbe={farbe} style={{ fontSize: 17, lineHeight: 21 }}>
          {richtig ? "Richtig!" : "Leider falsch"}
        </T>
        <T v="text" farbe={farben.text} style={{ fontSize: 14, lineHeight: 19 }}>
          {text}
        </T>
      </View>
    </View>
  );
}

/**
 * Eine Frage wie in der Vorlage: Bild oben, Frage, Antworten mit
 * Auswahlkreis. Nach dem Aufdecken färben sich die Antworten und eine
 * Rückmeldung mit Erklärung erscheint.
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
}: {
  frage: Frage;
  auswahl: number[];
  onAuswahl: (neu: number[]) => void;
  eingabe: string;
  onEingabe: (text: string) => void;
  aufgedeckt: boolean;
  ohneErklaerung?: boolean;
  ohneMeta?: boolean;
  /** Für Duelle: kein Themenfoto, Zeichen ohne Fahrersicht. */
  kompakt?: boolean;
}) {
  const thema = themaVon(frage.thema);
  const mitBild = Boolean(frage.bild) || !kompakt;
  // Wie in der Vorlage: über der Frage nur das Bild. Thema und Punkte nur im Duell (ohne Bild).
  const metaZeigen = !ohneMeta && Boolean(kompakt) && !frage.bild;

  return (
    <View style={{ gap: 16 }}>
      {mitBild ? <FrageBild bild={frage.bild} thema={frage.thema} punkte={frage.punkte} kompakt={kompakt} /> : null}

      <View style={{ gap: abstand(1.5) }}>
        {metaZeigen ? (
          <T v="klein" farbe={frage.punkte >= 5 ? farben.orange : farben.text3}>
            {thema.titel} · {frage.punkte} Punkte
          </T>
        ) : null}
        <T v="h2" style={{ fontSize: 18.5, lineHeight: 25 }}>
          {frage.text}
        </T>
      </View>

      {frage.art === "auswahl" ? (
        <View style={{ gap: 7 }}>
          {frage.antworten.map((antwort, i) => {
            const gewaehlt = auswahl.includes(i);
            let zustand: Zustand = gewaehlt ? "gewaehlt" : "offen";
            if (aufgedeckt) {
              if (antwort.richtig && gewaehlt) zustand = "richtig";
              else if (antwort.richtig) zustand = "verpasst";
              else if (gewaehlt) zustand = "falsch";
              else zustand = "aus";
            }
            const rand =
              zustand === "gewaehlt" ? farben.orange : zustand === "richtig" || zustand === "verpasst" ? farben.gruen : zustand === "falsch" ? farben.rot : "rgba(255,255,255,0.09)";
            const flaeche =
              zustand === "gewaehlt" ? farben.orangeSoft : zustand === "richtig" ? farben.gruenOption : zustand === "falsch" ? farben.rotSoft : farben.option;

            return (
              <Pressable
                key={i}
                disabled={aufgedeckt}
                onPress={() => {
                  tippen();
                  onAuswahl(gewaehlt ? auswahl.filter((x) => x !== i) : [...auswahl, i]);
                }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 13,
                  minHeight: 47,
                  paddingVertical: 11,
                  paddingHorizontal: 13,
                  borderRadius: 11,
                  borderWidth: 1.5,
                  borderColor: rand,
                  backgroundColor: flaeche,
                  opacity: pressed ? 0.85 : 1,
                  ...(zustand === "richtig" ? { shadowColor: farben.gruen, shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } } : null),
                })}
              >
                <Auswahlkreis zustand={zustand} />
                <T v="textStark" style={{ flex: 1, ...schrift.text, fontSize: 15.5, lineHeight: 21 }}>
                  {antwort.text}
                </T>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <ZahlEingabe frage={frage} eingabe={eingabe} onEingabe={onEingabe} aufgedeckt={aufgedeckt} />
      )}

      {aufgedeckt && !ohneErklaerung ? <Rueckmeldung richtig={antwortRichtig(frage, auswahl, eingabe)} text={frage.erklaerung} /> : null}
    </View>
  );
}

function ZahlEingabe({
  frage,
  eingabe,
  onEingabe,
  aufgedeckt,
}: {
  frage: Extract<Frage, { art: "zahl" }>;
  eingabe: string;
  onEingabe: (t: string) => void;
  aufgedeckt: boolean;
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
          backgroundColor: aufgedeckt ? (richtig ? farben.gruenOption : farben.rotSoft) : farben.option,
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
          style={{ flex: 1, ...schrift.titel, fontSize: 36, color: farben.text, fontVariant: ["tabular-nums"] }}
        />
        <T v="h3" farbe={farben.text3}>
          {frage.einheit}
        </T>
      </View>
      {aufgedeckt && !richtig ? (
        <T v="textStark" farbe={farben.gruen}>
          Richtig: {zahlText(frage.loesung)} {frage.einheit}
        </T>
      ) : null}
    </View>
  );
}
