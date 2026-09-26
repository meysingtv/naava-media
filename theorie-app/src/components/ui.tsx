import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
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
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { tippen } from "@/lib/haptik";
import { abstand, farben, radius, RAND, schrift } from "@/lib/theme";

export type IconName = keyof typeof Ionicons.glyphMap;

// ---------------------------------------------------------------------------
// Typografie
// ---------------------------------------------------------------------------

const VARIANTEN = {
  display: { ...schrift.titel, fontSize: 32, lineHeight: 38, letterSpacing: -0.5, color: farben.text },
  titel: { ...schrift.titel, fontSize: 24, lineHeight: 29, letterSpacing: -0.4, color: farben.text },
  h2: { ...schrift.titelFett, fontSize: 19, lineHeight: 24, letterSpacing: -0.2, color: farben.text },
  h3: { ...schrift.titelFett, fontSize: 17, lineHeight: 22, letterSpacing: -0.1, color: farben.text },
  text: { ...schrift.text, fontSize: 15, lineHeight: 21, color: farben.text2 },
  textStark: { ...schrift.textHalb, fontSize: 15, lineHeight: 20, color: farben.text },
  klein: { ...schrift.textMittel, fontSize: 13, lineHeight: 17, color: farben.text3 },
  mini: { ...schrift.textHalb, fontSize: 11.5, lineHeight: 14, letterSpacing: 0.8, color: farben.text3, textTransform: "uppercase" },
  zahl: { ...schrift.titel, fontSize: 26, lineHeight: 30, letterSpacing: -0.4, color: farben.text, fontVariant: ["tabular-nums"] },
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
  passend,
}: {
  v?: TextVariante;
  farbe?: string;
  zentriert?: boolean;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  numberOfLines?: number;
  selectable?: boolean;
  /** Einzeilig und bei Platzmangel leicht verkleinern statt abschneiden. */
  passend?: boolean;
}) {
  return (
    <Text
      numberOfLines={passend ? 1 : numberOfLines}
      adjustsFontSizeToFit={passend}
      minimumFontScale={passend ? 0.82 : undefined}
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: hervorgehoben ? farben.orangeLinie : farben.linie,
    padding: abstand(4),
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

/** Überschrift über einem Abschnitt – fett wie in der Vorlage, optional mit Aktion rechts. */
export function Abschnitt({
  titel,
  aktion,
  onAktion,
  style,
  klein,
}: {
  titel: string;
  aktion?: string;
  onAktion?: () => void;
  style?: StyleProp<ViewStyle>;
  klein?: boolean;
}) {
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: abstand(3) }, style]}>
      {klein ? <T v="mini">{titel}</T> : <T v="h2" style={{ fontSize: 21 }}>{titel}</T>}
      {aktion && onAktion ? (
        <Pressable onPress={onAktion} hitSlop={10}>
          <T v="klein" farbe={farben.orange} style={{ ...schrift.textHalb }}>
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
  const hoehe = klein ? 44 : 52;
  const rund = klein ? 12 : 26;
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      disabled={aus}
      style={({ pressed }) => [
        {
          height: hoehe,
          borderRadius: rund,
          paddingHorizontal: abstand(5),
          backgroundColor: hintergrund,
          borderWidth: art === "sekundaer" ? 1 : 0,
          borderColor: farben.linieStark,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: abstand(2),
          opacity: deaktiviert ? 0.4 : pressed ? 0.88 : 1,
          transform: [{ scale: pressed && !aus ? 0.985 : 1 }],
        },
        art === "primaer" && !deaktiviert
          ? { shadowColor: farben.orange, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }
          : null,
        style,
      ]}
    >
      {art === "primaer" ? (
        <LinearGradient
          colors={["#FF8418", farben.orange, farben.orangeTief]}
          locations={[0, 0.55, 1]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: rund }}
          pointerEvents="none"
        />
      ) : null}
      {laedt ? (
        <ActivityIndicator color={vorder} />
      ) : (
        <>
          <Text style={{ ...schrift.textHalb, fontSize: klein ? 16 : 18, color: vorder }}>{titel}</Text>
          {icon ? <Icon name={icon} size={klein ? 17 : 19} color={vorder} /> : null}
        </>
      )}
    </Pressable>
  );
}

/** Runde Symbol-Plakette – dunkel getönt mit farbigem Symbol. */
export function Plakette({ icon, farbe = farben.orange, groesse = 40, gefuellt }: { icon: IconName; farbe?: string; groesse?: number; gefuellt?: boolean }) {
  return (
    <View
      style={{
        width: groesse,
        height: groesse,
        borderRadius: groesse / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: gefuellt ? farbe : farbe + "24",
      }}
    >
      <Icon name={icon} size={groesse * 0.5} color={gefuellt ? farben.aufOrange : farbe} />
    </View>
  );
}

/** Weißes, abgerundetes Quadrat mit dunklem Symbol – wie auf den Foto-Kacheln. */
export function IconQuadrat({ icon, groesse = 42, hell = true }: { icon: IconName; groesse?: number; hell?: boolean }) {
  return (
    <View
      style={{
        width: groesse,
        height: groesse,
        borderRadius: groesse * 0.28,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: hell ? farben.kachelWeiss : "rgba(20,24,30,0.9)",
        borderWidth: hell ? 0 : 1,
        borderColor: farben.linieStark,
      }}
    >
      <Icon name={icon} size={groesse * 0.52} color={hell ? "#2B2520" : farben.text} weight="semibold" />
    </View>
  );
}

/** Drei ansteigende Säulen – das Statistik-Symbol der Vorlage. */
export function Saeulen({ groesse = 22, farbe = farben.orange }: { groesse?: number; farbe?: string }) {
  const b = Math.max(3, Math.round(groesse * 0.24));
  return (
    <View style={{ width: groesse, height: groesse, flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: Math.max(2, Math.round(groesse * 0.1)) }}>
      {[0.45, 0.72, 1].map((h, i) => (
        <View key={i} style={{ width: b, height: groesse * h, borderRadius: b / 3, backgroundColor: farbe }} />
      ))}
    </View>
  );
}

/** Kleiner oranger Kreis mit Pfeil – die „Los“-Taste auf Kacheln. */
export function PfeilKreis({ groesse = 28 }: { groesse?: number }) {
  return (
    <View
      style={{
        width: groesse,
        height: groesse,
        borderRadius: groesse / 2,
        backgroundColor: farben.orange,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: farben.orange,
        shadowOpacity: 0.5,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <Icon name="chevron-forward" size={groesse * 0.55} color="#FFFFFF" style={{ marginLeft: 1 }} />
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
        height: 32,
        borderRadius: radius.voll,
        backgroundColor: aktiv ? farben.orange : farben.flaeche2,
        borderWidth: 1,
        borderColor: aktiv ? farben.orange : farben.linie,
      }}
    >
      {icon ? <Icon name={icon} size={14} color={aktiv ? farben.aufOrange : farbe} /> : null}
      <Text style={{ ...schrift.textHalb, fontSize: 13, color: aktiv ? farben.aufOrange : farbe }}>{text}</Text>
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

/** Umschalter wie in der Vorlage: dunkle Kapsel, aktive Auswahl als orange Pille. */
export function Segment<W extends string>({
  optionen,
  wert,
  onWechsel,
  style,
}: {
  optionen: { id: W; titel: string }[];
  wert: W;
  onWechsel: (w: W) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const [breite, setBreite] = useState(0);
  const index = Math.max(0, optionen.findIndex((o) => o.id === wert));
  const x = useRef(new Animated.Value(index)).current;
  const teil = breite > 0 ? (breite - 6) / optionen.length : 0;

  useEffect(() => {
    Animated.spring(x, { toValue: index, useNativeDriver: true, damping: 20, stiffness: 220, mass: 0.7 }).start();
  }, [index, x]);

  return (
    <View
      onLayout={(e) => setBreite(e.nativeEvent.layout.width)}
      style={[
        { flexDirection: "row", height: 40, padding: 3, borderRadius: 20, backgroundColor: farben.flaeche2, borderWidth: 1, borderColor: farben.linie },
        style,
      ]}
    >
      {teil > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 3,
            bottom: 3,
            left: 3,
            width: teil,
            borderRadius: 17,
            overflow: "hidden",
            transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, teil] }) }],
            shadowColor: farben.orange,
            shadowOpacity: 0.4,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 3 },
          }}
        >
          <LinearGradient colors={["#FFA022", farben.orangeHell]} style={{ flex: 1, borderRadius: 17 }} />
        </Animated.View>
      ) : null}
      {optionen.map((o) => {
        const aktiv = o.id === wert;
        return (
          <Pressable
            key={o.id}
            onPress={() => {
              if (aktiv) return;
              tippen();
              onWechsel(o.id);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: aktiv }}
            style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ ...(aktiv ? schrift.textHalb : schrift.text), fontSize: 15, color: aktiv ? "#FFFFFF" : farben.text2 }}>{o.titel}</Text>
          </Pressable>
        );
      })}
    </View>
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
      {icon ? <Icon name={icon} size={20} color={gefahr ? farben.rot : iconFarbe ?? farben.text2} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <T v="textStark" farbe={gefahr ? farben.rot : undefined} numberOfLines={titelZeilen}>
          {titel}
        </T>
        {unter ? <T v="klein">{unter}</T> : null}
      </View>
      {wert ? <T v="klein" farbe={farben.text2}>{wert}</T> : null}
      {rechts}
      {onPress && !ohnePfeil ? <Icon name="chevron-forward" size={17} color={farben.text4} /> : null}
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
    <View style={[{ backgroundColor: farben.flaeche, borderRadius: 16, borderWidth: 1, borderColor: farben.linie, overflow: "hidden" }, style]}>
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
      <Text style={{ ...schrift.titel, fontSize: groesse * 0.38, color: farben.text }}>{kuerzel}</Text>
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
      {icon ? <Icon name={icon} size={19} color={farben.text3} /> : null}
      <TextInput
        placeholderTextColor={farben.text4}
        selectionColor={farben.orange}
        keyboardAppearance="dark"
        {...props}
        style={[{ flex: 1, ...schrift.textMittel, fontSize: 16, color: farben.text, height: "100%" }, props.style]}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Seitenrahmen
// ---------------------------------------------------------------------------

/** Runde Taste für die Kopfzeile (Zurück, Suche, Merken …). */
export function KopfTaste({ icon, onPress, label, farbe = farben.text }: { icon: IconName; onPress: () => void; label: string; farbe?: string }) {
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      hitSlop={10}
      accessibilityLabel={label}
      style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? farben.flaeche2 : "transparent" })}
    >
      <Icon name={icon} size={24} color={farbe} />
    </Pressable>
  );
}

/** Abstand der Kopfzeile von oben – knapp unter der Statusleiste wie in der Vorlage. */
export function kopfOben(inset: number): number {
  return Math.max(inset - 6, 10);
}

export function zurueck() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

/**
 * Kopfzeile wie in der Vorlage: Pfeil links, Titel mittig, optional eine
 * Taste rechts. `ohneZurueck` blendet den Pfeil aus, `onZurueck` ersetzt ihn.
 */
export function Kopf({
  titel,
  rechts,
  schliessen,
  ohneZurueck,
  onZurueck,
}: {
  titel?: string;
  rechts?: ReactNode;
  schliessen?: boolean;
  ohneZurueck?: boolean;
  onZurueck?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: kopfOben(insets.top), paddingHorizontal: RAND - 8, paddingBottom: abstand(1), backgroundColor: farben.grund }}>
      <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        {titel ? (
          <View pointerEvents="none" style={{ position: "absolute", left: 56, right: 56, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <T v="h3" numberOfLines={1} style={{ fontSize: 19 }}>
              {titel}
            </T>
          </View>
        ) : null}
        <View style={{ minWidth: 44 }}>
          {ohneZurueck ? null : <KopfTaste icon={schliessen ? "close" : "arrow-back"} label={schliessen ? "Schließen" : "Zurück"} onPress={onZurueck ?? zurueck} />}
        </View>
        <View style={{ minWidth: 44, alignItems: "flex-end" }}>{rechts}</View>
      </View>
    </View>
  );
}

export function Trenner({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: farben.linie }, style]} />;
}
