import { Image, Text, View, type ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/lib/theme-context";
import { space } from "@/lib/theme";

/**
 * Eigene Kopfzeile für Home: Logo links, "Fahrbar"-Wortmarke mittig,
 * optionaler Button rechts. Darunter optional ein großer Titel + Untertitel.
 */
export function HomeHeader({
  logo,
  right,
  title,
  subtitle,
}: {
  logo?: ImageSourcePropType;
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
        <View style={{ width: 40, alignItems: "flex-start" }}>
          {logo ? <Image source={logo} style={{ width: 36, height: 36, borderRadius: 8 }} resizeMode="contain" /> : null}
        </View>
        <Text style={{ fontSize: 22, fontWeight: "800", letterSpacing: 0.2 }}>
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
