import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { Icon, type IconName } from "@/components/icon";
import { ProfilBild } from "@/components/profilbild";
import { Abschnitt, B, Chip, Kachel, Knopf, n, Raster, Spalte, Symbol, TOENE, zahlen, type Ton, type Zustand } from "@/components/web/bunt";
import { WebSeite } from "@/components/web/rahmen";
import { CLIPS } from "@/lib/clips";
import { useCrew } from "@/lib/crew";
import { FRAGEN_AKTIV } from "@/lib/funktionen";
import { ERFOLGE } from "@/lib/erfolge";
import { heuteDran } from "@/lib/karteikarten";
import { useKonto } from "@/lib/konto";
import { useProfilAktionen } from "@/lib/profil-aktionen";
import { tageBis, terminDatum } from "@/lib/pruefungstag";
import { ligaVon } from "@/lib/rangliste";
import { ALBUM } from "@/lib/schilder-jagd";
import { auswertung, fortschritt, lernzeitText, serieAktuell, tagVerschoben, useStand } from "@/lib/stand";

// Profil am PC: Kopf mit Bild, Name und Liga, vier große Zahlen, der Weg zum
// Führerschein als Strecke mit Stationen, Abzeichen als bunte Plaketten, die
// letzten sieben Tage und alles Weitere als Kacheln.

const ABZEICHEN_TOENE: Ton[] = [TOENE.orange, TOENE.blau, TOENE.gruen, TOENE.lila, TOENE.pink, TOENE.gelb, TOENE.tuerkis, TOENE.koralle, TOENE.indigo, TOENE.limette, TOENE.rot, TOENE.bernstein];
const WOCHENTAGE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export function ProfilWeb() {
  const { stand } = useStand();
  const { daten: crewDaten } = useCrew();
  const { profil, gast, anzeigeName, session } = useKonto();
  const { bildAendern, abmeldenFragen, abzeichenZeigen } = useProfilAktionen();

  const freigeschaltet = ERFOLGE.filter((e) => stand.erfolge[e.id]).length;
  const reife = fortschritt(stand).anteil;
  const serie = serieAktuell(stand);
  const liga = ligaVon(stand.xp);
  const gesamtZahlen = auswertung(stand, "gesamt");
  const bestanden = stand.pruefungen.filter((p) => p.bestanden).length;
  const letzteTage = Array.from({ length: 7 }, (_, i) => tagVerschoben(i - 6));
  const termin = terminDatum(stand.pruefungstermin);
  const tage = termin ? tageBis(termin) : null;
  const kartenDran = heuteDran(stand).gesamt;
  const schilder = ALBUM.filter((k) => stand.schilder[k]).length;

  const stationen = [
    { titel: "Start", unter: "erste Frage", erreicht: Object.keys(stand.fragen).length > 0 },
    { titel: "25 %", unter: "sicher", erreicht: reife >= 0.25 },
    { titel: "50 %", unter: "sicher", erreicht: reife >= 0.5 },
    { titel: "Simulation", unter: "bestanden", erreicht: bestanden > 0 },
    { titel: "Prüfungsreif", unter: "90 %", erreicht: reife >= 0.9 },
    { titel: "Prüfung", unter: termin && tage !== null && tage >= 0 ? termin.toLocaleDateString("de-DE", { day: "numeric", month: "short" }) : "Termin?", erreicht: false },
  ];
  const naechste = stationen.findIndex((s) => !s.erreicht);

  const unterzeile = [profil ? `@${profil.benutzername}` : gast ? "Gastmodus" : (session?.user.email ?? null), profil?.rolle === "fahrlehrer" ? "Fahrlehrer" : `Klasse ${stand.klasse}`, profil?.bundesland ?? null].filter(Boolean).join(" · ");

  const antworten = letzteTage.map((t) => stand.antwortenTage[t] ?? 0);
  const meisteAntworten = Math.max(1, ...antworten);

  const gemerkt = CLIPS.filter((c) => stand.clips.gemerkt.includes(c.id)).length;
  const mehrOhneFragen: { icon: IconName; titel: string; unter: string; ton: Ton; onPress: () => void }[] = [
    { icon: "camera", titel: "Schilder-Jagd", unter: schilder ? `${schilder} von ${ALBUM.length} gefunden` : "Schilder sammeln", ton: TOENE.blau, onPress: () => router.push("/schilder-jagd") },
    { icon: "bulb", titel: "Kurz erklärt", unter: gemerkt ? `${gemerkt} gemerkt` : "Regeln in 30 Sekunden", ton: TOENE.koralle, onPress: () => router.push("/kurz-erklaert") },
    { icon: "warning", titel: "Verkehrszeichen", unter: "Alle Zeichen erklärt", ton: TOENE.rot, onPress: () => router.push("/zeichen") },
    { icon: "calculator", titel: "Formeln", unter: "Anhalteweg & Co.", ton: TOENE.bernstein, onPress: () => router.push("/formeln") },
  ];
  const mehrMitFragen: { icon: IconName; titel: string; unter: string; ton: Ton; onPress: () => void }[] = [
    { icon: "stats-chart", titel: "Mein Fortschritt", unter: "Stärken & Schwächen", ton: TOENE.indigo, onPress: () => router.push("/statistik") },
    { icon: "albums", titel: "Karteikarten", unter: kartenDran ? `${kartenDran} heute dran` : "Fragen als Karten", ton: TOENE.tuerkis, onPress: () => router.push("/karteikarten") },
    { icon: "people", titel: "Meine Crew", unter: crewDaten?.crew ? `${crewDaten.crew.name} · Tag ${crewDaten.crew.flamme}` : "Gemeinsam lernen", ton: TOENE.koralle, onPress: () => router.push("/crew") },
    { icon: "camera", titel: "Schilder-Jagd", unter: schilder ? `${schilder} von ${ALBUM.length} gefunden` : "Schilder sammeln", ton: TOENE.blau, onPress: () => router.push("/schilder-jagd") },
    { icon: "heart", titel: "Favoriten", unter: "Gemerkte Fragen", ton: TOENE.pink, onPress: () => router.push("/favoriten") },
    { icon: "trophy", titel: "Liga & Duelle", unter: `${stand.duell.siege} Siege · Elo ${stand.duell.rating}`, ton: TOENE.gelb, onPress: () => router.push("/liga") },
  ];
  const mehr = FRAGEN_AKTIV ? mehrMitFragen : mehrOhneFragen;
  const werte: { icon: IconName; ton: Ton; wert: string; titel: string; onPress?: () => void }[] = FRAGEN_AKTIV
    ? [
        { icon: "flash", ton: TOENE.gelb, wert: zahlen(stand.xp), titel: "XP gesamt", onPress: () => router.push("/liga") },
        { icon: "flame", ton: TOENE.orange, wert: String(serie), titel: serie === 1 ? "Tag Serie" : "Tage Serie", onPress: () => router.push("/statistik") },
        { icon: "ribbon", ton: TOENE.lila, wert: `${freigeschaltet}/${ERFOLGE.length}`, titel: "Abzeichen" },
        { icon: "time", ton: TOENE.blau, wert: lernzeitText(gesamtZahlen.sekunden), titel: "Lernzeit", onPress: () => router.push("/statistik") },
      ]
    : [
        { icon: "camera", ton: TOENE.blau, wert: `${schilder}/${ALBUM.length}`, titel: "Schilder gefunden", onPress: () => router.push("/schilder-jagd") },
        { icon: "calendar", ton: TOENE.orange, wert: tage !== null && tage >= 0 ? String(tage) : "–", titel: tage === 1 ? "Tag bis zur Prüfung" : "Tage bis zur Prüfung", onPress: () => router.push("/pruefungstermin") },
        { icon: "bookmark", ton: TOENE.gelb, wert: String(gemerkt), titel: "Gemerkt", onPress: () => router.push("/kurz-erklaert") },
      ];

  return (
    <WebSeite ohneRechts>
      <Spalte>
      {/* Kopf */}
      <Kachel style={{ padding: 28, flexDirection: "row", alignItems: "center", gap: 26, flexWrap: "wrap" }}>
        <Pressable onPress={bildAendern} accessibilityLabel="Profilbild ändern" style={(z: Zustand) => ({ opacity: z.hovered ? 0.85 : 1 })}>
          <View style={{ padding: 4, borderRadius: 56, backgroundColor: B.flaeche, borderWidth: 2, borderColor: B.linie }}>
            <ProfilBild name={anzeigeName} groesse={96} rand={0} />
          </View>
          <View style={{ position: "absolute", right: 0, bottom: 2, width: 34, height: 34, borderRadius: 17, backgroundColor: B.lila, borderWidth: 3, borderColor: B.flaeche, alignItems: "center", justifyContent: "center" }}>
            <Icon name="camera" size={16} color="#FFFFFF" />
          </View>
        </Pressable>
        <View style={{ flex: 1, minWidth: 240, gap: 6 }}>
          <Text style={{ ...n.schwarz, fontSize: 30, lineHeight: 36, color: B.text }} numberOfLines={1}>
            {anzeigeName}
          </Text>
          <Text style={{ ...n.halb, fontSize: 15.5, color: B.text2 }}>{unterzeile}</Text>
          {FRAGEN_AKTIV ? (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
              <Chip icon="trophy" text={liga.name} ton={TOENE.lila} onPress={() => router.push("/liga")} />
            </View>
          ) : null}
        </View>
        <Knopf titel="Einstellungen" icon="settings" art="rand" ton="blau" onPress={() => router.push("/einstellungen")} />
      </Kachel>

      {!session ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, paddingLeft: 20, borderRadius: 16, backgroundColor: B.ton, flexWrap: "wrap" }}>
          <Icon name="cloud-upload-outline" size={22} color={B.text2} />
          <Text style={{ flex: 1, minWidth: 240, ...n.halb, fontSize: 15, color: B.text2 }}>
            {FRAGEN_AKTIV ? "Du lernst als Gast. Mit einem kostenlosen Konto ist dein Fortschritt gesichert – und Liga, Crew und Duelle gehen." : "Du schaust als Gast. Mit einem kostenlosen Konto kannst du liken, kommentieren und ein Profilbild zeigen."}
          </Text>
          <Knopf titel="Anmelden" art="rand" ton="blau" groesse="klein" onPress={() => router.push("/anmelden")} />
          <Knopf titel="Konto erstellen" ton="gruen" groesse="klein" onPress={() => router.push("/registrieren")} />
        </View>
      ) : null}

      {/* Große Zahlen */}
      <Raster min={150} max={4} abstand={16}>
        {werte.map((w) => (
          <Kachel key={w.titel} onPress={w.onPress} style={{ padding: 18, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Icon name={w.icon} size={28} color={w.ton.farbe} />
            <View style={{ flex: 1 }}>
              <Text style={{ ...n.schwarz, fontSize: 22, color: B.text, fontVariant: ["tabular-nums"] }} numberOfLines={1}>
                {w.wert}
              </Text>
              <Text style={{ ...n.halb, fontSize: 13, color: B.text2 }}>{w.titel}</Text>
            </View>
          </Kachel>
        ))}
      </Raster>

      {FRAGEN_AKTIV ? (
        <>
      {/* Weg zum Führerschein */}
      <View>
        <Abschnitt titel="Dein Weg zum Führerschein" link={reife >= 0.9 ? "Prüfungsreif!" : `Noch ${Math.max(1, Math.ceil((0.9 - reife) * 100))} % bis prüfungsreif`} />
        <Kachel onPress={() => router.push("/statistik")} style={{ paddingHorizontal: 28, paddingVertical: 26 }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            {stationen.map((s, i) => {
              const ist = i === naechste;
              const farbe = s.erreicht ? B.gruen : ist ? B.orange : B.ton;
              const kante = s.erreicht ? B.gruenKante : ist ? B.orangeKante : B.linie;
              return (
                <View key={s.titel} style={{ flex: 1, alignItems: "center", gap: 8 }}>
                  {/* Strecke zur nächsten Station */}
                  {i < stationen.length - 1 ? <View style={{ position: "absolute", top: 19, left: "50%", right: "-50%", height: 6, borderRadius: 3, backgroundColor: s.erreicht && stationen[i + 1].erreicht ? B.gruen : B.ton }} /> : null}
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: farbe, borderWidth: s.erreicht || ist ? 0 : 1.5, borderColor: kante, alignItems: "center", justifyContent: "center" }}>
                    <Icon name={s.erreicht ? "checkmark" : i === stationen.length - 1 ? "flag" : ist ? "car-sport" : "lock-closed"} size={22} color={s.erreicht || ist ? "#FFFFFF" : B.text3} />
                  </View>
                  <View style={{ alignItems: "center" }}>
                    <Text style={{ ...n.schwarz, fontSize: 14.5, color: s.erreicht || ist ? B.text : B.text3 }}>{s.titel}</Text>
                    <Text style={{ ...n.halb, fontSize: 12.5, color: B.text3 }}>{s.unter}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </Kachel>
      </View>

      {/* Abzeichen */}
      <View>
        <Abschnitt titel="Abzeichen" link={`${freigeschaltet} von ${ERFOLGE.length}`} />
        <Raster min={104} abstand={10}>
          {ERFOLGE.map((e, i) => {
            const erreicht = Boolean(stand.erfolge[e.id]);
            const ton = ABZEICHEN_TOENE[i % ABZEICHEN_TOENE.length];
            return (
              <Pressable key={e.id} onPress={() => abzeichenZeigen(e.id)} accessibilityLabel={e.titel} style={(z: Zustand) => ({ alignItems: "center", gap: 8, paddingVertical: 8, borderRadius: 16, backgroundColor: z.hovered ? B.ton : "transparent" })}>
                <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: erreicht ? ton.farbe : B.ton, alignItems: "center", justifyContent: "center" }}>
                  <Icon name={(erreicht ? e.icon : "lock-closed-outline") as IconName} size={24} color={erreicht ? "#FFFFFF" : B.text3} />
                </View>
                <Text style={{ ...n.fett, fontSize: 13, color: erreicht ? B.text : B.text3, textAlign: "center" }} numberOfLines={2}>
                  {e.titel}
                </Text>
              </Pressable>
            );
          })}
        </Raster>
      </View>

      {/* Letzte sieben Tage */}
      <View>
        <Abschnitt titel="Deine Woche" link="Statistik" onLink={() => router.push("/statistik")} />
        <Kachel style={{ padding: 24, gap: 14 }}>
          <View style={{ height: 150, flexDirection: "row", alignItems: "flex-end", gap: 14 }}>
            {letzteTage.map((t, i) => {
              const wert = antworten[i];
              const heute = i === 6;
              return (
                <View key={t} style={{ flex: 1, alignItems: "center", gap: 6 }}>
                  <Text style={{ ...n.schwarz, fontSize: 13, color: wert ? B.text : B.text3 }}>{wert}</Text>
                  <View style={{ width: "100%", maxWidth: 48, height: Math.max(8, (wert / meisteAntworten) * 110), borderRadius: 8, backgroundColor: wert ? (heute ? B.orange : B.gruen) : B.ton }} />
                  <Text style={{ ...n.fett, fontSize: 13, color: heute ? B.orange : B.text2 }}>{heute ? "Heute" : WOCHENTAGE[new Date(t).getDay()]}</Text>
                </View>
              );
            })}
          </View>
          <Text style={{ ...n.halb, fontSize: 13, color: B.text3 }}>
            Beantwortete Fragen je Tag · beste Serie {stand.besteSerie} {stand.besteSerie === 1 ? "Tag" : "Tage"} · {bestanden} von {stand.pruefungen.length} Simulationen bestanden
          </Text>
        </Kachel>
      </View>

        </>
      ) : null}

      {/* Mehr */}
      <View>
        <Abschnitt titel={FRAGEN_AKTIV ? "Mehr" : "Lernhilfen"} />
        <Raster min={220} abstand={16}>
          {mehr.map((m) => (
            <Kachel key={m.titel} onPress={m.onPress} style={{ padding: 18, flexDirection: "row", alignItems: "center", gap: 14 }}>
              <Symbol icon={m.icon} ton={m.ton} groesse={48} />
              <View style={{ flex: 1 }}>
                <Text style={{ ...n.schwarz, fontSize: 16, color: B.text }}>{m.titel}</Text>
                <Text style={{ ...n.halb, fontSize: 13, color: B.text2 }} numberOfLines={1}>
                  {m.unter}
                </Text>
              </View>
            </Kachel>
          ))}
        </Raster>
      </View>

      <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
        <Knopf titel="Premium" icon="diamond" art="rand" ton="orange" onPress={() => router.push("/premium")} />
        <Knopf titel="Bildnachweise" icon="images" art="rand" ton="blau" onPress={() => router.push("/bildnachweise")} />
        <Knopf titel="Impressum" icon="document-text" art="rand" ton="blau" onPress={() => router.push("/impressum")} />
        <Knopf titel="Datenschutz" icon="shield-checkmark" art="rand" ton="blau" onPress={() => router.push("/datenschutz")} />
        <Knopf titel="Nutzungsbedingungen" icon="reader" art="rand" ton="blau" onPress={() => router.push("/nutzungsbedingungen")} />
        <Knopf titel={gast ? "Gastmodus beenden" : "Abmelden"} icon="log-out" art="rand" ton="rot" onPress={abmeldenFragen} />
      </View>
      </Spalte>
    </WebSeite>
  );
}
