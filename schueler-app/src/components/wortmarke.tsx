import { Text } from "react-native";

import { useTheme } from "@/lib/theme-context";

/** „Fahrbar"-Wortmarke wie in der Fahrlehrer-App. */
export function Wortmarke({ groesse = 24 }: { groesse?: number }) {
  const { colors } = useTheme();
  return (
    <Text style={{ fontSize: groesse, fontWeight: "900", letterSpacing: 0.3 }}>
      <Text style={{ color: colors.text }}>Fahr</Text>
      <Text style={{ color: "#DC2626" }}>bar</Text>
    </Text>
  );
}
