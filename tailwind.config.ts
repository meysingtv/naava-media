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
        border: {
          DEFAULT: "hsl(var(--border))",
          strong: "hsl(var(--border-strong))",
        },
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
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
        sm: "0.375rem", // 6px
        md: "0.5rem", // 8px – Buttons, Inputs
        lg: "0.75rem", // 12px – Cards
        xl: "1rem", // 16px – Dialoge
        "2xl": "1.25rem",
      },
      boxShadow: {
        // Neutral und minimal – keine farbigen Schatten
        xs: "0 1px 2px 0 rgba(11, 18, 32, 0.04)",
        sm: "0 1px 3px 0 rgba(11, 18, 32, 0.06), 0 1px 2px -1px rgba(11, 18, 32, 0.04)",
        md: "0 4px 12px -2px rgba(11, 18, 32, 0.08), 0 1px 3px 0 rgba(11, 18, 32, 0.04)",
        lg: "0 12px 32px -8px rgba(11, 18, 32, 0.12), 0 2px 6px -2px rgba(11, 18, 32, 0.06)",
        DEFAULT: "0 1px 3px 0 rgba(11, 18, 32, 0.06), 0 1px 2px -1px rgba(11, 18, 32, 0.04)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Zusatzgröße für Labels/Tabellen-Header (13 px); Standard-Skala bleibt.
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
        "13": ["0.8125rem", { lineHeight: "1.25rem" }],
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
