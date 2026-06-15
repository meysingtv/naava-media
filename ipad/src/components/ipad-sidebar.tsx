import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { radius, space } from "@/lib/theme";

type Eintrag = {
  href: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  aktivIcon: keyof typeof Ionicons.glyphMap;
};

// Navigation analog zur Website.
const NAV: Eintrag[] = [
  { href: "/heute", label: "Dashboard", icon: "home-outline", aktivIcon: "home" },
  { href: "/schueler", label: "Schüler", icon: "people-outline", aktivIcon: "people" },
  { href: "/kalender", label: "Terminplaner", icon: "calendar-outline", aktivIcon: "calendar" },
  { href: "/theorie", label: "Theorie", icon: "book-outline", aktivIcon: "book" },
  { href: "/rechnungen", label: "Rechnungen", icon: "document-text-outline", aktivIcon: "document-text" },
  { href: "/team", label: "Benutzer", icon: "person-circle-outline", aktivIcon: "person-circle" },
  { href: "/fahrzeuge", label: "Fahrzeuge", icon: "car-outline", aktivIcon: "car" },
  { href: "/mehr", label: "Einstellungen", icon: "settings-outline", aktivIcon: "settings" },
];

export function IpadSidebar() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  function abmelden() {
    Alert.alert("Abmelden", "Möchtest du dich wirklich abmelden?", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Abmelden", style: "destructive", onPress: () => supabase.auth.signOut() },
    ]);
  }

  return (
    <View
      style={{
        width: 250,
        backgroundColor: colors.card,
        borderRightWidth: StyleSheet.hairlineWidth,
        borderRightColor: colors.separator,
        paddingTop: insets.top + space(3),
      }}
    >
      {/* Marke oben links */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space(2.5),
          paddingHorizontal: space(4),
          paddingBottom: space(4),
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.accent,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="car-sport" size={20} color={colors.onAccent} />
        </View>
        <Text style={{ fontSize: 17, fontWeight: "700", color: colors.text }}>FahrschulApp</Text>
      </View>

      {/* Navigation */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: space(2.5), gap: 2 }}>
        {NAV.map((e) => {
          const aktiv = pathname === e.href || pathname.startsWith(`${e.href}/`);
          return (
            <Pressable
              key={e.href}
              onPress={() => router.push(e.href as never)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: space(3),
                paddingHorizontal: space(3),
                paddingVertical: space(3),
                borderRadius: radius.full,
                backgroundColor: aktiv ? colors.accent : pressed ? colors.cardAlt : "transparent",
              })}
            >
              <Ionicons
                name={aktiv ? e.aktivIcon : e.icon}
                size={20}
                color={aktiv ? colors.onAccent : colors.textMuted}
              />
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: aktiv ? "700" : "500",
                  color: aktiv ? colors.onAccent : colors.text,
                }}
              >
                {e.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Konto unten */}
      <View
        style={{
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.separator,
          padding: space(3),
          paddingBottom: insets.bottom + space(3),
          gap: space(1),
        }}
      >
        <Text style={{ fontSize: 12, color: colors.textMuted, paddingHorizontal: space(2) }} numberOfLines={1}>
          {session?.user.email ?? ""}
        </Text>
        <Pressable
          onPress={abmelden}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: space(2),
            paddingHorizontal: space(2),
            paddingVertical: space(2),
          }}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.danger }}>Abmelden</Text>
        </Pressable>
      </View>
    </View>
  );
}
