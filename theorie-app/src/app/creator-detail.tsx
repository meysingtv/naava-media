import { useState } from "react";
import { KeyboardAvoidingView, Linking, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BroadcastIcon } from "phosphor-react-native/src/icons/Broadcast";
import { ChatCircleTextIcon } from "phosphor-react-native/src/icons/ChatCircleText";
import { EnvelopeIcon } from "phosphor-react-native/src/icons/Envelope";
import { LockIcon } from "phosphor-react-native/src/icons/Lock";
import { PhoneIcon } from "phosphor-react-native/src/icons/Phone";
import { SparkleIcon } from "phosphor-react-native/src/icons/Sparkle";
import { TrayIcon } from "phosphor-react-native/src/icons/Tray";
import { TrophyIcon } from "phosphor-react-native/src/icons/Trophy";

import { Eintrag, LeerZustand, LiveMarke, Mitte, RundKnopf, signal, StatusMarke, TextKarte } from "@/components/creator-teile";
import { dialog } from "@/components/dialog";
import { GlasGrund, GlasGruppe, GlasKarte } from "@/components/glas-flaeche";
import { Lader } from "@/components/lader";
import { GrossKopf, Seite } from "@/components/seite";
import { Abschnitt, Knopf, T } from "@/components/ui";
import { NutzerBild } from "@/components/profilbild";
import { useClipRechte, vorZeit } from "@/lib/clips-server";
import { creatorEntscheiden, creatorEntziehen, useBewerbungen } from "@/lib/creator";
import { useFarbwelt } from "@/lib/darstellung";
import { erfolg } from "@/lib/haptik";
import { liveSofortBeenden } from "@/lib/live";
import { abstand, farben, leuchten, mitDeckkraft, RAND, schrift } from "@/lib/theme";

// Eine Bewerbung aus Sicht des Inhabers: Person mit Status, Kontakt, alle
// Angaben, annehmen oder ablehnen, laufendes Live beenden, Zugang entziehen.
// Aktualisiert sich in Echtzeit.

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
  const inhalt = { paddingHorizontal: RAND, paddingTop: abstand(2), paddingBottom: insets.bottom + abstand(10) };

  if (!rechte.inhaber || !liste || !b) {
    return (
      <>
        <GrossKopf titel="Bewerbung" />
        <ScrollView contentContainerStyle={{ ...inhalt, paddingTop: abstand(4) }}>
          <Mitte>
            {!rechte.inhaber ? (
              <LeerZustand symbol={LockIcon} titel="Nur für den Inhaber" text="Nur für den Inhaber der App." />
            ) : liste ? (
              <LeerZustand symbol={TrayIcon} titel="Nicht mehr da" text="Diese Bewerbung gibt es nicht mehr." />
            ) : (
              <Lader color={f.text3} style={{ alignSelf: "center", marginTop: 30 }} />
            )}
          </Mitte>
        </ScrollView>
      </>
    );
  }

  const bew = b;
  const name = bew.name || bew.benutzername || "Unbekannt";
  const { rot, gruen } = signal(f);

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

  const telefon = bew.telefon.replace(/[^\d+]/g, "");
  const angaben = [`${bew.alter_jahre} Jahre`, bew.beruf, bew.ort].filter(Boolean).join(" · ");

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <GrossKopf titel={bew.status === "angenommen" ? "Creator" : "Bewerbung"} />
      <ScrollView contentContainerStyle={inhalt} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
        <Mitte style={{ gap: abstand(6) }}>
          {/* Person: Bild, Name, Status */}
          <View style={{ alignItems: "center", paddingTop: abstand(2) }}>
            <View style={[{ borderRadius: 52, padding: 3, backgroundColor: f.hell ? "#FFFFFF" : "rgba(255,255,255,0.16)" }, leuchten(f.hell ? "#3C2C18" : "#000000", f.hell ? 0.12 : 0.45, 16, 5)]}>
              <NutzerBild pfad={bew.bild_pfad} name={bew.benutzername ?? name} farbe={bew.avatar_farbe ?? undefined} groesse={98} rand={0} />
            </View>
            <Text style={{ ...schrift.titel, fontSize: 26, lineHeight: 32, letterSpacing: -0.3, color: f.text, marginTop: 14, textAlign: "center" }} numberOfLines={2}>
              {name}
            </Text>
            {bew.benutzername ? <Text style={{ ...schrift.textMittel, fontSize: 14.5, color: f.text2, marginTop: 1 }}>@{bew.benutzername}</Text> : null}
            {angaben ? <Text style={{ ...schrift.text, fontSize: 13.5, color: f.text3, marginTop: 3, textAlign: "center" }}>{angaben}</Text> : null}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
              {bew.live_id ? <LiveMarke /> : null}
              <StatusMarke status={bew.status} />
              <Text style={{ ...schrift.textMittel, fontSize: 13, color: f.text3 }}>{vorZeit(bew.entschieden_am ?? bew.erstellt_am)}</Text>
            </View>
          </View>

          {/* Kontakt wie in der iOS-Kontaktkarte */}
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 18 }}>
            {telefon ? <RundKnopf symbol={PhoneIcon} label="Anrufen" onPress={() => oeffnen(`tel:${telefon}`)} /> : null}
            {bew.email ? <RundKnopf symbol={EnvelopeIcon} label="E-Mail" onPress={() => oeffnen(`mailto:${bew.email}`)} /> : null}
          </View>

          {/* Läuft gerade ein Live? */}
          {bew.live_id ? (
            <GlasKarte toenung={mitDeckkraft(rot, f.hell ? 0.12 : 0.2)} style={{ borderRadius: 22, padding: 16, gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: mitDeckkraft(rot, 0.18) }}>
                  <BroadcastIcon size={21} color={rot} weight="fill" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...schrift.textHalb, fontSize: 16, color: f.text }}>Gerade live</Text>
                  <Text style={{ ...schrift.text, fontSize: 13.5, color: f.text2 }}>Du kannst das Live sofort für alle beenden.</Text>
                </View>
              </View>
              <Knopf titel="Live sofort beenden" art="gefahr" klein laedt={laeuft === "beenden"} onPress={liveBeenden} />
            </GlasKarte>
          ) : null}

          <View>
            <Abschnitt titel="Angaben" klein />
            <GlasGruppe>
              <Eintrag titel="Telefon" wert={bew.telefon} onPress={() => oeffnen(`tel:${telefon}`)} />
              {bew.email ? <Eintrag titel="E-Mail" wert={bew.email} onPress={() => oeffnen(`mailto:${bew.email}`)} /> : null}
              <Eintrag titel="Alter" wert={`${bew.alter_jahre}`} />
              <Eintrag titel="Beruf" wert={bew.beruf} />
              {bew.ort ? <Eintrag titel="Wohnort" wert={bew.ort} /> : null}
              {bew.social ? <Eintrag titel="Kanal" wert={bew.social} /> : null}
              <Eintrag titel="Gesendet" wert={vorZeit(bew.erstellt_am)} />
            </GlasGruppe>
          </View>

          <View style={{ gap: abstand(3) }}>
            <TextKarte titel="Was möchte die Person machen?" symbol={SparkleIcon} text={bew.themen} />
            {bew.erfahrung ? <TextKarte titel="Erfahrung" symbol={TrophyIcon} text={bew.erfahrung} /> : null}
            {bew.notiz ? <TextKarte titel="Deine Nachricht" symbol={ChatCircleTextIcon} text={bew.notiz} /> : null}
          </View>

          {bew.status !== "zurueckgezogen" ? (
            <View>
              <Abschnitt titel={bew.status === "angenommen" ? "Nachricht beim Entziehen" : "Nachricht an die Person"} klein />
              <GlasKarte>
                <TextInput
                  value={notiz}
                  onChangeText={setNotiz}
                  placeholder="optional"
                  placeholderTextColor={f.hell ? "#A3A8AF" : farben.text4}
                  selectionColor={f.orange}
                  cursorColor={f.orange}
                  keyboardAppearance={f.hell ? "light" : "dark"}
                  multiline
                  maxLength={500}
                  style={{ ...schrift.text, fontSize: 16, lineHeight: 22, color: f.text, minHeight: 84, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, textAlignVertical: "top" }}
                />
              </GlasKarte>
            </View>
          ) : null}

          {/* Aktionen je nach Stand */}
          {bew.status === "offen" ? (
            <View style={{ gap: abstand(3) }}>
              <Knopf titel="Annehmen" icon="checkmark" laedt={laeuft === "annehmen"} onPress={annehmen} />
              <Knopf titel="Ablehnen" art="gefahr" laedt={laeuft === "ablehnen"} onPress={ablehnen} />
              <T v="klein" style={{ textAlign: "center" }}>
                Angenommen darf die Person sofort live gehen und Clips hochladen.
              </T>
            </View>
          ) : null}
          {bew.status === "angenommen" ? (
            <View style={{ gap: abstand(3) }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: gruen }} />
                <Text style={{ ...schrift.textMittel, fontSize: 13.5, color: f.text2 }}>Darf live gehen und Clips hochladen</Text>
              </View>
              <Knopf titel="Zugang entziehen" art="gefahr" laedt={laeuft === "entziehen"} onPress={entziehen} />
            </View>
          ) : null}
          {bew.status === "abgelehnt" || bew.status === "entzogen" ? <Knopf titel="Doch freischalten" art="sekundaer" laedt={laeuft === "annehmen"} onPress={annehmen} /> : null}
          {bew.status === "zurueckgezogen" ? (
            <T v="klein" style={{ textAlign: "center" }}>
              Die Person hat die Bewerbung zurückgezogen.
            </T>
          ) : null}
        </Mitte>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function CreatorDetail() {
  return (
    <Seite>
      <GlasGrund />
      <Inhalt />
    </Seite>
  );
}
