import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { GrossKopf, Seite } from "@/components/seite";
import { Icon, type IconName } from "@/components/icon";
import { BLAU, Drehung, GELB, Hinweis, MKarte, MKnopf, rotVon, wannText, ZahlKachel, type Zustand } from "@/components/manager-teile";
import { AnlegenFenster, LehrerUebersicht, nameVon, ZugangBlatt, ZugangListe, type ListenFilter } from "@/components/manager-zugaenge";
import { useVideoZahlen, VideoVerwaltung } from "@/components/manager-videos";
import { NutzerBild } from "@/components/profilbild";
import { useFarbwelt } from "@/lib/darstellung";
import { useDesktop } from "@/lib/fenster";
import { useKonto } from "@/lib/konto";
import { managerListe, type ManagerNutzer } from "@/lib/manager";
import { RAND, schrift } from "@/lib/theme";

// Manager für den Inhaber (Web-Panel: localhost…/manager): Übersicht über die
// Fahrschule, Zugänge anlegen und verwalten (Fahrschüler, Fahrlehrer, Pausen,
// Sperren, Löschen) und Videos zu Themen und Fragen hochladen. Ob jemand
// Inhaber ist, prüft die Edge Function „manager“ bei jeder Anfrage.

type Bereich = "uebersicht" | "zugaenge" | "videos";

const BEREICHE: { id: Bereich; titel: string; icon: IconName }[] = [
  { id: "uebersicht", titel: "Übersicht", icon: "grid-outline" },
  { id: "zugaenge", titel: "Zugänge", icon: "people-outline" },
  { id: "videos", titel: "Videos", icon: "play-circle-outline" },
];

const VIOLETT = "#8B5CF6";

export default function ManagerSeite() {
  return (
    <Seite breit>
      <Inhalt />
    </Seite>
  );
}

function Inhalt() {
  const f = useFarbwelt();
  const { session } = useKonto();
  const desktop = useDesktop();
  // Eigene Seitenleiste nur auf sehr breiten Bildschirmen (links steht schon die App-Leiste) – sonst Reiter oben.
  const fensterBreite = useWindowDimensions().width;
  const seitenleiste = desktop && fensterBreite >= 2000;
  const params = useLocalSearchParams<{ bereich?: string }>();
  const [bereich, setBereich] = useState<Bereich>(BEREICHE.some((b) => b.id === params.bereich) ? (params.bereich as Bereich) : "uebersicht");
  const [nutzer, setNutzer] = useState<ManagerNutzer[] | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [gewaehlt, setGewaehlt] = useState<string | null>(null);
  const [anlegen, setAnlegen] = useState(false);
  const [filter, setFilter] = useState<ListenFilter>("alle");
  const [lehrerFilter, setLehrerFilter] = useState<string | null>(null);

  const laden = useCallback(async () => {
    setLaedt(true);
    try {
      setNutzer(await managerListe());
      setFehler(null);
    } catch (e) {
      setFehler(e instanceof Error ? e.message : String(e));
    } finally {
      setLaedt(false);
    }
  }, []);

  useEffect(() => {
    if (session && Platform.OS === "web") laden();
  }, [session, laden]);

  const wechseln = (b: Bereich) => {
    setBereich(b);
    router.setParams({ bereich: b });
  };

  const fahrlehrer = useMemo(() => (nutzer ?? []).filter((n) => n.rolle === "fahrlehrer"), [nutzer]);
  const gewaehlterNutzer = nutzer?.find((n) => n.id === gewaehlt) ?? null;

  // Nur im Browser: Hochladen und Tabellen sind für Maus und großen Bildschirm gemacht.
  if (Platform.OS !== "web") {
    return (
      <>
        <GrossKopf titel="Manager" unter="Zugänge und Videos verwalten" />
        <View style={{ padding: RAND }}>
          <Hinweis>Der Manager läuft im Web-Panel am Computer. Starte es mit „npm run panel“ und öffne im Browser localhost:8080/manager.</Hinweis>
        </View>
      </>
    );
  }

  if (!session) {
    return (
      <Leer icon="lock-closed-outline" titel="Bitte anmelden" text="Der Manager ist nur für den Inhaber. Melde dich mit deinem Inhaber-Konto an.">
        <MKnopf titel="Anmelden" icon="log-in-outline" onPress={() => router.push("/anmelden")} />
      </Leer>
    );
  }

  if (!nutzer) {
    if (fehler) {
      const keinZugriff = /nur für den inhaber/i.test(fehler);
      return (
        <Leer icon={keinZugriff ? "hand-left-outline" : "cloud-offline-outline"} titel={keinZugriff ? "Kein Zugriff" : "Manager nicht erreichbar"} text={keinZugriff ? "Den Manager kann nur der Inhaber der App öffnen." : fehler}>
          {keinZugriff ? <MKnopf titel="Zur Startseite" art="sekundaer" onPress={() => router.navigate("/heute")} /> : <MKnopf titel="Nochmal versuchen" icon="refresh" onPress={laden} laedt={laedt} />}
        </Leer>
      );
    }
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14 }}>
        <Drehung farbe={f.orange} groesse={28} />
        <Text style={{ ...schrift.textMittel, fontSize: 14, color: f.text3 }}>Manager wird geladen …</Text>
      </View>
    );
  }

  const zuZugaengen = (fi: ListenFilter, lehrer: string | null = null) => {
    setFilter(fi);
    setLehrerFilter(lehrer);
    wechseln("zugaenge");
  };

  const navigation = (
    <View style={seitenleiste ? { width: 220, gap: 4 } : { flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
      {BEREICHE.map((b) => {
        const aktiv = b.id === bereich;
        return (
          <Pressable
            key={b.id}
            onPress={() => wechseln(b.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: aktiv }}
            style={(z: Zustand) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 11,
              height: 44,
              paddingHorizontal: 14,
              borderRadius: 14,
              backgroundColor: aktiv ? (f.hell ? "#FFFFFF" : "rgba(255,255,255,0.07)") : z.hovered ? (f.hell ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.04)") : "transparent",
              ...(aktiv && f.hell ? { boxShadow: "0px 4px 14px rgba(60,44,24,0.08)" } : null),
            })}
          >
            <Icon name={aktiv ? (b.icon.replace("-outline", "") as IconName) : b.icon} size={19} color={aktiv ? f.orange : f.text2} />
            <Text style={{ flex: seitenleiste ? 1 : undefined, ...schrift.textHalb, fontSize: 14.5, color: aktiv ? f.text : f.text2 }}>{b.titel}</Text>
            {b.id === "zugaenge" && seitenleiste ? <Text style={{ ...schrift.textHalb, fontSize: 12.5, color: f.text3 }}>{nutzer.length}</Text> : null}
          </Pressable>
        );
      })}
      {seitenleiste ? (
        <View style={{ marginTop: 18, padding: 14, borderRadius: 16, gap: 6, backgroundColor: f.hell ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: f.linie }}>
          <Icon name="shield-checkmark" size={18} color={f.gruen} />
          <Text style={{ ...schrift.textHalb, fontSize: 13, color: f.text }}>Nur für dich sichtbar</Text>
          <Text style={{ ...schrift.text, fontSize: 12.5, lineHeight: 17, color: f.text3 }}>Jede Aktion prüft der Server – Schlüssel bleiben dort.</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <>
      <ScrollView contentContainerStyle={{ paddingHorizontal: desktop ? 28 : RAND, paddingTop: desktop ? 30 : 20, paddingBottom: 60, gap: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
          <View style={{ flex: 1, minWidth: 260, gap: 4 }}>
            <Text style={{ ...schrift.textHalb, fontSize: 12.5, letterSpacing: 1.2, textTransform: "uppercase", color: f.orange }}>Fahrschul Pro · Manager</Text>
            <Text style={{ ...schrift.titel, fontSize: 34, lineHeight: 40, letterSpacing: -0.7, color: f.text }}>{BEREICHE.find((b) => b.id === bereich)?.titel}</Text>
            <Text style={{ ...schrift.text, fontSize: 15, color: f.text2 }}>
              {bereich === "uebersicht" ? "Alles zu deiner Fahrschule auf einen Blick." : bereich === "zugaenge" ? "Fahrschüler und Fahrlehrer anlegen, zuordnen, pausieren oder sperren." : "Videos zu Themen und einzelnen Fragen hochladen."}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <MKnopf titel={laedt ? "Lädt …" : "Aktualisieren"} icon="refresh" art="sekundaer" onPress={laden} deaktiviert={laedt} />
            <MKnopf titel="Zugang anlegen" icon="person-add" onPress={() => setAnlegen(true)} />
          </View>
        </View>

        {fehler ? <Hinweis art="fehler">{fehler}</Hinweis> : null}

        <View style={seitenleiste ? { flexDirection: "row", gap: 28, alignItems: "flex-start" } : { gap: 18 }}>
          {navigation}
          <View style={{ flex: seitenleiste ? 1 : undefined, minWidth: 0, gap: 20 }}>
            {bereich === "uebersicht" ? (
              <Uebersicht nutzer={nutzer} onZugaenge={zuZugaengen} onWaehlen={setGewaehlt} onVideos={() => wechseln("videos")} />
            ) : bereich === "zugaenge" ? (
              <ZugangListe
                nutzer={nutzer}
                filter={filter}
                onFilter={setFilter}
                fahrlehrerFilter={lehrerFilter}
                onFahrlehrerFilter={setLehrerFilter}
                onWaehlen={(n) => setGewaehlt(n.id)}
                onNeu={() => setAnlegen(true)}
              />
            ) : (
              <VideoVerwaltung />
            )}
          </View>
        </View>
      </ScrollView>

      <ZugangBlatt nutzer={gewaehlterNutzer} alle={nutzer} onSchliessen={() => setGewaehlt(null)} onGeaendert={laden} />
      <AnlegenFenster offen={anlegen} fahrlehrer={fahrlehrer} vorgabeLehrer={lehrerFilter} onSchliessen={() => setAnlegen(false)} onAngelegt={laden} />
    </>
  );
}

function Uebersicht({
  nutzer,
  onZugaenge,
  onWaehlen,
  onVideos,
}: {
  nutzer: ManagerNutzer[];
  onZugaenge: (f: ListenFilter, lehrer?: string | null) => void;
  onWaehlen: (id: string) => void;
  onVideos: () => void;
}) {
  const f = useFarbwelt();
  const videos = useVideoZahlen();
  const schueler = nutzer.filter((n) => n.rolle === "schueler");
  const woche = Date.now() - 7 * 86_400_000;
  const aktivWoche = nutzer.filter((n) => n.zuletzt_aktiv && Date.parse(n.zuletzt_aktiv) >= woche).length;
  const zahl = { aktiv: 0, pausiert: 0, gesperrt: 0 };
  nutzer.forEach((n) => zahl[n.status]++);
  const beantwortet = schueler.reduce((s, n) => s + n.fragen_gesamt, 0);
  const richtig = schueler.reduce((s, n) => s + n.fragen_richtig, 0);
  const neueste = [...nutzer].sort((a, b) => Date.parse(b.erstellt_am) - Date.parse(a.erstellt_am)).slice(0, 5);
  const fleissig = [...schueler].sort((a, b) => b.xp - a.xp).filter((n) => n.xp > 0).slice(0, 5);
  const ohneLehrer = schueler.filter((n) => !n.fahrlehrer_id).length;
  const nieDa = nutzer.filter((n) => !n.zuletzt_aktiv).length;
  const offen: { icon: IconName; text: string; onPress: () => void }[] = [];
  if (ohneLehrer) offen.push({ icon: "person-outline", text: ohneLehrer === 1 ? "1 Fahrschüler hat noch keinen Fahrlehrer" : `${ohneLehrer} Fahrschüler haben noch keinen Fahrlehrer`, onPress: () => onZugaenge("schueler") });
  if (nieDa) offen.push({ icon: "log-in-outline", text: nieDa === 1 ? "1 Zugang wurde noch nie benutzt" : `${nieDa} Zugänge wurden noch nie benutzt`, onPress: () => onZugaenge("alle") });

  return (
    <View style={{ gap: 20 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
        <ZahlKachel icon="people" farbe={f.orange} wert={nutzer.length} titel="Zugänge" unter="alle Konten" onPress={() => onZugaenge("alle")} />
        <ZahlKachel icon="person" farbe={BLAU} wert={schueler.length} titel="Fahrschüler" onPress={() => onZugaenge("schueler")} />
        <ZahlKachel icon="school" farbe={VIOLETT} wert={nutzer.length - schueler.length} titel="Fahrlehrer" onPress={() => onZugaenge("fahrlehrer")} />
        <ZahlKachel icon="pulse" farbe="#23A548" wert={aktivWoche} titel="Aktiv" unter="in den letzten 7 Tagen" />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
        <MKarte titel="Status der Zugänge" style={{ flex: 1, minWidth: 300 }}>
          <View style={{ gap: 14 }}>
            {(
              [
                ["aktiv", "Aktiv", f.gruen],
                ["pausiert", "Pausiert", GELB],
                ["gesperrt", "Gesperrt", rotVon(f)],
              ] as const
            ).map(([k, titel, farbe]) => (
              <Pressable key={k} onPress={() => onZugaenge(k === "aktiv" ? "alle" : k)} style={{ gap: 7 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ ...schrift.textHalb, fontSize: 14, color: f.text }}>{titel}</Text>
                  <Text style={{ ...schrift.textHalb, fontSize: 14, color: f.text2, fontVariant: ["tabular-nums"] }}>{zahl[k]}</Text>
                </View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: f.hell ? "rgba(20,23,27,0.06)" : "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                  <View style={{ width: `${nutzer.length ? (zahl[k] / nutzer.length) * 100 : 0}%`, height: "100%", borderRadius: 4, backgroundColor: farbe }} />
                </View>
              </Pressable>
            ))}
          </View>
          {offen.length ? (
            <View style={{ marginTop: 18, gap: 8 }}>
              <Text style={{ ...schrift.textHalb, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase", color: f.text3 }}>Zu erledigen</Text>
              {offen.map((o) => (
                <Pressable key={o.text} onPress={o.onPress} style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, backgroundColor: z.hovered ? (f.hell ? "#FAF7F2" : "rgba(255,255,255,0.04)") : f.hell ? "#FBFAF7" : "rgba(255,255,255,0.02)" })}>
                  <Icon name={o.icon} size={16} color={GELB} />
                  <Text style={{ flex: 1, ...schrift.textMittel, fontSize: 13.5, color: f.text }}>{o.text}</Text>
                  <Icon name="chevron-forward" size={15} color={f.text3} />
                </Pressable>
              ))}
            </View>
          ) : null}
        </MKarte>
        <MKarte titel="Lernstand der Fahrschüler" style={{ flex: 1, minWidth: 300 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ ...schrift.titel, fontSize: 28, color: f.text, fontVariant: ["tabular-nums"] }}>{beantwortet ? `${Math.round((richtig / beantwortet) * 100)} %` : "–"}</Text>
              <Text style={{ ...schrift.textMittel, fontSize: 12.5, color: f.text3 }}>richtig beantwortet</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ ...schrift.titel, fontSize: 28, color: f.text, fontVariant: ["tabular-nums"] }}>{beantwortet.toLocaleString("de-DE")}</Text>
              <Text style={{ ...schrift.textMittel, fontSize: 12.5, color: f.text3 }}>Fragen geübt</Text>
            </View>
          </View>
          <View style={{ marginTop: 16, gap: 6 }}>
            <Text style={{ ...schrift.textHalb, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase", color: f.text3 }}>Am fleißigsten</Text>
            {fleissig.length ? (
              fleissig.map((n, i) => (
                <Pressable key={n.id} onPress={() => onWaehlen(n.id)} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 3 }}>
                  <Text style={{ width: 18, ...schrift.textFett, fontSize: 13, color: i === 0 ? f.orange : f.text3 }}>{i + 1}</Text>
                  <Text style={{ flex: 1, ...schrift.textHalb, fontSize: 13.5, color: f.text }} numberOfLines={1}>
                    {nameVon(n)}
                  </Text>
                  <Text style={{ ...schrift.textMittel, fontSize: 13, color: f.text2, fontVariant: ["tabular-nums"] }}>{n.xp} XP</Text>
                </Pressable>
              ))
            ) : (
              <Text style={{ ...schrift.text, fontSize: 13.5, color: f.text3 }}>Noch hat niemand gelernt.</Text>
            )}
          </View>
        </MKarte>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
        <MKarte titel="Zuletzt angelegt" style={{ flex: 1, minWidth: 300 }} rechts={<MKnopf titel="Alle" art="leise" onPress={() => onZugaenge("alle")} />}>
          <View style={{ gap: 4 }}>
            {neueste.map((n) => (
              <Pressable
                key={n.id}
                onPress={() => onWaehlen(n.id)}
                style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 8, borderRadius: 14, backgroundColor: z.hovered ? (f.hell ? "#FAF7F2" : "rgba(255,255,255,0.04)") : "transparent" })}
              >
                <NutzerBild pfad={n.bild_pfad} name={nameVon(n)} farbe={n.avatar_farbe ?? undefined} groesse={34} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ ...schrift.textHalb, fontSize: 14, color: f.text }} numberOfLines={1}>
                    {nameVon(n)}
                  </Text>
                  <Text style={{ ...schrift.text, fontSize: 12.5, color: f.text3 }} numberOfLines={1}>
                    {n.email}
                  </Text>
                </View>
                <Text style={{ ...schrift.textMittel, fontSize: 12.5, color: f.text3 }}>{wannText(n.erstellt_am)}</Text>
              </Pressable>
            ))}
          </View>
        </MKarte>
        <LehrerUebersicht nutzer={nutzer} onWaehlen={(id) => onZugaenge("schueler", id)} />
      </View>

      <MKarte titel="Videos" rechts={<MKnopf titel="Videos verwalten" icon="arrow-forward" art="sekundaer" onPress={onVideos} />}>
        <View style={{ flexDirection: "row", gap: 24, flexWrap: "wrap" }}>
          <VideoZahl icon="albums" farbe={f.orange} wert={videos.themen} titel="Videos zu Themen" text="auf den Themenseiten" />
          <VideoZahl icon="help-circle" farbe={BLAU} wert={videos.fragen} titel="Erklärvideos zu Fragen" text="beim Lernen neben der KI-Hilfe" />
        </View>
      </MKarte>
    </View>
  );
}

function VideoZahl({ icon, farbe, wert, titel, text }: { icon: IconName; farbe: string; wert: number; titel: string; text: string }) {
  const f = useFarbwelt();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minWidth: 260 }}>
      <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: `${farbe}22` }}>
        <Icon name={icon} size={21} color={farbe} />
      </View>
      <View>
        <Text style={{ ...schrift.titel, fontSize: 22, color: f.text, fontVariant: ["tabular-nums"] }}>{wert}</Text>
        <Text style={{ ...schrift.textHalb, fontSize: 13, color: f.text }}>{titel}</Text>
        <Text style={{ ...schrift.text, fontSize: 12, color: f.text3 }}>{text}</Text>
      </View>
    </View>
  );
}

function Leer({ icon, titel, text, children }: { icon: IconName; titel: string; text: string; children?: ReactNode }) {
  const f = useFarbwelt();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
      <MKarte style={{ width: "100%", maxWidth: 440, alignItems: "center", gap: 14, padding: 32 }}>
        <View style={{ width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", backgroundColor: f.orangeSoft }}>
          <Icon name={icon} size={26} color={f.orange} />
        </View>
        <Text style={{ ...schrift.titel, fontSize: 22, color: f.text, textAlign: "center" }}>{titel}</Text>
        <Text style={{ ...schrift.text, fontSize: 14.5, lineHeight: 21, color: f.text2, textAlign: "center" }}>{text}</Text>
        {children}
      </MKarte>
    </View>
  );
}
