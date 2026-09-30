import { useEffect, useRef, useState, type ReactNode } from "react";
import {
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

import { Glas } from "@/components/glas";
import { Icon } from "@/components/icon";
import { Lader } from "@/components/lader";
import { farbeFuer, useFarbwelt, type Farbwelt } from "@/lib/darstellung";
import { tippen } from "@/lib/haptik";
import { abstand, farben, leuchten, mitDeckkraft, RAND, schrift, verlauf } from "@/lib/theme";

// Grundbausteine im Kino-Look. Alle richten sich nach der Farbwelt des
// Bereichs (useFarbwelt): auf hellen Seiten weiße Karten mit weichem Schatten,
// auf dunklen dunkle Flächen mit feiner Kante. Knöpfe oben sind aus Glas.

export type IconName = keyof typeof Ionicons.glyphMap;

const FUELLEN = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;

/** Karte: hell weiß mit Schatten, dunkel mit feiner Kante. */
export function kartenFlaeche(f: Farbwelt): ViewStyle {
  return f.hell ? { backgroundColor: "#FFFFFF", ...leuchten("#3C2C18", 0.07, 12, 4) } : { backgroundColor: f.flaeche, borderWidth: 1, borderColor: f.linie };
}

/** Nur „#RRGGBB“ lässt sich abtönen – alles andere bleibt, wie es ist. */
function istHex(farbe: string | undefined): farbe is string {
  return !!farbe && /^#[0-9a-fA-F]{6}$/.test(farbe);
}

// ---------------------------------------------------------------------------
// Typografie
// ---------------------------------------------------------------------------

const VARIANTEN = {
  display: { ...schrift.titel, fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
  titel: { ...schrift.titel, fontSize: 24, lineHeight: 29, letterSpacing: -0.4 },
  h2: { ...schrift.titelFett, fontSize: 19, lineHeight: 24, letterSpacing: -0.2 },
  h3: { ...schrift.titelFett, fontSize: 17, lineHeight: 22, letterSpacing: -0.1 },
  text: { ...schrift.text, fontSize: 15, lineHeight: 21 },
  textStark: { ...schrift.textHalb, fontSize: 15, lineHeight: 20 },
  klein: { ...schrift.textMittel, fontSize: 13, lineHeight: 17 },
  mini: { ...schrift.textHalb, fontSize: 11.5, lineHeight: 14, letterSpacing: 0.8, textTransform: "uppercase" },
  zahl: { ...schrift.titel, fontSize: 26, lineHeight: 30, letterSpacing: -0.4, fontVariant: ["tabular-nums"] },
} satisfies Record<string, TextStyle>;

export type TextVariante = keyof typeof VARIANTEN;

const TEXTFARBE: Record<TextVariante, "text" | "text2" | "text3"> = {
  display: "text",
  titel: "text",
  h2: "text",
  h3: "text",
  text: "text2",
  textStark: "text",
  klein: "text3",
  mini: "text3",
  zahl: "text",
};

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
  const f = useFarbwelt();
  return (
    <Text
      numberOfLines={passend ? 1 : numberOfLines}
      adjustsFontSizeToFit={passend}
      minimumFontScale={passend ? 0.82 : undefined}
      selectable={selectable}
      style={[VARIANTEN[v], { color: farbeFuer(f, farbe) ?? f[TEXTFARBE[v]] }, zentriert ? { textAlign: "center" } : null, style]}
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
  const f = useFarbwelt();
  const basis: StyleProp<ViewStyle> = [
    { borderRadius: 22, padding: abstand(4) },
    kartenFlaeche(f),
    hervorgehoben ? { borderWidth: 1.5, borderColor: mitDeckkraft(f.orange, 0.55) } : null,
  ];
  if (!onPress) return <View style={[basis, style]}>{children}</View>;
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      style={({ pressed }) => [basis, { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }, style]}
    >
      {children}
    </Pressable>
  );
}

/** Überschrift über einem Abschnitt – groß und fett wie auf Home, optional mit Link rechts. */
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
  const f = useFarbwelt();
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: abstand(3) }, style]}>
      {klein ? <T v="mini">{titel}</T> : <Text style={{ ...schrift.titel, fontSize: 21, lineHeight: 26, color: f.text }}>{titel}</Text>}
      {aktion && onAktion ? (
        <Pressable
          onPress={() => {
            tippen();
            onAktion();
          }}
          hitSlop={10}
          style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
        >
          <Text style={{ ...schrift.text, fontSize: 15, color: f.text2 }}>{aktion}</Text>
          <Icon name="chevron-forward" size={15} color={f.text2} />
        </Pressable>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Bedienelemente
// ---------------------------------------------------------------------------

type KnopfArt = "primaer" | "sekundaer" | "geist" | "gefahr";

/**
 * Knopf als Kapsel: „primaer“ orange mit Verlauf und Schein, „sekundaer“ aus
 * Glas, „geist“ nur Schrift, „gefahr“ rot getönt.
 */
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
  const f = useFarbwelt();
  const rot = f.hell ? "#E5392C" : farben.rot;
  const vorder = { primaer: "#FFFFFF", sekundaer: f.text, geist: f.orange, gefahr: rot }[art];
  const aus = deaktiviert || laedt;
  const hoehe = klein ? 44 : 54;
  const rund = hoehe / 2;
  const flaeche: ViewStyle = { flex: 1, borderRadius: rund, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: abstand(2), paddingHorizontal: abstand(5) };
  const inhalt = laedt ? (
    <Lader color={vorder} />
  ) : (
    <>
      <Text style={{ ...schrift.textHalb, fontSize: klein ? 15.5 : 17, color: vorder }} numberOfLines={1}>
        {titel}
      </Text>
      {icon ? <Icon name={icon} size={klein ? 16 : 18} color={vorder} weight="semibold" /> : null}
    </>
  );
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      disabled={aus}
      accessibilityRole="button"
      accessibilityLabel={titel}
      style={({ pressed }) => [
        { height: hoehe, borderRadius: rund, opacity: deaktiviert ? 0.4 : 1, transform: [{ scale: pressed && !aus ? 0.98 : 1 }] },
        art === "primaer" && !deaktiviert ? leuchten(f.orange, f.hell ? 0.3 : 0.4, 14, 5) : art === "sekundaer" && f.hell ? leuchten("#3C2C18", 0.08, 10, 3) : null,
        style,
      ]}
    >
      {art === "sekundaer" ? (
        <Glas hell={f.hell} style={flaeche}>
          {inhalt}
        </Glas>
      ) : (
        <View style={[flaeche, { overflow: "hidden", backgroundColor: art === "gefahr" ? mitDeckkraft(rot, f.hell ? 0.1 : 0.15) : "transparent" }]}>
          {art === "primaer" ? (
            <>
              <LinearGradient colors={verlauf.knopf} locations={[0, 0.5, 1]} style={FUELLEN} pointerEvents="none" />
              <LinearGradient colors={verlauf.knopfSchein} locations={[0, 0.1, 0.25, 0.36]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={FUELLEN} pointerEvents="none" />
            </>
          ) : null}
          {inhalt}
        </View>
      )}
    </Pressable>
  );
}

/** Runde Symbol-Plakette – getönt mit farbigem Symbol. */
export function Plakette({ icon, farbe = farben.orange, groesse = 40, gefuellt }: { icon: IconName; farbe?: string; groesse?: number; gefuellt?: boolean }) {
  const f = useFarbwelt();
  const c = farbeFuer(f, farbe) ?? farbe;
  return (
    <View
      style={{
        width: groesse,
        height: groesse,
        borderRadius: groesse / 2,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: gefuellt ? c : istHex(c) ? mitDeckkraft(c, f.hell ? 0.12 : 0.15) : c + "24",
      }}
    >
      <Icon name={icon} size={groesse * 0.5} color={gefuellt ? "#FFFFFF" : c} />
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
        ...leuchten(farben.orange, 0.5, 8, 2),
      }}
    >
      <Icon name="chevron-forward" size={groesse * 0.55} color="#FFFFFF" style={{ marginLeft: 1 }} />
    </View>
  );
}

/** Pille zum Auswählen oder als Kennzeichen – aktiv mit orangem Verlauf. */
export function Chip({ text, farbe, icon, aktiv, onPress }: { text: string; farbe?: string; icon?: IconName; aktiv?: boolean; onPress?: () => void }) {
  const f = useFarbwelt();
  const c = farbeFuer(f, farbe) ?? f.text2;
  const inhalt = (
    <View
      style={[
        { height: 34, borderRadius: 17 },
        aktiv
          ? leuchten(f.orange, f.hell ? 0.28 : 0.4, 8, 2)
          : f.hell
            ? { backgroundColor: "#FFFFFF", ...leuchten("#3C2C18", 0.06, 6, 2) }
            : { backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
      ]}
    >
      {aktiv ? <LinearGradient colors={verlauf.chip} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[FUELLEN, { borderRadius: 17 }]} /> : null}
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 13 }}>
        {icon ? <Icon name={icon} size={14} color={aktiv ? "#FFFFFF" : c} /> : null}
        <Text style={{ ...schrift.textHalb, fontSize: 13.5, color: aktiv ? "#FFFFFF" : c }}>{text}</Text>
      </View>
    </View>
  );
  if (!onPress) return inhalt;
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: !!aktiv }}
      hitSlop={6}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}
    >
      {inhalt}
    </Pressable>
  );
}

/** Umschalter: Kapsel, aktive Auswahl als orange Pille, die hinübergleitet. */
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
  const f = useFarbwelt();
  const [breite, setBreite] = useState(0);
  const index = Math.max(0, optionen.findIndex((o) => o.id === wert));
  const x = useRef(new Animated.Value(index)).current;
  const teil = breite > 0 ? (breite - 8) / optionen.length : 0;

  useEffect(() => {
    Animated.spring(x, { toValue: index, useNativeDriver: true, damping: 20, stiffness: 220, mass: 0.7 }).start();
  }, [index, x]);

  return (
    <View
      onLayout={(e) => setBreite(e.nativeEvent.layout.width)}
      style={[
        { flexDirection: "row", height: 44, padding: 4, borderRadius: 22 },
        f.hell ? { backgroundColor: "#FFFFFF", ...leuchten("#3C2C18", 0.07, 10, 3) } : { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: f.linie },
        style,
      ]}
    >
      {teil > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 4,
            bottom: 4,
            left: 4,
            width: teil,
            borderRadius: 18,
            transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, teil] }) }],
            ...leuchten(f.orange, f.hell ? 0.3 : 0.4, 10, 3),
          }}
        >
          <LinearGradient colors={verlauf.segment} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1, borderRadius: 18 }} />
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
            <Text style={{ ...(aktiv ? schrift.textHalb : schrift.textMittel), fontSize: 15, color: aktiv ? "#FFFFFF" : f.text2 }}>{o.titel}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Balken({ wert, farbe, hoehe = 6, hintergrund }: { wert: number; farbe?: string; hoehe?: number; hintergrund?: string }) {
  const f = useFarbwelt();
  const p = Math.max(0, Math.min(1, wert));
  return (
    <View style={{ height: hoehe, borderRadius: hoehe, backgroundColor: hintergrund ?? (f.hell ? "rgba(20,23,27,0.08)" : farben.flaeche3), overflow: "hidden" }}>
      <View style={{ width: `${p * 100}%`, height: "100%", borderRadius: hoehe, backgroundColor: farbeFuer(f, farbe) ?? f.orange }} />
    </View>
  );
}

/**
 * Listenzeile: Symbol in einem runden Quadrat (farbig mit weißem Symbol, sonst
 * ruhig getönt), Titel, Unterzeile und rechts Wert oder Pfeil.
 */
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
  const f = useFarbwelt();
  const rot = f.hell ? "#E5392C" : farben.rot;
  const farbe = gefahr ? rot : farbeFuer(f, iconFarbe);
  const inhalt = (pressed: boolean) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 13,
        minHeight: 58,
        paddingVertical: 11,
        paddingHorizontal: 14,
        backgroundColor: pressed ? (f.hell ? "rgba(20,23,27,0.04)" : "rgba(255,255,255,0.04)") : "transparent",
      }}
    >
      {icon ? (
        istHex(farbe) ? (
          <LinearGradient colors={[mitDeckkraft(farbe, 0.95), mitDeckkraft(farbe, 0.72)]} style={{ width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" }}>
            <Icon name={icon} size={17} color="#FFFFFF" />
          </LinearGradient>
        ) : (
          <View style={{ width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: f.hell ? "#F1EDE6" : "rgba(255,255,255,0.07)" }}>
            <Icon name={icon} size={17} color={farbe ?? f.text2} />
          </View>
        )
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ ...schrift.textHalb, fontSize: 15.5, lineHeight: 20, color: gefahr ? rot : f.text }} numberOfLines={titelZeilen}>
          {titel}
        </Text>
        {unter ? <Text style={{ ...schrift.text, fontSize: 13, lineHeight: 17, color: f.text3 }}>{unter}</Text> : null}
      </View>
      {wert ? <Text style={{ ...schrift.textMittel, fontSize: 13.5, color: f.text2, fontVariant: ["tabular-nums"] }}>{wert}</Text> : null}
      {rechts}
      {onPress && !ohnePfeil ? <Icon name="chevron-forward" size={16} color={f.text3} /> : null}
    </View>
  );
  if (!onPress) return inhalt(false);
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={unter ? `${titel}, ${unter}` : titel}
    >
      {({ pressed }) => inhalt(pressed)}
    </Pressable>
  );
}

/** Gruppe von Zeilen in einer Karte mit Haarlinien dazwischen. */
export function Gruppe({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  const kinder = (Array.isArray(children) ? children : [children]).flat().filter(Boolean);
  return (
    <View style={[{ borderRadius: 22 }, kartenFlaeche(f), style]}>
      <View style={{ borderRadius: 22, overflow: "hidden" }}>
        {kinder.map((kind, i) => (
          <View key={i}>
            {i > 0 ? <View style={{ height: 1, backgroundColor: f.linie, marginLeft: 14 }} /> : null}
            {kind}
          </View>
        ))}
      </View>
    </View>
  );
}

export function Avatar({ name, groesse = 44, farbe = farben.orange }: { name: string; groesse?: number; farbe?: string }) {
  const f = useFarbwelt();
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
        borderColor: farbe,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ ...schrift.titel, fontSize: groesse * 0.38, color: f.text }}>{kuerzel}</Text>
    </View>
  );
}

/** Rahmen eines Eingabefelds – hell weiß mit Schatten, dunkel mit Kante. */
function feldStil(f: Farbwelt, fehler?: boolean): ViewStyle {
  const rot = f.hell ? "#E5392C" : farben.rot;
  return {
    flexDirection: "row",
    alignItems: "center",
    gap: abstand(3),
    height: 54,
    borderRadius: 18,
    backgroundColor: f.hell ? "#FFFFFF" : f.flaeche,
    borderWidth: 1,
    borderColor: fehler ? rot : f.hell ? "rgba(20,23,27,0.1)" : farben.linieStark,
    ...(f.hell ? leuchten("#3C2C18", 0.05, 8, 2) : null),
  };
}

export function Eingabe({ icon, fehler, ...props }: TextInputProps & { icon?: IconName; fehler?: boolean }) {
  const f = useFarbwelt();
  return (
    <View style={[feldStil(f, fehler), { paddingHorizontal: abstand(4) }]}>
      {icon ? <Icon name={icon} size={19} color={f.text3} /> : null}
      <TextInput
        placeholderTextColor={f.hell ? "#A3A8AF" : farben.text4}
        selectionColor={f.orange}
        cursorColor={f.orange}
        selectionHandleColor={f.orange}
        keyboardAppearance={f.hell ? "light" : "dark"}
        {...props}
        style={[{ flex: 1, minWidth: 0, ...schrift.textMittel, fontSize: 16, color: f.text, height: "100%" }, props.style]}
      />
    </View>
  );
}

/**
 * Passwortfeld mit Auge zum Anzeigen – ohne Autokorrektur und automatische
 * Großschreibung, damit Registrierung und Anmeldung exakt gleich tippen.
 */
export function PasswortEingabe({ fehler, ...props }: TextInputProps & { fehler?: boolean }) {
  const f = useFarbwelt();
  const [sichtbar, setSichtbar] = useState(false);
  return (
    <View style={[feldStil(f, fehler), { paddingLeft: abstand(4), paddingRight: abstand(1.5) }]}>
      <Icon name="lock-closed-outline" size={19} color={f.text3} />
      <TextInput
        placeholderTextColor={f.hell ? "#A3A8AF" : farben.text4}
        selectionColor={f.orange}
        cursorColor={f.orange}
        selectionHandleColor={f.orange}
        keyboardAppearance={f.hell ? "light" : "dark"}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        textContentType="password"
        autoComplete="password"
        {...props}
        secureTextEntry={!sichtbar}
        style={[{ flex: 1, minWidth: 0, ...schrift.textMittel, fontSize: 16, color: f.text, height: "100%" }, props.style]}
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

/** Runde Glas-Taste für die Kopfzeile (Zurück, Suche, Merken …). */
export function KopfTaste({ icon, onPress, label, farbe }: { icon: IconName; onPress: () => void; label: string; farbe?: string }) {
  const f = useFarbwelt();
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.92 : 1 }] })}
    >
      <Glas hell={f.hell} style={[{ width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" }, f.hell ? leuchten("#3C2C18", 0.08, 8, 2) : null]}>
        <Icon name={icon} size={19} color={farbeFuer(f, farbe) ?? f.text} weight="semibold" />
      </Glas>
    </Pressable>
  );
}

/** Kopf-Taste aus Glas: rund (Schließen) oder eckig (Merken). */
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
  const f = useFarbwelt();
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.92 : 1 }] })}
    >
      <Glas hell={f.hell} style={[{ width: 42, height: 42, borderRadius: eckig ? 14 : 21, alignItems: "center", justifyContent: "center" }, f.hell ? leuchten("#3C2C18", 0.08, 8, 2) : null]}>
        <Icon name={icon} size={19} color={farbeFuer(f, farbe) ?? f.text} weight="semibold" />
      </Glas>
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
 * Kopfzeile: Glas-Taste links (Zurück oder Schließen), Titel mittig, optional
 * etwas rechts. `ohneZurueck` blendet die Taste aus, `onZurueck` ersetzt sie.
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
  const f = useFarbwelt();
  return (
    <View style={{ paddingTop: kopfOben(insets.top), paddingHorizontal: RAND, paddingBottom: abstand(2), backgroundColor: f.grund }}>
      <View style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        {titel ? (
          <View pointerEvents="none" style={{ position: "absolute", left: 58, right: 58, top: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ ...schrift.titelFett, fontSize: 17, color: f.text }} numberOfLines={1}>
              {titel}
            </Text>
          </View>
        ) : null}
        <View style={{ minWidth: 44 }}>
          {ohneZurueck ? null : <KopfTaste icon={schliessen ? "close" : "chevron-back"} label={schliessen ? "Schließen" : "Zurück"} onPress={onZurueck ?? zurueck} />}
        </View>
        <View style={{ minWidth: 44, alignItems: "flex-end" }}>{rechts}</View>
      </View>
    </View>
  );
}

export function Trenner({ style }: { style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  return <View style={[{ height: 1, backgroundColor: f.linie }, style]} />;
}
