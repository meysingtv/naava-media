import { Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Chip, T } from "@/components/ui";
import { FrageBild } from "@/components/frage-bild";
import { themaVon, zahlLesen, zahlText, type Frage } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { abstand, farben, radius, schrift } from "@/lib/theme";

const BUCHSTABEN = ["A", "B", "C", "D"];

/**
 * Eine Frage mit Bild und Antworten. Vor dem Aufdecken wählt man aus,
 * danach zeigt die Ansicht richtig/falsch und die Erklärung.
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
}: {
  frage: Frage;
  auswahl: number[];
  onAuswahl: (neu: number[]) => void;
  eingabe: string;
  onEingabe: (text: string) => void;
  aufgedeckt: boolean;
  ohneErklaerung?: boolean;
  ohneMeta?: boolean;
}) {
  const thema = themaVon(frage.thema);

  return (
    <View style={{ gap: abstand(4) }}>
      {!ohneMeta ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: abstand(2) }}>
          <T v="mini" style={{ flex: 1 }} numberOfLines={1}>
            {thema.titel}
          </T>
          <Chip text={`${frage.punkte} Punkte`} icon="alert-circle-outline" farbe={frage.punkte >= 5 ? farben.orange : farben.text3} />
        </View>
      ) : null}

      <T v="h2" style={{ fontSize: 21, lineHeight: 28 }}>
        {frage.text}
      </T>

      {frage.bild ? <FrageBild bild={frage.bild} /> : null}

      {frage.art === "auswahl" ? (
        <View style={{ gap: abstand(2.5) }}>
          {!aufgedeckt ? <T v="klein">Eine oder mehrere Antworten sind richtig.</T> : null}
          {frage.antworten.map((antwort, i) => {
            const gewaehlt = auswahl.includes(i);
            let rand: string = farben.linie;
            let flaeche: string = farben.flaeche;
            let marke: string = farben.flaeche3;
            let markeText: string = farben.text2;
            let symbol: keyof typeof Ionicons.glyphMap | null = null;
            let gedimmt = false;
            let gestrichelt = false;

            if (!aufgedeckt && gewaehlt) {
              rand = farben.orange;
              flaeche = farben.orangeSoft;
              marke = farben.orange;
              markeText = farben.aufOrange;
            }
            if (aufgedeckt) {
              if (antwort.richtig && gewaehlt) {
                rand = farben.gruen;
                flaeche = farben.gruenSoft;
                marke = farben.gruen;
                markeText = farben.aufOrange;
                symbol = "checkmark";
              } else if (antwort.richtig) {
                rand = farben.gruen;
                gestrichelt = true;
                symbol = "checkmark";
                markeText = farben.gruen;
              } else if (gewaehlt) {
                rand = farben.rot;
                flaeche = farben.rotSoft;
                marke = farben.rot;
                markeText = farben.aufOrange;
                symbol = "close";
              } else {
                gedimmt = true;
              }
            }

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
                  gap: abstand(3.5),
                  paddingVertical: abstand(3.5),
                  paddingHorizontal: abstand(3.5),
                  borderRadius: radius.m + 2,
                  borderWidth: 1.5,
                  borderStyle: gestrichelt ? "dashed" : "solid",
                  borderColor: rand,
                  backgroundColor: flaeche,
                  opacity: gedimmt ? 0.5 : pressed ? 0.85 : 1,
                })}
              >
                <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: marke, alignItems: "center", justifyContent: "center" }}>
                  {symbol ? (
                    <Ionicons name={symbol} size={17} color={markeText} />
                  ) : (
                    <T v="textStark" farbe={markeText} style={{ fontSize: 14 }}>
                      {BUCHSTABEN[i]}
                    </T>
                  )}
                </View>
                <T v="textStark" style={{ flex: 1, fontFamily: schrift.textMittel, lineHeight: 21 }}>
                  {antwort.text}
                </T>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <ZahlEingabe frage={frage} eingabe={eingabe} onEingabe={onEingabe} aufgedeckt={aufgedeckt} />
      )}

      {aufgedeckt && !ohneErklaerung ? (
        <View style={{ padding: abstand(4), borderRadius: radius.l, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie, gap: abstand(1.5) }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: abstand(1.5) }}>
            <Ionicons name="bulb-outline" size={15} color={farben.gelb} />
            <T v="mini" farbe={farben.gelb}>
              Erklärung
            </T>
          </View>
          <T v="text">{frage.erklaerung}</T>
        </View>
      ) : null}
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
  const rand = !aufgedeckt ? (eingabe ? farben.orange : farben.linieStark) : richtig ? farben.gruen : farben.rot;

  return (
    <View style={{ gap: abstand(2) }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          height: 76,
          paddingHorizontal: abstand(5),
          borderRadius: radius.l,
          borderWidth: 1.5,
          borderColor: rand,
          backgroundColor: aufgedeckt ? (richtig ? farben.gruenSoft : farben.rotSoft) : farben.flaeche,
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
          style={{ flex: 1, fontFamily: schrift.titel, fontSize: 36, color: farben.text, fontVariant: ["tabular-nums"] }}
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
