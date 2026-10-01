import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, RefreshControl, ScrollView, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import { Stempel } from "@/components/auswertung";
import { EreignisZeile } from "@/components/crew";
import { dialog } from "@/components/dialog";
import { KopfPille } from "@/components/frage-rahmen";
import { Glas } from "@/components/glas";
import { DekoSvg, Ring } from "@/components/grafik";
import { StartKnopf } from "@/components/home";
import { Icon } from "@/components/icon";
import { NutzerBild } from "@/components/profilbild";
import { Seite } from "@/components/seite";
import { Gruppe, kartenFlaeche, Kopf, kopfOben, KopfTaste, zurueck, type IconName } from "@/components/ui";
import { bossVon, HEILUNG_FALSCH, SCHADEN_RICHTIG, useCrew, XP_TRUHE, type CrewBoss, type CrewEreignis, type CrewMitglied } from "@/lib/crew";
import { useDarstellung, useFarbwelt } from "@/lib/darstellung";
import { themaFoto } from "@/lib/fotos";
import { themaVon } from "@/lib/fragen";
import { erfolg } from "@/lib/haptik";
import { abstand, leuchten, mitDeckkraft, RAND, schrift, verlauf } from "@/lib/theme";

// Wochen-Boss als Arena: oben der Boss im Lebensring vor dem Foto seines
// Themas, darunter was bis zum Sieg fehlt, wer wie viel Schaden gemacht hat,
// der Kampfverlauf live und die Belohnung.

const FUELLEN = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;

function restZeit(bis: string): string {
  const ende = new Date(`${bis}T00:00:00`);
  const ms = ende.getTime() - Date.now();
  if (ms <= 0) return "endet gleich";
  const tage = Math.floor(ms / 86400000);
  const std = Math.floor((ms % 86400000) / 3600000);
  if (tage >= 1) return `noch ${tage} ${tage === 1 ? "Tag" : "Tage"}`;
  return `noch ${std} Std.`;
}

/** Kalenderwoche (ISO) eines Datums wie „2026-09-28“. */
function kalenderwoche(tag: string): number {
  const d = new Date(`${tag}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const jahresbeginn = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - jahresbeginn.getTime()) / 86400000 + 1) / 7);
}

type Kaempfer = { m: CrewMitglied; schaden: number };

/**
 * Schaden je Mitglied in dieser Woche. Neuere Server liefern ihn mit; sonst
 * wird er aus den geladenen Ereignissen (höchstens 30) zusammengezählt – reichen
 * die nicht bis zum Wochenbeginn, ist die Liste nicht vollständig (`genau`).
 */
function schadenListe(mitglieder: CrewMitglied[], ereignisse: CrewEreignis[], seit: number): { liste: Kaempfer[]; genau: boolean } {
  const vomServer = mitglieder.length > 0 && mitglieder.every((m) => typeof m.schaden === "number");
  const summe = new Map<string, number>();
  let aeltestes = Infinity;
  for (const e of ereignisse) {
    const zeit = new Date(e.zeit).getTime();
    aeltestes = Math.min(aeltestes, zeit);
    if (!vomServer && e.art === "treffer" && e.user_id && zeit >= seit) summe.set(e.user_id, (summe.get(e.user_id) ?? 0) + e.wert);
  }
  const liste = mitglieder
    .map((m) => ({ m, schaden: vomServer ? (m.schaden ?? 0) : (summe.get(m.id) ?? 0) }))
    .sort((a, b) => b.schaden - a.schaden);
  return { liste, genau: vomServer || ereignisse.length < 30 || aeltestes < seit };
}

// ---------------------------------------------------------------------------
// Arena oben
// ---------------------------------------------------------------------------

/** Boss im Lebensring: Glut dahinter, dunkle (hell: weiße) Scheibe, unten die HP. */
function BossMedaillon({ emoji, hp, max, besiegt }: { emoji: string; hp: number; max: number; besiegt: boolean }) {
  const f = useFarbwelt();
  const atem = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (besiegt) return;
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(atem, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(atem, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [atem, besiegt]);

  const groesse = 208;
  const dicke = 10;
  const scheibe = groesse - dicke * 2 - 20;
  const glut = besiegt ? "#4ED053" : "#FF4A14";
  const schein = Math.round(groesse * 1.9);

  return (
    <View style={{ width: groesse, height: groesse, alignItems: "center", justifyContent: "center" }}>
      <DekoSvg width={schein} height={schein} style={{ position: "absolute", left: (groesse - schein) / 2, top: (groesse - schein) / 2 }}>
        <Defs>
          <RadialGradient id="boss-glut" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={glut} stopOpacity={f.hell ? 0.45 : 0.8} />
            <Stop offset="0.5" stopColor={glut} stopOpacity={f.hell ? 0.16 : 0.3} />
            <Stop offset="1" stopColor={glut} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={schein / 2} cy={schein / 2} r={schein / 2} fill="url(#boss-glut)" />
      </DekoSvg>
      <Ring
        anteil={besiegt ? 1 : max > 0 ? hp / max : 0}
        groesse={groesse}
        dicke={dicke}
        verlauf={besiegt ? ["#7EE283", "#23A548"] : ["#FFA24A", "#F0281A"]}
        spur={f.hell ? "rgba(20,23,27,0.1)" : "rgba(255,255,255,0.13)"}
        leuchten
      >
        <View
          style={{
            width: scheibe,
            height: scheibe,
            borderRadius: scheibe / 2,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: f.hell ? "rgba(242,84,10,0.18)" : "rgba(255,140,70,0.28)",
          }}
        >
          <Svg width={scheibe} height={scheibe} style={{ position: "absolute" }}>
            <Defs>
              <RadialGradient id="boss-scheibe" cx="50%" cy="42%" r="62%">
                <Stop offset="0" stopColor={f.hell ? "#FFFFFF" : besiegt ? "#12301A" : "#4A180A"} />
                <Stop offset="1" stopColor={f.hell ? "#F6E4D6" : "#0B0706"} />
              </RadialGradient>
            </Defs>
            <Circle cx={scheibe / 2} cy={scheibe / 2} r={scheibe / 2} fill="url(#boss-scheibe)" />
          </Svg>
          <Animated.Text
            style={{
              fontSize: Math.round(scheibe * 0.5),
              lineHeight: Math.round(scheibe * 0.64),
              opacity: besiegt ? 0.45 : 1,
              transform: [
                { translateY: atem.interpolate({ inputRange: [0, 1], outputRange: [3, -3] }) },
                { scale: atem.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) },
                { rotate: besiegt ? "-14deg" : "0deg" },
              ],
            }}
          >
            {emoji}
          </Animated.Text>
        </View>
      </Ring>
      {besiegt ? <Stempel bestanden text="BESIEGT" style={{ position: "absolute" }} /> : null}
      <HpPille hp={hp} max={max} besiegt={besiegt} style={{ position: "absolute", bottom: -16 }} />
    </View>
  );
}

function HpPille({ hp, max, besiegt, style }: { hp: number; max: number; besiegt: boolean; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  const gruen = f.hell ? "#23A548" : "#4ED053";
  const rot = f.hell ? "#E5392C" : "#FF4A3D";
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          height: 32,
          paddingHorizontal: 13,
          borderRadius: 16,
          backgroundColor: f.hell ? "#FFFFFF" : "rgba(16,10,8,0.94)",
          borderWidth: 1,
          borderColor: besiegt ? mitDeckkraft(gruen, 0.5) : f.hell ? "rgba(229,57,44,0.2)" : "rgba(255,98,50,0.5)",
        },
        f.hell ? leuchten("#3C2C18", 0.12, 10, 3) : leuchten(besiegt ? gruen : "#FF4A14", 0.35, 10, 0),
        style,
      ]}
    >
      <Icon name={besiegt ? "checkmark-circle" : "heart"} size={15} color={besiegt ? gruen : rot} />
      {besiegt ? (
        <Text style={{ ...schrift.textFett, fontSize: 14, color: gruen }}>0 HP</Text>
      ) : (
        <Text style={{ ...schrift.titel, fontSize: 15, color: f.text, fontVariant: ["tabular-nums"] }}>
          {hp}
          <Text style={{ ...schrift.textHalb, fontSize: 13, color: f.text3 }}> / {max} HP</Text>
        </Text>
      )}
    </View>
  );
}

function ZeitPille({ text, besiegt }: { text: string; besiegt: boolean }) {
  const f = useFarbwelt();
  return (
    <Glas hell={f.hell} style={[{ height: 42, borderRadius: 21, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 7 }, f.hell ? leuchten("#3C2C18", 0.08, 8, 2) : null]}>
      <Icon name={besiegt ? "calendar-outline" : "hourglass-outline"} size={15} color={f.orange} />
      <Text style={{ ...schrift.textHalb, fontSize: 14, color: f.text, fontVariant: ["tabular-nums"] }}>{text}</Text>
    </Glas>
  );
}

/** Foto des Themas über die ganze Breite, fährt langsam heran und läuft unten in den Grund aus. */
function BossArena({ boss }: { boss: CrewBoss }) {
  const f = useFarbwelt();
  const insets = useSafeAreaInsets();
  const fahrt = useRef(new Animated.Value(0)).current;
  const b = bossVon(boss.thema);
  const gruen = f.hell ? "#23A548" : "#4ED053";

  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(fahrt, { toValue: 1, duration: 16000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(fahrt, { toValue: 0, duration: 16000, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [fahrt]);

  const grund = (a: number) => mitDeckkraft(f.grund, a);
  const oben = kopfOben(insets.top);

  return (
    <View style={{ overflow: "hidden", backgroundColor: f.grund }}>
      <Animated.Image
        source={themaFoto(boss.thema)}
        resizeMode="cover"
        fadeDuration={0}
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", transform: [{ scale: fahrt.interpolate({ inputRange: [0, 1], outputRange: [1.05, 1.14] }) }] }}
      />
      <View style={[FUELLEN, { backgroundColor: f.hell ? "rgba(244,241,236,0.16)" : "rgba(3,5,7,0.5)" }]} />
      <LinearGradient colors={[grund(f.hell ? 0.8 : 0.75), grund(0)]} locations={[0, 0.28]} style={FUELLEN} />
      <LinearGradient colors={[grund(0), grund(0.62), grund(0.93), f.grund]} locations={[0.36, 0.6, 0.8, 1]} style={[FUELLEN, { bottom: -1 }]} />

      <View style={{ alignItems: "center", paddingTop: oben + 42 + abstand(4), paddingBottom: abstand(5), paddingHorizontal: RAND }}>
        <BossMedaillon emoji={b.emoji} hp={boss.hp} max={boss.hp_max} besiegt={boss.besiegt} />
        <Text style={{ ...schrift.textFett, fontSize: 12, letterSpacing: 1.6, color: boss.besiegt ? gruen : f.orange, marginTop: 36 }}>
          WOCHEN-BOSS · KW {kalenderwoche(boss.woche)}
        </Text>
        <Text
          style={{ ...schrift.titel, fontSize: 32, lineHeight: 38, letterSpacing: -0.5, color: f.text, marginTop: 4, textAlign: "center" }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {b.name}
        </Text>
        <View style={{ marginTop: 10, flexDirection: "row" }}>
          <KopfPille bild={themaFoto(boss.thema)} text={themaVon(boss.thema).titel} />
        </View>
      </View>

      {/* Knöpfe zuletzt, damit die Glut sie nicht überdeckt */}
      <View style={{ position: "absolute", top: oben, left: RAND, right: RAND, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <KopfTaste icon="chevron-back" label="Zurück" onPress={zurueck} />
        <ZeitPille text={boss.besiegt ? "Neuer Boss am Montag" : restZeit(boss.bis)} besiegt={boss.besiegt} />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Angriff, Sieg, Belohnung
// ---------------------------------------------------------------------------

function Regel({ icon, farbe, titel, wert }: { icon: IconName; farbe: string; titel: string; wert: string }) {
  const f = useFarbwelt();
  return (
    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 9, height: 46, paddingHorizontal: 11, borderRadius: 15, backgroundColor: mitDeckkraft(farbe, f.hell ? 0.08 : 0.11) }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: farbe, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} size={14} color="#FFFFFF" weight="bold" />
      </View>
      <Text style={{ ...schrift.textHalb, fontSize: 13.5, color: f.text2, flex: 1 }} numberOfLines={1}>
        {titel}
      </Text>
      <Text style={{ ...schrift.titelFett, fontSize: 14, color: farbe, fontVariant: ["tabular-nums"] }}>{wert}</Text>
    </View>
  );
}

/** Was bis zum Sieg fehlt und wie Treffer zählen. */
function AngriffsKarte({ hp }: { hp: number }) {
  const f = useFarbwelt();
  const gruen = f.hell ? "#23A548" : "#4ED053";
  const rot = f.hell ? "#E5392C" : "#FF4A3D";
  const fehlen = Math.ceil(hp / SCHADEN_RICHTIG);
  return (
    <View style={[{ borderRadius: 24, padding: 16, gap: 16 }, kartenFlaeche(f)]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={[{ borderRadius: 17 }, leuchten(f.orange, f.hell ? 0.28 : 0.4, 10, 3)]}>
          <LinearGradient colors={verlauf.knopf} locations={[0, 0.5, 1]} style={{ width: 54, height: 54, borderRadius: 17, alignItems: "center", justifyContent: "center" }}>
            <Icon name="flash" size={26} color="#FFFFFF" />
          </LinearGradient>
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ ...schrift.titel, fontSize: 30, lineHeight: 35, letterSpacing: -0.6, color: f.text, fontVariant: ["tabular-nums"] }}>
            {fehlen}
            <Text style={{ ...schrift.titelFett, fontSize: 17, letterSpacing: -0.1 }}> {fehlen === 1 ? "richtige Antwort" : "richtige Antworten"}</Text>
          </Text>
          <Text style={{ ...schrift.textMittel, fontSize: 13.5, color: f.text3 }}>fehlen euch noch bis zum Sieg</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Regel icon="checkmark" farbe={gruen} titel="Richtig" wert={`−${SCHADEN_RICHTIG} HP`} />
        <Regel icon="close" farbe={rot} titel="Falsch" wert={`+${HEILUNG_FALSCH} HP`} />
      </View>
    </View>
  );
}

function SiegKarte({ titel, text }: { titel: string; text: string }) {
  const f = useFarbwelt();
  const gruen = f.hell ? "#23A548" : "#4ED053";
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 24 }, kartenFlaeche(f), { borderWidth: 1, borderColor: mitDeckkraft(gruen, 0.45) }]}>
      <View style={[{ borderRadius: 27 }, leuchten(gruen, f.hell ? 0.3 : 0.45, 12, 2)]}>
        <LinearGradient colors={["#7EE283", "#23A548"]} style={{ width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" }}>
          <Icon name="trophy" size={25} color="#FFFFFF" />
        </LinearGradient>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ ...schrift.titelFett, fontSize: 17, color: f.text }}>{titel}</Text>
        <Text style={{ ...schrift.text, fontSize: 13.5, lineHeight: 18, color: f.text2 }}>{text}</Text>
      </View>
    </View>
  );
}

function BelohnungKarte({ mitXp }: { mitXp: boolean }) {
  const f = useFarbwelt();
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 24 }, kartenFlaeche(f)]}>
      <View style={[{ borderRadius: 30 }, leuchten("#F59E0B", f.hell ? 0.3 : 0.45, 14, 2)]}>
        <LinearGradient colors={["#FFD978", "#F59E0B", "#E07A06"]} style={{ width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" }}>
          <Icon name="trophy" size={28} color="#FFFFFF" />
        </LinearGradient>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ ...schrift.textFett, fontSize: 11.5, letterSpacing: 1.2, color: f.text3 }}>BELOHNUNG BEI SIEG</Text>
        <Text style={{ ...schrift.titelFett, fontSize: 16.5, color: f.text }}>Abzeichen „Bossbezwinger“</Text>
        {mitXp ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Icon name="gift" size={14} color={f.orange} />
            <Text style={{ ...schrift.textHalb, fontSize: 13.5, color: f.orange }}>+{XP_TRUHE} XP-Truhe für alle</Text>
          </View>
        ) : (
          <Text style={{ ...schrift.text, fontSize: 13.5, color: f.text3 }}>Für alle in der Crew</Text>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Rangliste und Kampfverlauf
// ---------------------------------------------------------------------------

const MEDAILLE: Record<number, { farben: [string, string]; text: string }> = {
  1: { farben: ["#FFD978", "#F2A516"], text: "#5C3A00" },
  2: { farben: ["#F1F3F6", "#AEB7C1"], text: "#3D4650" },
  3: { farben: ["#F4BE8C", "#C9763D"], text: "#FFFFFF" },
};

function RangMarke({ rang }: { rang: number }) {
  const f = useFarbwelt();
  const m = MEDAILLE[rang];
  if (m)
    return (
      <LinearGradient colors={m.farben} style={{ width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ ...schrift.titel, fontSize: 13, color: m.text }}>{rang}</Text>
      </LinearGradient>
    );
  return (
    <View style={{ width: 26, alignItems: "center" }}>
      <Text style={{ ...schrift.textFett, fontSize: 13.5, color: f.text3 }}>{rang > 0 ? rang : "–"}</Text>
    </View>
  );
}

function KaempferZeile({ k, rang, max }: { k: Kaempfer; rang: number; max: number }) {
  const f = useFarbwelt();
  const rot = f.hell ? "#E5392C" : "#FF4A3D";
  const aktiv = k.schaden > 0;
  const anteil = aktiv && max > 0 ? k.schaden / max : 0;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: k.m.ich ? (f.hell ? "rgba(242,84,10,0.05)" : "rgba(252,91,14,0.07)") : undefined,
      }}
    >
      <RangMarke rang={aktiv ? rang : 0} />
      <View style={{ opacity: aktiv ? 1 : 0.55 }}>
        <NutzerBild pfad={k.m.bild} name={k.m.name} farbe={k.m.farbe} groesse={40} />
      </View>
      <View style={{ flex: 1, gap: 7 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <Text style={{ ...schrift.textHalb, fontSize: 15.5, color: f.text, flexShrink: 1 }} numberOfLines={1}>
            {k.m.ich ? "Du" : k.m.name}
          </Text>
          {rang === 1 && aktiv ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3, height: 19, paddingHorizontal: 6, borderRadius: 10, backgroundColor: f.orangeSoft }}>
              <Icon name="flame" size={11} color={f.orange} />
              <Text style={{ ...schrift.textFett, fontSize: 10.5, letterSpacing: 0.6, color: f.orange }}>MVP</Text>
            </View>
          ) : null}
        </View>
        {aktiv ? (
          <View style={{ height: 6, borderRadius: 3, backgroundColor: f.hell ? "rgba(20,23,27,0.07)" : "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <LinearGradient colors={verlauf.chip} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ width: `${Math.max(6, anteil * 100)}%`, height: "100%", borderRadius: 3 }} />
          </View>
        ) : (
          <Text style={{ ...schrift.text, fontSize: 12.5, color: k.schaden < 0 ? rot : f.text3 }}>{k.schaden < 0 ? "Hat den Boss geheilt" : "Noch kein Treffer"}</Text>
        )}
      </View>
      <Text style={{ ...schrift.titelFett, fontSize: 15, minWidth: 60, textAlign: "right", color: aktiv ? f.text : k.schaden < 0 ? rot : f.text3, fontVariant: ["tabular-nums"] }}>
        {k.schaden > 0 ? `−${k.schaden}` : k.schaden < 0 ? `+${-k.schaden}` : "0"} HP
      </Text>
    </View>
  );
}

function LivePille() {
  const f = useFarbwelt();
  const rot = f.hell ? "#E5392C" : "#FF4A3D";
  const puls = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(puls, { toValue: 0.25, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(puls, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [puls]);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: mitDeckkraft(rot, f.hell ? 0.1 : 0.14) }}>
      <Animated.View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: rot, opacity: puls }} />
      <Text style={{ ...schrift.textFett, fontSize: 11.5, letterSpacing: 1, color: rot }}>LIVE</Text>
    </View>
  );
}

function Ueberschrift({ titel, rechts }: { titel: string; rechts?: ReactNode }) {
  const f = useFarbwelt();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: abstand(3) }}>
      <Text style={{ ...schrift.titel, fontSize: 21, lineHeight: 26, color: f.text, flexShrink: 1 }} numberOfLines={1}>
        {titel}
      </Text>
      {rechts}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Seite
// ---------------------------------------------------------------------------

/** Wochen-Boss der Crew: Lebensring, Angreifen, Schaden je Mitglied, Kampfverlauf live, Belohnung. */
export default function CrewBoss() {
  const insets = useSafeAreaInsets();
  const { farbwelt: f, belohnungen } = useDarstellung();
  const { daten, laedt, neuLaden, belohnungenAbholen } = useCrew();

  useFocusEffect(
    useCallback(() => {
      neuLaden();
      // Solange die Seite offen ist, regelmäßig auffrischen – so sieht man die Treffer der anderen.
      const t = setInterval(neuLaden, 10000);
      return () => clearInterval(t);
    }, [neuLaden]),
  );

  const boss = daten?.boss;
  useEffect(() => {
    if (daten && !daten.crew) router.replace("/crew");
  }, [daten]);
  if (!boss || !daten?.crew)
    return (
      <Seite>
        <Kopf titel="Wochen-Boss" />
      </Seite>
    );

  const thema = themaVon(boss.thema);
  const ereignisse = daten.ereignisse ?? [];
  const treffer = ereignisse.filter((e) => e.art === "treffer" || e.art === "sieg");
  const { liste, genau } = schadenListe(daten.mitglieder ?? [], ereignisse, new Date(`${boss.woche}T00:00:00`).getTime());
  const bester = Math.max(0, ...liste.map((k) => k.schaden));
  const geschafft = boss.hp_max > 0 ? Math.round(((boss.hp_max - boss.hp) / boss.hp_max) * 100) : 0;
  const truhen = daten.belohnungen ?? 0;
  const ichId = daten.mitglieder?.find((m) => m.ich)?.id;

  async function abholen() {
    const xp = await belohnungenAbholen();
    if (xp > 0) {
      erfolg();
      dialog("Belohnung abgeholt!", belohnungen ? `+${xp} XP und das Abzeichen „Bossbezwinger“ gehören dir.` : "Das Abzeichen „Bossbezwinger“ gehört dir.");
    }
  }

  return (
    <Seite>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + abstand(10) }}
        refreshControl={<RefreshControl refreshing={laedt} onRefresh={neuLaden} tintColor={f.orange} />}
        showsVerticalScrollIndicator={false}
      >
        <BossArena boss={boss} />

        <View style={{ paddingHorizontal: RAND, gap: abstand(8) }}>
          {truhen ? (
            <View style={{ gap: abstand(3) }}>
              <SiegKarte titel="Boss besiegt!" text="Eure Belohnung wartet – hol sie dir ab." />
              <StartKnopf
                titel="Belohnung abholen"
                unter={belohnungen ? `+${XP_TRUHE * truhen} XP und Abzeichen` : "Abzeichen „Bossbezwinger“"}
                onPress={abholen}
              />
            </View>
          ) : boss.besiegt ? (
            <SiegKarte titel="Stark gemacht, Crew!" text="Am Montag wartet der nächste Boss – aus eurem dann schwächsten Thema." />
          ) : (
            <View style={{ gap: abstand(3) }}>
              <AngriffsKarte hp={boss.hp} />
              <StartKnopf
                titel="Angreifen"
                unter={`Fragen aus „${thema.titel}“`}
                onPress={() => router.push({ pathname: "/training", params: { modus: "thema", thema: boss.thema } })}
              />
            </View>
          )}

          {liste.length ? (
            <View>
              <Ueberschrift
                titel={genau ? "Schaden diese Woche" : "Letzte Treffer"}
                rechts={<Text style={{ ...schrift.textMittel, fontSize: 14, color: f.text3, fontVariant: ["tabular-nums"] }}>{geschafft} % geschafft</Text>}
              />
              <Gruppe>
                {liste.map((k, i) => (
                  <KaempferZeile key={k.m.id} k={k} rang={i + 1} max={bester} />
                ))}
              </Gruppe>
            </View>
          ) : null}

          <View>
            <Ueberschrift titel="Kampfverlauf" rechts={boss.besiegt ? null : <LivePille />} />
            {treffer.length ? (
              <Gruppe>
                {treffer.slice(0, 12).map((e) => (
                  <EreignisZeile key={e.id} e={e} ich={ichId} />
                ))}
              </Gruppe>
            ) : (
              <View style={[{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 22 }, kartenFlaeche(f)]}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: f.orangeSoft, alignItems: "center", justifyContent: "center" }}>
                  <Icon name="flash" size={18} color={f.orange} />
                </View>
                <Text style={{ ...schrift.textMittel, fontSize: 14.5, color: f.text2, flex: 1 }}>Noch keine Treffer diese Woche – mach den ersten!</Text>
              </View>
            )}
          </View>

          {boss.besiegt ? null : <BelohnungKarte mitXp={belohnungen} />}
        </View>
      </ScrollView>
    </Seite>
  );
}
