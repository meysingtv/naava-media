import { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Abschnitt, Avatar, Balken, Gruppe, KopfTaste, Saeulen, Segment, T, Zeile, kopfOben } from "@/components/ui";
import { Ring } from "@/components/grafik";
import { INHALT_UNTEN } from "@/components/tab-leiste";
import { CLIPS } from "@/lib/clips";
import { ERFOLGE } from "@/lib/erfolge";
import { THEMEN, themaVon, type ThemaId } from "@/lib/fragen";
import { tausender } from "@/lib/format";
import { tippen } from "@/lib/haptik";
import { useKonto } from "@/lib/konto";
import { auswertung, fortschritt, lernzeitText, serieAktuell, useStand, xpHeute, type Zeitraum } from "@/lib/stand";
import { abstand, farben, quoteFarbe, RAND, schrift } from "@/lib/theme";

function Kachel({ symbol, wert, label }: { symbol: React.ReactNode; wert: string; label: string }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        paddingVertical: 11,
        borderRadius: 14,
        backgroundColor: farben.flaeche,
        borderWidth: 1,
        borderColor: farben.linieStark,
      }}
    >
      <View style={{ height: 26, justifyContent: "center" }}>{symbol}</View>
      <T v="zahl" style={{ fontSize: 22, lineHeight: 27, marginTop: 3 }} numberOfLines={1}>
        {wert}
      </T>
      <T v="klein" farbe={farben.text2} style={{ fontSize: 12.5, lineHeight: 16 }} numberOfLines={1}>
        {label}
      </T>
    </View>
  );
}

/** Diese Bereiche stehen immer da – in der Reihenfolge der Vorlage. */
const HAUPTBEREICHE: ThemaId[] = ["zeichen", "vorfahrt", "gefahren", "umwelt", "technik", "manoever"];

/** Glühbirne mit weichem Lichtschein. */
function Gluehbirne() {
  return (
    <View style={{ width: 36, height: 40, alignItems: "center", justifyContent: "center" }}>
      <Svg width={56} height={56} style={{ position: "absolute", left: -10, top: -8 }}>
        <Defs>
          <RadialGradient id="schein" cx="50%" cy="45%" r="50%">
            <Stop offset="0" stopColor={farben.gelb} stopOpacity={0.32} />
            <Stop offset="1" stopColor={farben.gelb} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={28} cy={26} r={26} fill="url(#schein)" />
      </Svg>
      <Ionicons name="bulb" size={32} color={farben.gelb} />
    </View>
  );
}

export default function MeinFortschritt() {
  const insets = useSafeAreaInsets();
  const { stand } = useStand();
  const { profil, gast, anzeigeName, abmelden, session } = useKonto();
  const [zeitraum, setZeitraum] = useState<Zeitraum>("woche");

  const gesamt = fortschritt(stand);
  const daten = auswertung(stand, zeitraum);
  const quoten = new Map(daten.themen.map((t) => [t.thema, t.quote]));
  const weitere = THEMEN.map((t) => t.id).filter((id) => !HAUPTBEREICHE.includes(id) && quoten.has(id));
  const zeilen = [...HAUPTBEREICHE, ...weitere].map((thema) => ({ thema, quote: quoten.get(thema) ?? 0 }));
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
      <View style={{ paddingTop: kopfOben(insets.top), paddingHorizontal: RAND - 8, paddingBottom: abstand(1) }}>
        <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View pointerEvents="none" style={{ position: "absolute", left: 56, right: 56, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <T v="h3" style={{ fontSize: 19 }}>
              Mein Fortschritt
            </T>
          </View>
          <KopfTaste icon="arrow-back" label="Zur Startseite" onPress={() => router.navigate("/heute")} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: abstand(1), paddingBottom: INHALT_UNTEN, gap: 10 }}
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
            paddingVertical: 14,
            paddingHorizontal: 16,
            borderRadius: 16,
            backgroundColor: farben.flaeche,
            borderWidth: 1,
            borderColor: farben.linieStark,
          }}
        >
          <View style={{ flex: 1 }}>
            <T v="h3" style={{ fontSize: 16, lineHeight: 20, ...schrift.textHalb }}>
              Gesamtfortschritt
            </T>
            <T v="display" style={{ fontSize: 38, lineHeight: 45, letterSpacing: -0.8 }}>
              {Math.round(gesamt.anteil * 100)}%
            </T>
            <View style={{ width: "90%", marginTop: 4 }}>
              <Balken wert={gesamt.anteil} hoehe={8} />
            </View>
            <T v="textStark" farbe={farben.text} style={{ fontSize: 15, lineHeight: 19, ...schrift.textMittel, marginTop: 10 }}>
              {gesamt.richtig} / {gesamt.gesamt} Fragen
            </T>
          </View>
          <Ring anteil={gesamt.anteil} groesse={76} dicke={7}>
            <Saeulen groesse={28} />
          </Ring>
        </View>

        {/* Kennzahlen */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Kachel symbol={<MaterialCommunityIcons name="fire" size={26} color={farben.orange} />} wert={String(serieAktuell(stand))} label="Tages-Streak" />
          <Kachel symbol={<Ionicons name="star" size={24} color={farben.gelb} />} wert={tausender(xpHeute(stand))} label="Punkte heute" />
          <Kachel symbol={<Saeulen groesse={22} />} wert={lernzeitText(daten.sekunden)} label="Lernzeit" />
        </View>

        {/* Stärken & Schwächen */}
        <View style={{ marginTop: 4 }}>
          <T v="titel" style={{ fontSize: 20, lineHeight: 25, marginBottom: 10 }}>
            Stärken & Schwächen
          </T>
          <View style={{ paddingVertical: 14, paddingHorizontal: 14, gap: 13, borderRadius: 16, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie }}>
            {zeilen.map((t) => (
              <Pressable
                key={t.thema}
                onPress={() => {
                  tippen();
                  router.push({ pathname: "/thema/[id]", params: { id: t.thema } });
                }}
                style={{ flexDirection: "row", alignItems: "center", gap: abstand(3) }}
              >
                <T v="textStark" numberOfLines={1} style={{ width: "43%", ...schrift.text, fontSize: 14, lineHeight: 18 }}>
                  {themaVon(t.thema).titel}
                </T>
                <View style={{ flex: 1 }}>
                  <Balken wert={t.quote} farbe={quoteFarbe(t.quote)} hoehe={12} hintergrund={farben.flaeche3} />
                </View>
                <T v="textStark" numberOfLines={1} style={{ width: 40, textAlign: "right", ...schrift.textMittel, fontSize: 14, lineHeight: 18, fontVariant: ["tabular-nums"] }}>
                  {Math.round(t.quote * 100)}%
                </T>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Tipp */}
        <Pressable
          disabled={!schwaechste || schwaechste.quote >= 0.75}
          onPress={() => {
            if (!schwaechste) return;
            tippen();
            router.push({ pathname: "/training", params: { modus: "thema", thema: schwaechste.thema } });
          }}
          style={({ pressed }) => ({
            flexDirection: "row",
            gap: 12,
            padding: 14,
            borderRadius: 14,
            backgroundColor: "#1D160F",
            borderWidth: 1,
            borderColor: "rgba(255,122,0,0.28)",
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Gluehbirne />
          <View style={{ flex: 1, gap: 2 }}>
            <T v="h3" farbe={farben.orange} style={{ fontSize: 16, lineHeight: 20, ...schrift.textHalb }}>
              Tipp
            </T>
            <T v="text" farbe={farben.text} style={{ fontSize: 14, lineHeight: 19 }}>
              {schwaechste && schwaechste.quote < 0.75
                ? `Übe gezielt ${themaVon(schwaechste.thema).titel} – dort liegt deine Erfolgsquote erst bei ${Math.round(schwaechste.quote * 100)} %.`
                : "Übe gezielt die Bereiche, in denen du noch schwächer bist, um deine Erfolgsquote zu erhöhen."}
            </T>
          </View>
        </Pressable>

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
