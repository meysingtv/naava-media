// KI-Kugel: Glaskugel mit fließender Energie und Tacho-Kranz (unten offen wie
// das Lenkrad im Logo). Ein Shader für alle: auf dem Handy über Skia (SkSL),
// im Web über WebGL (GLSL) – der Körper ist derselbe, nur Rahmen und
// Koordinaten unterscheiden sich.

export type KugelPalette = {
  pTief: number[];
  pMitte: number[];
  pHell: number[];
  pSpitze: number[];
  pAkzent: number[];
  pBand: number[];
  pFres1: number[];
  pFres2: number[];
  pGlow1: number[];
  pGlow2: number[];
  pTick1: number[];
  pTick2: number[];
  pKern: number[];
  pSchatten: number;
};

/** Dunkler Modus: Türkis. */
export const KUGEL_TUERKIS: KugelPalette = {
  pTief: [0.01, 0.16, 0.19],
  pMitte: [0.03, 0.52, 0.54],
  pHell: [0.22, 0.88, 0.8],
  pSpitze: [0.8, 1.0, 0.96],
  pAkzent: [0.16, 0.5, 1.0],
  pBand: [0.52, 1.0, 0.9],
  pFres1: [0.22, 0.84, 0.84],
  pFres2: [0.55, 1.0, 0.94],
  pGlow1: [0.08, 0.84, 0.76],
  pGlow2: [0.18, 0.54, 1.0],
  pTick1: [0.52, 1.0, 0.9],
  pTick2: [0.14, 0.74, 0.86],
  pKern: [0.58, 1.0, 0.92],
  pSchatten: 1.0,
};

/** Heller Modus: Blau wie im Logo. */
export const KUGEL_BLAU: KugelPalette = {
  pTief: [0.03, 0.09, 0.32],
  pMitte: [0.1, 0.3, 0.8],
  pHell: [0.26, 0.58, 1.0],
  pSpitze: [0.72, 0.9, 1.0],
  pAkzent: [0.42, 0.26, 0.92],
  pBand: [0.55, 0.82, 1.0],
  pFres1: [0.35, 0.62, 1.0],
  pFres2: [0.62, 0.86, 1.0],
  pGlow1: [0.22, 0.48, 1.0],
  pGlow2: [0.45, 0.32, 1.0],
  pTick1: [0.16, 0.36, 0.82],
  pTick2: [0.42, 0.3, 0.88],
  pKern: [0.55, 0.82, 1.0],
  pSchatten: 0.9,
};

/** Akzentfarben der KI-Seite passend zur Kugel (Knopf, Symbole, Leuchten). */
export const KI_AKZENT = {
  dunkel: { knopf: ["#6ff5e4", "#14b8a6", "#0b7c74"] as const, symbol: "#2de0cc", schatten: "#14b8a6", grund: "#061f1f", text: "#7ff3e3" },
  hell: { knopf: ["#6aa6ff", "#2a62e6", "#163fb0"] as const, symbol: "#2a62e6", schatten: "#2a62e6", grund: "#e3ecff", text: "#2a62e6" },
};

const UNIFORMS = `uniform vec2 res; uniform float t; uniform float level;
uniform vec3 pTief; uniform vec3 pMitte; uniform vec3 pHell; uniform vec3 pSpitze; uniform vec3 pAkzent; uniform vec3 pBand;
uniform vec3 pFres1; uniform vec3 pFres2; uniform vec3 pGlow1; uniform vec3 pGlow2; uniform vec3 pTick1; uniform vec3 pTick2; uniform vec3 pKern;
uniform float pSchatten;`;

const KOERPER = `
const float PI = 3.14159265;
float streu(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float rausch(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(streu(i), streu(i + vec3(1.0, 0.0, 0.0)), f.x), mix(streu(i + vec3(0.0, 1.0, 0.0)), streu(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(streu(i + vec3(0.0, 0.0, 1.0)), streu(i + vec3(1.0, 0.0, 1.0)), f.x), mix(streu(i + vec3(0.0, 1.0, 1.0)), streu(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
}
float wolke(vec3 p) { float a = 0.5; float s = 0.0; for (int i = 0; i < 4; i++) { s += a * rausch(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }

vec4 kugel(vec2 p) {
  float r = length(p);
  float lv = clamp(level, 0.0, 1.0);
  float R = 0.5 + 0.012 * sin(t * 1.7) + 0.035 * lv;
  vec3 col = vec3(0.0); float al = 0.0;

  // weiches Leuchten um den Kern
  float ang = atan(p.y, p.x);
  float g = exp(-max(r - R, 0.0) * (7.0 - 2.5 * lv)) * (0.42 + 0.55 * lv) * smoothstep(R * 0.8, R, r);
  vec3 gc = mix(pGlow1, pGlow2, 0.35 + 0.35 * sin(ang * 2.0 + t * 0.6));
  col += gc * g; al += g;

  // Tacho-Kranz: unten offen, die Striche schlagen mit der Stimme aus
  float a01 = (ang + PI) / (2.0 * PI);
  float vonUnten = abs(ang + PI * 0.5);
  vonUnten = min(vonUnten, 2.0 * PI - vonUnten);
  float offen = smoothstep(0.62, 0.78, vonUnten);
  float N = 84.0;
  float idx = floor(a01 * N);
  float seg = fract(a01 * N);
  float strich = smoothstep(0.22, 0.12, abs(seg - 0.5));
  float amp = 0.25 + 0.75 * rausch(vec3(idx * 0.37, t * (2.0 + 5.0 * lv), 0.0));
  float dA = abs(a01 - fract(t * 0.18)); dA = min(dA, 1.0 - dA);
  float lauf = exp(-dA * dA * 260.0);
  float innen = R + 0.075;
  float laenge = 0.028 + 0.15 * lv * amp * amp + 0.025 * lauf;
  float imRing = smoothstep(innen - 0.004, innen + 0.004, r) * smoothstep(innen + laenge + 0.004, innen + laenge - 0.004, r);
  float tick = strich * imRing * offen * (0.22 + 0.6 * lv * amp + 0.75 * lauf);
  col += mix(pTick1, pTick2, smoothstep(0.1, 0.9, a01)) * tick; al += tick;

  // Kern: leuchtende Flüssigkeit in einer Glaskugel
  if (r < R + 0.01) {
    vec2 q = p / R;
    float z = sqrt(max(0.0, 1.0 - dot(q, q)));
    vec3 n = vec3(q, z);
    float a1 = t * 0.2;
    vec3 sp = vec3(cos(a1) * n.x - sin(a1) * n.z, n.y, sin(a1) * n.x + cos(a1) * n.z);
    vec3 w = sp * 1.05;
    float sp2 = 0.22 + 0.7 * lv;
    vec3 warp = vec3(wolke(w + vec3(0.0, 0.0, t * sp2)), wolke(w + vec3(5.2, 1.3, t * sp2)), wolke(w + vec3(2.1, 7.7, -t * sp2)));
    float f = wolke(w * 0.9 + warp * 1.8 + vec3(t * 0.1));
    float basis = smoothstep(0.3, 0.78, f);
    basis = mix(basis, basis * basis, 0.35);
    float band = pow(0.5 + 0.5 * sin(f * 7.0 + t * 0.9 + warp.x * 3.0), 5.0);
    vec3 c = mix(pTief, pMitte, smoothstep(0.0, 0.45, basis));
    c = mix(c, pHell, smoothstep(0.4, 0.8, basis));
    c = mix(c, pSpitze, smoothstep(0.78, 1.0, basis) * 0.8);
    float akzent = smoothstep(0.5, 0.78, wolke(w * 0.7 - warp * 1.2 + vec3(t * 0.07)));
    c = mix(c, pAkzent, akzent * 0.32);
    c += pBand * band * (0.16 + 0.12 * lv) * smoothstep(0.1, 0.9, z);
    // Lenkrad aus Licht, ganz zart: gewölbte Querspeiche und untere Speiche
    float quer = exp(-abs(q.y - 0.1 + 0.22 * q.x * q.x) * 9.0) * smoothstep(0.95, 0.25, abs(q.x));
    float unten = exp(-abs(q.x) * 8.0) * smoothstep(0.05, -0.15, q.y) * smoothstep(1.0, 0.35, -q.y);
    c += pSpitze * (quer + unten) * (0.05 + 0.07 * lv);
    vec2 mitte = q - vec2(0.0, 0.06);
    c += pKern * exp(-dot(mitte, mitte) * 3.2) * (0.14 + 0.42 * lv);
    c = c / max(1.0, max(c.r, max(c.g, c.b)));
    // Glas: weicher Schatten unten, Fresnel-Rand, Glanzpunkt oben links
    float fres = pow(1.0 - z, 2.2);
    c *= mix(1.0, 0.62 + 0.45 * z, pSchatten) * (0.94 + 0.12 * lv);
    c *= 1.0 - 0.28 * pSchatten * smoothstep(-0.2, -1.0, q.y);
    c += mix(pFres1, pFres2, 0.5 + 0.5 * sin(t * 0.5 + ang)) * fres * 0.65;
    vec3 licht = normalize(vec3(-0.55, 0.62, 0.75));
    float glanz = pow(max(dot(reflect(-licht, n), vec3(0.0, 0.0, 1.0)), 0.0), 48.0);
    float glanz2 = pow(max(dot(reflect(-normalize(vec3(0.6, -0.5, 0.6)), n), vec3(0.0, 0.0, 1.0)), 0.0), 12.0);
    c += vec3(1.0) * glanz * 0.7 + pFres2 * glanz2 * 0.12;
    float kante = smoothstep(R, R - 0.007, r);
    col = mix(col, c, kante); al = mix(al, 1.0, kante);
  }
  al = clamp(al, 0.0, 1.0);
  col = min(col, vec3(al));
  return vec4(col, al);
}
`;

/** Für Skia (Handy): Koordinaten von oben links, y nach unten. */
export const KUGEL_SKSL = `${UNIFORMS}
${KOERPER}
half4 main(vec2 fc) {
  vec2 p = vec2(fc.x - 0.5 * res.x, 0.5 * res.y - fc.y) / (0.5 * min(res.x, res.y));
  return half4(kugel(p));
}`;

/** Für WebGL (Web-Vorschau). */
export const KUGEL_GLSL = `precision highp float;
${UNIFORMS}
${KOERPER}
void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * res) / (0.5 * min(res.x, res.y));
  gl_FragColor = kugel(p);
}`;
