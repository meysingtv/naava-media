import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useTheme } from "@/lib/theme-context";
import { space } from "@/lib/theme";

export function HeaderPlus({ datum }: { datum?: string }) {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <Pressable
      hitSlop={10}
      style={{ paddingHorizontal: space(3) }}
      onPress={() => router.push(datum ? `/fahrstunde/neu?datum=${datum}` : "/fahrstunde/neu")}
    >
      <Ionicons name="add" size={28} color={colors.brand} />
    </Pressable>
  );
}
