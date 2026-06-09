import { StyleSheet, Text, View } from "react-native";

import { Avatar, Badge, Card } from "@/components/ui";
import { STATUS_FARBE, STATUS_LABEL, TYP_FARBE, TYP_LABEL } from "@/lib/constants";
import { formatUhrzeit } from "@/lib/format";
import { colors, space } from "@/lib/theme";
import type { FahrstundeMitRelationen } from "@/lib/types";

export function FahrstundeCard({ stunde }: { stunde: FahrstundeMitRelationen }) {
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
    <Card style={styles.card}>
      <View style={styles.time}>
        <Text style={[styles.uhrzeit, ausgefallen && styles.durchgestrichen]}>
          {formatUhrzeit(stunde.uhrzeit)}
        </Text>
        <Text style={styles.dauer}>{stunde.dauer_minuten} Min</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.body}>
        <View style={styles.headRow}>
          {schueler ? (
            <Avatar
              vorname={schueler.vorname}
              nachname={schueler.nachname}
              farbe={schueler.avatar_farbe}
              size={28}
            />
          ) : null}
          <Text style={[styles.name, ausgefallen && styles.durchgestrichen]} numberOfLines={1}>
            {schueler ? `${schueler.vorname} ${schueler.nachname}` : "Ohne Schüler"}
          </Text>
        </View>

        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}

        <View style={styles.badges}>
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
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "stretch", gap: space(3) },
  time: { width: 56, alignItems: "center", justifyContent: "center" },
  uhrzeit: { fontSize: 17, fontWeight: "700", color: colors.text },
  dauer: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  divider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  body: { flex: 1, gap: space(1.5), justifyContent: "center" },
  headRow: { flexDirection: "row", alignItems: "center", gap: space(2) },
  name: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.text },
  meta: { fontSize: 13, color: colors.textMuted },
  badges: { flexDirection: "row", gap: space(1.5), marginTop: 2, flexWrap: "wrap" },
  durchgestrichen: { textDecorationLine: "line-through", color: colors.textMuted },
});
