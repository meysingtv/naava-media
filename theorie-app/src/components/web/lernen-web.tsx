import { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";

import { Icon, type IconName } from "@/components/icon";
import { Abschnitt, B, Balken, Kachel, Knopf, n, Raster, Reiter, SeitenTitel, Spalte, Symbol, THEMA_TON, TOENE, type Ton, type Zustand } from "@/components/web/bunt";
import { ThemenListe, ThemenVideoListe } from "@/components/web/home-web";
import { WebSeite } from "@/components/web/rahmen";
import { FRAGEN, THEMEN, fragenZuThema, themaVon, type ThemaId } from "@/lib/fragen";
import { FRAGEN_AKTIV } from "@/lib/funktionen";
import { heuteDran } from "@/lib/karteikarten";
import { useLernvideos } from "@/lib/lernvideos";
import { ALBUM } from "@/lib/schilder-jagd";
import { fehlerIds, fortschritt, gemerktIds, schwierigeIds, useStand } from "@/lib/stand";

// Lernen am PC: Suche oben (Treffer gleich darunter), der Stand als drei große
// Zahlen, „Smart lernen“, alle Lernmodi als bunte Kacheln und die Themen nach
// Schwierigkeit gefiltert.

type Stufe = "alle" | "leicht" | "mittel" | "schwer";

const STUFEN: { id: Stufe; titel: string; ton: Ton }[] = [
  { id: "alle", titel: "Alle", ton: TOENE.orange },
  { id: "leicht", titel: "Leicht", ton: TOENE.gruen },
  { id: "mittel", titel: "Mittel", ton: TOENE.gelb },
  { id: "schwer", titel: "Schwer", ton: TOENE.rot },
];

/** Schwierigkeit eines Themas nach den Fehlerpunkten seiner Fragen. */
function stufeVon(thema: ThemaId): Exclude<Stufe, "alle"> {
  const liste = fragenZuThema(thema);
  const schnitt = liste.reduce((s, f) => s + f.punkte, 0) / Math.max(1, liste.length);
  if (schnitt < 3.5) return "leicht";
  if (schnitt < 4.1) return "mittel";
  return "schwer";
}

const VORSCHLAEGE = ["Kreisverkehr", "Rettungsgasse", "Promille", "Überholen", "Schulbus", "Reifen", "Bahnübergang", "Anhalteweg"];

type Modus = { titel: string; unter: string; icon: IconName; ton: Ton; zahl?: number; onPress: () => void };

export function LernenWeb() {
  return FRAGEN_AKTIV ? <LernenWebMitFragen /> : <LernenWebOhneFragen />;
}

/** Lernen am PC ohne Fragen: Lernhilfen als Kacheln und alle Themen mit ihren Videos. */
function LernenWebOhneFragen() {
  const { stand } = useStand();
  const { zuThema } = useLernvideos();
  const gefunden = ALBUM.filter((k) => stand.schilder[k]).length;
  const alleVideos = THEMEN.reduce((sum, t) => sum + zuThema(t.id).length, 0);
  const modi: Modus[] = [
    { titel: "Kurz erklärt", unter: "Regeln in 30 Sekunden", icon: "bulb", ton: TOENE.lila, onPress: () => router.push("/kurz-erklaert") },
    { titel: "Verkehrszeichen", unter: "Alle Zeichen erklärt", icon: "warning", ton: TOENE.gelb, onPress: () => router.push("/zeichen") },
    { titel: "Formeln", unter: "Anhalteweg & Co.", icon: "calculator", ton: TOENE.limette, onPress: () => router.push("/formeln") },
    { titel: "Schilder-Jagd", unter: gefunden > 0 ? `${gefunden} von ${ALBUM.length} gefunden` : "Schilder sammeln", icon: "camera", ton: TOENE.blau, onPress: () => router.push("/schilder-jagd") },
  ];
  return (
    <WebSeite ohneRechts>
      <Spalte>
        <SeitenTitel titel="Lernen" unter={`${THEMEN.length} Themen${alleVideos ? ` · ${alleVideos} Videos` : ""} · Klasse ${stand.klasse}`} />
        <View>
          <Abschnitt titel="Lernhilfen" />
          <Raster min={240} abstand={12}>
            {modi.map((m) => (
              <Kachel key={m.titel} onPress={m.onPress} style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 14 }}>
                <Symbol icon={m.icon} ton={m.ton} groesse={42} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ ...n.fett, fontSize: 15.5, color: B.text }} numberOfLines={1}>
                    {m.titel}
                  </Text>
                  <Text style={{ ...n.halb, fontSize: 13.5, color: B.text2 }} numberOfLines={1}>
                    {m.unter}
                  </Text>
                </View>
              </Kachel>
            ))}
          </Raster>
        </View>
        <View>
          <Abschnitt titel="Alle Themen" />
          <ThemenVideoListe videos={(id) => zuThema(id).length} />
        </View>
      </Spalte>
    </WebSeite>
  );
}

function LernenWebMitFragen() {
  const { stand } = useStand();
  const [suche, setSuche] = useState("");
  const [stufe, setStufe] = useState<Stufe>("alle");

  const q = suche.trim().toLowerCase();
  const treffer = useMemo(() => (q.length < 2 ? [] : FRAGEN.filter((fr) => fr.text.toLowerCase().includes(q) || themaVon(fr.thema).titel.toLowerCase().includes(q)).slice(0, 30)), [q]);

  const gesamt = fortschritt(stand);
  const fehler = fehlerIds(stand).length;
  const gesehen = FRAGEN.filter((x) => {
    const fs = stand.fragen[x.id];
    return fs != null && fs.r + fs.f > 0;
  }).length;
  const neu = FRAGEN.length - gesehen;
  const gemerkt = gemerktIds(stand).length;
  const schwierig = schwierigeIds(stand).length;
  const dran = heuteDran(stand).gesamt;
  const gefunden = ALBUM.filter((k) => stand.schilder[k]).length;

  const modi: Modus[] = [
    { titel: "Fehler üben", unter: fehler > 0 ? `${fehler} offen` : "Alles erledigt", icon: "refresh", ton: TOENE.rot, zahl: fehler, onPress: () => router.push({ pathname: "/training", params: { modus: "fehler" } }) },
    { titel: "Karteikarten", unter: dran > 0 ? `${dran} heute dran` : "Als Karten lernen", icon: "albums", ton: TOENE.tuerkis, zahl: dran, onPress: () => router.push("/karteikarten") },
    { titel: "Favoriten", unter: gemerkt > 0 ? `${gemerkt} gemerkt` : "Noch leer", icon: "heart", ton: TOENE.pink, onPress: () => router.push("/favoriten") },
    { titel: "Schwierige Fragen", unter: schwierig > 0 ? `${schwierig} Fragen` : "Noch keine", icon: "flame", ton: TOENE.bernstein, onPress: () => router.push({ pathname: "/training", params: { modus: "schwierig" } }) },
    { titel: "Verkehrszeichen", unter: "Alle Zeichen erklärt", icon: "warning", ton: TOENE.gelb, onPress: () => router.push("/zeichen") },
    { titel: "Schilder-Jagd", unter: gefunden > 0 ? `${gefunden} von ${ALBUM.length} gefunden` : "Schilder sammeln", icon: "camera", ton: TOENE.blau, onPress: () => router.push("/schilder-jagd") },
    { titel: "Formeln", unter: "Anhalteweg & Co.", icon: "calculator", ton: TOENE.limette, onPress: () => router.push("/formeln") },
    { titel: "Kurz erklärt", unter: "Regeln in 30 Sekunden", icon: "bulb", ton: TOENE.lila, onPress: () => router.push("/kurz-erklaert") },
  ];

  const themen = THEMEN.filter((t) => stufe === "alle" || stufeVon(t.id) === stufe).map((t) => {
    const liste = fragenZuThema(t.id);
    return { id: t.id, anteil: fortschritt(stand, liste).anteil, anzahl: liste.length };
  });

  return (
    <WebSeite ohneRechts>
      <Spalte>
      <SeitenTitel titel="Lernen" unter={`${THEMEN.length} Themen · ${FRAGEN.length} Fragen · Klasse ${stand.klasse}`} />

      {/* Suche */}
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, height: 56, paddingHorizontal: 18, borderRadius: 16, borderWidth: 2, borderColor: suche ? B.blau : B.linie, backgroundColor: B.ton }}>
          <Icon name="search" size={22} color={suche ? B.blau : B.text3} />
          <TextInput
            value={suche}
            onChangeText={setSuche}
            placeholder="Frage oder Thema suchen – z. B. Kreisverkehr"
            placeholderTextColor={B.text3}
            style={{ flex: 1, ...n.halb, fontSize: 16.5, color: B.text, outlineWidth: 0 }}
          />
          {suche ? (
            <Pressable onPress={() => setSuche("")} accessibilityLabel="Suche leeren">
              <Icon name="close-circle" size={22} color={B.text3} />
            </Pressable>
          ) : null}
        </View>
        {q.length < 2 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {VORSCHLAEGE.map((w) => (
              <Pressable key={w} onPress={() => setSuche(w)} style={(z: Zustand) => ({ height: 34, paddingHorizontal: 14, borderRadius: 17, justifyContent: "center", borderWidth: 2, borderColor: B.linie, backgroundColor: z.hovered ? B.ton : B.flaeche })}>
                <Text style={{ ...n.fett, fontSize: 13.5, color: B.text2 }}>{w}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {q.length >= 2 ? (
        <View>
          <Abschnitt titel={treffer.length ? `${treffer.length === 30 ? "30+" : treffer.length} Treffer` : "Nichts gefunden"} />
          {treffer.length ? (
            <Kachel>
              {treffer.map((fr, i) => {
                const ton = THEMA_TON[fr.thema];
                return (
                  <Pressable
                    key={fr.id}
                    onPress={() => router.push({ pathname: "/training", params: { modus: "thema", thema: fr.thema, start: fr.id } })}
                    style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 18, paddingVertical: 14, borderTopWidth: i ? 2 : 0, borderTopColor: B.ton, backgroundColor: z.hovered ? B.hover : "transparent" })}
                  >
                    <Symbol icon={themaVon(fr.thema).icon as IconName} ton={ton} groesse={38} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...n.halb, fontSize: 15.5, lineHeight: 21, color: B.text }} numberOfLines={2}>
                        {fr.text}
                      </Text>
                      <Text style={{ ...n.fett, fontSize: 12.5, color: ton.kante }}>
                        {themaVon(fr.thema).titel} · {fr.punkte} Punkte
                      </Text>
                    </View>
                    <Icon name="play-circle" size={28} color={ton.farbe} />
                  </Pressable>
                );
              })}
            </Kachel>
          ) : (
            <Text style={{ ...n.halb, fontSize: 15.5, color: B.text2 }}>Versuch es mit einem anderen Begriff, zum Beispiel „Kreisverkehr“ oder „Promille“.</Text>
          )}
        </View>
      ) : (
        <>
          {/* Stand */}
          <Kachel style={{ padding: 24, gap: 20 }}>
            <View style={{ flexDirection: "row", gap: 16, flexWrap: "wrap" }}>
              {[
                { wert: gesamt.richtig, titel: "sicher", ton: TOENE.gruen, icon: "checkmark-circle" as IconName },
                { wert: fehler, titel: "Fehler offen", ton: TOENE.rot, icon: "close-circle" as IconName },
                { wert: neu, titel: "noch neu", ton: TOENE.blau, icon: "sparkles" as IconName },
              ].map((w) => (
                <Pressable key={w.titel} onPress={() => router.push("/statistik")} style={(z: Zustand) => ({ flex: 1, minWidth: 160, flexDirection: "row", alignItems: "center", gap: 12, opacity: z.hovered ? 0.8 : 1 })}>
                  <Icon name={w.icon} size={32} color={w.ton.farbe} />
                  <View>
                    <Text style={{ ...n.schwarz, fontSize: 30, lineHeight: 34, color: B.text, fontVariant: ["tabular-nums"] }}>{w.wert}</Text>
                    <Text style={{ ...n.fett, fontSize: 13, color: w.ton.kante }}>{w.titel}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
            {/* Ein Balken, drei Farben: sicher – offen – neu */}
            <View style={{ flexDirection: "row", height: 10, borderRadius: 5, overflow: "hidden", backgroundColor: B.ton, gap: 3 }}>
              {gesamt.richtig ? <View style={{ flex: gesamt.richtig, backgroundColor: B.gruen }} /> : null}
              {fehler ? <View style={{ flex: fehler, backgroundColor: B.rot }} /> : null}
              {neu ? <View style={{ flex: neu, backgroundColor: B.blauHell }} /> : null}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <View style={{ flex: 1, minWidth: 220 }}>
                <Text style={{ ...n.schwarz, fontSize: 20, color: B.text }}>Smart lernen</Text>
                <Text style={{ ...n.halb, fontSize: 14.5, color: B.text2 }}>Die Fragen, die dich jetzt weiterbringen – Fehler und Neues gemischt.</Text>
              </View>
              <Knopf titel="Smart lernen" icon="sparkles" groesse="gross" onPress={() => router.push({ pathname: "/training", params: { modus: "smart" } })} />
            </View>
          </Kachel>

          {/* Lernmodi */}
          <View>
            <Abschnitt titel="Lernmodi" />
            <Raster min={240} abstand={12}>
              {modi.map((m) => (
                <Kachel key={m.titel} onPress={m.onPress} style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 14 }}>
                  <Symbol icon={m.icon} ton={m.ton} groesse={42} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ ...n.fett, fontSize: 15.5, color: B.text }} numberOfLines={1}>
                      {m.titel}
                    </Text>
                    <Text style={{ ...n.halb, fontSize: 13.5, color: B.text2 }} numberOfLines={1}>
                      {m.unter}
                    </Text>
                  </View>
                  {m.zahl ? (
                    <View style={{ minWidth: 24, height: 24, paddingHorizontal: 7, borderRadius: 12, backgroundColor: m.ton.hell, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ ...n.schwarz, fontSize: 12.5, color: m.ton.kante }}>{m.zahl > 99 ? "99+" : m.zahl}</Text>
                    </View>
                  ) : null}
                </Kachel>
              ))}
            </Raster>
          </View>

          {/* Themen */}
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
              <Text style={{ ...n.schwarz, fontSize: 20, color: B.text }}>Alle Themen</Text>
              <Reiter<Stufe> wert={stufe} onWechsel={setStufe} optionen={STUFEN.map((x) => ({ id: x.id, titel: x.titel }))} />
            </View>
            {stufe === "alle" ? (
              <Kachel onPress={() => router.push({ pathname: "/training", params: { modus: "alle" } })} style={{ paddingHorizontal: 18, paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 12 }}>
                <Symbol icon="layers" ton={TOENE.orange} groesse={42} />
                <View style={{ flex: 1, gap: 8 }}>
                  <Text style={{ ...n.schwarz, fontSize: 17, color: B.text }}>Gesamter Grundstoff · {FRAGEN.length} Fragen</Text>
                  <Balken anteil={gesamt.anteil} hoehe={8} />
                </View>
                <Text style={{ ...n.schwarz, fontSize: 16, color: B.orangeKante, fontVariant: ["tabular-nums"] }}>{Math.round(gesamt.anteil * 100)}%</Text>
              </Kachel>
            ) : null}
            <ThemenListe themen={themen} />
          </View>
        </>
      )}
      </Spalte>
    </WebSeite>
  );
}
