import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

/** Tipp auf die Mitteilung „… ist jetzt live“ öffnet direkt das Live. */
export function LiveBruecke() {
  useEffect(() => {
    if (Platform.OS === "web") return;
    let erledigt: string | null = null;
    const oeffnen = (antwort: Notifications.NotificationResponse | null) => {
      if (!antwort || antwort.notification.request.content.data?.url !== "/live") return;
      const id = antwort.notification.request.identifier;
      if (id === erledigt) return;
      erledigt = id;
      Notifications.clearLastNotificationResponseAsync().catch(() => {});
      router.push("/live");
    };
    Notifications.getLastNotificationResponseAsync().then(oeffnen).catch(() => {});
    const abo = Notifications.addNotificationResponseReceivedListener(oeffnen);
    return () => abo.remove();
  }, []);
  return null;
}
