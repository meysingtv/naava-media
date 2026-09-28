import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuswahlFeld, AuthRahmen, Feld, FeldHinweis, PasswortFeld, Wechsel, type Auswahl } from "@/components/auth-rahmen";
import { Icon } from "@/components/icon";
import { Oder, SozialAnmeldung } from "@/components/sozial-anmeldung";
import { Knopf, T } from "@/components/ui";
import { useKonto, type Rolle } from "@/lib/konto";
import { tippen } from "@/lib/haptik";
import { useStand } from "@/lib/stand";
import { serverVerbunden } from "@/lib/supabase";
import { abstand, farben, radius, RAND, schrift } from "@/lib/theme";

const ROLLEN: Auswahl<Rolle>[] = [
  { id: "schueler", titel: "Fahrschüler", unter: "Ich lerne für die Prüfung", icon: "school-outline" },
  { id: "fahrlehrer", titel: "Fahrlehrer", unter: "Ich bilde Fahrschüler aus", icon: "id-card-outline" },
];

const KLASSEN: Auswahl<string>[] = [
  { id: "B", titel: "Klasse B", unter: "Pkw" },
  { id: "A", titel: "Klasse A", unter: "Motorrad" },
  { id: "A2", titel: "Klasse A2", unter: "Motorrad bis 35 kW" },
  { id: "A1", titel: "Klasse A1", unter: "Leichtkraftrad" },
  { id: "AM", titel: "Klasse AM", unter: "Roller bis 45 km/h" },
  { id: "BE", titel: "Klasse BE", unter: "Pkw mit Anhänger" },
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
type Land = (typeof LAENDER)[number];

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

/** Ländervorwahl als Liste von unten. */
function VorwahlWahl({ offen, land, onWahl, onSchliessen }: { offen: boolean; land: Land; onWahl: (l: Land) => void; onSchliessen: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={offen} transparent animationType="slide" onRequestClose={onSchliessen}>
      <Pressable onPress={onSchliessen} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" }}>
        <Pressable style={{ backgroundColor: farben.flaeche2, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: abstand(3), paddingBottom: insets.bottom + abstand(3) }}>
          <View style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: farben.flaeche3, marginBottom: abstand(3) }} />
          <T v="h3" style={{ paddingHorizontal: RAND, marginBottom: abstand(2) }}>
            Ländervorwahl
          </T>
          <ScrollView style={{ maxHeight: 420 }}>
            {LAENDER.map((l) => (
              <Pressable
                key={l.code}
                onPress={() => {
                  tippen();
                  onWahl(l);
                }}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13, paddingHorizontal: RAND, backgroundColor: pressed ? farben.flaeche3 : "transparent" })}
              >
                <Text style={{ fontSize: 22 }}>{l.flagge}</Text>
                <Text style={{ ...schrift.textMittel, fontSize: 16, color: farben.text, flex: 1 }}>{l.name}</Text>
                <Text style={{ ...schrift.textHalb, fontSize: 15, color: farben.text3 }}>{l.vorwahl}</Text>
                {l.code === land.code ? <Icon name="checkmark" size={18} color={farben.orange} /> : null}
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function Registrieren() {
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

  const [rolle, setRolle] = useState<Rolle>("schueler");
  const [vorname, setVorname] = useState("");
  const [nachname, setNachname] = useState("");
  const [benutzer, setBenutzer] = useState("");
  const [benutzerAngepasst, setBenutzerAngepasst] = useState(false);
  const [frei, setFrei] = useState<boolean | null>(null);
  const [land, setLand] = useState<Land>(LAENDER[0]);
  const [vorwahlOffen, setVorwahlOffen] = useState(false);
  const [telefon, setTelefon] = useState("");
  const [geburt, setGeburt] = useState("");
  const [klasse, setKlasse] = useState("B");
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
  const allesOk =
    vorname.trim().length >= 2 &&
    nachname.trim().length >= 1 &&
    benutzerGueltig &&
    frei !== false &&
    telefonOk &&
    geburtOk &&
    /\S+@\S+\.\S+/.test(email.trim()) &&
    passwort.length >= 8 &&
    passwortGleich;

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
      bundesland: null,
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
      <AuthRahmen titel="Fast geschafft." unter={`Wir haben dir eine E-Mail an ${email.trim()} geschickt. Bestätige deine Adresse und melde dich danach an – mit deiner E-Mail oder @${benutzer}.`}>
        <Knopf titel="Zur Anmeldung" icon="arrow-forward" onPress={() => router.replace("/anmelden")} style={{ marginTop: abstand(2) }} />
      </AuthRahmen>
    );
  }

  return (
    <AuthRahmen titel="Konto erstellen" unter="Beginne deine Reise zum Führerschein.">
      {!serverVerbunden ? (
        <View style={{ flexDirection: "row", gap: abstand(2), padding: abstand(3.5), borderRadius: radius.m, backgroundColor: farben.gelbSoft }}>
          <Icon name="cloud-offline-outline" size={18} color={farben.gelb} />
          <T v="klein" farbe={farben.gelb} style={{ flex: 1 }}>
            Die App ist noch mit keinem Server verbunden. Registrieren klappt erst danach – bis dahin kannst du ohne Konto lernen.
          </T>
        </View>
      ) : null}

      <View style={{ gap: abstand(5), marginTop: abstand(2) }}>
        <AuswahlFeld label="Ich bin" wert={rolle} optionen={ROLLEN} onWechsel={setRolle} />

        <View style={{ flexDirection: "row", gap: abstand(3) }}>
          <View style={{ flex: 1 }}>
            <Feld label="Vorname" value={vorname} onChangeText={setVorname} placeholder="Max" autoCapitalize="words" textContentType="givenName" autoComplete="given-name" />
          </View>
          <View style={{ flex: 1 }}>
            <Feld label="Nachname" value={nachname} onChangeText={setNachname} placeholder="Muster" autoCapitalize="words" textContentType="familyName" autoComplete="family-name" />
          </View>
        </View>

        <Feld
          label="Benutzername"
          icon="at"
          value={benutzer}
          onChangeText={(t) => {
            setBenutzerAngepasst(true);
            setBenutzer(t.toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 20));
          }}
          placeholder="dein_name"
          autoCapitalize="none"
          autoCorrect={false}
          fehler={frei === false}
        />
        <FeldHinweis
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

        <Feld
          label="Telefonnummer (optional)"
          links={
            <Pressable
              onPress={() => {
                tippen();
                setVorwahlOffen(true);
              }}
              accessibilityLabel={`Vorwahl ${land.vorwahl}, ändern`}
              style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingRight: abstand(3), marginRight: abstand(3), borderRightWidth: 1, borderColor: farben.linieStark, height: 24 }}
            >
              <Text style={{ fontSize: 17 }}>{land.flagge}</Text>
              <Text style={{ ...schrift.textHalb, fontSize: 16, color: farben.text }}>{land.vorwahl}</Text>
              <Icon name="chevron-down" size={13} color={farben.text3} />
            </Pressable>
          }
          icon="call-outline"
          value={telefon}
          onChangeText={(t) => setTelefon(t.replace(/[^\d ]/g, "").slice(0, 18))}
          placeholder="151 23456789"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          fehler={!telefonOk}
        />
        {!telefonOk ? <FeldHinweis farbe={farben.rot} text="Bitte eine gültige Telefonnummer eingeben." /> : null}

        <Feld
          label="Geburtsdatum (optional)"
          icon="calendar-outline"
          value={geburt}
          onChangeText={(t) => setGeburt(datumFormatieren(t))}
          placeholder="TT.MM.JJJJ"
          keyboardType="number-pad"
          maxLength={10}
          fehler={!geburtOk && geburt.length === 10}
        />
        {!geburtOk && geburt.length === 10 ? <FeldHinweis farbe={farben.rot} text="Dieses Datum gibt es nicht – bitte prüfen." /> : null}

        {rolle === "schueler" ? <AuswahlFeld label="Führerscheinklasse" wert={klasse} optionen={KLASSEN} onWechsel={setKlasse} /> : null}

        <Feld
          label="E-Mail"
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          placeholder="name@beispiel.de"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          autoComplete="email"
        />
        {/* Kein iOS-„Starkes Passwort“: iOS trägt sonst unbemerkt ein Zufallspasswort in
            beide Felder ein, das ohne verknüpfte Domain nirgends gespeichert wird – danach
            passt das eigene Passwort beim Anmelden nicht. „oneTimeCode“ schaltet das ab. */}
        <PasswortFeld label="Passwort" value={passwort} onChangeText={setPasswort} placeholder="Mindestens 8 Zeichen" textContentType="oneTimeCode" autoComplete="off" />
        <PasswortFeld
          label="Passwort bestätigen"
          value={passwort2}
          onChangeText={setPasswort2}
          placeholder="Noch einmal eingeben"
          textContentType="oneTimeCode"
          autoComplete="off"
          fehler={passwort2.length > 0 && !passwortGleich}
        />
        {passwort2.length > 0 ? (
          <FeldHinweis farbe={passwortGleich ? farben.gruen : farben.rot} text={passwortGleich ? "Die Passwörter stimmen überein." : "Die Passwörter sind nicht gleich."} />
        ) : null}
      </View>

      {fehler ? (
        <T v="klein" farbe={farben.rot} style={{ ...schrift.textHalb }}>
          {fehler}
        </T>
      ) : null}

      <Knopf titel="Registrieren" icon="arrow-forward" laedt={laedt} deaktiviert={!allesOk} onPress={absenden} style={{ marginTop: abstand(2) }} />
      <Wechsel frage="Bereits ein Konto?" aktion="Anmelden" onPress={() => router.replace("/anmelden")} />

      <Oder />
      <SozialAnmeldung rolle={rolle} onAngemeldet={() => setFertig(true)} onFehler={setFehler} />

      <VorwahlWahl
        offen={vorwahlOffen}
        land={land}
        onWahl={(l) => {
          setLand(l);
          setVorwahlOffen(false);
        }}
        onSchliessen={() => setVorwahlOffen(false)}
      />
    </AuthRahmen>
  );
}
