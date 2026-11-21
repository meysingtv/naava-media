import { useEffect, useRef, useState } from "react";
import { Animated, BackHandler, Easing, Image, KeyboardAvoidingView, Modal, Pressable, ScrollView, Text, TextInput, useColorScheme, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { FIGUR, FigurBlase, FrageKopf, GrosseFigur, HELL, START, StartKnopf, startSchrift, WahlKarte } from "@/components/start-teile";
import { BUNDESLAENDER } from "@/lib/bundeslaender";
import { useDarstellung } from "@/lib/darstellung";
import { einrichtungErledigt } from "@/lib/einrichtung";
import { erinnerungPlanen } from "@/lib/erinnerung";
import { useDesktop } from "@/lib/fenster";
import { erfolg, tippen } from "@/lib/haptik";
import { HAUPT_KLASSEN, KLASSEN } from "@/lib/klassen";
import { CODE_LAENGE, useCodeAblauf, useKonto, type Registrierung, type Rolle } from "@/lib/konto";
import { pruefungstagErinnerungPlanen } from "@/lib/pruefungstag";
import { useStand } from "@/lib/stand";
import { serverVerbunden } from "@/lib/supabase";

// Start nach dem Willkommen: Fragen mit der Figur (Darstellung, Name, Rolle,
// Bundesland, Klasse, Prüfungstermin, Erinnerungen), am Ende E-Mail und Code
// – damit entsteht das Konto bzw. man meldet sich an. Mit ?modus=anmelden
// geht es direkt zur E-Mail.

type Schritt = "darstellung" | "name" | "hallo" | "rolle" | "land" | "klasse" | "termin" | "mitteilung" | "email" | "code" | "fertig";
type Wahl = "hell" | "dunkel" | "system";

const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** „Jörg-Peter“ → „joergpeter“ + Zahl, passend zu [a-z0-9_.]{3,20}. */
function benutzerVorschlag(name: string): string {
  let b = name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 14);
  if (b.length < 3) b = `${b}fahrer`;
  return `${b}${Math.floor(1000 + Math.random() * 9000)}`;
}

export default function Start() {
  const desktop = useDesktop();
  // Am PC gibt es die zweigeteilte Registrierung.
  if (desktop) return <Redirect href="/registrieren" />;
  return <StartHandy />;
}

function StartHandy() {
  const insets = useSafeAreaInsets();
  const anmelden = useLocalSearchParams<{ modus?: string }>().modus === "anmelden";
  const { setzen: darstellungSetzen } = useDarstellung();
  const system = useColorScheme();
  const { setzen } = useStand();
  const { benutzernameFrei, alsGast, session } = useKonto();
  const ablauf = useCodeAblauf();

  const reihe: Schritt[] = anmelden ? ["email", "code"] : ["darstellung", "name", "hallo", "rolle", "land", "klasse", "termin", "mitteilung", "email", "code", "fertig"];
  const [schritt, setSchritt] = useState<Schritt>(reihe[0]);
  const [wahl, setWahl] = useState<Wahl | null>(null);
  const [name, setName] = useState("");
  const [rolle, setRolle] = useState<Rolle | null>(null);
  const [land, setLand] = useState<string | null>(null);
  const [landOffen, setLandOffen] = useState(false);
  const [klasse, setKlasse] = useState<string | null>(null);
  const [termin, setTermin] = useState<Date | null>(null);
  const [erinnerung, setErinnerung] = useState(false);
  const [email, setEmail] = useState("");
  const [angemeldet, setAngemeldet] = useState(false);
  const blende = useRef(new Animated.Value(1)).current;
  const codeFeld = useRef<TextInput>(null);

  const reiheOhne = reihe.filter((s) => !(s === "termin" && rolle === "fahrlehrer"));
  const platz = reiheOhne.indexOf(schritt);
  const vorname = name.trim().split(/\s+/)[0] ?? "";

  function wechseln(neu: Schritt) {
    Animated.timing(blende, { toValue: 0, duration: 110, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
      setSchritt(neu);
      Animated.timing(blende, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    });
  }
  const weiter = () => {
    const n = reiheOhne[platz + 1];
    if (n) wechseln(n);
  };
  const zurueck = () => {
    if (schritt === "code") {
      ablauf.andereAdresse();
      return wechseln("email");
    }
    // Die Begrüßung überspringt man beim Zurückgehen.
    let i = platz - 1;
    if (reiheOhne[i] === "hallo") i -= 1;
    if (i >= 0) wechseln(reiheOhne[i]);
    else router.back();
  };

  // Android-Zurück: einen Schritt zurück.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (schritt === "fertig") return true;
      zurueck();
      return true;
    });
    return () => sub.remove();
  });

  // „Schön, dich kennenzulernen“ geht nach kurzer Zeit von selbst weiter.
  useEffect(() => {
    if (schritt !== "hallo") return;
    const t = setTimeout(weiter, 1900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schritt]);

  // Erst weiter, wenn die Anmeldung wirklich da ist.
  useEffect(() => {
    if (!angemeldet || !session) return;
    einrichtungErledigt();
    if (anmelden) {
      router.replace("/heute");
      return;
    }
    const iso = termin ? new Date(termin.getFullYear(), termin.getMonth(), termin.getDate(), 10).toISOString() : null;
    setzen({ klasse: klasse ?? "B", pruefungstermin: iso, erinnerung: { an: erinnerung, stunde: 18, minute: 0 } });
    if (iso) pruefungstagErinnerungPlanen(iso, true);
    erfolg();
    wechseln("fertig");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [angemeldet, session]);

  function darstellungWaehlen(w: Wahl) {
    setWahl(w);
    darstellungSetzen(w === "system" ? (system === "dark" ? "dunkel" : "hell") : w);
  }

  async function erinnerungAn() {
    const ok = await erinnerungPlanen(true, 18, 0).catch(() => false);
    setErinnerung(ok);
    weiter();
  }

  async function codeAnfordern() {
    if (!/\S+@\S+\.\S+/.test(email.trim())) return ablauf.setFehler("Bitte gib eine gültige E-Mail-Adresse ein.");
    let neu: Registrierung | undefined;
    if (!anmelden) {
      let benutzername = benutzerVorschlag(vorname);
      for (let i = 0; i < 3 && (await benutzernameFrei(benutzername)) === false; i++) benutzername = benutzerVorschlag(vorname);
      neu = { rolle: rolle ?? "schueler", vorname: vorname || "Fahrschüler", nachname: "", benutzername, telefon: null, geburtsdatum: null, klasse: klasse ?? "B", bundesland: land };
    }
    if (await ablauf.senden(email, neu)) wechseln("code");
  }

  async function codePruefen(c: string) {
    if (await ablauf.pruefen(c)) setAngemeldet(true);
  }

  function ohneKonto() {
    alsGast(vorname);
    setzen({ klasse: klasse ?? "B", pruefungstermin: termin ? new Date(termin.getFullYear(), termin.getMonth(), termin.getDate(), 10).toISOString() : null, erinnerung: { an: erinnerung, stunde: 18, minute: 0 } });
    einrichtungErledigt();
    router.replace("/heute");
  }

  // Unten: der passende Knopf je Schritt
  const fuss = (() => {
    switch (schritt) {
      case "darstellung":
        return <StartKnopf titel="Weiter" art="lila" deaktiviert={!wahl} onPress={weiter} />;
      case "name":
        return <StartKnopf titel="Weiter" art="lila" deaktiviert={vorname.length < 2} onPress={weiter} />;
      case "rolle":
        return <StartKnopf titel="Weiter" art="lila" deaktiviert={!rolle} onPress={weiter} />;
      case "land":
        return <StartKnopf titel="Weiter" art="lila" deaktiviert={!land} onPress={weiter} />;
      case "klasse":
        return <StartKnopf titel="Weiter" art="lila" deaktiviert={!klasse} onPress={weiter} />;
      case "termin":
        // Ohne Datum: „Weiß ich noch nicht“, mit Datum: „Weiter“.
        return termin ? (
          <StartKnopf titel="Weiter" art="lila" onPress={weiter} />
        ) : (
          <StartKnopf titel="Weiß ich noch nicht" art="zart" onPress={weiter} />
        );
      case "mitteilung":
        return (
          <View style={{ gap: 10 }}>
            <StartKnopf
              titel="Später"
              art="zart"
              onPress={() => {
                setErinnerung(false);
                weiter();
              }}
            />
            <StartKnopf titel="Erinnerungen aktivieren" art="lila" onPress={erinnerungAn} />
          </View>
        );
      case "email":
        return <StartKnopf titel="Code senden" art="lila" laedt={ablauf.laedt} deaktiviert={!/\S+@\S+\.\S+/.test(email.trim()) || !serverVerbunden} onPress={codeAnfordern} />;
      case "code":
        return <StartKnopf titel="Bestätigen" art="lila" laedt={ablauf.laedt} deaktiviert={ablauf.code.length < CODE_LAENGE} onPress={() => codePruefen(ablauf.code)} />;
      case "fertig":
        return <StartKnopf titel="Los geht's" art="lila" onPress={() => router.replace("/heute")} />;
      default:
        return null;
    }
  })();

  return (
    <View style={{ flex: 1, backgroundColor: HELL.grund }}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 20 }}>
          {schritt === "fertig" || schritt === "hallo" ? <View style={{ height: 44 }} /> : <FrageKopf anteil={(platz + 1) / reiheOhne.length} onZurueck={zurueck} />}
        </View>

        <Animated.View style={{ flex: 1, opacity: blende }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 16 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {schritt === "darstellung" ? (
              <>
                <FigurBlase figur="neugierig" teile={["Hell oder dunkel? Such dir deinen ", ["Look"], " aus!"]} />
                <View style={{ flex: 1, justifyContent: "center", paddingVertical: 24 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                    {(
                      [
                        { id: "hell", titel: "Hell" },
                        { id: "dunkel", titel: "Dunkel" },
                        { id: "system", titel: "System" },
                      ] as { id: Wahl; titel: string }[]
                    ).map((o) => (
                      <Pressable
                        key={o.id}
                        onPress={() => {
                          tippen();
                          darstellungWaehlen(o.id);
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: wahl === o.id }}
                        style={{ flex: 1, alignItems: "center", gap: 12 }}
                      >
                        <Text style={{ ...startSchrift.titel, fontSize: 22, color: HELL.tinte }}>{o.titel}</Text>
                        <View style={{ width: "100%", aspectRatio: 1, maxWidth: 110, borderRadius: 24, padding: 4, borderWidth: 3, borderColor: wahl === o.id ? START.lila : "transparent" }}>
                          <View style={{ flex: 1, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: HELL.linie, flexDirection: "row", backgroundColor: o.id === "dunkel" ? START.grund : "#FFFFFF" }}>
                            {o.id === "system" ? <View style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "50%", backgroundColor: START.grund }} /> : null}
                            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                              <Icon name={o.id === "hell" ? "sunny-outline" : o.id === "dunkel" ? "moon-outline" : "contrast-outline"} sf={o.id === "hell" ? "sun.max" : o.id === "dunkel" ? "moon" : "circle.lefthalf.filled"} size={34} color={o.id === "dunkel" ? "#FFFFFF" : o.id === "system" ? START.lila : HELL.tinte} weight="regular" />
                            </View>
                          </View>
                        </View>
                        <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2.5, borderColor: wahl === o.id ? START.lila : "#C9C4DB", backgroundColor: wahl === o.id ? START.lila : "transparent", alignItems: "center", justifyContent: "center" }}>
                          {wahl === o.id ? <Icon name="checkmark" size={16} color="#FFFFFF" /> : null}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={{ ...startSchrift.text, fontSize: 15, color: HELL.tinte2, textAlign: "center", marginTop: 24 }}>„System“ folgt der Einstellung deines Handys.</Text>
                </View>
              </>
            ) : null}

            {schritt === "name" ? (
              <>
                <FigurBlase figur="winken" teile={["Hi! Wie ", ["heißt"], " du?"]} />
                <View style={{ flex: 1, justifyContent: "center", paddingVertical: 24 }}>
                  <TextInput
                    value={name}
                    onChangeText={(t) => setName(t.slice(0, 30))}
                    placeholder="Dein Name"
                    placeholderTextColor="#BDB8D0"
                    autoFocus
                    autoCapitalize="words"
                    autoCorrect={false}
                    textContentType="givenName"
                    autoComplete="given-name"
                    returnKeyType="next"
                    onSubmitEditing={() => vorname.length >= 2 && weiter()}
                    selectionColor={START.lila}
                    style={{ ...startSchrift.titel, fontSize: 44, color: HELL.tinte, textAlign: "center", paddingVertical: 8 }}
                  />
                  <Text style={{ ...startSchrift.text, fontSize: 15, color: HELL.tinte2, textAlign: "center", marginTop: 18 }}>
                    Du kannst auch deinen <Text style={startSchrift.textHalb}>Spitznamen</Text> nehmen.
                  </Text>
                </View>
              </>
            ) : null}

            {schritt === "hallo" ? (
              <Pressable onPress={weiter} style={{ flex: 1, justifyContent: "center", gap: 28 }}>
                <Text style={{ ...startSchrift.titel, fontSize: 40, lineHeight: 42, letterSpacing: -0.6, color: HELL.tinte, textAlign: "center" }}>
                  Schön, dich kennenzulernen,{"\n"}
                  <Text style={{ color: START.lila }}>{vorname}</Text>!
                </Text>
                <GrosseFigur figur="freude" groesse={240} />
              </Pressable>
            ) : null}

            {schritt === "rolle" ? (
              <>
                <FigurBlase figur="denken" teile={["Wofür ", ["nutzt"], " du die App?"]} />
                <View style={{ gap: 12, marginTop: 28 }}>
                  {(
                    [
                      { id: "schueler", titel: "Ich mache meinen Führerschein", unter: "Theorie lernen und die Prüfung bestehen", icon: "school-outline" },
                      { id: "fahrlehrer", titel: "Ich bin Fahrlehrer", unter: "Wir bestätigen dich kurz, dann geht's los", icon: "id-card-outline" },
                    ] as const
                  ).map((o) => (
                    <WahlKarte key={o.id} aktiv={rolle === o.id} onPress={() => setRolle(o.id)} label={o.titel}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16 }}>
                        <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: "#EEEBFB", alignItems: "center", justifyContent: "center" }}>
                          <Icon name={o.icon} size={24} color={START.lila} />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={{ ...startSchrift.titel, fontSize: 21, color: HELL.tinte }}>{o.titel}</Text>
                          <Text style={{ ...startSchrift.text, fontSize: 14, color: HELL.tinte2 }}>{o.unter}</Text>
                        </View>
                      </View>
                    </WahlKarte>
                  ))}
                </View>
              </>
            ) : null}

            {schritt === "land" ? (
              <>
                <FigurBlase figur="grund" teile={["Wo machst du deinen ", ["Führerschein"], "?"]} />
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center", gap: 14, paddingVertical: 24 }}>
                  <View style={{ width: 96, height: 96, borderRadius: 48, overflow: "hidden", borderWidth: 4, borderColor: "#E6E2F2" }}>
                    <View style={{ flex: 1, backgroundColor: "#000000" }} />
                    <View style={{ flex: 1, backgroundColor: "#DD0000" }} />
                    <View style={{ flex: 1, backgroundColor: "#FFCE00" }} />
                  </View>
                  <Text style={{ ...startSchrift.titel, fontSize: 24, color: HELL.tinte }}>Deutschland</Text>
                  <Pressable
                    onPress={() => {
                      tippen();
                      setLandOffen(true);
                    }}
                    accessibilityRole="button"
                    style={{ alignSelf: "stretch", flexDirection: "row", alignItems: "center", height: 62, paddingHorizontal: 20, borderRadius: 20, backgroundColor: HELL.karte, borderWidth: 2, borderBottomWidth: 5, borderColor: land ? START.lila : HELL.linie, marginTop: 8 }}
                  >
                    <Icon name="location-outline" size={20} color={START.lila} />
                    <Text style={{ ...startSchrift.textHalb, fontSize: 17, color: land ? HELL.tinte : HELL.tinte3, flex: 1, marginLeft: 12 }}>{land ?? "Bundesland wählen"}</Text>
                    <Icon name="chevron-down" size={20} color={HELL.tinte} />
                  </Pressable>
                </View>
                <View style={{ alignItems: "center", gap: 6, paddingBottom: 8 }}>
                  <Icon name="shield-checkmark-outline" size={22} color={HELL.tinte3} />
                  <Text style={{ ...startSchrift.text, fontSize: 14.5, lineHeight: 20, color: HELL.tinte2, textAlign: "center" }}>
                    Damit wir dir passende <Text style={startSchrift.textHalb}>Infos zu Prüfung und Fahrschule</Text> zeigen.
                  </Text>
                </View>
              </>
            ) : null}

            {schritt === "klasse" ? (
              <>
                <FigurBlase figur="denken" teile={["Welche ", ["Klasse"], " machst du?"]} />
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 28 }}>
                  {KLASSEN.filter((k) => HAUPT_KLASSEN.includes(k.id)).map((k) => (
                    <WahlKarte key={k.id} aktiv={klasse === k.id} onPress={() => setKlasse(k.id)} label={`Klasse ${k.id}`} style={{ width: "47.5%", flexGrow: 1 }}>
                      <View style={{ alignItems: "center", paddingVertical: 16, gap: 2 }}>
                        <Text style={{ ...startSchrift.titel, fontSize: 34, color: klasse === k.id ? START.lila : HELL.tinte }}>{k.id}</Text>
                        <Text style={{ ...startSchrift.text, fontSize: 13.5, color: HELL.tinte2 }} numberOfLines={1}>
                          {k.kurz}
                        </Text>
                      </View>
                    </WahlKarte>
                  ))}
                </View>
              </>
            ) : null}

            {schritt === "termin" ? (
              <>
                <FigurBlase figur="grund" teile={["Wann ist deine ", ["Prüfung"], "?"]} />
                <View style={{ marginTop: 18 }}>
                  <Kalender wert={termin} onWahl={setTermin} />
                </View>
                <Text style={{ ...startSchrift.text, fontSize: 14.5, lineHeight: 20, color: HELL.tinte2, textAlign: "center", marginTop: 14 }}>Ich zähle die Tage mit dir runter und erinnere dich rechtzeitig.</Text>
              </>
            ) : null}

            {schritt === "mitteilung" ? (
              <>
                <FigurBlase figur="neugierig" teile={["Soll ich dich ans ", ["Lernen"], " erinnern?"]} />
                <Text style={{ ...startSchrift.text, fontSize: 16, lineHeight: 23, color: HELL.tinte2, textAlign: "center", marginTop: 22 }}>Der Trick ist Regelmäßigkeit. Und jemand, der dran denkt.</Text>
                <View style={{ flex: 1, justifyContent: "center", paddingVertical: 20 }}>
                  <View style={{ borderRadius: 40, backgroundColor: "#E9E6F4", paddingTop: 18, paddingBottom: 60, paddingHorizontal: 14, marginHorizontal: 10 }}>
                    <Text style={{ ...startSchrift.textHalb, fontSize: 14, color: HELL.tinte, marginLeft: 22 }}>18:00</Text>
                    <View style={{ marginTop: 34, marginHorizontal: -24, flexDirection: "row", gap: 12, padding: 14, borderRadius: 22, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: HELL.linie }}>
                      <View style={{ width: 44, height: 44, borderRadius: 11, backgroundColor: "#EEEBFB", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                        <Image source={FIGUR.grund} style={{ width: 42, height: 42 }} resizeMode="contain" />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ ...startSchrift.textHalb, fontSize: 15, color: HELL.tinte }}>Fahrschul Pro</Text>
                          <Text style={{ ...startSchrift.text, fontSize: 13, color: HELL.tinte3 }}>jetzt</Text>
                        </View>
                        <Text style={{ ...startSchrift.text, fontSize: 14.5, lineHeight: 19, color: HELL.tinte }}>
                          {termin ? `Deine Prüfung ist in ${Math.max(1, Math.round((termin.getTime() - Date.now()) / 86_400_000))} Tagen. Kurz ein Video schauen?` : "Zeit für 5 Minuten Theorie. Heute ein neues Thema?"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </>
            ) : null}

            {schritt === "email" ? (
              <>
                <FigurBlase figur="grund" teile={anmelden ? ["Schön, dass du ", ["wieder da"], " bist!"] : ["Fast geschafft! Wohin schicke ich deinen ", ["Code"], "?"]} />
                <View style={{ flex: 1, justifyContent: "center", paddingVertical: 24, gap: 14 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 64, paddingHorizontal: 18, borderRadius: 20, backgroundColor: HELL.karte, borderWidth: 2, borderBottomWidth: 5, borderColor: email ? START.lila : HELL.linie }}>
                    <Icon name="mail-outline" size={22} color={START.lila} />
                    <TextInput
                      value={email}
                      onChangeText={(t) => {
                        setEmail(t.trim());
                        ablauf.setFehler(null);
                      }}
                      placeholder="deine@email.de"
                      placeholderTextColor={HELL.tinte3}
                      autoFocus
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="email-address"
                      textContentType="emailAddress"
                      autoComplete="email"
                      returnKeyType="send"
                      onSubmitEditing={codeAnfordern}
                      selectionColor={START.lila}
                      style={{ flex: 1, ...startSchrift.textHalb, fontSize: 17, color: HELL.tinte }}
                    />
                  </View>
                  {ablauf.fehler ? <Text style={{ ...startSchrift.textHalb, fontSize: 14, color: HELL.rot, textAlign: "center" }}>{ablauf.fehler}</Text> : null}
                  {!serverVerbunden ? <Text style={{ ...startSchrift.textHalb, fontSize: 14, color: HELL.rot, textAlign: "center" }}>Die App ist noch mit keinem Server verbunden.</Text> : null}
                  <Text style={{ ...startSchrift.text, fontSize: 14.5, lineHeight: 20, color: HELL.tinte2, textAlign: "center" }}>
                    {anmelden ? "Ich schicke dir einen Code – kein Passwort nötig." : "Ich schicke dir einen 6-stelligen Code. Kein Passwort nötig – dein Fortschritt ist dann auf allen Geräten gesichert."}
                  </Text>
                  {!anmelden ? (
                    <Pressable onPress={ohneKonto} hitSlop={8} style={{ alignSelf: "center", paddingVertical: 6 }}>
                      <Text style={{ ...startSchrift.textHalb, fontSize: 15, color: START.lila }}>Erst mal ohne Konto weiter</Text>
                    </Pressable>
                  ) : null}
                </View>
                {!anmelden ? (
                  <Text style={{ ...startSchrift.text, fontSize: 12.5, lineHeight: 18, color: HELL.tinte3, textAlign: "center" }}>
                    Mit der Registrierung akzeptierst du die{" "}
                    <Text onPress={() => router.push("/nutzungsbedingungen")} style={{ color: START.lila }}>
                      Nutzungsbedingungen
                    </Text>
                    . Wie wir deine Daten verarbeiten, steht in der{" "}
                    <Text onPress={() => router.push("/datenschutz")} style={{ color: START.lila }}>
                      Datenschutzerklärung
                    </Text>
                    .
                  </Text>
                ) : null}
              </>
            ) : null}

            {schritt === "code" ? (
              <>
                <FigurBlase figur="neugierig" teile={["Check deine ", ["Mails"], "!"]} />
                <View style={{ flex: 1, justifyContent: "center", paddingVertical: 24, gap: 18 }}>
                  <Text style={{ ...startSchrift.text, fontSize: 15.5, lineHeight: 22, color: HELL.tinte2, textAlign: "center" }}>
                    Ich habe dir einen Code an <Text style={{ ...startSchrift.textHalb, color: HELL.tinte }}>{ablauf.gesendetAn}</Text> geschickt.
                  </Text>
                  <Pressable onPress={() => codeFeld.current?.focus()} style={{ flexDirection: "row", justifyContent: "center", gap: 8 }}>
                    {Array.from({ length: CODE_LAENGE }, (_, i) => {
                      const z = ablauf.code[i];
                      const aktiv = i === ablauf.code.length;
                      return (
                        <View key={i} style={{ width: 46, height: 58, borderRadius: 14, backgroundColor: HELL.karte, borderWidth: 2, borderBottomWidth: 4, borderColor: aktiv ? START.lila : HELL.linie, alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ ...startSchrift.titel, fontSize: 30, color: HELL.tinte }}>{z ?? ""}</Text>
                        </View>
                      );
                    })}
                  </Pressable>
                  <TextInput
                    ref={codeFeld}
                    value={ablauf.code}
                    onChangeText={(t) => {
                      ablauf.setCode(t);
                      const c = t.replace(/\D/g, "").slice(0, CODE_LAENGE);
                      if (c.length === CODE_LAENGE) codePruefen(c);
                    }}
                    autoFocus
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                    maxLength={CODE_LAENGE}
                    style={{ position: "absolute", opacity: 0, height: 1, width: 1 }}
                  />
                  {ablauf.fehler ? <Text style={{ ...startSchrift.textHalb, fontSize: 14, color: HELL.rot, textAlign: "center" }}>{ablauf.fehler}</Text> : null}
                  <View style={{ flexDirection: "row", justifyContent: "center", gap: 22 }}>
                    <Pressable onPress={ablauf.nochmalSenden} disabled={ablauf.warten > 0} hitSlop={8}>
                      <Text style={{ ...startSchrift.textHalb, fontSize: 15, color: ablauf.warten > 0 ? HELL.tinte3 : START.lila }}>{ablauf.warten > 0 ? `Neu senden in ${ablauf.warten} s` : "Code neu senden"}</Text>
                    </Pressable>
                    <Pressable onPress={zurueck} hitSlop={8}>
                      <Text style={{ ...startSchrift.textHalb, fontSize: 15, color: START.lila }}>Andere E-Mail</Text>
                    </Pressable>
                  </View>
                  <Text style={{ ...startSchrift.text, fontSize: 13.5, color: HELL.tinte3, textAlign: "center" }}>Nichts bekommen? Schau auch im Spam-Ordner nach.</Text>
                </View>
              </>
            ) : null}

            {schritt === "fertig" ? (
              <View style={{ flex: 1, justifyContent: "center", gap: 24 }}>
                <GrosseFigur figur="freude" groesse={230} />
                <Text style={{ ...startSchrift.titel, fontSize: 40, lineHeight: 42, letterSpacing: -0.6, color: HELL.tinte, textAlign: "center" }}>
                  Alles bereit{vorname ? ", " : ""}
                  <Text style={{ color: START.lila }}>{vorname}</Text>!
                </Text>
                <Text style={{ ...startSchrift.text, fontSize: 16, lineHeight: 23, color: HELL.tinte2, textAlign: "center" }}>Dein Konto steht. Lass uns mit der Theorie loslegen.</Text>
              </View>
            ) : null}
          </ScrollView>
        </Animated.View>

        {fuss ? <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 10 }}>{fuss}</View> : null}
      </KeyboardAvoidingView>

      <LandWahl offen={landOffen} wert={land} onWahl={(l) => setLand(l)} onSchliessen={() => setLandOffen(false)} />
    </View>
  );
}

/** Liste der Bundesländer von unten. */
function LandWahl({ offen, wert, onWahl, onSchliessen }: { offen: boolean; wert: string | null; onWahl: (l: string) => void; onSchliessen: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={offen} transparent animationType="slide" onRequestClose={onSchliessen} supportedOrientations={["portrait", "landscape"]}>
      <Pressable onPress={onSchliessen} style={{ flex: 1, backgroundColor: "rgba(20,16,40,0.4)", justifyContent: "flex-end" }}>
        <Pressable style={{ backgroundColor: HELL.grund, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingBottom: insets.bottom + 8, maxHeight: "75%" }}>
          <View style={{ alignSelf: "center", width: 40, height: 5, borderRadius: 3, backgroundColor: HELL.spur, marginBottom: 12 }} />
          <Text style={{ ...startSchrift.titel, fontSize: 26, color: HELL.tinte, paddingHorizontal: 22, marginBottom: 8 }}>Bundesland</Text>
          <ScrollView>
            {BUNDESLAENDER.map((l) => (
              <Pressable
                key={l}
                onPress={() => {
                  tippen();
                  onWahl(l);
                  onSchliessen();
                }}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", paddingVertical: 15, paddingHorizontal: 22, backgroundColor: pressed ? "#ECE9F7" : "transparent" })}
              >
                <Text style={{ ...startSchrift.textHalb, fontSize: 17, color: HELL.tinte, flex: 1 }}>{l}</Text>
                {l === wert ? <Icon name="checkmark" size={20} color={START.lila} /> : null}
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Monatskalender: Tag antippen; bis ein Jahr im Voraus. */
function Kalender({ wert, onWahl }: { wert: Date | null; onWahl: (d: Date) => void }) {
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const [monat, setMonat] = useState(() => new Date((wert ?? heute).getFullYear(), (wert ?? heute).getMonth(), 1));
  const grenze = new Date(heute.getFullYear() + 1, heute.getMonth(), heute.getDate());
  const versatz = (monat.getDay() + 6) % 7;
  const tage = new Date(monat.getFullYear(), monat.getMonth() + 1, 0).getDate();
  const felder: (Date | null)[] = [...Array.from({ length: versatz }, () => null), ...Array.from({ length: tage }, (_, i) => new Date(monat.getFullYear(), monat.getMonth(), i + 1))];
  const zurueckGeht = monat > new Date(heute.getFullYear(), heute.getMonth(), 1);
  const vorGeht = new Date(monat.getFullYear(), monat.getMonth() + 1, 1) <= grenze;
  const blaettern = (n: number) => setMonat((m) => new Date(m.getFullYear(), m.getMonth() + n, 1));
  const gleich = (a: Date | null, b: Date) => !!a && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  return (
    <View style={{ borderRadius: 24, backgroundColor: HELL.karte, borderWidth: 2, borderBottomWidth: 5, borderColor: HELL.linie, padding: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <Pressable onPress={() => zurueckGeht && blaettern(-1)} hitSlop={10} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center", opacity: zurueckGeht ? 1 : 0.25 }}>
          <Icon name="chevron-back" size={20} color={HELL.tinte} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", ...startSchrift.titel, fontSize: 22, color: HELL.tinte }}>
          {MONATE[monat.getMonth()]} {monat.getFullYear()}
        </Text>
        <Pressable onPress={() => vorGeht && blaettern(1)} hitSlop={10} style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center", opacity: vorGeht ? 1 : 0.25 }}>
          <Icon name="chevron-forward" size={20} color={HELL.tinte} />
        </Pressable>
      </View>
      <View style={{ flexDirection: "row" }}>
        {WOCHENTAGE.map((w) => (
          <Text key={w} style={{ width: `${100 / 7}%`, textAlign: "center", ...startSchrift.textHalb, fontSize: 12.5, color: HELL.tinte3, paddingBottom: 6 }}>
            {w}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {felder.map((d, i) => {
          if (!d) return <View key={`l${i}`} style={{ width: `${100 / 7}%`, height: 40 }} />;
          const aus = d < heute || d > grenze;
          const aktiv = gleich(wert, d);
          return (
            <Pressable
              key={d.getDate()}
              disabled={aus}
              onPress={() => {
                tippen();
                onWahl(d);
              }}
              style={{ width: `${100 / 7}%`, height: 40, alignItems: "center", justifyContent: "center" }}
            >
              <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: aktiv ? START.lila : "transparent", borderWidth: gleich(heute, d) && !aktiv ? 1.5 : 0, borderColor: START.lila }}>
                <Text style={{ ...startSchrift.textHalb, fontSize: 15, color: aktiv ? "#FFFFFF" : aus ? "#CFCBDD" : HELL.tinte }}>{d.getDate()}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
