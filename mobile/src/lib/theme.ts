// Design-Tokens mit Hell- und Dunkelmodus.
export type ThemeColors = {
  bg: string;
  card: string;
  cardAlt: string;
  border: string;
  text: string;
  textMuted: string;
  brand: string;
  onBrand: string;
  brandSoft: string;
  success: string;
  danger: string;
  warning: string;
  tabBar: string;
  tabInactive: string;
};

export const lightColors: ThemeColors = {
  bg: "#F4F6FA",
  card: "#FFFFFF",
  cardAlt: "#F1F4F9",
  border: "#E6E9EF",
  text: "#0F172A",
  textMuted: "#64748B",
  brand: "#2563EB",
  onBrand: "#FFFFFF",
  brandSoft: "#EAF1FF",
  success: "#16A34A",
  danger: "#DC2626",
  warning: "#D97706",
  tabBar: "#FFFFFF",
  tabInactive: "#94A3B8",
};

export const darkColors: ThemeColors = {
  bg: "#0B1220",
  card: "#141D2E",
  cardAlt: "#1C2740",
  border: "#27324A",
  text: "#F1F5F9",
  textMuted: "#94A3B8",
  brand: "#5B92F8",
  onBrand: "#FFFFFF",
  brandSoft: "#172741",
  success: "#22C55E",
  danger: "#F87171",
  warning: "#FBBF24",
  tabBar: "#0F1726",
  tabInactive: "#64748B",
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, full: 999 };
export const space = (n: number) => n * 4;

// Feste, themenunabhängige Badge-Farben (eigenständige Pillen, in Hell & Dunkel lesbar).
export type BadgeFarbe = { bg: string; text: string };
