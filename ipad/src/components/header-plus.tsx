import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";

import { useTheme } from "@/lib/theme-context";
import { space } from "@/lib/theme";

export function HeaderPlus({ href }: { href: Href }) {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <Pressable hitSlop={10} style={{ paddingHorizontal: space(2) }} onPress={() => router.push(href)}>
      <Ionicons name="add" size={28} color={colors.accent} />
    </Pressable>
  );
}
