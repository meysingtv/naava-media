import { ScrollView, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDesktop } from "@/lib/fenster";
import { HomeWeb } from "@/components/web/home-web";
import { tageszeit } from "@/components/home";
import { AKZENT, FotoZeile, hellesFoto, HilfenRaster, RegelKarte, StartAbschnitt, startFarben, StartKopf, TagesKarte, TerminKarte, ThemenReihe, WerteReihe, type Hilfe, type Wert } from "@/components/start";
import { useInhaltUnten } from "@/components/tab-leiste";
import { TourZiel, useTourBlatt } from "@/components/tour";
import { FarbweltBereich, useDarstellung } from "@/lib/darstellung";
import { CLIPS } from "@/lib/clips";
import { FOTOS } from "@/lib/fotos";
import { FRAGEN, THEMEN, themaVon, type ThemaId } from "@/lib/fragen";
import { heuteDran } from "@/lib/karteikarten";
import { useKonto } from "@/lib/konto";
import { useLeistenScroll } from "@/lib/leisten-scroll";
import { useLernvideos } from "@/lib/lernvideos";
import { tageBis, terminDatum } from "@/lib/pruefungstag";
import { ALBUM } from "@/lib/schilder-jagd";
import { fehlerIds, fortschritt, gemerktIds, heuteBeantwortet, serieAktuell, useStand } from "@/lib/stand";
import { FRAGEN_AKTIV } from "@/lib/funktionen";

export default function Home() {
  // Im Browser am PC eine eigene Fassung (web/home-web.tsx).
  return useDesktop() ? <HomeWeb /> : <HomeHandy />;
}

/**
 * Startseite am Handy – durchgehend hell: Begrüßung, Hauptkarte (Thema des
 * Tages bzw. Weiterlernen) mit hellem Foto, drei Werte, Prüfungstermin als
 * zarte orange Karte, Lernhilfen, Regel des Tages und alle Themen. Text steht
 * immer auf Weiß, Fotos werden nicht abgedunkelt.
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
  const vorname = anzeigeName.split(" ")[0] || "Gast";
  const termin = terminDatum(stand.pruefungstermin);
  const tage = termin ? tageBis(termin) : null;
  const kommend = tage !== null && tage >= 0 ? tage : null;
  const glockePunkt = !stand.erinnerung.an;
  // Wechselt jeden Tag: Thema des Tages und Regel des Tages.
  const tagNr = Math.floor((jetzt.getTime() - jetzt.getTimezoneOffset() * 60000) / 86400000);

  // Mit Fragen: Stand je Thema, Fokus ist das schwächste begonnene Thema.
  const themenStand = THEMEN.map((t) => {
    const liste = FRAGEN.filter((q) => q.thema === t.id);
    const p = fortschritt(stand, liste);
    return { id: t.id as ThemaId, anteil: p.anteil, offen: p.gesamt - p.richtig, begonnen: liste.some((q) => stand.fragen[q.id]) };
  });
  const offene = themenStand.filter((t) => t.offen > 0);
  const fokusThema = [...offene.filter((t) => t.begonnen)].sort((a, b) => a.anteil - b.anteil)[0] ?? offene[0] ?? themenStand[0];

  // Ohne Fragen: Thema des Tages – bevorzugt eines mit Videos.
  const mitVideos = THEMEN.filter((t) => zuThema(t.id as ThemaId).length > 0);
  const auswahl = mitVideos.length ? mitVideos : THEMEN;
  const tagesThema = auswahl[tagNr % auswahl.length].id as ThemaId;
  const tagesVideos = zuThema(tagesThema);
  const minuten = Math.round(tagesVideos.reduce((sum, v) => sum + (v.dauer ?? 0), 0) / 60);
  const videosGesamt = THEMEN.reduce((sum, t) => sum + zuThema(t.id as ThemaId).length, 0);

  const gesamt = fortschritt(stand);
  const serie = serieAktuell(stand);
  const heute = heuteBeantwortet(stand);
  const rest = Math.max(0, stand.tagesziel - heute);
  const schilder = ALBUM.filter((k) => stand.schilder[k]).length;

  const regel = CLIPS[tagNr % CLIPS.length];

  const zumThema = (id: ThemaId) => router.push({ pathname: "/thema/[id]", params: { id } });
  const zumTermin = () => router.push("/pruefungstermin");

  const werte: Wert[] = FRAGEN_AKTIV
    ? [
        { icon: "flame", farbe: c.orange, wert: String(serie), label: serie === 1 ? "Tag Serie" : "Tage Serie", onPress: () => router.push("/statistik") },
        { icon: "trending-up", farbe: AKZENT.blau, wert: `${Math.round(gesamt.anteil * 100)} %`, label: "Prüfungsreif", onPress: () => router.push("/statistik") },
        { icon: "star", farbe: AKZENT.gelb, wert: `${Math.min(heute, 999)}/${stand.tagesziel}`, label: "Heute", onPress: () => router.push({ pathname: "/training", params: { modus: "smart" } }) },
      ]
    : [
        { icon: "camera", farbe: AKZENT.gruen, wert: `${schilder}/${ALBUM.length}`, label: "Schilder", onPress: () => router.push("/schilder-jagd") },
        { icon: "play", farbe: c.orange, wert: String(videosGesamt), label: videosGesamt === 1 ? "Video" : "Videos", onPress: () => router.navigate("/lernen") },
        { icon: "bulb", farbe: AKZENT.gelb, wert: String(CLIPS.length), label: "Regeln", onPress: () => router.push("/kurz-erklaert") },
      ];

  const hilfen: Hilfe[] = FRAGEN_AKTIV
    ? [
        { icon: "refresh", farbe: AKZENT.rot, foto: FOTOS.pruefung, titel: "Fehler üben", unter: "Falsche Fragen", zahl: fehlerIds(stand).length, onPress: () => router.push({ pathname: "/training", params: { modus: "fehler" } }) },
        { icon: "albums", farbe: AKZENT.tuerkis, foto: FOTOS.lernen, titel: "Karteikarten", unter: "Heute fällig", zahl: heuteDran(stand).gesamt, onPress: () => router.push("/karteikarten") },
        { icon: "heart", farbe: AKZENT.pink, foto: FOTOS.strasse3, titel: "Favoriten", unter: "Gemerkte Fragen", zahl: gemerktIds(stand).length, onPress: () => router.push("/favoriten") },
        { icon: "flash", farbe: AKZENT.gelb, foto: FOTOS.grundstoff, titel: "Duell", unter: "Gegen Freunde", onPress: () => router.push("/duell") },
      ]
    : [
        { icon: "warning", farbe: AKZENT.rot, foto: FOTOS.vorfahrt, titel: "Verkehrszeichen", unter: "Alle Zeichen erklärt", onPress: () => router.push("/zeichen") },
        { icon: "bulb", farbe: AKZENT.gelb, foto: FOTOS.simulation, titel: "Kurz erklärt", unter: "Regeln in 30 Sek.", onPress: () => router.push("/kurz-erklaert") },
        { icon: "calculator", farbe: AKZENT.blau, foto: FOTOS.strasse1, titel: "Formeln", unter: "Anhalteweg & Co.", onPress: () => router.push("/formeln") },
        { icon: "camera", farbe: AKZENT.gruen, foto: FOTOS.strasse2, titel: "Schilder-Jagd", unter: "Schilder sammeln", onPress: () => router.push("/schilder-jagd") },
      ];

  const themen = THEMEN.map((t) => {
    const id = t.id as ThemaId;
    if (FRAGEN_AKTIV) {
      const st = themenStand.find((x) => x.id === id);
      return { id, angabe: `${Math.round((st?.anteil ?? 0) * 100)} % sicher` };
    }
    const n = zuThema(id).length;
    return { id, angabe: n === 1 ? "1 Video" : n ? `${n} Videos` : "Videos folgen" };
  });

  const videoText = tagesVideos.length === 1 ? "1 Video" : tagesVideos.length ? `${tagesVideos.length} Videos` : null;
  const terminTitel = kommend === null ? "Dein Prüfungstermin" : kommend === 0 ? "Heute ist Prüfung!" : kommend === 1 ? "Morgen ist Prüfung" : `Noch ${kommend} Tage`;
  const terminUnter =
    termin && kommend !== null
      ? `Prüfung am ${termin.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}`
      : "Trag den Termin ein, wir zählen mit.";

  return (
    <FarbweltBereich farbwelt={f}>
      {fokus ? <StatusBar style={c.hell ? "dark" : "light"} /> : null}
      <View style={{ flex: 1, backgroundColor: c.grund }}>
        <ScrollView {...leistenScroll} {...tourBlatt} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: inhaltUnten + 20 }} showsVerticalScrollIndicator={false}>
          <StartKopf
            gruss={GRUSS_KURZ[tageszeit(jetzt.getHours())]}
            name={vorname}
            anzeigeName={anzeigeName}
            glockePunkt={glockePunkt}
            onGlocke={() => router.push("/einstellungen")}
            onProfil={() => router.navigate("/profil")}
          />

          <TourZiel id="home-start" style={{ marginTop: 22 }}>
            {FRAGEN_AKTIV ? (
              <TagesKarte
                foto={hellesFoto(fokusThema.id)}
                etikett={`Fokus: ${themaVon(fokusThema.id).titel}`}
                titel={heute > 0 ? "Weiter geht's" : "Bereit für heute?"}
                unter={rest > 0 ? `Noch ${rest} Fragen bis zu deinem Tagesziel` : "Tagesziel geschafft – jede Frage zählt extra"}
                fortschritt={stand.tagesziel ? heute / stand.tagesziel : 0}
                knopf={heute > 0 ? "Weiterlernen" : "Lernen starten"}
                onPress={() => router.push({ pathname: "/training", params: { modus: "smart" } })}
              />
            ) : (
              <TagesKarte
                foto={hellesFoto(tagesThema)}
                etikett="Thema des Tages"
                titel={themaVon(tagesThema).titel}
                unter={videoText ? `${videoText}${minuten > 0 ? ` · ca. ${minuten} Min.` : ""} · ${themaVon(tagesThema).kurz}` : themaVon(tagesThema).kurz}
                knopf={tagesVideos.length ? "Videos ansehen" : "Zum Thema"}
                onPress={() => zumThema(tagesThema)}
              />
            )}
          </TourZiel>

          <TourZiel id="home-werte" style={{ marginTop: 14 }}>
            <WerteReihe werte={werte} />
          </TourZiel>

          <TerminKarte titel={terminTitel} unter={terminUnter} knopf={termin ? "Ändern" : "Eintragen"} onPress={zumTermin} style={{ marginTop: 14 }} />

          <StartAbschnitt titel={FRAGEN_AKTIV ? "Üben" : "Lernhilfen"} style={{ marginTop: 32 }} />
          <TourZiel id="home-schnell">
            <HilfenRaster hilfen={hilfen} />
          </TourZiel>

          {FRAGEN_AKTIV ? (
            <TourZiel id="home-fokus" style={{ marginTop: 12 }}>
              <FotoZeile foto={FOTOS.simulation} titel="Prüfungssimulation" unter="30 Fragen · 45 Minuten · wie in der echten Prüfung" onPress={() => router.navigate("/pruefen")} />
            </TourZiel>
          ) : null}

          {regel ? (
            <View style={{ marginTop: 16 }}>
              <RegelKarte titel={regel.titel} text={regel.punkte[0] ?? ""} onPress={() => router.push("/kurz-erklaert")} />
            </View>
          ) : null}

          <StartAbschnitt titel={FRAGEN_AKTIV ? "Deine Themen" : "Alle Themen"} link="Alle ansehen" onLink={() => router.navigate("/lernen")} style={{ marginTop: 32 }} />
          <ThemenReihe themen={themen} onThema={zumThema} />
        </ScrollView>
      </View>
    </FarbweltBereich>
  );
}

/** Begrüßung über dem Namen. */
const GRUSS_KURZ: Record<ReturnType<typeof tageszeit>, string> = {
  morgen: "Guten Morgen,",
  tag: "Hallo,",
  abend: "Guten Abend,",
  nacht: "Schön, dass du da bist,",
};
