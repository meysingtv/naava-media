import { Image, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useProfilbild } from "@/lib/profilbild";
import { farben, schrift } from "@/lib/theme";

/** Rundes Profilbild mit heller Kante – ohne Foto mit Initialen. */
export function ProfilBild({ name, groesse = 52, rand = 2 }: { name: string; groesse?: number; rand?: number }) {
  const bild = useProfilbild();
  const kuerzel =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?";
  return (
    <View
      style={{
        width: groesse,
        height: groesse,
        borderRadius: groesse / 2,
        borderWidth: rand,
        borderColor: "rgba(255,236,220,0.85)",
        overflow: "hidden",
        backgroundColor: farben.flaeche2,
      }}
    >
      {bild ? (
        <Image source={{ uri: bild }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
      ) : (
        <LinearGradient colors={["#FF9A4A", "#E8541C"]} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ ...schrift.titel, fontSize: groesse * 0.36, color: "#FFFFFF" }}>{kuerzel}</Text>
        </LinearGradient>
      )}
    </View>
  );
}
