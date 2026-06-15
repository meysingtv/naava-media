import { Children, type ReactNode } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/lib/theme-context";
import { radius, space } from "@/lib/theme";
import { initialen } from "@/lib/format";

const HAIRLINE = StyleSheet.hairlineWidth;

/** Bildschirm-Hintergrund. */
export function Screen({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const { colors } = useTheme();
  return <View style={[{ flex: 1, backgroundColor: colors.bg }, style]}>{children}</View>;
}

/** Fixierte Kopfzeile: großer Titel links, optionaler Button rechts (mit Safe-Area). */
export function ScreenHeader({
  title,
  subtitle,
  right,
  logo,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  logo?: ImageSourcePropType;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + space(2),
        paddingHorizontal: space(4),
        paddingBottom: space(3),
        gap: space(2),
      }}
    >
      {logo ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Image source={logo} style={{ width: 36, height: 36, borderRadius: 8 }} resizeMode="contain" />
          {right}
        </View>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: space(3) }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 30, fontWeight: "700", color: colors.text }} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 2 }}>{subtitle}</Text> : null}
        </View>
        {logo ? null : right}
      </View>
    </View>
  );
}

/** Gruppierte Liste (iOS „inset grouped"): optionaler Titel + Karte mit Trenn-Hairlines. */
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
            color: colors.textMuted,
            marginLeft: space(4),
            marginBottom: space(2),
            textTransform: "uppercase",
            letterSpacing: 0.3,
          }}
        >
          {title}
        </Text>
      ) : null}
      <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, overflow: "hidden" }}>
        {items.map((child, i) => (
          <View key={i}>
            {i > 0 ? (
              <View style={{ height: HAIRLINE, backgroundColor: colors.separator, marginLeft: space(4) }} />
            ) : null}
            {child}
          </View>
        ))}
      </View>
      {footer ? (
        <Text style={{ fontSize: 13, color: colors.textMuted, marginHorizontal: space(4), marginTop: space(2) }}>
          {footer}
        </Text>
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
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: space(3),
        paddingHorizontal: space(4),
        paddingVertical: space(3),
        minHeight: 48,
      }}
    >
      {leading}
      {children ?? (
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ fontSize: 16, color: destructive ? colors.danger : colors.text }} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ fontSize: 13, color: colors.textMuted }} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      )}
      {value ? (
        <Text style={{ fontSize: 16, color: colors.textMuted, maxWidth: "50%" }} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {trailing}
      {chevron ? <Ionicons name="chevron-forward" size={17} color={colors.textMuted} /> : null}
    </View>
  );

  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ backgroundColor: pressed ? colors.cardAlt : "transparent" })}>
      {body}
    </Pressable>
  );
}

export function Badge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "accent" | "success" | "warning" | "danger" }) {
  const { colors } = useTheme();
  const map = {
    neutral: colors.textMuted,
    accent: colors.accent,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  } as const;
  const c = map[tone];
  return (
    <View style={{ backgroundColor: c + "22", paddingHorizontal: space(2), paddingVertical: 3, borderRadius: radius.sm }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: c }}>{label}</Text>
    </View>
  );
}

export function Avatar({
  vorname,
  nachname,
  farbe,
  size = 38,
}: {
  vorname?: string | null;
  nachname?: string | null;
  farbe?: string;
  size?: number;
}) {
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
      <Text style={{ color: "#FFFFFF", fontWeight: "600", fontSize: size * 0.38 }}>{initialen(vorname, nachname)}</Text>
    </View>
  );
}

export function ProgressBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const { colors } = useTheme();
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <View style={{ height: 6, borderRadius: radius.full, backgroundColor: colors.fill, overflow: "hidden" }}>
      <View style={{ height: "100%", width: `${pct}%`, backgroundColor: color ?? colors.accent }} />
    </View>
  );
}

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
    <View style={{ flexDirection: "row", backgroundColor: colors.fill, borderRadius: radius.md, padding: 2 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              paddingVertical: space(2),
              borderRadius: radius.sm,
              alignItems: "center",
              backgroundColor: active ? colors.card : "transparent",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: active ? "600" : "500", color: colors.text }}>{o.label}</Text>
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
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "filled" | "tinted" | "plain";
  destructive?: boolean;
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

  const bg = variant === "tinted" ? tint + "1F" : tint;
  const fg = variant === "tinted" ? tint : colors.onAccent;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={{
        backgroundColor: bg,
        opacity: disabled || loading ? 0.5 : 1,
        borderRadius: radius.lg,
        paddingVertical: space(3.5),
        alignItems: "center",
      }}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontSize: 17, fontWeight: "600" }}>{title}</Text>}
    </Pressable>
  );
}

/** Eigenständiges Eingabefeld (außerhalb gruppierter Formulare). */
export function Input(props: TextInputProps) {
  const { colors } = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      {...props}
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radius.md,
          paddingHorizontal: space(4),
          paddingVertical: space(3.5),
          fontSize: 17,
          color: colors.text,
        },
        props.style,
      ]}
    />
  );
}

export function CenterInfo({ loading, text, error }: { loading?: boolean; text?: string; error?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: space(8), backgroundColor: colors.bg }}>
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <Text style={{ color: error ? colors.danger : colors.textMuted, textAlign: "center", fontSize: 15 }}>{text}</Text>
      )}
    </View>
  );
}
