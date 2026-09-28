import { Image, Text, View } from "react-native";

import { useKonto } from "@/lib/konto";
import { profilbildUrl, useProfilbild } from "@/lib/profilbild";
import { schrift, useFarben } from "@/lib/theme";

function kuerzelVon(name: string): string {
  return (
    name
      .replace(/^@/, "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/** Eigenes rundes Profilbild – ohne Foto mit Initialen auf Orange. */
export function ProfilBild({ name, groesse = 52, rand = 2 }: { name: string; groesse?: number; rand?: number }) {
  const farben = useFarben();
  const lokal = useProfilbild();
  const { profil } = useKonto();
  const uri = lokal ?? (profil?.bild_pfad ? profilbildUrl(profil.bild_pfad) : null);
  return (
    <View
      style={{
        width: groesse,
        height: groesse,
        borderRadius: groesse / 2,
        borderWidth: rand,
        borderColor: "rgba(255,255,255,0.9)",
        overflow: "hidden",
        backgroundColor: farben.flaeche2,
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: farben.orange }}>
          <Text style={{ ...schrift.titel, fontSize: groesse * 0.36, color: farben.aufOrange }}>{kuerzelVon(name)}</Text>
        </View>
      )}
    </View>
  );
}

/** Profilbild eines anderen Nutzers (Clips, Kommentare) – sonst Initialen in seiner Farbe. */
export function NutzerBild({ pfad, name, farbe, groesse = 36, rand = 1.5 }: { pfad: string | null | undefined; name: string; farbe?: string; groesse?: number; rand?: number }) {
  const farben = useFarben();
  return (
    <View
      style={{
        width: groesse,
        height: groesse,
        borderRadius: groesse / 2,
        borderWidth: rand,
        borderColor: "rgba(255,255,255,0.9)",
        overflow: "hidden",
        backgroundColor: farbe || farben.orange,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {pfad ? (
        <Image source={{ uri: profilbildUrl(pfad) }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
      ) : (
        <Text style={{ ...schrift.titel, fontSize: groesse * 0.4, color: "#FFFFFF" }}>{kuerzelVon(name)}</Text>
      )}
    </View>
  );
}
