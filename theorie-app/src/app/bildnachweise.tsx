import { Image, Linking, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { GrossKopf, Seite } from "@/components/seite";
import { kartenFlaeche, T } from "@/components/ui";
import { useDarstellung } from "@/lib/darstellung";
import { FOTOS, LIZENZ_LINK, NACHWEISE } from "@/lib/fotos";
import { abstand, RAND } from "@/lib/theme";

export default function Bildnachweise() {
  const insets = useSafeAreaInsets();
  const { farbwelt: f } = useDarstellung();
  return (
    <Seite>
      <GrossKopf titel="Bildnachweise" unter="Fotos unter freien Lizenzen" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingTop: abstand(4), paddingBottom: insets.bottom + abstand(8), gap: abstand(3) }} showsVerticalScrollIndicator={false}>
        <T v="text" style={{ marginBottom: abstand(2) }}>
          Die Fotos in Fahrschul Pro stehen unter freien Lizenzen. Wir haben sie für die App verkleinert und zugeschnitten. Verkehrszeichen, Lagepläne und Symbole sind eigene
          Zeichnungen.
        </T>
        {NACHWEISE.map((n) => (
          <View key={n.foto} style={[{ flexDirection: "row", gap: abstand(3), padding: abstand(3), borderRadius: 20 }, kartenFlaeche(f)]}>
            <Image source={FOTOS[n.foto]} style={{ width: 64, height: 64, borderRadius: 14 }} resizeMode="cover" />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="textStark" numberOfLines={2} style={{ fontSize: 14 }}>
                „{n.titel}“
              </T>
              <T v="klein">von {n.urheber}</T>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: abstand(3), marginTop: 2 }}>
                <Pressable onPress={() => Linking.openURL(LIZENZ_LINK[n.lizenz] ?? n.seite)} hitSlop={6}>
                  <T v="klein" farbe={f.orange}>
                    {n.lizenz}
                  </T>
                </Pressable>
                <Pressable onPress={() => Linking.openURL(n.seite)} hitSlop={6} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <T v="klein" farbe={f.text2}>
                    Quelle
                  </T>
                  <Icon name="open-outline" size={12} color={f.text2} />
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </Seite>
  );
}
