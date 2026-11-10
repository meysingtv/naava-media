import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { Icon, type IconName } from "@/components/icon";
import { GRUSS, tageszeit } from "@/components/home";
import { Abschnitt, B, Balken, DickRing, Kachel, Knopf, n, Raster, Symbol, THEMA_TON, TOENE, Wert, zahlen, type Ton, type Zustand } from "@/components/web/bunt";
import { WebSeite } from "@/components/web/rahmen";
import { FRAGEN, THEMEN, themaVon, type ThemaId } from "@/lib/fragen";
import { FRAGEN_AKTIV } from "@/lib/funktionen";
import { heuteDran } from "@/lib/karteikarten";
import { useKonto } from "@/lib/konto";
import { tageBis, terminDatum } from "@/lib/pruefungstag";
import { useLernvideos } from "@/lib/lernvideos";
import { ligaVon } from "@/lib/rangliste";
import { fehlerIds, fortschritt, gemerktIds, heuteBeantwortet, serieAktuell, useStand } from "@/lib/stand";

// Home am PC – ruhig und mit klarem Fokus: oben Begrüßung mit Serie, XP und
// Liga, darunter „Heute“ (Tagesziel und Weiterlernen) neben der Prüfungsreife,
// eine schlichte Zeile zum Schnellstart, die Themen als Liste und die Prüfung.

type Schnell = { icon: IconName; titel: string; ton: Ton; zahl?: number; onPress: () => void };

export function HomeWeb() {
  return FRAGEN_AKTIV ? <HomeWebMitFragen /> : <HomeWebOhneFragen />;
}

/**
 * Home am PC, solange die Fragen aus sind (lib/funktionen.ts): Lernvideos im
 * Mittelpunkt, Prüfungstermin, Schnellstart zu den Lernhilfen, Themen mit
 * ihren Videos.
 */
function HomeWebOhneFragen() {
  const { stand } = useStand();
  const { anzeigeName, gast } = useKonto();
  const { zuThema } = useLernvideos();

  const vorname = anzeigeName.split(" ")[0] || "Gast";
  const gruss = GRUSS[tageszeit(new Date().getHours())];
  const termin = terminDatum(stand.pruefungstermin);
  const tage = termin ? tageBis(termin) : null;
  const kommend = tage !== null && tage >= 0 ? tage : null;
  const unterzeile =
    kommend === null ? "Mach deinen Führerschein möglich." : kommend === 0 ? "Heute ist dein Tag – du schaffst das." : kommend === 1 ? "Morgen ist Prüfung. Noch ein Video?" : `Noch ${kommend} Tage bis zur Prüfung.`;

  const schnell: Schnell[] = [
    { icon: "play-circle", titel: "Lernvideos", ton: TOENE.gruen, onPress: () => router.navigate("/lernen") },
    { icon: "bulb", titel: "Kurz erklärt", ton: TOENE.koralle, onPress: () => router.push("/kurz-erklaert") },
    { icon: "warning", titel: "Verkehrszeichen", ton: TOENE.rot, onPress: () => router.push("/zeichen") },
    { icon: "calculator", titel: "Formeln", ton: TOENE.bernstein, onPress: () => router.push("/formeln") },
    { icon: "camera", titel: "Schilder-Jagd", ton: TOENE.blau, onPress: () => router.push("/schilder-jagd") },
    { icon: "film", titel: "Clips", ton: TOENE.pink, onPress: () => router.navigate("/clips") },
  ];

  return (
    <WebSeite ohneRechts>
      <View style={{ width: "100%", maxWidth: 1080, alignSelf: "center", gap: 36 }}>
        <View style={{ flex: 1, minWidth: 280 }}>
          <Text style={{ ...n.schwarz, fontSize: 34, lineHeight: 40, color: B.text }}>
            {gruss}, {vorname}
          </Text>
          <Text style={{ ...n.halb, fontSize: 16.5, color: B.text2, marginTop: 2 }}>{unterzeile}</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 20, flexWrap: "wrap" }}>
          <Kachel style={{ flex: 2, minWidth: 420, padding: 28, gap: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <Symbol icon="play-circle" ton={TOENE.gruen} groesse={56} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...n.schwarz, fontSize: 26, color: B.text }}>Lernvideos</Text>
                <Text style={{ ...n.halb, fontSize: 15.5, color: B.text2 }}>Alle Themen der Theorie kurz und einfach erklärt</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <Knopf titel="Lernvideos ansehen" icon="play" groesse="gross" onPress={() => router.navigate("/lernen")} style={{ minWidth: 220 }} />
              <Knopf titel="Kurz erklärt" art="rand" ton="blau" onPress={() => router.push("/kurz-erklaert")} />
            </View>
          </Kachel>

          <Kachel onPress={() => router.push("/pruefungstermin")} style={{ flex: 1, minWidth: 260, padding: 28, alignItems: "center", justifyContent: "center", gap: 10 }}>
            <Symbol icon="calendar" ton={TOENE.orange} groesse={52} />
            <Text style={{ ...n.schwarz, fontSize: 22, color: B.text, fontVariant: ["tabular-nums"] }}>
              {kommend === null ? "Prüfungstermin" : kommend === 0 ? "Heute" : kommend === 1 ? "Morgen" : `Noch ${kommend} Tage`}
            </Text>
            <Text style={{ ...n.halb, fontSize: 14, color: B.text2 }}>{kommend === null ? "Trag deinen Termin ein" : "bis zur Theorieprüfung"}</Text>
          </Kachel>
        </View>

        {gast ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, paddingLeft: 20, borderRadius: 16, backgroundColor: B.ton, flexWrap: "wrap" }}>
            <Icon name="cloud-upload-outline" size={22} color={B.text2} />
            <Text style={{ flex: 1, minWidth: 240, ...n.halb, fontSize: 15, color: B.text2 }}>Du schaust als Gast. Mit einem kostenlosen Konto kannst du liken, kommentieren und ein Profilbild zeigen.</Text>
            <Knopf titel="Anmelden" art="rand" ton="blau" groesse="klein" onPress={() => router.push("/anmelden")} />
            <Knopf titel="Konto erstellen" ton="gruen" groesse="klein" onPress={() => router.push("/registrieren")} />
          </View>
        ) : null}

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {schnell.map((x) => (
            <Pressable
              key={x.titel}
              onPress={x.onPress}
              style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 9, height: 44, paddingLeft: 12, paddingRight: 16, borderRadius: 12, borderWidth: 1.5, borderColor: z.hovered ? B.kante : B.linie, backgroundColor: z.hovered ? B.hover : B.flaeche })}
            >
              <Icon name={x.icon} size={19} color={x.ton.farbe} />
              <Text style={{ ...n.fett, fontSize: 14.5, color: B.text }}>{x.titel}</Text>
            </Pressable>
          ))}
        </View>

        <View>
          <Abschnitt titel="Lernvideos nach Thema" link="Alle ansehen" onLink={() => router.navigate("/lernen")} />
          <ThemenVideoListe videos={(id) => zuThema(id).length} />
        </View>
      </View>
    </WebSeite>
  );
}

/** Themen mit der Zahl ihrer Videos – für die Fassung ohne Fragen. */
export function ThemenVideoListe({ videos, min = 400, max = 2 }: { videos: (id: ThemaId) => number; min?: number; max?: number }) {
  return (
    <Raster min={min} max={max} abstand={10}>
      {THEMEN.map((t) => {
        const ton = THEMA_TON[t.id as ThemaId];
        const zahl = videos(t.id as ThemaId);
        return (
          <Pressable
            key={t.id}
            onPress={() => router.push({ pathname: "/thema/[id]", params: { id: t.id } })}
            style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 14, height: 64, borderRadius: 14, borderWidth: 1.5, borderColor: z.hovered ? B.kante : B.linie, backgroundColor: z.hovered ? B.hover : B.flaeche })}
          >
            <Symbol icon={t.icon as IconName} ton={ton} groesse={38} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ ...n.fett, fontSize: 15, color: B.text }} numberOfLines={1}>
                {t.titel}
              </Text>
              <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>{zahl ? (zahl === 1 ? "1 Video" : `${zahl} Videos`) : "Videos folgen"}</Text>
            </View>
            <Icon name="play-circle" size={22} color={zahl ? ton.farbe : B.text3} />
          </Pressable>
        );
      })}
    </Raster>
  );
}

function HomeWebMitFragen() {
  const { stand } = useStand();
  const { anzeigeName, gast } = useKonto();

  const vorname = anzeigeName.split(" ")[0] || "Gast";
  const gruss = GRUSS[tageszeit(new Date().getHours())];
  const gesamt = fortschritt(stand);
  const heute = heuteBeantwortet(stand);
  const ziel = stand.tagesziel;
  const rest = Math.max(0, ziel - heute);
  const serie = serieAktuell(stand);
  const liga = ligaVon(stand.xp);
  const termin = terminDatum(stand.pruefungstermin);
  const tage = termin ? tageBis(termin) : null;
  const kommend = tage !== null && tage >= 0 ? tage : null;
  const letzte = stand.pruefungen[0] ?? null;

  const themen = THEMEN.map((t) => {
    const liste = FRAGEN.filter((q) => q.thema === t.id);
    const p = fortschritt(stand, liste);
    return { id: t.id as ThemaId, anteil: p.anteil, offen: p.gesamt - p.richtig, anzahl: liste.length, begonnen: liste.some((q) => stand.fragen[q.id]) };
  });
  const offeneThemen = themen.filter((t) => t.offen > 0);
  const fokus = [...offeneThemen.filter((t) => t.begonnen)].sort((a, b) => a.anteil - b.anteil)[0] ?? offeneThemen[0] ?? themen[0];
  const fokusThema = themaVon(fokus.id);
  const fokusTon = THEMA_TON[fokus.id];

  const lernen = () => router.push({ pathname: "/training", params: { modus: "smart" } });

  const schnell: Schnell[] = [
    { icon: "refresh", titel: "Fehler üben", ton: TOENE.rot, zahl: fehlerIds(stand).length, onPress: () => router.push({ pathname: "/training", params: { modus: "fehler" } }) },
    { icon: "heart", titel: "Favoriten", ton: TOENE.pink, zahl: gemerktIds(stand).length, onPress: () => router.push("/favoriten") },
    { icon: "albums", titel: "Karteikarten", ton: TOENE.tuerkis, zahl: heuteDran(stand).gesamt, onPress: () => router.push("/karteikarten") },
    { icon: "flash", titel: "Duell", ton: TOENE.gelb, onPress: () => router.push("/duell") },
    { icon: "camera", titel: "Schilder-Jagd", ton: TOENE.blau, onPress: () => router.push("/schilder-jagd") },
    { icon: "stats-chart", titel: "Statistik", ton: TOENE.indigo, onPress: () => router.push("/statistik") },
  ];

  const unterzeile =
    kommend === null ? "Mach deinen Führerschein möglich." : kommend === 0 ? "Heute ist dein Tag – du schaffst das." : kommend === 1 ? "Morgen ist Prüfung. Noch eine Runde?" : `Noch ${kommend} Tage bis zur Prüfung.`;

  return (
    <WebSeite ohneRechts>
      <View style={{ width: "100%", maxWidth: 1080, alignSelf: "center", gap: 36 }}>
        {/* Kopf: Begrüßung links, Werte rechts */}
        <View style={{ flexDirection: "row", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
          <View style={{ flex: 1, minWidth: 280 }}>
            <Text style={{ ...n.schwarz, fontSize: 34, lineHeight: 40, color: B.text }}>
              {gruss}, {vorname}
            </Text>
            <Text style={{ ...n.halb, fontSize: 16.5, color: B.text2, marginTop: 2 }}>{unterzeile}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 4 }}>
            <Wert icon="flame" ton={serie > 0 ? TOENE.orange : { ...TOENE.orange, farbe: B.text3 }} wert={String(serie)} titel="Serie" onPress={() => router.push("/statistik")} />
            <Wert icon="flash" ton={TOENE.gelb} wert={zahlen(stand.xp)} titel="XP" onPress={() => router.push("/liga")} />
            <Wert icon="trophy" ton={{ farbe: liga.farbe, kante: liga.farbe, hell: B.ton }} wert={liga.name.replace("-Liga", "")} titel="Liga" onPress={() => router.push("/liga")} />
          </View>
        </View>

        {/* Heute + Prüfungsreife */}
        <View style={{ flexDirection: "row", gap: 20, flexWrap: "wrap" }}>
          <Kachel style={{ flex: 2, minWidth: 420, padding: 28, gap: 22 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
              <View>
                <Text style={{ ...n.fett, fontSize: 14.5, color: B.text3 }}>Heute</Text>
                <Text style={{ ...n.schwarz, fontSize: 30, color: B.text, fontVariant: ["tabular-nums"] }}>
                  {Math.min(heute, 999)} <Text style={{ color: B.text3 }}>/ {ziel} Fragen</Text>
                </Text>
              </View>
              <Text style={{ ...n.fett, fontSize: 14.5, color: rest ? B.text2 : B.gruenKante }}>{rest ? `noch ${rest} bis zum Tagesziel` : "Tagesziel geschafft"}</Text>
            </View>
            <Balken anteil={ziel ? heute / ziel : 0} ton={rest ? TOENE.orange : TOENE.gruen} hoehe={12} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <Knopf titel={heute > 0 ? "Weiterlernen" : "Lernen starten"} icon="play" groesse="gross" onPress={lernen} style={{ minWidth: 220 }} />
              <Pressable onPress={() => router.push({ pathname: "/training", params: { modus: "thema", thema: fokus.id } })} style={(z: Zustand) => ({ flex: 1, minWidth: 220, flexDirection: "row", alignItems: "center", gap: 12, padding: 8, borderRadius: 14, backgroundColor: z.hovered ? B.ton : "transparent" })}>
                <Symbol icon={fokusThema.icon as IconName} ton={fokusTon} groesse={40} />
                <View style={{ flex: 1 }}>
                  <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>Fokus-Thema</Text>
                  <Text style={{ ...n.fett, fontSize: 15.5, color: B.text }} numberOfLines={1}>
                    {fokusThema.titel} · {fokus.offen} offen
                  </Text>
                </View>
                <Icon name="chevron-forward" size={18} color={B.text3} />
              </Pressable>
            </View>
          </Kachel>

          <Kachel onPress={() => router.push("/statistik")} style={{ flex: 1, minWidth: 260, padding: 28, alignItems: "center", justifyContent: "center", gap: 12 }}>
            <DickRing anteil={gesamt.anteil} groesse={128} dicke={12} ton={TOENE.orange}>
              <Text style={{ ...n.schwarz, fontSize: 30, color: B.text, fontVariant: ["tabular-nums"] }}>{Math.round(gesamt.anteil * 100)}%</Text>
            </DickRing>
            <View style={{ alignItems: "center" }}>
              <Text style={{ ...n.schwarz, fontSize: 17, color: B.text }}>Prüfungsreif</Text>
              <Text style={{ ...n.halb, fontSize: 14, color: B.text2 }}>
                {gesamt.richtig} von {gesamt.gesamt} sicher
              </Text>
            </View>
          </Kachel>
        </View>

        {gast ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, paddingLeft: 20, borderRadius: 16, backgroundColor: B.ton, flexWrap: "wrap" }}>
            <Icon name="cloud-upload-outline" size={22} color={B.text2} />
            <Text style={{ flex: 1, minWidth: 240, ...n.halb, fontSize: 15, color: B.text2 }}>Du lernst als Gast. Mit einem kostenlosen Konto ist dein Fortschritt gesichert – und Liga, Crew und Duelle gehen.</Text>
            <Knopf titel="Anmelden" art="rand" ton="blau" groesse="klein" onPress={() => router.push("/anmelden")} />
            <Knopf titel="Konto erstellen" ton="gruen" groesse="klein" onPress={() => router.push("/registrieren")} />
          </View>
        ) : null}

        {/* Schnellstart */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {schnell.map((x) => (
            <Pressable
              key={x.titel}
              onPress={x.onPress}
              style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 9, height: 44, paddingLeft: 12, paddingRight: 16, borderRadius: 12, borderWidth: 1.5, borderColor: z.hovered ? B.kante : B.linie, backgroundColor: z.hovered ? B.hover : B.flaeche })}
            >
              <Icon name={x.icon} size={19} color={x.ton.farbe} />
              <Text style={{ ...n.fett, fontSize: 14.5, color: B.text }}>{x.titel}</Text>
              {x.zahl ? (
                <View style={{ minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: 11, backgroundColor: x.ton.hell, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ ...n.schwarz, fontSize: 12, color: x.ton.kante }}>{x.zahl > 99 ? "99+" : x.zahl}</Text>
                </View>
              ) : null}
            </Pressable>
          ))}
        </View>

        {/* Themen */}
        <View>
          <Abschnitt titel="Deine Themen" link="Alle ansehen" onLink={() => router.navigate("/lernen")} />
          <ThemenListe themen={themen} />
        </View>

        {/* Prüfung */}
        <Kachel style={{ padding: 24, flexDirection: "row", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <Symbol icon="shield-checkmark" ton={TOENE.blau} groesse={52} />
          <View style={{ flex: 1, minWidth: 240, gap: 4 }}>
            <Text style={{ ...n.schwarz, fontSize: 19, color: B.text }}>Prüfungssimulation</Text>
            <Text style={{ ...n.halb, fontSize: 14.5, color: B.text2 }}>
              30 Fragen · 45 Minuten
              {kommend !== null ? ` · Prüfung ${kommend === 0 ? "heute" : kommend === 1 ? "morgen" : `in ${kommend} Tagen`}` : ""}
              {letzte ? ` · zuletzt ${letzte.bestanden ? "bestanden" : "nicht bestanden"} (${letzte.fehlerpunkte} FP)` : ""}
            </Text>
          </View>
          {kommend === null ? <Knopf titel="Termin eintragen" art="rand" ton="blau" onPress={() => router.push("/pruefungstermin")} /> : null}
          <Knopf titel="Simulation starten" ton="blau" onPress={() => router.push({ pathname: "/pruefung", params: { direkt: "1" } })} />
        </Kachel>
      </View>
    </WebSeite>
  );
}

/** Themen als ruhige Liste in zwei Spalten: Symbol, Name, Balken, Prozent. */
export function ThemenListe({ themen }: { themen: { id: ThemaId; anteil: number; anzahl: number }[] }) {
  return (
    <Raster min={400} max={2} abstand={10}>
      {themen.map((t) => {
        const thema = themaVon(t.id);
        const ton = THEMA_TON[t.id];
        return (
          <Pressable
            key={t.id}
            onPress={() => router.push({ pathname: "/thema/[id]", params: { id: t.id } })}
            style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 14, height: 64, borderRadius: 14, borderWidth: 1.5, borderColor: z.hovered ? B.kante : B.linie, backgroundColor: z.hovered ? B.hover : B.flaeche })}
          >
            <Symbol icon={thema.icon as IconName} ton={ton} groesse={38} />
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={{ ...n.fett, fontSize: 15, color: B.text }} numberOfLines={1}>
                {thema.titel}
              </Text>
              <Balken anteil={t.anteil} ton={ton} hoehe={6} />
            </View>
            <Text style={{ width: 44, textAlign: "right", ...n.schwarz, fontSize: 14.5, color: t.anteil > 0 ? B.text : B.text3, fontVariant: ["tabular-nums"] }}>{Math.round(t.anteil * 100)}%</Text>
          </Pressable>
        );
      })}
    </Raster>
  );
}

/** Alle Themen als bunte Kacheln mit Fortschritt. */
export function ThemenKacheln({ themen }: { themen: { id: ThemaId; anteil: number; anzahl: number }[] }) {
  return (
    <Raster min={230} abstand={16}>
      {themen.map((t) => {
        const thema = themaVon(t.id);
        const ton = THEMA_TON[t.id];
        return (
          <Kachel key={t.id} onPress={() => router.push({ pathname: "/thema/[id]", params: { id: t.id } })} style={{ padding: 18, gap: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <Symbol icon={thema.icon as IconName} ton={ton} groesse={52} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...n.schwarz, fontSize: 16.5, lineHeight: 21, color: B.text }} numberOfLines={2}>
                  {thema.titel}
                </Text>
                <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>{t.anzahl} Fragen</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Balken anteil={t.anteil} ton={ton} hoehe={14} style={{ flex: 1 }} />
              <Text style={{ ...n.schwarz, fontSize: 14, color: t.anteil > 0 ? ton.kante : B.text3, width: 42, textAlign: "right", fontVariant: ["tabular-nums"] }}>{Math.round(t.anteil * 100)}%</Text>
            </View>
          </Kachel>
        );
      })}
    </Raster>
  );
}

/** Kleiner klickbarer Text-Link. */
export function TextLink({ text, onPress }: { text: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={(z: Zustand) => ({ opacity: z.hovered ? 0.7 : 1 })}>
      <Text style={{ ...n.fett, fontSize: 14, color: B.blau }}>{text}</Text>
    </Pressable>
  );
}
