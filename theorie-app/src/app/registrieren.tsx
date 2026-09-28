import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "@/components/icon";
import { Oder, SozialAnmeldung } from "@/components/sozial-anmeldung";
import { Chip, Eingabe, Knopf, Kopf, PasswortEingabe, T } from "@/components/ui";
import { BUNDESLAENDER } from "@/lib/bundeslaender";
import { useKonto, type Rolle } from "@/lib/konto";
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

const ROLLEN: { id: Rolle; titel: string; unter: string; icon: IconName }[] = [
  { id: "schueler", titel: "Fahrschüler", unter: "Ich lerne für die Prüfung", icon: "school-outline" },
  { id: "fahrlehrer", titel: "Fahrlehrer", unter: "Ich bilde aus und teile Clips", icon: "id-card-outline" },
];

const LAENDER = [
  { code: "DE", vorwahl: "+49", flagge: "🇩🇪", name: "Deutschland" },
  { code: "AT", vorwahl: "+43", flagge: "🇦🇹", name: "Österreich" },
  { code: "CH", vorwahl: "+41", flagge: "🇨🇭", name: "Schweiz" },
  { code: "NL", vorwahl: "+31", flagge: "🇳🇱", name: "Niederlande" },
  { code: "BE", vorwahl: "+32", flagge: "🇧🇪", name: "Belgien" },
  { code: "LU", vorwahl: "+352", flagge: "🇱🇺", name: "Luxemburg" },
  { code: "FR", vorwahl: "+33", flagge: "🇫🇷", name: "Frankreich" },
  { code: "PL", vorwahl: "+48", flagge: "🇵🇱", name: "Polen" },
  { code: "IT", vorwahl: "+39", flagge: "🇮🇹", name: "Italien" },
  { code: "TR", vorwahl: "+90", flagge: "🇹🇷", name: "Türkei" },
  { code: "GB", vorwahl: "+44", flagge: "🇬🇧", name: "Vereinigtes Königreich" },
  { code: "US", vorwahl: "+1", flagge: "🇺🇸", name: "USA" },
];

const SCHRITTE = ["Du", "Über dich", "Zugang"];

/** „12052007“ → „12.05.2007“ beim Tippen. */
function datumFormatieren(t: string): string {
  const z = t.replace(/\D/g, "").slice(0, 8);
  return [z.slice(0, 2), z.slice(2, 4), z.slice(4, 8)].filter(Boolean).join(".");
}

/** „12.05.2007“ → „2007-05-12“, wenn es ein echtes Datum ist (Alter 12–100). */
function datumLesen(t: string): string | null {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(t);
  if (!m) return null;
  const [tag, monat, jahr] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(jahr, monat - 1, tag);
  if (d.getFullYear() !== jahr || d.getMonth() !== monat - 1 || d.getDate() !== tag) return null;
  const alter = (Date.now() - d.getTime()) / (365.25 * 86_400_000);
  if (alter < 12 || alter > 100) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function Feldhinweis({ text, farbe }: { text: string; farbe?: string }) {
  return (
    <T v="klein" farbe={farbe ?? farben.text3} style={{ marginTop: -abstand(1.5), marginLeft: abstand(1) }}>
      {text}
    </T>
  );
}

/** Zwei Karten: Fahrschüler oder Fahrlehrer. */
function RollenWahl({ wert, onWechsel }: { wert: Rolle; onWechsel: (r: Rolle) => void }) {
  return (
    <View style={{ gap: abstand(2) }}>
      <T v="mini">Ich bin</T>
      <View style={{ flexDirection: "row", gap: abstand(3) }}>
        {ROLLEN.map((r) => {
          const aktiv = r.id === wert;
          return (
            <Pressable
              key={r.id}
              onPress={() => {
                tippen();
                onWechsel(r.id);
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: aktiv }}
              accessibilityLabel={r.titel}
              style={({ pressed }) => ({
                flex: 1,
                padding: abstand(3.5),
                gap: abstand(2),
                borderRadius: radius.l,
                borderWidth: 1.5,
                borderColor: aktiv ? farben.orange : farben.linie,
                backgroundColor: aktiv ? farben.orangeSoft : farben.flaeche,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: aktiv ? farben.orange : farben.flaeche2, alignItems: "center", justifyContent: "center" }}>
                  <Icon name={r.icon} size={20} color={aktiv ? farben.aufOrange : farben.text2} />
                </View>
                {aktiv ? <Icon name="checkmark-circle" size={22} color={farben.orange} /> : null}
              </View>
              <View>
                <T v="h3">{r.titel}</T>
                <T v="klein" numberOfLines={2}>
                  {r.unter}
                </T>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Telefonnummer mit Ländervorwahl. */
function TelefonEingabe({ land, onLand, nummer, onNummer }: { land: (typeof LAENDER)[number]; onLand: (l: (typeof LAENDER)[number]) => void; nummer: string; onNummer: (t: string) => void }) {
  const [wahlOffen, setWahlOffen] = useState(false);
  const insets = useSafeAreaInsets();
  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", height: 54, borderRadius: 16, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linieStark }}>
        <Pressable
          onPress={() => {
            tippen();
            setWahlOffen(true);
          }}
          accessibilityLabel={`Vorwahl ${land.vorwahl}, ändern`}
          style={{ flexDirection: "row", alignItems: "center", gap: 6, height: "100%", paddingLeft: abstand(4), paddingRight: abstand(3), borderRightWidth: 1, borderColor: farben.linie }}
        >
          <Text style={{ fontSize: 18 }}>{land.flagge}</Text>
          <Text style={{ ...schrift.textHalb, fontSize: 16, color: farben.text }}>{land.vorwahl}</Text>
          <Icon name="chevron-down" size={14} color={farben.text3} />
        </Pressable>
        <TextInput
          value={nummer}
          onChangeText={(t) => onNummer(t.replace(/[^\d ]/g, "").slice(0, 18))}
          placeholder="Telefonnummer (optional)"
          placeholderTextColor={farben.text4}
          selectionColor={farben.orange}
          keyboardAppearance="dark"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          style={{ flex: 1, height: "100%", paddingHorizontal: abstand(3), ...schrift.textMittel, fontSize: 16, color: farben.text }}
        />
      </View>
      <Modal visible={wahlOffen} transparent animationType="slide" onRequestClose={() => setWahlOffen(false)}>
        <Pressable onPress={() => setWahlOffen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
          <Pressable style={{ backgroundColor: farben.flaeche2, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: abstand(3), paddingBottom: insets.bottom + abstand(3) }}>
            <View style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: farben.flaeche3, marginBottom: abstand(3) }} />
            <T v="h3" style={{ paddingHorizontal: RAND, marginBottom: abstand(2) }}>
              Ländervorwahl
            </T>
            <ScrollView style={{ maxHeight: 420 }}>
              {LAENDER.map((l) => {
                const aktiv = l.code === land.code;
                return (
                  <Pressable
                    key={l.code}
                    onPress={() => {
                      tippen();
                      onLand(l);
                      setWahlOffen(false);
                    }}
                    style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13, paddingHorizontal: RAND, backgroundColor: pressed ? farben.flaeche3 : "transparent" })}
                  >
                    <Text style={{ fontSize: 22 }}>{l.flagge}</Text>
                    <Text style={{ ...schrift.textMittel, fontSize: 16, color: farben.text, flex: 1 }}>{l.name}</Text>
                    <Text style={{ ...schrift.textHalb, fontSize: 15, color: farben.text3 }}>{l.vorwahl}</Text>
                    {aktiv ? <Icon name="checkmark" size={18} color={farben.orange} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default function Registrieren() {
  const insets = useSafeAreaInsets();
  const { registrieren, benutzernameFrei, gast, session } = useKonto();
  // Kam man aus dem Gastmodus (z. B. von den Clips), geht es danach dorthin zurück.
  const [ausGastmodus] = useState(gast);
  const [fertig, setFertig] = useState(false);

  // Erst weiter, wenn die Anmeldung wirklich da ist (sonst blockiert die Navigation).
  useEffect(() => {
    if (!fertig || !session) return;
    if (ausGastmodus && router.canGoBack()) router.back();
    else router.replace("/heute");
  }, [fertig, session, ausGastmodus]);
  const { setzen } = useStand();

  const [schritt, setSchritt] = useState(0);
  const [rolle, setRolle] = useState<Rolle>("schueler");
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [benutzer, setBenutzer] = useState("");
  const [benutzerAngepasst, setBenutzerAngepasst] = useState(false);
  const [frei, setFrei] = useState<boolean | null>(null);
  const [land, setLand] = useState(LAENDER[0]);
  const [telefon, setTelefon] = useState("");
  const [geburt, setGeburt] = useState("");
  const [klasse, setKlasse] = useState("B");
  const [bundesland, setBundesland] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [passwort, setPasswort] = useState("");
  const [passwort2, setPasswort2] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [bestaetigen, setBestaetigen] = useState(false);

  // Benutzername aus dem Vornamen vorschlagen, bis man ihn selbst ändert.
  useEffect(() => {
    if (benutzerAngepasst) return;
    const vorschlag = vorname
      .toLowerCase()
      .replace(/ä/g, "ae")
      .replace(/ö/g, "oe")
      .replace(/ü/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9_.]/g, "")
      .slice(0, 18);
    setBenutzer(vorschlag);
  }, [vorname, benutzerAngepasst]);

  useEffect(() => {
    setFrei(null);
    if (benutzer.length < 3) return;
    const t = setTimeout(async () => setFrei(await benutzernameFrei(benutzer)), 450);
    return () => clearTimeout(t);
  }, [benutzer, benutzernameFrei]);

  const benutzerGueltig = /^[a-z0-9_.]{3,20}$/.test(benutzer);
  const telefonZiffern = telefon.replace(/\D/g, "").replace(/^0+/, "");
  const telefonOk = telefonZiffern.length === 0 || (telefonZiffern.length >= 6 && telefonZiffern.length <= 14);
  const geburtIso = datumLesen(geburt);
  const geburtOk = geburt.length === 0 || geburtIso != null;
  const passwortGleich = passwort2.length > 0 && passwort === passwort2;

  const schritt1Ok = vorname.trim().length >= 2 && nachname.trim().length >= 1 && benutzerGueltig && frei !== false;
  const schritt2Ok = telefonOk && geburtOk;
  const schritt3Ok = /\S+@\S+\.\S+/.test(email.trim()) && passwort.length >= 8 && passwortGleich;

  async function absenden() {
    setFehler(null);
    setLaedt(true);
    const r = await registrieren({
      rolle,
      vorname,
      nachname,
      benutzername: benutzer,
      telefon: telefonZiffern ? `${land.vorwahl}${telefonZiffern}` : null,
      geburtsdatum: geburtIso,
      email,
      passwort,
      klasse,
      bundesland,
    });
    setLaedt(false);
    if (r.fehler) {
      setFehler(r.fehler);
      return;
    }
    setzen({ klasse });
    if (r.bestaetigen) {
      setBestaetigen(true);
      return;
    }
    setFertig(true);
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
            Wir haben dir eine E-Mail an {email.trim()} geschickt. Bestätige deine Adresse und melde dich danach hier an – mit deiner E-Mail oder @{benutzer}.
          </T>
          <Knopf titel="Zur Anmeldung" onPress={() => router.replace("/anmelden")} />
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: farben.grund }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Kopf
        onZurueck={schritt > 0 ? () => setSchritt(schritt - 1) : undefined}
        rechts={
          <T v="klein" style={{ marginRight: abstand(2) }}>
            {schritt + 1} / {SCHRITTE.length}
          </T>
        }
      />
      {/* Schritt-Anzeige als Fahrbahnstriche */}
      <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: RAND, marginBottom: abstand(5) }}>
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
            <View style={{ gap: abstand(1) }}>
              <T v="titel">Konto erstellen</T>
              <T v="text">Beginne deine Reise zum Führerschein.</T>
            </View>
            <RollenWahl wert={rolle} onWechsel={setRolle} />
            {rolle === "fahrlehrer" ? (
              <View style={{ flexDirection: "row", gap: abstand(2), padding: abstand(3), borderRadius: radius.m, backgroundColor: farben.orangeSoft }}>
                <Icon name="film-outline" size={17} color={farben.orange} />
                <T v="klein" farbe={farben.text2} style={{ flex: 1 }}>
                  Als Fahrlehrer kannst du im Clips-Tab eigene Videos hochladen.
                </T>
              </View>
            ) : null}
            <Eingabe value={vorname} onChangeText={setVorname} placeholder="Vorname" autoCapitalize="words" textContentType="givenName" autoComplete="given-name" />
            <Eingabe value={nachname} onChangeText={setNachname} placeholder="Nachname" autoCapitalize="words" textContentType="familyName" autoComplete="family-name" />
            <Eingabe
              icon="at"
              value={benutzer}
              onChangeText={(t) => {
                setBenutzerAngepasst(true);
                setBenutzer(t.toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 20));
              }}
              placeholder="Benutzername"
              autoCapitalize="none"
              autoCorrect={false}
              fehler={frei === false}
            />
            <Feldhinweis
              farbe={frei === false ? farben.rot : frei ? farben.gruen : undefined}
              text={
                benutzer.length > 0 && !benutzerGueltig
                  ? "3–20 Zeichen: a–z, 0–9, Punkt und Unterstrich."
                  : frei === false
                    ? "Dieser Benutzername ist schon vergeben."
                    : frei
                      ? "Der Benutzername ist frei."
                      : "3–20 Zeichen: a–z, 0–9, Punkt und Unterstrich."
              }
            />
            <Knopf titel="Weiter" icon="arrow-forward" deaktiviert={!schritt1Ok} onPress={() => setSchritt(1)} style={{ marginTop: abstand(1) }} />

            <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, paddingVertical: abstand(1) }}>
              <T v="text" farbe={farben.text3}>
                Bereits ein Konto?
              </T>
              <Pressable
                onPress={() => {
                  tippen();
                  router.replace("/anmelden");
                }}
                hitSlop={8}
              >
                <T v="textStark" farbe={farben.orange}>
                  Anmelden
                </T>
              </Pressable>
            </View>

            <Oder />
            <SozialAnmeldung rolle={rolle} onAngemeldet={() => setFertig(true)} onFehler={setFehler} />
            {fehler ? (
              <T v="klein" farbe={farben.rot} style={{ ...schrift.textHalb }}>
                {fehler}
              </T>
            ) : null}
          </>
        ) : null}

        {schritt === 1 ? (
          <>
            <View style={{ gap: abstand(1) }}>
              <T v="titel">Über dich</T>
              <T v="text">Telefon und Geburtstag sind freiwillig und nur für dich sichtbar.</T>
            </View>
            <TelefonEingabe land={land} onLand={setLand} nummer={telefon} onNummer={setTelefon} />
            {!telefonOk ? <Feldhinweis farbe={farben.rot} text="Bitte eine gültige Telefonnummer eingeben." /> : null}
            <Eingabe
              icon="calendar-outline"
              value={geburt}
              onChangeText={(t) => setGeburt(datumFormatieren(t))}
              placeholder="Geburtsdatum (TT.MM.JJJJ, optional)"
              keyboardType="number-pad"
              maxLength={10}
              fehler={!geburtOk && geburt.length === 10}
            />
            {!geburtOk && geburt.length === 10 ? <Feldhinweis farbe={farben.rot} text="Dieses Datum gibt es nicht – bitte prüfen." /> : null}

            {rolle === "schueler" ? (
              <View style={{ gap: abstand(2), marginTop: abstand(2) }}>
                <T v="h3">Welchen Führerschein machst du?</T>
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
              </View>
            ) : null}
            <View style={{ gap: abstand(2), marginTop: abstand(2) }}>
              <T v="h3">{rolle === "fahrlehrer" ? "Wo bildest du aus?" : "Wo lernst du?"}</T>
              <T v="klein">Für die Rangliste in deinem Bundesland – optional.</T>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: abstand(2), paddingVertical: abstand(1) }}>
                {BUNDESLAENDER.map((b) => (
                  <Chip key={b} text={b} aktiv={bundesland === b} onPress={() => setBundesland(bundesland === b ? null : b)} />
                ))}
              </ScrollView>
            </View>
            <View style={{ flexDirection: "row", gap: abstand(3), marginTop: abstand(2) }}>
              <Knopf titel="Zurück" art="sekundaer" onPress={() => setSchritt(0)} style={{ flex: 1 }} />
              <Knopf titel="Weiter" icon="arrow-forward" deaktiviert={!schritt2Ok} onPress={() => setSchritt(2)} style={{ flex: 2 }} />
            </View>
          </>
        ) : null}

        {schritt === 2 ? (
          <>
            <View style={{ gap: abstand(1) }}>
              <T v="titel">Dein Zugang</T>
              <T v="text">Mit deinem Konto ist dein Fortschritt gesichert – auch wenn du das Handy wechselst.</T>
            </View>
            <Eingabe
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="E-Mail"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              autoFocus
            />
            <PasswortEingabe value={passwort} onChangeText={setPasswort} placeholder="Passwort (mind. 8 Zeichen)" textContentType="newPassword" autoComplete="password-new" />
            <PasswortEingabe
              value={passwort2}
              onChangeText={setPasswort2}
              placeholder="Passwort bestätigen"
              textContentType="newPassword"
              autoComplete="password-new"
              fehler={passwort2.length > 0 && !passwortGleich}
            />
            {passwort2.length > 0 ? (
              <Feldhinweis farbe={passwortGleich ? farben.gruen : farben.rot} text={passwortGleich ? "Die Passwörter stimmen überein." : "Die Passwörter sind nicht gleich."} />
            ) : (
              <Feldhinweis text="Tipp: Mit dem Auge siehst du, was du eingetippt hast." />
            )}
            {fehler ? (
              <T v="klein" farbe={farben.rot} style={{ ...schrift.textHalb }}>
                {fehler}
              </T>
            ) : null}
            <View style={{ flexDirection: "row", gap: abstand(3), marginTop: abstand(2) }}>
              <Knopf titel="Zurück" art="sekundaer" onPress={() => setSchritt(1)} style={{ flex: 1 }} />
              <Knopf titel="Registrieren" laedt={laedt} deaktiviert={!schritt3Ok} onPress={absenden} style={{ flex: 2 }} />
            </View>
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
