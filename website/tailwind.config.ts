import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        mint: {
          DEFAULT: "#1A7F4E",
          dark: "#12643C",
          accent: "#2CBA75",
          hi: "#9DF1C8",
          soft: "#E7FAF0",
        },
        ink: "#171A19",
        paper: "#F6F7F3",
        muted: "#66706B",
        line: "#DDE3DF",
        line2: "#C7D0CB",
      },
      fontFamily: {
        display: ["var(--font-display)", "Bricolage Grotesque", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
      maxWidth: {
        wrap: "1200px",
      },
      keyframes: {
        "reveal-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulse2: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".55" } },
      },
      animation: {
        "reveal-up": "reveal-up .6s cubic-bezier(.2,.7,.2,1) both",
        pulse2: "pulse2 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
