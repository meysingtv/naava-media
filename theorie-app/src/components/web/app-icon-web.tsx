import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";

import { dialog } from "@/components/dialog";
import { Icon } from "@/components/icon";
import { B, Kachel, n, Raster, Spalte, UnterKopf, type Zustand } from "@/components/web/bunt";
import { WebSeite } from "@/components/web/rahmen";
import { aktivesIcon, APP_ICONS, iconSetzen, iconWechselMoeglich, type AppIcon } from "@/lib/app-icon";

// App-Icon am PC: alle Designs im Raster, rechts eine große Vorschau des
// gewählten Icons. Wechseln lässt sich das echte Icon nur in der App.

/** Ecken wie beim iPhone-Icon. */
const ecke = (g: number) => g * 0.225;

export function AppIconWeb() {
  const [aktiv, setAktiv] = useState<string | null>(() => aktivesIcon());
  const [laeuft, setLaeuft] = useState(false);
  const gewaehlt = APP_ICONS.find((i) => i.id === aktiv) ?? APP_ICONS[0];

  async function waehlen(icon: AppIcon) {
    if (icon.id === aktiv || laeuft) return;
    if (!iconWechselMoeglich) {
      // Nur Auswahl anzeigen – im Browser lässt sich das echte Icon nicht wechseln.
      setAktiv(icon.id);
      return;
    }
    setLaeuft(true);
    try {
      await iconSetzen(icon.id);
      setAktiv(icon.id);
    } catch {
      dialog("Icon nicht geändert", "Das hat gerade nicht geklappt. Versuch es gleich noch einmal.");
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <WebSeite ohneRechts>
      <Spalte>
        <UnterKopf titel="App-Icon" unter="Such dir dein Lenkrad für den Homescreen aus." />

        <View style={{ flexDirection: "row", gap: 28, flexWrap: "wrap", alignItems: "flex-start" }}>
          <View style={{ flex: 1, minWidth: 440 }}>
            <Raster min={132} abstand={14}>
              {APP_ICONS.map((icon) => (
                <IconKachel key={icon.titel} icon={icon} aktiv={icon.id === aktiv} onPress={() => waehlen(icon)} />
              ))}
            </Raster>
          </View>

          <Kachel style={{ width: 320, padding: 28, alignItems: "center", gap: 18 }}>
            <Text style={{ alignSelf: "flex-start", ...n.fett, fontSize: 14, color: B.text3 }}>Vorschau</Text>
            <Image source={gewaehlt.vorschau} style={{ width: 150, height: 150, borderRadius: ecke(150), borderWidth: 1.5, borderColor: B.linie }} />
            <View style={{ alignItems: "center", gap: 2 }}>
              <Text style={{ ...n.schwarz, fontSize: 20, color: B.text }}>{gewaehlt.titel}</Text>
              <Text style={{ ...n.halb, fontSize: 14, color: B.text2 }}>{gewaehlt.id === null ? "Das normale Icon" : "Alternatives Icon"}</Text>
            </View>
            {!iconWechselMoeglich ? (
              <View style={{ alignSelf: "stretch", flexDirection: "row", gap: 10, padding: 14, borderRadius: 14, backgroundColor: B.ton }}>
                <Icon name="phone-portrait-outline" size={19} color={B.text2} />
                <Text style={{ flex: 1, ...n.halb, fontSize: 13.5, lineHeight: 19, color: B.text2 }}>Hier siehst du die Vorschau. Wechseln lässt sich das Icon in der App auf deinem Handy.</Text>
              </View>
            ) : null}
          </Kachel>
        </View>
      </Spalte>
    </WebSeite>
  );
}

function IconKachel({ icon, aktiv, onPress }: { icon: AppIcon; aktiv: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: aktiv }}
      accessibilityLabel={`App-Icon ${icon.titel}`}
      style={(z: Zustand) => ({ alignItems: "center", gap: 10, paddingTop: 14, paddingBottom: 12, borderRadius: 18, borderWidth: aktiv ? 2 : 1.5, borderColor: aktiv ? B.orange : z.hovered ? B.kante : B.linie, borderBottomWidth: 3, borderBottomColor: aktiv ? B.orangeKante : B.kante, backgroundColor: z.hovered && !aktiv ? B.hover : B.flaeche })}
    >
      <View>
        <Image source={icon.vorschau} style={{ width: 84, height: 84, borderRadius: ecke(84), borderWidth: 1, borderColor: B.linie }} />
        {aktiv ? (
          <View style={{ position: "absolute", right: -8, top: -8, width: 26, height: 26, borderRadius: 13, backgroundColor: B.orange, borderWidth: 2.5, borderColor: B.grund, alignItems: "center", justifyContent: "center" }}>
            <Icon name="checkmark" size={14} color="#FFFFFF" />
          </View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={{ ...n.fett, fontSize: 14, color: aktiv ? B.text : B.text2 }}>
        {icon.titel}
      </Text>
    </Pressable>
  );
}
