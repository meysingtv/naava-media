import { useState, type ReactNode } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type ImageSourcePropType,
  type TextInputProps,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Logo } from "@/components/grafik";
import { Icon, type IconName } from "@/components/icon";
import { T, zurueck } from "@/components/ui";
import { tippen } from "@/lib/haptik";
import { abstand, farben, RAND, schrift } from "@/lib/theme";

/**
 * Rahmen für Anmelden und Registrieren: oben ein Foto mit Logo, darüber
 * schiebt sich eine schwarze Karte mit abgerundeten Ecken – darin das
 * Formular. Ein kurzer oranger Strich (wie eine Fahrbahnmarkierung) führt
 * zum Titel.
 */
export function AuthRahmen({
  foto,
  titel,
  unter,
  kopfAnteil = 0.33,
  onZurueck,
  children,
}: {
  foto: ImageSourcePropType;
  titel: string;
  unter: string;
  /** Anteil der Bildschirmhöhe für das Foto. */
  kopfAnteil?: number;
  onZurueck?: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const kopf = Math.max(200, Math.round(height * kopfAnteil));

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: farben.grund }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ height: kopf }}>
          <Image source={foto} style={{ position: "absolute", top: 0, left: 0, right: 0, height: kopf + 40, width: "100%" }} resizeMode="cover" />
          <LinearGradient
            colors={["rgba(3,5,7,0.62)", "rgba(3,5,7,0.12)", "rgba(3,5,7,0.2)", "rgba(3,5,7,0.55)"]}
            locations={[0, 0.35, 0.7, 1]}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: -40 }}
          />
          <View style={{ position: "absolute", top: insets.top + 4, left: RAND - 4, right: RAND - 4, height: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable
              onPress={() => {
                tippen();
                (onZurueck ?? zurueck)();
              }}
              hitSlop={8}
              accessibilityLabel="Zurück"
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(3,5,7,0.45)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.14)",
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Icon name="arrow-back" size={20} color="#FFFFFF" />
            </Pressable>
            <Logo groesse={24} />
            <View style={{ width: 40 }} />
          </View>
        </View>

        <View
          style={{
            flex: 1,
            marginTop: -30,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            backgroundColor: farben.grund,
            paddingHorizontal: RAND + 4,
            paddingTop: abstand(7),
            paddingBottom: insets.bottom + abstand(8),
            gap: abstand(4),
          }}
        >
          <View style={{ gap: abstand(2), marginBottom: abstand(1) }}>
            <View style={{ width: 30, height: 4, borderRadius: 2, backgroundColor: farben.orange }} />
            <T v="display" style={{ fontSize: 32, lineHeight: 38 }}>
              {titel}
            </T>
            <T v="text">{unter}</T>
          </View>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** Rahmen eines Feldes mit Beschriftung in der Linie (wie ausgestanzt). */
function FeldHuelle({ label, fokus, fehler, children, onPress }: { label: string; fokus: boolean; fehler?: boolean; children: ReactNode; onPress?: () => void }) {
  const rand = fehler ? farben.rot : fokus ? farben.orange : farben.linieStark;
  const inhalt = (
    <View style={{ height: 58, borderRadius: 16, borderWidth: 1.5, borderColor: rand, flexDirection: "row", alignItems: "center", paddingLeft: abstand(4), paddingRight: abstand(2) }}>
      <Text
        style={{
          position: "absolute",
          top: -10,
          left: 12,
          paddingHorizontal: 5,
          backgroundColor: farben.grund,
          ...schrift.textHalb,
          fontSize: 12.5,
          color: fehler ? farben.rot : fokus ? farben.orange : farben.text3,
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
  if (!onPress) return inhalt;
  return (
    <Pressable
      onPress={() => {
        tippen();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      {inhalt}
    </Pressable>
  );
}

/** Eingabefeld mit Beschriftung im Rahmen und optionalem Symbol rechts. */
export function Feld({ label, icon, links, fehler, ...props }: TextInputProps & { label: string; icon?: IconName; links?: ReactNode; fehler?: boolean }) {
  const [fokus, setFokus] = useState(false);
  return (
    <FeldHuelle label={label} fokus={fokus} fehler={fehler}>
      {links}
      <TextInput
        placeholderTextColor={farben.text4}
        selectionColor={farben.orange}
        keyboardAppearance="dark"
        {...props}
        onFocus={(e) => {
          setFokus(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFokus(false);
          props.onBlur?.(e);
        }}
        style={[{ flex: 1, height: "100%", ...schrift.textMittel, fontSize: 16, color: farben.text }, props.style]}
      />
      {icon ? (
        <View style={{ width: 40, alignItems: "center" }}>
          <Icon name={icon} size={20} color={fokus ? farben.orange : farben.text3} />
        </View>
      ) : null}
    </FeldHuelle>
  );
}

/** Passwortfeld mit Auge zum Anzeigen. */
export function PasswortFeld({ label, fehler, ...props }: TextInputProps & { label: string; fehler?: boolean }) {
  const [sichtbar, setSichtbar] = useState(false);
  const [fokus, setFokus] = useState(false);
  return (
    <FeldHuelle label={label} fokus={fokus} fehler={fehler}>
      <TextInput
        placeholderTextColor={farben.text4}
        selectionColor={farben.orange}
        keyboardAppearance="dark"
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        textContentType="password"
        autoComplete="password"
        {...props}
        secureTextEntry={!sichtbar}
        onFocus={(e) => {
          setFokus(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFokus(false);
          props.onBlur?.(e);
        }}
        style={[{ flex: 1, height: "100%", ...schrift.textMittel, fontSize: 16, color: farben.text }, props.style]}
      />
      <Pressable
        onPress={() => setSichtbar((v) => !v)}
        hitSlop={8}
        accessibilityLabel={sichtbar ? "Passwort verbergen" : "Passwort anzeigen"}
        style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
      >
        <Icon name={sichtbar ? "eye-outline" : "eye-off-outline"} size={20} color={fokus ? farben.orange : farben.text3} />
      </Pressable>
    </FeldHuelle>
  );
}

export type Auswahl<W extends string> = { id: W; titel: string; unter?: string; icon?: IconName };

/**
 * Auswahlfeld wie ein Klappmenü: zeigt die Wahl mit Symbol; ein Tipp klappt
 * die Möglichkeiten direkt darunter auf.
 */
export function AuswahlFeld<W extends string>({ label, wert, optionen, onWechsel }: { label: string; wert: W; optionen: Auswahl<W>[]; onWechsel: (w: W) => void }) {
  const [offen, setOffen] = useState(false);
  const aktiv = optionen.find((o) => o.id === wert) ?? optionen[0];
  return (
    <View>
      <FeldHuelle label={label} fokus={offen} onPress={() => setOffen((o) => !o)}>
        {aktiv.icon ? (
          <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: farben.orangeSoft, alignItems: "center", justifyContent: "center", marginRight: abstand(3) }}>
            <Icon name={aktiv.icon} size={18} color={farben.orange} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={{ ...schrift.textHalb, fontSize: 16, color: farben.text }}>{aktiv.titel}</Text>
          {aktiv.unter ? <Text style={{ ...schrift.text, fontSize: 12.5, color: farben.text3 }}>{aktiv.unter}</Text> : null}
        </View>
        <View style={{ width: 40, alignItems: "center" }}>
          <Icon name={offen ? "chevron-up" : "chevron-down"} size={18} color={offen ? farben.orange : farben.text3} />
        </View>
      </FeldHuelle>
      {offen ? (
        <View style={{ marginTop: abstand(2), borderRadius: 16, backgroundColor: farben.flaeche, borderWidth: 1, borderColor: farben.linie, overflow: "hidden" }}>
          {optionen.map((o, i) => {
            const gewaehlt = o.id === wert;
            return (
              <Pressable
                key={o.id}
                onPress={() => {
                  tippen();
                  onWechsel(o.id);
                  setOffen(false);
                }}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: abstand(3),
                  paddingVertical: abstand(3),
                  paddingHorizontal: abstand(4),
                  backgroundColor: pressed ? farben.flaeche2 : gewaehlt ? farben.orangeSoft : "transparent",
                  borderTopWidth: i > 0 ? 1 : 0,
                  borderColor: farben.linie,
                })}
              >
                {o.icon ? <Icon name={o.icon} size={19} color={gewaehlt ? farben.orange : farben.text2} /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={{ ...schrift.textHalb, fontSize: 15.5, color: farben.text }}>{o.titel}</Text>
                  {o.unter ? <Text style={{ ...schrift.text, fontSize: 12.5, color: farben.text3 }}>{o.unter}</Text> : null}
                </View>
                {gewaehlt ? <Icon name="checkmark-circle" size={20} color={farben.orange} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/** Kleiner Hinweis unter einem Feld. */
export function FeldHinweis({ text, farbe }: { text: string; farbe?: string }) {
  return (
    <T v="klein" farbe={farbe ?? farben.text3} style={{ marginTop: -abstand(2), marginLeft: abstand(2) }}>
      {text}
    </T>
  );
}

/** „Kein Konto? Registrieren“ – Frage und orangener Link. */
export function Wechsel({ frage, aktion, onPress }: { frage: string; aktion: string; onPress: () => void }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingVertical: abstand(1) }}>
      <T v="text" farbe={farben.text3} style={{ fontSize: 14.5 }}>
        {frage}
      </T>
      <Pressable
        onPress={() => {
          tippen();
          onPress();
        }}
        hitSlop={8}
      >
        <T v="textStark" farbe={farben.orange} style={{ fontSize: 14.5 }}>
          {aktion}
        </T>
      </Pressable>
    </View>
  );
}
