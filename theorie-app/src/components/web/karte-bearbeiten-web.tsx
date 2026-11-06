import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View, type ViewStyle } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { dialog } from "@/components/dialog";
import { Icon } from "@/components/icon";
import { Abschnitt, B, Kachel, Knopf, n, Reiter, Spalte, UnterKopf, type Zustand } from "@/components/web/bunt";
import { useTasten } from "@/components/web/frage-web";
import { KarteWeb, TastenKappe } from "@/components/web/karteikarten-web";
import { WebSeite } from "@/components/web/rahmen";
import { Verkehrszeichen, ZEICHEN_INFO, type ZeichenInfo } from "@/components/zeichen";
import type { ZeichenKey } from "@/lib/fragen";
import { useStand } from "@/lib/stand";

// Eigene Karteikarte am PC: links Vorder- und Rückseite und die Zeichen zur
// Auswahl, rechts die Karte als Vorschau zum Umdrehen.
// Tastatur: Strg/⌘ + Enter speichert, Esc schließt.

const MAX_VORNE = 200;
const MAX_HINTEN = 400;

type Gruppe = "alle" | ZeichenInfo["gruppe"];

const GRUPPEN: { id: Gruppe; titel: string }[] = [
  { id: "alle", titel: "Alle" },
  { id: "gefahr", titel: "Gefahr" },
  { id: "vorschrift", titel: "Vorschrift" },
  { id: "richt", titel: "Richtzeichen" },
];

function Feld({ titel, wert, onWechsel, platzhalter, max, hoehe, autoFocus }: { titel: string; wert: string; onWechsel: (t: string) => void; platzhalter: string; max: number; hoehe: number; autoFocus?: boolean }) {
  const [fokus, setFokus] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Text style={{ ...n.fett, fontSize: 14.5, color: B.text2 }}>{titel}</Text>
        <Text style={{ ...n.halb, fontSize: 13, color: wert.length > max * 0.9 ? B.orangeKante : B.text3, fontVariant: ["tabular-nums"] }}>
          {wert.length}/{max}
        </Text>
      </View>
      <TextInput
        value={wert}
        onChangeText={(t) => onWechsel(t.slice(0, max))}
        placeholder={platzhalter}
        placeholderTextColor={B.text3}
        multiline
        autoFocus={autoFocus}
        onFocus={() => setFokus(true)}
        onBlur={() => setFokus(false)}
        style={{
          minHeight: hoehe,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: fokus ? B.orange : B.linie,
          backgroundColor: fokus ? B.flaeche : B.ton,
          ...n.halb,
          fontSize: 16.5,
          lineHeight: 23,
          color: B.text,
          outlineWidth: 0,
          textAlignVertical: "top",
        }}
      />
    </View>
  );
}

export function KarteBearbeitenWeb() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { stand, eigeneKarteSpeichern, karteLoeschen } = useStand();
  const alt = id ? stand.karteikarten.karten.find((k) => k.id === id && k.art === "eigen") : undefined;
  const altEigen = alt?.art === "eigen" ? alt : undefined;

  const [vorne, setVorne] = useState(altEigen?.vorne ?? "");
  const [hinten, setHinten] = useState(altEigen?.hinten ?? "");
  const [zeichen, setZeichen] = useState<ZeichenKey | undefined>(altEigen?.zeichen);
  const [umgedreht, setUmgedreht] = useState(false);
  const [gruppe, setGruppe] = useState<Gruppe>("alle");

  const fertig = vorne.trim().length > 0 && hinten.trim().length > 0;
  const zeichenName = zeichen ? ZEICHEN_INFO.find((z) => z.key === zeichen)?.name : undefined;
  const liste = ZEICHEN_INFO.filter((z) => gruppe === "alle" || z.gruppe === gruppe);

  function speichern() {
    if (!fertig) return;
    eigeneKarteSpeichern({ id: altEigen?.id, vorne, hinten, zeichen });
    router.back();
  }

  function schliessen() {
    const geaendert = altEigen ? vorne !== altEigen.vorne || hinten !== altEigen.hinten || zeichen !== altEigen.zeichen : vorne.trim() || hinten.trim();
    if (!geaendert) {
      router.back();
      return;
    }
    dialog("Änderungen verwerfen?", "Die Karte ist noch nicht gespeichert.", [
      { text: "Weiter schreiben", style: "cancel" },
      { text: "Verwerfen", style: "destructive", onPress: () => router.back() },
    ]);
  }

  function loeschen() {
    if (!altEigen) return;
    dialog("Karte löschen?", "Die Karte ist danach weg.", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen",
        style: "destructive",
        onPress: () => {
          karteLoeschen(altEigen.id);
          router.back();
        },
      },
    ]);
  }

  useTasten((e) => {
    if (e.key === "Escape") schliessen();
    else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      speichern();
    }
  });

  return (
    <WebSeite ohneRechts>
      <Spalte>
        <UnterKopf
          titel={altEigen ? "Karte bearbeiten" : "Neue Karte"}
          unter="Vorn die Frage, hinten die Antwort – auf Wunsch mit Verkehrszeichen"
          onZurueck={schliessen}
          rechts={
            <View style={{ flexDirection: "row", gap: 10 }}>
              {altEigen ? <Knopf titel="Löschen" icon="trash" art="rand" ton="rot" onPress={loeschen} /> : null}
              <Knopf titel={altEigen ? "Speichern" : "Karte speichern"} icon="checkmark" ton="gruen" deaktiviert={!fertig} onPress={speichern} />
            </View>
          }
        />

        <View style={{ flexDirection: "row", gap: 32, alignItems: "flex-start" }}>
          <View style={{ flex: 1, minWidth: 0, gap: 24 }}>
            <Feld titel="Vorderseite" wert={vorne} onWechsel={setVorne} platzhalter="Frage oder Begriff, z. B. „Was gilt bei Zeichen 205?“" max={MAX_VORNE} hoehe={104} autoFocus={!altEigen} />
            <Feld titel="Rückseite" wert={hinten} onWechsel={setHinten} platzhalter="Antwort oder Merksatz" max={MAX_HINTEN} hoehe={140} />

            <Kachel style={{ padding: 20, gap: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <View>
                  <Text style={{ ...n.schwarz, fontSize: 17, color: B.text }}>Zeichen auf der Vorderseite</Text>
                  <Text style={{ ...n.halb, fontSize: 13.5, color: B.text3 }}>{zeichenName ? "Ausgewählt" : "Optional – klick ein Zeichen an"}</Text>
                </View>
                {zeichenName ? (
                  <Pressable
                    onPress={() => setZeichen(undefined)}
                    accessibilityLabel="Zeichen entfernen"
                    style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 8, height: 36, paddingLeft: 6, paddingRight: 12, borderRadius: 12, borderWidth: 1.5, borderColor: z.hovered ? B.kante : B.linie })}
                  >
                    {zeichen ? <Verkehrszeichen zeichen={zeichen} groesse={24} /> : null}
                    <Text numberOfLines={1} style={{ ...n.fett, fontSize: 14, color: B.text, maxWidth: 220 }}>
                      {zeichenName}
                    </Text>
                    <Icon name="close" size={16} color={B.text3} />
                  </Pressable>
                ) : null}
              </View>
              <Reiter optionen={GRUPPEN.map((g) => ({ id: g.id, titel: g.titel, zahl: ZEICHEN_INFO.filter((z) => g.id === "alle" || z.gruppe === g.id).length }))} wert={gruppe} onWechsel={setGruppe} />
              <ScrollView style={{ maxHeight: 292 }} contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {liste.map((z) => {
                  const aktiv = z.key === zeichen;
                  return (
                    <Pressable
                      key={z.key}
                      onPress={() => setZeichen(aktiv ? undefined : z.key)}
                      accessibilityLabel={z.name}
                      accessibilityState={{ selected: aktiv }}
                      style={(s: Zustand) => ({
                        width: 64,
                        height: 64,
                        borderRadius: 14,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: aktiv ? 2 : 1.5,
                        borderColor: aktiv ? B.orange : s.hovered ? B.kante : B.linie,
                        backgroundColor: aktiv ? B.orangeHell : B.flaeche,
                      })}
                    >
                      <Verkehrszeichen zeichen={z.key} groesse={40} />
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Kachel>
          </View>

          <View style={{ width: 420, gap: 14, position: "sticky" as ViewStyle["position"], top: 0 }}>
            <Abschnitt titel="Vorschau" link={umgedreht ? "Rückseite" : "Vorderseite"} />
            <KarteWeb inhalt={{ id: "vorschau", art: "eigen", vorne: vorne.trim() || "Deine Frage", hinten: hinten.trim() || "Deine Antwort", zeichen }} umgedreht={umgedreht} onDruck={() => setUmgedreht((u) => !u)} style={{ height: 460 }} />
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }}>
              <TastenKappe text="Strg" />
              <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>+</Text>
              <TastenKappe text="Enter" />
              <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>speichert</Text>
              <View style={{ width: 10 }} />
              <TastenKappe text="Esc" />
              <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>schließt</Text>
            </View>
          </View>
        </View>
      </Spalte>
    </WebSeite>
  );
}
