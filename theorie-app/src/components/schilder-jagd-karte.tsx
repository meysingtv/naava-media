import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

import { Icon } from "@/components/icon";
import { Verkehrszeichen } from "@/components/zeichen";
import type { ZeichenKey } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { ALBUM } from "@/lib/schilder-jagd";
import { useStand } from "@/lib/stand";
import { farben, schrift, verlauf } from "@/lib/theme";

/** Einstieg in die Schilder-Jagd – im Stil der Kategorie-Zeilen, aber mit Orange-Schein. */
export function SchilderJagdKarte() {
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
      style={({ pressed }) => ({
        height: 84,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: farben.flaeche,
        borderWidth: 1,
        borderColor: "rgba(252,91,14,0.32)",
        flexDirection: "row",
        alignItems: "center",
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <LinearGradient
        colors={["rgba(252,91,14,0.2)", "rgba(252,91,14,0.06)", "rgba(252,91,14,0)"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* Schild im Sucherrahmen – wie beim Scannen */}
      <View style={{ width: 86, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: farben.iconKreis, alignItems: "center", justifyContent: "center" }}>
          <Verkehrszeichen zeichen={zeigen} groesse={28} />
          {(["ol", "or", "ul", "ur"] as const).map((lage) => (
            <View
              key={lage}
              style={{
                position: "absolute",
                width: 11,
                height: 11,
                top: lage[0] === "o" ? 9 : undefined,
                bottom: lage[0] === "u" ? 9 : undefined,
                left: lage[1] === "l" ? 9 : undefined,
                right: lage[1] === "r" ? 9 : undefined,
                borderColor: farben.orange,
                borderTopWidth: lage[0] === "o" ? 2 : 0,
                borderBottomWidth: lage[0] === "u" ? 2 : 0,
                borderLeftWidth: lage[1] === "l" ? 2 : 0,
                borderRightWidth: lage[1] === "r" ? 2 : 0,
              }}
            />
          ))}
        </View>
      </View>
      <View style={{ flex: 1, paddingRight: 56 }}>
        <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 17.5, lineHeight: 22, color: "#FFFFFF" }}>
          Schilder-Jagd
        </Text>
        <Text numberOfLines={1} style={{ ...schrift.text, fontSize: 15, lineHeight: 19, color: "#D3D7DC", marginTop: 2 }}>
          {gefunden.length > 0 ? `${gefunden.length} von ${ALBUM.length} Schildern` : "Echte Schilder scannen"}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 }}>
          <View style={{ width: 112, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.16)", overflow: "hidden" }}>
            <LinearGradient colors={verlauf.kategorie} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ width: `${anteil * 100}%`, height: "100%", borderRadius: 4 }} />
          </View>
          <Text style={{ ...schrift.textHalb, fontSize: 15, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>
            {gefunden.length}/{ALBUM.length}
          </Text>
        </View>
      </View>
      <View
        style={{
          position: "absolute",
          right: 12,
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: farben.orange,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="camera" size={18} color="#FFFFFF" weight="semibold" />
      </View>
    </Pressable>
  );
}
