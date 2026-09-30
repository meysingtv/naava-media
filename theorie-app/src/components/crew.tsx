import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { Animated, Platform, Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from "react-native-svg";
import QRCode from "qrcode";

import { dialog } from "@/components/dialog";
import { FotoFlaeche } from "@/components/foto";
import { Icon } from "@/components/icon";
import { NutzerBild } from "@/components/profilbild";
import type { IconName } from "@/components/ui";
import { bossTrefferHoeren, bossVon, heuteGeschafft, useCrew, type CrewEinladung, type CrewEreignis, type CrewMitglied } from "@/lib/crew";
import { themaFoto } from "@/lib/fotos";
import { themaVon, type ThemaId } from "@/lib/fragen";
import { erfolg, tippen } from "@/lib/haptik";
import { useFarbwelt } from "@/lib/darstellung";
import { serverVerbunden } from "@/lib/supabase";
import { farben, leuchten, schrift, verlauf } from "@/lib/theme";

// ---------------------------------------------------------------------------
// Kleine Bausteine
// ---------------------------------------------------------------------------

/** „gerade eben“, „vor 5 Min.“, „vor 2 Std.“, „vor 3 Tagen“ */
export function zeitVor(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "gerade eben";
  if (s < 3600) return `vor ${Math.floor(s / 60)} Min.`;
  if (s < 86400) return `vor ${Math.floor(s / 3600)} Std.`;
  const t = Math.floor(s / 86400);
  return t === 1 ? "gestern" : `vor ${t} Tagen`;
}

/** QR-Code als Vektorgrafik (kein natives Modul nötig). */
export function QrCode({ wert, groesse = 168 }: { wert: string; groesse?: number }) {
  const pfad = useMemo(() => {
    const qr = QRCode.create(wert, { errorCorrectionLevel: "M" });
    const n = qr.modules.size;
    let d = "";
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.modules.get(x, y)) d += `M${x + 2} ${y + 2}h1v1h-1z`;
    return { d, n: n + 4 };
  }, [wert]);
  return (
    <View style={{ width: groesse, height: groesse, borderRadius: 14, backgroundColor: "#FFFFFF", overflow: "hidden" }}>
      <Svg width={groesse} height={groesse} viewBox={`0 0 ${pfad.n} ${pfad.n}`}>
        <Path d={pfad.d} fill="#0B0F13" />
      </Svg>
    </View>
  );
}

/** Lebensbalken des Bosses (rot → orange). */
export function HpBalken({ hp, max, hoehe = 10 }: { hp: number; max: number; hoehe?: number }) {
  const f = useFarbwelt();
  const anteil = max > 0 ? Math.max(0, Math.min(1, hp / max)) : 0;
  return (
    <View style={{ height: hoehe, borderRadius: hoehe / 2, backgroundColor: f.hell ? "rgba(28,22,14,0.08)" : "rgba(255,255,255,0.12)", overflow: "hidden" }}>
      {anteil > 0 ? (
        <LinearGradient
          colors={["#E3261B", "#FB4B12", "#FE7A1E"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ width: `${Math.max(3, anteil * 100)}%`, height: "100%", borderRadius: hoehe / 2 }}
        />
      ) : null}
    </View>
  );
}

/** Weiches Leuchten hinter Flamme und Boss. */
function Schein({ groesse, farbe = "#FF7A1A", staerke = 0.55 }: { groesse: number; farbe?: string; staerke?: number }) {
  return (
    <Svg width={groesse} height={groesse} style={{ position: "absolute" }} pointerEvents="none">
      <Defs>
        <RadialGradient id="schein" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={farbe} stopOpacity={staerke} />
          <Stop offset="0.45" stopColor={farbe} stopOpacity={staerke * 0.35} />
          <Stop offset="1" stopColor={farbe} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={groesse / 2} cy={groesse / 2} r={groesse / 2} fill="url(#schein)" />
    </Svg>
  );
}

/** Boss vor dem Foto seines Themas: Gesicht mit Leuchten. */
export function BossBild({
  thema,
  hoehe,
  emojiGroesse = 72,
  radius = 18,
  besiegt,
  children,
  style,
}: {
  thema: ThemaId;
  hoehe: number;
  emojiGroesse?: number;
  radius?: number;
  besiegt?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const boss = bossVon(thema);
  const schein = emojiGroesse * 2.4;
  return (
    <FotoFlaeche quelle={themaFoto(thema)} verlauf="stark" style={[{ height: hoehe, borderRadius: radius, overflow: "hidden" }, style]}>
      <LinearGradient colors={["rgba(40,12,4,0.35)", "rgba(3,5,7,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: children ? hoehe * 0.3 : 0, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: schein, height: schein, alignItems: "center", justifyContent: "center" }}>
          <Schein groesse={schein} farbe={besiegt ? "#4ED053" : "#FF5A1A"} staerke={0.6} />
          <Text style={{ fontSize: emojiGroesse, lineHeight: emojiGroesse * 1.2, opacity: besiegt ? 0.55 : 1, transform: [{ rotate: besiegt ? "-12deg" : "0deg" }] }}>{boss.emoji}</Text>
        </View>
      </View>
      {children}
    </FotoFlaeche>
  );
}

// ---------------------------------------------------------------------------
// Was in der Crew passiert ist
// ---------------------------------------------------------------------------

function ereignisText(e: CrewEreignis): { icon: IconName; farbe: string; text: string; wert?: string; wertFarbe?: string } {
  const wer = e.name ?? "Jemand";
  switch (e.art) {
    case "gruendung":
      return { icon: "sparkles", farbe: farben.orange, text: `${wer} hat die Crew gegründet` };
    case "beitritt":
      return { icon: "person-add-outline", farbe: farben.gruen, text: `${wer} ist dabei` };
    case "austritt":
      return { icon: "log-out-outline", farbe: farben.text3, text: `${wer} hat die Crew verlassen` };
    case "stupser":
      return { icon: "paper-plane", farbe: farben.orange, text: e.an_mich ? `${wer} hat dich angestupst` : `${wer} hat ${e.ziel_name ?? "jemanden"} angestupst` };
    case "flamme":
      return { icon: "flame", farbe: farben.flamme, text: `Alle haben es geschafft – Tag ${e.wert}!` };
    case "sieg":
      return { icon: "trophy", farbe: farben.gelb, text: `${wer} hat den Boss erledigt!` };
    case "treffer":
    default: {
      const schaden = e.wert >= 0;
      return {
        icon: "flash",
        farbe: schaden ? farben.gruen : farben.rot,
        text: `${wer}: ${e.richtig} richtig${e.falsch ? `, ${e.falsch} falsch` : ""}`,
        wert: `${schaden ? "−" : "+"}${Math.abs(e.wert)} HP`,
        wertFarbe: schaden ? farben.gruen : farben.rot,
      };
    }
  }
}

export function EreignisZeile({ e }: { e: CrewEreignis }) {
  const x = ereignisText(e);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 14 }}>
      {e.user_id && e.name ? (
        <NutzerBild pfad={e.bild} name={e.name} farbe={e.farbe ?? undefined} groesse={34} />
      ) : (
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: farben.flaeche2, alignItems: "center", justifyContent: "center" }}>
          <Icon name={x.icon} size={17} color={x.farbe} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ ...schrift.textMittel, fontSize: 14.5, color: "#FFFFFF" }} numberOfLines={2}>
          {x.text}
        </Text>
        <Text style={{ ...schrift.text, fontSize: 12, color: farben.text3 }}>{zeitVor(e.zeit)}</Text>
      </View>
      {x.wert ? <Text style={{ ...schrift.titelFett, fontSize: 15, color: x.wertFarbe, fontVariant: ["tabular-nums"] }}>{x.wert}</Text> : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Crew-Flamme mit den Mitgliedern im Halbkreis
// ---------------------------------------------------------------------------

function Mitglied({ m, groesse }: { m: CrewMitglied; groesse: number }) {
  const f = useFarbwelt();
  const fertig = m.heute >= m.ziel;
  return (
    <View style={{ alignItems: "center", width: groesse + 26 }}>
      <View style={{ opacity: fertig ? 1 : 0.55 }}>
        <View style={{ borderRadius: groesse / 2, ...(fertig ? leuchten(farben.orange, 0.45, 8) : null) }}>
          <NutzerBild pfad={m.bild} name={m.name} farbe={m.farbe} groesse={groesse} rand={2} />
        </View>
      </View>
      <View
        style={{
          position: "absolute",
          top: groesse - 16,
          right: 8,
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: fertig ? f.gruen : f.hell ? "#B9BEC5" : farben.flaeche3,
          borderWidth: 2,
          borderColor: f.flaeche,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={fertig ? "checkmark" : "hourglass-outline"} size={11} color="#FFFFFF" weight="bold" />
      </View>
      <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 12.5, color: fertig ? f.text : f.text3, marginTop: 5 }}>
        {m.ich ? "Du" : m.name.split(" ")[0]}
      </Text>
    </View>
  );
}

/** Große Flamme in der Mitte, Mitglieder drumherum, darunter „Tag X“. */
export function CrewFlamme({ mitglieder, flamme, heuteZaehlt, hoehe = 250 }: { mitglieder: CrewMitglied[]; flamme: number; heuteZaehlt: boolean; hoehe?: number }) {
  const f = useFarbwelt();
  const [breite, setBreite] = useState(0);
  const geschafft = heuteGeschafft(mitglieder);
  const anteil = mitglieder.length ? geschafft / mitglieder.length : 0;
  const puls = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(puls, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(puls, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [puls]);

  // Je voller die Crew heute, desto größer die Flamme.
  const flammeGroesse = 58 + 34 * (heuteZaehlt ? 1 : anteil);
  const avatar = 46;
  const mitte = { x: breite / 2, y: hoehe * 0.5 };
  const rx = Math.min(breite / 2 - 34, 150);
  const ry = hoehe * 0.36;
  // Verteilung auf einem Bogen über der Flamme (unten bleibt Platz für „Tag X“).
  const winkel = (i: number, n: number) => {
    if (n === 1) return -90;
    const von = -205;
    const bis = 25;
    return von + ((bis - von) * i) / (n - 1);
  };

  return (
    <View style={{ height: hoehe }} onLayout={(e) => setBreite(e.nativeEvent.layout.width)}>
      {breite > 0 ? (
        <>
          <View pointerEvents="none" style={{ position: "absolute", left: mitte.x - 110, top: mitte.y - 110, width: 220, height: 220, alignItems: "center", justifyContent: "center" }}>
            <Schein groesse={220} staerke={0.25 + 0.4 * (heuteZaehlt ? 1 : anteil)} />
            <Animated.View style={{ transform: [{ scale: puls.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }) }] }}>
              <View style={Platform.OS === "ios" ? leuchten(farben.flamme, 0.9, 22) : undefined}>
                <Icon name="flame" size={flammeGroesse} color={heuteZaehlt ? "#FF8A1E" : farben.flamme} />
              </View>
            </Animated.View>
          </View>
          <View
            style={{
              position: "absolute",
              top: mitte.y + flammeGroesse / 2 + 6,
              alignSelf: "center",
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              paddingHorizontal: 12,
              height: 28,
              borderRadius: 14,
              backgroundColor: f.hell ? "#FFFFFF" : "rgba(20,12,8,0.85)",
              borderWidth: 1,
              borderColor: f.orangeLinie,
            }}
          >
            <Icon name="flame" size={14} color={f.orange} />
            <Text style={{ ...schrift.titelFett, fontSize: 14, color: f.text }}>{flamme > 0 ? `Tag ${flamme}` : "Tag 0"}</Text>
          </View>
          {mitglieder.map((m, i) => {
            const w = (winkel(i, mitglieder.length) * Math.PI) / 180;
            const x = mitte.x + rx * Math.cos(w);
            const y = mitte.y + ry * Math.sin(w);
            return (
              <View key={m.id} style={{ position: "absolute", left: x - (avatar + 26) / 2, top: y - avatar / 2 }}>
                <Mitglied m={m} groesse={avatar} />
              </View>
            );
          })}
        </>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Karten für die Startseite
// ---------------------------------------------------------------------------

function kartenStil(f: ReturnType<typeof useFarbwelt>): ViewStyle {
  return { borderRadius: 22, backgroundColor: f.flaeche, borderWidth: 1, borderColor: f.linie, overflow: "hidden" };
}

function KleinKnopf({ titel, icon, onPress, art = "primaer", style }: { titel: string; icon?: ComponentProps<typeof Icon>["name"]; onPress: () => void; art?: "primaer" | "sekundaer"; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  const primaer = art === "primaer";
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      style={({ pressed }) => [
        { height: 46, borderRadius: 23, overflow: "hidden", transform: [{ scale: pressed ? 0.98 : 1 }] },
        primaer ? leuchten(farben.orange, f.hell ? 0.25 : 0.4, 12, 4) : { backgroundColor: f.flaeche2, borderWidth: 1, borderColor: f.linieStark },
        style,
      ]}
    >
      {primaer ? <LinearGradient colors={verlauf.knopf} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} /> : null}
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16 }}>
        {icon ? <Icon name={icon} size={17} color={primaer ? "#FFFFFF" : f.text} /> : null}
        <Text style={{ ...schrift.textFett, fontSize: 15.5, color: primaer ? "#FFFFFF" : f.text }}>{titel}</Text>
      </View>
    </Pressable>
  );
}

function EinladungZeile({ e }: { e: CrewEinladung }) {
  const f = useFarbwelt();
  const { einladungAntworten } = useCrew();
  const [laeuft, setLaeuft] = useState(false);
  async function antworten(ja: boolean) {
    setLaeuft(true);
    const f = await einladungAntworten(e.id, ja);
    setLaeuft(false);
    if (f) dialog("Hat nicht geklappt", f);
    else if (ja) erfolg();
  }
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 16, backgroundColor: f.flaeche2, borderWidth: 1, borderColor: f.orangeLinie }}>
      <NutzerBild pfad={e.von_bild} name={e.von_name} farbe={e.von_farbe} groesse={42} />
      <View style={{ flex: 1 }}>
        <Text style={{ ...schrift.textHalb, fontSize: 15, color: f.text }} numberOfLines={2}>
          {e.von_name} lädt dich in „{e.crew_name}“ ein
        </Text>
        <Text style={{ ...schrift.text, fontSize: 12.5, color: f.text3 }}>{e.mitglieder} von 6 dabei</Text>
      </View>
      <View style={{ gap: 6 }}>
        <KleinKnopf titel="Annehmen" onPress={() => !laeuft && antworten(true)} style={{ height: 34 }} />
        <Pressable onPress={() => !laeuft && antworten(false)} hitSlop={6}>
          <Text style={{ ...schrift.textHalb, fontSize: 13, color: f.text3, textAlign: "center" }}>Ablehnen</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Noch keine Crew: Einladungen, gründen oder mit Code beitreten. */
function CrewTeaser() {
  const f = useFarbwelt();
  const { moeglich, daten } = useCrew();
  const einladungen = daten?.einladungen ?? [];
  return (
    <View style={[kartenStil(f), { padding: 16, gap: 14 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ width: 64, height: 64, alignItems: "center", justifyContent: "center" }}>
          <Schein groesse={64} staerke={0.6} />
          <Icon name="flame" size={40} color={farben.flamme} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ ...schrift.titelFett, fontSize: 17, color: f.text }}>Lern mit deiner Crew</Text>
          <Text style={{ ...schrift.text, fontSize: 13.5, lineHeight: 18, color: f.text2 }}>Gemeinsame Flamme, Wochen-Boss und Anstupsen – mit bis zu 6 Freunden.</Text>
        </View>
      </View>
      {einladungen.map((e) => (
        <EinladungZeile key={e.id} e={e} />
      ))}
      {moeglich ? (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <KleinKnopf titel="Crew gründen" onPress={() => router.push("/crew")} style={{ flex: 1 }} />
          <KleinKnopf titel="Code eingeben" art="sekundaer" onPress={() => router.push("/crew-beitreten")} style={{ flex: 1 }} />
        </View>
      ) : (
        <KleinKnopf titel="Konto erstellen" icon="person-add-outline" onPress={() => router.push("/registrieren")} />
      )}
    </View>
  );
}

/** Crew-Karte für die Startseite: Flamme, wer fehlt, Anstupsen – darunter der Wochen-Boss. */
export function CrewBereich({ style, kopf }: { style?: StyleProp<ViewStyle>; kopf?: ReactNode }) {
  const f = useFarbwelt();
  const { moeglich, daten, stupsen, belohnungenAbholen } = useCrew();
  const [gestupst, setGestupst] = useState<Record<string, boolean>>({});

  // Ohne Server gibt es keine Crew; beim ersten Laden nichts aufblitzen lassen.
  if (!serverVerbunden || (moeglich && daten === null)) return null;
  if (!moeglich || !daten?.crew || !daten.mitglieder) {
    return (
      <View style={style}>
        {kopf}
        <CrewTeaser />
      </View>
    );
  }

  const crew = daten.crew;
  const mitglieder = daten.mitglieder;
  const fehlen = mitglieder.filter((m) => m.heute < m.ziel);
  const andereFehlen = fehlen.filter((m) => !m.ich);
  const ichFehle = fehlen.some((m) => m.ich);
  const boss = daten.boss;

  async function anstupsen(m: CrewMitglied) {
    const f = await stupsen(m.id);
    if (f) dialog("Anstupsen", f);
    else {
      erfolg();
      setGestupst((g) => ({ ...g, [m.id]: true }));
    }
  }

  let zeile: string;
  if (fehlen.length === 0) zeile = "Alle haben ihr Tagesziel – die Flamme brennt!";
  else if (fehlen.length === 1) zeile = fehlen[0].ich ? "Nur du fehlst noch" : `Nur ${fehlen[0].name.split(" ")[0]} fehlt noch`;
  else zeile = `${fehlen.length} fehlen noch`;
  const naechster = andereFehlen.find((m) => !gestupst[m.id]);

  return (
    <View style={style}>
      {kopf}
      <View style={{ gap: 10 }}>
      {daten.belohnungen ? (
        <Pressable
          onPress={async () => {
            const xp = await belohnungenAbholen();
            if (xp > 0) {
              erfolg();
              dialog("XP-Truhe geöffnet!", `Ihr habt den Boss besiegt – du bekommst ${xp} XP und das Abzeichen „Bossbezwinger“.`);
            }
          }}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 18, backgroundColor: f.hell ? f.gruenSoft : farben.gruenDunkel, borderWidth: 1, borderColor: f.gruen }}
        >
          <Text style={{ fontSize: 30 }}>🎁</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ ...schrift.titelFett, fontSize: 16, color: f.text }}>Boss besiegt!</Text>
            <Text style={{ ...schrift.text, fontSize: 13, color: f.text2 }}>Tippe, um deine XP-Truhe zu öffnen.</Text>
          </View>
          <Icon name="chevron-forward" size={17} color={f.text2} />
        </Pressable>
      ) : null}

      <Pressable onPress={() => router.push("/crew")} style={[kartenStil(f), { paddingTop: 14 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ ...schrift.titel, fontSize: 20, lineHeight: 25, color: f.text }} numberOfLines={1}>
              {crew.name}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 }}>
              <Icon name="flame" size={13} color={f.orange} />
              <Text style={{ ...schrift.textHalb, fontSize: 13, color: f.text2 }}>
                {heuteGeschafft(mitglieder)}/{mitglieder.length} heute geschafft
              </Text>
            </View>
          </View>
          <Icon name="chevron-forward" size={17} color={f.text2} />
        </View>

        <CrewFlamme mitglieder={mitglieder} flamme={crew.flamme} heuteZaehlt={crew.flamme_heute} hoehe={236} />

        <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
          {daten.stupser ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: f.orangeSoft }}>
              <Icon name="paper-plane" size={13} color={f.orange} />
              <Text style={{ ...schrift.textHalb, fontSize: 13, color: f.orange }}>
                {daten.stupser.von} hat dich angestupst
              </Text>
            </View>
          ) : null}
          <View style={{ alignItems: "center", gap: 2 }}>
            <Text style={{ ...schrift.titelFett, fontSize: 16, color: fehlen.length ? f.orange : f.gruen, textAlign: "center" }}>
              {fehlen.length ? "🔥 " : "✅ "}
              {zeile}
            </Text>
            <Text style={{ ...schrift.text, fontSize: 13, color: f.text3, textAlign: "center" }}>
              {fehlen.length
                ? ichFehle
                  ? "Mach dein Tagesziel, damit die Flamme weiterbrennt."
                  : "Die Flamme wird kleiner, wenn jemand fehlt."
                : "Morgen geht es weiter – bleibt dran."}
            </Text>
          </View>
          {ichFehle ? (
            <KleinKnopf titel="Jetzt lernen" icon="arrow-forward" onPress={() => router.push({ pathname: "/training", params: { modus: "smart" } })} />
          ) : naechster ? (
            <KleinKnopf titel={`${naechster.name.split(" ")[0]} anstupsen`} icon="paper-plane" onPress={() => anstupsen(naechster)} />
          ) : null}
        </View>
      </Pressable>

      {boss ? (
        <Pressable onPress={() => router.push("/crew-boss")} style={[kartenStil(f), { padding: 12, flexDirection: "row", alignItems: "center", gap: 14 }]}>
          <BossBild thema={boss.thema} hoehe={78} emojiGroesse={40} radius={14} besiegt={boss.besiegt} style={{ width: 96 }} />
          <View style={{ flex: 1, gap: 6 }}>
            <View>
              <Text style={{ ...schrift.textHalb, fontSize: 12, color: f.orange, letterSpacing: 0.4 }}>WOCHEN-BOSS</Text>
              <Text style={{ ...schrift.titelFett, fontSize: 17, color: f.text }} numberOfLines={1}>
                {bossVon(boss.thema).name}
              </Text>
            </View>
            {boss.besiegt ? (
              <Text style={{ ...schrift.textHalb, fontSize: 13.5, color: f.gruen }}>Besiegt – neuer Boss am Montag</Text>
            ) : (
              <>
                <HpBalken hp={boss.hp} max={boss.hp_max} hoehe={8} />
                <Text style={{ ...schrift.textHalb, fontSize: 12.5, color: f.text2, fontVariant: ["tabular-nums"] }}>
                  {boss.hp} / {boss.hp_max} HP
                </Text>
                <Text style={{ ...schrift.text, fontSize: 12, color: f.text3 }} numberOfLines={1}>
                  Thema: {themaVon(boss.thema).titel}
                </Text>
              </>
            )}
          </View>
          <Icon name="chevron-forward" size={17} color={f.text2} />
        </Pressable>
      ) : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Einblendung „−5 HP“ beim Antworten im Boss-Thema (liegt über allen Seiten)
// ---------------------------------------------------------------------------

export function BossTrefferAnzeige() {
  const insets = useSafeAreaInsets();
  const [summe, setSumme] = useState<{ hp: number; emoji: string } | null>(null);
  const y = useRef(new Animated.Value(0)).current;
  const sicht = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const laufend = useRef<{ hp: number; emoji: string } | null>(null);

  useEffect(
    () =>
      bossTrefferHoeren((t) => {
        // Treffer kurz hintereinander (z. B. nach einer Prüfung) werden zusammengezählt.
        laufend.current = { hp: (laufend.current?.hp ?? 0) + t.hp, emoji: t.emoji };
        setSumme(laufend.current);
        y.setValue(10);
        Animated.parallel([
          Animated.spring(y, { toValue: 0, useNativeDriver: true, damping: 12, stiffness: 220 }),
          Animated.timing(sicht, { toValue: 1, duration: 140, useNativeDriver: true }),
        ]).start();
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          Animated.timing(sicht, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => {
            laufend.current = null;
            setSumme(null);
          });
        }, 1300);
      }),
    [y, sicht],
  );

  if (!summe) return null;
  const schaden = summe.hp < 0;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: insets.top + 64,
        right: 18,
        opacity: sicht,
        transform: [{ translateY: y }],
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        height: 36,
        borderRadius: 18,
        backgroundColor: schaden ? "rgba(40,16,6,0.94)" : "rgba(40,8,8,0.94)",
        borderWidth: 1.5,
        borderColor: schaden ? farben.orange : farben.rot,
        ...leuchten(schaden ? farben.orange : farben.rot, 0.55, 10),
      }}
    >
      <Text style={{ fontSize: 18 }}>{summe.emoji}</Text>
      <Text style={{ ...schrift.titel, fontSize: 16, color: schaden ? "#FFB47A" : "#FF8A80", fontVariant: ["tabular-nums"] }}>
        {schaden ? `−${Math.abs(summe.hp)}` : `+${summe.hp}`} HP
      </Text>
    </Animated.View>
  );
}
