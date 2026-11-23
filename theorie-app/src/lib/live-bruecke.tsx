import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";

// Ziele der Live-Mitteilungen: ein Live („/live?id=…“) und die Creator-Bewerbung (Entscheidung bzw. neue Bewerbung).
const ZIELE = ["/live", "/creator-bewerbung", "/creator-verwaltung"] as const;
type Ziel = (typeof ZIELE)[number];
const LIVE_MIT_ID = /^\/live\?id=[0-9a-f-]{36}$/;

/** Tipp auf die Mitteilung „… ist jetzt live“ öffnet direkt das Live, Creator-Mitteilungen die Bewerbung. */
export function LiveBruecke() {
  useEffect(() => {
    if (Platform.OS === "web") return;
    let erledigt: string | null = null;
    const oeffnen = (antwort: Notifications.NotificationResponse | null) => {
      const ziel = antwort?.notification.request.content.data?.url;
      if (!antwort || typeof ziel !== "string" || !(ZIELE.includes(ziel as Ziel) || LIVE_MIT_ID.test(ziel))) return;
      const id = antwort.notification.request.identifier;
      if (id === erledigt) return;
      erledigt = id;
      Notifications.clearLastNotificationResponseAsync().catch(() => {});
      if (LIVE_MIT_ID.test(ziel)) router.push({ pathname: "/live", params: { id: ziel.slice("/live?id=".length) } });
      else router.push(ziel as Ziel);
    };
    Notifications.getLastNotificationResponseAsync().then(oeffnen).catch(() => {});
    const abo = Notifications.addNotificationResponseReceivedListener(oeffnen);
    return () => abo.remove();
  }, []);
  return null;
}
