import type { Config } from "tailwindcss";

const brand = {
  DEFAULT: "#14A15A",
  dark: "#0B6B3A",
  deep: "#073D22",
  light: "#E7F8EE",
  accent: "#2ED47A",
};

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand,
        // Alias, damit Mockups/Unterseiten weiter funktionieren
        mint: { DEFAULT: brand.DEFAULT, dark: brand.dark, deep: brand.deep, accent: brand.accent, hi: "#9DF1C8", soft: brand.light },
        orange: { DEFAULT: "#FF6A2B", dark: "#E9561A", light: "#FFF0E8" },
        yellow: "#FFC532",
        purple: "#6D3BE0",
        sky: "#2F80ED",
        ink: "#0F1A15",
        dark: "#0B1F16",
        paper: "#F4F6F5",
        muted: "#5B6B63",
        line: "#E3E8E5",
        line2: "#CBD3CF",
      },
      fontFamily: {
        display: ["var(--font-display)", "Barlow Condensed", "Impact", "sans-serif"],
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      maxWidth: {
        wrap: "1240px",
      },
      boxShadow: {
        card: "0 12px 40px -18px rgba(15,26,21,.25)",
        lift: "0 24px 60px -24px rgba(15,26,21,.35)",
        cta: "0 12px 28px -10px rgba(255,106,43,.6)",
      },
      keyframes: {
        "reveal-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulse2: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".55" } },
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        marquee: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
      },
      animation: {
        "reveal-up": "reveal-up .6s cubic-bezier(.2,.7,.2,1) both",
        pulse2: "pulse2 1.8s ease-in-out infinite",
        floaty: "floaty 5s ease-in-out infinite",
        marquee: "marquee 36s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
