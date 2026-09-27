import { useSafeAreaInsets } from "react-native-safe-area-context";

// Die Tab-Leiste ist die native iOS-Leiste (siehe app/(tabs)/_layout.tsx).
// Sie schwebt über dem Inhalt – diese Werte halten Inhalte frei von ihr.

/** Höhe, die die schwebende Leiste unten belegt (inkl. Home-Indikator). */
export function useLeistenHoehe(): number {
  const insets = useSafeAreaInsets();
  return insets.bottom + 58;
}

/** Platz unter dem Inhalt einer Tab-Seite, damit nichts unter der Leiste endet. */
export function useInhaltUnten(): number {
  return useLeistenHoehe() + 18;
}
