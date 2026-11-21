import type { ReactNode } from "react";
import { Image, Pressable, Text, View, type ImageSourcePropType, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { router } from "expo-router";

import { Icon, type IconName } from "@/components/icon";
import { FIGUR, type FigurName } from "@/components/start-teile";
import { useDarstellung } from "@/lib/darstellung";
import { tippen } from "@/lib/haptik";

// Neue lila Designsprache (wie der Start): helle Flächen mit feinem Rand und
// fester Kante unten, schmale fette Überschriften, das Auto als Figur.

export type Lila = {
  hell: boolean;
  grund: string;
  karte: string;
  linie: string;
  kante: string;
  tinte: string;
  tinte2: string;
  tinte3: string;
  lila: string;
  lilaKante: string;
  lilaZart: string;
  lilaFlaeche: string;
  spur: string;
};

const HELL_LILA: Lila = {
  hell: true,
  grund: "#F4F2FC",
  karte: "#FFFFFF",
  linie: "#E1DDF0",
  kante: "#D8D3EA",
  tinte: "#2E2650",
  tinte2: "#6E6888",
  tinte3: "#A19CB6",
  lila: "#8C7AE6",
  lilaKante: "#6D5BC9",
  lilaZart: "#EEEBFB",
  lilaFlaeche: "#F3F0FF",
  spur: "#E7E3F4",
};

const DUNKEL_LILA: Lila = {
  hell: false,
  grund: "#0B0C16",
  karte: "#191A26",
  linie: "#272838",
  kante: "#10111A",
  tinte: "#FFFFFF",
  tinte2: "#C9C6DA",
  tinte3: "#8E8BA3",
  lila: "#9A89EE",
  lilaKante: "#6D5BC9",
  lilaZart: "#272347",
  lilaFlaeche: "#221F3D",
  spur: "#24253A",
};

export function useLila(): Lila {
  const { darstellung } = useDarstellung();
  return darstellung === "hell" ? HELL_LILA : DUNKEL_LILA;
}

export const lilaSchrift = {
  titel: { fontFamily: "BarlowCondensed_800ExtraBold" } as TextStyle,
  fett: { fontFamily: "BarlowCondensed_700Bold" } as TextStyle,
  text: { fontFamily: "Inter_400Regular" } as TextStyle,
  textMittel: { fontFamily: "Inter_500Medium" } as TextStyle,
  textHalb: { fontFamily: "Inter_600SemiBold" } as TextStyle,
  textFett: { fontFamily: "Inter_700Bold" } as TextStyle,
};

export const LILA_RAND = 18;

/** Karte: Fläche mit feinem Rand und fester Kante unten. Mit onPress drückbar. */
export function LilaKarte({ children, onPress, aktiv, style, label }: { children: ReactNode; onPress?: () => void; aktiv?: boolean; style?: StyleProp<ViewStyle>; label?: string }) {
  const l = useLila();
  const basis: ViewStyle = {
    backgroundColor: aktiv ? l.lilaFlaeche : l.karte,
    borderRadius: 18,
    borderWidth: 1.5,
    borderBottomWidth: 4,
    borderColor: aktiv ? l.lila : l.linie,
    borderBottomColor: aktiv ? l.lilaKante : l.kante,
  };
  if (!onPress) return <View style={[basis, style]}>{children}</View>;
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [basis, { transform: [{ translateY: pressed ? 2 : 0 }] }, style]}
    >
      {children}
    </Pressable>
  );
}

/** Große lila Karte mit Kante – z. B. „Lernvideos ansehen“. */
export function LilaBanner({ titel, unter, icon = "play", onPress }: { titel: string; unter?: string; icon?: IconName; onPress: () => void }) {
  const l = useLila();
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={titel}
      style={({ pressed }) => ({ borderRadius: 20, backgroundColor: l.lilaKante, paddingBottom: pressed ? 2 : 5, marginTop: pressed ? 3 : 0 })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 20, backgroundColor: "#8C7AE6", paddingVertical: 14, paddingHorizontal: 16 }}>
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={22} color="#8C7AE6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...lilaSchrift.titel, fontSize: 24, lineHeight: 27, color: "#FFFFFF" }}>{titel}</Text>
          {unter ? <Text style={{ ...lilaSchrift.textMittel, fontSize: 13, color: "rgba(255,255,255,0.88)" }}>{unter}</Text> : null}
        </View>
        <Icon name="chevron-forward" size={22} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

/** Großer lila Knopf mit Kante (z. B. „Nächstes Thema“). */
export function LilaKnopf({ titel, icon, onPress, style }: { titel: string; icon?: IconName; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const l = useLila();
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      style={({ pressed }) => [{ borderRadius: 18, backgroundColor: l.lilaKante, paddingBottom: pressed ? 1 : 4, marginTop: pressed ? 3 : 0 }, style]}
    >
      <View style={{ height: 54, borderRadius: 18, backgroundColor: "#8C7AE6", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <Text style={{ ...lilaSchrift.titel, fontSize: 22, color: "#FFFFFF" }}>{titel}</Text>
        {icon ? <Icon name={icon} size={20} color="#FFFFFF" /> : null}
      </View>
    </Pressable>
  );
}

/** Runde Zurück-Taste. */
export function LilaZurueck({ onPress, style }: { onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  const l = useLila();
  return (
    <Pressable
      onPress={() => {
        tippen();
        if (onPress) onPress();
        else if (router.canGoBack()) router.back();
        else router.navigate("/lernen");
      }}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Zurück"
      style={({ pressed }) => [{ width: 42, height: 42, borderRadius: 21, backgroundColor: pressed ? l.lilaZart : l.karte, borderWidth: 1.5, borderColor: l.linie, alignItems: "center", justifyContent: "center" }, style]}
    >
      <Icon name="chevron-back" size={21} color={l.tinte} />
    </Pressable>
  );
}

/** Große Seitenüberschrift. */
export function LilaTitel({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const l = useLila();
  return <Text style={[{ ...lilaSchrift.titel, fontSize: 40, lineHeight: 44, letterSpacing: -0.6, color: l.tinte }, style]}>{children}</Text>;
}

/** Zwischenüberschrift, rechts optional ein Zusatz. */
export function LilaKopf({ titel, rechts, style }: { titel: string; rechts?: string; style?: StyleProp<ViewStyle> }) {
  const l = useLila();
  return (
    <View style={[{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }, style]}>
      <Text style={{ ...lilaSchrift.titel, fontSize: 25, color: l.tinte }}>{titel}</Text>
      {rechts ? <Text style={{ ...lilaSchrift.textMittel, fontSize: 14, color: l.tinte2 }}>{rechts}</Text> : null}
    </View>
  );
}

/** Figur mit Sprechblase daneben (Spitze zur Figur). */
export function LilaFigurBlase({ figur = "grund", text, style }: { figur?: FigurName; text: string; style?: StyleProp<ViewStyle> }) {
  const l = useLila();
  return (
    <View style={[{ flexDirection: "row", alignItems: "center" }, style]}>
      <Image source={FIGUR[figur]} style={{ width: 104, height: 104, marginLeft: -6 }} resizeMode="contain" />
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", marginLeft: 4 }}>
        {/* Spitze: Rand-Dreieck und Füll-Dreieck darüber */}
        <View style={{ width: 12, height: 18, justifyContent: "center", zIndex: 1, marginRight: -1.5 }}>
          <View style={{ position: "absolute", right: 0, width: 0, height: 0, borderTopWidth: 9, borderBottomWidth: 9, borderRightWidth: 12, borderTopColor: "transparent", borderBottomColor: "transparent", borderRightColor: l.linie }} />
          <View style={{ position: "absolute", right: -2, width: 0, height: 0, borderTopWidth: 7.5, borderBottomWidth: 7.5, borderRightWidth: 10, borderTopColor: "transparent", borderBottomColor: "transparent", borderRightColor: l.karte }} />
        </View>
        <View style={{ flex: 1, backgroundColor: l.karte, borderRadius: 18, borderWidth: 1.5, borderBottomWidth: 4, borderColor: l.linie, borderBottomColor: l.kante, paddingVertical: 12, paddingHorizontal: 16 }}>
          <Text style={{ ...lilaSchrift.fett, fontSize: 20, lineHeight: 23, color: l.tinte }}>{text}</Text>
        </View>
      </View>
    </View>
  );
}

/** Kleine Karte für Schnellzugriffe und Lernhilfen: Symbol + Name. */
/** Eigene Symbole im App-Stil (assets/images/icons). */
export const SYMBOLE = {
  play: require("../../assets/images/icons/play.png"),
  birne: require("../../assets/images/icons/birne.png"),
  warnung: require("../../assets/images/icons/warnung.png"),
  rechner: require("../../assets/images/icons/rechner.png"),
  scan: require("../../assets/images/icons/scan.png"),
  kalender: require("../../assets/images/icons/kalender.png"),
} satisfies Record<string, ImageSourcePropType>;

export function LilaKachel({ titel, icon, bild, iconFarbe, onPress, style, gross }: { titel: string; icon?: IconName; bild?: ImageSourcePropType; iconFarbe?: string; onPress: () => void; style?: StyleProp<ViewStyle>; gross?: boolean }) {
  const l = useLila();
  return (
    <LilaKarte onPress={onPress} label={titel} style={style}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 9, height: gross ? 56 : 52, paddingHorizontal: 12 }}>
        {bild ? <Image source={bild} style={{ width: gross ? 32 : 27, height: gross ? 32 : 27 }} resizeMode="contain" /> : icon ? <Icon name={icon} size={gross ? 24 : 21} color={iconFarbe ?? l.lila} /> : null}
        <Text style={{ ...lilaSchrift.fett, fontSize: gross ? 21 : 17.5, color: l.tinte, flexShrink: 1 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
          {titel}
        </Text>
      </View>
    </LilaKarte>
  );
}
