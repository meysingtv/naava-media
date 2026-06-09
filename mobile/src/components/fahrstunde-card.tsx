import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Avatar, Badge } from "@/components/ui";
import { STATUS_FARBE, STATUS_LABEL, TYP_FARBE, TYP_LABEL } from "@/lib/constants";
import { formatUhrzeit } from "@/lib/format";
import { useTheme } from "@/lib/theme-context";
import { radius, space, type ThemeColors } from "@/lib/theme";
import type { FahrstundeMitRelationen } from "@/lib/types";

export function FahrstundeCard({
  stunde,
  onPress,
}: {
  stunde: FahrstundeMitRelationen;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);

  const typ = TYP_FARBE[stunde.typ];
  const ausgefallen = stunde.status === "ausgefallen";
  const schueler = stunde.fahrschueler;
  const meta = [
    stunde.fahrlehrer ? `${stunde.fahrlehrer.vorname} ${stunde.fahrlehrer.nachname}` : null,
    stunde.fahrzeug ? stunde.fahrzeug.kennzeichen : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && onPress ? s.pressed : null]}>
      <View style={s.time}>
        <Text style={[s.uhrzeit, ausgefallen && s.durch]}>{formatUhrzeit(stunde.uhrzeit)}</Text>
        <Text style={s.dauer}>{stunde.dauer_minuten} Min</Text>
      </View>

      <View style={s.divider} />

      <View style={s.body}>
        <View style={s.headRow}>
          {schueler ? (
            <Avatar vorname={schueler.vorname} nachname={schueler.nachname} farbe={schueler.avatar_farbe} size={28} />
          ) : null}
          <Text style={[s.name, ausgefallen && s.durch]} numberOfLines={1}>
            {schueler ? `${schueler.vorname} ${schueler.nachname}` : "Ohne Schüler"}
          </Text>
        </View>

        {meta ? (
          <Text style={s.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}

        <View style={s.badges}>
          <Badge label={TYP_LABEL[stunde.typ]} bg={typ.bg} color={typ.text} />
          {stunde.status !== "geplant" ? (
            <Badge
              label={STATUS_LABEL[stunde.status]}
              bg={STATUS_FARBE[stunde.status].bg}
              color={STATUS_FARBE[stunde.status].text}
            />
          ) : null}
        </View>
      </View>

      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: space(3),
      backgroundColor: c.card,
      borderRadius: radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: space(3.5),
    },
    pressed: { opacity: 0.6 },
    time: { width: 52, alignItems: "center" },
    uhrzeit: { fontSize: 17, fontWeight: "800", color: c.text },
    dauer: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    divider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", backgroundColor: c.border },
    body: { flex: 1, gap: space(1.5) },
    headRow: { flexDirection: "row", alignItems: "center", gap: space(2) },
    name: { flex: 1, fontSize: 15, fontWeight: "600", color: c.text },
    meta: { fontSize: 13, color: c.textMuted },
    badges: { flexDirection: "row", gap: space(1.5), marginTop: 2, flexWrap: "wrap" },
    durch: { textDecorationLine: "line-through", color: c.textMuted },
  });
