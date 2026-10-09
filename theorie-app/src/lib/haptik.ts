import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

// Auf Android die feinen System-Haptiken statt des Vibrationsmotors – die
// fühlen sich wie das Ticken auf dem iPhone an.
const android = Platform.OS === "android";

/** Leichtes Tippen bei Bedienelementen. */
export function tippen() {
  (android ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Clock_Tick) : Haptics.selectionAsync()).catch(() => {});
}

export function erfolg() {
  (android ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm) : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)).catch(() => {});
}

export function fehler() {
  (android ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject) : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)).catch(() => {});
}

export function stoss() {
  (android ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Context_Click) : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)).catch(() => {});
}
