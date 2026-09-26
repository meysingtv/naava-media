import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { Chip, Eingabe, Knopf, Kopf, T } from "@/components/ui";
import { BUNDESLAENDER } from "@/lib/bundeslaender";
import { useKonto } from "@/lib/konto";
import { tippen } from "@/lib/haptik";
import { useStand } from "@/lib/stand";
import { serverVerbunden } from "@/lib/supabase";
import { abstand, farben, radius, RAND, schrift } from "@/lib/theme";

const KLASSEN: { id: string; titel: string; unter: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }[] = [
  { id: "B", titel: "Klasse B", unter: "Pkw", icon: "car-side" },
  { id: "A", titel: "Klasse A", unter: "Motorrad", icon: "motorbike" },
  { id: "A2", titel: "Klasse A2", unter: "Motorrad bis 35 kW", icon: "motorbike" },
  { id: "A1", titel: "Klasse A1", unter: "Leichtkraftrad", icon: "moped" },
  { id: "AM", titel: "Klasse AM", unter: "Roller bis 45 km/h", icon: "scooter" },
  { id: "BE", titel: "Klasse BE", unter: "Pkw mit Anhänger", icon: "truck-trailer" },
];

const SCHRITTE = ["Name", "Klasse", "Zugang"];

export default function Registrieren() {
  const insets = useSafeAreaInsets();
  const { registrieren, benutzernameFrei } = useKonto();
  const { setzen } = useStand();

  const [schritt, setSchritt] = useState(0);
  const [name, setName] = useState("");
  const [benutzer, setBenutzer] = useState("");
  const [benutzerAngepasst, setBenutzerAngepasst] = useState(false);
  const [frei, setFrei] = useState<boolean | null>(null);
  const [klasse, setKlasse] = useState("B");
  const [bundesland, setBundesland] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [bestaetigen, setBestaetigen] = useState(false);

  // Benutzername aus dem Vornamen vorschlagen, bis man ihn selbst ändert.
  useEffect(() => {
    if (benutzerAngepasst) return;
    const vorschlag = name
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9_.]/g, "")
      .slice(0, 18);
    setBenutzer(vorschlag);
  }, [name, benutzerAngepasst]);

  useEffect(() => {
    setFrei(null);
    if (benutzer.length < 3) return;
    const t = setTimeout(async () => setFrei(await benutzernameFrei(benutzer)), 450);
    return () => clearTimeout(t);
  }, [benutzer, benutzernameFrei]);

  const benutzerGueltig = /^[a-z0-9_.]{3,20}$/.test(benutzer);
  const schritt1Ok = name.trim().length >= 2 && benutzerGueltig && frei !== false;
  const schritt3Ok = /\S+@\S+\.\S+/.test(email.trim()) && passwort.length >= 8;

  async function absenden() {
    setFehler(null);
    setLaedt(true);
    const r = await registrieren({ name, benutzername: benutzer, email, passwort, klasse, bundesland });
    setLaedt(false);
    if (r.fehler) {
      setFehler(r.fehler);
      return;
    }
    setzen({ klasse });
    if (r.bestaetigen) setBestaetigen(true);
  }

  if (bestaetigen) {
    return (
      <View style={{ flex: 1, backgroundColor: farben.grund }}>
        <Kopf />
        <View style={{ flex: 1, paddingHorizontal: RAND, justifyContent: "center", gap: abstand(4) }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: farben.orangeSoft, alignItems: "center", justifyContent: "center" }}>
            <Icon name="mail-unread-outline" size={30} color={farben.orange} />
          </View>
          <T v="titel">Fast geschafft.</T>
          <T v="text">
            Wir haben dir eine E-Mail an {email.trim()} geschickt. Bestätige deine Adresse und melde dich danach hier an.
          </T>
          <Knopf titel="Zur Anmeldung" onPress={() => router.replace("/anmelden")} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: farben.grund }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Kopf
        titel="Konto erstellen"
        rechts={
          <T v="klein" style={{ marginRight: abstand(2) }}>
            {schritt + 1} / {SCHRITTE.length}
          </T>
        }
      />
      {/* Schritt-Anzeige als Fahrbahnstriche */}
      <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: RAND, marginBottom: abstand(6) }}>
        {SCHRITTE.map((s, i) => (
          <View key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= schritt ? farben.orange : farben.flaeche3 }} />
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingBottom: insets.bottom + abstand(8), gap: abstand(4) }} keyboardShouldPersistTaps="handled">
        {!serverVerbunden ? (
          <View style={{ flexDirection: "row", gap: abstand(2), padding: abstand(3.5), borderRadius: radius.m, backgroundColor: farben.gelbSoft }}>
            <Icon name="cloud-offline-outline" size={18} color={farben.gelb} />
            <T v="klein" farbe={farben.gelb} style={{ flex: 1 }}>
              Die App ist noch mit keinem Server verbunden. Registrieren klappt erst danach – bis dahin kannst du ohne Konto lernen.
            </T>
          </View>
        ) : null}

        {schritt === 0 ? (
          <>
            <T v="titel">Wie sollen wir dich nennen?</T>
            <T v="text">Dein Vorname erscheint in der App, dein Benutzername in der Rangliste.</T>
            <Eingabe icon="person-outline" value={name} onChangeText={setName} placeholder="Vorname" autoCapitalize="words" autoFocus />
            <Eingabe
              icon="at"
              value={benutzer}
              onChangeText={(t) => {
                setBenutzerAngepasst(true);
                setBenutzer(t.toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 20));
              }}
              placeholder="benutzername"
              autoCapitalize="none"
              autoCorrect={false}
              fehler={frei === false}
            />
            <T v="klein" farbe={frei === false ? farben.rot : frei ? farben.gruen : farben.text3}>
              {benutzer.length > 0 && !benutzerGueltig
                ? "3–20 Zeichen: Buchstaben, Zahlen, Punkt und Unterstrich."
                : frei === false
                  ? "Dieser Benutzername ist schon vergeben."
                  : frei
                    ? "Der Benutzername ist frei."
                    : "Nur Kleinbuchstaben, Zahlen, Punkt und Unterstrich."}
            </T>
            <Knopf titel="Weiter" icon="arrow-forward" deaktiviert={!schritt1Ok} onPress={() => setSchritt(1)} style={{ marginTop: abstand(2) }} />
          </>
        ) : null}

        {schritt === 1 ? (
          <>
            <T v="titel">Welchen Führerschein machst du?</T>
            <T v="text">Die Beispielfragen gelten für Klasse B. Weitere Klassen folgen.</T>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: abstand(3) }}>
              {KLASSEN.map((k) => {
                const aktiv = k.id === klasse;
                return (
                  <Pressable
                    key={k.id}
                    onPress={() => {
                      tippen();
                      setKlasse(k.id);
                    }}
                    style={({ pressed }) => ({
                      width: "47.5%",
                      padding: abstand(4),
                      borderRadius: radius.l,
                      borderWidth: 1.5,
                      borderColor: aktiv ? farben.orange : farben.linie,
                      backgroundColor: aktiv ? farben.orangeSoft : farben.flaeche,
                      gap: abstand(2),
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <MaterialCommunityIcons name={k.icon} size={28} color={aktiv ? farben.orange : farben.text2} />
                    <View>
                      <T v="h3">{k.titel}</T>
                      <T v="klein" numberOfLines={1}>
                        {k.unter}
                      </T>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ gap: abstand(2), marginTop: abstand(2) }}>
              <T v="h3">Wo lernst du?</T>
              <T v="klein">Für die Rangliste in deinem Bundesland – optional.</T>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: abstand(2), paddingVertical: abstand(1) }}>
                {BUNDESLAENDER.map((b) => (
                  <Chip key={b} text={b} aktiv={bundesland === b} onPress={() => setBundesland(bundesland === b ? null : b)} />
                ))}
              </ScrollView>
            </View>
            <View style={{ flexDirection: "row", gap: abstand(3), marginTop: abstand(2) }}>
              <Knopf titel="Zurück" art="sekundaer" onPress={() => setSchritt(0)} style={{ flex: 1 }} />
              <Knopf titel="Weiter" icon="arrow-forward" onPress={() => setSchritt(2)} style={{ flex: 2 }} />
            </View>
          </>
        ) : null}

        {schritt === 2 ? (
          <>
            <T v="titel">Dein Zugang</T>
            <T v="text">Mit deinem Konto ist dein Fortschritt gesichert – auch wenn du das Handy wechselst.</T>
            <Eingabe
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="E-Mail"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoFocus
            />
            <Eingabe
              icon="lock-closed-outline"
              value={passwort}
              onChangeText={setPasswort}
              placeholder="Passwort (mind. 8 Zeichen)"
              secureTextEntry
              textContentType="newPassword"
            />
            {fehler ? (
              <T v="klein" farbe={farben.rot} style={{ ...schrift.textHalb }}>
                {fehler}
              </T>
            ) : null}
            <View style={{ flexDirection: "row", gap: abstand(3), marginTop: abstand(2) }}>
              <Knopf titel="Zurück" art="sekundaer" onPress={() => setSchritt(1)} style={{ flex: 1 }} />
              <Knopf titel="Konto erstellen" laedt={laedt} deaktiviert={!schritt3Ok} onPress={absenden} style={{ flex: 2 }} />
            </View>
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
