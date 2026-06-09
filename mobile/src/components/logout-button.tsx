import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable } from "react-native";

import { supabase } from "@/lib/supabase";
import { colors, space } from "@/lib/theme";

export function LogoutButton() {
  function abmelden() {
    Alert.alert("Abmelden", "Möchtest du dich wirklich abmelden?", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Abmelden", style: "destructive", onPress: () => supabase.auth.signOut() },
    ]);
  }

  return (
    <Pressable onPress={abmelden} hitSlop={10} style={{ paddingHorizontal: space(3) }}>
      <Ionicons name="log-out-outline" size={24} color={colors.textMuted} />
    </Pressable>
  );
}
