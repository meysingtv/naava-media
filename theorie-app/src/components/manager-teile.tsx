import { useEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, Image, Modal, Pressable, ScrollView, Text, TextInput, View, type PressableStateCallbackType, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from "react-native";

import { Icon, type IconName } from "@/components/icon";
import { B, n, Raster, Symbol, TOENE, type Ton } from "@/components/web/bunt";
import { profilbildUrl } from "@/lib/profilbild";
import { ROLLE_TEXT, STATUS_TEXT, type Rolle, type ZugangStatus } from "@/lib/manager";

// Bausteine des Managers (Web-Panel) – im selben Look wie die Lern-App am PC
// (web/bunt.tsx): weiße Karten mit feiner Unterkante, Nunito, Farbe als
// kleiner Akzent, hell oder dunkel wie in den Einstellungen.

/** Hover gibt es nur im Browser – React Native kennt den Zustand nicht. */
export type Zustand = PressableStateCallbackType & { hovered?: boolean };

/** Farben des Managers – lesen die aktuellen Farben der PC-Fassung (hell/dunkel). */
export const M = {
  get grund() {
    return B.grund;
  },
  get leiste() {
    return B.grund;
  },
  get flaeche() {
    return B.flaeche;
  },
  get flaeche2() {
    return B.ton;
  },
  get hover() {
    return B.hover;
  },
  get linie() {
    return B.linie;
  },
  get linieStark() {
    return B.kante;
  },
  get kante() {
    return B.linie;
  },
  get text() {
    return B.text;
  },
  get text2() {
    return B.text2;
  },
  get text3() {
    return B.text3;
  },
  get orange() {
    return B.orange;
  },
  get orangeHell() {
    return B.orangeKante;
  },
  get orangeSoft() {
    return B.orangeHell;
  },
  get gruen() {
    return B.gruen;
  },
  get gelb() {
    return B.gelb;
  },
  get rot() {
    return B.rot;
  },
  get schildRot() {
    return B.rot;
  },
  get schildBlau() {
    return B.blau;
  },
};

export function useM() {
  return M;
}

/** Überschriften: Nunito, fett. (Früher Schild-Schrift in Großbuchstaben.) */
export function schild(groesse: number, fett = true): TextStyle {
  return { ...(fett ? n.schwarz : n.fett), fontSize: groesse, fontVariant: ["tabular-nums"] };
}

/** Kleine Beschriftung über Feldern und Spalten. */
export const etikett: TextStyle = {
  ...n.fett,
  fontSize: 13,
  get color() {
    return B.text3;
  },
};

export function zahlSchrift(groesse: number): TextStyle {
  return { ...n.schwarz, fontSize: groesse, fontVariant: ["tabular-nums"] };
}

export const zahl = (x: number) => x.toLocaleString("de-DE");

// ---------------------------------------------------------------------------
// Flächen
// ---------------------------------------------------------------------------

export function mFlaeche(): ViewStyle {
  return { backgroundColor: B.flaeche, borderWidth: 1.5, borderColor: B.linie, borderBottomWidth: 3, borderBottomColor: B.kante, borderRadius: 18 };
}

/** Karte mit Kopf (Titel, Zusatz, Aktion rechts). */
export function Tafel({ titel, zusatz, rechts, children, style, innen = true }: { titel?: string; zusatz?: string; rechts?: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle>; innen?: boolean }) {
  return (
    <View style={[mFlaeche(), { overflow: "hidden" }, style]}>
      {titel ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 54, paddingHorizontal: 20, borderBottomWidth: 1.5, borderBottomColor: B.ton }}>
          <Text style={{ ...n.schwarz, fontSize: 17, color: B.text }}>{titel}</Text>
          {zusatz ? (
            <View style={{ minWidth: 26, height: 24, paddingHorizontal: 8, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: B.orangeHell }}>
              <Text style={{ ...n.schwarz, fontSize: 12.5, color: B.orangeKante }}>{zusatz}</Text>
            </View>
          ) : null}
          <View style={{ flex: 1 }} />
          {rechts}
        </View>
      ) : null}
      <View style={innen ? { padding: 20 } : null}>{children}</View>
    </View>
  );
}

type Kennzahl = { titel: string; wert: string; unter?: string; hoch?: boolean; icon?: IconName; ton?: Ton; onPress?: () => void };

/** Große Zahlen als Kacheln mit farbigem Symbol. */
export function Kennzahlen({ werte }: { werte: Kennzahl[] }) {
  return (
    <Raster min={200} max={4} abstand={16}>
      {werte.map((w) => (
        <Pressable key={w.titel} disabled={!w.onPress} onPress={w.onPress} style={(z: Zustand) => [mFlaeche(), { padding: 20, gap: 12 }, z.hovered && w.onPress ? { backgroundColor: B.hover, borderColor: B.kante } : null]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            {w.icon ? <Symbol icon={w.icon} ton={w.ton ?? TOENE.orange} groesse={42} /> : <View />}
            {w.onPress ? <Icon name="chevron-forward" size={18} color={B.text3} /> : null}
          </View>
          <View>
            <Text style={{ ...n.schwarz, fontSize: 32, lineHeight: 38, color: B.text, fontVariant: ["tabular-nums"] }}>{w.wert}</Text>
            <Text style={{ ...n.fett, fontSize: 15, color: B.text }}>{w.titel}</Text>
            <Text style={{ ...n.halb, fontSize: 13, color: w.hoch ? B.gruenKante : B.text3, marginTop: 2 }} numberOfLines={1}>
              {w.unter ?? " "}
            </Text>
          </View>
        </Pressable>
      ))}
    </Raster>
  );
}

/** Zeile in einer Liste: hebt sich beim Überfahren leicht ab. */
export function Zeile({ onPress, children, style, oben }: { onPress?: () => void; children: ReactNode; style?: ViewStyle; oben?: boolean }) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, minHeight: 56, borderTopWidth: oben ? 1.5 : 0, borderTopColor: B.ton, backgroundColor: z.hovered && onPress ? B.hover : "transparent", ...style })}
    >
      {children}
    </Pressable>
  );
}

/** Überschrift für Abschnitte in Blatt und Fenster. */
export function Abschnitt({ titel, rechts }: { titel: string; rechts?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
      <Text style={{ ...n.schwarz, fontSize: 16, color: B.text }}>{titel}</Text>
      {rechts}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Marken
// ---------------------------------------------------------------------------

function statusTon(s: ZugangStatus): Ton {
  return s === "aktiv" ? TOENE.gruen : s === "pausiert" ? TOENE.gelb : TOENE.rot;
}

export function statusFarbe(s: ZugangStatus): string {
  return statusTon(s).farbe;
}

export function statusText(status: ZugangStatus, bis?: string | null): string {
  return status === "pausiert" && bis ? `Pausiert bis ${new Date(bis).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}` : STATUS_TEXT[status];
}

/** Status als kleines farbiges Symbol. */
export function StatusZeichen({ status, groesse = 18 }: { status: ZugangStatus; groesse?: number }) {
  const icon: IconName = status === "aktiv" ? "checkmark-circle" : status === "pausiert" ? "pause-circle" : "ban";
  return <Icon name={icon} size={groesse} color={statusTon(status).farbe} />;
}

/** Status als farbige Kapsel. */
export function StatusPlakette({ status, bis }: { status: ZugangStatus; bis?: string | null }) {
  const t = statusTon(status);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: t.hell }}>
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: t.farbe }} />
      <Text style={{ ...n.fett, fontSize: 13, color: t.kante }} numberOfLines={1}>
        {statusText(status, bis)}
      </Text>
    </View>
  );
}

/** Führerscheinklasse als kleine Kapsel. */
export function KlassenSchild({ klasse }: { klasse: string }) {
  return (
    <View style={{ alignSelf: "flex-start", minWidth: 32, height: 26, paddingHorizontal: 9, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: B.ton }}>
      <Text style={{ ...n.schwarz, fontSize: 13, color: B.text2 }}>{klasse}</Text>
    </View>
  );
}

export function rolleText(rolle: Rolle, inhaber?: boolean): string {
  return inhaber ? "Inhaber" : ROLLE_TEXT[rolle];
}

/** Profilbild oder Kürzel. */
export function MAvatar({ pfad, name, groesse = 32 }: { pfad: string | null | undefined; name: string; groesse?: number }) {
  const teile = name.trim().split(/\s+/);
  const kuerzel = ((teile[0]?.[0] ?? "") + (teile.length > 1 ? (teile[teile.length - 1]?.[0] ?? "") : "")).toUpperCase() || "?";
  return (
    <View style={{ width: groesse, height: groesse, borderRadius: groesse / 2, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: B.ton }}>
      {pfad ? (
        <Image source={{ uri: profilbildUrl(pfad) }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
      ) : (
        <Text style={{ ...n.schwarz, fontSize: groesse * 0.38, color: B.text2 }}>{kuerzel}</Text>
      )}
    </View>
  );
}

/** Runder Balken für Anteile. */
export function Balken({ anteil, farbe, breite, hoehe = 8 }: { anteil: number; farbe?: string; breite?: number; hoehe?: number }) {
  return (
    <View style={{ width: breite, flex: breite ? undefined : 1, height: hoehe, borderRadius: hoehe / 2, backgroundColor: B.ton, overflow: "hidden" }}>
      <View style={{ width: `${Math.max(0, Math.min(1, anteil)) * 100}%`, height: "100%", borderRadius: hoehe / 2, backgroundColor: farbe ?? B.orange }} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Eingaben
// ---------------------------------------------------------------------------

export function Feld({ titel, hinweis, children, style }: { titel: string; hinweis?: string; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: 7 }, style]}>
      <Text style={{ ...n.fett, fontSize: 14, color: B.text2 }}>{titel}</Text>
      {children}
      {hinweis ? <Text style={{ ...n.halb, fontSize: 13, lineHeight: 18, color: B.text3 }}>{hinweis}</Text> : null}
    </View>
  );
}

export function MEingabe({ icon, rechts, mehrzeilig, ...props }: TextInputProps & { icon?: IconName; rechts?: ReactNode; mehrzeilig?: boolean }) {
  const aus = props.editable === false;
  return (
    <View style={{ flexDirection: "row", alignItems: mehrzeilig ? "flex-start" : "center", gap: 10, minHeight: mehrzeilig ? 96 : 46, paddingHorizontal: 14, paddingVertical: mehrzeilig ? 10 : 0, borderRadius: 12, borderWidth: 1.5, borderColor: B.linie, backgroundColor: aus ? B.flaeche : B.ton }}>
      {icon ? <Icon name={icon} size={17} color={B.text3} /> : null}
      <TextInput
        placeholderTextColor={B.text3}
        selectionColor={B.orange}
        multiline={mehrzeilig}
        {...props}
        style={[{ flex: 1, minWidth: 0, ...n.halb, fontSize: 15, color: aus ? B.text3 : B.text, minHeight: mehrzeilig ? 76 : 44, outlineWidth: 0 }, mehrzeilig ? { textAlignVertical: "top" } : null, props.style]}
      />
      {rechts}
    </View>
  );
}

/** Auswahl als Reihe kleiner Felder – das Gewählte orange umrandet. */
export function Auswahl<W extends string>({ optionen, wert, onWechsel }: { optionen: { id: W; titel: string }[]; wert: W; onWechsel: (w: W) => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {optionen.map((o) => {
        const aktiv = o.id === wert;
        return (
          <Pressable
            key={o.id}
            onPress={() => onWechsel(o.id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: aktiv }}
            style={(z: Zustand) => ({ height: 36, paddingHorizontal: 14, borderRadius: 10, justifyContent: "center", borderWidth: 1.5, borderBottomWidth: 3, borderColor: aktiv ? B.orange : B.linie, borderBottomColor: aktiv ? B.orangeKante : B.kante, backgroundColor: aktiv ? B.orangeHell : z.hovered ? B.hover : B.flaeche })}
          >
            <Text style={{ ...n.fett, fontSize: 14, color: aktiv ? B.orangeKante : B.text2 }}>{o.titel}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Reiter zum Umschalten – wie in der Lern-App. */
export function Reiter<W extends string>({ optionen, wert, onWechsel }: { optionen: { id: W; titel: string; zahl?: number }[]; wert: W; onWechsel: (w: W) => void; hoehe?: number }) {
  return (
    <View style={{ flexDirection: "row", alignSelf: "flex-start", flexWrap: "wrap", gap: 4, padding: 4, borderRadius: 14, backgroundColor: B.ton }}>
      {optionen.map((o) => {
        const aktiv = o.id === wert;
        return (
          <Pressable
            key={o.id}
            onPress={() => onWechsel(o.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: aktiv }}
            style={(z: Zustand) => ({ flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 10, backgroundColor: aktiv ? B.flaeche : z.hovered ? B.hover2 : "transparent", borderWidth: aktiv ? 1.5 : 0, borderColor: B.linie })}
          >
            <Text style={{ ...n.fett, fontSize: 14, color: aktiv ? B.text : B.text2 }}>{o.titel}</Text>
            {o.zahl != null ? <Text style={{ ...n.fett, fontSize: 13, color: aktiv ? B.orangeKante : B.text3, fontVariant: ["tabular-nums"] }}>{o.zahl}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Knöpfe
// ---------------------------------------------------------------------------

/** Knopf mit feiner Unterkante – wie in der Lern-App (sinkt beim Klicken ein). */
export function MKnopf({
  titel,
  icon,
  onPress,
  art = "primaer",
  laedt,
  deaktiviert,
  style,
}: {
  titel: string;
  icon?: IconName;
  onPress: () => void;
  art?: "primaer" | "sekundaer" | "gefahr" | "leise";
  laedt?: boolean;
  deaktiviert?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const aus = deaktiviert || laedt;
  const voll = art === "primaer";
  const leise = art === "leise";
  const gefahr = art === "gefahr";
  const textFarbe = voll ? "#FFFFFF" : gefahr ? B.rotKante : art === "sekundaer" ? B.text : B.text2;
  return (
    <Pressable
      onPress={onPress}
      disabled={aus}
      accessibilityRole="button"
      accessibilityLabel={titel}
      style={(z: Zustand) =>
        [
          { height: 40, paddingHorizontal: leise ? 10 : 16, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, opacity: deaktiviert ? 0.45 : 1 },
          voll ? { backgroundColor: B.orange, borderBottomWidth: z.pressed && !aus ? 0 : 3, borderBottomColor: B.orangeKante, marginTop: z.pressed && !aus ? 3 : 0 } : null,
          !voll && !leise
            ? { backgroundColor: z.hovered && !aus ? (gefahr ? B.rotHell : B.hover) : B.flaeche, borderWidth: 1.5, borderColor: gefahr ? B.rot : B.linie, borderBottomWidth: z.pressed && !aus ? 1.5 : 3, borderBottomColor: gefahr ? B.rotKante : B.kante, marginTop: z.pressed && !aus ? 1.5 : 0 }
            : null,
          leise ? { backgroundColor: z.hovered && !aus ? B.hover : "transparent" } : null,
          style,
        ] as StyleProp<ViewStyle>
      }
    >
      {laedt ? (
        <Drehung farbe={voll ? "#FFFFFF" : B.text2} groesse={15} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={17} color={voll ? "#FFFFFF" : gefahr ? B.rot : art === "sekundaer" ? B.blau : B.text3} /> : null}
          <Text style={{ ...n.fett, fontSize: 14.5, color: textFarbe }} numberOfLines={1}>
            {titel}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** Runder Knopf nur mit Symbol. */
export function IconTaste({ icon, label, onPress, gefahr, aus, groesse = 36 }: { icon: IconName; label: string; onPress: () => void; gefahr?: boolean; aus?: boolean; groesse?: number }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={aus}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={(z: Zustand) => ({ width: groesse, height: groesse, borderRadius: groesse / 2, alignItems: "center", justifyContent: "center", opacity: aus ? 0.3 : 1, backgroundColor: z.hovered && !aus ? (gefahr ? B.rotHell : B.ton) : "transparent" })}
    >
      <Icon name={icon} size={18} color={gefahr ? B.rot : B.text2} />
    </Pressable>
  );
}

/** Kleiner Lade-Kreis. */
export function Drehung({ farbe, groesse = 16 }: { farbe: string; groesse?: number }) {
  const dreh = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(Animated.timing(dreh, { toValue: 1, duration: 800, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    return () => a.stop();
  }, [dreh]);
  const rotate = dreh.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  return <Animated.View style={{ width: groesse, height: groesse, borderRadius: groesse / 2, borderWidth: 2, borderColor: B.linie, borderTopColor: farbe, transform: [{ rotate }] }} />;
}

/** Hinweis-Zeile (Fehler, Info, Erfolg). */
export function Hinweis({ art = "info", children }: { art?: "info" | "fehler" | "ok"; children: ReactNode }) {
  const t = art === "fehler" ? TOENE.rot : art === "ok" ? TOENE.gruen : null;
  const icon: IconName = art === "fehler" ? "alert-circle" : art === "ok" ? "checkmark-circle" : "information-circle";
  return (
    <View style={{ flexDirection: "row", gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: t ? t.hell : B.ton, alignItems: "flex-start" }}>
      <Icon name={icon} size={18} color={t ? t.farbe : B.text3} style={{ marginTop: 1 }} />
      <Text style={{ flex: 1, ...n.halb, fontSize: 14.5, lineHeight: 20, color: t ? t.kante : B.text2 }}>{children}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Fenster und Blatt
// ---------------------------------------------------------------------------

/** Fenster in der Mitte; Aktionen unten rechts. */
export function Fenster({ offen, onSchliessen, titel, unter, breite = 560, fuss, children }: { offen: boolean; onSchliessen: () => void; titel: string; unter?: string; breite?: number; fuss?: ReactNode; children: ReactNode }) {
  return (
    <Modal visible={offen} transparent animationType="fade" onRequestClose={onSchliessen}>
      <Pressable onPress={onSchliessen} style={{ flex: 1, backgroundColor: "rgba(10,12,15,0.4)", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Pressable onPress={() => {}} style={{ width: "100%", maxWidth: breite, maxHeight: "100%", borderRadius: 22, overflow: "hidden", backgroundColor: B.flaeche, borderWidth: 1.5, borderColor: B.linie, borderBottomWidth: 3, borderBottomColor: B.kante }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 24, paddingTop: 22, paddingBottom: 6 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ ...n.schwarz, fontSize: 22, color: B.text }}>{titel}</Text>
              {unter ? <Text style={{ ...n.halb, fontSize: 14.5, color: B.text2 }}>{unter}</Text> : null}
            </View>
            <IconTaste icon="close" label="Schließen" onPress={onSchliessen} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }}>{children}</ScrollView>
          {fuss ? <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 10, paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1.5, borderTopColor: B.ton }}>{fuss}</View> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Blatt, das von rechts hereinfährt (Details eines Zugangs). */
export function SeitenBlatt({ offen, onSchliessen, children }: { offen: boolean; onSchliessen: () => void; children: ReactNode }) {
  const x = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(x, { toValue: offen ? 0 : 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [offen, x]);
  return (
    <Modal visible={offen} transparent animationType="fade" onRequestClose={onSchliessen}>
      <View style={{ flex: 1, flexDirection: "row" }}>
        <Pressable onPress={onSchliessen} style={{ flex: 1, backgroundColor: "rgba(10,12,15,0.32)" }} accessibilityLabel="Schließen" />
        <Animated.View style={{ width: 520, maxWidth: "100%", height: "100%", backgroundColor: B.flaeche, borderLeftWidth: 1.5, borderLeftColor: B.linie, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 540] }) }] }}>{children}</Animated.View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Texte
// ---------------------------------------------------------------------------

/** „vor 3 Tagen“ – für „Zuletzt aktiv“. */
export function wannText(iso: string | null): string {
  if (!iso) return "noch nie";
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 90) return "gerade eben";
  if (s < 3600) return `vor ${Math.round(s / 60)} Min.`;
  if (s < 86400) return `vor ${Math.round(s / 3600)} Std.`;
  const t = Math.round(s / 86400);
  if (t === 1) return "gestern";
  if (t < 30) return `vor ${t} Tagen`;
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function datumText(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });
}
