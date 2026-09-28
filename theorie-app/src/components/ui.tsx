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
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { tippen } from "@/lib/haptik";
import { abstand, radius, RAND, schrift, useFarben, type Farbe } from "@/lib/theme";

export type IconName = keyof typeof Ionicons.glyphMap;

/** Hex-Farbe (#RRGGBB) mit Deckkraft – für getönte Flächen hinter Symbolen. */
export function getoent(farbe: string, deckkraft: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(farbe);
  if (!m) return farbe;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${deckkraft})`;
}

// ---------------------------------------------------------------------------
// Typografie
// ---------------------------------------------------------------------------

const VARIANTEN = {
  display: { stil: { ...schrift.titel, fontSize: 34, lineHeight: 40, letterSpacing: -0.6 }, farbe: "text" },
  titel: { stil: { ...schrift.titel, fontSize: 26, lineHeight: 31, letterSpacing: -0.4 }, farbe: "text" },
  h2: { stil: { ...schrift.titelFett, fontSize: 20, lineHeight: 25, letterSpacing: -0.25 }, farbe: "text" },
  h3: { stil: { ...schrift.titelHalb, fontSize: 17, lineHeight: 22, letterSpacing: -0.15 }, farbe: "text" },
  text: { stil: { ...schrift.text, fontSize: 15, lineHeight: 21 }, farbe: "text2" },
  textStark: { stil: { ...schrift.textHalb, fontSize: 15, lineHeight: 20 }, farbe: "text" },
  klein: { stil: { ...schrift.textMittel, fontSize: 13, lineHeight: 17 }, farbe: "text3" },
  mini: { stil: { ...schrift.textHalb, fontSize: 12, lineHeight: 15, letterSpacing: 0.6, textTransform: "uppercase" }, farbe: "text3" },
  zahl: { stil: { ...schrift.titel, fontSize: 26, lineHeight: 30, letterSpacing: -0.4, fontVariant: ["tabular-nums"] }, farbe: "text" },
} satisfies Record<string, { stil: TextStyle; farbe: Farbe }>;

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
  const f = useFarben();
  const variante = VARIANTEN[v];
  return (
    <Text
      numberOfLines={passend ? 1 : numberOfLines}
      adjustsFontSizeToFit={passend}
      minimumFontScale={passend ? 0.82 : undefined}
      selectable={selectable}
      style={[variante.stil, { color: farbe ?? f[variante.farbe] }, zentriert ? { textAlign: "center" } : null, style]}
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
  const f = useFarben();
  const basis: ViewStyle = {
    backgroundColor: f.flaeche,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: hervorgehoben ? f.orangeLinie : f.linie,
    padding: abstand(4),
  };
  if (!onPress) return <View style={[basis, style]}>{children}</View>;
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      style={({ pressed }) => [basis, { opacity: pressed ? 0.85 : 1 }, style]}
    >
      {children}
    </Pressable>
  );
}

/** Überschrift über einem Abschnitt, optional mit Aktion rechts. */
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
  const f = useFarben();
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: abstand(klein ? 2 : 3) }, style]}>
      {klein ? (
        <T v="mini" style={{ marginLeft: 4 }}>
          {titel}
        </T>
      ) : (
        <T v="h2">{titel}</T>
      )}
      {aktion && onAktion ? (
        <Pressable onPress={onAktion} hitSlop={10}>
          <T v="klein" farbe={f.orangeText} style={{ ...schrift.textHalb, fontSize: 14 }}>
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
  const f = useFarben();
  const hintergrund = { primaer: f.orange, sekundaer: f.flaeche2, geist: "transparent", gefahr: f.rotSoft }[art];
  const vorder = { primaer: f.aufOrange, sekundaer: f.text, geist: f.orangeText, gefahr: f.rot }[art];
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
          height: klein ? 44 : 52,
          borderRadius: klein ? 12 : 14,
          paddingHorizontal: abstand(5),
          backgroundColor: hintergrund,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: abstand(2),
          opacity: deaktiviert ? 0.4 : pressed ? 0.82 : 1,
        },
        style,
      ]}
    >
      {laedt ? (
        <ActivityIndicator color={vorder} />
      ) : (
        <>
          <Text style={{ ...schrift.textHalb, fontSize: klein ? 16 : 17, color: vorder }}>{titel}</Text>
          {icon ? <Icon name={icon} size={klein ? 16 : 18} color={vorder} /> : null}
        </>
      )}
    </Pressable>
  );
}

/** Runde Symbol-Plakette – getönt mit farbigem Symbol. */
export function Plakette({ icon, farbe, groesse = 40, gefuellt }: { icon: IconName; farbe?: string; groesse?: number; gefuellt?: boolean }) {
  const f = useFarben();
  const c = farbe ?? f.orange;
  return (
    <View
      style={{
        width: groesse,
        height: groesse,
        borderRadius: groesse / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: gefuellt ? c : getoent(c, 0.14),
      }}
    >
      <Icon name={icon} size={groesse * 0.5} color={gefuellt ? f.aufOrange : c} />
    </View>
  );
}

/** Abgerundetes Quadrat mit Symbol. */
export function IconQuadrat({ icon, groesse = 42, farbe }: { icon: IconName; groesse?: number; hell?: boolean; farbe?: string }) {
  const f = useFarben();
  return (
    <View
      style={{
        width: groesse,
        height: groesse,
        borderRadius: groesse * 0.26,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: farbe ? getoent(farbe, 0.14) : f.flaeche2,
      }}
    >
      <Icon name={icon} size={groesse * 0.5} color={farbe ?? f.text} weight="semibold" />
    </View>
  );
}

/** Drei ansteigende Säulen – das Statistik-Symbol. */
export function Saeulen({ groesse = 22, farbe }: { groesse?: number; farbe?: string }) {
  const f = useFarben();
  const b = Math.max(3, Math.round(groesse * 0.24));
  return (
    <View style={{ width: groesse, height: groesse, flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: Math.max(2, Math.round(groesse * 0.1)) }}>
      {[0.45, 0.72, 1].map((h, i) => (
        <View key={i} style={{ width: b, height: groesse * h, borderRadius: b / 3, backgroundColor: farbe ?? f.orange }} />
      ))}
    </View>
  );
}

/** Kleiner oranger Kreis mit Pfeil. */
export function PfeilKreis({ groesse = 28 }: { groesse?: number }) {
  const f = useFarben();
  return (
    <View style={{ width: groesse, height: groesse, borderRadius: groesse / 2, backgroundColor: f.orange, alignItems: "center", justifyContent: "center" }}>
      <Icon name="chevron-forward" size={groesse * 0.55} color={f.aufOrange} style={{ marginLeft: 1 }} />
    </View>
  );
}

export function Chip({ text, farbe, icon, aktiv, onPress }: { text: string; farbe?: string; icon?: IconName; aktiv?: boolean; onPress?: () => void }) {
  const f = useFarben();
  const vorder = aktiv ? f.aufOrange : farbe ?? f.text2;
  const inhalt = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        paddingHorizontal: abstand(3.5),
        height: 34,
        borderRadius: radius.voll,
        backgroundColor: aktiv ? f.orange : f.flaeche2,
      }}
    >
      {icon ? <Icon name={icon} size={14} color={vorder} /> : null}
      <Text style={{ ...schrift.textHalb, fontSize: 14, color: vorder }}>{text}</Text>
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
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      {inhalt}
    </Pressable>
  );
}

/** Umschalter im iOS-Stil: ruhige Kapsel, die Auswahl liegt als helle Fläche darauf. */
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
  const f = useFarben();
  const [breite, setBreite] = useState(0);
  const index = Math.max(0, optionen.findIndex((o) => o.id === wert));
  const x = useRef(new Animated.Value(index)).current;
  const teil = breite > 0 ? (breite - 6) / optionen.length : 0;

  useEffect(() => {
    Animated.spring(x, { toValue: index, useNativeDriver: true, damping: 22, stiffness: 240, mass: 0.7 }).start();
  }, [index, x]);

  return (
    <View
      onLayout={(e) => setBreite(e.nativeEvent.layout.width)}
      style={[{ flexDirection: "row", height: 38, padding: 3, borderRadius: 11, backgroundColor: f.flaeche2 }, style]}
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
            borderRadius: 8,
            backgroundColor: f.segmentAktiv,
            transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, teil] }) }],
            shadowColor: "#000",
            shadowOpacity: f.hell ? 0.1 : 0.3,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 1 },
          }}
        />
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
            <Text numberOfLines={1} style={{ ...(aktiv ? schrift.textHalb : schrift.textMittel), fontSize: 14.5, color: aktiv ? f.text : f.text2 }}>
              {o.titel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Balken({ wert, farbe, hoehe = 6, hintergrund }: { wert: number; farbe?: string; hoehe?: number; hintergrund?: string }) {
  const f = useFarben();
  const p = Math.max(0, Math.min(1, wert));
  return (
    <View style={{ height: hoehe, borderRadius: hoehe, backgroundColor: hintergrund ?? f.flaeche3, overflow: "hidden" }}>
      <View style={{ width: `${p * 100}%`, height: "100%", borderRadius: hoehe, backgroundColor: farbe ?? f.orange }} />
    </View>
  );
}

/** Listenzeile mit Symbol in getöntem Quadrat, Titel, Unterzeile und Wert/Pfeil. */
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
  punkt,
}: {
  icon?: IconName;
  iconFarbe?: string;
  /** Kleiner farbiger Status-Punkt links (statt eines Symbols). */
  punkt?: string;
  titel: string;
  unter?: string;
  wert?: string;
  onPress?: () => void;
  gefahr?: boolean;
  ohnePfeil?: boolean;
  rechts?: ReactNode;
  titelZeilen?: number;
}) {
  const f = useFarben();
  const symbolFarbe = gefahr ? f.rot : iconFarbe ?? f.text2;
  const inhalt = (pressed: boolean) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: abstand(3),
        minHeight: 54,
        paddingVertical: abstand(3),
        paddingHorizontal: abstand(4),
        backgroundColor: pressed ? f.flaeche2 : "transparent",
      }}
    >
      {punkt ? <View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: punkt, marginRight: -2 }} /> : null}
      {icon ? (
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: iconFarbe || gefahr ? getoent(symbolFarbe, 0.14) : f.flaeche2,
          }}
        >
          <Icon name={icon} size={17} color={symbolFarbe} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <T v="textStark" farbe={gefahr ? f.rot : undefined} numberOfLines={titelZeilen} style={{ ...schrift.textMittel, fontSize: 16, lineHeight: 21 }}>
          {titel}
        </T>
        {unter ? <T v="klein">{unter}</T> : null}
      </View>
      {wert ? (
        <T v="klein" farbe={f.text3} style={{ fontSize: 15 }}>
          {wert}
        </T>
      ) : null}
      {rechts}
      {onPress && !ohnePfeil ? <Icon name="chevron-forward" size={16} color={f.text4} /> : null}
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
  const f = useFarben();
  const kinder = (Array.isArray(children) ? children : [children]).flat().filter(Boolean);
  return (
    <View style={[{ backgroundColor: f.flaeche, borderRadius: radius.l, borderWidth: 1, borderColor: f.linie, overflow: "hidden" }, style]}>
      {kinder.map((kind, i) => (
        <View key={i}>
          {i > 0 ? <View style={{ height: 1, backgroundColor: f.linie, marginLeft: abstand(4) }} /> : null}
          {kind}
        </View>
      ))}
    </View>
  );
}

export function Avatar({ name, groesse = 44, farbe }: { name: string; groesse?: number; farbe?: string }) {
  const f = useFarben();
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
        backgroundColor: f.flaeche2,
        borderWidth: 1.5,
        borderColor: farbe ?? f.orange,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ ...schrift.titel, fontSize: groesse * 0.38, color: f.text }}>{kuerzel}</Text>
    </View>
  );
}

export function Eingabe({ icon, fehler, ...props }: TextInputProps & { icon?: IconName; fehler?: boolean }) {
  const f = useFarben();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: abstand(3),
        height: 52,
        paddingHorizontal: abstand(4),
        borderRadius: 14,
        backgroundColor: f.flaeche,
        borderWidth: 1,
        borderColor: fehler ? f.rot : f.linieStark,
      }}
    >
      {icon ? <Icon name={icon} size={18} color={f.text3} /> : null}
      <TextInput
        placeholderTextColor={f.text4}
        selectionColor={f.orange}
        keyboardAppearance={f.tastatur}
        {...props}
        style={[{ flex: 1, ...schrift.textMittel, fontSize: 16, color: f.text, height: "100%" }, props.style]}
      />
    </View>
  );
}

/**
 * Passwortfeld mit Auge zum Anzeigen – ohne Autokorrektur und automatische
 * Großschreibung, damit Registrierung und Anmeldung exakt gleich tippen.
 */
export function PasswortEingabe({ fehler, ...props }: TextInputProps & { fehler?: boolean }) {
  const f = useFarben();
  const [sichtbar, setSichtbar] = useState(false);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: abstand(3),
        height: 52,
        paddingLeft: abstand(4),
        paddingRight: abstand(1.5),
        borderRadius: 14,
        backgroundColor: f.flaeche,
        borderWidth: 1,
        borderColor: fehler ? f.rot : f.linieStark,
      }}
    >
      <Icon name="lock-closed-outline" size={18} color={f.text3} />
      <TextInput
        placeholderTextColor={f.text4}
        selectionColor={f.orange}
        keyboardAppearance={f.tastatur}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        textContentType="password"
        autoComplete="password"
        {...props}
        secureTextEntry={!sichtbar}
        style={[{ flex: 1, ...schrift.textMittel, fontSize: 16, color: f.text, height: "100%" }, props.style]}
      />
      <Pressable
        onPress={() => setSichtbar((v) => !v)}
        hitSlop={8}
        accessibilityLabel={sichtbar ? "Passwort verbergen" : "Passwort anzeigen"}
        style={{ width: 38, height: 38, alignItems: "center", justifyContent: "center" }}
      >
        <Icon name={sichtbar ? "eye-off-outline" : "eye-outline"} size={20} color={f.text3} />
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Seitenrahmen
// ---------------------------------------------------------------------------

/** Runde Taste für die Kopfzeile (Zurück, Suche, Merken …). */
export function KopfTaste({ icon, onPress, label, farbe }: { icon: IconName; onPress: () => void; label: string; farbe?: string }) {
  const f = useFarben();
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      hitSlop={10}
      accessibilityLabel={label}
      style={({ pressed }) => ({ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? f.flaeche2 : "transparent" })}
    >
      <Icon name={icon} size={23} color={farbe ?? f.text} />
    </Pressable>
  );
}

/** Kopf-Taste mit eigener Fläche: rund (Schließen) oder eckig (Merken) – für den Fragen-Bildschirm. */
export function KopfKnopf({
  icon,
  onPress,
  label,
  farbe,
  eckig,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  farbe?: string;
  eckig?: boolean;
}) {
  const f = useFarben();
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      hitSlop={8}
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: eckig ? 12 : 20,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? f.flaeche3 : f.flaeche2,
      })}
    >
      <Icon name={icon} size={19} color={farbe ?? f.text} />
    </Pressable>
  );
}

/** Abstand der Kopfzeile von oben – knapp unter der Statusleiste. */
export function kopfOben(inset: number): number {
  return Math.max(inset - 6, 10);
}

export function zurueck() {
  if (router.canGoBack()) router.back();
  else router.replace("/");
}

/**
 * Kopfzeile: Zurück links, Titel mittig, optional eine Taste rechts.
 * `ohneZurueck` blendet den Pfeil aus, `onZurueck` ersetzt ihn.
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
  const f = useFarben();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: kopfOben(insets.top), paddingHorizontal: RAND - 8, paddingBottom: abstand(1), backgroundColor: f.grund }}>
      <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        {titel ? (
          <View pointerEvents="none" style={{ position: "absolute", left: 56, right: 56, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <T v="h3" numberOfLines={1}>
              {titel}
            </T>
          </View>
        ) : null}
        <View style={{ minWidth: 44 }}>
          {ohneZurueck ? null : (
            <KopfTaste icon={schliessen ? "close" : "chevron-back"} label={schliessen ? "Schließen" : "Zurück"} onPress={onZurueck ?? zurueck} />
          )}
        </View>
        <View style={{ minWidth: 44, alignItems: "flex-end" }}>{rechts}</View>
      </View>
    </View>
  );
}

export function Trenner({ style }: { style?: StyleProp<ViewStyle> }) {
  const f = useFarben();
  return <View style={[{ height: 1, backgroundColor: f.linie }, style]} />;
}
