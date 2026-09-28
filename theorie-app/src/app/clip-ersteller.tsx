import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { NutzerBild } from "@/components/profilbild";
import { Eingabe, Gruppe, Knopf, Kopf, T } from "@/components/ui";
import { erstellerEntfernen, erstellerHinzufuegen, erstellerListe, useClipRechte, type Ersteller } from "@/lib/clips-server";
import { erfolg, tippen } from "@/lib/haptik";
import { abstand, farben, RAND } from "@/lib/theme";

/** Nur für den Inhaber: festlegen, wer außer ihm Clips hochladen darf. */
export default function ClipErsteller() {
  const insets = useSafeAreaInsets();
  const rechte = useClipRechte();
  const [liste, setListe] = useState<Ersteller[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [kennung, setKennung] = useState("");
  const [speichert, setSpeichert] = useState(false);

  const laden = useCallback(async () => {
    try {
      setListe(await erstellerListe());
      setFehler(null);
    } catch (e) {
      setFehler((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (rechte.inhaber) laden();
  }, [rechte.inhaber, laden]);

  async function hinzufuegen() {
    if (!kennung.trim() || speichert) return;
    setSpeichert(true);
    try {
      await erstellerHinzufuegen(kennung);
      erfolg();
      setKennung("");
      await laden();
    } catch (e) {
      Alert.alert("Nicht freigeschaltet", (e as Error).message);
    } finally {
      setSpeichert(false);
    }
  }

  function entfernen(p: Ersteller) {
    tippen();
    Alert.alert(`${p.name || "@" + p.benutzername} entfernen?`, "Die Person kann danach keine neuen Clips mehr hochladen. Ihre bisherigen Clips bleiben online.", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Entfernen",
        style: "destructive",
        onPress: async () => {
          try {
            await erstellerEntfernen(p.id);
            setListe((l) => (l ? l.filter((x) => x.id !== p.id) : l));
          } catch (e) {
            Alert.alert("Nicht entfernt", (e as Error).message);
          }
        },
      },
    ]);
  }

  if (!rechte.inhaber) {
    return (
      <View style={{ flex: 1, backgroundColor: farben.grund }}>
        <Kopf titel="Clip-Ersteller" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: RAND * 2, gap: abstand(3) }}>
          <Icon name="lock-closed" size={34} color={farben.text3} />
          <T v="h2" zentriert>
            Nur für den Inhaber
          </T>
          <T v="text" zentriert>
            Hier legt der Inhaber der App fest, wer Clips hochladen darf.
          </T>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: farben.grund }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Kopf titel="Clip-Ersteller" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingBottom: insets.bottom + abstand(10), gap: abstand(6) }} keyboardShouldPersistTaps="handled">
        <T v="text">
          Wer hier steht, kann in Fahrschule Pro Clips hochladen. Du als Inhaber kannst es immer. Die Person braucht ein Konto – gib ihren Benutzernamen oder ihre E-Mail ein.
        </T>

        <View style={{ gap: abstand(3) }}>
          <Eingabe
            icon="person-add-outline"
            value={kennung}
            onChangeText={setKennung}
            placeholder="Benutzername oder E-Mail"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="done"
            onSubmitEditing={hinzufuegen}
          />
          <Knopf titel="Freischalten" icon="checkmark" laedt={speichert} deaktiviert={!kennung.trim()} onPress={hinzufuegen} />
        </View>

        <View style={{ gap: abstand(3) }}>
          <T v="h3">Freigeschaltet</T>
          {liste == null ? (
            fehler ? (
              <View style={{ gap: abstand(3) }}>
                <T v="klein" farbe={farben.rot}>
                  {fehler}
                </T>
                <Knopf titel="Nochmal laden" klein art="sekundaer" onPress={laden} />
              </View>
            ) : (
              <ActivityIndicator color={farben.text} style={{ alignSelf: "flex-start" }} />
            )
          ) : liste.length === 0 ? (
            <T v="klein">Noch niemand – bisher kannst nur du Clips hochladen.</T>
          ) : (
            <Gruppe>
              {liste.map((p) => (
                <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: abstand(3), paddingVertical: abstand(3), paddingHorizontal: abstand(4) }}>
                  <NutzerBild pfad={p.bild_pfad} name={p.benutzername} farbe={p.avatar_farbe} groesse={38} rand={1} />
                  <View style={{ flex: 1 }}>
                    <T v="textStark" numberOfLines={1}>
                      {p.name || p.benutzername}
                    </T>
                    <T v="klein" numberOfLines={1}>
                      @{p.benutzername}
                    </T>
                  </View>
                  <Pressable onPress={() => entfernen(p)} hitSlop={10} accessibilityLabel={`${p.benutzername} entfernen`}>
                    <Icon name="close-circle" size={24} color={farben.text3} />
                  </Pressable>
                </View>
              ))}
            </Gruppe>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
