import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { farben, schrift } from "@/lib/theme";

type Option = { text: string; gefahr?: boolean };
type Anfrage = { titel: string; optionen: Option[]; fertig: (i: number | null) => void };

let zeigen: ((a: Anfrage) => void) | null = null;

/**
 * Auswahlmenü von unten wie das iPhone-Menü – für Android, wo ein Dialog
 * höchstens drei Knöpfe zeigt. Liefert den gewählten Eintrag oder null.
 */
export function auswahlBlatt(titel: string, optionen: Option[]): Promise<number | null> {
  return new Promise((fertig) => {
    if (zeigen) {
      zeigen({ titel, optionen, fertig });
      return;
    }
    // Ohne Blatt (sollte nicht vorkommen): einfacher Dialog.
    Alert.alert(titel, undefined, [
      ...optionen.map((o, i) => ({ text: o.text, style: o.gefahr ? ("destructive" as const) : ("default" as const), onPress: () => fertig(i) })),
      { text: "Abbrechen", style: "cancel" as const, onPress: () => fertig(null) },
    ]);
  });
}

/** Einmal in der App eingebunden; zeigt die Menüs aus auswahlBlatt(). */
export function AuswahlBlattHost() {
  const insets = useSafeAreaInsets();
  const [anfrage, setAnfrage] = useState<Anfrage | null>(null);

  useEffect(() => {
    zeigen = setAnfrage;
    return () => {
      zeigen = null;
    };
  }, []);

  function fertig(i: number | null) {
    const a = anfrage;
    setAnfrage(null);
    a?.fertig(i);
  }

  return (
    <Modal visible={anfrage != null} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => fertig(null)}>
      <Pressable onPress={() => fertig(null)} style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" }}>
        {anfrage ? (
          <Pressable style={{ paddingHorizontal: 10, paddingBottom: insets.bottom + 10, gap: 8 }}>
            <View style={{ borderRadius: 14, backgroundColor: farben.flaeche2, overflow: "hidden" }}>
              {anfrage.titel ? (
                <Text numberOfLines={2} style={{ ...schrift.textHalb, fontSize: 13, lineHeight: 17, color: farben.text3, textAlign: "center", paddingVertical: 14, paddingHorizontal: 18 }}>
                  {anfrage.titel}
                </Text>
              ) : null}
              {anfrage.optionen.map((o, i) => (
                <Pressable
                  key={`${i}-${o.text}`}
                  onPress={() => fertig(i)}
                  accessibilityRole="button"
                  android_ripple={{ color: "rgba(255,255,255,0.08)" }}
                  style={({ pressed }) => ({
                    paddingVertical: 16,
                    alignItems: "center",
                    borderTopWidth: i > 0 || anfrage.titel ? 1 : 0,
                    borderColor: farben.linie,
                    backgroundColor: pressed ? farben.flaeche3 : "transparent",
                  })}
                >
                  <Text style={{ ...schrift.textMittel, fontSize: 17, color: o.gefahr ? farben.rot : farben.text }}>{o.text}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={() => fertig(null)}
              accessibilityRole="button"
              android_ripple={{ color: "rgba(255,255,255,0.08)" }}
              style={({ pressed }) => ({ borderRadius: 14, paddingVertical: 16, alignItems: "center", backgroundColor: pressed ? farben.flaeche3 : farben.flaeche2 })}
            >
              <Text style={{ ...schrift.textHalb, fontSize: 17, color: farben.text }}>Abbrechen</Text>
            </Pressable>
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}
