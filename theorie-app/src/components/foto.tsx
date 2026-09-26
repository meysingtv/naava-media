import type { ReactNode } from "react";
import { Image, Pressable, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { Icon } from "@/components/icon";
import { Balken, PfeilKreis, T } from "@/components/ui";
import { Verkehrszeichen } from "@/components/zeichen";
import type { ThemaId } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { abstand, farben, schrift } from "@/lib/theme";

const DUNKEL = "rgba(11,12,15,";

/** Foto als Hintergrund mit Verlauf – Grundlage aller Bildkarten. */
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
          colors={[DUNKEL + "0.72)", DUNKEL + "0.3)", DUNKEL + "0)"]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}
      <LinearGradient
        colors={
          verlauf === "stark"
            ? [DUNKEL + "0.25)", DUNKEL + "0.55)", DUNKEL + "0.92)"]
            : verlauf === "links"
              ? [DUNKEL + "0)", DUNKEL + "0.05)", DUNKEL + "0.6)"]
              : [DUNKEL + "0)", DUNKEL + "0.15)", DUNKEL + "0.85)"]
        }
        locations={[0, 0.45, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {children}
    </>
  );
  const rahmen: ViewStyle = { borderRadius: 20, overflow: "hidden", backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie };
  if (!onPress) return <View style={[rahmen, style]}>{inhalt}</View>;
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      style={({ pressed }) => [rahmen, { transform: [{ scale: pressed ? 0.98 : 1 }], opacity: pressed ? 0.92 : 1 }, style]}
    >
      {inhalt}
    </Pressable>
  );
}

/** Schnellstart-Kachel: Foto, Symbol oben links, Titel unten, oranger Pfeil. */
export function FotoKachel({
  quelle,
  titel,
  unter,
  oben,
  onPress,
  hintergrund,
}: {
  quelle?: ImageSourcePropType;
  titel: string;
  unter: string;
  oben?: ReactNode;
  onPress: () => void;
  hintergrund?: ReactNode;
}) {
  const text = (
    <View style={{ flex: 1, padding: 13, justifyContent: "space-between" }}>
      <View style={{ flexDirection: "row" }}>{oben}</View>
      <View>
        <T v="h3" passend style={{ fontSize: 18, lineHeight: 22, letterSpacing: -0.3, textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 6 }}>
          {titel}
        </T>
        <View style={{ flexDirection: "row", alignItems: "center", gap: abstand(1.5) }}>
          <T v="klein" farbe="#E9EBEE" passend style={{ flex: 1, fontSize: 13.5, lineHeight: 18, textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 4 }}>
            {unter}
          </T>
          <PfeilKreis groesse={28} />
        </View>
      </View>
    </View>
  );
  if (quelle) {
    return (
      <FotoFlaeche quelle={quelle} onPress={onPress} style={{ flex: 1, height: 131, borderRadius: 16 }}>
        {hintergrund}
        {text}
      </FotoFlaeche>
    );
  }
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      style={({ pressed }) => ({
        flex: 1,
        height: 131,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: farben.flaeche,
        borderWidth: 1,
        borderColor: farben.linie,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      {hintergrund}
      {text}
    </Pressable>
  );
}

/** Leuchtende orange Säulen – Motiv der Statistik-Kachel. */
export function LeuchtSaeulen({ hoehe = 84 }: { hoehe?: number }) {
  const werte = [0.34, 0.5, 0.7, 1];
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 7, height: hoehe }}>
      {werte.map((w, i) => (
        <View
          key={i}
          style={{
            width: 15,
            height: hoehe * w,
            borderRadius: 4,
            overflow: "hidden",
            shadowColor: farben.orange,
            shadowOpacity: 0.8,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 0 },
          }}
        >
          <LinearGradient colors={["#FFB45C", farben.orange, "#B94A00"]} locations={[0, 0.5, 1]} style={{ flex: 1 }} />
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Kategorien
// ---------------------------------------------------------------------------

export type KategorieId = ThemaId | "grundstoff";

function Kreis({ children }: { children: ReactNode }) {
  return <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: farben.iconKreis, alignItems: "center", justifyContent: "center" }}>{children}</View>;
}

/** Symbol einer Kategorie – Zeichen, wo es eins gibt, sonst ein ruhiges Icon. */
export function KategorieIcon({ id }: { id: KategorieId }) {
  switch (id) {
    case "grundstoff":
      return (
        <Kreis>
          <Icon name="school-outline" size={28} color="#E4E6EA" />
        </Kreis>
      );
    case "gefahren":
      return <Icon name="warning-outline" size={40} color="#FF5A1F" weight="semibold" />;
    case "vorfahrt":
      return <Verkehrszeichen zeichen="z306" groesse={46} />;
    case "zeichen":
      return <Verkehrszeichen zeichen="z101" groesse={46} />;
    case "umwelt":
      return (
        <Kreis>
          <Icon name="leaf" size={28} color={farben.gruen} />
        </Kreis>
      );
    case "technik":
      return (
        <Kreis>
          <Icon name="settings" size={30} color="#B4B9C1" />
        </Kreis>
      );
    case "manoever":
      return (
        <Kreis>
          <Icon name="walk" size={28} color="#B4B9C1" fallback={<MaterialCommunityIcons name="human-cane" size={32} color="#B4B9C1" />} />
        </Kreis>
      );
    case "tempo":
      return (
        <Kreis>
          <Icon name="speedometer" size={28} color={farben.orange} />
        </Kreis>
      );
    case "parken":
      return <Verkehrszeichen zeichen="z314" groesse={44} />;
    case "autobahn":
      return (
        <Kreis>
          <Icon name="car-outline" sf="road.lanes" size={26} color={farben.blau} fallback={<MaterialCommunityIcons name="highway" size={28} color={farben.blau} />} />
        </Kreis>
      );
    case "mensch":
      return (
        <Kreis>
          <Icon name="person" size={26} color="#B4B9C1" />
        </Kreis>
      );
    case "zahlen":
      return (
        <Kreis>
          <Icon name="calculator" size={27} color={farben.gelb} />
        </Kreis>
      );
  }
}

/** Zeile der Kategorienliste: Symbol, Titel, Anzahl, Balken und Foto rechts. */
export function KategorieZeile({
  id,
  titel,
  anzahl,
  anteil,
  quelle,
  onPress,
}: {
  id: KategorieId;
  titel: string;
  anzahl: number;
  anteil: number;
  quelle: ImageSourcePropType;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      style={({ pressed }) => ({
        height: 81,
        borderRadius: 14,
        overflow: "hidden",
        backgroundColor: farben.flaeche,
        borderWidth: 1,
        borderColor: farben.linie,
        flexDirection: "row",
        alignItems: "center",
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <Image source={quelle} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "54%", height: "100%" }} resizeMode="cover" />
      <LinearGradient
        colors={[farben.flaeche, "rgba(22,24,28,0.86)", "rgba(22,24,28,0.25)", "rgba(22,24,28,0)"]}
        locations={[0, 0.3, 0.72, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "62%" }}
      />
      <View style={{ width: 74, alignItems: "center", justifyContent: "center" }}>
        <KategorieIcon id={id} />
      </View>
      <View style={{ flex: 1, paddingRight: 56 }}>
        <T v="h3" numberOfLines={1} style={{ fontSize: 17, lineHeight: 21, ...schrift.textHalb, textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 6 }}>
          {titel}
        </T>
        <T v="klein" farbe={farben.text2} style={{ ...schrift.text, fontSize: 14, lineHeight: 18, marginTop: 1 }}>
          {anzahl === 1 ? "1 Frage" : `${anzahl} Fragen`}
        </T>
        <View style={{ width: 118, marginTop: 7 }}>
          <Balken wert={anteil} hoehe={7} hintergrund="rgba(255,255,255,0.13)" />
        </View>
      </View>
      <View
        style={{
          position: "absolute",
          right: 10,
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: "rgba(0,0,0,0.5)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="chevron-forward" size={18} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}
