import { Pressable, Text } from "react-native";
import { useRouter } from "expo-router";

import { useTheme } from "@/lib/theme-context";
import { space } from "@/lib/theme";

export function HeaderCancel() {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <Pressable onPress={() => router.back()} hitSlop={10} style={{ paddingHorizontal: space(1) }}>
      <Text style={{ fontSize: 17, color: colors.accent }}>Abbrechen</Text>
    </Pressable>
  );
}
