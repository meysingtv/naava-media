import type { ReactNode } from "react";
import { Image, Pressable, Text, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { Icon } from "@/components/icon";
import { Balken } from "@/components/ui";
import { TempoZeichen, Verkehrszeichen } from "@/components/zeichen";
import type { ThemaId } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { farben, schrift } from "@/lib/theme";

/** Abdunkeln auf Fotos – damit weiße Schrift darauf lesbar bleibt (in beiden Schemata). */
const SCHATTEN = "rgba(0,0,0,";

/** Foto als Hintergrund mit Verlauf – für Kopfbilder mit weißer Schrift. */
export function FotoFlaeche({
  quelle,
  children,
  style,
  verlauf = "unten",
  onPress,
}: {
  quelle: ImageSourcePropType;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  verlauf?: "unten" | "links" | "stark";
  onPress?: () => void;
}) {
  const inhalt = (
    <>
      <Image source={quelle} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }} resizeMode="cover" />
      {verlauf === "links" ? (
        <LinearGradient
          colors={[SCHATTEN + "0.66)", SCHATTEN + "0.28)", SCHATTEN + "0)"]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}
      <LinearGradient
        colors={
          verlauf === "stark"
            ? [SCHATTEN + "0.2)", SCHATTEN + "0.5)", SCHATTEN + "0.86)"]
            : verlauf === "links"
              ? [SCHATTEN + "0)", SCHATTEN + "0.05)", SCHATTEN + "0.55)"]
              : [SCHATTEN + "0)", SCHATTEN + "0.12)", SCHATTEN + "0.78)"]
        }
        locations={[0, 0.45, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {children}
    </>
  );
  const rahmen: ViewStyle = { borderRadius: 20, overflow: "hidden", backgroundColor: farben.flaeche };
  if (!onPress) return <View style={[rahmen, style]}>{inhalt}</View>;
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      style={({ pressed }) => [rahmen, { opacity: pressed ? 0.9 : 1 }, style]}
    >
      {inhalt}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Kategorien
// ---------------------------------------------------------------------------

export type KategorieId = ThemaId | "grundstoff";

/** Symbol einer Kategorie – Verkehrszeichen, wo es eins gibt – auf ruhiger Kachel. */
export function KategorieIcon({ id, groesse = 50 }: { id: KategorieId; groesse?: number }) {
  const g = groesse * 0.52;
  let inhalt: ReactNode;
  switch (id) {
    case "grundstoff":
      inhalt = <Icon name="car-outline" sf="car.fill" size={g} color={farben.text} fallback={<MaterialCommunityIcons name="car" size={g} color={farben.text} />} />;
      break;
    case "gefahren":
      inhalt = <Icon name="warning" size={g} color={farben.rot} weight="semibold" />;
      break;
    case "vorfahrt":
      inhalt = <Verkehrszeichen zeichen="z306" groesse={groesse * 0.78} />;
      break;
    case "zeichen":
      inhalt = <TempoZeichen zahl={50} groesse={groesse * 0.74} />;
      break;
    case "umwelt":
      inhalt = <Icon name="leaf" size={g} color={farben.gruen} />;
      break;
    case "technik":
      inhalt = <Icon name="settings" size={g} color={farben.text2} />;
      break;
    case "manoever":
      inhalt = <Icon name="walk" size={g} color={farben.text} fallback={<MaterialCommunityIcons name="walk" size={g} color={farben.text} />} />;
      break;
    case "tempo":
      inhalt = <Icon name="speedometer" size={g} color={farben.orange} />;
      break;
    case "parken":
      inhalt = <Verkehrszeichen zeichen="z314" groesse={groesse * 0.7} />;
      break;
    case "autobahn":
      inhalt = <Icon name="car-outline" sf="road.lanes" size={g} color={farben.blau} fallback={<MaterialCommunityIcons name="highway" size={g} color={farben.blau} />} />;
      break;
    case "mensch":
      inhalt = <Icon name="person" size={g * 0.92} color={farben.text2} />;
      break;
    case "zahlen":
      inhalt = <Icon name="calculator" size={g * 0.92} color={farben.gelb} />;
      break;
  }
  return (
    <View style={{ width: groesse, height: groesse, borderRadius: groesse * 0.28, backgroundColor: farben.flaeche2, alignItems: "center", justifyContent: "center" }}>
      {inhalt}
    </View>
  );
}

/** Kleines Symbol für Listen (Stärken & Schwächen). */
export function KategorieMini({ id }: { id: KategorieId }) {
  switch (id) {
    case "zeichen":
      return <Verkehrszeichen zeichen="z101" groesse={26} />;
    case "vorfahrt":
      return <Verkehrszeichen zeichen="z306" groesse={26} />;
    case "gefahren":
      return <Icon name="warning" size={23} color={farben.rot} />;
    case "umwelt":
      return <Icon name="leaf" size={23} color={farben.gruen} />;
    case "technik":
      return <Icon name="settings" size={23} color={farben.text2} />;
    case "manoever":
      return <Icon name="walk" size={23} color={farben.text} />;
    case "tempo":
      return <Icon name="speedometer" size={22} color={farben.orange} />;
    case "parken":
      return <Verkehrszeichen zeichen="z314" groesse={24} />;
    case "autobahn":
      return <Icon name="car-outline" sf="road.lanes" size={21} color={farben.blau} />;
    case "mensch":
      return <Icon name="person" size={21} color={farben.text2} />;
    case "zahlen":
      return <Icon name="calculator" size={21} color={farben.gelb} />;
    default:
      return <Icon name="car-outline" sf="car.fill" size={21} color={farben.text} />;
  }
}

/** Zeile der Kategorienliste: Symbol, Titel, Fortschritt und Anzahl. */
export function KategorieZeile({
  id,
  titel,
  anzahl,
  anteil,
  onPress,
}: {
  id: KategorieId;
  titel: string;
  anzahl: number;
  anteil: number;
  quelle?: ImageSourcePropType;
  onPress: () => void;
}) {
  const prozent = Math.round(Math.max(0, Math.min(1, anteil)) * 100);
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${titel}, ${anzahl} Fragen, ${prozent} Prozent`}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 12,
        paddingLeft: 12,
        paddingRight: 14,
        borderRadius: 16,
        backgroundColor: pressed ? farben.flaeche2 : farben.flaeche,
        borderWidth: 1,
        borderColor: farben.linie,
      })}
    >
      <KategorieIcon id={id} />
      <View style={{ flex: 1, gap: 7 }}>
        <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 16.5, lineHeight: 21, color: farben.text }}>
          {titel}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1, maxWidth: 150 }}>
            <Balken wert={anteil} hoehe={5} farbe={prozent >= 75 ? farben.gruen : farben.orange} />
          </View>
          <Text style={{ ...schrift.textMittel, fontSize: 13, color: farben.text3, fontVariant: ["tabular-nums"] }}>
            {prozent} % · {anzahl === 1 ? "1 Frage" : `${anzahl} Fragen`}
          </Text>
        </View>
      </View>
      <Icon name="chevron-forward" size={16} color={farben.text4} />
    </Pressable>
  );
}
