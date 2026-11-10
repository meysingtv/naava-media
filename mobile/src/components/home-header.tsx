import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/lib/theme-context";
import { space } from "@/lib/theme";

/**
 * Kopfzeile für Home: "Fahrbar"-Wortmarke mittig, optionaler Button rechts.
 * Darunter optional großer Titel + Untertitel.
 */
export function HomeHeader({
  right,
  title,
  subtitle,
}: {
  right?: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const rot = "#DC2626";

  return (
    <View style={{ paddingTop: insets.top + space(1.5), paddingHorizontal: space(4), paddingBottom: space(3), gap: space(3) }}>
      <View style={{ height: 40, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ width: 40 }} />
        <Text style={{ fontSize: 24, fontWeight: "900", letterSpacing: 0.3 }}>
          <Text style={{ color: colors.text }}>Fahr</Text>
          <Text style={{ color: rot }}>bar</Text>
        </Text>
        <View style={{ width: 40, alignItems: "flex-end" }}>{right}</View>
      </View>

      {title ? (
        <View>
          <Text style={{ fontSize: 30, fontWeight: "700", color: colors.text }} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? <Text style={{ fontSize: 14, color: colors.textMuted, marginTop: 2 }}>{subtitle}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}
