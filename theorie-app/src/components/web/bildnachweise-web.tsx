import { Image, Linking, Pressable, Text, View } from "react-native";

import { Icon } from "@/components/icon";
import { B, Kachel, n, Raster, Spalte, UnterKopf, type Zustand } from "@/components/web/bunt";
import { WebSeite } from "@/components/web/rahmen";
import { FOTOS, LIZENZ_LINK, NACHWEISE } from "@/lib/fotos";

// Bildnachweise am PC: kurzer Hinweis, darunter alle Fotos als Kacheln im
// Raster – kleines Vorschaubild, Titel, Urheber, Lizenz und Quelle.

export function BildnachweiseWeb() {
  return (
    <WebSeite ohneRechts>
      <Spalte>
        <UnterKopf titel="Bildnachweise" unter="Fotos unter freien Lizenzen" />

        <Text style={{ ...n.halb, fontSize: 15.5, lineHeight: 23, color: B.text2, maxWidth: 760, marginTop: -8 }}>
          Die Fotos in Fahrschul Pro stehen unter freien Lizenzen. Wir haben sie für die App verkleinert und zugeschnitten. Verkehrszeichen, Lagepläne und Symbole sind eigene Zeichnungen.
        </Text>

        <Raster min={320} abstand={14}>
          {NACHWEISE.map((x) => (
            <Kachel key={x.foto} style={{ padding: 14, flexDirection: "row", gap: 14, minHeight: 112 }}>
              <Image source={FOTOS[x.foto]} style={{ width: 72, height: 72, borderRadius: 12, backgroundColor: B.ton }} resizeMode="cover" />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={{ ...n.fett, fontSize: 14.5, lineHeight: 19, color: B.text }} numberOfLines={2}>
                  „{x.titel}“
                </Text>
                <Text style={{ ...n.halb, fontSize: 13, color: B.text2 }} numberOfLines={1}>
                  von {x.urheber}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 4 }}>
                  <TextLink text={x.lizenz} farbe={B.blau} onPress={() => Linking.openURL(LIZENZ_LINK[x.lizenz] ?? x.seite)} />
                  <TextLink text="Quelle" farbe={B.text2} mitPfeil onPress={() => Linking.openURL(x.seite)} />
                </View>
              </View>
            </Kachel>
          ))}
        </Raster>
      </Spalte>
    </WebSeite>
  );
}

function TextLink({ text, farbe, mitPfeil, onPress }: { text: string; farbe: string; mitPfeil?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 4, opacity: z.hovered ? 0.7 : 1 })}>
      <Text style={{ ...n.fett, fontSize: 13, color: farbe }}>{text}</Text>
      {mitPfeil ? <Icon name="open-outline" size={13} color={farbe} /> : null}
    </Pressable>
  );
}
