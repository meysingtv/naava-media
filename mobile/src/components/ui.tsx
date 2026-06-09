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

import { useTheme } from "@/lib/theme-context";
import { radius, space } from "@/lib/theme";
import { initialen } from "@/lib/format";

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          padding: space(3.5),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Badge({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: space(2),
        paddingVertical: space(1),
        borderRadius: radius.full,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", color }}>{label}</Text>
    </View>
  );
}

export function Avatar({
  vorname,
  nachname,
  farbe,
  size = 40,
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
        backgroundColor: farbe ?? colors.brand,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: size * 0.36 }}>
        {initialen(vorname, nachname)}
      </Text>
    </View>
  );
}

export function ProgressBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const { colors } = useTheme();
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <View style={{ height: 8, borderRadius: radius.full, backgroundColor: colors.cardAlt, overflow: "hidden" }}>
      <View
        style={{ height: "100%", width: `${pct}%`, borderRadius: radius.full, backgroundColor: color ?? colors.brand }}
      />
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
    <View style={{ flexDirection: "row", backgroundColor: colors.cardAlt, borderRadius: radius.md, padding: 3 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              paddingVertical: space(2.5),
              borderRadius: radius.sm + 1,
              alignItems: "center",
              backgroundColor: active ? colors.card : "transparent",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600", color: active ? colors.text : colors.textMuted }}>
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
  variant = "primary",
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "danger" | "ghost";
}) {
  const { colors } = useTheme();
  const bg = variant === "primary" ? colors.brand : variant === "danger" ? colors.danger : colors.cardAlt;
  const fg = variant === "ghost" ? colors.text : colors.onBrand;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={{
        backgroundColor: bg,
        opacity: disabled || loading ? 0.6 : 1,
        borderRadius: radius.md,
        paddingVertical: space(3.5),
        alignItems: "center",
      }}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={{ color: fg, fontWeight: "700", fontSize: 16 }}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Input(props: TextInputProps) {
  const { colors } = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.textMuted}
      {...props}
      style={[
        {
          backgroundColor: colors.card,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          borderRadius: radius.md,
          paddingHorizontal: space(3.5),
          paddingVertical: space(3),
          fontSize: 16,
          color: colors.text,
        },
        props.style,
      ]}
    />
  );
}

export function Banner({ text }: { text: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: colors.warning, paddingVertical: space(1.5), paddingHorizontal: space(3) }}>
      <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700", textAlign: "center" }}>{text}</Text>
    </View>
  );
}

/** Zentrierter Hinweis für Lade-, Leer- und Fehlerzustände. */
export function CenterInfo({ loading, text, error }: { loading?: boolean; text?: string; error?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: space(8) }}>
      {loading ? (
        <ActivityIndicator color={colors.brand} />
      ) : (
        <Text style={{ color: error ? colors.danger : colors.textMuted, textAlign: "center", fontSize: 15 }}>
          {text}
        </Text>
      )}
    </View>
  );
}
