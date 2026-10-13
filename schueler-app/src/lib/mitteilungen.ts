import { useEffect } from "react";
import * as Notifications from "expo-notifications";

import { supabase } from "./supabase";
import { formatDatumKurz, formatUhrzeit, heuteISO, plusTageISO } from "./format";
import { typLabel } from "./constants";
import { FAHRSTUNDE_SPALTEN, type Fahrstunde } from "./types";

// Mitteilungen auch im Vordergrund zeigen.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const VORLAUF_MINUTEN = 60;

export async function mitteilungenErlaubt(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

export async function mitteilungenAnfordern(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

/** Erinnert eine Stunde vor jeder geplanten Fahrstunde der nächsten zwei Wochen. */
export async function planeErinnerungen(): Promise<void> {
  if (!(await mitteilungenErlaubt())) return;
  const von = heuteISO();
  const { data, error } = await supabase
    .from("fahrstunde")
    .select(FAHRSTUNDE_SPALTEN)
    .gte("datum", von)
    .lte("datum", plusTageISO(von, 14))
    .eq("status", "geplant")
    .returns<Fahrstunde[]>();
  if (error || !data) return;

  await Notifications.cancelAllScheduledNotificationsAsync();
  const jetzt = Date.now();
  for (const s of data.slice(0, 60)) {
    const start = new Date(`${s.datum}T${s.uhrzeit}`);
    const wann = new Date(start.getTime() - VORLAUF_MINUTEN * 60_000);
    if (wann.getTime() <= jetzt) continue;
    await Notifications.scheduleNotificationAsync({
      content: { title: "Gleich Fahrstunde", body: `${typLabel(s.typ)} um ${formatUhrzeit(s.uhrzeit)} Uhr · ${s.dauer_minuten} Min.` },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: wann },
    });
  }
}

/** Meldet, sobald die Fahrschule eine Anfrage beantwortet (solange die App läuft). */
export function useAnfrageAntwortenMelden(aktiv: boolean, beiAenderung?: () => void) {
  useEffect(() => {
    if (!aktiv) return;
    const gemeldet = new Set<string>();
    const kanal = supabase
      .channel("eigene-anfragen")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "fahrstunde_anfrage" }, async (payload) => {
        beiAenderung?.();
        const neu = payload.new as { id?: string; status?: string; datum?: string; uhrzeit?: string; antwort?: string | null };
        if (!neu.id || gemeldet.has(neu.id) || (neu.status !== "angenommen" && neu.status !== "abgelehnt")) return;
        gemeldet.add(neu.id);
        if (neu.status === "angenommen") planeErinnerungen();
        if (!(await mitteilungenErlaubt())) return;
        const wann = neu.datum && neu.uhrzeit ? `${formatDatumKurz(neu.datum)}, ${formatUhrzeit(neu.uhrzeit)} Uhr` : "deine Anfrage";
        await Notifications.scheduleNotificationAsync({
          content:
            neu.status === "angenommen"
              ? { title: "Fahrstunde bestätigt", body: `${wann} – steht jetzt in deinen Terminen.` }
              : { title: "Anfrage abgelehnt", body: neu.antwort ? `${wann}: ${neu.antwort}` : `${wann} klappt leider nicht.` },
          trigger: null,
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(kanal);
    };
    // beiAenderung absichtlich nicht in den Abhängigkeiten – sonst Neuanmeldung je Render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktiv]);
}
