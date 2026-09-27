import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { NutzerBild } from "@/components/profilbild";
import { kommentareLaden, kommentarLoeschen, kommentieren, kurzeZahl, vorZeit, type ClipEintrag, type Kommentar } from "@/lib/clips-server";
import { stoss, tippen } from "@/lib/haptik";
import { farben, schrift } from "@/lib/theme";

const BLATT = "#121518";

/**
 * Kommentare zu einem Clip – schiebt sich von unten über das Video, das oben
 * weiterläuft. Eigene Kommentare (und als Autor/Inhaber alle) lassen sich per
 * langem Druck löschen.
 */
export function KommentarBlatt({
  clip,
  angemeldet,
  onSchliessen,
  onAnzahl,
  onAnmelden,
}: {
  clip: ClipEintrag | null;
  angemeldet: boolean;
  onSchliessen: () => void;
  onAnzahl: (clipId: string, aenderung: number) => void;
  onAnmelden: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [liste, setListe] = useState<Kommentar[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sendet, setSendet] = useState(false);
  const eingabe = useRef<TextInput>(null);
  const clipId = clip?.id ?? null;

  useEffect(() => {
    if (!clipId) return;
    setListe(null);
    setFehler(null);
    setText("");
    let aktiv = true;
    kommentareLaden(clipId)
      .then((l) => aktiv && setListe(l))
      .catch((e: Error) => aktiv && setFehler(e.message));
    return () => {
      aktiv = false;
    };
  }, [clipId]);

  async function senden() {
    const inhalt = text.trim();
    if (!clipId || !inhalt || sendet) return;
    setSendet(true);
    try {
      await kommentieren(clipId, inhalt);
      stoss();
      setText("");
      onAnzahl(clipId, 1);
      setListe(await kommentareLaden(clipId));
    } catch (e) {
      Alert.alert("Nicht gesendet", (e as Error).message);
    } finally {
      setSendet(false);
    }
  }

  function loeschenFragen(k: Kommentar) {
    if (!k.loeschbar || !clipId) return;
    tippen();
    Alert.alert("Kommentar löschen?", k.inhalt, [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen",
        style: "destructive",
        onPress: async () => {
          try {
            await kommentarLoeschen(k.id);
            setListe((l) => (l ? l.filter((x) => x.id !== k.id) : l));
            onAnzahl(clipId, -1);
          } catch (e) {
            Alert.alert("Nicht gelöscht", (e as Error).message);
          }
        },
      },
    ]);
  }

  const anzahl = clip?.kommentare ?? 0;

  return (
    <Modal visible={clip != null} transparent animationType="slide" onRequestClose={onSchliessen} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onSchliessen} accessibilityLabel="Kommentare schließen" />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={{ height: Math.round(height * 0.64), backgroundColor: BLATT, borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: "hidden" }}>
            {/* Kopf */}
            <View style={{ height: 50, alignItems: "center", justifyContent: "center", borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" }}>
              <View style={{ position: "absolute", top: 6, width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.18)" }} />
              <Text style={{ ...schrift.textHalb, fontSize: 14.5, color: "#FFFFFF" }}>
                {anzahl === 1 ? "1 Kommentar" : `${kurzeZahl(anzahl)} Kommentare`}
              </Text>
              <Pressable onPress={onSchliessen} hitSlop={10} accessibilityLabel="Schließen" style={{ position: "absolute", right: 14, top: 13 }}>
                <Icon name="close" size={22} color="#D3D7DC" />
              </Pressable>
            </View>

            {/* Liste */}
            {liste == null ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                {fehler ? <Text style={{ ...schrift.text, fontSize: 14, color: farben.text3, paddingHorizontal: 24, textAlign: "center" }}>{fehler}</Text> : <ActivityIndicator color="#FFFFFF" />}
              </View>
            ) : liste.length === 0 ? (
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 32 }}>
                <Icon name="chatbubble-ellipses" sf="ellipsis.bubble" size={36} color={farben.text4} />
                <Text style={{ ...schrift.textHalb, fontSize: 16, color: "#FFFFFF" }}>Noch keine Kommentare</Text>
                <Text style={{ ...schrift.text, fontSize: 14, color: farben.text3, textAlign: "center" }}>Schreib den ersten – Fragen zum Clip sind auch willkommen.</Text>
              </View>
            ) : (
              <FlatList
                data={liste}
                keyExtractor={(k) => k.id}
                contentContainerStyle={{ paddingVertical: 10 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item: k }) => (
                  <Pressable onLongPress={() => loeschenFragen(k)} delayLongPress={350} style={({ pressed }) => ({ flexDirection: "row", gap: 11, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: pressed && k.loeschbar ? "rgba(255,255,255,0.04)" : "transparent" })}>
                    <NutzerBild pfad={k.autor_bild} name={k.autor_benutzername} farbe={k.autor_farbe} groesse={34} rand={1} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ ...schrift.textMittel, fontSize: 13, color: farben.text3 }}>
                        @{k.autor_benutzername} · {vorZeit(k.erstellt_am)}
                      </Text>
                      <Text style={{ ...schrift.text, fontSize: 15, lineHeight: 20, color: "#FFFFFF" }}>{k.inhalt}</Text>
                    </View>
                  </Pressable>
                )}
              />
            )}

            {/* Eingabe */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 10), borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" }}>
              {angemeldet ? (
                <>
                  <View style={{ flex: 1, minHeight: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 16, justifyContent: "center" }}>
                    <TextInput
                      ref={eingabe}
                      value={text}
                      onChangeText={setText}
                      placeholder="Kommentar hinzufügen …"
                      placeholderTextColor={farben.text4}
                      selectionColor={farben.orange}
                      keyboardAppearance="dark"
                      maxLength={500}
                      multiline
                      style={{ ...schrift.text, fontSize: 15, color: "#FFFFFF", maxHeight: 96, paddingVertical: 10 }}
                    />
                  </View>
                  <Pressable
                    onPress={senden}
                    disabled={!text.trim() || sendet}
                    accessibilityLabel="Senden"
                    style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: text.trim() ? farben.orange : "rgba(255,255,255,0.1)" }}
                  >
                    {sendet ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Icon name="arrow-up" sf="arrow.up" size={20} color="#FFFFFF" weight="bold" />}
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={() => {
                    tippen();
                    onAnmelden();
                  }}
                  style={{ flex: 1, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ ...schrift.textHalb, fontSize: 15, color: "#FFFFFF" }}>Zum Kommentieren anmelden</Text>
                </Pressable>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
