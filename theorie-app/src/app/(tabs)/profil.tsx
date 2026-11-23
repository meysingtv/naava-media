import { Image, Pressable, ScrollView, Text, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDesktop, useFenster } from "@/lib/fenster";
import { useProfilAktionen } from "@/lib/profil-aktionen";
import { ProfilWeb } from "@/components/web/profil-web";
import { dialog } from "@/components/dialog";
import { Glas } from "@/components/glas";
import { GlasGrund } from "@/components/glas-flaeche";
import { GlasLeiste, KinoHeld, Kopfzeile } from "@/components/home";
import { Icon, type IconName } from "@/components/icon";
import { LilaKnopf, LILA_RAND, LilaTitel, lilaSchrift, SYMBOLE, useLila } from "@/components/lila-teile";
import { FIGUR } from "@/components/start-teile";
import { Fuehrerscheinweg, LigaKarte, Medaillen, MenueGruppe, MenueZeile, ProfilRing, ZahlenRaster, type Meilenstein } from "@/components/profil";
import { ProfilBild } from "@/components/profilbild";
import { useProfilbild } from "@/lib/profilbild";
import { useKosten } from "@/lib/kosten";
import { useInhaltUnten } from "@/components/tab-leiste";
import { CLIPS } from "@/lib/clips";
import { useCrew } from "@/lib/crew";
import { FarbweltBereich, useDarstellung } from "@/lib/darstellung";
import { ERFOLGE } from "@/lib/erfolge";
import { tausender } from "@/lib/format";
import { FOTOS } from "@/lib/fotos";
import { FRAGEN_AKTIV } from "@/lib/funktionen";
import { tippen } from "@/lib/haptik";
import { heuteDran, kartenZahlen } from "@/lib/karteikarten";
import { useKonto } from "@/lib/konto";
import { useLeistenScroll } from "@/lib/leisten-scroll";
import { tageBis, terminDatum } from "@/lib/pruefungstag";
import { ligaVon } from "@/lib/rangliste";
import { ALBUM } from "@/lib/schilder-jagd";
import { auswertung, fortschritt, lernzeitText, serieAktuell, tagVerschoben, useStand } from "@/lib/stand";
import { leuchten, mitDeckkraft, RAND, schrift, verlauf } from "@/lib/theme";

const MONATE_KURZ = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];

export default function Profil() {
  // Im Browser am PC eine eigene Fassung (web/profil-web.tsx).
  return useDesktop() ? <ProfilWeb /> : <ProfilHandy />;
}

const WELLE: ImageSourcePropType = require("../../../assets/images/profil/karte-welle.jpg");

/** Fläche mit der lila Wellengrafik dahinter, feinem Rand und weichem Schatten. */
function WellenKarte({ children, style, onPress, label }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; label?: string }) {
  const inhalt = (
    <View style={[{ borderRadius: 22, overflow: "hidden", borderWidth: 1.5, borderColor: "#FFFFFF", backgroundColor: "#F6F2FE" }, style]}>
      <Image source={WELLE} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }} resizeMode="stretch" />
      {children}
    </View>
  );
  const schatten: ViewStyle = { borderRadius: 22, shadowColor: "#6A3FE6", shadowOpacity: 0.09, shadowRadius: 14, shadowOffset: { width: 0, height: 5 } };
  if (!onPress) return <View style={schatten}>{inhalt}</View>;
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [schatten, { transform: [{ scale: pressed ? 0.985 : 1 }] }]}
    >
      {inhalt}
    </Pressable>
  );
}

/** Schlichte weiße Karte mit feinem Rand und weichem Schatten. */
function WeisseKarte({ children, onPress, label }: { children: React.ReactNode; onPress: () => void; label?: string }) {
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ borderRadius: 22, backgroundColor: pressed ? "#FBF9FF" : "rgba(255,255,255,0.86)", borderWidth: 1.5, borderColor: "#FFFFFF", shadowColor: "#6A3FE6", shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, transform: [{ scale: pressed ? 0.985 : 1 }] })}
    >
      {children}
    </Pressable>
  );
}

type ProfilPunkt = { titel: string; unter?: string; bild?: ImageSourcePropType; icon?: IconName; farbe?: string; gefahr?: boolean; onPress: () => void };

/** Eine Zeile wie im Entwurf: Symbol im zarten Kreis, Titel, Unterzeile, Pfeil. */
function ProfilZeile({ p }: { p: ProfilPunkt }) {
  const rot = "#E0483D";
  const farbe = p.gefahr ? rot : p.farbe ?? "#8A5FFF";
  return (
    <WeisseKarte onPress={p.onPress} label={p.unter ? `${p.titel}, ${p.unter}` : p.titel}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, minHeight: 72, paddingVertical: 12, paddingLeft: 12, paddingRight: 18 }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: mitDeckkraft(farbe, 0.12) }}>
          {p.bild ? <Image source={p.bild} style={{ width: 28, height: 28 }} resizeMode="contain" /> : p.icon ? <Icon name={p.icon} size={23} color={farbe} /> : null}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ ...lilaSchrift.textHalb, fontSize: 17, color: p.gefahr ? rot : "#2E2650" }} numberOfLines={1}>
            {p.titel}
          </Text>
          {p.unter ? (
            <Text style={{ ...lilaSchrift.text, fontSize: 14, color: "#8A85A0" }} numberOfLines={1}>
              {p.unter}
            </Text>
          ) : null}
        </View>
        {p.gefahr ? null : <Icon name="chevron-forward" size={19} color="#8A85A0" />}
      </View>
    </WeisseKarte>
  );
}

/** Profil im lila Design (solange die Fragen aus sind). */
function ProfilLila() {
  const insets = useSafeAreaInsets();
  const inhaltUnten = useInhaltUnten();
  const fokus = useIsFocused();
  const l = useLila();
  const { stand } = useStand();
  const { profil, gast, anzeigeName, session } = useKonto();
  const { bildAendern, abmeldenFragen } = useProfilAktionen();
  const lokalesBild = useProfilbild();
  const kostenSichtbar = useKosten().sichtbar;
  const profilFoto = Boolean(lokalesBild || profil?.bild_pfad);
  const gemerkteClips = CLIPS.filter((c) => stand.clips.gemerkt.includes(c.id)).length;
  const schilderGefunden = ALBUM.filter((k) => stand.schilder[k]).length;
  const termin = terminDatum(stand.pruefungstermin);
  const tage = termin ? tageBis(termin) : null;
  const unterzeile = [profil ? `@${profil.benutzername}` : gast ? "Gastmodus" : session?.user.email ?? null, profil?.rolle === "fahrlehrer" ? "Fahrlehrer" : `Klasse ${stand.klasse}`, profil?.bundesland ?? null]
    .filter(Boolean)
    .join(" · ");

  const werte = [
    { bild: SYMBOLE.scan, wert: `${schilderGefunden}/${ALBUM.length}`, label: "Schilder", onPress: () => router.push("/schilder-jagd") },
    { bild: SYMBOLE.kalender, wert: tage !== null && tage >= 0 ? `${tage}` : "–", label: tage === 1 ? "Tag bis Prüfung" : "Tage bis Prüfg.", onPress: () => router.push("/pruefungstermin") },
    { bild: SYMBOLE.birne, wert: `${gemerkteClips}`, label: "Gemerkt", onPress: () => router.push("/kurz-erklaert") },
  ];

  const lernhilfen: ProfilPunkt[] = [
    { titel: "Videokurse", unter: "Dein Coach mit kurzen Videos", bild: SYMBOLE.play, onPress: () => router.navigate("/coach") },
    { titel: "Schilder-Jagd", unter: schilderGefunden > 0 ? `${schilderGefunden} von ${ALBUM.length} gefunden` : "Echte Schilder sammeln", bild: SYMBOLE.scan, onPress: () => router.push("/schilder-jagd") },
    { titel: "Kurz erklärt", unter: gemerkteClips > 0 ? `${gemerkteClips} gemerkt` : "Regeln in 30 Sekunden", bild: SYMBOLE.birne, farbe: "#F5B400", onPress: () => router.push("/kurz-erklaert") },
    { titel: "Verkehrszeichen", unter: "Alle Zeichen erklärt", bild: SYMBOLE.warnung, onPress: () => router.push("/zeichen") },
    { titel: "Formeln", unter: "Anhalteweg & Co.", bild: SYMBOLE.rechner, onPress: () => router.push("/formeln") },
    ...(kostenSichtbar ? [{ titel: "Kostenplaner", unter: "Was dein Führerschein kostet", icon: "wallet-outline" as IconName, onPress: () => router.push("/kosten") }] : []),
  ];
  const konto: ProfilPunkt[] = [
    { titel: "Einstellungen & Konto", unter: gast ? "Gastmodus" : undefined, icon: "settings", farbe: "#6E6888", onPress: () => router.push("/einstellungen") },
    { titel: "Premium", unter: "Bald verfügbar", icon: "diamond", onPress: () => router.push("/premium") },
    { titel: "Bildnachweise", icon: "images", farbe: "#D9A100", onPress: () => router.push("/bildnachweise") },
    { titel: "Impressum", icon: "document-text-outline", farbe: "#6E6888", onPress: () => router.push("/impressum") },
    { titel: "Datenschutz", icon: "shield-checkmark-outline", farbe: "#4D8DF5", onPress: () => router.push("/datenschutz") },
    { titel: "Nutzungsbedingungen", icon: "reader-outline", farbe: "#6E6888", onPress: () => router.push("/nutzungsbedingungen") },
    ...(session || gast ? [{ titel: gast ? "Gastmodus beenden" : "Abmelden", icon: "log-out-outline" as IconName, gefahr: true, onPress: abmeldenFragen }] : []),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: l.grund }}>
      {fokus ? <StatusBar style="dark" /> : null}
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: inhaltUnten + 8, paddingHorizontal: LILA_RAND, width: "100%", maxWidth: 560, alignSelf: "center" }} showsVerticalScrollIndicator={false}>
        {/* Kopf */}
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <LilaTitel>Profil</LilaTitel>
            <Text style={{ ...lilaSchrift.text, fontSize: 16, color: l.tinte2, marginTop: 2 }}>Dein Bereich in der Fahrschul-App</Text>
          </View>
          <Pressable
            onPress={() => {
              tippen();
              router.push("/einstellungen");
            }}
            accessibilityLabel="Einstellungen"
            hitSlop={8}
            style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 23, backgroundColor: pressed ? l.lilaZart : "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: l.linie })}
          >
            <Icon name="settings-outline" size={22} color={l.tinte} />
          </Pressable>
        </View>

        {/* Profilkarte: Bild links, Name rechts, Welle dahinter */}
        <WellenKarte style={{ marginTop: 18 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 18, paddingVertical: 22, paddingHorizontal: 22 }}>
            <Pressable onPress={bildAendern} accessibilityRole="button" accessibilityLabel="Profilbild ändern">
              <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: "#ECE5FF", borderWidth: 2, borderColor: "#FFFFFF", alignItems: "center", justifyContent: "center", overflow: "hidden", shadowColor: "#6A3FE6", shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }}>
                {profilFoto ? <ProfilBild name={anzeigeName} groesse={84} rand={0} farbe="#ECE5FF" /> : <Icon name="person-outline" size={40} color="#5B3FD0" />}
              </View>
            </Pressable>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ ...lilaSchrift.textFett, fontSize: 26, color: l.tinte }} numberOfLines={1}>
                {anzeigeName}
              </Text>
              <Text style={{ ...lilaSchrift.textMittel, fontSize: 16, color: l.tinte2 }} numberOfLines={2}>
                {unterzeile || "Fahrschul Pro"}
              </Text>
            </View>
          </View>
        </WellenKarte>

        {/* Zahlen */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          {werte.map((w) => (
            <View key={w.label} style={{ flex: 1 }}>
              <WeisseKarte onPress={w.onPress} label={`${w.wert} ${w.label}`}>
                <View style={{ alignItems: "center", gap: 3, paddingVertical: 12, paddingHorizontal: 6 }}>
                  <Image source={w.bild} style={{ width: 26, height: 26 }} resizeMode="contain" />
                  <Text style={{ ...lilaSchrift.textFett, fontSize: 20, color: l.tinte }}>{w.wert}</Text>
                  <Text style={{ ...lilaSchrift.textMittel, fontSize: 12, color: l.tinte2 }} numberOfLines={1}>
                    {w.label}
                  </Text>
                </View>
              </WeisseKarte>
            </View>
          ))}
        </View>

        {!session ? (
          <View style={{ marginTop: 14, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.86)", borderWidth: 1.5, borderColor: "#FFFFFF" }}>
            <View style={{ padding: 16, gap: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Image source={FIGUR.winken} style={{ width: 56, height: 56 }} resizeMode="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...lilaSchrift.titel, fontSize: 22, color: l.tinte }}>Kostenloses Konto</Text>
                  <Text style={{ ...lilaSchrift.text, fontSize: 13.5, lineHeight: 18, color: l.tinte2 }}>Fortschritt sichern, Profilbild, Clips und Kommentare.</Text>
                </View>
              </View>
              <LilaKnopf titel="Konto erstellen" onPress={() => router.push("/start")} />
            </View>
          </View>
        ) : null}

        <Text style={{ ...lilaSchrift.textFett, fontSize: 24, color: l.tinte, marginTop: 26, marginBottom: 12 }}>Lernhilfen</Text>
        <View style={{ gap: 10 }}>
          {lernhilfen.map((p) => (
            <ProfilZeile key={p.titel} p={p} />
          ))}
        </View>

        <Text style={{ ...lilaSchrift.textFett, fontSize: 24, color: l.tinte, marginTop: 26, marginBottom: 12 }}>Konto</Text>
        <View style={{ gap: 10 }}>
          {konto.map((p) => (
            <ProfilZeile key={p.titel} p={p} />
          ))}
        </View>
        <Text style={{ ...lilaSchrift.text, fontSize: 12.5, color: l.tinte3, textAlign: "center", marginTop: 18 }}>Fahrschul Pro · Version 1.0</Text>
      </ScrollView>
    </View>
  );
}

function ProfilHandy() {
  if (!FRAGEN_AKTIV) return <ProfilLila />;
  return <ProfilMitFragen />;
}

function ProfilMitFragen() {
  const insets = useSafeAreaInsets();
  const { width } = useFenster();
  const inhaltUnten = useInhaltUnten();
  const leistenScroll = useLeistenScroll();
  const fokus = useIsFocused();
  const { farbwelt: f } = useDarstellung();
  const { stand } = useStand();
  const { daten: crewDaten } = useCrew();
  const { profil, gast, anzeigeName, session } = useKonto();
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
  // Die letzten sieben Tage, der heutige zuletzt – für die Mini-Diagramme bei „Deine Zahlen“.
  const letzteTage = Array.from({ length: 7 }, (_, i) => tagVerschoben(i - 6));
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

  const { bildAendern, abmeldenFragen, abzeichenZeigen } = useProfilAktionen();

  // Auf dem iPad nicht höher als auf einem großen iPhone
  const heldHoehe = Math.round(Math.min(width, 440) * 1.22);

  // Auf dem hellen Hintergrund dunkle Schrift, auf dem dunklen helle.
  const kopfText = f.hell ? "#14171B" : "#FFFFFF";

  const unterzeile = [profil ? `@${profil.benutzername}` : gast ? "Gastmodus" : session?.user.email ?? null, profil?.rolle === "fahrlehrer" ? "Fahrlehrer" : `Klasse ${stand.klasse}`, profil?.bundesland ?? null]
    .filter(Boolean)
    .join(" · ");

  const gastKarte = (
    <View style={[{ padding: 18, gap: 14, borderRadius: 24, backgroundColor: f.flaeche, borderWidth: 1, borderColor: f.orangeLinie }, f.hell ? leuchten("#3C2C18", 0.07, 12, 4) : null]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: f.orangeSoft, alignItems: "center", justifyContent: "center" }}>
          <Icon name="person-add-outline" size={20} color={f.orange} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...schrift.textHalb, fontSize: 16, color: f.text }}>Kostenloses Konto erstellen</Text>
          <Text style={{ ...schrift.text, fontSize: 13.5, lineHeight: 18, color: f.text2, marginTop: 2 }}>{FRAGEN_AKTIV ? "Fortschritt sichern, Liga, Crew und Duelle." : "Profilbild, eigene Clips und Kommentare."}</Text>
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
  );
  const ligaKarte = (
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
  );
  const zahlenRaster = (
    <ZahlenRaster
      onPress={() => router.push("/statistik")}
      zahlen={[
        { icon: "time", sf: "clock.fill", farbe: "#4DA3FF", label: "Lernzeit", wert: lernzeitText(gesamtZahlen.sekunden), mini: { art: "balken", werte: letzteTage.map((t) => stand.zeitTage[t] ?? 0) }, unter: "Letzte 7 Tage" },
        { icon: "checkmark-circle", sf: "checkmark.circle.fill", farbe: "#4ED053", label: "Antworten", wert: tausender(gesamtZahlen.antworten), mini: { art: "balken", werte: letzteTage.map((t) => stand.antwortenTage[t] ?? 0) }, unter: "Letzte 7 Tage" },
        {
          icon: "flame",
          farbe: "#8A5FFF",
          label: "Beste Serie",
          wert: `${stand.besteSerie}`,
          einheit: stand.besteSerie === 1 ? "Tag" : "Tage",
          mini: { art: "punkte", werte: letzteTage.map((t) => ((stand.antwortenTage[t] ?? 0) > 0 ? true : null)) },
          unter: "Gelernt diese Woche",
        },
        {
          icon: "school",
          sf: "graduationcap.fill",
          farbe: "#FFB400",
          label: "Testbögen",
          wert: `${bestanden}/${stand.pruefungen.length}`,
          einheit: "bestanden",
          mini: { art: "punkte", werte: Array.from({ length: 7 }, (_, i) => stand.pruefungen.slice(-7)[i]?.bestanden ?? null) },
          unter: "Letzte Testbögen",
        },
      ]}
    />
  );
  const tageText = tage !== null && tage >= 0 ? `${tage}` : "–";
  /** Werte oben im Profil, wenn die Fragen aus sind. */
  const werteOhneFragen = [
    { icon: "camera" as const, farbe: "#4DA3FF", wert: `${schilderGefunden}/${ALBUM.length}`, label: "Schilder", onPress: () => router.push("/schilder-jagd") },
    { icon: "calendar" as const, farbe: "#FF8A2A", wert: tageText, label: tage === 1 ? "Tag bis Prüfung" : "Tage bis Prüfung", onPress: () => router.push("/pruefungstermin") },
    { icon: "bookmark" as const, farbe: "#FFC857", wert: `${gemerkteClips}`, label: "Gemerkt", onPress: () => router.push("/kurz-erklaert") },
  ];
  const mehrOhneFragen = [
    <MenueZeile
      key="schilder"
      icon="camera"
      farbe="#4DA3FF"
      titel="Schilder-Jagd"
      unter={schilderGefunden > 0 ? `${schilderGefunden} von ${ALBUM.length} Schildern gefunden` : "Echte Schilder mit der Kamera sammeln"}
      onPress={() => router.push("/schilder-jagd")}
    />,
    <MenueZeile key="kurz" icon="bulb" farbe="#FF4D6D" titel="Kurz erklärt" unter={gemerkteClips > 0 ? `${gemerkteClips} gemerkt` : "Regeln in 30 Sekunden"} onPress={() => router.push("/kurz-erklaert")} />,
    <MenueZeile key="zeichen" icon="warning" farbe="#E5392C" titel="Verkehrszeichen" unter="Alle Zeichen erklärt" onPress={() => router.push("/zeichen")} />,
    <MenueZeile key="formeln" icon="calculator" farbe="#E0A100" titel="Formeln" unter="Anhalteweg & Co." onPress={() => router.push("/formeln")} />,
  ];
  const mehrZeilen = FRAGEN_AKTIV ? [
    <MenueZeile key="fortschritt" icon="stats-chart" farbe="#8A5FFF" titel="Mein Fortschritt" unter="Statistiken, Stärken & Schwächen" onPress={() => router.push("/statistik")} />,
    <MenueZeile
      key="schilder"
      icon="camera"
      farbe="#4DA3FF"
      titel="Schilder-Jagd"
      unter={schilderGefunden > 0 ? `${schilderGefunden} von ${ALBUM.length} Schildern gefunden` : "Echte Schilder mit der Kamera sammeln"}
      onPress={() => router.push("/schilder-jagd")}
    />,
    <MenueZeile
      key="karten"
      icon="albums"
      farbe="#4ED053"
      titel="Karteikarten"
      unter={kartenDran > 0 ? `${kartenDran} ${kartenDran === 1 ? "Karte" : "Karten"} heute dran` : eigeneKarten > 0 ? `${eigeneKarten} eigene ${eigeneKarten === 1 ? "Karte" : "Karten"}` : "Fragen als Karten lernen"}
      onPress={() => router.push("/karteikarten")}
    />,
    <MenueZeile
      key="crew"
      icon="people"
      farbe="#A66BFF"
      titel="Meine Crew"
      unter={crewDaten?.crew ? `${crewDaten.crew.name} · Flamme Tag ${crewDaten.crew.flamme}` : "Gemeinsam lernen, Boss besiegen"}
      onPress={() => router.push("/crew")}
    />,
    <MenueZeile key="kurz" icon="bulb" farbe="#FF4D6D" titel="Kurz erklärt" unter={gemerkteClips > 0 ? `${gemerkteClips} gemerkt` : "Regeln in 30 Sekunden"} onPress={() => router.push("/kurz-erklaert")} />,
    <MenueZeile key="favoriten" icon="heart" farbe="#FF8A1E" titel="Favoriten" unter="Gemerkte und schwierige Fragen" onPress={() => router.push("/favoriten")} />,
    <MenueZeile key="formeln" icon="calculator" farbe="#E0A100" titel="Formeln" unter="Anhalteweg & Co." onPress={() => router.push("/formeln")} />,
  ] : mehrOhneFragen;
  const kontoGruppe = (
    <MenueGruppe>
      <MenueZeile icon="settings-outline" farbe="#7C838C" titel="Einstellungen & Konto" unter={gast ? "Gastmodus" : undefined} onPress={() => router.push("/einstellungen")} />
      <MenueZeile icon="diamond-outline" farbe="#8A5FFF" titel="Premium" unter="Bald verfügbar" onPress={() => router.push("/premium")} />
      <MenueZeile icon="images-outline" farbe="#E0A100" titel="Bildnachweise" onPress={() => router.push("/bildnachweise")} />
      <MenueZeile icon="document-text-outline" farbe="#7C838C" titel="Impressum" onPress={() => router.push("/impressum")} />
      <MenueZeile icon="shield-checkmark-outline" farbe="#4DA3FF" titel="Datenschutz" onPress={() => router.push("/datenschutz")} />
      <MenueZeile icon="reader-outline" farbe="#7C838C" titel="Nutzungsbedingungen" onPress={() => router.push("/nutzungsbedingungen")} />
      <MenueZeile icon="log-out-outline" farbe="#FF4A3D" titel={gast ? "Gastmodus beenden" : "Abmelden"} gefahr onPress={abmeldenFragen} />
    </MenueGruppe>
  );

  return (
    <FarbweltBereich farbwelt={f}>
      {fokus ? <StatusBar style={f.hell ? "dark" : "light"} /> : null}
      <View style={{ flex: 1, backgroundColor: f.grund }}>
        <ScrollView {...leistenScroll} contentContainerStyle={{ paddingBottom: inhaltUnten + 12 }} showsVerticalScrollIndicator={false}>
          {/* Lichtgrund scrollt mit und beginnt erst unter dem Titelfoto */}
          <GlasGrund ab={heldHoehe} />
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
              {FRAGEN_AKTIV ? (
                <Glas klar hell={f.hell} style={{ flexDirection: "row", alignItems: "center", gap: 7, height: 32, paddingHorizontal: 13, borderRadius: 16, marginTop: 12 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: liga.farbe }} />
                  <Text style={{ ...schrift.textHalb, fontSize: 13, color: kopfText }}>{liga.name}</Text>
                </Glas>
              ) : null}
            </View>

            <View style={{ position: "absolute", left: RAND, right: RAND, bottom: 18 }}>
              <GlasLeiste
                hell={f.hell}
                werte={
                  FRAGEN_AKTIV
                    ? [
                        { icon: "star", farbe: "#FFC857", wert: tausender(stand.xp), label: "Punkte", onPress: () => router.push("/liga") },
                        { icon: "flame", farbe: "#FF8A2A", wert: `${serie}`, label: serie === 1 ? "Tag Serie" : "Tage Serie", onPress: () => router.push("/statistik") },
                        { icon: "ribbon", farbe: "#FFB45C", wert: `${freigeschaltet}/${ERFOLGE.length}`, label: "Abzeichen", onPress: () => dialog("Abzeichen", `${freigeschaltet} von ${ERFOLGE.length} freigeschaltet. Weiter unten siehst du alle.`) },
                      ]
                    : werteOhneFragen
                }
              />
            </View>
          </KinoHeld>

          {!session ? <View style={{ marginHorizontal: RAND, marginTop: 18 }}>{gastKarte}</View> : null}

          {FRAGEN_AKTIV ? (
            <>
              <View style={{ paddingHorizontal: RAND, marginTop: 22 }}>
                <Fuehrerscheinweg meilensteine={meilensteine} anteil={reife} zeile={wegZeile} zwischen={zwischen} onPress={() => router.push("/statistik")} />
              </View>

              <Kopfzeile titel="Abzeichen" link={`${freigeschaltet} von ${ERFOLGE.length}`} style={{ marginTop: 30 }} />
              <Medaillen medaillen={ERFOLGE.map((e) => ({ id: e.id, titel: e.titel, icon: e.icon, erreicht: Boolean(stand.erfolge[e.id]) }))} onPress={abzeichenZeigen} />

              <Kopfzeile titel="Liga & Duelle" style={{ marginTop: 30 }} />
              <View style={{ paddingHorizontal: RAND }}>
                {ligaKarte}
              </View>

              <Kopfzeile titel="Deine Zahlen" link="Statistik" onLink={() => router.push("/statistik")} style={{ marginTop: 30 }} />
              {zahlenRaster}
            </>
          ) : null}

          <Kopfzeile titel={FRAGEN_AKTIV ? "Mehr" : "Lernhilfen"} style={{ marginTop: 30 }} />
          {(() => {
            const zeilen = mehrZeilen;
            // iPad: zwei Spalten nebeneinander statt einer langen, gestreckten Liste
            if (width < 700) return <MenueGruppe>{zeilen}</MenueGruppe>;
            const haelfte = Math.ceil(zeilen.length / 2);
            return (
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: RAND }}>
                <MenueGruppe style={{ flex: 1, marginHorizontal: 0 }}>{zeilen.slice(0, haelfte)}</MenueGruppe>
                <MenueGruppe style={{ flex: 1, marginHorizontal: 0 }}>{zeilen.slice(haelfte)}</MenueGruppe>
              </View>
            );
          })()}

          <Kopfzeile titel="Konto" style={{ marginTop: 30 }} />
          {kontoGruppe}
        </ScrollView>
      </View>
    </FarbweltBereich>
  );
}
