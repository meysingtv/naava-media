import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { dialog } from "@/components/dialog";
import { useKonto } from "@/lib/konto";
import { einladungEinloesen, einladungMerken, gemerkteEinladung, hinweisGelesen, meineHinweise, type Hinweis } from "@/lib/verwaltung";

/**
 * Läuft im Hintergrund, sobald jemand angemeldet ist:
 * 1. Eine gemerkte Einladung (QR-Code gescannt, dann registriert) wird
 *    eingelöst – der Fahrschüler ist danach seinem Fahrlehrer zugeordnet.
 * 2. Ungelesene Hinweise (Begründung bei entfernten Inhalten, Rückmeldung zu
 *    Meldungen, Mitteilungen der Fahrschule) erscheinen nacheinander als Dialog.
 * Beim Start und jedes Mal, wenn die App wieder nach vorne kommt.
 */
export function HinweisBruecke() {
  const { session } = useKonto();
  const nutzer = session?.user.id ?? null;
  const laeuft = useRef(false);

  useEffect(() => {
    if (!nutzer) return;
    let aus = false;

    const zeigen = (liste: Hinweis[], i: number) => {
      if (aus || i >= liste.length) {
        laeuft.current = false;
        return;
      }
      const h = liste[i];
      dialog(h.titel, h.text || undefined, [
        {
          text: "OK",
          onPress: () => {
            hinweisGelesen(h.id).catch(() => {});
            // Kurz warten, damit der nächste Dialog nicht im Schließen des alten untergeht.
            setTimeout(() => zeigen(liste, i + 1), 350);
          },
        },
      ]);
    };

    const pruefen = async () => {
      if (laeuft.current) return;
      laeuft.current = true;
      try {
        const code = await gemerkteEinladung();
        if (code) {
          await einladungMerken(null);
          try {
            const lehrer = await einladungEinloesen(code);
            if (aus) return;
            await new Promise<void>((fertig) =>
              dialog("Einladung angenommen", lehrer ? `Du bist jetzt bei ${lehrer} angemeldet. Viel Erfolg beim Lernen!` : "Du bist jetzt bei deiner Fahrschule angemeldet.", [{ text: "Super", onPress: () => setTimeout(fertig, 350) }]),
            );
          } catch (e) {
            if (!aus) dialog("Einladung", e instanceof Error ? e.message : String(e));
          }
        }
        const liste = await meineHinweise();
        if (aus || liste.length === 0) {
          laeuft.current = false;
          return;
        }
        zeigen(liste, 0);
      } catch {
        laeuft.current = false;
      }
    };

    // Etwas nach dem Start, damit Startbild und Einrichtung zuerst fertig sind.
    const t = setTimeout(pruefen, 2500);
    const abo = AppState.addEventListener("change", (s) => {
      if (s === "active") pruefen();
    });
    return () => {
      aus = true;
      laeuft.current = false;
      clearTimeout(t);
      abo.remove();
    };
  }, [nutzer]);

  return null;
}
