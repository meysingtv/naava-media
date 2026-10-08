import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { dialog } from "@/components/dialog";
import { Icon, type IconName } from "@/components/icon";
import { Lader } from "@/components/lader";
import { GrossKopf, Seite } from "@/components/seite";
import { Eingabe, kartenFlaeche, Knopf, T } from "@/components/ui";
import { useClipRechte } from "@/lib/clips-server";
import { creatorBewerben, creatorZurueckziehen, useMeineBewerbung, type BewerbungDaten } from "@/lib/creator";
import { useFarbwelt } from "@/lib/darstellung";
import { erfolg, tippen } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import { abstand, farben, mitDeckkraft, RAND, schrift } from "@/lib/theme";

// Live-Creator werden: Formular (Name, Telefon, Alter, Beruf …) und danach der
// Stand der Bewerbung. Die Entscheidung des Inhabers erscheint hier sofort.

const REGELN = [
  "Freundlich bleiben – keine Beleidigungen, keine Werbung, keine Links zu anderen Seiten.",
  "Nur Themen rund um Führerschein, Verkehr und Lernen.",
  "Keine privaten Daten von dir oder anderen zeigen.",
  "Der Inhaber der App kann jedes Live jederzeit beenden und den Zugang entziehen.",
];

function Feld({ label, pflicht, children }: { label: string; pflicht?: boolean; children: React.ReactNode }) {
  const f = useFarbwelt();
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ ...schrift.textHalb, fontSize: 14, color: f.text2 }}>
        {label}
        {pflicht ? <Text style={{ color: f.orange }}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

/** Mehrzeiliges Eingabefeld im Stil der anderen Felder. */
function Textfeld({ value, onChangeText, placeholder, maxLength }: { value: string; onChangeText: (t: string) => void; placeholder: string; maxLength: number }) {
  const f = useFarbwelt();
  return (
    <View style={[{ borderRadius: 18, paddingHorizontal: abstand(4), paddingVertical: abstand(3), minHeight: 104 }, kartenFlaeche(f)]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={f.hell ? "#A3A8AF" : farben.text4}
        selectionColor={f.orange}
        cursorColor={f.orange}
        keyboardAppearance={f.hell ? "light" : "dark"}
        multiline
        maxLength={maxLength}
        style={{ ...schrift.textMittel, fontSize: 16, lineHeight: 21, color: f.text, minHeight: 78, textAlignVertical: "top" }}
      />
    </View>
  );
}

function StatusKarte({ icon, farbe, titel, text, children }: { icon: IconName; farbe: string; titel: string; text: string; children?: React.ReactNode }) {
  const f = useFarbwelt();
  return (
    <View style={[{ borderRadius: 24, padding: 20, gap: 12, alignItems: "center" }, kartenFlaeche(f)]}>
      <View style={{ width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", backgroundColor: mitDeckkraft(farbe, 0.14) }}>
        <Icon name={icon} size={34} color={farbe} />
      </View>
      <Text style={{ ...schrift.titelFett, fontSize: 20, color: f.text, textAlign: "center" }}>{titel}</Text>
      <Text style={{ ...schrift.text, fontSize: 15, lineHeight: 21, color: f.text2, textAlign: "center" }}>{text}</Text>
      {children ? <View style={{ alignSelf: "stretch", gap: 10, marginTop: 6 }}>{children}</View> : null}
    </View>
  );
}

function Inhalt() {
  const f = useFarbwelt();
  const insets = useSafeAreaInsets();
  const { session, anzeigeName } = useKonto();
  const rechte = useClipRechte();
  const { bewerbung, geladen } = useMeineBewerbung();
  const [formular, setFormular] = useState(false);
  const [daten, setDaten] = useState<BewerbungDaten>({ name: anzeigeName ?? "", telefon: "", alter: 0, beruf: "", ort: "", themen: "", erfahrung: "", social: "" });
  const [alterText, setAlterText] = useState("");
  const [regelnOk, setRegelnOk] = useState(false);
  const [sendet, setSendet] = useState(false);
  const gruen = f.hell ? "#23A548" : "#4ED053";
  const rot = f.hell ? "#E5392C" : farben.rot;

  useEffect(() => {
    if (!daten.name && anzeigeName) setDaten((d) => ({ ...d, name: anzeigeName }));
  }, [anzeigeName]); // eslint-disable-line react-hooks/exhaustive-deps

  const setze = (feld: keyof BewerbungDaten) => (wert: string) => setDaten((d) => ({ ...d, [feld]: wert }));
  const alter = Number.parseInt(alterText, 10);
  const vollstaendig =
    daten.name.trim().length >= 2 && daten.telefon.replace(/\D/g, "").length >= 6 && Number.isFinite(alter) && alter > 0 && daten.beruf.trim().length >= 2 && daten.themen.trim().length >= 10 && regelnOk;

  async function absenden() {
    if (!vollstaendig || sendet) return;
    if (alter < 18) {
      dialog("Erst ab 18", "Live gehen kannst du ab 18 Jahren.");
      return;
    }
    setSendet(true);
    try {
      await creatorBewerben({ ...daten, alter });
      erfolg();
      setFormular(false);
      dialog("Bewerbung ist raus", "Wir schauen sie uns an. Sobald entschieden ist, siehst du es hier und bekommst eine Mitteilung.");
    } catch (e) {
      dialog("Nicht abgeschickt", (e as Error).message);
    } finally {
      setSendet(false);
    }
  }

  function zurueckziehen() {
    dialog("Bewerbung zurückziehen?", "Du kannst dich danach jederzeit neu bewerben.", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Zurückziehen",
        style: "destructive",
        onPress: async () => {
          try {
            await creatorZurueckziehen();
          } catch (e) {
            dialog("Nicht zurückgezogen", (e as Error).message);
          }
        },
      },
    ]);
  }

  const unten = { paddingHorizontal: RAND, paddingBottom: insets.bottom + abstand(10), gap: abstand(5) };

  if (!session) {
    return (
      <ScrollView contentContainerStyle={unten}>
        <GrossKopf titel="Live-Creator werden" schliessen />
        <StatusKarte icon="person-circle-outline" farbe={f.orange} titel="Bitte melde dich an" text="Bewerben kannst du dich mit deinem Konto.">
          <Knopf titel="Anmelden" onPress={() => router.push("/anmelden")} />
        </StatusKarte>
      </ScrollView>
    );
  }

  if (rechte.inhaber) {
    return (
      <ScrollView contentContainerStyle={unten}>
        <GrossKopf titel="Live-Creator" schliessen />
        <StatusKarte icon="shield-checkmark" farbe={gruen} titel="Du bist der Inhaber" text="Du kannst immer live gehen. Bewerbungen anderer siehst du in den Einstellungen.">
          <Knopf titel="Bewerbungen ansehen" onPress={() => router.replace("/creator-verwaltung")} />
        </StatusKarte>
      </ScrollView>
    );
  }

  if (!geladen) {
    return (
      <View style={{ flex: 1 }}>
        <GrossKopf titel="Live-Creator werden" schliessen />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Lader color={f.text3} />
        </View>
      </View>
    );
  }

  const status = bewerbung?.status;
  if (!formular && status === "offen") {
    return (
      <ScrollView contentContainerStyle={unten}>
        <GrossKopf titel="Deine Bewerbung" schliessen />
        <StatusKarte icon="hourglass-outline" farbe={f.orange} titel="Wird geprüft" text="Deine Bewerbung ist angekommen. Sobald entschieden ist, siehst du es hier und bekommst eine Mitteilung.">
          <Knopf titel="Bewerbung zurückziehen" art="geist" onPress={zurueckziehen} />
        </StatusKarte>
      </ScrollView>
    );
  }
  if (!formular && status === "angenommen") {
    return (
      <ScrollView contentContainerStyle={unten}>
        <GrossKopf titel="Live-Creator" schliessen />
        <StatusKarte icon="checkmark-circle" farbe={gruen} titel="Du bist freigeschaltet 🎉" text={bewerbung?.notiz ? `„${bewerbung.notiz}“` : "Du kannst jetzt live gehen – mit Quiz, Prüfung, Rad, Tafel und allem anderen."}>
          <Knopf titel="Jetzt live gehen" icon="radio" onPress={() => router.replace("/live-senden")} />
        </StatusKarte>
        <T v="klein" zentriert>
          Halte dich an die Live-Regeln – der Inhaber kann jedes Live beenden und den Zugang jederzeit entziehen.
        </T>
      </ScrollView>
    );
  }
  if (!formular && (status === "abgelehnt" || status === "entzogen")) {
    return (
      <ScrollView contentContainerStyle={unten}>
        <GrossKopf titel="Deine Bewerbung" schliessen />
        <StatusKarte
          icon={status === "abgelehnt" ? "close-circle" : "lock-closed"}
          farbe={rot}
          titel={status === "abgelehnt" ? "Leider nicht geklappt" : "Zugang beendet"}
          text={bewerbung?.notiz ? `„${bewerbung.notiz}“` : status === "abgelehnt" ? "Deine Bewerbung wurde diesmal abgelehnt." : "Dein Zugang zum Live-Streaming wurde beendet."}
        >
          <Knopf titel="Neu bewerben" art="sekundaer" onPress={() => setFormular(true)} />
        </StatusKarte>
      </ScrollView>
    );
  }

  // ------------------------------------------------------------------ Formular
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={unten} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <GrossKopf titel="Live-Creator werden" unter="Geh selbst live in Fahrschul Pro – erzähl uns kurz von dir." schliessen />

        <Feld label="Name" pflicht>
          <Eingabe icon="person-outline" value={daten.name} onChangeText={setze("name")} placeholder="Vor- und Nachname" maxLength={80} autoComplete="name" textContentType="name" />
        </Feld>
        <Feld label="Telefonnummer" pflicht>
          <Eingabe icon="call-outline" value={daten.telefon} onChangeText={setze("telefon")} placeholder="z. B. 0151 2345678" keyboardType="phone-pad" maxLength={30} autoComplete="tel" textContentType="telephoneNumber" />
        </Feld>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <View style={{ width: 110 }}>
            <Feld label="Alter" pflicht>
              <Eingabe value={alterText} onChangeText={(t) => setAlterText(t.replace(/\D/g, "").slice(0, 2))} placeholder="z. B. 24" keyboardType="number-pad" maxLength={2} />
            </Feld>
          </View>
          <View style={{ flex: 1 }}>
            <Feld label="Beruf" pflicht>
              <Eingabe value={daten.beruf} onChangeText={setze("beruf")} placeholder="z. B. Fahrlehrer" maxLength={80} />
            </Feld>
          </View>
        </View>
        <Feld label="Wohnort">
          <Eingabe icon="location-outline" value={daten.ort} onChangeText={setze("ort")} placeholder="Stadt (optional)" maxLength={80} />
        </Feld>
        <Feld label="Worüber möchtest du live gehen?" pflicht>
          <Textfeld value={daten.themen} onChangeText={setze("themen")} placeholder="z. B. Vorfahrtsregeln erklären, Prüfungsfragen gemeinsam lösen …" maxLength={1000} />
        </Feld>
        <Feld label="Erfahrung">
          <Textfeld value={daten.erfahrung} onChangeText={setze("erfahrung")} placeholder="Fahrlehrer, Streaming, Erklärvideos … (optional)" maxLength={1000} />
        </Feld>
        <Feld label="Instagram oder TikTok">
          <Eingabe icon="at" value={daten.social} onChangeText={setze("social")} placeholder="@name (optional)" autoCapitalize="none" autoCorrect={false} maxLength={200} />
        </Feld>

        <View style={[{ borderRadius: 20, padding: 16, gap: 10 }, kartenFlaeche(f)]}>
          <Text style={{ ...schrift.textFett, fontSize: 15, color: f.text }}>Live-Regeln</Text>
          {REGELN.map((r) => (
            <View key={r} style={{ flexDirection: "row", gap: 8 }}>
              <Text style={{ ...schrift.textFett, color: f.orange }}>•</Text>
              <Text style={{ ...schrift.text, fontSize: 14, lineHeight: 20, color: f.text2, flex: 1 }}>{r}</Text>
            </View>
          ))}
          <Pressable
            onPress={() => {
              tippen();
              setRegelnOk((v) => !v);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: regelnOk }}
            style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 }}
          >
            <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: regelnOk ? f.orange : f.text3, backgroundColor: regelnOk ? f.orange : "transparent", alignItems: "center", justifyContent: "center" }}>
              {regelnOk ? <Icon name="checkmark" size={15} color="#FFFFFF" weight="bold" /> : null}
            </View>
            <Text style={{ ...schrift.textHalb, fontSize: 14, lineHeight: 19, color: f.text, flex: 1 }}>Ich bin mindestens 18 Jahre alt und halte mich an die Live-Regeln.</Text>
          </Pressable>
        </View>

        <Knopf titel="Bewerbung abschicken" icon="paper-plane" laedt={sendet} deaktiviert={!vollstaendig} onPress={absenden} />
        <T v="klein" zentriert>
          Deine Angaben sieht nur der Inhaber der App. Telefonnummer und Alter erscheinen nirgends öffentlich.
        </T>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export default function CreatorBewerbung() {
  return (
    <Seite>
      <Inhalt />
    </Seite>
  );
}
