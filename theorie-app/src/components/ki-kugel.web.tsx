import { useEffect, useRef } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import type { SharedValue } from "react-native-reanimated";

import { KUGEL_GLSL, type KugelPalette } from "@/lib/ki-kugel";

// KI-Kugel im Web (Vorschau): derselbe Shader über WebGL.

const VS = "attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }";

export function KiKugel({ groesse, pegel, palette, style }: { groesse: number; pegel: SharedValue<number>; palette: KugelPalette; style?: StyleProp<ViewStyle> }) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: true });
    if (!canvas || !gl) return;
    const shader = (typ: number, src: string) => {
      const s = gl.createShader(typ)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, KUGEL_GLSL));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const puffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, puffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    for (const [name, wert] of Object.entries(palette)) {
      const ort = gl.getUniformLocation(prog, name);
      if (Array.isArray(wert)) gl.uniform3f(ort, wert[0], wert[1], wert[2]);
      else gl.uniform1f(ort, wert);
    }
    const uT = gl.getUniformLocation(prog, "t");
    const uLevel = gl.getUniformLocation(prog, "level");
    gl.uniform2f(gl.getUniformLocation(prog, "res"), canvas.width, canvas.height);
    gl.viewport(0, 0, canvas.width, canvas.height);

    let bild = 0;
    let glatt = 0.12;
    let vorher = performance.now();
    let zeit = 0;
    const schritt = (jetzt: number) => {
      const dt = Math.min(0.05, (jetzt - vorher) / 1000);
      vorher = jetzt;
      zeit += dt;
      glatt += (pegel.value - glatt) * Math.min(1, dt * 9);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uT, zeit);
      gl.uniform1f(uLevel, glatt);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      bild = requestAnimationFrame(schritt);
    };
    bild = requestAnimationFrame(schritt);
    return () => cancelAnimationFrame(bild);
  }, [palette, pegel, groesse]);

  const dpr = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;
  return (
    <View pointerEvents="none" style={[{ width: groesse, height: groesse }, style]}>
      <canvas ref={ref} width={Math.round(groesse * dpr)} height={Math.round(groesse * dpr)} style={{ width: groesse, height: groesse }} />
    </View>
  );
}
