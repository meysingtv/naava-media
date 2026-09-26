import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tippen } from "@/lib/haptik";
import { abstand, farben, radius, RAND, schrift } from "@/lib/theme";

export type IconName = keyof typeof Ionicons.glyphMap;

// ---------------------------------------------------------------------------
// Typografie
// ---------------------------------------------------------------------------

const VARIANTEN = {
  display: { fontFamily: schrift.titel, fontSize: 34, lineHeight: 39, letterSpacing: -0.8, color: farben.text },
  titel: { fontFamily: schrift.titel, fontSize: 26, lineHeight: 31, letterSpacing: -0.5, color: farben.text },
  h2: { fontFamily: schrift.titelFett, fontSize: 20, lineHeight: 25, letterSpacing: -0.2, color: farben.text },
  h3: { fontFamily: schrift.titelFett, fontSize: 16.5, lineHeight: 21, letterSpacing: -0.1, color: farben.text },
  text: { fontFamily: schrift.text, fontSize: 15, lineHeight: 22, color: farben.text2 },
  textStark: { fontFamily: schrift.textHalb, fontSize: 15, lineHeight: 21, color: farben.text },
  klein: { fontFamily: schrift.textMittel, fontSize: 13, lineHeight: 18, color: farben.text3 },
  mini: { fontFamily: schrift.textHalb, fontSize: 11, lineHeight: 14, letterSpacing: 0.9, color: farben.text3, textTransform: "uppercase" },
  zahl: { fontFamily: schrift.titel, fontSize: 28, lineHeight: 32, letterSpacing: -0.6, color: farben.text, fontVariant: ["tabular-nums"] },
} satisfies Record<string, TextStyle>;

export type TextVariante = keyof typeof VARIANTEN;

export function T({
  v = "text",
  farbe,
  zentriert,
  style,
  children,
  numberOfLines,
  selectable,
}: {
  v?: TextVariante;
  farbe?: string;
  zentriert?: boolean;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
  selectable?: boolean;
}) {
  return (
    <Text
      numberOfLines={numberOfLines}
      selectable={selectable}
      style={[VARIANTEN[v], farbe ? { color: farbe } : null, zentriert ? { textAlign: "center" } : null, style]}
    >
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Flächen
// ---------------------------------------------------------------------------

export function Karte({
  children,
  style,
  onPress,
  hervorgehoben,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  hervorgehoben?: boolean;
}) {
  const basis: ViewStyle = {
    backgroundColor: farben.flaeche,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: hervorgehoben ? farben.orangeLinie : farben.linie,
    padding: abstand(5),
  };
  if (!onPress) return <View style={[basis, style]}>{children}</View>;
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      style={({ pressed }) => [basis, { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }, style]}
    >
      {children}
    </Pressable>
  );
}

/** Überschrift über einem Abschnitt – klein, gesperrt, optional mit Aktion rechts. */
export function Abschnitt({ titel, aktion, onAktion, style }: { titel: string; aktion?: string; onAktion?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: abstand(3) }, style]}>
      <T v="mini">{titel}</T>
      {aktion && onAktion ? (
        <Pressable onPress={onAktion} hitSlop={10}>
          <T v="klein" farbe={farben.orange} style={{ fontFamily: schrift.textHalb }}>
            {aktion}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Bedienelemente
// ---------------------------------------------------------------------------

type KnopfArt = "primaer" | "sekundaer" | "geist" | "gefahr";

export function Knopf({
  titel,
  onPress,
  art = "primaer",
  icon,
  laedt,
  deaktiviert,
  klein,
  style,
}: {
  titel: string;
  onPress: () => void;
  art?: KnopfArt;
  icon?: IconName;
  laedt?: boolean;
  deaktiviert?: boolean;
  klein?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const hintergrund = { primaer: farben.orange, sekundaer: farben.flaeche2, geist: "transparent", gefahr: farben.rotSoft }[art];
  const vorder = { primaer: farben.aufOrange, sekundaer: farben.text, geist: farben.orange, gefahr: farben.rot }[art];
  const aus = deaktiviert || laedt;
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      disabled={aus}
      style={({ pressed }) => [
        {
          height: klein ? 44 : 54,
          borderRadius: klein ? 12 : 16,
          paddingHorizontal: abstand(5),
          backgroundColor: hintergrund,
          borderWidth: art === "sekundaer" ? 1 : 0,
          borderColor: farben.linieStark,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: abstand(2),
          opacity: deaktiviert ? 0.4 : pressed ? 0.86 : 1,
          transform: [{ scale: pressed && !aus ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      {laedt ? (
        <ActivityIndicator color={vorder} />
      ) : (
        <>
          <Text style={{ fontFamily: schrift.textFett, fontSize: klein ? 14.5 : 16, color: vorder, letterSpacing: 0.1 }}>{titel}</Text>
          {icon ? <Ionicons name={icon} size={klein ? 17 : 19} color={vorder} /> : null}
        </>
      )}
    </Pressable>
  );
}

/** Runde Symbol-Plakette mit feinem Rand. */
export function Plakette({ icon, farbe = farben.orange, groesse = 40, gefuellt }: { icon: IconName; farbe?: string; groesse?: number; gefuellt?: boolean }) {
  return (
    <View
      style={{
        width: groesse,
        height: groesse,
        borderRadius: groesse / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: gefuellt ? farbe : farbe + "1A",
        borderWidth: gefuellt ? 0 : 1,
        borderColor: farbe + "40",
      }}
    >
      <Ionicons name={icon} size={groesse * 0.48} color={gefuellt ? farben.aufOrange : farbe} />
    </View>
  );
}

export function Chip({ text, farbe = farben.text2, icon, aktiv, onPress }: { text: string; farbe?: string; icon?: IconName; aktiv?: boolean; onPress?: () => void }) {
  const inhalt = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: abstand(3),
        height: 30,
        borderRadius: radius.voll,
        backgroundColor: aktiv ? farben.orange : farben.flaeche2,
        borderWidth: 1,
        borderColor: aktiv ? farben.orange : farben.linie,
      }}
    >
      {icon ? <Ionicons name={icon} size={14} color={aktiv ? farben.aufOrange : farbe} /> : null}
      <Text style={{ fontFamily: schrift.textHalb, fontSize: 13, color: aktiv ? farben.aufOrange : farbe }}>{text}</Text>
    </View>
  );
  if (!onPress) return inhalt;
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      hitSlop={6}
    >
      {inhalt}
    </Pressable>
  );
}

export function Balken({ wert, farbe = farben.orange, hoehe = 6, hintergrund = farben.flaeche3 }: { wert: number; farbe?: string; hoehe?: number; hintergrund?: string }) {
  const p = Math.max(0, Math.min(1, wert));
  return (
    <View style={{ height: hoehe, borderRadius: hoehe, backgroundColor: hintergrund, overflow: "hidden" }}>
      <View style={{ width: `${p * 100}%`, height: "100%", borderRadius: hoehe, backgroundColor: farbe }} />
    </View>
  );
}

/** Listenzeile mit Symbol, Titel, Unterzeile und Wert/Pfeil. */
export function Zeile({
  icon,
  iconFarbe,
  titel,
  unter,
  wert,
  onPress,
  gefahr,
  ohnePfeil,
  rechts,
  titelZeilen,
}: {
  icon?: IconName;
  iconFarbe?: string;
  titel: string;
  unter?: string;
  wert?: string;
  onPress?: () => void;
  gefahr?: boolean;
  ohnePfeil?: boolean;
  rechts?: ReactNode;
  titelZeilen?: number;
}) {
  const inhalt = (pressed: boolean) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: abstand(3.5),
        paddingVertical: abstand(3.5),
        paddingHorizontal: abstand(4),
        backgroundColor: pressed ? farben.flaeche2 : "transparent",
      }}
    >
      {icon ? <Ionicons name={icon} size={20} color={gefahr ? farben.rot : iconFarbe ?? farben.text2} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <T v="textStark" farbe={gefahr ? farben.rot : undefined} numberOfLines={titelZeilen}>
          {titel}
        </T>
        {unter ? <T v="klein">{unter}</T> : null}
      </View>
      {wert ? <T v="klein" farbe={farben.text2}>{wert}</T> : null}
      {rechts}
      {onPress && !ohnePfeil ? <Ionicons name="chevron-forward" size={17} color={farben.text4} /> : null}
    </View>
  );
  if (!onPress) return inhalt(false);
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
    >
      {({ pressed }) => inhalt(pressed)}
    </Pressable>
  );
}

/** Gruppe von Zeilen in einer Karte mit Haarlinien dazwischen. */
export function Gruppe({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const kinder = (Array.isArray(children) ? children : [children]).flat().filter(Boolean);
  return (
    <View style={[{ backgroundColor: farben.flaeche, borderRadius: radius.l, borderWidth: 1, borderColor: farben.linie, overflow: "hidden" }, style]}>
      {kinder.map((kind, i) => (
        <View key={i}>
          {i > 0 ? <View style={{ height: 1, backgroundColor: farben.linie, marginLeft: abstand(4) }} /> : null}
          {kind}
        </View>
      ))}
    </View>
  );
}

export function Avatar({ name, groesse = 44, farbe = farben.orange }: { name: string; groesse?: number; farbe?: string }) {
  const kuerzel =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?";
  return (
    <View
      style={{
        width: groesse,
        height: groesse,
        borderRadius: groesse / 2,
        backgroundColor: farben.flaeche2,
        borderWidth: 1.5,
        borderColor: farbe,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontFamily: schrift.titel, fontSize: groesse * 0.38, color: farben.text }}>{kuerzel}</Text>
    </View>
  );
}

export function Eingabe({ icon, fehler, ...props }: TextInputProps & { icon?: IconName; fehler?: boolean }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: abstand(3),
        height: 54,
        paddingHorizontal: abstand(4),
        borderRadius: 16,
        backgroundColor: farben.flaeche,
        borderWidth: 1,
        borderColor: fehler ? farben.rot : farben.linieStark,
      }}
    >
      {icon ? <Ionicons name={icon} size={19} color={farben.text3} /> : null}
      <TextInput
        placeholderTextColor={farben.text4}
        selectionColor={farben.orange}
        keyboardAppearance="dark"
        {...props}
        style={[{ flex: 1, fontFamily: schrift.textMittel, fontSize: 16, color: farben.text, height: "100%" }, props.style]}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Seitenrahmen
// ---------------------------------------------------------------------------

/** Kopfzeile für Unterseiten: Zurück, Titel, optional rechts. */
export function Kopf({ titel, rechts, schliessen }: { titel?: string; rechts?: ReactNode; schliessen?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + abstand(2),
        paddingHorizontal: RAND - 6,
        paddingBottom: abstand(2),
        flexDirection: "row",
        alignItems: "center",
        gap: abstand(2),
        backgroundColor: farben.grund,
      }}
    >
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
        hitSlop={10}
        accessibilityLabel={schliessen ? "Schließen" : "Zurück"}
        style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? farben.flaeche2 : "transparent" })}
      >
        <Ionicons name={schliessen ? "close" : "chevron-back"} size={24} color={farben.text} />
      </Pressable>
      <View style={{ flex: 1 }}>
        {titel ? (
          <T v="h3" numberOfLines={1}>
            {titel}
          </T>
        ) : null}
      </View>
      {rechts}
    </View>
  );
}

export function Trenner({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: farben.linie }, style]} />;
}
