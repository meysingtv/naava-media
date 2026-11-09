import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDesktop } from "@/lib/fenster";
import { HomeWeb } from "@/components/web/home-web";
import { Abschnitt, Liste, startFarben, StartKopf, TagesThema, Wegweiser, Zusatzzeichen, type Eintrag } from "@/components/start";
import { useInhaltUnten } from "@/components/tab-leiste";
import { TourZiel, useTourBlatt } from "@/components/tour";
import { FarbweltBereich, useDarstellung } from "@/lib/darstellung";
import { CLIPS } from "@/lib/clips";
import { FOTOS, type FotoKey } from "@/lib/fotos";
import { FRAGEN, THEMEN, themaVon, type ThemaId } from "@/lib/fragen";
import { heuteDran } from "@/lib/karteikarten";
import { useKonto } from "@/lib/konto";
import { useLeistenScroll } from "@/lib/leisten-scroll";
import { useLernvideos } from "@/lib/lernvideos";
import { tageBis, terminDatum } from "@/lib/pruefungstag";
import { ALBUM } from "@/lib/schilder-jagd";
import { fehlerIds, fortschritt, gemerktIds, heuteBeantwortet, useStand } from "@/lib/stand";
import { ZEICHEN_INFO } from "@/components/zeichen";
import { FRAGEN_AKTIV } from "@/lib/funktionen";

export default function Home() {
  // Im Browser am PC eine eigene Fassung (web/home-web.tsx).
  return useDesktop() ? <HomeWeb /> : <HomeHandy />;
}

/**
 * Helle Fotos je Thema für die Startseite (einige Themenfotos sind
 * Nachtaufnahmen, die hier zu schwer wirken).
 */
const TAGES_FOTO: Record<ThemaId, FotoKey> = {
  gefahren: "gefahren",
  vorfahrt: "vorfahrt",
  zeichen: "strasse1",
  umwelt: "baeume",
  technik: "pruefung",
  manoever: "verhalten",
  tempo: "tempo",
  parken: "strasse3",
  autobahn: "grundstoff",
  mensch: "simulation",
  zahlen: "lernen",
};

/**
 * Startseite am Handy. Die Bildsprache kommt von der Straße: oben ein gelber
 * Pfeilwegweiser, der bis zur Theorieprüfung zählt, darunter das Thema des
 * Tages mit großem Foto, eine ruhige Liste zum Nachschlagen und die Regel des
 * Tages als Zusatzzeichen.
 */
function HomeHandy() {
  const insets = useSafeAreaInsets();
  const inhaltUnten = useInhaltUnten();
  const leistenScroll = useLeistenScroll();
  const tourBlatt = useTourBlatt("/heute");
  const fokus = useIsFocused();
  const { farbwelt: f } = useDarstellung();
  const c = startFarben(f);
  const { stand } = useStand();
  const { anzeigeName } = useKonto();
  const { zuThema } = useLernvideos();

  const jetzt = new Date();
  const datum = jetzt.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  const vorname = anzeigeName.split(" ")[0] || "Gast";
  const glockePunkt = !stand.erinnerung.an;
  const tagNr = Math.floor((jetzt.getTime() - jetzt.getTimezoneOffset() * 60000) / 86400000);

  // Prüfungstermin für den Wegweiser
  const termin = terminDatum(stand.pruefungstermin);
  const tage = termin ? tageBis(termin) : null;
  const kommend = tage !== null && tage >= 0 ? tage : null;
  const wegweiser =
    kommend === null
      ? { entfernung: "Termin?", einheit: undefined, unter: "Trag deinen Prüfungstermin ein, dann zählt das Schild die Tage mit." }
      : kommend === 0
        ? { entfernung: "Heute", einheit: undefined, unter: "Viel Erfolg bei deiner Prüfung." }
        : {
            entfernung: String(kommend),
            einheit: kommend === 1 ? "Tag" : "Tage",
            unter: `Am ${termin!.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}. Antippen, um den Termin zu ändern.`,
          };

  // Thema des Tages – bevorzugt eines mit Videos
  const mitVideos = THEMEN.filter((t) => zuThema(t.id as ThemaId).length > 0);
  const auswahl = mitVideos.length ? mitVideos : THEMEN;
  const tagesThema = auswahl[tagNr % auswahl.length].id as ThemaId;
  const tagesVideos = zuThema(tagesThema);
  const minuten = Math.round(tagesVideos.reduce((sum, v) => sum + (v.dauer ?? 0), 0) / 60);
  const meta = tagesVideos.length ? `${tagesVideos.length === 1 ? "1 Video" : `${tagesVideos.length} Videos`}${minuten > 0 ? `, etwa ${minuten} Min.` : ""}` : undefined;

  // Mit Fragen: schwächstes begonnenes Thema und Tagesziel
  const themenStand = THEMEN.map((t) => {
    const liste = FRAGEN.filter((q) => q.thema === t.id);
    const p = fortschritt(stand, liste);
    return { id: t.id as ThemaId, anteil: p.anteil, offen: p.gesamt - p.richtig, begonnen: liste.some((q) => stand.fragen[q.id]) };
  });
  const offene = themenStand.filter((t) => t.offen > 0);
  const fokusThema = [...offene.filter((t) => t.begonnen)].sort((a, b) => a.anteil - b.anteil)[0] ?? offene[0] ?? themenStand[0];
  const heute = heuteBeantwortet(stand);
  const rest = Math.max(0, stand.tagesziel - heute);

  const schilder = ALBUM.filter((k) => stand.schilder[k]).length;
  const regel = CLIPS[tagNr % CLIPS.length];
  const zumThema = (id: ThemaId) => router.push({ pathname: "/thema/[id]", params: { id } });

  const eintraege: Eintrag[] = FRAGEN_AKTIV
    ? [
        { icon: "refresh", titel: "Fehler üben", wert: String(fehlerIds(stand).length), onPress: () => router.push({ pathname: "/training", params: { modus: "fehler" } }) },
        { icon: "albums-outline", titel: "Karteikarten", wert: `${heuteDran(stand).gesamt} fällig`, onPress: () => router.push("/karteikarten") },
        { icon: "heart-outline", titel: "Favoriten", wert: String(gemerktIds(stand).length), onPress: () => router.push("/favoriten") },
        { icon: "flash-outline", titel: "Duell", onPress: () => router.push("/duell") },
        { icon: "camera-outline", titel: "Schilder-Jagd", wert: `${schilder} von ${ALBUM.length}`, onPress: () => router.push("/schilder-jagd") },
      ]
    : [
        { icon: "warning-outline", titel: "Verkehrszeichen", wert: String(ZEICHEN_INFO.length), onPress: () => router.push("/zeichen") },
        { icon: "bulb-outline", titel: "Regeln in 30 Sekunden", wert: String(CLIPS.length), onPress: () => router.push("/kurz-erklaert") },
        { icon: "calculator-outline", titel: "Formeln", onPress: () => router.push("/formeln") },
        { icon: "camera-outline", titel: "Schilder-Jagd", wert: `${schilder} von ${ALBUM.length}`, onPress: () => router.push("/schilder-jagd") },
        { icon: "albums-outline", titel: "Alle Themen", wert: String(THEMEN.length), onPress: () => router.navigate("/lernen") },
      ];

  return (
    <FarbweltBereich farbwelt={f}>
      {fokus ? <StatusBar style={c.hell ? "dark" : "light"} /> : null}
      <View style={{ flex: 1, backgroundColor: c.grund }}>
        <ScrollView {...leistenScroll} {...tourBlatt} contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: inhaltUnten + 28 }} showsVerticalScrollIndicator={false}>
          <StartKopf
            datum={datum}
            name={vorname}
            anzeigeName={anzeigeName}
            glockePunkt={glockePunkt}
            onGlocke={() => router.push("/einstellungen")}
            onProfil={() => router.navigate("/profil")}
          />

          <TourZiel id="home-werte" style={{ marginTop: 28 }}>
            <Wegweiser ziel="Theorieprüfung" entfernung={wegweiser.entfernung} einheit={wegweiser.einheit} unter={wegweiser.unter} onPress={() => router.push("/pruefungstermin")} />
          </TourZiel>

          {FRAGEN_AKTIV ? (
            <TourZiel id="home-start" style={{ marginTop: 40 }}>
              <Abschnitt titel="Weiterlernen" />
              <TagesThema
                foto={FOTOS[TAGES_FOTO[fokusThema.id]]}
                titel={themaVon(fokusThema.id).titel}
                unter={rest > 0 ? `Noch ${rest} Fragen bis zu deinem Tagesziel. Wir fangen mit deinem schwächsten Thema an.` : "Tagesziel geschafft. Jede weitere Frage zählt trotzdem."}
                fortschritt={stand.tagesziel ? heute / stand.tagesziel : 0}
                knopf={heute > 0 ? "Weiterlernen" : "Lernen starten"}
                meta={`${heute} von ${stand.tagesziel} heute`}
                onFoto={() => zumThema(fokusThema.id)}
                onKnopf={() => router.push({ pathname: "/training", params: { modus: "smart" } })}
              />
            </TourZiel>
          ) : (
            <TourZiel id="home-start" style={{ marginTop: 40 }}>
              <Abschnitt titel="Thema des Tages" />
              <TagesThema
                foto={FOTOS[TAGES_FOTO[tagesThema]]}
                titel={themaVon(tagesThema).titel}
                unter={themaVon(tagesThema).kurz}
                knopf={tagesVideos.length ? "Videos ansehen" : "Thema öffnen"}
                meta={meta}
                onFoto={() => zumThema(tagesThema)}
                onKnopf={() => zumThema(tagesThema)}
              />
            </TourZiel>
          )}

          <TourZiel id="home-schnell" style={{ marginTop: 40 }}>
            <Abschnitt titel={FRAGEN_AKTIV ? "Üben" : "Nachschlagen"} />
            <Liste eintraege={eintraege} />
          </TourZiel>

          {FRAGEN_AKTIV ? (
            <TourZiel id="home-fokus" style={{ marginTop: 12 }}>
              <Liste eintraege={[{ icon: "shield-checkmark-outline", titel: "Prüfung simulieren", wert: "30 Fragen", onPress: () => router.navigate("/pruefen") }]} />
            </TourZiel>
          ) : null}

          {regel ? (
            <View style={{ marginTop: 40 }}>
              <Abschnitt titel="Regel des Tages" />
              <Zusatzzeichen titel={regel.titel} text={regel.punkte[0] ?? ""} link="Mehr in „Kurz erklärt“" onPress={() => router.push("/kurz-erklaert")} />
            </View>
          ) : null}
        </ScrollView>
      </View>
    </FarbweltBereich>
  );
}
