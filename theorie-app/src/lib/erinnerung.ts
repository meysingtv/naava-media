import * as Notifications from "expo-notifications";

const KENNUNG = "spur-tageserinnerung";

/** Tägliche Lern-Erinnerung einplanen (oder mit `an: false` entfernen). Gibt false zurück, wenn keine Erlaubnis. */
export async function erinnerungPlanen(an: boolean, stunde: number, minute: number): Promise<boolean> {
  await Notifications.cancelScheduledNotificationAsync(KENNUNG).catch(() => {});
  if (!an) return true;

  const rechte = await Notifications.getPermissionsAsync();
  let erlaubt = rechte.granted;
  if (!erlaubt && rechte.canAskAgain) erlaubt = (await Notifications.requestPermissionsAsync()).granted;
  if (!erlaubt) return false;

  await Notifications.scheduleNotificationAsync({
    identifier: KENNUNG,
    content: {
      title: "Zeit für deine Spur",
      body: "Zehn Fragen, fünf Minuten – deine Serie wartet.",
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: stunde, minute },
  });
  return true;
}
