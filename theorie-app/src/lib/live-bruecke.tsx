import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

// Ziele der Live-Mitteilungen: das Live selbst und die Creator-Bewerbung (Entscheidung bzw. neue Bewerbung).
const ZIELE = ["/live", "/creator-bewerbung", "/creator-verwaltung"] as const;
type Ziel = (typeof ZIELE)[number];

/** Tipp auf die Mitteilung „… ist jetzt live“ öffnet direkt das Live, Creator-Mitteilungen die Bewerbung. */
export function LiveBruecke() {
  useEffect(() => {
    if (Platform.OS === "web") return;
    let erledigt: string | null = null;
    const oeffnen = (antwort: Notifications.NotificationResponse | null) => {
      const ziel = antwort?.notification.request.content.data?.url;
      if (!antwort || !ZIELE.includes(ziel as Ziel)) return;
      const id = antwort.notification.request.identifier;
      if (id === erledigt) return;
      erledigt = id;
      Notifications.clearLastNotificationResponseAsync().catch(() => {});
      router.push(ziel as Ziel);
    };
    Notifications.getLastNotificationResponseAsync().then(oeffnen).catch(() => {});
    const abo = Notifications.addNotificationResponseReceivedListener(oeffnen);
    return () => abo.remove();
  }, []);
  return null;
}
