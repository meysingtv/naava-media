import type { ReactNode } from "react";
import { Image, Pressable, Text, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { Icon } from "@/components/icon";
import { Balken, PfeilKreis, T } from "@/components/ui";
import { TempoZeichen, Verkehrszeichen } from "@/components/zeichen";
import type { ThemaId } from "@/lib/fragen";
import { tippen } from "@/lib/haptik";
import { abstand, farben, schrift, verlauf } from "@/lib/theme";

const DUNKEL = "rgba(3,5,7,";

/**
 * Weicher Übergang von der Kartenfläche ins Foto: am linken Fotorand voll
 * deckend, dann in einer sanften Kurve durchsichtig – so ist keine Kante zu sehen.
 */
const VERBLENDEN = [
  "rgba(13,19,23,1)",
  "rgba(13,19,23,0.97)",
  "rgba(13,19,23,0.88)",
  "rgba(13,19,23,0.68)",
  "rgba(13,19,23,0.44)",
  "rgba(13,19,23,0.22)",
  "rgba(13,19,23,0.08)",
  "rgba(13,19,23,0)",
] as const;
const VERBLENDEN_STOPS = [0, 0.1, 0.22, 0.36, 0.5, 0.64, 0.8, 1] as const;

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
  return <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: farben.iconKreis, alignItems: "center", justifyContent: "center" }}>{children}</View>;
}

/** Symbol einer Kategorie wie in der Vorlage – Verkehrszeichen, wo es eins gibt. */
export function KategorieIcon({ id }: { id: KategorieId }) {
  switch (id) {
    case "grundstoff":
      return (
        <Kreis>
          <Icon name="car-outline" sf="car.fill" size={32} color="#FFFFFF" fallback={<MaterialCommunityIcons name="car" size={34} color="#FFFFFF" />} />
        </Kreis>
      );
    case "gefahren":
      return (
        <Kreis>
          <Icon name="warning-outline" size={36} color="#FF3B2F" weight="semibold" />
        </Kreis>
      );
    case "vorfahrt":
      return <Verkehrszeichen zeichen="z306" groesse={52} />;
    case "zeichen":
      return <TempoZeichen zahl={50} groesse={52} />;
    case "umwelt":
      return (
        <Kreis>
          <Icon name="leaf" size={34} color={farben.gruen} />
        </Kreis>
      );
    case "technik":
      return (
        <Kreis>
          <Icon name="settings" size={34} color="#E6E8EB" />
        </Kreis>
      );
    case "manoever":
      return (
        <Kreis>
          <Icon name="walk" size={34} color="#FFFFFF" fallback={<MaterialCommunityIcons name="walk" size={36} color="#FFFFFF" />} />
        </Kreis>
      );
    case "tempo":
      return (
        <Kreis>
          <Icon name="speedometer" size={32} color={farben.orange} />
        </Kreis>
      );
    case "parken":
      return <Verkehrszeichen zeichen="z314" groesse={48} />;
    case "autobahn":
      return (
        <Kreis>
          <Icon name="car-outline" sf="road.lanes" size={30} color={farben.blau} fallback={<MaterialCommunityIcons name="highway" size={30} color={farben.blau} />} />
        </Kreis>
      );
    case "mensch":
      return (
        <Kreis>
          <Icon name="person" size={30} color="#E6E8EB" />
        </Kreis>
      );
    case "zahlen":
      return (
        <Kreis>
          <Icon name="calculator" size={30} color={farben.gelb} />
        </Kreis>
      );
  }
}

/** Kleines Symbol für Listen (Stärken & Schwächen). */
export function KategorieMini({ id }: { id: KategorieId }) {
  switch (id) {
    case "zeichen":
      return <Verkehrszeichen zeichen="z101" groesse={26} />;
    case "vorfahrt":
      return <Verkehrszeichen zeichen="z306" groesse={26} />;
    case "gefahren":
      return <Icon name="warning" size={24} color="#FF3B2F" />;
    case "umwelt":
      return <Icon name="leaf" size={24} color={farben.gruen} />;
    case "technik":
      return <Icon name="settings" size={24} color="#FFFFFF" />;
    case "manoever":
      return <Icon name="walk" size={24} color="#FFFFFF" />;
    case "tempo":
      return <Icon name="speedometer" size={23} color={farben.orange} />;
    case "parken":
      return <Verkehrszeichen zeichen="z314" groesse={24} />;
    case "autobahn":
      return <Icon name="car-outline" sf="road.lanes" size={22} color={farben.blau} />;
    case "mensch":
      return <Icon name="person" size={22} color="#FFFFFF" />;
    case "zahlen":
      return <Icon name="calculator" size={22} color={farben.gelb} />;
    default:
      return <Icon name="car-outline" sf="car.fill" size={22} color="#FFFFFF" />;
  }
}

/** Zeile der Kategorienliste: Symbol, Titel, Anzahl, Balken mit Prozent und Foto rechts. */
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
        height: 84,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: farben.flaeche,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.09)",
        flexDirection: "row",
        alignItems: "center",
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <Image source={quelle} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "60%", height: "100%" }} resizeMode="cover" />
      <LinearGradient
        colors={VERBLENDEN}
        locations={VERBLENDEN_STOPS}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "60%" }}
      />
      <View style={{ width: 86, alignItems: "center", justifyContent: "center" }}>
        <KategorieIcon id={id} />
      </View>
      <View style={{ flex: 1, paddingRight: 56 }}>
        <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 17.5, lineHeight: 22, color: "#FFFFFF", textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 6 }}>
          {titel}
        </Text>
        <Text style={{ ...schrift.text, fontSize: 15, lineHeight: 19, color: "#D3D7DC", marginTop: 2 }}>{anzahl === 1 ? "1 Frage" : `${anzahl} Fragen`}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 }}>
          <View style={{ width: 112, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.16)", overflow: "hidden" }}>
            <LinearGradient
              colors={verlauf.kategorie}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ width: `${Math.max(0, Math.min(1, anteil)) * 100}%`, height: "100%", borderRadius: 4 }}
            />
          </View>
          <Text style={{ ...schrift.textHalb, fontSize: 15, color: "#FFFFFF", textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 4, fontVariant: ["tabular-nums"] }}>
            {Math.round(anteil * 100)}%
          </Text>
        </View>
      </View>
      <View
        style={{
          position: "absolute",
          right: 12,
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: "rgba(10,14,18,0.62)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="chevron-forward" size={19} color="#FFFFFF" weight="semibold" />
      </View>
    </Pressable>
  );
}
