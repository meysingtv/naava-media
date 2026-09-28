import { useEffect, useState } from "react";
import { Alert, Linking, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Abschnitt, Chip, Eingabe, Gruppe, Knopf, Kopf, PasswortEingabe, T, Zeile } from "@/components/ui";
import { Logo } from "@/components/grafik";
import { Icon } from "@/components/icon";
import { BUNDESLAENDER } from "@/lib/bundeslaender";
import { useClipRechte } from "@/lib/clips-server";
import { erinnerungPlanen } from "@/lib/erinnerung";
import { uhrzeit } from "@/lib/format";
import { useKonto } from "@/lib/konto";
import { useErscheinung, type Erscheinung } from "@/lib/erscheinung";
import { tippen } from "@/lib/haptik";
import { useStand } from "@/lib/stand";
import { abstand, DUNKEL, farben, HELL, RAND, schrift, type Palette } from "@/lib/theme";

const ZIELE = [15, 30, 50, 80];
const ZEITEN: [number, number][] = [
  [7, 0],
  [12, 30],
  [17, 0],
  [19, 0],
  [21, 0],
];
const KLASSEN = ["B", "A", "A2", "A1", "AM", "BE"];

/** Kleines Handy-Bild in den Farben eines Schemas. */
function Vorschau({ p }: { p: Palette }) {
  return (
    <View style={{ width: 72, height: 104, padding: 8, gap: 6, backgroundColor: p.grund }}>
      <View style={{ width: 30, height: 6, borderRadius: 3, backgroundColor: p.text }} />
      <View style={{ height: 24, borderRadius: 6, backgroundColor: p.flaeche, borderWidth: 1, borderColor: p.linie, padding: 5, gap: 3 }}>
        <View style={{ width: "70%", height: 4, borderRadius: 2, backgroundColor: p.text3 }} />
        <View style={{ width: "45%", height: 4, borderRadius: 2, backgroundColor: p.orange }} />
      </View>
      <View style={{ height: 18, borderRadius: 6, backgroundColor: p.flaeche, borderWidth: 1, borderColor: p.linie }} />
      <View style={{ height: 12, borderRadius: 4, backgroundColor: p.orange, marginTop: "auto" }} />
    </View>
  );
}

const ERSCHEINUNGEN: { id: Erscheinung; titel: string }[] = [
  { id: "dunkel", titel: "Dunkel" },
  { id: "hell", titel: "Hell" },
  { id: "system", titel: "Wie iPhone" },
];

/** Auswahl Dunkel / Hell / wie das iPhone – mit kleinen Vorschau-Bildern. */
function Darstellung() {
  const { wahl, waehlen } = useErscheinung();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: abstand(4), paddingHorizontal: abstand(3), borderRadius: 16, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie }}>
      {ERSCHEINUNGEN.map((e) => {
        const aktiv = wahl === e.id;
        return (
          <Pressable
            key={e.id}
            onPress={() => {
              if (aktiv) return;
              tippen();
              waehlen(e.id, ["/profil", "/einstellungen"]);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: aktiv }}
            accessibilityLabel={e.titel}
            style={{ flex: 1, alignItems: "center", gap: 10 }}
          >
            <View
              style={{
                borderRadius: 14,
                overflow: "hidden",
                borderWidth: 2,
                borderColor: aktiv ? farben.orange : farben.linieStark,
              }}
            >
              <Vorschau p={e.id === "hell" ? HELL : DUNKEL} />
              {e.id === "system" ? (
                <View style={{ position: "absolute", top: 0, bottom: 0, left: 36, width: 36, overflow: "hidden" }}>
                  <View style={{ marginLeft: -36 }}>
                    <Vorschau p={HELL} />
                  </View>
                </View>
              ) : null}
            </View>
            <Text style={{ ...schrift.textMittel, fontSize: 14, color: farben.text }}>{e.titel}</Text>
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: aktiv ? farben.orange : "transparent",
                borderWidth: aktiv ? 0 : 1.5,
                borderColor: farben.text4,
              }}
            >
              {aktiv ? <Icon name="checkmark" size={14} color={farben.aufOrange} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const SUPPORT = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;
const DATENSCHUTZ = process.env.EXPO_PUBLIC_DATENSCHUTZ_URL;
const IMPRESSUM = process.env.EXPO_PUBLIC_IMPRESSUM_URL;
const AGB = process.env.EXPO_PUBLIC_AGB_URL;

export default function Einstellungen() {
  const insets = useSafeAreaInsets();
  const { stand, setzen, zuruecksetzen } = useStand();
  const { session, profil, gast, anzeigeName, profilSpeichern, passwortAendern, benutzernameFrei, benutzernameAendern } = useKonto();
  const rechte = useClipRechte();
  const [name, setName] = useState(anzeigeName);
  const [nameAngefasst, setNameAngefasst] = useState(false);
  const [speichert, setSpeichert] = useState(false);
  const [benutzer, setBenutzer] = useState(profil?.benutzername ?? "");
  const [benutzerAngefasst, setBenutzerAngefasst] = useState(false);
  const [frei, setFrei] = useState<boolean | null>(null);
  const [speichertBenutzer, setSpeichertBenutzer] = useState(false);

  // Werte übernehmen, sobald das Profil geladen ist (solange nichts getippt wurde).
  useEffect(() => {
    if (!nameAngefasst) setName(anzeigeName);
  }, [anzeigeName, nameAngefasst]);
  useEffect(() => {
    if (!benutzerAngefasst) setBenutzer(profil?.benutzername ?? "");
  }, [profil?.benutzername, benutzerAngefasst]);

  const benutzerGueltig = /^[a-z0-9_.]{3,20}$/.test(benutzer);
  const benutzerGeaendert = Boolean(profil) && benutzer !== profil?.benutzername;

  // Verfügbarkeit prüfen, kurz nachdem man aufgehört hat zu tippen.
  useEffect(() => {
    setFrei(null);
    if (!benutzerGeaendert || !benutzerGueltig) return;
    const t = setTimeout(async () => setFrei(await benutzernameFrei(benutzer)), 450);
    return () => clearTimeout(t);
  }, [benutzer, benutzerGeaendert, benutzerGueltig, benutzernameFrei]);

  async function benutzerSpeichern() {
    setSpeichertBenutzer(true);
    const f = await benutzernameAendern(benutzer);
    setSpeichertBenutzer(false);
    if (f) Alert.alert("Nicht gespeichert", f);
    else {
      setBenutzerAngefasst(false);
      Alert.alert("Gespeichert", `Du heißt jetzt @${benutzer}.`);
    }
  }
  const [neuesPasswort, setNeuesPasswort] = useState("");
  const [aendertPasswort, setAendertPasswort] = useState(false);

  async function passwortSpeichern() {
    setAendertPasswort(true);
    const f = await passwortAendern(neuesPasswort);
    setAendertPasswort(false);
    if (f) Alert.alert("Nicht geändert", f);
    else {
      setNeuesPasswort("");
      Alert.alert("Passwort geändert", "Ab jetzt meldest du dich mit dem neuen Passwort an.");
    }
  }

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
    else setNameAngefasst(false);
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
      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: abstand(2), paddingBottom: insets.bottom + abstand(10), gap: abstand(7) }} keyboardShouldPersistTaps="handled">
        <View>
          <Abschnitt titel="Darstellung" klein />
          <Darstellung />
        </View>

        <View>
          <Abschnitt titel="Tagesziel" klein />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: abstand(2) }}>
            {ZIELE.map((z) => (
              <Chip key={z} text={`${z} Fragen`} aktiv={stand.tagesziel === z} onPress={() => setzen({ tagesziel: z })} />
            ))}
          </View>
          <T v="klein" style={{ marginTop: abstand(2) }}>
            30 Fragen am Tag sind etwa 15 Minuten – genug, um in wenigen Wochen prüfungsreif zu sein.
          </T>
        </View>

        <View>
          <Abschnitt titel="Führerscheinklasse" klein />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: abstand(2) }}>
            {KLASSEN.map((k) => (
              <Chip key={k} text={`Klasse ${k}`} aktiv={stand.klasse === k} onPress={() => klasseAendern(k)} />
            ))}
          </View>
        </View>

        {session ? (
          <View>
            <Abschnitt titel="Bundesland" klein />
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
          <Abschnitt titel="Erinnerung" klein />
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
          <Abschnitt titel="Profil" klein />
          <View style={{ gap: abstand(2) }}>
            <T v="klein">Name – so begrüßt dich die App</T>
            <Eingabe
              icon="person-outline"
              value={name}
              onChangeText={(t) => {
                setNameAngefasst(true);
                setName(t);
              }}
              placeholder="Dein Name"
              autoCapitalize="words"
              maxLength={40}
            />
            {name.trim() && name.trim() !== anzeigeName ? <Knopf titel="Namen speichern" klein laedt={speichert} onPress={nameSpeichern} /> : null}

            {profil ? (
              <>
                <T v="klein" style={{ marginTop: abstand(3) }}>
                  Benutzername – für Rangliste, Clips und Kommentare
                </T>
                <Eingabe
                  icon="at"
                  value={benutzer}
                  onChangeText={(t) => {
                    setBenutzerAngefasst(true);
                    setBenutzer(t.toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 20));
                  }}
                  placeholder="benutzername"
                  autoCapitalize="none"
                  autoCorrect={false}
                  fehler={benutzerGeaendert && (!benutzerGueltig || frei === false)}
                />
                {benutzerGeaendert ? (
                  <T v="klein" farbe={!benutzerGueltig || frei === false ? farben.rot : frei ? farben.gruen : farben.text3}>
                    {!benutzerGueltig
                      ? "3–20 Zeichen: Buchstaben, Zahlen, Punkt und Unterstrich."
                      : frei === false
                        ? "Dieser Benutzername ist schon vergeben."
                        : frei
                          ? "Der Benutzername ist frei."
                          : "Prüfe, ob der Name frei ist …"}
                  </T>
                ) : null}
                {benutzerGeaendert ? (
                  <Knopf titel="Benutzernamen speichern" klein laedt={speichertBenutzer} deaktiviert={!benutzerGueltig || frei !== true} onPress={benutzerSpeichern} />
                ) : null}
              </>
            ) : null}
          </View>
        </View>

        <View>
          <Abschnitt titel="Konto" klein />
          {session ? (
            <View style={{ gap: abstand(3) }}>
              <Gruppe>
                <Zeile icon="mail-outline" titel={session.user.email ?? ""} unter="E-Mail" />
              </Gruppe>
              <PasswortEingabe value={neuesPasswort} onChangeText={setNeuesPasswort} placeholder="Neues Passwort (mind. 8 Zeichen)" />
              {neuesPasswort.length > 0 ? (
                <Knopf titel="Passwort ändern" klein art="sekundaer" laedt={aendertPasswort} deaktiviert={neuesPasswort.length < 8} onPress={passwortSpeichern} />
              ) : null}
            </View>
          ) : (
            <Gruppe>
              <Zeile
                icon="person-add-outline"
                iconFarbe={farben.orange}
                titel="Konto erstellen"
                unter={gast ? "Sichert deinen Fortschritt, schaltet Liga, Likes und Kommentare frei" : undefined}
                onPress={() => router.push("/registrieren")}
              />
              <Zeile icon="log-in-outline" titel="Ich habe schon ein Konto" onPress={() => router.push("/anmelden")} />
            </Gruppe>
          )}
        </View>

        {rechte.ersteller ? (
          <View>
            <Abschnitt titel="Clips" klein />
            <Gruppe>
              <Zeile icon="film-outline" iconFarbe={farben.orange} titel="Clip hochladen" unter="Kurzes Video für alle im Clips-Tab" onPress={() => router.push("/clip-hochladen")} />
              {rechte.inhaber ? (
                <Zeile icon="people-outline" titel="Clip-Ersteller verwalten" unter="Wer außer dir Videos hochladen darf" onPress={() => router.push("/clip-ersteller")} />
              ) : null}
            </Gruppe>
          </View>
        ) : null}

        <View>
          <Abschnitt titel="Hilfe & Rechtliches" klein />
          <Gruppe>
            {SUPPORT ? <Zeile icon="help-buoy-outline" titel="Hilfe & Kontakt" onPress={() => Linking.openURL(`mailto:${SUPPORT}`)} /> : null}
            {DATENSCHUTZ ? <Zeile icon="shield-outline" titel="Datenschutz" onPress={() => Linking.openURL(DATENSCHUTZ)} /> : null}
            {IMPRESSUM ? <Zeile icon="document-text-outline" titel="Impressum" onPress={() => Linking.openURL(IMPRESSUM)} /> : null}
            {AGB ? <Zeile icon="reader-outline" titel="AGB" onPress={() => Linking.openURL(AGB)} /> : null}
            <Zeile icon="images-outline" titel="Bildnachweise" onPress={() => router.push("/bildnachweise")} />
          </Gruppe>
        </View>

        <View>
          <Abschnitt titel="Daten" klein />
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
