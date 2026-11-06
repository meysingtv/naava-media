import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useIsFocused } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDesktop } from "@/lib/fenster";
import { HomeWeb } from "@/components/web/home-web";
import { GRUSS, tageszeit } from "@/components/home";
import { HauptKnopfFlach, HilfenRaster, RegelKarte, StartAbschnitt, StartKopf, StartZeile, TagesKarte, ThemenReihe, ZielBalken, type Hilfe } from "@/components/start";
import { useInhaltUnten } from "@/components/tab-leiste";
import { TourZiel, useTourBlatt } from "@/components/tour";
import { FarbweltBereich, useDarstellung } from "@/lib/darstellung";
import { CLIPS } from "@/lib/clips";
import { FRAGEN, THEMEN, themaVon, type ThemaId } from "@/lib/fragen";
import { heuteDran } from "@/lib/karteikarten";
import { useKonto } from "@/lib/konto";
import { useLeistenScroll } from "@/lib/leisten-scroll";
import { useLernvideos } from "@/lib/lernvideos";
import { tageBis, terminDatum } from "@/lib/pruefungstag";
import { fehlerIds, fortschritt, gemerktIds, heuteBeantwortet, serieAktuell, useStand } from "@/lib/stand";
import { schrift } from "@/lib/theme";
import { FRAGEN_AKTIV } from "@/lib/funktionen";

export default function Home() {
  // Im Browser am PC eine eigene Fassung (web/home-web.tsx).
  return useDesktop() ? <HomeWeb /> : <HomeHandy />;
}

/**
 * Startseite am Handy: ruhiger Kopf, eine Hauptkarte (Thema des Tages bzw.
 * Weiterlernen), Prüfungstermin als Zeile, Lernhilfen als 2×2-Raster, Regel des
 * Tages und alle Themen als Fotoreihe. Feste Flächen statt Glas.
 */
function HomeHandy() {
  const insets = useSafeAreaInsets();
  const inhaltUnten = useInhaltUnten();
  const leistenScroll = useLeistenScroll();
  const tourBlatt = useTourBlatt("/heute");
  const fokus = useIsFocused();
  const { farbwelt: f } = useDarstellung();
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

  const gesamt = fortschritt(stand);
  const serie = serieAktuell(stand);
  const heute = heuteBeantwortet(stand);
  const rest = Math.max(0, stand.tagesziel - heute);

  const regel = CLIPS[tagNr % CLIPS.length];

  const zumThema = (id: ThemaId) => router.push({ pathname: "/thema/[id]", params: { id } });

  const hilfen: Hilfe[] = FRAGEN_AKTIV
    ? [
        { icon: "refresh", farbe: "#E5392C", titel: "Fehler üben", unter: "Falsche Fragen", zahl: fehlerIds(stand).length, onPress: () => router.push({ pathname: "/training", params: { modus: "fehler" } }) },
        { icon: "albums", farbe: "#1F9E8F", titel: "Karteikarten", unter: "Heute fällig", zahl: heuteDran(stand).gesamt, onPress: () => router.push("/karteikarten") },
        { icon: "heart", farbe: "#E0457B", titel: "Favoriten", unter: "Gemerkte Fragen", zahl: gemerktIds(stand).length, onPress: () => router.push("/favoriten") },
        { icon: "flash", farbe: "#D99400", titel: "Duell", unter: "Gegen Freunde", onPress: () => router.push("/duell") },
      ]
    : [
        { icon: "warning", farbe: "#E5392C", titel: "Verkehrszeichen", unter: "Alle Zeichen erklärt", onPress: () => router.push("/zeichen") },
        { icon: "bulb", farbe: "#E0457B", titel: "Kurz erklärt", unter: "Regeln in 30 Sek.", onPress: () => router.push("/kurz-erklaert") },
        { icon: "calculator", farbe: "#D99400", titel: "Formeln", unter: "Anhalteweg & Co.", onPress: () => router.push("/formeln") },
        { icon: "camera", farbe: "#1F9E8F", titel: "Schilder-Jagd", unter: "Schilder sammeln", onPress: () => router.push("/schilder-jagd") },
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

  const terminTitel = kommend === null ? "Prüfungstermin eintragen" : kommend === 0 ? "Heute ist Prüfung" : kommend === 1 ? "Morgen ist Prüfung" : `Prüfung in ${kommend} Tagen`;
  const terminUnter = termin && kommend !== null ? termin.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" }) : "Dann zählen wir mit dir runter";

  return (
    <FarbweltBereich farbwelt={f}>
      {fokus ? <StatusBar style={f.hell ? "dark" : "light"} /> : null}
      <View style={{ flex: 1, backgroundColor: f.grund }}>
        <ScrollView {...leistenScroll} {...tourBlatt} contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: inhaltUnten + 16 }} showsVerticalScrollIndicator={false}>
          <StartKopf
            gruss={GRUSS[tageszeit(jetzt.getHours())]}
            name={vorname}
            anzeigeName={anzeigeName}
            glockePunkt={glockePunkt}
            onGlocke={() => router.push("/einstellungen")}
            onProfil={() => router.navigate("/profil")}
          />

          <TourZiel id="home-start" style={{ marginTop: 22 }}>
            {FRAGEN_AKTIV ? (
              <TagesKarte
                thema={fokusThema.id}
                etikett="Dein Fokus"
                titel={heute > 0 ? "Weiterlernen" : "Lernen starten"}
                unter={rest > 0 ? `Noch ${rest} Fragen bis zum Tagesziel` : "Tagesziel geschafft – jede Frage zählt extra"}
                onFoto={() => zumThema(fokusThema.id)}
                knopf={<HauptKnopfFlach titel={heute > 0 ? "Weiterlernen" : "Los geht's"} onPress={() => router.push({ pathname: "/training", params: { modus: "smart" } })} />}
              >
                <TourZiel id="home-werte" style={{ gap: 8 }}>
                  <ZielBalken anteil={stand.tagesziel ? heute / stand.tagesziel : 0} />
                  <Text style={{ ...schrift.textMittel, fontSize: 13.5, color: f.text2 }}>
                    {Math.min(heute, 999)} von {stand.tagesziel} Fragen · {Math.round(gesamt.anteil * 100)} % prüfungsreif · {serie} {serie === 1 ? "Tag" : "Tage"} Serie
                  </Text>
                </TourZiel>
              </TagesKarte>
            ) : (
              <TagesKarte
                thema={tagesThema}
                etikett="Thema des Tages"
                titel={themaVon(tagesThema).titel}
                unter={
                  tagesVideos.length
                    ? `${tagesVideos.length === 1 ? "1 Video" : `${tagesVideos.length} Videos`}${minuten > 0 ? ` · ca. ${minuten} Min.` : ""} · ${themaVon(tagesThema).kurz}`
                    : themaVon(tagesThema).kurz
                }
                onFoto={() => zumThema(tagesThema)}
                knopf={<HauptKnopfFlach titel={tagesVideos.length ? "Videos ansehen" : "Zum Thema"} onPress={() => zumThema(tagesThema)} />}
              />
            )}
          </TourZiel>

          <StartZeile icon="calendar" farbe="#F2540A" titel={terminTitel} unter={terminUnter} onPress={() => router.push("/pruefungstermin")} style={{ marginTop: 14 }} />

          <StartAbschnitt titel={FRAGEN_AKTIV ? "Üben" : "Lernhilfen"} style={{ marginTop: 30 }} />
          <TourZiel id="home-schnell">
            <HilfenRaster hilfen={hilfen} />
          </TourZiel>

          {FRAGEN_AKTIV ? (
            <TourZiel id="home-fokus" style={{ marginTop: 14 }}>
              <StartZeile
                icon="shield-checkmark"
                farbe="#3B82F6"
                titel="Prüfungssimulation"
                unter="30 Fragen · 45 Minuten · wie in der echten Prüfung"
                onPress={() => router.navigate("/pruefen")}
              />
            </TourZiel>
          ) : null}

          {regel ? (
            <>
              <StartAbschnitt titel="Gut zu wissen" style={{ marginTop: 30 }} />
              <RegelKarte titel={regel.titel} text={regel.punkte[0] ?? ""} onPress={() => router.push("/kurz-erklaert")} />
            </>
          ) : null}

          <StartAbschnitt titel={FRAGEN_AKTIV ? "Deine Themen" : "Alle Themen"} link="Alle ansehen" onLink={() => router.navigate("/lernen")} style={{ marginTop: 30 }} />
          <ThemenReihe themen={themen} onThema={zumThema} />
        </ScrollView>
      </View>
    </FarbweltBereich>
  );
}
