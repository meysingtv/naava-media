import { Children, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/lib/theme-context";
import { karte, radius, space } from "@/lib/theme";
import { initialen } from "@/lib/format";

const HAIRLINE = StyleSheet.hairlineWidth;

/** Bildschirm-Hintergrund (leicht getönt). */
export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors } = useTheme();
  return <View style={[{ flex: 1, backgroundColor: colors.bg }, style]}>{children}</View>;
}

/** Schlichte Kopfzeile für Unterseiten ohne Verlauf. */
export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + space(2), paddingHorizontal: space(5), paddingBottom: space(3) }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: space(3) }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 30, fontWeight: "800", color: colors.text }} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 2 }}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

/** Überschrift über einem Block. */
export function Ueberschrift({ children, rechts }: { children: ReactNode; rechts?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: space(2.5), marginTop: space(1) }}>
      <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>{children}</Text>
      {rechts}
    </View>
  );
}

/** Gruppierte Liste als Karte: optionaler Titel, Zeilen mit feinen Trennlinien. */
export function Section({
  title,
  footer,
  children,
  style,
}: {
  title?: string;
  footer?: string;
  children: ReactNode;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ marginBottom: space(6) }, style]}>
      {title ? (
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: colors.textMuted,
            marginLeft: space(1),
            marginBottom: space(2),
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          {title}
        </Text>
      ) : null}
      <View style={[karte(colors), { overflow: "hidden" }]}>
        {items.map((child, i) => (
          <View key={i}>
            {i > 0 ? <View style={{ height: HAIRLINE, backgroundColor: colors.separator, marginLeft: space(4) }} /> : null}
            {child}
          </View>
        ))}
      </View>
      {footer ? (
        <Text style={{ fontSize: 13, color: colors.textMuted, marginHorizontal: space(1), marginTop: space(2), lineHeight: 18 }}>{footer}</Text>
      ) : null}
    </View>
  );
}

/** Listenzeile innerhalb einer Section. */
export function Row({
  title,
  subtitle,
  value,
  leading,
  trailing,
  onPress,
  chevron,
  destructive,
  children,
}: {
  title?: string;
  subtitle?: string;
  value?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space(3), paddingHorizontal: space(4), paddingVertical: space(3.5), minHeight: 52 }}>
      {leading}
      {children ?? (
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 16, fontWeight: "500", color: destructive ? colors.danger : colors.text }} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ fontSize: 13, color: colors.textMuted }} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      )}
      {value ? (
        <Text style={{ fontSize: 16, color: colors.textMuted, maxWidth: "55%" }} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {trailing}
      {chevron ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ backgroundColor: pressed ? colors.cardAlt : "transparent" })}>
      {body}
    </Pressable>
  );
}

/** Farbige Marke als Pille. */
export function Badge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "accent" | "success" | "warning" | "danger" }) {
  const { colors } = useTheme();
  const c = { neutral: colors.textMuted, accent: colors.accent, success: colors.success, warning: colors.warning, danger: colors.danger }[tone];
  return (
    <View style={{ backgroundColor: c + "1F", paddingHorizontal: space(2.5), paddingVertical: 4, borderRadius: radius.full }}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: c }}>{label}</Text>
    </View>
  );
}

/** Farbige Symbol-Kachel (Icon auf getönter Fläche). */
export function IconKachel({ name, farbe, groesse = 40 }: { name: keyof typeof Ionicons.glyphMap; farbe: string; groesse?: number }) {
  return (
    <View
      style={{
        width: groesse,
        height: groesse,
        borderRadius: groesse * 0.32,
        backgroundColor: farbe + "1F",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={name} size={groesse * 0.5} color={farbe} />
    </View>
  );
}

export function Avatar({ vorname, nachname, farbe, size = 38 }: { vorname?: string | null; nachname?: string | null; farbe?: string; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: farbe ?? colors.accent,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: size * 0.38 }}>{initialen(vorname, nachname)}</Text>
    </View>
  );
}

export function ProgressBar({ value, max, color, hoehe = 8 }: { value: number; max: number; color?: string; hoehe?: number }) {
  const { colors } = useTheme();
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <View style={{ height: hoehe, borderRadius: radius.full, backgroundColor: colors.fill, overflow: "hidden" }}>
      <View style={{ height: "100%", width: `${pct}%`, backgroundColor: color ?? colors.accent, borderRadius: radius.full }} />
    </View>
  );
}

/** Umschalter als Pillenleiste – aktiver Teil in Akzentfarbe. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", backgroundColor: colors.fill, borderRadius: radius.full, padding: 3 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              paddingVertical: space(2.25),
              borderRadius: radius.full,
              alignItems: "center",
              backgroundColor: active ? colors.accent : "transparent",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "700", color: active ? colors.onAccent : colors.textMuted }} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = "filled",
  destructive,
  icon,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "filled" | "tinted" | "plain";
  destructive?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { colors } = useTheme();
  const tint = destructive ? colors.danger : colors.accent;

  if (variant === "plain") {
    return (
      <Pressable onPress={onPress} disabled={disabled || loading} style={{ paddingVertical: space(3), alignItems: "center" }}>
        <Text style={{ color: tint, fontSize: 17, fontWeight: "600", opacity: disabled ? 0.4 : 1 }}>{title}</Text>
      </Pressable>
    );
  }

  const bg = variant === "tinted" ? tint + "1A" : tint;
  const fg = variant === "tinted" ? tint : colors.onAccent;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => ({
        backgroundColor: bg,
        opacity: disabled || loading ? 0.5 : pressed ? 0.85 : 1,
        borderRadius: radius.lg,
        paddingVertical: space(4),
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
        gap: space(2),
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={19} color={fg} /> : null}
          <Text style={{ color: fg, fontSize: 17, fontWeight: "700" }}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Eingabefeld mit optionalem Symbol links. */
export function Input({ icon, ...props }: TextInputProps & { icon?: keyof typeof Ionicons.glyphMap }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space(3),
        backgroundColor: colors.cardAlt,
        borderRadius: radius.lg,
        paddingHorizontal: space(4),
      }}
    >
      {icon ? <Ionicons name={icon} size={19} color={colors.textMuted} /> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        {...props}
        style={[{ flex: 1, paddingVertical: space(4), fontSize: 17, color: colors.text }, props.style]}
      />
    </View>
  );
}

export function CenterInfo({ loading, text, error }: { loading?: boolean; text?: string; error?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: space(8), backgroundColor: colors.bg }}>
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <Text style={{ color: error ? colors.danger : colors.textMuted, textAlign: "center", fontSize: 15, lineHeight: 21 }}>{text}</Text>
      )}
    </View>
  );
}
