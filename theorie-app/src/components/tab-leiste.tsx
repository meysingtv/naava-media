import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Luft am Seitenende: Die native iOS-Tab-Leiste liegt über dem Inhalt
 * (durchscheinend bzw. im Glas-Stil), deshalb braucht jede Tab-Seite unten
 * so viel Abstand, dass nichts dahinter verschwindet.
 */
export function useInhaltUnten(): number {
  const insets = useSafeAreaInsets();
  return Platform.OS === "ios" ? insets.bottom + 76 : 24;
}
