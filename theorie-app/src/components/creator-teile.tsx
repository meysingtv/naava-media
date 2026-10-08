import { Pressable, Text, View } from "react-native";

import { Icon } from "@/components/icon";
import { NutzerBild } from "@/components/profilbild";
import { useFarbwelt } from "@/lib/darstellung";
import { tippen } from "@/lib/haptik";
import { schrift } from "@/lib/theme";

// Schlichte Listenzeilen für Bewerbung und Creator-Verwaltung – im Stil der
// Einstellungen (Gruppe mit Haarlinien), ohne Symbole und Pillen.

/** Bezeichnung links, Wert rechts. Antippbar (Telefon, E-Mail) in Orange. */
export function Eintrag({ titel, wert, onPress, rot }: { titel: string; wert: string; onPress?: () => void; rot?: boolean }) {
  const f = useFarbwelt();
  const farbe = rot ? (f.hell ? "#E5392C" : "#FF5A4F") : onPress ? f.orange : f.text2;
  const inhalt = (gedrueckt: boolean) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 50,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: gedrueckt ? (f.hell ? "rgba(20,23,27,0.04)" : "rgba(255,255,255,0.04)") : "transparent",
      }}
    >
      <Text style={{ ...schrift.textMittel, fontSize: 15.5, color: f.text }}>{titel}</Text>
      <Text selectable={!onPress} numberOfLines={1} style={{ ...schrift.text, fontSize: 15.5, color: farbe, flex: 1, textAlign: "right" }}>
        {wert}
      </Text>
    </View>
  );
  if (!onPress) return inhalt(false);
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${titel}: ${wert}`}
    >
      {({ pressed }) => inhalt(pressed)}
    </Pressable>
  );
}

/** Längerer Text in einer Gruppe. */
export function Absatz({ text }: { text: string }) {
  const f = useFarbwelt();
  return (
    <Text selectable style={{ ...schrift.text, fontSize: 15.5, lineHeight: 22, color: f.text, paddingHorizontal: 16, paddingVertical: 13 }}>
      {text}
    </Text>
  );
}

/** Person mit Bild, Name, Unterzeile und rechts einer kurzen Angabe. */
export function PersonZeile({
  name,
  unter,
  rechts,
  rechtsRot,
  bild,
  benutzername,
  farbe,
  onPress,
}: {
  name: string;
  unter: string;
  rechts: string;
  rechtsRot?: boolean;
  bild: string | null;
  benutzername: string | null;
  farbe: string | null;
  onPress: () => void;
}) {
  const f = useFarbwelt();
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${unter}, ${rechts}`}
    >
      {({ pressed }) => (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingVertical: 11,
            paddingHorizontal: 14,
            backgroundColor: pressed ? (f.hell ? "rgba(20,23,27,0.04)" : "rgba(255,255,255,0.04)") : "transparent",
          }}
        >
          <NutzerBild pfad={bild} name={benutzername ?? name} farbe={farbe ?? undefined} groesse={38} rand={0} />
          <View style={{ flex: 1, gap: 1 }}>
            <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 15.5, color: f.text }}>
              {name}
            </Text>
            <Text numberOfLines={1} style={{ ...schrift.text, fontSize: 13, color: f.text3 }}>
              {unter}
            </Text>
          </View>
          <Text style={{ ...(rechtsRot ? schrift.textFett : schrift.text), fontSize: 13, color: rechtsRot ? (f.hell ? "#E5392C" : "#FF5A4F") : f.text3 }}>{rechts}</Text>
          <Icon name="chevron-forward" size={16} color={f.text3} />
        </View>
      )}
    </Pressable>
  );
}
