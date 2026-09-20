import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Marke
        mint: {
          DEFAULT: "#1A7F4E",
          dark: "#12643C",
          deep: "#0C3D27",
          accent: "#2CBA75",
          hi: "#9DF1C8",
          soft: "#E7FAF0",
        },
        // Signalakzent – wie die Pylonen auf dem Übungsplatz
        pylon: {
          DEFAULT: "#E4602B",
          soft: "#FBE9DF",
        },
        // Warme Papier-Neutraltöne
        ink: "#171A19",
        cream: "#F5F1E9",
        sand: "#EAE3D5",
        paper: "#F7F4EE",
        muted: "#6E6A61",
        line: "#E1DACD",
        line2: "#C9C0B0",
      },
      fontFamily: {
        display: ["var(--font-display)", "Fraunces", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Hanken Grotesk", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "IBM Plex Mono", "ui-monospace", "monospace"],
      },
      maxWidth: {
        wrap: "1280px",
      },
      keyframes: {
        "reveal-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulse2: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".55" } },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "reveal-up": "reveal-up .6s cubic-bezier(.2,.7,.2,1) both",
        pulse2: "pulse2 1.8s ease-in-out infinite",
        marquee: "marquee 42s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
