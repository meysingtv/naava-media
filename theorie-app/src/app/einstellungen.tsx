import { useEffect, useRef, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BusIcon } from "phosphor-react-native/src/icons/Bus";
import { CarIcon } from "phosphor-react-native/src/icons/Car";
import { MopedIcon } from "phosphor-react-native/src/icons/Moped";
import { MotorcycleIcon } from "phosphor-react-native/src/icons/Motorcycle";
import { TractorIcon } from "phosphor-react-native/src/icons/Tractor";
import { TruckIcon } from "phosphor-react-native/src/icons/Truck";
import { TruckTrailerIcon } from "phosphor-react-native/src/icons/TruckTrailer";
import type { Icon as PhosphorIcon } from "phosphor-react-native";

import { GrossKopf, Seite } from "@/components/seite";
import { Abschnitt, Chip, Eingabe, Knopf, PasswortEingabe, Segment, T, Zeile } from "@/components/ui";
import { Logo } from "@/components/grafik";
import { dialog } from "@/components/dialog";
import { GlasGrund, GlasGruppe, GlasKarte } from "@/components/glas-flaeche";
import { Icon, type IconName } from "@/components/icon";
import { ProfilBild } from "@/components/profilbild";
import { Schalter } from "@/components/schalter";
import { BUNDESLAENDER } from "@/lib/bundeslaender";
import { useDarstellung, useFarbwelt } from "@/lib/darstellung";
import { useFenster } from "@/lib/fenster";
import { tippen } from "@/lib/haptik";
import { useClipRechte } from "@/lib/clips-server";
import { STATUS_TEXT, useBewerbungen, useMeineBewerbung } from "@/lib/creator";
import { erinnerungPlanen } from "@/lib/erinnerung";
import { uhrzeit } from "@/lib/format";
import { useKonto } from "@/lib/konto";
import { liveAboSetzen, liveAboStatus } from "@/lib/live";
import { useStand } from "@/lib/stand";
import { abstand, farben, leuchten, RAND, schrift, verlauf } from "@/lib/theme";

const ZIELE = [15, 30, 50, 80];
const ZEITEN: [number, number][] = [
  [7, 0],
  [12, 30],
  [17, 0],
  [19, 0],
  [21, 0],
];
const ZIEL_STUFE: Record<number, string> = { 15: "Locker", 30: "Normal", 50: "Ehrgeizig", 80: "Intensiv" };
// Führerscheinklassen, nach Fahrzeug sortiert
const KLASSEN: { id: string; text: string; symbol: PhosphorIcon }[] = [
  { id: "B", text: "Pkw bis 3,5 t", symbol: CarIcon },
  { id: "BE", text: "Pkw mit Anhänger", symbol: CarIcon },
  { id: "AM", text: "Roller und Moped bis 45 km/h", symbol: MopedIcon },
  { id: "A1", text: "Leichtkraftrad bis 125 cm³", symbol: MotorcycleIcon },
  { id: "A2", text: "Motorrad bis 35 kW", symbol: MotorcycleIcon },
  { id: "A", text: "Motorrad ohne Leistungsgrenze", symbol: MotorcycleIcon },
  { id: "C1", text: "Lkw bis 7,5 t", symbol: TruckIcon },
  { id: "C1E", text: "Lkw bis 7,5 t mit Anhänger", symbol: TruckTrailerIcon },
  { id: "C", text: "Lkw über 3,5 t", symbol: TruckIcon },
  { id: "CE", text: "Lkw mit Anhänger", symbol: TruckTrailerIcon },
  { id: "D1", text: "Kleinbus bis 16 Fahrgäste", symbol: BusIcon },
  { id: "D1E", text: "Kleinbus mit Anhänger", symbol: BusIcon },
  { id: "D", text: "Bus", symbol: BusIcon },
  { id: "DE", text: "Bus mit Anhänger", symbol: BusIcon },
  { id: "L", text: "Zugmaschine bis 40 km/h", symbol: TractorIcon },
  { id: "T", text: "Traktor bis 60 km/h", symbol: TractorIcon },
];

const SUPPORT = process.env.EXPO_PUBLIC_SUPPORT_EMAIL;
const DATENSCHUTZ = process.env.EXPO_PUBLIC_DATENSCHUTZ_URL;
const IMPRESSUM = process.env.EXPO_PUBLIC_IMPRESSUM_URL;
const AGB = process.env.EXPO_PUBLIC_AGB_URL;

export default function Einstellungen() {
  const insets = useSafeAreaInsets();
  const { stand, setzen, zuruecksetzen } = useStand();
  const { session, profil, gast, anzeigeName, profilSpeichern, passwortAendern, benutzernameFrei, benutzernameAendern, rolleSetzen } = useKonto();
  const rechte = useClipRechte();
  const { liste: bewerbungen } = useBewerbungen(rechte.inhaber);
  const offeneBewerbungen = (bewerbungen ?? []).filter((b) => b.status === "offen").length;
  const { bewerbung: meineBewerbung } = useMeineBewerbung();
  const { darstellung, setzen: darstellungSetzen, belohnungen, belohnungenSetzen } = useDarstellung();
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
    if (f) dialog("Nicht gespeichert", f);
    else {
      setBenutzerAngefasst(false);
      dialog("Gespeichert", `Du heißt jetzt @${benutzer}.`);
    }
  }
  const [neuesPasswort, setNeuesPasswort] = useState("");
  const [aendertPasswort, setAendertPasswort] = useState(false);
  const [liveAbo, setLiveAbo] = useState(false);
  const { width } = useFenster();
  const breit = width >= 700;

  useEffect(() => {
    if (session) liveAboStatus().then(setLiveAbo);
  }, [session]);

  async function liveAboAendern(an: boolean) {
    setLiveAbo(an);
    try {
      const ergebnis = await liveAboSetzen(an);
      if (ergebnis === "keine_erlaubnis") {
        setLiveAbo(false);
        dialog("Mitteilungen sind aus", "Erlaube Mitteilungen für Fahrschul Pro in den iPhone-Einstellungen, dann sagen wir dir Bescheid, wenn ein Live startet.");
        return;
      }
      setLiveAbo(ergebnis);
    } catch (e) {
      setLiveAbo(!an);
      dialog("Nicht gespeichert", (e as Error).message);
    }
  }

  async function passwortSpeichern() {
    setAendertPasswort(true);
    const f = await passwortAendern(neuesPasswort);
    setAendertPasswort(false);
    if (f) dialog("Nicht geändert", f);
    else {
      setNeuesPasswort("");
      dialog("Passwort geändert", "Ab jetzt meldest du dich mit dem neuen Passwort an.");
    }
  }

  async function erinnerungAendern(an: boolean, stunde = stand.erinnerung.stunde, minute = stand.erinnerung.minute) {
    const ok = await erinnerungPlanen(an, stunde, minute);
    if (!ok) {
      dialog("Mitteilungen sind aus", "Erlaube Mitteilungen für Fahrschul Pro in den iPhone-Einstellungen, dann klappt die Erinnerung.");
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
    if (f) dialog("Nicht gespeichert", f);
    else setNameAngefasst(false);
  }

  function zuruecksetzenFragen() {
    dialog("Fortschritt zurücksetzen?", "Alle Antworten, Serien, Abzeichen und Simulationen auf diesem Gerät werden gelöscht. Das lässt sich nicht rückgängig machen.", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Zurücksetzen", style: "destructive", onPress: zuruecksetzen },
    ]);
  }

  return (
    <Seite>
      <GlasGrund />
      <GrossKopf titel="Einstellungen" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: abstand(3), paddingBottom: insets.bottom + abstand(10), gap: abstand(7) }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <KontoKopf
          name={anzeigeName}
          unter={profil ? `@${profil.benutzername}` : gast ? "Gastmodus" : (session?.user.email ?? "")}
          infos={[`Klasse ${stand.klasse}`, profil?.rolle === "fahrlehrer" ? "Fahrlehrer" : null, profil?.bundesland ?? null].filter((k): k is string => Boolean(k))}
        />

        <View>
          <Abschnitt titel="Darstellung" klein />
          <View style={{ flexDirection: "row", gap: abstand(3) }}>
            <DarstellungKachel art="dunkel" aktiv={darstellung === "dunkel"} onPress={() => darstellungSetzen("dunkel")} />
            <DarstellungKachel art="hell" aktiv={darstellung === "hell"} onPress={() => darstellungSetzen("hell")} />
          </View>
          <T v="klein" style={{ marginTop: abstand(2) }}>
            Gilt für die ganze App – nur Clips, Kamera und Anmeldung bleiben dunkel.
          </T>
          <GlasGruppe style={{ marginTop: abstand(4) }}>
            <Zeile
              icon="flash"
              iconFarbe={farben.orange}
              titel="XP, HP & Abzeichen einblenden"
              unter={belohnungen ? "Beim Lernen und in den Ergebnissen sichtbar" : "Aus – keine Einblendungen beim Lernen"}
              rechts={<Schalter wert={belohnungen} onWechsel={belohnungenSetzen} />}
            />
          </GlasGruppe>
        </View>

        {/* iPad: Tagesziel und Klasse nebeneinander statt gestreckt */}
        <View style={breit ? { flexDirection: "row", alignItems: "flex-start", gap: abstand(4) } : { gap: abstand(7) }}>
          <View style={breit ? { flex: 1 } : null}>
            <Abschnitt titel="Tagesziel" klein />
            <WahlKarte titel={String(stand.tagesziel)} einheit="Fragen am Tag" unter={`${ZIEL_STUFE[stand.tagesziel] ?? "Eigenes Ziel"} · etwa ${Math.round(stand.tagesziel / 2)} Minuten`}>
              <Segment optionen={ZIELE.map((z) => ({ id: String(z), titel: String(z) }))} wert={String(stand.tagesziel)} onWechsel={(id) => setzen({ tagesziel: Number(id) })} />
            </WahlKarte>
            <T v="klein" style={{ marginTop: abstand(2) }}>
              Mit 30 Fragen am Tag bist du in wenigen Wochen prüfungsreif.
            </T>
          </View>

          <View style={breit ? { flex: 1 } : null}>
            <Abschnitt titel="Führerscheinklasse" klein />
            <WahlKarte titel={`Klasse ${stand.klasse}`} unter={KLASSEN.find((k) => k.id === stand.klasse)?.text ?? ""}>
              <KlassenLeiste wert={stand.klasse} onWahl={klasseAendern} />
            </WahlKarte>
            <T v="klein" style={{ marginTop: abstand(2) }}>
              Wische zur Seite für Lkw, Bus und Traktor.
            </T>
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
                    if (f) dialog("Nicht gespeichert", f);
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
          <Abschnitt titel="Mitteilungen" klein />
          <GlasGruppe>
            <Zeile
              icon="notifications"
              iconFarbe="#FF4A3D"
              titel="Tägliche Erinnerung"
              unter={stand.erinnerung.an ? `Jeden Tag um ${uhrzeit(stand.erinnerung.stunde, stand.erinnerung.minute)} Uhr` : "Aus"}
              rechts={
                <Schalter wert={stand.erinnerung.an} onWechsel={(an) => erinnerungAendern(an)} />
              }
            />
            {session ? (
              <Zeile
                icon="radio"
                iconFarbe="#A66BFF"
                titel="Live-Streams"
                unter={liveAbo ? "Mitteilung, sobald ein Live startet" : "Aus"}
                rechts={<Schalter wert={liveAbo} onWechsel={liveAboAendern} />}
              />
            ) : null}
          </GlasGruppe>
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
          <Karte style={{ gap: abstand(2) }}>
            {profil ? (
              <>
                <T v="klein">Ich bin</T>
                <View style={{ flexDirection: "row", gap: abstand(2) }}>
                  {(
                    [
                      ["schueler", "Fahrschüler"],
                      ["fahrlehrer", "Fahrlehrer"],
                    ] as const
                  ).map(([id, titel]) => (
                    <Chip
                      key={id}
                      text={titel}
                      aktiv={profil.rolle === id}
                      onPress={async () => {
                        if (profil.rolle === id) return;
                        const f = await rolleSetzen(id);
                        if (f) dialog("Nicht gespeichert", f);
                      }}
                    />
                  ))}
                </View>
                <View style={{ height: abstand(2) }} />
              </>
            ) : null}
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
          </Karte>
        </View>

        <View>
          <Abschnitt titel="Konto" klein />
          {session ? (
            <View style={{ gap: abstand(3) }}>
              <GlasGruppe>
                <Zeile icon="mail" iconFarbe="#4DA3FF" titel={session.user.email ?? ""} unter="E-Mail" />
              </GlasGruppe>
              <PasswortEingabe value={neuesPasswort} onChangeText={setNeuesPasswort} placeholder="Neues Passwort (mind. 8 Zeichen)" />
              {neuesPasswort.length > 0 ? (
                <Knopf titel="Passwort ändern" klein art="sekundaer" laedt={aendertPasswort} deaktiviert={neuesPasswort.length < 8} onPress={passwortSpeichern} />
              ) : null}
            </View>
          ) : (
            <GlasGruppe>
              <Zeile
                icon="person-add-outline"
                iconFarbe={farben.orange}
                titel="Konto erstellen"
                unter={gast ? "Sichert deinen Fortschritt, schaltet Liga, Likes und Kommentare frei" : undefined}
                onPress={() => router.push("/registrieren")}
              />
              <Zeile icon="log-in-outline" iconFarbe="#4DA3FF" titel="Ich habe schon ein Konto" onPress={() => router.push("/anmelden")} />
            </GlasGruppe>
          )}
        </View>

        {rechte.ersteller ? (
          <View>
            <Abschnitt titel="Clips" klein />
            <GlasGruppe>
              <Zeile icon="film-outline" iconFarbe={farben.orange} titel="Clip hochladen" unter="Kurzes Video für alle im Clips-Tab" onPress={() => router.push("/clip-hochladen")} />
              {rechte.inhaber ? (
                <Zeile icon="people" iconFarbe="#4DA3FF" titel="Clip-Ersteller verwalten" unter="Wer außer dir Videos hochladen darf" onPress={() => router.push("/clip-ersteller")} />
              ) : null}
            </GlasGruppe>
          </View>
        ) : null}

        {session ? (
          <View>
            <Abschnitt titel="Creator" klein />
            <GlasGruppe>
              {rechte.inhaber ? (
                <Zeile
                  icon="radio-outline"
                  iconFarbe={farben.rot}
                  titel="Creator-Bewerbungen"
                  unter={offeneBewerbungen ? `${offeneBewerbungen} offen` : "Wer live gehen und Clips hochladen darf"}
                  onPress={() => router.push("/creator-verwaltung")}
                />
              ) : (
                <Zeile
                  icon="radio-outline"
                  iconFarbe={farben.rot}
                  titel={meineBewerbung?.status === "angenommen" ? "Creator" : "Creator werden"}
                  unter={meineBewerbung && meineBewerbung.status !== "zurueckgezogen" ? STATUS_TEXT[meineBewerbung.status] : "Live gehen und Clips hochladen"}
                  onPress={() => router.push("/creator-bewerbung")}
                />
              )}
            </GlasGruppe>
          </View>
        ) : null}

        {rechte.inhaber ? (
          <View>
            <Abschnitt titel="Lernen" klein />
            <GlasGruppe>
              <Zeile icon="play-circle-outline" iconFarbe={farben.orange} titel="Erklärvideos" unter="Videos zu einzelnen Fragen – erscheinen beim Lernen" onPress={() => router.push("/erklaervideos")} />
            </GlasGruppe>
          </View>
        ) : null}

        <View>
          <Abschnitt titel="Hilfe & Rechtliches" klein />
          <GlasGruppe>
            {SUPPORT ? <Zeile icon="help-buoy" iconFarbe="#4ED053" titel="Hilfe & Kontakt" onPress={() => Linking.openURL(`mailto:${SUPPORT}`)} /> : null}
            {DATENSCHUTZ ? <Zeile icon="shield-checkmark" iconFarbe="#4DA3FF" titel="Datenschutz" onPress={() => Linking.openURL(DATENSCHUTZ)} /> : null}
            {IMPRESSUM ? <Zeile icon="document-text" iconFarbe="#7C8BA1" titel="Impressum" onPress={() => Linking.openURL(IMPRESSUM)} /> : null}
            {AGB ? <Zeile icon="reader" iconFarbe="#7C8BA1" titel="AGB" onPress={() => Linking.openURL(AGB)} /> : null}
            <Zeile icon="images" iconFarbe="#E0A100" titel="Bildnachweise" onPress={() => router.push("/bildnachweise")} />
          </GlasGruppe>
        </View>

        <View>
          <Abschnitt titel="Daten" klein />
          <GlasGruppe>
            <Zeile icon="refresh-circle-outline" titel="Fortschritt zurücksetzen" unter="Antworten, Serien, Abzeichen" gefahr ohnePfeil onPress={zuruecksetzenFragen} />
          </GlasGruppe>
        </View>

        <View style={{ alignItems: "center", gap: abstand(2), marginTop: abstand(2) }}>
          <Logo groesse={24} />
          <T v="klein">Version 1.0 · Beispielfragen, nicht der amtliche Katalog</T>
        </View>
      </ScrollView>
    </Seite>
  );
}

// ---------------------------------------------------------------------------
// Bausteine der Einstellungen
// ---------------------------------------------------------------------------

function Karte({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <GlasKarte style={[{ borderRadius: 22, padding: 16 }, style]}>{children}</GlasKarte>;
}

/** Oben: wer angemeldet ist – groß und mittig, ohne Kasten. */
function KontoKopf({ name, unter, infos }: { name: string; unter: string; infos: string[] }) {
  const f = useFarbwelt();
  return (
    <View style={{ alignItems: "center", paddingTop: abstand(2) }}>
      <View style={[{ borderRadius: 47, padding: 3, backgroundColor: f.hell ? "#FFFFFF" : "rgba(255,255,255,0.16)" }, leuchten(f.hell ? "#3C2C18" : "#000000", f.hell ? 0.12 : 0.45, 16, 5)]}>
        <ProfilBild name={name} groesse={88} rand={0} />
      </View>
      <Text style={{ ...schrift.titel, fontSize: 26, lineHeight: 32, color: f.text, letterSpacing: -0.3, marginTop: 14 }} numberOfLines={1}>
        {name}
      </Text>
      {unter ? (
        <Text style={{ ...schrift.textMittel, fontSize: 14.5, color: f.text2, marginTop: 1 }} numberOfLines={1}>
          {unter}
        </Text>
      ) : null}
      {infos.length ? (
        <Text style={{ ...schrift.textMittel, fontSize: 13, color: f.text3, marginTop: 6 }} numberOfLines={1}>
          {infos.join("  ·  ")}
        </Text>
      ) : null}
    </View>
  );
}

/** Vorschau-Kachel für Nachtfahrt oder Tagfahrt. */
function DarstellungKachel({ art, aktiv, onPress }: { art: "dunkel" | "hell"; aktiv: boolean; onPress: () => void }) {
  const f = useFarbwelt();
  const dunkel = art === "dunkel";
  const icon: IconName = dunkel ? "moon" : "sunny";
  return (
    <Pressable
      onPress={() => {
        if (aktiv) return;
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: aktiv }}
      accessibilityLabel={dunkel ? "Nachtfahrt, dunkel" : "Tagfahrt, hell"}
      style={({ pressed }) => [{ flex: 1, borderRadius: 22, transform: [{ scale: pressed ? 0.97 : 1 }] }, aktiv ? leuchten("#FC5B0E", f.hell ? 0.3 : 0.45, 12, 3) : null]}
    >
      <View style={{ borderRadius: 22, overflow: "hidden", borderWidth: 2, borderColor: aktiv ? "#FC5B0E" : f.hell ? "rgba(20,23,27,0.08)" : "rgba(255,255,255,0.1)" }}>
        {/* Mini-Vorschau der App in dieser Darstellung */}
        <LinearGradient colors={dunkel ? ["#1A2230", "#07090C"] : ["#FFFFFF", "#ECE6DC"]} style={{ height: 96, padding: 12, gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ width: 46, height: 7, borderRadius: 4, backgroundColor: dunkel ? "rgba(255,255,255,0.75)" : "rgba(20,23,27,0.7)" }} />
            <Icon name={icon} size={18} color={dunkel ? "#9DB4FF" : "#FFB400"} />
          </View>
          <View style={{ height: 18, borderRadius: 7, backgroundColor: dunkel ? "rgba(255,255,255,0.08)" : "rgba(20,23,27,0.06)" }} />
          <View style={{ flexDirection: "row", gap: 5 }}>
            <LinearGradient colors={verlauf.knopf} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 2, height: 16, borderRadius: 8 }} />
            <View style={{ flex: 1, height: 16, borderRadius: 8, backgroundColor: dunkel ? "rgba(255,255,255,0.08)" : "rgba(20,23,27,0.06)" }} />
          </View>
        </LinearGradient>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: f.hell ? "rgba(255,255,255,0.85)" : "rgba(22,24,28,0.6)" }}>
          <View>
            <Text style={{ ...schrift.textHalb, fontSize: 14.5, color: f.text }}>{dunkel ? "Nachtfahrt" : "Tagfahrt"}</Text>
            <Text style={{ ...schrift.text, fontSize: 12, color: f.text3 }}>{dunkel ? "Dunkel" : "Hell"}</Text>
          </View>
          <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: aktiv ? "#FC5B0E" : "transparent", borderWidth: aktiv ? 0 : 2, borderColor: f.hell ? "rgba(20,23,27,0.2)" : "rgba(255,255,255,0.25)" }}>
            {aktiv ? <Icon name="checkmark" size={14} color="#FFFFFF" /> : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/** Auswahl in einer Glaskarte: oben groß, was gewählt ist, darunter die Wahl. */
function WahlKarte({ titel, einheit, unter, children }: { titel: string; einheit?: string; unter: string; children: React.ReactNode }) {
  const f = useFarbwelt();
  return (
    <GlasKarte style={{ borderRadius: 22, padding: 16, gap: 14 }}>
      <View>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 7 }}>
          <Text style={{ ...schrift.titel, fontSize: 30, lineHeight: 36, color: f.text, letterSpacing: -0.5, fontVariant: ["tabular-nums"] }}>{titel}</Text>
          {einheit ? <Text style={{ ...schrift.textHalb, fontSize: 15, color: f.text2 }}>{einheit}</Text> : null}
        </View>
        {unter ? <Text style={{ ...schrift.textMittel, fontSize: 13.5, color: f.orange, marginTop: 1 }}>{unter}</Text> : null}
      </View>
      {children}
    </GlasKarte>
  );
}

const KACHEL = 64;
const LUECKE = 8;

/** Alle Klassen als waagrechte Leiste zum Wischen – die gewählte leuchtet orange. */
function KlassenLeiste({ wert, onWahl }: { wert: string; onWahl: (id: string) => void }) {
  const f = useFarbwelt();
  const leiste = useRef<ScrollView>(null);
  const geholt = useRef(false);
  const index = KLASSEN.findIndex((k) => k.id === wert);
  return (
    <ScrollView
      ref={leiste}
      horizontal
      showsHorizontalScrollIndicator={false}
      // Bis an den Kartenrand wischen; oben und unten Platz, damit das Leuchten nicht abgeschnitten wird
      style={{ marginHorizontal: -16, marginVertical: -10 }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: LUECKE }}
      onContentSizeChange={() => {
        // Beim Öffnen die gewählte Klasse ins Bild holen
        if (geholt.current) return;
        geholt.current = true;
        if (index > 3) leiste.current?.scrollTo({ x: (index - 1.5) * (KACHEL + LUECKE), animated: false });
      }}
    >
      {KLASSEN.map((k) => {
        const aktiv = k.id === wert;
        const S = k.symbol;
        const inhalt = (
          <>
            <S size={22} color={aktiv ? "#FFFFFF" : f.text2} weight="fill" />
            <Text style={{ ...schrift.textFett, fontSize: 15, color: aktiv ? "#FFFFFF" : f.text }}>{k.id}</Text>
          </>
        );
        const form = { flex: 1, borderRadius: 18, alignItems: "center", justifyContent: "center", gap: 4 } as const;
        return (
          <Pressable
            key={k.id}
            onPress={() => {
              if (aktiv) return;
              tippen();
              onWahl(k.id);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: aktiv }}
            accessibilityLabel={`Klasse ${k.id}, ${k.text}`}
            style={({ pressed }) => [{ width: KACHEL, height: 70, borderRadius: 18, transform: [{ scale: pressed ? 0.95 : 1 }] }, aktiv ? leuchten(f.orange, f.hell ? 0.3 : 0.45, 10, 3) : null]}
          >
            {aktiv ? (
              <LinearGradient colors={verlauf.segment} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={form}>
                {inhalt}
              </LinearGradient>
            ) : (
              <View style={[form, { backgroundColor: f.hell ? "rgba(20,23,27,0.05)" : "rgba(255,255,255,0.07)" }]}>{inhalt}</View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
