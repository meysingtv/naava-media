import { useState } from "react";
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { FlipKarte } from "@/components/karteikarte";
import { Knopf, Kopf, KopfTaste, T } from "@/components/ui";
import { Verkehrszeichen, ZEICHEN_INFO } from "@/components/zeichen";
import type { ZeichenKey } from "@/lib/fragen";
import { erfolg, tippen } from "@/lib/haptik";
import { useStand } from "@/lib/stand";
import { abstand, farben, RAND, schrift } from "@/lib/theme";
import { useZurueckTaste } from "@/lib/zurueck-taste";

const MAX_VORNE = 200;
const MAX_HINTEN = 400;

function Feld({
  titel,
  wert,
  onWechsel,
  platzhalter,
  max,
  hoehe,
  autoFocus,
}: {
  titel: string;
  wert: string;
  onWechsel: (t: string) => void;
  platzhalter: string;
  max: number;
  hoehe: number;
  autoFocus?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <T v="mini">{titel}</T>
        <Text style={{ ...schrift.textMittel, fontSize: 12, color: wert.length > max * 0.9 ? farben.orange : farben.text4, fontVariant: ["tabular-nums"] }}>
          {wert.length}/{max}
        </Text>
      </View>
      <TextInput
        value={wert}
        onChangeText={(t) => onWechsel(t.slice(0, max))}
        placeholder={platzhalter}
        placeholderTextColor={farben.text4}
        selectionColor={farben.orange}
        keyboardAppearance="dark"
        multiline
        autoFocus={autoFocus}
        textAlignVertical="top"
        style={{
          minHeight: hoehe,
          padding: 14,
          paddingTop: 14,
          borderRadius: 16,
          backgroundColor: farben.flaeche,
          borderWidth: 1,
          borderColor: wert ? "rgba(252,91,14,0.45)" : farben.linieStark,
          ...schrift.textMittel,
          fontSize: 16.5,
          lineHeight: 22,
          color: farben.text,
        }}
      />
    </View>
  );
}

/** Eigene Karteikarte schreiben oder ändern – optional mit Verkehrszeichen vorn. */
export default function KarteBearbeiten() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const { stand, eigeneKarteSpeichern, karteLoeschen } = useStand();
  const alt = id ? stand.karteikarten.karten.find((k) => k.id === id && k.art === "eigen") : undefined;
  const altEigen = alt?.art === "eigen" ? alt : undefined;

  const [vorne, setVorne] = useState(altEigen?.vorne ?? "");
  const [hinten, setHinten] = useState(altEigen?.hinten ?? "");
  const [zeichen, setZeichen] = useState<ZeichenKey | undefined>(altEigen?.zeichen);
  const [umgedreht, setUmgedreht] = useState(false);

  const fertig = vorne.trim().length > 0 && hinten.trim().length > 0;
  const zeichenName = zeichen ? ZEICHEN_INFO.find((z) => z.key === zeichen)?.name : undefined;

  function speichern() {
    if (!fertig) return;
    eigeneKarteSpeichern({ id: altEigen?.id, vorne, hinten, zeichen });
    erfolg();
    router.back();
  }

  function schliessen() {
    const geaendert = altEigen ? vorne !== altEigen.vorne || hinten !== altEigen.hinten || zeichen !== altEigen.zeichen : vorne.trim() || hinten.trim();
    if (!geaendert) {
      router.back();
      return;
    }
    Alert.alert("Änderungen verwerfen?", "Die Karte ist noch nicht gespeichert.", [
      { text: "Weiter schreiben", style: "cancel" },
      { text: "Verwerfen", style: "destructive", onPress: () => router.back() },
    ]);
  }

  useZurueckTaste(schliessen);

  function loeschen() {
    if (!altEigen) return;
    Alert.alert("Karte löschen?", "Die Karte ist danach weg.", [
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

  return (
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <Kopf
        titel={altEigen ? "Karte bearbeiten" : "Neue Karte"}
        schliessen
        onZurueck={schliessen}
        rechts={altEigen ? <KopfTaste icon="trash-outline" farbe={farben.rot} label="Karte löschen" onPress={loeschen} /> : undefined}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: abstand(2), paddingBottom: abstand(8), gap: 20 }} keyboardShouldPersistTaps="handled">
          <Feld titel="Vorderseite" wert={vorne} onWechsel={setVorne} platzhalter="Frage oder Begriff, z. B. „Was gilt bei Zeichen 205?“" max={MAX_VORNE} hoehe={96} autoFocus={!altEigen} />
          <Feld titel="Rückseite" wert={hinten} onWechsel={setHinten} platzhalter="Antwort oder Merksatz" max={MAX_HINTEN} hoehe={120} />

          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <T v="mini">Zeichen auf der Vorderseite</T>
              {zeichenName ? (
                <Pressable
                  onPress={() => {
                    tippen();
                    setZeichen(undefined);
                  }}
                  hitSlop={8}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4, maxWidth: "55%" }}
                >
                  <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 12.5, color: farben.orange, flexShrink: 1 }}>
                    {zeichenName}
                  </Text>
                  <Icon name="close-circle" size={15} color={farben.orange} />
                </Pressable>
              ) : (
                <T v="klein" style={{ fontSize: 12 }}>
                  optional
                </T>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }} style={{ marginHorizontal: -RAND }} keyboardShouldPersistTaps="handled">
              <View style={{ width: RAND - 8 }} />
              {ZEICHEN_INFO.map((z) => {
                const aktiv = z.key === zeichen;
                return (
                  <Pressable
                    key={z.key}
                    onPress={() => {
                      tippen();
                      setZeichen(aktiv ? undefined : z.key);
                    }}
                    accessibilityLabel={z.name}
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 14,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: aktiv ? farben.orangeSoft : farben.flaeche,
                      borderWidth: aktiv ? 2 : 1,
                      borderColor: aktiv ? farben.orange : "rgba(255,255,255,0.08)",
                    }}
                  >
                    <Verkehrszeichen zeichen={z.key} groesse={38} />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {vorne.trim() || hinten.trim() ? (
            <View style={{ gap: 10 }}>
              <T v="mini">Vorschau · tippen zum Umdrehen</T>
              <FlipKarte
                inhalt={{ id: "vorschau", art: "eigen", vorne: vorne.trim() || "…", hinten: hinten.trim() || "…", zeichen }}
                umgedreht={umgedreht}
                onDruck={() => setUmgedreht((u) => !u)}
                style={{ height: zeichen ? 380 : 300 }}
              />
            </View>
          ) : null}
        </ScrollView>
        <View style={{ paddingHorizontal: RAND, paddingTop: abstand(2), paddingBottom: insets.bottom + abstand(3), borderTopWidth: 1, borderColor: farben.linie, backgroundColor: farben.grund }}>
          <Knopf titel={altEigen ? "Speichern" : "Karte speichern"} icon="checkmark" deaktiviert={!fertig} onPress={speichern} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
