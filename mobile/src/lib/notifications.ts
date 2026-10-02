import * as Notifications from "expo-notifications";

import { supabase } from "./supabase";
import { heuteISO, plusTageISO } from "./format";

// Benachrichtigungen auch im Vordergrund anzeigen.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const VORLAUF_MINUTEN = 30;
const MAX_ERINNERUNGEN = 60; // iOS erlaubt max. 64 geplante lokale Notifications.

type StundeFuerErinnerung = {
  id: string;
  datum: string;
  uhrzeit: string;
  fahrschueler: { vorname: string; nachname: string } | null;
};

export async function erinnerungenErlaubt(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

export async function erinnerungenAnfordern(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/**
 * Plant lokale Erinnerungen 30 Minuten vor jeder geplanten Fahrstunde der
 * nächsten zwei Wochen. Bestehende Planungen werden vorher entfernt.
 */
export async function planeErinnerungen(): Promise<void> {
  if (!(await erinnerungenErlaubt())) return;

  const von = heuteISO();
  const bis = plusTageISO(von, 14);
  const { data, error } = await supabase
    .from("fahrstunde")
    .select("id, datum, uhrzeit, fahrschueler(vorname, nachname)")
    .gte("datum", von)
    .lte("datum", bis)
    .eq("status", "geplant")
    .order("datum", { ascending: true })
    .order("uhrzeit", { ascending: true })
    .returns<StundeFuerErinnerung[]>();

  if (error || !data) return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const jetzt = Date.now();
  let geplant = 0;
  for (const stunde of data) {
    if (geplant >= MAX_ERINNERUNGEN) break;
    const start = new Date(`${stunde.datum}T${stunde.uhrzeit}`);
    const ausloesen = new Date(start.getTime() - VORLAUF_MINUTEN * 60_000);
    if (ausloesen.getTime() <= jetzt) continue;

    const name = stunde.fahrschueler
      ? `${stunde.fahrschueler.vorname} ${stunde.fahrschueler.nachname}`
      : "Fahrstunde";

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Nächste Fahrstunde",
        body: `${name} um ${stunde.uhrzeit.slice(0, 5)} Uhr`,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: ausloesen },
    });
    geplant += 1;
  }
}
