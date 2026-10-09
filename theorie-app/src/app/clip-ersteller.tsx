import { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FilmSlateIcon } from "phosphor-react-native/src/icons/FilmSlate";
import { LockIcon } from "phosphor-react-native/src/icons/Lock";
import { UserPlusIcon } from "phosphor-react-native/src/icons/UserPlus";
import { XIcon } from "phosphor-react-native/src/icons/X";

import { LeerZustand, Mitte, signal } from "@/components/creator-teile";
import { dialog } from "@/components/dialog";
import { GlasGrund, GlasGruppe, GlasKarte } from "@/components/glas-flaeche";
import { Lader } from "@/components/lader";
import { NutzerBild } from "@/components/profilbild";
import { GrossKopf, Seite } from "@/components/seite";
import { Abschnitt, Eingabe, Knopf, T } from "@/components/ui";
import { erstellerEntfernen, erstellerHinzufuegen, erstellerListe, useClipRechte, vorZeit, type Ersteller } from "@/lib/clips-server";
import { useFarbwelt } from "@/lib/darstellung";
import { erfolg, tippen } from "@/lib/haptik";
import { abstand, mitDeckkraft, RAND, schrift } from "@/lib/theme";

/** Nur für den Inhaber: festlegen, wer außer ihm Clips hochladen darf. */
function Inhalt() {
  const f = useFarbwelt();
  const insets = useSafeAreaInsets();
  const rechte = useClipRechte();
  const [liste, setListe] = useState<Ersteller[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [kennung, setKennung] = useState("");
  const [speichert, setSpeichert] = useState(false);
  const inhalt = { paddingHorizontal: RAND, paddingTop: abstand(4), paddingBottom: insets.bottom + abstand(10) };

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
      dialog("Nicht freigeschaltet", (e as Error).message);
    } finally {
      setSpeichert(false);
    }
  }

  function entfernen(p: Ersteller) {
    tippen();
    dialog(`${p.name || "@" + p.benutzername} entfernen?`, "Die Person kann danach keine neuen Clips mehr hochladen. Ihre bisherigen Clips bleiben online.", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Entfernen",
        style: "destructive",
        onPress: async () => {
          try {
            await erstellerEntfernen(p.id);
            setListe((l) => (l ? l.filter((x) => x.id !== p.id) : l));
          } catch (e) {
            dialog("Nicht entfernt", (e as Error).message);
          }
        },
      },
    ]);
  }

  if (!rechte.inhaber) {
    return (
      <>
        <GrossKopf titel="Clip-Ersteller" />
        <ScrollView contentContainerStyle={inhalt}>
          <Mitte>
            <LeerZustand symbol={LockIcon} titel="Nur für den Inhaber" text="Hier legt der Inhaber der App fest, wer Clips hochladen darf." />
          </Mitte>
        </ScrollView>
      </>
    );
  }

  const rot = signal(f).rot;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <GrossKopf titel="Clip-Ersteller" unter="Wer Clips hochladen darf" />
      <ScrollView contentContainerStyle={inhalt} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
        <Mitte style={{ gap: abstand(7) }}>
          {/* Person freischalten */}
          <GlasKarte style={{ borderRadius: 24, padding: 18, gap: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
              <UserPlusIcon size={18} color={f.orange} weight="fill" />
              <Text style={{ ...schrift.textHalb, fontSize: 15, color: f.text }}>Person freischalten</Text>
            </View>
            <Text style={{ ...schrift.text, fontSize: 14, lineHeight: 20, color: f.text2, marginTop: -6 }}>
              Wer hier steht, kann in Fahrschul Pro Clips hochladen. Du als Inhaber kannst es immer. Die Person braucht ein Konto – gib ihren Benutzernamen oder ihre E-Mail ein.
            </Text>
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
          </GlasKarte>

          <View>
            <Abschnitt titel={liste?.length ? `Freigeschaltet · ${liste.length}` : "Freigeschaltet"} klein />
            {liste == null ? (
              fehler ? (
                <GlasKarte style={{ padding: 18, gap: abstand(3) }}>
                  <T v="klein" farbe={rot}>
                    {fehler}
                  </T>
                  <Knopf titel="Nochmal laden" klein art="sekundaer" onPress={laden} />
                </GlasKarte>
              ) : (
                <Lader color={f.text3} style={{ alignSelf: "center", marginTop: 20 }} />
              )
            ) : liste.length === 0 ? (
              <LeerZustand symbol={FilmSlateIcon} titel="Noch niemand" text="Bisher kannst nur du Clips hochladen." />
            ) : (
              <GlasGruppe>
                {liste.map((p) => (
                  <View key={p.id} style={{ flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 12, paddingHorizontal: 14 }}>
                    <NutzerBild pfad={p.bild_pfad} name={p.benutzername} farbe={p.avatar_farbe} groesse={46} rand={0} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 16, color: f.text }}>
                        {p.name || p.benutzername}
                      </Text>
                      <Text numberOfLines={1} style={{ ...schrift.text, fontSize: 13.5, color: f.text3 }}>
                        @{p.benutzername} · {vorZeit(p.hinzugefuegt_am)}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => entfernen(p)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={`${p.benutzername} entfernen`}
                      style={({ pressed }) => ({ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: mitDeckkraft(rot, f.hell ? 0.1 : 0.16), opacity: pressed ? 0.6 : 1 })}
                    >
                      <XIcon size={15} color={rot} weight="bold" />
                    </Pressable>
                  </View>
                ))}
              </GlasGruppe>
            )}
          </View>
        </Mitte>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function ClipErsteller() {
  return (
    <Seite>
      <GlasGrund />
      <Inhalt />
    </Seite>
  );
}
