import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { dialog } from "@/components/dialog";
import { Glas } from "@/components/glas";
import { GlasLeiste, KinoHeld, Kopfzeile } from "@/components/home";
import { Icon } from "@/components/icon";
import { Fuehrerscheinweg, LigaKarte, Medaillen, MenueGruppe, MenueZeile, ProfilRing, ZahlenRaster, type Meilenstein } from "@/components/profil";
import { ProfilBild } from "@/components/profilbild";
import { useInhaltUnten } from "@/components/tab-leiste";
import { CLIPS } from "@/lib/clips";
import { useCrew } from "@/lib/crew";
import { FarbweltBereich, useDarstellung } from "@/lib/darstellung";
import { ERFOLGE } from "@/lib/erfolge";
import { tausender } from "@/lib/format";
import { FOTOS } from "@/lib/fotos";
import { tippen } from "@/lib/haptik";
import { heuteDran, kartenZahlen } from "@/lib/karteikarten";
import { useKonto } from "@/lib/konto";
import { useLeistenScroll } from "@/lib/leisten-scroll";
import { profilbildEntfernen, profilbildHochladen, profilbildServerEntfernen, profilbildWaehlen, useProfilbild } from "@/lib/profilbild";
import { tageBis, terminDatum } from "@/lib/pruefungstag";
import { ligaVon } from "@/lib/rangliste";
import { ALBUM } from "@/lib/schilder-jagd";
import { auswertung, fortschritt, lernzeitText, serieAktuell, useStand } from "@/lib/stand";
import { leuchten, RAND, schrift, verlauf } from "@/lib/theme";

const MONATE_KURZ = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];

export default function Profil() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const inhaltUnten = useInhaltUnten();
  const leistenScroll = useLeistenScroll();
  const fokus = useIsFocused();
  const { farbwelt: f } = useDarstellung();
  const { stand } = useStand();
  const { daten: crewDaten } = useCrew();
  const { profil, gast, anzeigeName, abmelden, session, profilNeuLaden } = useKonto();
  const bild = useProfilbild();

  const hatBild = Boolean(bild || profil?.bild_pfad);
  const freigeschaltet = ERFOLGE.filter((e) => stand.erfolge[e.id]).length;
  const gemerkteClips = CLIPS.filter((c) => stand.clips.gemerkt.includes(c.id)).length;
  const schilderGefunden = ALBUM.filter((k) => stand.schilder[k]).length;
  const kartenDran = heuteDran(stand).gesamt;
  const eigeneKarten = kartenZahlen(stand).eigene;
  const reife = fortschritt(stand).anteil;
  const serie = serieAktuell(stand);
  const liga = ligaVon(stand.xp);
  const ligaStart = liga.bis === 6000 ? 2000 : 0;
  const gesamtZahlen = auswertung(stand, "gesamt");
  const bestanden = stand.pruefungen.filter((p) => p.bestanden).length;
  const termin = terminDatum(stand.pruefungstermin);
  const tage = termin ? tageBis(termin) : null;

  // Meilensteine auf dem Weg zum Führerschein
  const meilensteine: Meilenstein[] = [
    { titel: "Start", unter: "erste Frage", erreicht: Object.keys(stand.fragen).length > 0 },
    { titel: "25 %", unter: "sicher", erreicht: reife >= 0.25 },
    { titel: "50 %", unter: "sicher", erreicht: reife >= 0.5 },
    { titel: "Simulation", unter: "bestanden", erreicht: bestanden > 0 },
    { titel: "Prüfungsreif", unter: "90 %", erreicht: reife >= 0.9 },
    { titel: "Prüfung", unter: termin && tage !== null && tage >= 0 ? `${termin.getDate()}. ${MONATE_KURZ[termin.getMonth()]}` : "Termin?", erreicht: false },
  ];
  const naechster = meilensteine.findIndex((s) => !s.erreicht);
  const zwischen = naechster === 1 ? reife / 0.25 : naechster === 2 ? (reife - 0.25) / 0.25 : naechster === 4 ? (reife - 0.5) / 0.4 : 0.5;
  const wegZeile =
    reife >= 0.9
      ? tage !== null && tage >= 0
        ? `Prüfungsreif – Prüfung ${tage === 0 ? "heute" : tage === 1 ? "morgen" : `in ${tage} Tagen`}`
        : "Prüfungsreif – jetzt fehlt nur die Prüfung"
      : `Noch ${Math.max(1, Math.ceil((0.9 - reife) * 100))} % bis prüfungsreif`;

  async function fotoWaehlen() {
    const ok = await profilbildWaehlen();
    if (!ok || !session) return;
    try {
      // Auch auf den Server, damit andere es bei Clips und Kommentaren sehen.
      await profilbildHochladen(profil?.bild_pfad ?? null);
      await profilNeuLaden();
    } catch {
      dialog("Profilbild", "Das Bild ist auf deinem Handy gespeichert, konnte aber gerade nicht hochgeladen werden. Versuch es gleich noch einmal.");
    }
  }

  async function fotoEntfernen() {
    await profilbildEntfernen();
    if (!session) return;
    await profilbildServerEntfernen(profil?.bild_pfad ?? null);
    await profilNeuLaden();
  }

  function bildAendern() {
    const optionen: { text: string; onPress?: () => void; style?: "cancel" | "destructive" }[] = [{ text: "Foto auswählen", onPress: () => fotoWaehlen() }];
    if (hatBild) optionen.push({ text: "Foto entfernen", style: "destructive", onPress: () => fotoEntfernen() });
    optionen.push({ text: "Abbrechen", style: "cancel" });
    dialog("Profilbild", undefined, optionen);
  }

  function abmeldenFragen() {
    dialog(
      gast ? "Gastmodus beenden?" : "Abmelden?",
      gast ? "Dein Fortschritt bleibt auf diesem Gerät gespeichert." : "Dein Fortschritt ist in deinem Konto gesichert.",
      [
        { text: "Abbrechen", style: "cancel" },
        { text: gast ? "Beenden" : "Abmelden", style: "destructive", onPress: () => abmelden() },
      ],
    );
  }

  function abzeichenZeigen(id: string) {
    const e = ERFOLGE.find((x) => x.id === id);
    if (!e) return;
    const wann = stand.erfolge[e.id];
    dialog(e.titel, wann ? `${e.text}\nFreigeschaltet am ${wann.split("-").reverse().join(".")}.` : e.text);
  }

  const heldHoehe = Math.round(width * 1.22);

  // Auf dem hellen Hintergrund dunkle Schrift, auf dem dunklen helle.
  const kopfText = f.hell ? "#14171B" : "#FFFFFF";

  const unterzeile = [profil ? `@${profil.benutzername}` : gast ? "Gastmodus" : session?.user.email ?? null, profil?.rolle === "fahrlehrer" ? "Fahrlehrer" : `Klasse ${stand.klasse}`, profil?.bundesland ?? null]
    .filter(Boolean)
    .join(" · ");

  return (
    <FarbweltBereich farbwelt={f}>
      {fokus ? <StatusBar style={f.hell ? "dark" : "light"} /> : null}
      <View style={{ flex: 1, backgroundColor: f.grund }}>
        <ScrollView {...leistenScroll} contentContainerStyle={{ paddingBottom: inhaltUnten + 12 }} showsVerticalScrollIndicator={false}>
          <KinoHeld bild={f.hell ? FOTOS.heldProfilHell : FOTOS.heldProfilDunkel} hoehe={heldHoehe} ausblendenAb={f.hell ? 0.8 : 0.66} abdunkeln={false}>
            {/* Oben rechts: Einstellungen */}
            <View style={{ position: "absolute", top: insets.top + 4, left: RAND, right: RAND, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ ...schrift.titel, fontSize: 30, color: kopfText, letterSpacing: -0.4 }}>Profil</Text>
              <Pressable
                onPress={() => {
                  tippen();
                  router.push("/einstellungen");
                }}
                accessibilityLabel="Einstellungen"
                hitSlop={8}
              >
                <Glas klar hell={f.hell} style={{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="settings-outline" size={21} color={kopfText} />
                </Glas>
              </Pressable>
            </View>

            {/* Profilbild, Name, Liga */}
            <View style={{ position: "absolute", left: RAND, right: RAND, top: insets.top + 64, alignItems: "center" }}>
              <ProfilRing onPress={bildAendern}>
                <ProfilBild name={anzeigeName} groesse={108} rand={0} />
              </ProfilRing>
              <Text
                style={{ ...schrift.titel, fontSize: 30, lineHeight: 36, color: kopfText, marginTop: 14, letterSpacing: -0.3, textShadowColor: f.hell ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.5)", textShadowRadius: 10 }}
                numberOfLines={1}
              >
                {anzeigeName}
              </Text>
              <Text style={{ ...schrift.textMittel, fontSize: 14.5, color: f.hell ? "rgba(20,23,27,0.7)" : "rgba(255,255,255,0.82)", marginTop: 2 }} numberOfLines={1}>
                {unterzeile}
              </Text>
              <Glas klar hell={f.hell} style={{ flexDirection: "row", alignItems: "center", gap: 7, height: 32, paddingHorizontal: 13, borderRadius: 16, marginTop: 12 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: liga.farbe }} />
                <Text style={{ ...schrift.textHalb, fontSize: 13, color: kopfText }}>{liga.name}</Text>
              </Glas>
            </View>

            <View style={{ position: "absolute", left: RAND, right: RAND, bottom: 18 }}>
              <GlasLeiste
                hell={f.hell}
                werte={[
                  { icon: "star", farbe: "#FFC857", wert: tausender(stand.xp), label: "Punkte", onPress: () => router.push("/liga") },
                  { icon: "flame", farbe: "#FF8A2A", wert: `${serie}`, label: serie === 1 ? "Tag Serie" : "Tage Serie", onPress: () => router.push("/statistik") },
                  { icon: "ribbon", farbe: "#FFB45C", wert: `${freigeschaltet}/${ERFOLGE.length}`, label: "Abzeichen", onPress: () => dialog("Abzeichen", `${freigeschaltet} von ${ERFOLGE.length} freigeschaltet. Weiter unten siehst du alle.`) },
                ]}
              />
            </View>
          </KinoHeld>

          {!session ? (
            <View style={[{ marginHorizontal: RAND, marginTop: 18, padding: 18, gap: 14, borderRadius: 24, backgroundColor: f.flaeche, borderWidth: 1, borderColor: f.orangeLinie }, f.hell ? leuchten("#3C2C18", 0.07, 12, 4) : null]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: f.orangeSoft, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="person-add-outline" size={20} color={f.orange} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...schrift.textHalb, fontSize: 16, color: f.text }}>Kostenloses Konto erstellen</Text>
                  <Text style={{ ...schrift.text, fontSize: 13.5, lineHeight: 18, color: f.text2, marginTop: 2 }}>Fortschritt sichern, Liga, Crew und Duelle.</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={() => {
                    tippen();
                    router.push("/registrieren");
                  }}
                  style={[{ flex: 1, height: 46, borderRadius: 23, overflow: "hidden" }, leuchten(f.orange, 0.35, 12, 4)]}
                >
                  <LinearGradient colors={verlauf.knopf} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ ...schrift.textFett, fontSize: 15.5, color: "#FFFFFF" }}>Konto erstellen</Text>
                  </LinearGradient>
                </Pressable>
                <Pressable
                  onPress={() => {
                    tippen();
                    router.push("/anmelden");
                  }}
                  style={{ flex: 1, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: f.flaeche2, borderWidth: 1, borderColor: f.linieStark }}
                >
                  <Text style={{ ...schrift.textFett, fontSize: 15.5, color: f.text }}>Anmelden</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={{ paddingHorizontal: RAND, marginTop: 22 }}>
            <Fuehrerscheinweg meilensteine={meilensteine} anteil={reife} zeile={wegZeile} zwischen={zwischen} onPress={() => router.push("/statistik")} />
          </View>

          <Kopfzeile titel="Abzeichen" link={`${freigeschaltet} von ${ERFOLGE.length}`} style={{ marginTop: 30 }} />
          <Medaillen medaillen={ERFOLGE.map((e) => ({ id: e.id, titel: e.titel, icon: e.icon, erreicht: Boolean(stand.erfolge[e.id]) }))} onPress={abzeichenZeigen} />

          <Kopfzeile titel="Liga & Duelle" style={{ marginTop: 30 }} />
          <View style={{ paddingHorizontal: RAND }}>
            <LigaKarte
              name={liga.name}
              farbe={liga.farbe}
              naechste={liga.naechste}
              fehlt={liga.bis ? liga.bis - stand.xp : 0}
              anteil={liga.bis ? (stand.xp - ligaStart) / (liga.bis - ligaStart) : 1}
              elo={stand.duell.rating}
              siege={stand.duell.siege}
              onPress={() => router.push("/liga")}
            />
          </View>

          <Kopfzeile titel="Deine Zahlen" link="Statistik" onLink={() => router.push("/statistik")} style={{ marginTop: 30 }} />
          <ZahlenRaster
            onPress={() => router.push("/statistik")}
            zahlen={[
              { icon: "time-outline", sf: "clock.fill", farbe: "#4DA3FF", wert: lernzeitText(gesamtZahlen.sekunden), label: "Lernzeit" },
              { icon: "checkmark-done", farbe: "#4ED053", wert: tausender(gesamtZahlen.antworten), label: "Antworten" },
              { icon: "flame", farbe: "#FC6F14", wert: `${stand.besteSerie}`, label: stand.besteSerie === 1 ? "Tag beste Serie" : "Tage beste Serie" },
              { icon: "school", sf: "graduationcap.fill", farbe: "#FFB400", wert: `${bestanden}/${stand.pruefungen.length}`, label: "Testbögen bestanden" },
            ]}
          />

          <Kopfzeile titel="Mehr" style={{ marginTop: 30 }} />
          <MenueGruppe>
            <MenueZeile icon="stats-chart" farbe="#FC5B0E" titel="Mein Fortschritt" unter="Statistiken, Stärken & Schwächen" onPress={() => router.push("/statistik")} />
            <MenueZeile
              icon="camera"
              farbe="#4DA3FF"
              titel="Schilder-Jagd"
              unter={schilderGefunden > 0 ? `${schilderGefunden} von ${ALBUM.length} Schildern gefunden` : "Echte Schilder mit der Kamera sammeln"}
              onPress={() => router.push("/schilder-jagd")}
            />
            <MenueZeile
              icon="albums"
              farbe="#4ED053"
              titel="Karteikarten"
              unter={kartenDran > 0 ? `${kartenDran} ${kartenDran === 1 ? "Karte" : "Karten"} heute dran` : eigeneKarten > 0 ? `${eigeneKarten} eigene ${eigeneKarten === 1 ? "Karte" : "Karten"}` : "Fragen als Karten lernen"}
              onPress={() => router.push("/karteikarten")}
            />
            <MenueZeile
              icon="people"
              farbe="#FC6F14"
              titel="Meine Crew"
              unter={crewDaten?.crew ? `${crewDaten.crew.name} · Flamme Tag ${crewDaten.crew.flamme}` : "Gemeinsam lernen, Boss besiegen"}
              onPress={() => router.push("/crew")}
            />
            <MenueZeile icon="bulb" farbe="#FF4D6D" titel="Kurz erklärt" unter={gemerkteClips > 0 ? `${gemerkteClips} gemerkt` : "Regeln in 30 Sekunden"} onPress={() => router.push("/kurz-erklaert")} />
            <MenueZeile icon="heart" farbe="#FF8A1E" titel="Favoriten" unter="Gemerkte und schwierige Fragen" onPress={() => router.push("/favoriten")} />
            <MenueZeile icon="calculator" farbe="#E0A100" titel="Formeln" unter="Anhalteweg & Co." onPress={() => router.push("/formeln")} />
          </MenueGruppe>

          <MenueGruppe style={{ marginTop: 16 }}>
            <MenueZeile icon="settings-outline" farbe="#7C838C" titel="Einstellungen & Konto" onPress={() => router.push("/einstellungen")} />
            <MenueZeile icon="diamond-outline" farbe="#FC5B0E" titel="Premium" unter="Bald verfügbar" onPress={() => router.push("/premium")} />
            <MenueZeile icon="images-outline" farbe="#7C838C" titel="Bildnachweise" onPress={() => router.push("/bildnachweise")} />
            <MenueZeile icon="log-out-outline" farbe="#FF4A3D" titel={gast ? "Gastmodus beenden" : "Abmelden"} gefahr onPress={abmeldenFragen} />
          </MenueGruppe>
        </ScrollView>
      </View>
    </FarbweltBereich>
  );
}
