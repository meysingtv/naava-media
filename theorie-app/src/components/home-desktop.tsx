import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { CrewBereich } from "@/components/crew";
import { DesktopAbschnitt, DesktopKopf, DesktopSeite, dFlaeche, KopfKapsel, KopfRund, LUECKE, useDesktopBreite, type Zustand } from "@/components/desktop";
import { Glas } from "@/components/glas";
import { Ring } from "@/components/grafik";
import { FokusKarte, GRUSS, Handschrift, HELD_FOTO, PruefungKarte, ThemaPoster, ZitatKarte, type Tageszeit } from "@/components/home";
import { Icon, type IconName } from "@/components/icon";
import { useFarbwelt } from "@/lib/darstellung";
import type { ThemaId } from "@/lib/fragen";
import type { WochenTag } from "@/lib/stand";
import { leuchten, mitDeckkraft, schrift, verlauf } from "@/lib/theme";

// Startseite für den PC: oben Begrüßung, daneben Prüfungstermin und Glocke;
// darunter das Foto zur Tageszeit als große Karte mit Startknopf und rechts
// „Heute“ mit Tagesziel, Reife, Serie und Woche. Dann Schnellstart als
// Kacheln, Fokus neben der Prüfung, alle Themen als Raster und unten Crew und
// Spruch. Gleiche Fotos, Farben und Bausteine wie in der App.

export type DesktopZiel = { icon: IconName; titel: string; unter: string; farbe: string; zahl?: number; onPress: () => void };

export type HomeDaten = {
  zeit: Tageszeit;
  vorname: string;
  zeilen: string[];
  reife: number;
  sicher: number;
  fragenGesamt: number;
  serie: number;
  heute: number;
  ziel: number;
  rest: number;
  xpWoche: number;
  woche: WochenTag[];
  kommend: number | null;
  letzte: { bestanden: boolean; fehlerpunkte: number } | null;
  fokus: { id: ThemaId; anteil: number; offen: number };
  themen: { id: ThemaId; anteil: number }[];
  zitat: [string, string];
  glockePunkt: boolean;
  schnell: DesktopZiel[];
};

const FUELLEN = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;

function lernen(modus: string, thema?: string) {
  router.push({ pathname: "/training", params: thema ? { modus, thema } : { modus } });
}

/** Großes Foto zur Tageszeit mit Handschrift und den beiden wichtigsten Knöpfen. */
function HeldKarte({ d, hoehe }: { d: HomeDaten; hoehe: number }) {
  const fahrt = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(fahrt, { toValue: 1, duration: 20000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(fahrt, { toValue: 0, duration: 20000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [fahrt]);
  const scale = fahrt.interpolate({ inputRange: [0, 1], outputRange: [1.02, 1.1] });

  return (
    <View style={[{ flex: 1.75, minWidth: 520, height: hoehe, borderRadius: 30, overflow: "hidden", backgroundColor: "#0B0E12" }, leuchten("#1C140A", 0.18, 24, 10)]}>
      <Animated.Image source={HELD_FOTO[d.zeit]} resizeMode="cover" fadeDuration={0} style={{ ...FUELLEN, width: "100%", height: "100%", transform: [{ scale }] }} />
      <LinearGradient colors={["rgba(3,5,7,0.72)", "rgba(3,5,7,0.35)", "rgba(3,5,7,0)"]} locations={[0, 0.45, 0.8]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={FUELLEN} />
      <LinearGradient colors={["rgba(3,5,7,0)", "rgba(3,5,7,0.55)"]} locations={[0.45, 1]} style={FUELLEN} />

      <Handschrift zeilen={d.zeilen} style={{ position: "absolute", left: 36, top: 34 }} />

      <View style={{ position: "absolute", left: 36, right: 36, bottom: 32, gap: 18 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ ...schrift.titel, fontSize: 34, lineHeight: 40, letterSpacing: -0.6, color: "#FFFFFF" }}>{d.heute > 0 ? "Weiterlernen" : "Bereit für heute?"}</Text>
          <Text style={{ ...schrift.textMittel, fontSize: 16, color: "rgba(255,255,255,0.86)" }}>
            {d.rest > 0 ? `Noch ${d.rest} Fragen bis zu deinem Tagesziel` : "Tagesziel geschafft – jede Frage zählt extra"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
          <Pressable
            onPress={() => lernen("smart")}
            accessibilityRole="button"
            style={(z: Zustand) => [{ height: 54, paddingHorizontal: 26, borderRadius: 27, overflow: "hidden", flexDirection: "row", alignItems: "center", gap: 10, transform: [{ scale: z.pressed ? 0.98 : z.hovered ? 1.02 : 1 }] }, leuchten("#FC5B0E", z.hovered ? 0.6 : 0.45, 16, 6)]}
          >
            <LinearGradient colors={verlauf.knopf} locations={[0, 0.5, 1]} style={FUELLEN} />
            <Icon name="play" size={18} color="#FFFFFF" />
            <Text style={{ ...schrift.textFett, fontSize: 17, color: "#FFFFFF" }}>{d.heute > 0 ? "Jetzt weiterlernen" : "Lernen starten"}</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/pruefung")} accessibilityRole="button" style={(z: Zustand) => ({ transform: [{ scale: z.pressed ? 0.98 : z.hovered ? 1.02 : 1 }] })}>
            <Glas klar style={{ height: 54, paddingHorizontal: 22, borderRadius: 27, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Icon name="shield-checkmark" size={18} color="#FFFFFF" />
              <Text style={{ ...schrift.textHalb, fontSize: 16, color: "#FFFFFF" }}>Prüfung simulieren</Text>
            </Glas>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** „Heute“: Tagesziel als großer Ring, daneben Reife und Serie, unten die Woche. */
function HeuteKarte({ d, hoehe }: { d: HomeDaten; hoehe: number }) {
  const f = useFarbwelt();
  const geschafft = d.heute >= d.ziel;
  const spur = f.hell ? "rgba(20,23,27,0.07)" : "rgba(255,255,255,0.1)";
  const wert = (icon: IconName, farbe: string, zahl: string, text: string, onPress: () => void) => (
    <Pressable onPress={onPress} style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 18, backgroundColor: z.hovered ? (f.hell ? "#FAF7F2" : "rgba(255,255,255,0.05)") : f.hell ? "#FBFAF7" : "rgba(255,255,255,0.03)" })}>
      <View style={{ width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: mitDeckkraft(farbe, 0.14) }}>
        <Icon name={icon} size={19} color={farbe} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...schrift.titel, fontSize: 20, color: f.text, fontVariant: ["tabular-nums"] }}>{zahl}</Text>
        <Text style={{ ...schrift.textMittel, fontSize: 12.5, color: f.text3 }}>{text}</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={[{ flex: 1, minWidth: 340, height: hoehe, borderRadius: 30, padding: 26, gap: 18 }, dFlaeche(f)]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ ...schrift.titel, fontSize: 22, color: f.text }}>Heute</Text>
        <Pressable onPress={() => router.push("/statistik")} style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 4, height: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: z.hovered ? f.orangeSoft : "transparent" })}>
          <Text style={{ ...schrift.textHalb, fontSize: 13.5, color: f.orange }}>Statistik</Text>
          <Icon name="chevron-forward" size={14} color={f.orange} />
        </Pressable>
      </View>

      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 22 }}>
        <Pressable onPress={() => lernen("smart")} accessibilityLabel="Tagesziel">
          <Ring anteil={Math.min(1, d.heute / Math.max(1, d.ziel))} groesse={152} dicke={13} verlauf={geschafft ? undefined : verlauf.ring} farbe={geschafft ? f.gruen : undefined} spur={spur} leuchten>
            <View style={{ alignItems: "center" }}>
              <Text style={{ ...schrift.titel, fontSize: 38, lineHeight: 42, color: f.text, fontVariant: ["tabular-nums"] }}>{Math.min(d.heute, 999)}</Text>
              <Text style={{ ...schrift.textHalb, fontSize: 13, color: f.text3 }}>von {d.ziel} Fragen</Text>
            </View>
          </Ring>
        </Pressable>
        <View style={{ flex: 1, gap: 10 }}>
          {wert("ribbon", f.orange, `${Math.round(d.reife * 100)} %`, `prüfungsreif · ${d.sicher}/${d.fragenGesamt} sicher`, () => router.push("/statistik"))}
          {wert("flame", "#FF8A2A", `${d.serie}`, d.serie === 1 ? "Tag in Folge" : "Tage in Folge", () => router.push("/statistik"))}
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ ...schrift.textHalb, fontSize: 13, color: f.text2 }}>Diese Woche</Text>
          <Text style={{ ...schrift.textHalb, fontSize: 13, color: f.text3 }}>{d.xpWoche} XP</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {d.woche.map((t) => (
            <View key={t.kurz} style={{ flex: 1, alignItems: "center", gap: 6 }}>
              <View
                style={{
                  width: "100%",
                  height: 34,
                  borderRadius: 11,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: t.gelernt ? f.orange : f.hell ? "#F3EFE8" : "rgba(255,255,255,0.06)",
                  borderWidth: t.heute ? 2 : 0,
                  borderColor: t.gelernt ? mitDeckkraft("#FFFFFF", 0.5) : f.orange,
                  opacity: t.zukunft ? 0.5 : 1,
                }}
              >
                {t.gelernt ? <Icon name="checkmark" size={16} color="#FFFFFF" /> : null}
              </View>
              <Text style={{ ...schrift.textHalb, fontSize: 12, color: t.heute ? f.text : f.text3 }}>{t.kurz}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/** Schnellstart als Kachel mit Symbol, Titel, Unterzeile und Zahl. */
function ZielKachel({ z, breite }: { z: DesktopZiel; breite: number }) {
  const f = useFarbwelt();
  return (
    <Pressable
      onPress={z.onPress}
      accessibilityRole="button"
      accessibilityLabel={z.titel}
      style={(s: Zustand) => [{ width: breite, borderRadius: 22, padding: 18, gap: 14 }, dFlaeche(f, s.hovered), s.hovered ? { transform: [{ translateY: -2 }] } : null]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <LinearGradient colors={[mitDeckkraft(z.farbe, 0.95), mitDeckkraft(z.farbe, 0.72)]} style={{ width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }}>
          <Icon name={z.icon} size={20} color="#FFFFFF" />
        </LinearGradient>
        {z.zahl ? (
          <View style={{ minWidth: 26, height: 26, paddingHorizontal: 8, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: f.orange }}>
            <Text style={{ ...schrift.textFett, fontSize: 12.5, color: "#FFFFFF" }}>{z.zahl > 99 ? "99+" : z.zahl}</Text>
          </View>
        ) : null}
      </View>
      <View style={{ gap: 2 }}>
        <Text style={{ ...schrift.textFett, fontSize: 16, color: f.text }} numberOfLines={1}>
          {z.titel}
        </Text>
        <Text style={{ ...schrift.text, fontSize: 13, color: f.text3 }} numberOfLines={1}>
          {z.unter}
        </Text>
      </View>
    </Pressable>
  );
}

/** Zwölfte Kachel im Themenraster: alle Themen gemischt lernen. */
function AllesKachel({ breite, hoehe }: { breite: number; hoehe: number }) {
  return (
    <Pressable
      onPress={() => lernen("smart")}
      accessibilityRole="button"
      accessibilityLabel="Alle Themen gemischt lernen"
      style={(z: Zustand) => [{ width: breite, height: hoehe, borderRadius: 24, overflow: "hidden", transform: [{ scale: z.pressed ? 0.97 : z.hovered ? 1.015 : 1 }] }, leuchten("#FC5B0E", 0.35, 14, 6)]}
    >
      <LinearGradient colors={["#FE8A2C", "#FC5D0D", "#E9430A"]} style={FUELLEN} />
      <View style={{ position: "absolute", top: 12, left: 12, width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.22)" }}>
        <Icon name="shuffle" size={18} color="#FFFFFF" />
      </View>
      <View style={{ position: "absolute", left: 14, right: 14, bottom: 14, gap: 4 }}>
        <Text style={{ ...schrift.titelFett, fontSize: 16, lineHeight: 20, color: "#FFFFFF" }}>Alles gemischt</Text>
        <Text style={{ ...schrift.textMittel, fontSize: 12.5, color: "rgba(255,255,255,0.86)" }}>Smart aus allen Themen</Text>
      </View>
    </Pressable>
  );
}

export function HomeDesktop({ d }: { d: HomeDaten }) {
  const breite = useDesktopBreite();
  const zweiSpaltig = breite >= 1100;
  // Sechs Schnellziele: 6 oder 3 Spalten, damit keine Kachel allein steht.
  const kachelSpalten = breite >= 1100 ? 6 : 3;
  const kacheln = { zelle: Math.floor((breite - (kachelSpalten - 1) * 16) / kachelSpalten) };
  // 11 Themen + „Alles gemischt“: 6, 4 oder 3 Spalten gehen ohne Rest auf.
  const spalten = breite >= 1150 ? 6 : breite >= 760 ? 4 : 3;
  const poster = Math.floor((breite - (spalten - 1) * 16) / spalten);
  const posterHoehe = Math.min(260, Math.round(poster * 1.15));
  const heldHoehe = breite >= 1400 ? 420 : 380;
  const datum = new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  const termin = d.kommend === null ? "Prüfungstermin eintragen" : d.kommend === 0 ? "Heute ist Prüfung" : d.kommend === 1 ? "Morgen ist Prüfung" : `Noch ${d.kommend} Tage bis zur Prüfung`;

  return (
    <DesktopSeite>
      <DesktopKopf
        ueber={datum}
        titel={`${GRUSS[d.zeit]}, ${d.vorname}`}
        rechts={
          <>
            <KopfKapsel icon="calendar" text={termin} onPress={() => router.push("/pruefungstermin")} />
            <KopfRund icon="notifications-outline" label="Erinnerungen" punkt={d.glockePunkt} onPress={() => router.push("/einstellungen")} />
          </>
        }
      />

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: LUECKE }}>
        <HeldKarte d={d} hoehe={heldHoehe} />
        <HeuteKarte d={d} hoehe={heldHoehe} />
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
        {d.schnell.map((z) => (
          <ZielKachel key={z.titel} z={z} breite={kacheln.zelle} />
        ))}
      </View>

      <View style={{ flexDirection: zweiSpaltig ? "row" : "column", gap: LUECKE }}>
        <DesktopAbschnitt titel="Dein Fokus heute" style={{ flex: zweiSpaltig ? 1.75 : undefined }}>
          <FokusKarte thema={d.fokus.id} anteil={d.fokus.anteil} offen={d.fokus.offen} style={{ height: 260 }} onPress={() => lernen("thema", d.fokus.id)} />
        </DesktopAbschnitt>
        <DesktopAbschnitt titel="Deine Prüfung" style={{ flex: zweiSpaltig ? 1 : undefined }}>
          <PruefungKarte tage={d.kommend} letzte={d.letzte} style={{ height: 260 }} onPress={() => router.navigate("/pruefen")} onTermin={() => router.push("/pruefungstermin")} />
        </DesktopAbschnitt>
      </View>

      <DesktopAbschnitt titel="Deine Themen" link="Zum Lernbereich" onLink={() => router.navigate("/lernen")}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
          {d.themen.map((t) => (
            <ThemaPoster key={t.id} id={t.id} anteil={t.anteil} breite={poster} hoehe={posterHoehe} onPress={() => router.push({ pathname: "/thema/[id]", params: { id: t.id } })} />
          ))}
          <AllesKachel breite={poster} hoehe={posterHoehe} />
        </View>
      </DesktopAbschnitt>

      <View style={{ flexDirection: zweiSpaltig ? "row" : "column", gap: LUECKE, alignItems: zweiSpaltig ? "flex-start" : "stretch" }}>
        <View style={{ flex: zweiSpaltig ? 1 : undefined }}>
          <CrewBereich kopf={<DesktopAbschnitt titel="Deine Crew" link="Öffnen" onLink={() => router.push("/crew")} style={{ marginBottom: 14 }}>{null}</DesktopAbschnitt>} />
        </View>
        <DesktopAbschnitt titel="Spruch des Tages" style={{ flex: zweiSpaltig ? 1 : undefined }}>
          <ZitatKarte zeilen={d.zitat} style={{ height: 150 }} />
        </DesktopAbschnitt>
      </View>
    </DesktopSeite>
  );
}
