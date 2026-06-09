import { ActivityIndicator, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { colors, radius, space } from "@/lib/theme";
import { initialen } from "@/lib/format";

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
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
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: farbe ?? colors.brand },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initialen(vorname, nachname)}</Text>
    </View>
  );
}

/** Zentrierter Hinweis für Lade-, Leer- und Fehlerzustände. */
export function CenterInfo({
  loading,
  text,
  error,
}: {
  loading?: boolean;
  text?: string;
  error?: boolean;
}) {
  return (
    <View style={styles.center}>
      {loading ? (
        <ActivityIndicator color={colors.brand} />
      ) : (
        <Text style={[styles.centerText, error && { color: colors.danger }]}>{text}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: space(3.5),
  },
  badge: {
    paddingHorizontal: space(2),
    paddingVertical: space(1),
    borderRadius: radius.full,
    alignSelf: "flex-start",
  },
  badgeText: { fontSize: 11, fontWeight: "600" },
  avatar: { alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.white, fontWeight: "700" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: space(8) },
  centerText: { color: colors.textMuted, textAlign: "center", fontSize: 15 },
});
