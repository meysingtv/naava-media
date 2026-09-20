import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // --- Marketing-Website (app/(marketing), components/marketing) ---
        brand: { DEFAULT: "#14A15A", dark: "#0B6B3A", deep: "#073D22", light: "#E7F8EE", accent: "#2ED47A" },
        mint: { DEFAULT: "#14A15A", dark: "#0B6B3A", deep: "#073D22", accent: "#2ED47A", hi: "#9DF1C8", soft: "#E7F8EE" },
        orange: { DEFAULT: "#FF6A2B", dark: "#E9561A", light: "#FFF0E8" },
        yellow: { DEFAULT: "#FFC532" },
        purple: { DEFAULT: "#6D3BE0" },
        sky: { DEFAULT: "#2F80ED" },
        ink: { DEFAULT: "#0F1A15", muted: "#5B6B63" },
        dark: "#0B1F16",
        paper: "#F4F6F5",
        line: "#E3E8E5",
        line2: "#CBD3CF",
        // --- App ---
        border: {
          DEFAULT: "hsl(var(--border))",
          strong: "hsl(var(--border-strong))",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        canvas: "hsl(var(--canvas))",
        foreground: {
          DEFAULT: "hsl(var(--foreground))",
          secondary: "hsl(var(--text-secondary))",
          disabled: "hsl(var(--text-disabled))",
        },
        surface: {
          DEFAULT: "hsl(var(--surface))",
          muted: "hsl(var(--surface-muted))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
          pressed: "hsl(var(--primary-pressed))",
          soft: "hsl(var(--primary-soft))",
          "soft-strong": "hsl(var(--primary-soft-strong))",
          "soft-border": "hsl(var(--primary-soft-border))",
        },
        "accent-bright": "hsl(var(--accent-bright))",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          soft: "hsl(var(--success-soft))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          soft: "hsl(var(--warning-soft))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          soft: "hsl(var(--destructive-soft))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        sm: "0.25rem", // 4px – Chips
        md: "0.375rem", // 6px – Controls
        lg: "0.5rem", // 8px – kleine Panels
        xl: "0.625rem", // 10px – Panels / Dialoge
        "2xl": "0.75rem",
      },
      boxShadow: {
        // Flächen ohne Schatten; nur schwebende Ebenen (Menüs, Dialoge)
        xs: "none",
        sm: "none",
        md: "0 6px 20px -6px rgba(27, 35, 39, 0.16), 0 1px 2px 0 rgba(27, 35, 39, 0.06)",
        lg: "0 16px 40px -12px rgba(27, 35, 39, 0.22), 0 2px 6px -2px rgba(27, 35, 39, 0.08)",
        // Marketing-Website
        card: "0 12px 40px -18px rgba(15,26,21,.25)",
        lift: "0 24px 60px -24px rgba(15,26,21,.35)",
        cta: "0 12px 28px -10px rgba(255,106,43,.6)",
        DEFAULT: "none",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        // Marketing-Website
        mk: ["var(--font-mk-sans)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Barlow Condensed", "Impact", "sans-serif"],
      },
      fontSize: {
        // Zusatzgröße für Labels/Tabellen-Header (13 px); Standard-Skala bleibt.
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
        "13": ["0.8125rem", { lineHeight: "1.25rem" }],
      },
      maxWidth: {
        wrap: "1240px",
      },
      transitionTimingFunction: {
        soft: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
      transitionDuration: {
        DEFAULT: "150ms",
        fast: "120ms",
        overlay: "180ms",
      },
      keyframes: {
        // Marketing-Website
        "reveal-up": { from: { opacity: "0", transform: "translateY(14px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        pulse2: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".55" } },
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.98)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-up-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        // Marketing-Website
        "reveal-up": "reveal-up .6s cubic-bezier(.2,.7,.2,1) both",
        pulse2: "pulse2 1.8s ease-in-out infinite",
        floaty: "floaty 5s ease-in-out infinite",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 150ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "scale-in": "scale-in 180ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
        "slide-up-in": "slide-up-in 200ms cubic-bezier(0.2, 0.8, 0.2, 1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
