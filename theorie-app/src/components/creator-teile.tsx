import type { ReactNode } from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import type { Icon as PhosphorIcon } from "phosphor-react-native";

import { GlasKarte } from "@/components/glas-flaeche";
import { Icon } from "@/components/icon";
import { NutzerBild } from "@/components/profilbild";
import type { CreatorStatus } from "@/lib/creator";
import { STATUS_TEXT } from "@/lib/creator";
import { useFarbwelt, type Farbwelt } from "@/lib/darstellung";
import { useFenster } from "@/lib/fenster";
import { tippen } from "@/lib/haptik";
import { leuchten, mitDeckkraft, schrift } from "@/lib/theme";

// Bausteine für Bewerbung und Creator-Verwaltung: ruhige Glas-Zeilen wie in den
// Einstellungen, Status als kleine farbige Marke, Kontakt als runde Knöpfe.

/** Rot und Grün passend zur Darstellung. */
export function signal(f: Farbwelt) {
  return { rot: f.hell ? "#E5392C" : "#FF5A4F", gruen: f.hell ? "#23A548" : "#4ED053" };
}

/** Farbe eines Bewerbungs-Status – null heißt neutral (grau). */
export function statusFarbe(f: Farbwelt, status: CreatorStatus): string | null {
  const s = signal(f);
  if (status === "offen") return f.orange;
  if (status === "angenommen") return s.gruen;
  if (status === "zurueckgezogen") return null;
  return s.rot;
}

/** Kleine Marke mit Punkt: z. B. „Wird geprüft“ in Orange. */
export function StatusMarke({ status, text, klein }: { status: CreatorStatus; text?: string; klein?: boolean }) {
  const f = useFarbwelt();
  const farbe = statusFarbe(f, status);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: klein ? 22 : 26,
        paddingHorizontal: klein ? 8 : 10,
        borderRadius: 13,
        backgroundColor: farbe ? mitDeckkraft(farbe, f.hell ? 0.12 : 0.16) : f.hell ? "rgba(20,23,27,0.06)" : "rgba(255,255,255,0.08)",
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: farbe ?? f.text3 }} />
      <Text style={{ ...schrift.textHalb, fontSize: klein ? 11.5 : 12.5, color: farbe ?? f.text2 }}>{text ?? STATUS_TEXT[status]}</Text>
    </View>
  );
}

/** Rote LIVE-Marke. */
export function LiveMarke() {
  const f = useFarbwelt();
  return (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: 5, height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: signal(f).rot }, leuchten(signal(f).rot, 0.4, 8, 0)]}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#FFFFFF" }} />
      <Text style={{ ...schrift.textFett, fontSize: 11, letterSpacing: 0.6, color: "#FFFFFF" }}>LIVE</Text>
    </View>
  );
}

/** Bezeichnung links, Wert rechts. Antippbar (Telefon, E-Mail) in Orange. */
export function Eintrag({ titel, wert, onPress, rot }: { titel: string; wert: string; onPress?: () => void; rot?: boolean }) {
  const f = useFarbwelt();
  const farbe = rot ? signal(f).rot : onPress ? f.orange : f.text2;
  const inhalt = (gedrueckt: boolean) => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        minHeight: 52,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: gedrueckt ? (f.hell ? "rgba(20,23,27,0.04)" : "rgba(255,255,255,0.05)") : "transparent",
      }}
    >
      <Text style={{ ...schrift.textMittel, fontSize: 15.5, color: f.text }}>{titel}</Text>
      <Text selectable={!onPress} numberOfLines={1} style={{ ...(onPress || rot ? schrift.textHalb : schrift.text), fontSize: 15.5, color: farbe, flex: 1, textAlign: "right" }}>
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

/** Text mit kleiner Überschrift in einer Glaskarte (Themen, Erfahrung, Nachricht). */
export function TextKarte({ titel, symbol: S, text }: { titel: string; symbol?: PhosphorIcon; text: string }) {
  const f = useFarbwelt();
  return (
    <GlasKarte style={{ padding: 16, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
        {S ? <S size={16} color={f.orange} weight="fill" /> : null}
        <Text style={{ ...schrift.textHalb, fontSize: 13.5, color: f.text2 }}>{titel}</Text>
      </View>
      <Text selectable style={{ ...schrift.text, fontSize: 16, lineHeight: 23, color: f.text }}>
        {text}
      </Text>
    </GlasKarte>
  );
}

/** Person mit Bild, Name, Unterzeile und rechts einer kurzen Angabe (oder Status bzw. LIVE). */
export function PersonZeile({
  name,
  unter,
  rechts,
  rechtsRot,
  bild,
  benutzername,
  farbe,
  onPress,
  status,
}: {
  name: string;
  unter: string;
  rechts: string;
  rechtsRot?: boolean;
  bild: string | null;
  benutzername: string | null;
  farbe: string | null;
  onPress: () => void;
  /** Statt des Textes rechts eine farbige Status-Marke. */
  status?: CreatorStatus;
}) {
  const f = useFarbwelt();
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${unter}, ${rechtsRot ? "live" : status ? STATUS_TEXT[status] : rechts}`}
    >
      {({ pressed }) => (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 13,
            paddingVertical: 12,
            paddingHorizontal: 14,
            backgroundColor: pressed ? (f.hell ? "rgba(20,23,27,0.04)" : "rgba(255,255,255,0.05)") : "transparent",
          }}
        >
          <View>
            <NutzerBild pfad={bild} name={benutzername ?? name} farbe={farbe ?? undefined} groesse={46} rand={0} />
            {rechtsRot ? <View style={{ position: "absolute", right: -1, bottom: -1, width: 14, height: 14, borderRadius: 7, borderWidth: 2.5, borderColor: f.hell ? "#FFFFFF" : "#16181C", backgroundColor: signal(f).rot }} /> : null}
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 16, color: f.text }}>
              {name}
            </Text>
            {unter ? (
              <Text numberOfLines={1} style={{ ...schrift.text, fontSize: 13.5, color: f.text3 }}>
                {unter}
              </Text>
            ) : null}
          </View>
          {rechtsRot ? <LiveMarke /> : status ? <StatusMarke status={status} klein /> : rechts ? <Text style={{ ...schrift.textMittel, fontSize: 13, color: f.text3 }}>{rechts}</Text> : null}
          <Icon name="chevron-forward" size={16} color={f.text3} />
        </View>
      )}
    </Pressable>
  );
}

/** Runder Aktionsknopf mit Beschriftung darunter – wie in der iOS-Kontaktkarte. */
export function RundKnopf({ symbol: S, label, onPress }: { symbol: PhosphorIcon; label: string; onPress: () => void }) {
  const f = useFarbwelt();
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ alignItems: "center", gap: 7, width: 84, opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] })}
    >
      <GlasKarte style={{ width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" }}>
        <S size={24} color={f.orange} weight="fill" />
      </GlasKarte>
      <Text style={{ ...schrift.textHalb, fontSize: 13, color: f.text }}>{label}</Text>
    </Pressable>
  );
}

/** Ruhiger Leer-Zustand: Symbol, Titel, kurzer Text. */
export function LeerZustand({ symbol: S, titel, text, style }: { symbol: PhosphorIcon; titel: string; text?: string; style?: StyleProp<ViewStyle> }) {
  const f = useFarbwelt();
  return (
    <GlasKarte style={[{ paddingVertical: 30, paddingHorizontal: 24, alignItems: "center", gap: 6 }, style]}>
      <S size={34} color={f.text3} weight="fill" />
      <Text style={{ ...schrift.titel, fontSize: 18, lineHeight: 23, color: f.text, textAlign: "center", marginTop: 6 }}>{titel}</Text>
      {text ? <Text style={{ ...schrift.text, fontSize: 14, lineHeight: 20, color: f.text3, textAlign: "center" }}>{text}</Text> : null}
    </GlasKarte>
  );
}

/** Inhalt auf dem iPad mittig und nicht breiter als 720 – auf dem Handy volle Breite. */
export function Mitte({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { width } = useFenster();
  return <View style={[{ width: "100%", maxWidth: width >= 700 ? 720 : undefined, alignSelf: "center" }, style]}>{children}</View>;
}
