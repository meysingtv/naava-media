import { useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { FlipKarte } from "@/components/karteikarte";
import { AktionsLeiste, HauptKnopf } from "@/components/frage-rahmen";
import { Seite } from "@/components/seite";
import { Kopf, KopfTaste, T } from "@/components/ui";
import { Verkehrszeichen, ZEICHEN_INFO } from "@/components/zeichen";
import { dialog } from "@/components/dialog";
import { useDarstellung, useFarbwelt } from "@/lib/darstellung";
import type { ZeichenKey } from "@/lib/fragen";
import { erfolg, tippen } from "@/lib/haptik";
import { useStand } from "@/lib/stand";
import { farben, leuchten, mitDeckkraft, RAND, schrift } from "@/lib/theme";
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
  const f = useFarbwelt();
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <T v="mini">{titel}</T>
        <Text style={{ ...schrift.textMittel, fontSize: 12, color: wert.length > max * 0.9 ? f.orange : f.text3, fontVariant: ["tabular-nums"] }}>
          {wert.length}/{max}
        </Text>
      </View>
      <TextInput
        value={wert}
        onChangeText={(t) => onWechsel(t.slice(0, max))}
        placeholder={platzhalter}
        placeholderTextColor={f.hell ? "#A3A8AF" : farben.text4}
        selectionColor={f.orange}
        cursorColor={f.orange}
        selectionHandleColor={f.orange}
        keyboardAppearance={f.hell ? "light" : "dark"}
        multiline
        autoFocus={autoFocus}
        textAlignVertical="top"
        style={[
          {
            minHeight: hoehe,
            padding: 16,
            paddingTop: 16,
            borderRadius: 20,
            backgroundColor: f.hell ? "#FFFFFF" : f.flaeche,
            borderWidth: 1,
            borderColor: wert ? mitDeckkraft(f.orange, 0.45) : f.hell ? "rgba(20,23,27,0.08)" : farben.linieStark,
            ...schrift.textMittel,
            fontSize: 16.5,
            lineHeight: 22,
            color: f.text,
          },
          f.hell ? leuchten("#3C2C18", 0.05, 8, 2) : null,
        ]}
      />
    </View>
  );
}

/** Eigene Karteikarte schreiben oder ändern – optional mit Verkehrszeichen vorn. */
export default function KarteBearbeiten() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const { farbwelt: f } = useDarstellung();
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
    dialog("Änderungen verwerfen?", "Die Karte ist noch nicht gespeichert.", [
      { text: "Weiter schreiben", style: "cancel" },
      { text: "Verwerfen", style: "destructive", onPress: () => router.back() },
    ]);
  }

  useZurueckTaste(schliessen);

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

  return (
    <Seite>
      <Kopf
        titel={altEigen ? "Karte bearbeiten" : "Neue Karte"}
        schliessen
        onZurueck={schliessen}
        rechts={altEigen ? <KopfTaste icon="trash-outline" farbe={f.hell ? "#E5392C" : farben.rot} label="Karte löschen" onPress={loeschen} /> : undefined}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: 8, paddingBottom: 32, gap: 22 }} keyboardShouldPersistTaps="handled">
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
                  <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 12.5, color: f.orange, flexShrink: 1 }}>
                    {zeichenName}
                  </Text>
                  <Icon name="close-circle" size={15} color={f.orange} />
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
                    style={[
                      {
                        width: 60,
                        height: 60,
                        borderRadius: 18,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: aktiv ? f.orangeSoft : f.hell ? "#FFFFFF" : f.flaeche,
                        borderWidth: aktiv ? 2 : f.hell ? 0 : 1,
                        borderColor: aktiv ? f.orange : f.linie,
                      },
                      f.hell && !aktiv ? leuchten("#3C2C18", 0.06, 6, 2) : null,
                    ]}
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
        <AktionsLeiste unten={insets.bottom}>
          <HauptKnopf titel={altEigen ? "Speichern" : "Karte speichern"} icon="checkmark" deaktiviert={!fertig} onPress={speichern} style={{ flex: 1 }} />
        </AktionsLeiste>
      </KeyboardAvoidingView>
    </Seite>
  );
}
