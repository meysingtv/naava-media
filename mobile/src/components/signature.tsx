import { useEffect, useRef, useState } from "react";
import { Modal, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import { Button } from "@/components/ui";
import { useTheme } from "@/lib/theme-context";
import { radius, space } from "@/lib/theme";

const r = (n: number) => Math.round(n);

type Daten = { w: number; h: number; paths: string[] };

/** Zeigt eine gespeicherte Unterschrift (SVG-Pfade) skaliert an. */
export function SignatureView({ data, color, height = 110 }: { data: string; color: string; height?: number }) {
  let parsed: Daten | null = null;
  try {
    parsed = JSON.parse(data) as Daten;
  } catch {
    parsed = null;
  }
  if (!parsed || !parsed.paths?.length) return null;
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${parsed.w || 300} ${parsed.h || 150}`} preserveAspectRatio="xMidYMid meet">
      {parsed.paths.map((d, i) => (
        <Path key={i} d={d} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
}

/** Vollbild-Unterschriftenfeld zum Zeichnen mit dem Finger. */
export function SignaturePad({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: string) => void;
}) {
  const { colors } = useTheme();
  const [strokes, setStrokes] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const size = useRef({ w: 300, h: 150 });

  useEffect(() => {
    if (visible) {
      setStrokes([]);
      setCurrent("");
    }
  }, [visible]);

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        setCurrent(`M${r(locationX)} ${r(locationY)}`);
      },
      onPanResponderMove: (e) => {
        const { locationX, locationY } = e.nativeEvent;
        setCurrent((prev) => `${prev} L${r(locationX)} ${r(locationY)}`);
      },
      onPanResponderRelease: () => {
        setCurrent((prev) => {
          if (prev) setStrokes((s) => [...s, prev]);
          return "";
        });
      },
    }),
  ).current;

  const leer = strokes.length === 0 && !current;

  function speichern() {
    const data: Daten = { w: size.current.w, h: size.current.h, paths: strokes };
    onSave(JSON.stringify(data));
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={{ fontSize: 17, color: colors.accent }}>Abbrechen</Text>
          </Pressable>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>Unterschrift</Text>
          <View style={{ width: 70 }} />
        </View>

        <Text style={{ textAlign: "center", color: colors.textMuted, fontSize: 14, paddingVertical: space(3) }}>
          Bitte mit dem Finger unterschreiben.
        </Text>

        <View style={{ flex: 1, padding: space(4) }}>
          <View
            onLayout={(e) => {
              size.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height };
            }}
            {...pan.panHandlers}
            style={styles.pad}
          >
            <Svg width="100%" height="100%">
              {strokes.map((d, i) => (
                <Path key={i} d={d} stroke="#111111" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ))}
              {current ? <Path d={current} stroke="#111111" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
            </Svg>
            <View style={styles.linie} />
          </View>
        </View>

        <View style={{ flexDirection: "row", gap: space(3), padding: space(4) }}>
          <View style={{ flex: 1 }}>
            <Button title="Löschen" variant="tinted" onPress={() => { setStrokes([]); setCurrent(""); }} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Speichern" onPress={speichern} disabled={leer} />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space(4),
    paddingVertical: space(3),
  },
  pad: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  linie: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 48,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#C7C7CC",
  },
});
