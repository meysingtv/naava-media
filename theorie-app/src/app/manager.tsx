import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { Logo } from "@/components/grafik";
import { GrossKopf, Seite } from "@/components/seite";
import { Icon, type IconName } from "@/components/icon";
import { Balken, Drehung, Hinweis, IconTaste, Kennzahlen, MAvatar, MKnopf, RollenMarke, statusFarbe, StatusPlakette, Tafel, wannText, zahl, Zeile, type Zustand } from "@/components/manager-teile";
import { AnlegenFenster, nameVon, ZugangBlatt, ZugangListe, type ListenFilter } from "@/components/manager-zugaenge";
import { useVideoZahlen, VideoVerwaltung } from "@/components/manager-videos";
import { EinladungenBereich, FreigabenBereich, MeldungenBereich, MitteilungenBereich, TermineBereich } from "@/components/manager-mehr";
import { B, Leer as LeerZustand, n, Symbol, TOENE, webDunkel, type Ton } from "@/components/web/bunt";
import { LeistenPunkt } from "@/components/web/rahmen";
import { FarbweltBereich, NACHT, TAG } from "@/lib/darstellung";
import { SEITENLEISTE, SEITENLEISTE_BREIT_AB, SEITENLEISTE_SCHMAL } from "@/lib/fenster";
import { useKonto } from "@/lib/konto";
import { managerListe, type ManagerNutzer } from "@/lib/manager";
import { adminZaehler, type Zaehler } from "@/lib/verwaltung";
import { RAND } from "@/lib/theme";

// Manager für den Inhaber (Web-Panel: localhost…/manager): Übersicht über die
// Fahrschule, Zugänge anlegen und verwalten (Fahrschüler, Fahrlehrer, Pausen,
// Sperren, Löschen), Einladungen per QR-Code, Prüfungstermine, Meldungen
// prüfen, Fahrlehrer und Creator freigeben, Mitteilungen senden und Videos zu
// Themen und Fragen hochladen. Ob jemand
// Inhaber ist, prüft die Edge Function „manager“ bei jeder Anfrage.
//
// Im selben Look wie die Lern-App am PC: links die Seitenleiste mit den
// Bereichen, rechts der Inhalt über die volle Breite – hell oder dunkel.

type Bereich = "uebersicht" | "zugaenge" | "einladungen" | "termine" | "meldungen" | "freigaben" | "mitteilungen" | "videos";

const BEREICHE: { id: Bereich; titel: string; unter: string; an: IconName; aus: IconName; ton: Ton }[] = [
  { id: "uebersicht", titel: "Übersicht", unter: "Deine Fahrschule auf einen Blick", an: "grid", aus: "grid-outline", ton: TOENE.orange },
  { id: "zugaenge", titel: "Zugänge", unter: "Fahrschüler und Fahrlehrer anlegen, zuordnen, pausieren oder sperren", an: "people", aus: "people-outline", ton: TOENE.blau },
  { id: "einladungen", titel: "Einladungen", unter: "QR-Code für neue Fahrschüler – sie landen direkt beim richtigen Fahrlehrer", an: "qr-code", aus: "qr-code-outline", ton: TOENE.tuerkis },
  { id: "termine", titel: "Prüfungstermine", unter: "Wann deine Fahrschüler ihre Theorieprüfung haben", an: "calendar", aus: "calendar-outline", ton: TOENE.bernstein },
  { id: "meldungen", titel: "Meldungen", unter: "Gemeldete Clips und Chat-Nachrichten prüfen", an: "flag", aus: "flag-outline", ton: TOENE.rot },
  { id: "freigaben", titel: "Freigaben", unter: "Neue Fahrlehrer bestätigen und Creator-Bewerbungen entscheiden", an: "shield-checkmark", aus: "shield-checkmark-outline", ton: TOENE.lila },
  { id: "mitteilungen", titel: "Mitteilungen", unter: "Nachricht an alle, an eine Rolle oder an die Schüler eines Fahrlehrers", an: "megaphone", aus: "megaphone-outline", ton: TOENE.indigo },
  { id: "videos", titel: "Videos", unter: "Videos zu Themen und Erklärvideos zu einzelnen Fragen", an: "film", aus: "film-outline", ton: TOENE.pink },
];

/** Nach diesen Bereichen kommt in der Seitenleiste ein Trennstrich. */
const GRUPPEN_ENDE: Bereich[] = ["termine", "mitteilungen"];

export default function ManagerSeite() {
  if (Platform.OS !== "web") {
    return (
      <Seite>
        <GrossKopf titel="Manager" unter="Zugänge und Videos verwalten" />
        <View style={{ padding: RAND }}>
          <Hinweis>Der Manager läuft im Web-Panel am Computer. Starte es mit „npm run panel“ und öffne im Browser localhost:8080/manager.</Hinweis>
        </View>
      </Seite>
    );
  }
  return (
    <FarbweltBereich farbwelt={webDunkel() ? NACHT : TAG}>
      <View style={{ flex: 1, backgroundColor: B.grund }}>
        <Inhalt />
      </View>
    </FarbweltBereich>
  );
}

function Inhalt() {
  const { session, anzeigeName } = useKonto();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ bereich?: string }>();
  const [bereich, setBereich] = useState<Bereich>(BEREICHE.some((b) => b.id === params.bereich) ? (params.bereich as Bereich) : "uebersicht");
  const [nutzer, setNutzer] = useState<ManagerNutzer[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [stand, setStand] = useState<Date | null>(null);
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);
  const [anlegen, setAnlegen] = useState(false);
  const [filter, setFilter] = useState<ListenFilter>("alle");
  const [lehrerFilter, setLehrerFilter] = useState<string | null>(null);
  const videos = useVideoZahlen();
  const [zaehler, setZaehler] = useState<Zaehler | null>(null);
  // Zählt hoch bei „Aktualisieren“ – die Bereiche laden dann ihre Daten neu.
  const [tick, setTick] = useState(0);

  const laden = useCallback(async () => {
    setLaedt(true);
    setTick((t) => t + 1);
    // Zähler für Meldungen, Freigaben und Termine – ohne SQL-Update einfach leer.
    adminZaehler()
      .then(setZaehler)
      .catch(() => setZaehler(null));
    try {
      setNutzer(await managerListe());
      setStand(new Date());
      setFehler(null);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    } finally {
      setLaedt(false);
    }
  }, []);

  useEffect(() => {
    if (session) laden();
  }, [session, laden]);

  const wechseln = (b: Bereich) => {
    setBereich(b);
    router.setParams({ bereich: b });
  };

  const fahrlehrer = useMemo(() => (nutzer ?? []).filter((x) => x.rolle === "fahrlehrer"), [nutzer]);
  const gewaehlterNutzer = nutzer?.find((x) => x.id === gewaehlt) ?? null;

  if (!session) {
    return (
      <Mitte>
        <LeerZustand icon="lock-closed" ton={TOENE.orange} titel="Bitte anmelden" text="Der Manager ist nur für den Inhaber. Melde dich mit deinem Inhaber-Konto an.">
          <MKnopf titel="Anmelden" onPress={() => router.push("/anmelden")} />
        </LeerZustand>
      </Mitte>
    );
  }

  if (!nutzer) {
    if (fehler) {
      const keinZugriff = /nur für den inhaber/i.test(fehler);
      return (
        <Mitte>
          <LeerZustand icon={keinZugriff ? "hand-left" : "cloud-offline"} ton={TOENE.rot} titel={keinZugriff ? "Kein Zugriff" : "Manager nicht erreichbar"} text={keinZugriff ? "Den Manager kann nur der Inhaber der App öffnen." : fehler}>
            {keinZugriff ? <MKnopf titel="Zur App" art="sekundaer" onPress={() => router.navigate("/heute")} /> : <MKnopf titel="Nochmal versuchen" art="sekundaer" onPress={laden} laedt={laedt} />}
          </LeerZustand>
        </Mitte>
      );
    }
    return (
      <Mitte>
        <Drehung farbe={B.orange} groesse={26} />
        <Text style={{ ...n.fett, fontSize: 15, color: B.text3 }}>Manager wird geladen …</Text>
      </Mitte>
    );
  }

  const zuZugaengen = (fi: ListenFilter, lehrer: string | null = null) => {
    setFilter(fi);
    setLehrerFilter(lehrer);
    wechseln("zugaenge");
  };

  const ich = nutzer.find((x) => x.ich);
  const name = ich ? nameVon(ich) : anzeigeName;
  const b = BEREICHE.find((x) => x.id === bereich) ?? BEREICHE[0];
  const schmal = width < SEITENLEISTE_BREIT_AB;
  const offeneFreigaben = (zaehler?.fahrlehrer ?? 0) + (zaehler?.bewerbungen ?? 0);
  const zahlen: Record<Bereich, number | undefined> = {
    uebersicht: undefined,
    zugaenge: nutzer.length,
    einladungen: undefined,
    termine: zaehler?.termine || undefined,
    meldungen: zaehler?.meldungen || undefined,
    freigaben: offeneFreigaben || undefined,
    mitteilungen: undefined,
    videos: videos.themen + videos.fragen,
  };
  const zaehlerNeu = () => {
    adminZaehler()
      .then(setZaehler)
      .catch(() => {});
  };

  return (
    <View style={{ flex: 1, flexDirection: "row" }}>
      {/* Seitenleiste wie in der Lern-App */}
      <View style={{ width: schmal ? SEITENLEISTE_SCHMAL : SEITENLEISTE, height: "100%", paddingHorizontal: schmal ? 12 : 16, paddingTop: 22, paddingBottom: 16, borderRightWidth: 1.5, borderRightColor: B.linie, backgroundColor: B.grund }}>
        <Pressable onPress={() => router.navigate("/heute")} accessibilityLabel="Zur App" style={{ paddingHorizontal: schmal ? 0 : 10, alignItems: schmal ? "center" : "flex-start", marginBottom: 6 }}>
          <Logo groesse={schmal ? 34 : 28} mitText={!schmal} hell={!webDunkel()} />
        </Pressable>
        {schmal ? null : <Text style={{ ...n.fett, fontSize: 13, color: B.text3, paddingHorizontal: 10, marginBottom: 20 }}>Manager</Text>}
        <View style={{ gap: 2, marginTop: schmal ? 20 : 0 }}>
          {BEREICHE.map((x) => (
            <View key={x.id}>
              <LeistenPunkt titel={x.titel} an={x.an} aus={x.aus} ton={x.ton} aktiv={x.id === bereich} schmal={schmal} zahl={zahlen[x.id]} onPress={() => wechseln(x.id)} />
              {GRUPPEN_ENDE.includes(x.id) ? <View style={{ height: 1.5, backgroundColor: B.linie, marginVertical: 10, marginHorizontal: 6 }} /> : null}
            </View>
          ))}
        </View>
        <View style={{ height: 1.5, backgroundColor: B.linie, marginVertical: 14, marginHorizontal: 6 }} />
        <LeistenPunkt titel="Zur App" an="arrow-back" aus="arrow-back" ton={TOENE.orange} aktiv={false} schmal={schmal} onPress={() => router.navigate("/heute")} />
        <LeistenPunkt titel="Einstellungen" an="settings" aus="settings-outline" ton={TOENE.orange} aktiv={false} schmal={schmal} onPress={() => router.navigate("/einstellungen")} />
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: schmal ? "center" : "flex-start", gap: 12, padding: 8 }}>
          <MAvatar pfad={ich?.bild_pfad} name={name} groesse={38} />
          {schmal ? null : (
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ ...n.fett, fontSize: 15, color: B.text }} numberOfLines={1}>
                {name}
              </Text>
              <Text style={{ ...n.halb, fontSize: 12.5, color: B.text3 }}>Inhaber</Text>
            </View>
          )}
        </View>
      </View>

      {/* Inhalt */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: width >= 1400 ? 48 : 32, paddingTop: 32, paddingBottom: 64 }}>
        <View style={{ width: "100%", maxWidth: 1320, alignSelf: "center", gap: 28 }}>
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <Symbol icon={b.an} ton={b.ton} groesse={56} />
            <View style={{ flex: 1, minWidth: 260 }}>
              <Text style={{ ...n.schwarz, fontSize: 34, lineHeight: 40, color: B.text }}>{b.titel}</Text>
              <Text style={{ ...n.halb, fontSize: 16, color: B.text2, marginTop: 2 }}>
                {b.unter}
                {stand ? ` · Stand ${stand.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr` : ""}
              </Text>
            </View>
            <IconTaste icon="refresh" label="Aktualisieren" onPress={laden} aus={laedt} groesse={40} />
            {bereich === "uebersicht" || bereich === "zugaenge" ? <MKnopf titel="Zugang anlegen" icon="person-add" onPress={() => setAnlegen(true)} /> : null}
          </View>

          {fehler ? <Hinweis art="fehler">{fehler}</Hinweis> : null}
          {bereich === "uebersicht" ? (
            <Uebersicht nutzer={nutzer} videos={videos} zaehler={zaehler} onBereich={wechseln} onZugaenge={zuZugaengen} onWaehlen={setGewaehlt} onVideos={() => wechseln("videos")} />
          ) : bereich === "einladungen" ? (
            <EinladungenBereich fahrlehrer={fahrlehrer} tick={tick} />
          ) : bereich === "termine" ? (
            <TermineBereich onWaehlen={setGewaehlt} tick={tick} />
          ) : bereich === "meldungen" ? (
            <MeldungenBereich onGeaendert={zaehlerNeu} tick={tick} />
          ) : bereich === "freigaben" ? (
            <FreigabenBereich
              tick={tick}
              onGeaendert={() => {
                zaehlerNeu();
                laden();
              }}
            />
          ) : bereich === "mitteilungen" ? (
            <MitteilungenBereich fahrlehrer={fahrlehrer} nutzer={nutzer} tick={tick} />
          ) : bereich === "zugaenge" ? (
            <ZugangListe
              nutzer={nutzer}
              filter={filter}
              onFilter={setFilter}
              fahrlehrerFilter={lehrerFilter}
              onFahrlehrerFilter={setLehrerFilter}
              onWaehlen={(x) => setGewaehlt(x.id)}
              onNeu={() => setAnlegen(true)}
            />
          ) : (
            <VideoVerwaltung />
          )}
        </View>
      </ScrollView>

      <ZugangBlatt nutzer={gewaehlterNutzer} alle={nutzer} onSchliessen={() => setGewaehlt(null)} onGeaendert={laden} />
      <AnlegenFenster offen={anlegen} fahrlehrer={fahrlehrer} vorgabeLehrer={lehrerFilter} onSchliessen={() => setAnlegen(false)} onAngelegt={laden} />
    </View>
  );
}

function Mitte({ children }: { children: ReactNode }) {
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 24, backgroundColor: B.grund }}>{children}</View>;
}

// ---------------------------------------------------------------------------
// Übersicht
// ---------------------------------------------------------------------------

function Uebersicht({
  nutzer,
  videos,
  zaehler,
  onBereich,
  onZugaenge,
  onWaehlen,
  onVideos,
}: {
  nutzer: ManagerNutzer[];
  videos: { themen: number; fragen: number };
  zaehler: Zaehler | null;
  onBereich: (b: Bereich) => void;
  onZugaenge: (f: ListenFilter, lehrer?: string | null) => void;
  onWaehlen: (id: string) => void;
  onVideos: () => void;
}) {
  const breit = useWindowDimensions().width >= 1280;
  const schueler = nutzer.filter((x) => x.rolle === "schueler");
  const lehrer = nutzer.filter((x) => x.rolle === "fahrlehrer");
  const woche = Date.now() - 7 * 86_400_000;
  const aktivWoche = nutzer.filter((x) => x.zuletzt_aktiv && Date.parse(x.zuletzt_aktiv) >= woche).length;
  const neuWoche = nutzer.filter((x) => Date.parse(x.erstellt_am) >= woche).length;
  const anzahl = { aktiv: 0, pausiert: 0, gesperrt: 0 };
  nutzer.forEach((x) => anzahl[x.status]++);
  const beantwortet = schueler.reduce((s, x) => s + x.fragen_gesamt, 0);
  const richtig = schueler.reduce((s, x) => s + x.fragen_richtig, 0);
  const neueste = [...nutzer].sort((a, c) => Date.parse(c.erstellt_am) - Date.parse(a.erstellt_am)).slice(0, 6);
  const fleissig = [...schueler].sort((a, c) => c.xp - a.xp).filter((x) => x.xp > 0).slice(0, 5);
  const ohneLehrer = schueler.filter((x) => !x.fahrlehrer_id).length;
  const nieDa = nutzer.filter((x) => !x.zuletzt_aktiv).length;

  const offen: { zahl: number; text: string; aktion: string; icon: IconName; ton: Ton; onPress: () => void }[] = [];
  if (zaehler?.meldungen) offen.push({ zahl: zaehler.meldungen, text: zaehler.meldungen === 1 ? "Meldung zu prüfen" : "Meldungen zu prüfen", aktion: "Prüfen", icon: "flag", ton: TOENE.rot, onPress: () => onBereich("meldungen") });
  if (zaehler?.fahrlehrer) offen.push({ zahl: zaehler.fahrlehrer, text: zaehler.fahrlehrer === 1 ? "Fahrlehrer wartet auf Bestätigung" : "Fahrlehrer warten auf Bestätigung", aktion: "Ansehen", icon: "id-card", ton: TOENE.lila, onPress: () => onBereich("freigaben") });
  if (zaehler?.bewerbungen) offen.push({ zahl: zaehler.bewerbungen, text: zaehler.bewerbungen === 1 ? "Creator-Bewerbung offen" : "Creator-Bewerbungen offen", aktion: "Ansehen", icon: "videocam", ton: TOENE.pink, onPress: () => onBereich("freigaben") });
  if (zaehler?.termine) offen.push({ zahl: zaehler.termine, text: zaehler.termine === 1 ? "Prüfung in den nächsten 30 Tagen" : "Prüfungen in den nächsten 30 Tagen", aktion: "Ansehen", icon: "calendar", ton: TOENE.bernstein, onPress: () => onBereich("termine") });
  if (ohneLehrer) offen.push({ zahl: ohneLehrer, text: "Fahrschüler ohne Fahrlehrer", aktion: "Zuordnen", icon: "person-add", ton: TOENE.blau, onPress: () => onZugaenge("schueler") });
  if (nieDa) offen.push({ zahl: nieDa, text: nieDa === 1 ? "Zugang noch nie benutzt" : "Zugänge noch nie benutzt", aktion: "Ansehen", icon: "log-in", ton: TOENE.lila, onPress: () => onZugaenge("alle") });
  if (anzahl.pausiert) offen.push({ zahl: anzahl.pausiert, text: anzahl.pausiert === 1 ? "Zugang pausiert" : "Zugänge pausiert", aktion: "Ansehen", icon: "pause", ton: TOENE.gelb, onPress: () => onZugaenge("pausiert") });

  const links = (
    <View style={{ flex: breit ? 1.5 : undefined, minWidth: 0, gap: 24 }}>
      <Tafel titel="Zu erledigen" icon="checkmark-done" ton={TOENE.orange} zusatz={offen.length ? String(offen.reduce((s, o) => s + o.zahl, 0)) : undefined} innen={false}>
        {offen.length ? (
          offen.map((o, i) => (
            <Zeile key={o.text} oben={i > 0} onPress={o.onPress} style={{ minHeight: 64 }}>
              <Symbol icon={o.icon} ton={o.ton} groesse={38} />
              <Text style={{ ...n.schwarz, fontSize: 20, color: B.text, minWidth: 28, fontVariant: ["tabular-nums"] }}>{o.zahl}</Text>
              <Text style={{ flex: 1, ...n.fett, fontSize: 15, color: B.text }}>{o.text}</Text>
              <Text style={{ ...n.fett, fontSize: 14, color: B.blau }}>{o.aktion}</Text>
              <Icon name="chevron-forward" size={16} color={B.text3} />
            </Zeile>
          ))
        ) : (
          <Zeile style={{ minHeight: 64 }}>
            <Symbol icon="checkmark" ton={TOENE.gruen} groesse={38} />
            <Text style={{ ...n.fett, fontSize: 15, color: B.text2 }}>Alles erledigt – nichts offen.</Text>
          </Zeile>
        )}
      </Tafel>

      <Tafel titel="Zuletzt angelegt" icon="person-add" ton={TOENE.blau} rechts={<MKnopf titel="Alle" art="leise" onPress={() => onZugaenge("alle")} />} innen={false}>
        {neueste.map((x, i) => (
          <Zeile key={x.id} oben={i > 0} onPress={() => onWaehlen(x.id)} style={{ minHeight: 62 }}>
            <MAvatar pfad={x.bild_pfad} name={nameVon(x)} groesse={36} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ ...n.fett, fontSize: 15, color: B.text }} numberOfLines={1}>
                {nameVon(x)}
              </Text>
              <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }} numberOfLines={1}>
                {x.email}
              </Text>
            </View>
            <View style={{ width: 120 }}>
              <RollenMarke rolle={x.rolle} inhaber={x.inhaber} />
            </View>
            <Text style={{ width: 96, textAlign: "right", ...n.halb, fontSize: 13, color: B.text3 }}>{wannText(x.erstellt_am)}</Text>
          </Zeile>
        ))}
      </Tafel>
    </View>
  );

  const rechts = (
    <View style={{ flex: breit ? 1 : undefined, minWidth: 0, gap: 24 }}>
      <Tafel titel="Status der Zugänge" icon="pulse" ton={TOENE.gruen}>
        <View style={{ flexDirection: "row", height: 12, borderRadius: 6, overflow: "hidden", gap: 3, backgroundColor: B.ton }}>
          {(["aktiv", "pausiert", "gesperrt"] as const).map((k) => (anzahl[k] ? <View key={k} style={{ flex: anzahl[k], backgroundColor: statusFarbe(k) }} /> : null))}
        </View>
        <View style={{ marginTop: 14, gap: 4 }}>
          {(
            [
              ["aktiv", "alle"],
              ["pausiert", "pausiert"],
              ["gesperrt", "gesperrt"],
            ] as const
          ).map(([k, fi]) => (
            <Pressable key={k} onPress={() => onZugaenge(fi)} style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 10, height: 40, marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 10, backgroundColor: z.hovered ? B.hover : "transparent" })}>
              <StatusPlakette status={k} />
              <View style={{ flex: 1 }} />
              <Text style={{ ...n.schwarz, fontSize: 17, color: B.text, fontVariant: ["tabular-nums"] }}>{anzahl[k]}</Text>
            </Pressable>
          ))}
        </View>
      </Tafel>

      <Tafel titel="Lernstand der Fahrschüler" icon="school" ton={TOENE.lila}>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ ...n.schwarz, fontSize: 30, color: B.text, fontVariant: ["tabular-nums"] }}>{beantwortet ? `${Math.round((richtig / beantwortet) * 100)} %` : "–"}</Text>
            <Text style={{ ...n.halb, fontSize: 13.5, color: B.text3 }}>richtig beantwortet</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...n.schwarz, fontSize: 30, color: B.text, fontVariant: ["tabular-nums"] }}>{zahl(beantwortet)}</Text>
            <Text style={{ ...n.halb, fontSize: 13.5, color: B.text3 }}>Fragen geübt</Text>
          </View>
        </View>
        <Text style={{ ...n.fett, fontSize: 14, color: B.text2, marginTop: 18, marginBottom: 6 }}>Am meisten gelernt</Text>
        {fleissig.length ? (
          fleissig.map((x, i) => (
            <Pressable key={x.id} onPress={() => onWaehlen(x.id)} style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 12, height: 40, marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 10, backgroundColor: z.hovered ? B.hover : "transparent" })}>
              <Text style={{ width: 18, ...n.schwarz, fontSize: 15, color: i === 0 ? B.orange : B.text3 }}>{i + 1}</Text>
              <MAvatar pfad={x.bild_pfad} name={nameVon(x)} groesse={28} />
              <Text style={{ flex: 1, ...n.fett, fontSize: 14.5, color: B.text }} numberOfLines={1}>
                {nameVon(x)}
              </Text>
              <Text style={{ ...n.fett, fontSize: 14, color: B.gelbKante, fontVariant: ["tabular-nums"] }}>{zahl(x.xp)} XP</Text>
            </Pressable>
          ))
        ) : (
          <Text style={{ ...n.halb, fontSize: 14.5, color: B.text3 }}>Noch hat niemand gelernt.</Text>
        )}
      </Tafel>

      <Tafel titel="Fahrlehrer" icon="car" ton={TOENE.bernstein} innen={false}>
        {lehrer.length === 0 ? (
          <Zeile>
            <Text style={{ ...n.halb, fontSize: 14.5, color: B.text3 }}>Noch keine Fahrlehrer angelegt.</Text>
          </Zeile>
        ) : (
          lehrer.map((l, i) => {
            const anzahlSchueler = nutzer.filter((s) => s.fahrlehrer_id === l.id).length;
            return (
              <Zeile key={l.id} oben={i > 0} onPress={() => onZugaenge("schueler", l.id)}>
                <MAvatar pfad={l.bild_pfad} name={nameVon(l)} groesse={32} />
                <Text style={{ flex: 1, ...n.fett, fontSize: 14.5, color: B.text }} numberOfLines={1}>
                  {nameVon(l)}
                </Text>
                <Balken anteil={schueler.length ? anzahlSchueler / schueler.length : 0} farbe={B.blau} breite={70} />
                <Text style={{ width: 80, textAlign: "right", ...n.fett, fontSize: 13.5, color: B.text2 }}>{anzahlSchueler === 1 ? "1 Schüler" : `${anzahlSchueler} Schüler`}</Text>
              </Zeile>
            );
          })
        )}
      </Tafel>

      <Tafel titel="Videos" icon="film" ton={TOENE.pink} rechts={<MKnopf titel="Verwalten" art="leise" onPress={onVideos} />} innen={false}>
        <Zeile onPress={onVideos}>
          <Symbol icon="albums" ton={TOENE.pink} groesse={34} />
          <Text style={{ flex: 1, ...n.fett, fontSize: 14.5, color: B.text }}>Videos zu Themen</Text>
          <Text style={{ ...n.schwarz, fontSize: 16, color: B.text }}>{videos.themen}</Text>
        </Zeile>
        <Zeile onPress={onVideos} oben>
          <Symbol icon="help-circle" ton={TOENE.lila} groesse={34} />
          <Text style={{ flex: 1, ...n.fett, fontSize: 14.5, color: B.text }}>Erklärvideos zu Fragen</Text>
          <Text style={{ ...n.schwarz, fontSize: 16, color: B.text }}>{videos.fragen}</Text>
        </Zeile>
      </Tafel>
    </View>
  );

  return (
    <View style={{ gap: 24 }}>
      <Kennzahlen
        werte={[
          { titel: "Zugänge", wert: zahl(nutzer.length), unter: neuWoche ? `+${neuWoche} in den letzten 7 Tagen` : "keine neuen in 7 Tagen", hoch: neuWoche > 0, icon: "people", ton: TOENE.orange, onPress: () => onZugaenge("alle") },
          { titel: "Fahrschüler", wert: zahl(schueler.length), unter: ohneLehrer ? `${ohneLehrer} ohne Fahrlehrer` : "alle zugeordnet", icon: "school", ton: TOENE.blau, onPress: () => onZugaenge("schueler") },
          { titel: "Fahrlehrer", wert: zahl(lehrer.length), unter: lehrer.length ? `Ø ${(schueler.length / lehrer.length).toLocaleString("de-DE", { maximumFractionDigits: 1 })} Schüler je Lehrer` : undefined, icon: "car", ton: TOENE.lila, onPress: () => onZugaenge("fahrlehrer") },
          { titel: "Aktiv in 7 Tagen", wert: zahl(aktivWoche), unter: nutzer.length ? `${Math.round((aktivWoche / nutzer.length) * 100)} % aller Zugänge` : undefined, icon: "pulse", ton: TOENE.gruen },
        ]}
      />
      <View style={breit ? { flexDirection: "row", gap: 24, alignItems: "flex-start" } : { gap: 24 }}>
        {links}
        {rechts}
      </View>
    </View>
  );
}
