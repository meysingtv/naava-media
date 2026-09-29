import { useEffect, useRef } from "react";
import { AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { datumLang, uhrzeit } from "@/lib/format";
import { liveAktivitaetMoeglich, livePruefungstag } from "@/lib/live-aktivitaet";
import { useStand, type Stand } from "@/lib/stand";

const KENNUNG = "spur-pruefungstag";
/** Derselbe Android-Kanal wie die tägliche Erinnerung. */
const KANAL = "erinnerung";
const STUNDE = 60 * 60 * 1000;
/** Live-Aktivitäten laufen höchstens 8 Stunden – früher zu starten bringt nichts. */
const VORLAUF = 8 * STUNDE;
/** So lange nach dem Termin bleibt der „Viel Erfolg“-Hinweis stehen. */
const NACHLAUF = 2 * STUNDE;

export function terminDatum(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Kalendertage bis zum Termin (0 = heute, 1 = morgen, negativ = vorbei). */
export function tageBis(termin: Date, jetzt = new Date()): number {
  const a = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate());
  const b = new Date(termin.getFullYear(), termin.getMonth(), termin.getDate());
  return Math.round((b.getTime() - a.getTime()) / (24 * STUNDE));
}

/** „heute“, „morgen“, „in 12 Tagen“, „vorbei“ */
export function tageText(termin: Date, jetzt = new Date()): string {
  const t = tageBis(termin, jetzt);
  if (t < 0 || (t === 0 && termin.getTime() + NACHLAUF < jetzt.getTime())) return "vorbei";
  if (t === 0) return "heute";
  if (t === 1) return "morgen";
  return `in ${t} Tagen`;
}

/** „Montag, 13. Oktober · 14:30 Uhr“ */
export function terminText(termin: Date): string {
  return `${datumLang(termin)} · ${uhrzeit(termin.getHours(), termin.getMinutes())} Uhr`;
}

/** Kleine Zeile unter dem Countdown: letzte Simulation und das Wichtigste zum Mitnehmen. */
export function pruefungstagHinweis(s: Stand): string {
  const letzte = s.pruefungen[0];
  const teile = [
    letzte ? `Letzte Simulation: ${letzte.bestanden ? "bestanden" : "nicht bestanden"} (${letzte.fehlerpunkte} FP)` : null,
    "Ausweis nicht vergessen",
  ];
  return teile.filter(Boolean).join(" · ");
}

/**
 * Live-Aktivität für den Prüfungstag passend zum Termin halten (iPhone):
 * in den letzten 8 Stunden vor dem Termin starten bzw. auffrischen, danach und bei
 * geändertem Termin wieder entfernen.
 */
export function pruefungstagAbgleichen(s: Stand, jetzt = Date.now()) {
  if (Platform.OS !== "ios") return;
  const termin = terminDatum(s.pruefungstermin);
  if (!termin) {
    livePruefungstag.beenden();
    return;
  }
  const ms = termin.getTime();
  if (jetzt >= ms + NACHLAUF) {
    livePruefungstag.beenden();
    return;
  }
  if (jetzt < ms && ms - jetzt <= VORLAUF) {
    livePruefungstag.starten(ms, pruefungstagHinweis(s));
    return;
  }
  // Countdown für einen älteren Termin wegräumen.
  if (!livePruefungstag.laeuft(ms)) livePruefungstag.beenden();
}

/** Wann am Prüfungstag erinnert wird: morgens (frühestens 7 Uhr), höchstens 7,5 Stunden vorher. */
function erinnerungsZeit(termin: Date): Date {
  const frueh = new Date(termin);
  frueh.setHours(7, 0, 0, 0);
  let wann = new Date(Math.max(termin.getTime() - 7.5 * STUNDE, frueh.getTime()));
  if (wann.getTime() > termin.getTime() - 15 * 60 * 1000) wann = new Date(termin.getTime() - STUNDE);
  return wann;
}

/**
 * Mitteilung am Morgen des Prüfungstags planen (ersetzt eine frühere).
 * `fragen`: fehlende Erlaubnis für Mitteilungen erfragen (nur nach einer Aktion des Nutzers).
 */
export async function pruefungstagErinnerungPlanen(iso: string | null, fragen: boolean): Promise<void> {
  if (Platform.OS === "web") return;
  await Notifications.cancelScheduledNotificationAsync(KENNUNG).catch(() => {});
  const termin = terminDatum(iso);
  if (!termin) return;
  const wann = erinnerungsZeit(termin);
  if (wann.getTime() <= Date.now()) return;

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(KANAL, {
        name: "Tägliche Erinnerung",
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: "#FC5B0E",
      });
    }
    const rechte = await Notifications.getPermissionsAsync();
    let erlaubt = rechte.granted;
    if (!erlaubt && fragen && rechte.canAskAgain) erlaubt = (await Notifications.requestPermissionsAsync()).granted;
    if (!erlaubt) return;

    const zeit = uhrzeit(termin.getHours(), termin.getMinutes());
    await Notifications.scheduleNotificationAsync({
      identifier: KENNUNG,
      content: {
        title: "Heute ist Prüfungstag",
        body:
          Platform.OS === "ios"
            ? `Theorieprüfung um ${zeit} Uhr. Öffne kurz die App – dann läuft der Countdown auf deinem Sperrbildschirm.`
            : `Theorieprüfung um ${zeit} Uhr – viel Erfolg! Noch eine kurze Simulation zum Aufwärmen?`,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: wann, channelId: KANAL },
    });
  } catch {
    // Mitteilungen sind ein Zusatz – ohne sie funktioniert der Termin trotzdem.
  }
}

/** Kann dieses Gerät den Countdown auf dem Sperrbildschirm zeigen? */
export function countdownMoeglich(): boolean {
  return Platform.OS === "ios" && liveAktivitaetMoeglich();
}

/**
 * Hält Live-Aktivität und Erinnerung passend zum Prüfungstermin: beim Start, wenn sich
 * Termin oder letzte Simulation ändern, und jedes Mal, wenn die App wieder nach vorn kommt.
 */
export function PruefungstagBruecke() {
  const { stand, bereit } = useStand();
  const standRef = useRef(stand);
  standRef.current = stand;
  const bereitRef = useRef(bereit);
  bereitRef.current = bereit;
  const letzte = stand.pruefungen[0]?.datum ?? null;

  useEffect(() => {
    if (bereit) pruefungstagAbgleichen(standRef.current);
  }, [bereit, stand.pruefungstermin, letzte]);

  useEffect(() => {
    if (bereit) pruefungstagErinnerungPlanen(stand.pruefungstermin, false);
  }, [bereit, stand.pruefungstermin]);

  useEffect(() => {
    const abo = AppState.addEventListener("change", (zustand) => {
      if (zustand === "active" && bereitRef.current) pruefungstagAbgleichen(standRef.current);
    });
    return () => abo.remove();
  }, []);

  return null;
}
