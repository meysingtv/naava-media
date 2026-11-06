import { Pressable, View } from "react-native";
import { Circle } from "react-native-svg";

import { Glas } from "@/components/glas";
import { DekoSvg } from "@/components/grafik";
import { Icon } from "@/components/icon";
import { useFarbwelt } from "@/lib/darstellung";
import { tippen } from "@/lib/haptik";
import { leuchten, mitDeckkraft } from "@/lib/theme";

const FUELLEN = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;

/**
 * Runder Knopf neben der KI-Hilfe: öffnet das Erklärvideo bzw. die
 * Erklär-Animation zur Frage. Erscheint nur, wenn es eins von beiden gibt.
 */
export function ErklaerKnopf({ onPress, groesse = 56, video }: { onPress: () => void; groesse?: number; video?: boolean }) {
  const f = useFarbwelt();
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={video ? "Erklärvideo ansehen" : "Erklärung ansehen"}
      style={({ pressed }) => [{ width: groesse, height: groesse, borderRadius: groesse / 2, transform: [{ scale: pressed ? 0.93 : 1 }] }, leuchten(f.orange, f.hell ? 0.2 : 0.32, 10, 3)]}
    >
      <Glas hell={f.hell} style={[FUELLEN, { borderRadius: groesse / 2 }]} />
      <DekoSvg width={groesse} height={groesse} style={FUELLEN}>
        <Circle cx={groesse / 2} cy={groesse / 2} r={groesse / 2 - 1.5} fill="none" stroke={mitDeckkraft(f.orange, 0.75)} strokeWidth={2} />
      </DekoSvg>
      <View pointerEvents="none" style={[FUELLEN, { alignItems: "center", justifyContent: "center" }]}>
        <Icon name="play" size={Math.round(groesse * 0.36)} color={f.orange} weight="semibold" style={{ marginLeft: groesse * 0.05 }} />
      </View>
    </Pressable>
  );
}
