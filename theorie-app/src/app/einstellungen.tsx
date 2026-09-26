import { useState } from "react";
import { Alert, Linking, ScrollView, Switch, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Abschnitt, Chip, Eingabe, Gruppe, Knopf, Kopf, T, Zeile } from "@/components/ui";
import { Logo } from "@/components/grafik";
import { BUNDESLAENDER } from "@/lib/bundeslaender";
import { erinnerungPlanen } from "@/lib/erinnerung";
import { uhrzeit } from "@/lib/format";
import { useKonto } from "@/lib/konto";
import { useStand } from "@/lib/stand";
import { abstand, farben, RAND } from "@/lib/theme";

const ZIELE = [15, 30, 50, 80];
const ZEITEN: [number, number][] = [
  [7, 0],
  [12, 30],
  [17, 0],
  [19, 0],
  [21, 0],
];
const KLASSEN = ["B", "A", "A2", "A1", "AM", "BE"];

const SUPPORT = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;
const DATENSCHUTZ = process.env.EXPO_PUBLIC_DATENSCHUTZ_URL;
const IMPRESSUM = process.env.EXPO_PUBLIC_IMPRESSUM_URL;

export default function Einstellungen() {
  const insets = useSafeAreaInsets();
  const { stand, setzen, zuruecksetzen } = useStand();
  const { session, profil, gast, anzeigeName, profilSpeichern, abmelden } = useKonto();
  const [name, setName] = useState(anzeigeName);
  const [speichert, setSpeichert] = useState(false);

  async function erinnerungAendern(an: boolean, stunde = stand.erinnerung.stunde, minute = stand.erinnerung.minute) {
    const ok = await erinnerungPlanen(an, stunde, minute);
    if (!ok) {
      Alert.alert("Mitteilungen sind aus", "Erlaube Mitteilungen für Spur in den iPhone-Einstellungen, dann klappt die Erinnerung.");
      setzen({ erinnerung: { an: false, stunde, minute } });
      return;
    }
    setzen({ erinnerung: { an, stunde, minute } });
  }

  async function klasseAendern(k: string) {
    setzen({ klasse: k });
    if (session) await profilSpeichern({ klasse: k });
  }

  async function nameSpeichern() {
    setSpeichert(true);
    const f = await profilSpeichern({ name: name.trim() });
    setSpeichert(false);
    if (f) Alert.alert("Nicht gespeichert", f);
  }

  function zuruecksetzenFragen() {
    Alert.alert("Fortschritt zurücksetzen?", "Alle Antworten, Serien, Abzeichen und Simulationen auf diesem Gerät werden gelöscht. Das lässt sich nicht rückgängig machen.", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Zurücksetzen", style: "destructive", onPress: zuruecksetzen },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <Kopf titel="Einstellungen" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingBottom: insets.bottom + abstand(10), gap: abstand(7) }} keyboardShouldPersistTaps="handled">
        <View>
          <Abschnitt titel="Tagesziel" />
          <View style={{ flexDirection: "row", gap: abstand(2) }}>
            {ZIELE.map((z) => (
              <Chip key={z} text={`${z} Fragen`} aktiv={stand.tagesziel === z} onPress={() => setzen({ tagesziel: z })} />
            ))}
          </View>
          <T v="klein" style={{ marginTop: abstand(2) }}>
            30 Fragen am Tag sind etwa 15 Minuten – genug, um in wenigen Wochen prüfungsreif zu sein.
          </T>
        </View>

        <View>
          <Abschnitt titel="Führerscheinklasse" />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: abstand(2) }}>
            {KLASSEN.map((k) => (
              <Chip key={k} text={`Klasse ${k}`} aktiv={stand.klasse === k} onPress={() => klasseAendern(k)} />
            ))}
          </View>
        </View>

        {session ? (
          <View>
            <Abschnitt titel="Bundesland" />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: abstand(2) }}>
              {BUNDESLAENDER.map((b) => (
                <Chip
                  key={b}
                  text={b}
                  aktiv={profil?.bundesland === b}
                  onPress={async () => {
                    const f = await profilSpeichern({ bundesland: profil?.bundesland === b ? null : b });
                    if (f) Alert.alert("Nicht gespeichert", f);
                  }}
                />
              ))}
            </View>
            <T v="klein" style={{ marginTop: abstand(2) }}>
              Für die regionale Rangliste in der Liga.
            </T>
          </View>
        ) : null}

        <View>
          <Abschnitt titel="Erinnerung" />
          <Gruppe>
            <Zeile
              icon="notifications-outline"
              titel="Tägliche Erinnerung"
              unter={stand.erinnerung.an ? `Jeden Tag um ${uhrzeit(stand.erinnerung.stunde, stand.erinnerung.minute)} Uhr` : "Aus"}
              rechts={
                <Switch
                  value={stand.erinnerung.an}
                  onValueChange={(an) => erinnerungAendern(an)}
                  trackColor={{ true: farben.orange, false: farben.flaeche3 }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={farben.flaeche3}
                />
              }
            />
          </Gruppe>
          {stand.erinnerung.an ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: abstand(2), marginTop: abstand(3) }}>
              {ZEITEN.map(([h, m]) => (
                <Chip
                  key={`${h}:${m}`}
                  text={uhrzeit(h, m)}
                  aktiv={stand.erinnerung.stunde === h && stand.erinnerung.minute === m}
                  onPress={() => erinnerungAendern(true, h, m)}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View>
          <Abschnitt titel="Konto" />
          {session ? (
            <View style={{ gap: abstand(3) }}>
              <Eingabe icon="person-outline" value={name} onChangeText={setName} placeholder="Vorname" autoCapitalize="words" />
              {name.trim() && name.trim() !== anzeigeName ? <Knopf titel="Namen speichern" klein laedt={speichert} onPress={nameSpeichern} /> : null}
              <Gruppe>
                {profil ? <Zeile icon="at" titel={`@${profil.benutzername}`} unter="Benutzername" /> : null}
                <Zeile icon="mail-outline" titel={session.user.email ?? ""} unter="E-Mail" />
              </Gruppe>
            </View>
          ) : (
            <Gruppe>
              <Zeile
                icon="person-add-outline"
                iconFarbe={farben.orange}
                titel="Konto erstellen"
                unter={gast ? "Sichert deinen Fortschritt und schaltet die echte Liga frei" : undefined}
                onPress={async () => {
                  await abmelden();
                  router.replace("/registrieren");
                }}
              />
            </Gruppe>
          )}
        </View>

        {SUPPORT || DATENSCHUTZ || IMPRESSUM ? (
          <View>
            <Abschnitt titel="Hilfe & Rechtliches" />
            <Gruppe>
              {SUPPORT ? <Zeile icon="help-buoy-outline" titel="Hilfe & Kontakt" onPress={() => Linking.openURL(`mailto:${SUPPORT}`)} /> : null}
              {DATENSCHUTZ ? <Zeile icon="shield-outline" titel="Datenschutz" onPress={() => Linking.openURL(DATENSCHUTZ)} /> : null}
              {IMPRESSUM ? <Zeile icon="document-text-outline" titel="Impressum" onPress={() => Linking.openURL(IMPRESSUM)} /> : null}
            </Gruppe>
          </View>
        ) : null}

        <View>
          <Abschnitt titel="Daten" />
          <Gruppe>
            <Zeile icon="refresh-circle-outline" titel="Fortschritt zurücksetzen" unter="Antworten, Serien, Abzeichen" gefahr ohnePfeil onPress={zuruecksetzenFragen} />
          </Gruppe>
        </View>

        <View style={{ alignItems: "center", gap: abstand(2), marginTop: abstand(2) }}>
          <Logo groesse={24} />
          <T v="klein">Version 1.0 · Beispielfragen, nicht der amtliche Katalog</T>
        </View>
      </ScrollView>
    </View>
  );
}
