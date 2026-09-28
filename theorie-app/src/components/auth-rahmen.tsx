import { useRef, useState, type ReactNode } from "react";
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
  type TextInputProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Logo } from "@/components/grafik";
import { Icon, type IconName } from "@/components/icon";
import { T, zurueck } from "@/components/ui";
import { tippen } from "@/lib/haptik";
import { abstand, farben, RAND, schrift } from "@/lib/theme";

/** Dunkler Grund mit leuchtenden Straßen oben links und unten rechts. */
const HINTERGRUND = require("../../assets/images/auth-hintergrund.jpg");
/** Grundton des Bildes – steht da, bis es geladen ist. */
const BILD_GRUND = "#060709";

/** Felder wie dunkles Glas über dem Bild. */
const GLAS = {
  flaeche: "rgba(13,16,20,0.74)",
  flaecheFokus: "rgba(13,16,20,0.9)",
  rand: "rgba(255,255,255,0.12)",
  liste: "rgba(13,16,20,0.95)",
};

/**
 * Rahmen für Anmelden und Registrieren: das Bild steht fest als ganzer
 * Hintergrund, das Formular läuft darüber. Oben Zurück und Logo, ein kurzer
 * oranger Strich (wie eine Fahrbahnmarkierung) führt zum Titel.
 */
export function AuthRahmen({ titel, unter, onZurueck, children }: { titel: string; unter: string; onZurueck?: () => void; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  // Feste Größe statt „füllen“: So springt das Bild nicht, wenn die Tastatur den Bildschirm verkleinert.
  const { width, height } = useWindowDimensions();

  return (
    <View style={{ flex: 1, backgroundColor: BILD_GRUND }}>
      <Image source={HINTERGRUND} style={{ position: "absolute", top: 0, left: 0, width, height }} resizeMode="cover" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 4, paddingBottom: insets.bottom + abstand(8), paddingHorizontal: RAND + 4 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ height: 44, marginHorizontal: -8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
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
                backgroundColor: GLAS.flaeche,
                borderWidth: 1,
                borderColor: GLAS.rand,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Icon name="arrow-back" size={20} color="#FFFFFF" />
            </Pressable>
            <Logo groesse={24} />
            <View style={{ width: 40 }} />
          </View>

          <View style={{ gap: abstand(4), marginTop: abstand(7) }}>
            <View style={{ gap: abstand(2), marginBottom: abstand(1) }}>
              <View style={{ width: 30, height: 4, borderRadius: 2, backgroundColor: farben.orange }} />
              <T v="display">{titel}</T>
              <T v="text">{unter}</T>
            </View>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

/**
 * Hülle eines Feldes: dunkles Glas, oben klein die Beschriftung, darunter der
 * Inhalt. Ein Tipp irgendwo aufs Feld löst `onPress` aus.
 */
function FeldHuelle({
  label,
  fokus,
  fehler,
  rechts,
  knopf,
  onPress,
  children,
}: {
  label: string;
  fokus: boolean;
  fehler?: boolean;
  rechts?: ReactNode;
  /** Wie ein Knopf (Auswahlfeld) – sonst nur zum Eingabefeld springen. */
  knopf?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  const rand = fehler ? farben.rot : fokus ? farben.orange : GLAS.rand;
  return (
    <Pressable
      onPress={() => {
        if (knopf) tippen();
        onPress();
      }}
      accessible={knopf}
      accessibilityRole={knopf ? "button" : undefined}
      accessibilityLabel={knopf ? label : undefined}
      style={({ pressed }) => ({
        minHeight: 62,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: rand,
        backgroundColor: fokus ? GLAS.flaecheFokus : GLAS.flaeche,
        flexDirection: "row",
        alignItems: "center",
        paddingLeft: abstand(4),
        paddingRight: abstand(2),
        paddingVertical: 9,
        opacity: knopf && pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flex: 1, gap: 3 }}>
        <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 12, lineHeight: 15, color: fehler ? farben.rot : fokus ? farben.orange : farben.text3 }}>
          {label}
        </Text>
        <View style={{ minHeight: 24, flexDirection: "row", alignItems: "center" }}>{children}</View>
      </View>
      {rechts}
    </Pressable>
  );
}

const EINGABE = { flex: 1, height: 24, paddingVertical: 0, paddingHorizontal: 0, ...schrift.textMittel, fontSize: 16, color: farben.text } as const;

/** Eingabefeld mit Beschriftung im Feld und optionalem Symbol rechts. */
export function Feld({ label, icon, links, fehler, ...props }: TextInputProps & { label: string; icon?: IconName; links?: ReactNode; fehler?: boolean }) {
  const [fokus, setFokus] = useState(false);
  const eingabe = useRef<TextInput>(null);
  return (
    <FeldHuelle
      label={label}
      fokus={fokus}
      fehler={fehler}
      onPress={() => eingabe.current?.focus()}
      rechts={
        icon ? (
          <View style={{ width: 40, alignItems: "center" }}>
            <Icon name={icon} size={20} color={fokus ? farben.orange : farben.text3} />
          </View>
        ) : null
      }
    >
      {links}
      <TextInput
        ref={eingabe}
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
        style={[EINGABE, props.style]}
      />
    </FeldHuelle>
  );
}

/** Passwortfeld mit Auge zum Anzeigen. */
export function PasswortFeld({ label, fehler, ...props }: TextInputProps & { label: string; fehler?: boolean }) {
  const [sichtbar, setSichtbar] = useState(false);
  const [fokus, setFokus] = useState(false);
  const eingabe = useRef<TextInput>(null);
  return (
    <FeldHuelle
      label={label}
      fokus={fokus}
      fehler={fehler}
      onPress={() => eingabe.current?.focus()}
      rechts={
        <Pressable
          onPress={() => setSichtbar((v) => !v)}
          hitSlop={8}
          accessibilityLabel={sichtbar ? "Passwort verbergen" : "Passwort anzeigen"}
          style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}
        >
          <Icon name={sichtbar ? "eye-outline" : "eye-off-outline"} size={20} color={fokus ? farben.orange : farben.text3} />
        </Pressable>
      }
    >
      <TextInput
        ref={eingabe}
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
        style={[EINGABE, props.style]}
      />
    </FeldHuelle>
  );
}

export type Auswahl<W extends string> = { id: W; titel: string; unter?: string; icon?: IconName };

/**
 * Auswahlfeld wie ein Klappmenü: zeigt die Wahl; ein Tipp klappt die
 * Möglichkeiten direkt darunter auf.
 */
export function AuswahlFeld<W extends string>({ label, wert, optionen, onWechsel }: { label: string; wert: W; optionen: Auswahl<W>[]; onWechsel: (w: W) => void }) {
  const [offen, setOffen] = useState(false);
  const aktiv = optionen.find((o) => o.id === wert) ?? optionen[0];
  return (
    <View>
      <FeldHuelle
        label={label}
        fokus={offen}
        knopf
        onPress={() => setOffen((o) => !o)}
        rechts={
          <View style={{ width: 40, alignItems: "center" }}>
            <Icon name={offen ? "chevron-up" : "chevron-down"} size={18} color={offen ? farben.orange : farben.text3} />
          </View>
        }
      >
        {aktiv.icon ? <Icon name={aktiv.icon} size={17} color={farben.orange} style={{ marginRight: 8 }} /> : null}
        <Text numberOfLines={1} style={{ ...schrift.textHalb, fontSize: 16, color: farben.text, flexShrink: 1 }}>
          {aktiv.titel}
        </Text>
      </FeldHuelle>
      {offen ? (
        <View style={{ marginTop: abstand(2), borderRadius: 16, backgroundColor: GLAS.liste, borderWidth: 1, borderColor: GLAS.rand, overflow: "hidden" }}>
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
