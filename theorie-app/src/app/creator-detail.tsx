import { useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, ScrollView, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Absatz, Eintrag } from "@/components/creator-teile";
import { dialog } from "@/components/dialog";
import { Lader } from "@/components/lader";
import { GrossKopf, Seite } from "@/components/seite";
import { Abschnitt, Gruppe, Knopf, T, Zeile } from "@/components/ui";
import { useClipRechte, vorZeit } from "@/lib/clips-server";
import { creatorEntscheiden, creatorEntziehen, STATUS_TEXT, useBewerbungen } from "@/lib/creator";
import { useFarbwelt } from "@/lib/darstellung";
import { erfolg } from "@/lib/haptik";
import { liveSofortBeenden } from "@/lib/live";
import { abstand, farben, RAND, schrift } from "@/lib/theme";

// Eine Bewerbung aus Sicht des Inhabers: alle Angaben, annehmen oder ablehnen,
// laufendes Live beenden, Zugang entziehen. Aktualisiert sich in Echtzeit.

function oeffnen(url: string) {
  Linking.openURL(url).catch(() => dialog("Geht hier nicht", "Auf diesem Gerät lässt sich das nicht öffnen."));
}

function Inhalt() {
  const f = useFarbwelt();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const rechte = useClipRechte();
  const { liste } = useBewerbungen(rechte.inhaber);
  const [notiz, setNotiz] = useState("");
  const [laeuft, setLaeuft] = useState<string | null>(null);
  const b = liste?.find((x) => x.id === id) ?? null;
  const inhalt = { paddingHorizontal: RAND, paddingTop: abstand(4), paddingBottom: insets.bottom + abstand(10), gap: abstand(7) };

  if (!rechte.inhaber || !liste || !b) {
    return (
      <>
        <GrossKopf titel="Bewerbung" />
        <ScrollView contentContainerStyle={inhalt}>
          {!rechte.inhaber ? <T v="text">Nur für den Inhaber der App.</T> : liste ? <T v="text">Diese Bewerbung gibt es nicht mehr.</T> : <Lader color={f.text3} style={{ alignSelf: "center", marginTop: 30 }} />}
        </ScrollView>
      </>
    );
  }

  const bew = b;
  const name = bew.name || bew.benutzername || "Unbekannt";

  async function ausfuehren(schritt: string, tun: () => Promise<void>, fertig?: string) {
    if (laeuft) return;
    setLaeuft(schritt);
    try {
      await tun();
      erfolg();
      setNotiz("");
      if (fertig) dialog(fertig);
    } catch (e) {
      dialog("Hat nicht geklappt", (e as Error).message);
    } finally {
      setLaeuft(null);
    }
  }

  const annehmen = () => ausfuehren("annehmen", () => creatorEntscheiden(bew.id, true, notiz), `${name} kann jetzt live gehen und Clips hochladen.`);

  function ablehnen() {
    dialog(`${name} ablehnen?`, "Die Person bekommt eine Mitteilung.", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Ablehnen", style: "destructive", onPress: () => ausfuehren("ablehnen", () => creatorEntscheiden(bew.id, false, notiz)) },
    ]);
  }

  function liveBeenden() {
    const live = bew.live_id;
    if (!live) return;
    dialog(`Live von ${name} beenden?`, "Das Live endet sofort für alle.", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Beenden",
        style: "destructive",
        onPress: () =>
          ausfuehren(
            "beenden",
            async () => {
              const problem = await liveSofortBeenden({ live });
              if (problem) throw new Error(problem);
            },
            "Live beendet.",
          ),
      },
    ]);
  }

  function entziehen() {
    dialog(
      `Zugang von ${name} entziehen?`,
      `${bew.live_id ? "Das laufende Live endet sofort. " : ""}Danach kann die Person nicht mehr live gehen und keine Clips mehr hochladen. Ihre Clips bleiben online.`,
      [
        { text: "Abbrechen", style: "cancel" },
        { text: "Entziehen", style: "destructive", onPress: () => ausfuehren("entziehen", () => creatorEntziehen(bew.user_id, notiz), "Zugang entzogen.") },
      ],
    );
  }

  const unter = [bew.benutzername ? `@${bew.benutzername}` : null, `${STATUS_TEXT[bew.status]} · ${vorZeit(bew.entschieden_am ?? bew.erstellt_am)}`].filter(Boolean).join(" · ");

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <GrossKopf titel={name} unter={unter} />
      <ScrollView contentContainerStyle={inhalt} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {bew.live_id ? (
          <View>
            <Gruppe>
              <Eintrag titel="Gerade live" wert="LIVE" rot />
              <Zeile titel="Live sofort beenden" gefahr ohnePfeil onPress={liveBeenden} />
            </Gruppe>
          </View>
        ) : null}

        <View>
          <Abschnitt titel="Kontakt" klein />
          <Gruppe>
            <Eintrag titel="Telefon" wert={bew.telefon} onPress={() => oeffnen(`tel:${bew.telefon.replace(/[^\d+]/g, "")}`)} />
            {bew.email ? <Eintrag titel="E-Mail" wert={bew.email} onPress={() => oeffnen(`mailto:${bew.email}`)} /> : null}
          </Gruppe>
        </View>

        <View>
          <Abschnitt titel="Angaben" klein />
          <Gruppe>
            <Eintrag titel="Alter" wert={`${bew.alter_jahre}`} />
            <Eintrag titel="Beruf" wert={bew.beruf} />
            {bew.ort ? <Eintrag titel="Wohnort" wert={bew.ort} /> : null}
            {bew.social ? <Eintrag titel="Kanal" wert={bew.social} /> : null}
            <Eintrag titel="Gesendet" wert={vorZeit(bew.erstellt_am)} />
          </Gruppe>
        </View>

        <View>
          <Abschnitt titel="Was möchte die Person machen?" klein />
          <Gruppe>
            <Absatz text={bew.themen} />
          </Gruppe>
        </View>

        {bew.erfahrung ? (
          <View>
            <Abschnitt titel="Erfahrung" klein />
            <Gruppe>
              <Absatz text={bew.erfahrung} />
            </Gruppe>
          </View>
        ) : null}

        {bew.notiz ? (
          <View>
            <Abschnitt titel="Deine Nachricht" klein />
            <Gruppe>
              <Absatz text={bew.notiz} />
            </Gruppe>
          </View>
        ) : null}

        {bew.status !== "zurueckgezogen" ? (
          <View>
            <Abschnitt titel={bew.status === "angenommen" ? "Nachricht beim Entziehen" : "Nachricht an die Person"} klein />
            <Gruppe>
              <TextInput
                value={notiz}
                onChangeText={setNotiz}
                placeholder="optional"
                placeholderTextColor={f.hell ? "#A3A8AF" : farben.text4}
                selectionColor={f.orange}
                keyboardAppearance={f.hell ? "light" : "dark"}
                multiline
                maxLength={500}
                style={{ ...schrift.text, fontSize: 15.5, lineHeight: 21, color: f.text, minHeight: 72, paddingHorizontal: 16, paddingVertical: 13, textAlignVertical: "top" }}
              />
            </Gruppe>
          </View>
        ) : null}

        {bew.status === "offen" ? (
          <View style={{ gap: abstand(3) }}>
            <Knopf titel="Annehmen" laedt={laeuft === "annehmen"} onPress={annehmen} />
            <Knopf titel="Ablehnen" art="gefahr" laedt={laeuft === "ablehnen"} onPress={ablehnen} />
          </View>
        ) : null}
        {bew.status === "angenommen" ? (
          <Gruppe>
            <Zeile titel="Zugang entziehen" gefahr ohnePfeil onPress={entziehen} />
          </Gruppe>
        ) : null}
        {bew.status === "abgelehnt" || bew.status === "entzogen" ? (
          <Knopf titel="Doch freischalten" art="sekundaer" laedt={laeuft === "annehmen"} onPress={annehmen} />
        ) : null}
        {bew.status === "zurueckgezogen" ? <T v="klein">Die Person hat die Bewerbung zurückgezogen.</T> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function CreatorDetail() {
  return (
    <Seite>
      <Inhalt />
    </Seite>
  );
}
