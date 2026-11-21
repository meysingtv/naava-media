import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { dialog } from "@/components/dialog";
import { Icon } from "@/components/icon";
import { Lader } from "@/components/lader";
import { NutzerBild } from "@/components/profilbild";
import { GrossKopf, Seite } from "@/components/seite";
import { kartenFlaeche, T } from "@/components/ui";
import { blockiertListe, entblocken, type BlockierterNutzer } from "@/lib/blockieren";
import { useDarstellung } from "@/lib/darstellung";
import { abstand, RAND, schrift } from "@/lib/theme";

// Wen ich blockiert habe – mit „Aufheben“ je Person.

export default function Blockiert() {
  const insets = useSafeAreaInsets();
  const { farbwelt: f } = useDarstellung();
  const [liste, setListe] = useState<BlockierterNutzer[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);

  const laden = useCallback(() => {
    blockiertListe()
      .then((l) => {
        setListe(l);
        setFehler(null);
      })
      .catch((e: Error) => setFehler(e.message));
  }, []);

  useFocusEffect(laden);

  function aufheben(n: BlockierterNutzer) {
    const wer = n.name || n.benutzername;
    dialog(`${wer} nicht mehr blockieren?`, `Du siehst Clips, Kommentare und Chat-Nachrichten von ${wer} dann wieder.`, [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Aufheben",
        onPress: async () => {
          const problem = await entblocken(n.id);
          if (problem) dialog("Nicht aufgehoben", problem);
          else setListe((l) => (l ? l.filter((x) => x.id !== n.id) : l));
        },
      },
    ]);
  }

  return (
    <Seite>
      <GrossKopf titel="Blockierte Personen" unter="Von ihnen siehst du keine Clips, Kommentare und Chat-Nachrichten" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: abstand(4), paddingBottom: insets.bottom + abstand(8), gap: abstand(2.5) }} showsVerticalScrollIndicator={false}>
        {fehler ? (
          <T v="text">{fehler}</T>
        ) : liste == null ? (
          <Lader color={f.text3} style={{ marginTop: 30 }} />
        ) : liste.length === 0 ? (
          <View style={{ alignItems: "center", gap: 10, paddingTop: 40, paddingHorizontal: 24 }}>
            <Icon name="people-outline" size={30} color={f.text3} />
            <T v="text" zentriert>
              Du hast niemanden blockiert. Blockieren kannst du über das Menü an einem Clip, einem Kommentar oder im Profil einer Person.
            </T>
          </View>
        ) : (
          liste.map((n) => (
            <View key={n.id} style={[{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 20 }, kartenFlaeche(f)]}>
              <NutzerBild pfad={n.bild_pfad} name={n.name || n.benutzername} farbe={n.avatar_farbe} groesse={44} />
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 15.5, color: f.text }}>
                  {n.name || n.benutzername}
                </Text>
                <Text numberOfLines={1} style={{ ...schrift.text, fontSize: 13, color: f.text3 }}>
                  @{n.benutzername}
                </Text>
              </View>
              <Pressable
                onPress={() => aufheben(n)}
                accessibilityRole="button"
                accessibilityLabel={`${n.name || n.benutzername} nicht mehr blockieren`}
                style={({ pressed }) => ({ height: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: "center", backgroundColor: f.flaeche2, borderWidth: 1, borderColor: f.linieStark, opacity: pressed ? 0.7 : 1 })}
              >
                <Text style={{ ...schrift.textHalb, fontSize: 14, color: f.text }}>Aufheben</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </Seite>
  );
}
