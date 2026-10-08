import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View, type TextInputProps } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Absatz, Eintrag } from "@/components/creator-teile";
import { dialog } from "@/components/dialog";
import { Lader } from "@/components/lader";
import { Schalter } from "@/components/schalter";
import { GrossKopf, Seite } from "@/components/seite";
import { Abschnitt, Gruppe, Knopf, T, Zeile } from "@/components/ui";
import { useClipRechte, vorZeit } from "@/lib/clips-server";
import { creatorBewerben, creatorZurueckziehen, STATUS_TEXT, useMeineBewerbung, type BewerbungDaten } from "@/lib/creator";
import { useFarbwelt } from "@/lib/darstellung";
import { erfolg } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import { abstand, farben, RAND, schrift } from "@/lib/theme";

// Creator werden: Formular (Name, Telefon, Alter, Beruf …) und danach der Stand
// der Bewerbung. Angenommene Creator gehen live und laden Clips hoch.

/** Eingabezeile in einer Gruppe: Bezeichnung links, Feld rechts. */
function FeldZeile({ label, ...props }: TextInputProps & { label: string }) {
  const f = useFarbwelt();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", minHeight: 50, paddingHorizontal: 16 }}>
      <Text style={{ ...schrift.textMittel, fontSize: 15.5, color: f.text, width: 118 }}>{label}</Text>
      <TextInput
        placeholderTextColor={f.hell ? "#A3A8AF" : farben.text4}
        selectionColor={f.orange}
        cursorColor={f.orange}
        keyboardAppearance={f.hell ? "light" : "dark"}
        {...props}
        style={{ flex: 1, minWidth: 0, ...schrift.text, fontSize: 15.5, color: f.text, paddingVertical: 14 }}
      />
    </View>
  );
}

/** Mehrzeiliges Feld, füllt die ganze Gruppe. */
function TextZeile(props: TextInputProps) {
  const f = useFarbwelt();
  return (
    <TextInput
      placeholderTextColor={f.hell ? "#A3A8AF" : farben.text4}
      selectionColor={f.orange}
      cursorColor={f.orange}
      keyboardAppearance={f.hell ? "light" : "dark"}
      multiline
      {...props}
      style={{ ...schrift.text, fontSize: 15.5, lineHeight: 21, color: f.text, minHeight: 92, paddingHorizontal: 16, paddingTop: 13, paddingBottom: 13, textAlignVertical: "top" }}
    />
  );
}

function Inhalt() {
  const f = useFarbwelt();
  const insets = useSafeAreaInsets();
  const { session, anzeigeName } = useKonto();
  const rechte = useClipRechte();
  const { bewerbung, geladen, neuLaden } = useMeineBewerbung();
  const [formular, setFormular] = useState(false);
  const [daten, setDaten] = useState<BewerbungDaten>({ name: anzeigeName ?? "", telefon: "", alter: 0, beruf: "", ort: "", themen: "", erfahrung: "", social: "" });
  const [alterText, setAlterText] = useState("");
  const [regelnOk, setRegelnOk] = useState(false);
  const [sendet, setSendet] = useState(false);

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
      dialog("Erst ab 18", "Creator kannst du ab 18 Jahren werden.");
      return;
    }
    setSendet(true);
    try {
      await creatorBewerben({ ...daten, alter });
      erfolg();
      await neuLaden();
      setFormular(false);
    } catch (e) {
      dialog("Nicht gesendet", (e as Error).message);
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
            await neuLaden();
          } catch (e) {
            dialog("Nicht zurückgezogen", (e as Error).message);
          }
        },
      },
    ]);
  }

  const liste = { paddingHorizontal: RAND, paddingTop: abstand(4), paddingBottom: insets.bottom + abstand(10), gap: abstand(7) };

  if (!session) {
    return (
      <>
        <GrossKopf titel="Creator werden" schliessen />
        <ScrollView contentContainerStyle={liste}>
          <T v="text">Melde dich an, um dich als Creator zu bewerben.</T>
          <Knopf titel="Anmelden" onPress={() => router.push("/anmelden")} />
        </ScrollView>
      </>
    );
  }

  if (rechte.inhaber) {
    return (
      <>
        <GrossKopf titel="Creator" schliessen />
        <ScrollView contentContainerStyle={liste}>
          <View>
            <Gruppe>
              <Zeile titel="Bewerbungen ansehen" onPress={() => router.replace("/creator-verwaltung")} />
            </Gruppe>
            <T v="klein" style={{ marginTop: abstand(2) }}>
              Du bist der Inhaber und kannst immer live gehen und Clips hochladen.
            </T>
          </View>
        </ScrollView>
      </>
    );
  }

  if (!geladen) {
    return (
      <>
        <GrossKopf titel="Creator werden" schliessen />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Lader color={f.text3} />
        </View>
      </>
    );
  }

  const status = bewerbung?.status;
  if (!formular && bewerbung && status && status !== "zurueckgezogen") {
    const angenommen = status === "angenommen";
    return (
      <>
        <GrossKopf titel={angenommen ? "Creator" : "Deine Bewerbung"} schliessen />
        <ScrollView contentContainerStyle={liste}>
          <View>
            <Gruppe>
              <Eintrag titel="Status" wert={STATUS_TEXT[status]} />
              <Eintrag titel="Gesendet" wert={vorZeit(bewerbung.erstellt_am)} />
              {bewerbung.entschieden_am ? <Eintrag titel="Entschieden" wert={vorZeit(bewerbung.entschieden_am)} /> : null}
            </Gruppe>
            <T v="klein" style={{ marginTop: abstand(2) }}>
              {status === "offen"
                ? "Wir sehen uns deine Bewerbung an. Sobald entschieden ist, bekommst du eine Mitteilung."
                : angenommen
                  ? "Du kannst live gehen und Clips hochladen. Der Inhaber kann Lives beenden und den Zugang jederzeit entziehen."
                  : status === "abgelehnt"
                    ? "Deine Bewerbung wurde diesmal abgelehnt."
                    : "Dein Creator-Zugang wurde beendet."}
            </T>
          </View>

          {bewerbung.notiz ? (
            <View>
              <Abschnitt titel="Nachricht" klein />
              <Gruppe>
                <Absatz text={bewerbung.notiz} />
              </Gruppe>
            </View>
          ) : null}

          {angenommen ? (
            <Gruppe>
              <Zeile titel="Live gehen" onPress={() => router.replace("/live-senden")} />
              <Zeile titel="Clip hochladen" onPress={() => router.replace("/clip-hochladen")} />
            </Gruppe>
          ) : status === "offen" ? (
            <Gruppe>
              <Zeile titel="Bewerbung zurückziehen" gefahr ohnePfeil onPress={zurueckziehen} />
            </Gruppe>
          ) : (
            <Gruppe>
              <Zeile titel="Neu bewerben" onPress={() => setFormular(true)} />
            </Gruppe>
          )}
        </ScrollView>
      </>
    );
  }

  // ------------------------------------------------------------------ Formular
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <GrossKopf titel="Creator werden" schliessen />
      <ScrollView contentContainerStyle={liste} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <T v="text">Als Creator gehst du in Fahrschul Pro live und lädst Clips hoch. Erzähl uns kurz von dir.</T>

        <View>
          <Abschnitt titel="Über dich" klein />
          <Gruppe>
            <FeldZeile label="Name" value={daten.name} onChangeText={setze("name")} placeholder="Vor- und Nachname" maxLength={80} autoComplete="name" textContentType="name" />
            <FeldZeile label="Telefon" value={daten.telefon} onChangeText={setze("telefon")} placeholder="0151 2345678" keyboardType="phone-pad" maxLength={30} autoComplete="tel" textContentType="telephoneNumber" />
            <FeldZeile label="Alter" value={alterText} onChangeText={(t) => setAlterText(t.replace(/\D/g, "").slice(0, 2))} placeholder="Jahre" keyboardType="number-pad" maxLength={2} />
            <FeldZeile label="Beruf" value={daten.beruf} onChangeText={setze("beruf")} placeholder="z. B. Fahrlehrer" maxLength={80} />
            <FeldZeile label="Wohnort" value={daten.ort} onChangeText={setze("ort")} placeholder="optional" maxLength={80} />
            <FeldZeile label="Kanal" value={daten.social} onChangeText={setze("social")} placeholder="Instagram/TikTok (optional)" autoCapitalize="none" autoCorrect={false} maxLength={200} />
          </Gruppe>
        </View>

        <View>
          <Abschnitt titel="Was möchtest du machen?" klein />
          <Gruppe>
            <TextZeile value={daten.themen} onChangeText={setze("themen")} placeholder="z. B. Vorfahrtsregeln erklären, Prüfungsfragen live lösen" maxLength={1000} />
          </Gruppe>
        </View>

        <View>
          <Abschnitt titel="Erfahrung" klein />
          <Gruppe>
            <TextZeile value={daten.erfahrung} onChangeText={setze("erfahrung")} placeholder="optional" maxLength={1000} />
          </Gruppe>
        </View>

        <View>
          <Abschnitt titel="Regeln" klein />
          <Gruppe>
            <Absatz text="Keine Beleidigungen, keine Werbung, keine Links. Nur Themen rund um Führerschein und Verkehr. Keine privaten Daten zeigen. Lives können jederzeit beendet und Zugänge entzogen werden." />
            <Zeile titel="Ich bin mindestens 18 und halte mich an die Regeln" titelZeilen={2} rechts={<Schalter wert={regelnOk} onWechsel={setRegelnOk} />} />
          </Gruppe>
          <T v="klein" style={{ marginTop: abstand(2) }}>
            Deine Angaben sieht nur der Inhaber der App.
          </T>
        </View>

        <Knopf titel="Bewerbung senden" laedt={sendet} deaktiviert={!vollstaendig} onPress={absenden} />
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
