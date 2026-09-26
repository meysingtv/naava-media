import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Abschnitt, Avatar, Balken, Gruppe, KopfTaste, Segment, T, Zeile, type IconName } from "@/components/ui";
import { Ring } from "@/components/grafik";
import { INHALT_UNTEN } from "@/components/tab-leiste";
import { CLIPS } from "@/lib/clips";
import { ERFOLGE } from "@/lib/erfolge";
import { THEMEN, themaVon } from "@/lib/fragen";
import { tausender } from "@/lib/format";
import { tippen } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import { auswertung, fortschritt, lernzeitText, serieAktuell, useStand, xpHeute, type Zeitraum } from "@/lib/stand";
import { abstand, farben, quoteFarbe, RAND, schrift } from "@/lib/theme";

function Kachel({ icon, farbe, wert, label }: { icon: IconName; farbe: string; wert: string; label: string }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        gap: 3,
        paddingVertical: abstand(4),
        borderRadius: 18,
        backgroundColor: farben.flaeche,
        borderWidth: 1,
        borderColor: farben.linieStark,
      }}
    >
      <Ionicons name={icon} size={26} color={farbe} />
      <T v="zahl" style={{ fontSize: 24, lineHeight: 29, marginTop: 2 }} numberOfLines={1}>
        {wert}
      </T>
      <T v="klein" farbe={farben.text2} style={{ fontSize: 12.5 }} numberOfLines={1}>
        {label}
      </T>
    </View>
  );
}

const PUNKTE_LABEL: Record<Zeitraum, string> = { woche: "Punkte Woche", monat: "Punkte Monat", gesamt: "Punkte gesamt" };
const LEER_TEXT: Record<Zeitraum, string> = {
  woche: "In den letzten 7 Tagen hast du noch keine Fragen beantwortet.",
  monat: "In den letzten 30 Tagen hast du noch keine Fragen beantwortet.",
  gesamt: "Beantworte ein paar Fragen – dann siehst du hier, was schon sitzt.",
};

export default function MeinFortschritt() {
  const insets = useSafeAreaInsets();
  const { stand } = useStand();
  const { profil, gast, anzeigeName, abmelden, session } = useKonto();
  const [zeitraum, setZeitraum] = useState<Zeitraum>("woche");

  const gesamt = fortschritt(stand);
  const daten = auswertung(stand, zeitraum);
  const reihenfolge = new Map(THEMEN.map((t, i) => [t.id, i]));
  const themen = [...daten.themen].sort((a, b) => (reihenfolge.get(a.thema) ?? 0) - (reihenfolge.get(b.thema) ?? 0));
  const schwaechste = [...daten.themen].filter((t) => t.richtig + t.falsch >= 3).sort((a, b) => a.quote - b.quote)[0];
  const freigeschaltet = ERFOLGE.filter((e) => stand.erfolge[e.id]).length;
  const gemerkteClips = CLIPS.filter((c) => stand.clips.gemerkt.includes(c.id));

  function abmeldenFragen() {
    Alert.alert(
      gast ? "Gastmodus beenden?" : "Abmelden?",
      gast ? "Dein Fortschritt bleibt auf diesem Gerät gespeichert." : "Dein Fortschritt ist in deinem Konto gesichert.",
      [
        { text: "Abbrechen", style: "cancel" },
        { text: gast ? "Beenden" : "Abmelden", style: "destructive", onPress: () => abmelden() },
      ],
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <View style={{ paddingTop: insets.top + abstand(1.5), paddingHorizontal: RAND - 8 }}>
        <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View pointerEvents="none" style={{ position: "absolute", left: 56, right: 56, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <T v="h3" style={{ fontSize: 19 }}>
              Mein Fortschritt
            </T>
          </View>
          <KopfTaste icon="arrow-back" label="Zur Startseite" onPress={() => router.navigate("/heute")} />
          <KopfTaste icon="settings-outline" label="Einstellungen" onPress={() => router.push("/einstellungen")} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: abstand(2), paddingBottom: INHALT_UNTEN, gap: abstand(4) }}
        showsVerticalScrollIndicator={false}
      >
        <Segment<Zeitraum>
          wert={zeitraum}
          onWechsel={setZeitraum}
          optionen={[
            { id: "woche", titel: "Woche" },
            { id: "monat", titel: "Monat" },
            { id: "gesamt", titel: "Gesamt" },
          ]}
        />

        {/* Gesamtfortschritt */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: abstand(3),
            padding: abstand(5),
            borderRadius: 22,
            backgroundColor: farben.flaeche,
            borderWidth: 1,
            borderColor: farben.linieStark,
          }}
        >
          <View style={{ flex: 1, gap: abstand(1) }}>
            <T v="h3" style={{ fontSize: 17 }}>
              Gesamtfortschritt
            </T>
            <T v="display" style={{ fontSize: 46, lineHeight: 52, letterSpacing: -1.2 }}>
              {Math.round(gesamt.anteil * 100)}%
            </T>
            <View style={{ width: "92%", marginTop: abstand(1) }}>
              <Balken wert={gesamt.anteil} hoehe={9} />
            </View>
            <T v="textStark" farbe={farben.text2} style={{ fontSize: 14.5, fontFamily: schrift.textMittel, marginTop: abstand(1) }}>
              {gesamt.richtig} / {gesamt.gesamt} Fragen
            </T>
          </View>
          <Ring anteil={gesamt.anteil} groesse={100} dicke={8}>
            <Ionicons name="stats-chart" size={34} color={farben.orange} />
          </Ring>
        </View>

        {/* Kennzahlen */}
        <View style={{ flexDirection: "row", gap: abstand(2.5) }}>
          <Kachel icon="flame" farbe={farben.orange} wert={String(serieAktuell(stand))} label="Tages-Streak" />
          <Kachel icon="star" farbe={farben.gelb} wert={tausender(daten.xp)} label={PUNKTE_LABEL[zeitraum]} />
          <Kachel icon="stats-chart" farbe={farben.orange} wert={lernzeitText(daten.sekunden)} label="Lernzeit" />
        </View>
        {xpHeute(stand) > 0 ? (
          <T v="klein" zentriert style={{ marginTop: -abstand(1) }}>
            Heute: {tausender(xpHeute(stand))} Punkte
          </T>
        ) : null}

        {/* Stärken & Schwächen */}
        <View style={{ marginTop: abstand(2) }}>
          <T v="titel" style={{ fontSize: 22, marginBottom: abstand(3) }}>
            Stärken & Schwächen
          </T>
          <View style={{ padding: abstand(4), gap: abstand(3.5), borderRadius: 20, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie }}>
            {themen.length === 0 ? (
              <T v="text" zentriert style={{ paddingVertical: abstand(3) }}>
                {LEER_TEXT[zeitraum]}
              </T>
            ) : (
              themen.map((t) => (
                <Pressable
                  key={t.thema}
                  onPress={() => {
                    tippen();
                    router.push({ pathname: "/thema/[id]", params: { id: t.thema } });
                  }}
                  style={{ flexDirection: "row", alignItems: "center", gap: abstand(3) }}
                >
                  <T v="textStark" numberOfLines={1} style={{ width: "38%", fontFamily: schrift.textMittel, fontSize: 14.5 }}>
                    {themaVon(t.thema).titel}
                  </T>
                  <View style={{ flex: 1 }}>
                    <Balken wert={t.quote} farbe={quoteFarbe(t.quote)} hoehe={14} hintergrund={farben.flaeche3} />
                  </View>
                  <T v="textStark" numberOfLines={1} style={{ width: 50, textAlign: "right", fontSize: 14.5, fontVariant: ["tabular-nums"] }}>
                    {Math.round(t.quote * 100)}%
                  </T>
                </Pressable>
              ))
            )}
          </View>
        </View>

        {/* Tipp */}
        <View
          style={{
            flexDirection: "row",
            gap: abstand(3.5),
            padding: abstand(4),
            borderRadius: 20,
            backgroundColor: "#1D160F",
            borderWidth: 1,
            borderColor: "rgba(255,122,0,0.28)",
          }}
        >
          <View style={{ shadowColor: farben.gelb, shadowOpacity: 0.8, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } }}>
            <Ionicons name="bulb" size={34} color={farben.gelb} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <T v="h3" farbe={farben.orange} style={{ fontSize: 16 }}>
              Tipp
            </T>
            <T v="text" farbe={farben.text} style={{ fontSize: 14.5, lineHeight: 21 }}>
              {schwaechste && schwaechste.quote < 0.75
                ? `Übe gezielt ${themaVon(schwaechste.thema).titel} – dort liegt deine Erfolgsquote erst bei ${Math.round(schwaechste.quote * 100)} %.`
                : "Übe gezielt die Bereiche, in denen du noch schwächer bist, um deine Erfolgsquote zu erhöhen."}
            </T>
            {schwaechste && schwaechste.quote < 0.75 ? (
              <Pressable
                onPress={() => {
                  tippen();
                  router.push({ pathname: "/training", params: { modus: "thema", thema: schwaechste.thema } });
                }}
                hitSlop={8}
                style={{ marginTop: 4 }}
              >
                <T v="textStark" farbe={farben.orange} style={{ fontSize: 14 }}>
                  Jetzt üben →
                </T>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Profil */}
        <View style={{ marginTop: abstand(4) }}>
          <Abschnitt titel="Profil" />
          <View style={{ flexDirection: "row", alignItems: "center", gap: abstand(3.5), padding: abstand(4), borderRadius: 20, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie }}>
            <Avatar name={anzeigeName} groesse={56} />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="h3" numberOfLines={1}>
                {anzeigeName}
              </T>
              <T v="klein" numberOfLines={1}>
                {profil ? `@${profil.benutzername}` : gast ? "Gastmodus" : session?.user.email ?? ""} · Klasse {stand.klasse}
              </T>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <T v="h3" farbe={farben.orange}>
                {tausender(stand.xp)}
              </T>
              <T v="klein" style={{ fontSize: 12 }}>
                Punkte
              </T>
            </View>
          </View>
        </View>

        <View>
          <Abschnitt titel={`Abzeichen · ${freigeschaltet}/${ERFOLGE.length}`} klein />
          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: abstand(5), paddingVertical: abstand(4), borderRadius: 20, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie }}>
            {ERFOLGE.map((e) => {
              const hat = Boolean(stand.erfolge[e.id]);
              return (
                <Pressable
                  key={e.id}
                  onPress={() => {
                    tippen();
                    Alert.alert(e.titel, hat ? `${e.text}\nFreigeschaltet am ${stand.erfolge[e.id].split("-").reverse().join(".")}.` : e.text);
                  }}
                  style={{ width: "25%", alignItems: "center", gap: abstand(2) }}
                >
                  <View
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 27,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: hat ? farben.orangeSoft : farben.flaeche2,
                      borderWidth: 1.5,
                      borderColor: hat ? farben.orange : farben.linie,
                    }}
                  >
                    <Ionicons name={hat ? e.icon : "lock-closed"} size={hat ? 23 : 17} color={hat ? farben.orange : farben.text4} />
                  </View>
                  <T v="klein" zentriert numberOfLines={2} farbe={hat ? farben.text2 : farben.text4} style={{ fontSize: 11.5, lineHeight: 15, paddingHorizontal: 2 }}>
                    {e.titel}
                  </T>
                </Pressable>
              );
            })}
          </View>
        </View>

        {gemerkteClips.length > 0 ? (
          <View>
            <Abschnitt titel="Gemerkte Clips" klein />
            <Gruppe>
              {gemerkteClips.map((c) => (
                <Zeile
                  key={c.id}
                  icon="bookmark"
                  iconFarbe={farben.blau}
                  titel={c.titel}
                  titelZeilen={2}
                  unter={c.kategorie}
                  onPress={() => router.push({ pathname: "/clips", params: { start: c.id } })}
                />
              ))}
            </Gruppe>
          </View>
        ) : null}

        <Gruppe>
          <Zeile icon="play-circle-outline" titel="Clips – kurz erklärt" onPress={() => router.push("/clips")} />
          <Zeile icon="calculator-outline" titel="Formeln" unter="Anhalteweg & Co." onPress={() => router.push("/formeln")} />
          <Zeile icon="diamond-outline" iconFarbe={farben.orange} titel="Spur Plus" unter="Bald verfügbar" onPress={() => router.push("/premium")} />
          <Zeile icon="settings-outline" titel="Einstellungen & Konto" onPress={() => router.push("/einstellungen")} />
          <Zeile icon="log-out-outline" titel={gast ? "Gastmodus beenden" : "Abmelden"} gefahr ohnePfeil onPress={abmeldenFragen} />
        </Gruppe>
      </ScrollView>
    </View>
  );
}
