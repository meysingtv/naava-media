import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";

import { Icon } from "@/components/icon";
import { Balken } from "@/components/ui";
import { Verkehrszeichen } from "@/components/zeichen";
import type { ZeichenKey } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { ALBUM } from "@/lib/schilder-jagd";
import { useStand } from "@/lib/stand";
import { farben, schrift } from "@/lib/theme";

/** Einstieg in die Schilder-Jagd – im Stil der Kategorie-Zeilen, mit Kamera-Knopf rechts. */
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
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 12,
        paddingLeft: 12,
        paddingRight: 12,
        borderRadius: 16,
        backgroundColor: pressed ? farben.flaeche2 : farben.flaeche,
        borderWidth: 1,
        borderColor: farben.linie,
      })}
    >
      {/* Schild im Sucherrahmen – wie beim Scannen */}
      <View style={{ width: 50, height: 50, borderRadius: 14, backgroundColor: farben.flaeche2, alignItems: "center", justifyContent: "center" }}>
        <Verkehrszeichen zeichen={zeigen} groesse={28} />
        {(["ol", "or", "ul", "ur"] as const).map((lage) => (
          <View
            key={lage}
            style={{
              position: "absolute",
              width: 9,
              height: 9,
              top: lage[0] === "o" ? 6 : undefined,
              bottom: lage[0] === "u" ? 6 : undefined,
              left: lage[1] === "l" ? 6 : undefined,
              right: lage[1] === "r" ? 6 : undefined,
              borderColor: farben.orange,
              borderTopWidth: lage[0] === "o" ? 2 : 0,
              borderBottomWidth: lage[0] === "u" ? 2 : 0,
              borderLeftWidth: lage[1] === "l" ? 2 : 0,
              borderRightWidth: lage[1] === "r" ? 2 : 0,
            }}
          />
        ))}
      </View>
      <View style={{ flex: 1, gap: 7 }}>
        <View>
          <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 16.5, lineHeight: 21, color: farben.text }}>
            Schilder-Jagd
          </Text>
          <Text numberOfLines={1} style={{ ...schrift.text, fontSize: 13.5, lineHeight: 18, color: farben.text3 }}>
            {gefunden.length > 0 ? `${gefunden.length} von ${ALBUM.length} Schildern gefunden` : "Echte Schilder mit der Kamera sammeln"}
          </Text>
        </View>
        <View style={{ maxWidth: 150 }}>
          <Balken wert={anteil} hoehe={5} />
        </View>
      </View>
      <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: farben.orange, alignItems: "center", justifyContent: "center" }}>
        <Icon name="camera" size={17} color={farben.aufOrange} weight="semibold" />
      </View>
    </Pressable>
  );
}
