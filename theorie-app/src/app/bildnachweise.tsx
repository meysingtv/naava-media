import { Image, Linking, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/icon";
import { Kopf, T } from "@/components/ui";
import { FOTOS, LIZENZ_LINK, NACHWEISE } from "@/lib/fotos";
import { abstand, farben, RAND } from "@/lib/theme";

export default function Bildnachweise() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: farben.grund }}>
      <Kopf titel="Bildnachweise" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: RAND, paddingBottom: insets.bottom + abstand(8), gap: abstand(3) }}>
        <T v="text" style={{ marginBottom: abstand(2) }}>
          Die Fotos in Spur stehen unter freien Lizenzen. Wir haben sie für die App verkleinert und zugeschnitten. Verkehrszeichen, Lagepläne und Symbole sind eigene
          Zeichnungen.
        </T>
        {NACHWEISE.map((n) => (
          <View key={n.foto} style={{ flexDirection: "row", gap: abstand(3), padding: abstand(3), borderRadius: 16, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie }}>
            <Image source={FOTOS[n.foto]} style={{ width: 64, height: 64, borderRadius: 10 }} resizeMode="cover" />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="textStark" numberOfLines={2} style={{ fontSize: 14 }}>
                „{n.titel}“
              </T>
              <T v="klein">von {n.urheber}</T>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: abstand(3), marginTop: 2 }}>
                <Pressable onPress={() => Linking.openURL(LIZENZ_LINK[n.lizenz] ?? n.seite)} hitSlop={6}>
                  <T v="klein" farbe={farben.orange}>
                    {n.lizenz}
                  </T>
                </Pressable>
                <Pressable onPress={() => Linking.openURL(n.seite)} hitSlop={6} style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <T v="klein" farbe={farben.text2}>
                    Quelle
                  </T>
                  <Icon name="open-outline" size={12} color={farben.text2} />
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
