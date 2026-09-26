import * as Haptics from "expo-haptics";

/** Leichtes Tippen bei Bedienelementen. */
export function tippen() {
  Haptics.selectionAsync().catch(() => {});
}

export function erfolg() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function fehler() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}

export function stoss() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}
