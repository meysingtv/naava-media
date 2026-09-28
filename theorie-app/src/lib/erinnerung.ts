import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

const KENNUNG = "spur-tageserinnerung";
/** Android braucht einen Kanal – erst danach fragt Android 13+ überhaupt nach der Erlaubnis. */
const KANAL = "erinnerung";

/** Tägliche Lern-Erinnerung einplanen (oder mit `an: false` entfernen). Gibt false zurück, wenn keine Erlaubnis. */
export async function erinnerungPlanen(an: boolean, stunde: number, minute: number): Promise<boolean> {
  await Notifications.cancelScheduledNotificationAsync(KENNUNG).catch(() => {});
  if (!an) return true;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(KANAL, {
      name: "Tägliche Erinnerung",
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: "#FC5B0E",
    });
  }

  const rechte = await Notifications.getPermissionsAsync();
  let erlaubt = rechte.granted;
  if (!erlaubt && rechte.canAskAgain) erlaubt = (await Notifications.requestPermissionsAsync()).granted;
  if (!erlaubt) return false;

  await Notifications.scheduleNotificationAsync({
    identifier: KENNUNG,
    content: {
      title: "Zeit für deine Theorie",
      body: "Zehn Fragen, fünf Minuten – deine Serie wartet.",
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: stunde, minute, channelId: KANAL },
  });
  return true;
}
