import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { CameraIcon } from "phosphor-react-native/src/icons/Camera";

import { Verkehrszeichen } from "@/components/zeichen";
import { useFarbwelt } from "@/lib/darstellung";
import type { ZeichenKey } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { ALBUM } from "@/lib/schilder-jagd";
import { useStand } from "@/lib/stand";
import { leuchten, schrift, verlauf } from "@/lib/theme";

/** Einstieg in die Schilder-Jagd – weiche Fläche, zuletzt gefundenes Schild, Stand und Kamera-Knopf. */
export function SchilderJagdKarte() {
  const f = useFarbwelt();
  const { stand } = useStand();
  const gefunden = ALBUM.filter((k) => stand.schilder[k]);
  // Zuletzt gefundenes Schild – sonst ein Stoppschild als Beispiel.
  const zeigen: ZeichenKey = [...gefunden].sort((a, b) => (stand.schilder[b] ?? "").localeCompare(stand.schilder[a] ?? ""))[0] ?? "z206";
  const anteil = gefunden.length / ALBUM.length;

  return (
    <Pressable
      onPress={() => {
        tippen();
        router.push("/schilder-jagd");
      }}
      accessibilityRole="button"
      accessibilityLabel={`Schilder-Jagd, ${gefunden.length} von ${ALBUM.length} gefunden`}
      style={({ pressed }) => [
        { flexDirection: "row", alignItems: "center", gap: 14, padding: 12, paddingRight: 14, borderRadius: 22, transform: [{ scale: pressed ? 0.985 : 1 }] },
        f.hell ? { backgroundColor: "#FFFFFF", ...leuchten("#3C2C18", 0.05, 12, 3) } : { backgroundColor: "rgba(255,255,255,0.05)" },
      ]}
    >
      <View style={{ width: 58, height: 58, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: f.hell ? "rgba(20,23,27,0.04)" : "rgba(255,255,255,0.05)" }}>
        <Verkehrszeichen zeichen={zeigen} groesse={36} />
      </View>
      <View style={{ flex: 1, gap: 6 }}>
        <View>
          <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 16, color: f.text }}>
            Schilder-Jagd
          </Text>
          <Text numberOfLines={1} style={{ ...schrift.text, fontSize: 13, color: f.text3 }}>
            {gefunden.length > 0 ? `${gefunden.length} von ${ALBUM.length} Schildern` : "Echte Schilder scannen"}
          </Text>
        </View>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: f.hell ? "rgba(20,23,27,0.07)" : "rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <LinearGradient colors={verlauf.balken} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ width: `${Math.max(anteil > 0 ? 3 : 0, anteil * 100)}%`, height: "100%", borderRadius: 3 }} />
        </View>
      </View>
      <View style={[{ width: 42, height: 42, borderRadius: 21, overflow: "hidden" }, leuchten("#FC5B0E", 0.4, 10, 3)]}>
        <LinearGradient colors={verlauf.knopf} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <CameraIcon size={20} color="#FFFFFF" weight="fill" />
        </LinearGradient>
      </View>
    </Pressable>
  );
}
