import { type StyleProp, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useDerivedValue, useFrameCallback, useReducedMotion, useSharedValue, type SharedValue } from "react-native-reanimated";

import { KUGEL_SKSL, type KugelPalette } from "@/lib/ki-kugel";

// KI-Kugel auf dem Handy: der Shader aus lib/ki-kugel über Skia, 60 Bilder
// pro Sekunde auf der GPU. `pegel` (0 bis 1) ist die Lautstärke – beim
// Zuhören vom Mikrofon, beim Antworten von der Stimme. Ohne Skia im Build
// (ältere App-Version) zeigt sie eine ruhige Verlaufs-Kugel.

type SkiaModul = typeof import("@shopify/react-native-skia");

function skiaLaden(): { skia: SkiaModul; effekt: NonNullable<ReturnType<SkiaModul["Skia"]["RuntimeEffect"]["Make"]>> } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const skia = require("@shopify/react-native-skia") as SkiaModul;
    const effekt = skia.Skia.RuntimeEffect.Make(KUGEL_SKSL);
    return effekt ? { skia, effekt } : null;
  } catch {
    return null;
  }
}

const SKIA = skiaLaden();

export function KiKugel({ groesse, pegel, palette, style }: { groesse: number; pegel: SharedValue<number>; palette: KugelPalette; style?: StyleProp<ViewStyle> }) {
  const ruhig = useReducedMotion();
  const zeit = useSharedValue(0);
  const glatt = useSharedValue(0.12);
  useFrameCallback((f) => {
    const dt = Math.min(0.05, (f.timeSincePreviousFrame ?? 16) / 1000);
    zeit.value += dt * (ruhig ? 0.25 : 1);
    // Weich nachziehen, damit die Kugel nicht zuckt
    glatt.value += (pegel.value - glatt.value) * Math.min(1, dt * 9);
  });
  const uniforms = useDerivedValue(() => ({ ...palette, res: [groesse, groesse], t: zeit.value, level: glatt.value }));

  if (!SKIA) return <ErsatzKugel groesse={groesse} palette={palette} style={style} />;
  const { Canvas, Fill, Shader } = SKIA.skia;
  return (
    <View pointerEvents="none" style={[{ width: groesse, height: groesse }, style]}>
      <Canvas style={{ width: groesse, height: groesse }}>
        <Fill>
          <Shader source={SKIA.effekt} uniforms={uniforms} />
        </Fill>
      </Canvas>
    </View>
  );
}

const hex = (c: number[]) => `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;

/** Ruhige Kugel ohne Shader – nur wenn Skia im Build fehlt. */
function ErsatzKugel({ groesse, palette, style }: { groesse: number; palette: KugelPalette; style?: StyleProp<ViewStyle> }) {
  const d = groesse * 0.5;
  return (
    <View pointerEvents="none" style={[{ width: groesse, height: groesse, alignItems: "center", justifyContent: "center" }, style]}>
      <LinearGradient
        colors={[hex(palette.pSpitze), hex(palette.pHell), hex(palette.pMitte), hex(palette.pTief)]}
        start={{ x: 0.25, y: 0.1 }}
        end={{ x: 0.8, y: 1 }}
        style={{ width: d, height: d, borderRadius: d / 2, shadowColor: hex(palette.pGlow1), shadowOpacity: 0.6, shadowRadius: d * 0.3, shadowOffset: { width: 0, height: 0 } }}
      />
    </View>
  );
}
