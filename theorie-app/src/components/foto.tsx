import type { ReactNode } from "react";
import { Image, Pressable, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

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
    <View style={{ flex: 1, padding: abstand(3), justifyContent: "space-between" }}>
      <View style={{ flexDirection: "row" }}>{oben}</View>
      <View>
        <T v="h3" style={{ fontSize: 17.5, lineHeight: 22, letterSpacing: -0.3, textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 6 }} numberOfLines={1} >
          {titel}
        </T>
        <View style={{ flexDirection: "row", alignItems: "center", gap: abstand(1.5) }}>
          <T v="klein" farbe="#E4E6EA" style={{ flex: 1, fontSize: 12.5, textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 4 }} numberOfLines={1}>
            {unter}
          </T>
          <PfeilKreis groesse={28} />
        </View>
      </View>
    </View>
  );
  if (quelle) {
    return (
      <FotoFlaeche quelle={quelle} onPress={onPress} style={{ flex: 1, height: 132 }}>
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
        height: 132,
        borderRadius: 20,
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
  return <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: "#22252B", alignItems: "center", justifyContent: "center" }}>{children}</View>;
}

/** Symbol einer Kategorie – Zeichen, wo es eins gibt, sonst ein ruhiges Icon. */
export function KategorieIcon({ id }: { id: KategorieId }) {
  switch (id) {
    case "grundstoff":
      return (
        <Kreis>
          <Ionicons name="school-outline" size={27} color={farben.text2} />
        </Kreis>
      );
    case "gefahren":
      return <Ionicons name="warning-outline" size={46} color={farben.orange} />;
    case "vorfahrt":
      return <Verkehrszeichen zeichen="z306" groesse={50} />;
    case "zeichen":
      return <Verkehrszeichen zeichen="z101" groesse={50} />;
    case "umwelt":
      return (
        <Kreis>
          <Ionicons name="leaf" size={27} color={farben.gruen} />
        </Kreis>
      );
    case "technik":
      return (
        <Kreis>
          <Ionicons name="settings" size={27} color="#A7ACB4" />
        </Kreis>
      );
    case "manoever":
      return (
        <Kreis>
          <Ionicons name="walk" size={28} color="#A7ACB4" />
        </Kreis>
      );
    case "tempo":
      return (
        <Kreis>
          <Ionicons name="speedometer" size={26} color={farben.orange} />
        </Kreis>
      );
    case "parken":
      return <Verkehrszeichen zeichen="z314" groesse={44} />;
    case "autobahn":
      return (
        <Kreis>
          <MaterialCommunityIcons name="highway" size={28} color={farben.blau} />
        </Kreis>
      );
    case "mensch":
      return (
        <Kreis>
          <Ionicons name="person" size={24} color="#A7ACB4" />
        </Kreis>
      );
    case "zahlen":
      return (
        <Kreis>
          <Ionicons name="calculator" size={25} color={farben.gelb} />
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
        height: 94,
        borderRadius: 18,
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
      <View style={{ width: 80, alignItems: "center", justifyContent: "center" }}>
        <KategorieIcon id={id} />
      </View>
      <View style={{ flex: 1, paddingRight: 64, gap: 3 }}>
        <T v="h3" numberOfLines={1} style={{ fontSize: 17, textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 6 }}>
          {titel}
        </T>
        <T v="klein" farbe={farben.text2} style={{ fontFamily: schrift.textMittel }}>
          {anzahl === 1 ? "1 Frage" : `${anzahl} Fragen`}
        </T>
        <View style={{ width: "78%", marginTop: 6 }}>
          <Balken wert={anteil} hoehe={7} hintergrund="rgba(255,255,255,0.13)" />
        </View>
      </View>
      <View
        style={{
          position: "absolute",
          right: 12,
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: "rgba(0,0,0,0.5)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="chevron-forward" size={19} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}
