import { dialog } from "@/components/dialog";

import { blockieren } from "./blockieren";

/** Nachfragen und blockieren. `danach` läuft nur, wenn es geklappt hat. */
export function blockierenFragen(id: string, name: string, danach?: () => void) {
  const wer = name.trim() || "diese Person";
  dialog(
    `${wer} blockieren?`,
    `Du siehst keine Clips, Kommentare und Chat-Nachrichten mehr von ${wer}. Ihr folgt euch nicht mehr. ${wer} erfährt davon nichts. In den Einstellungen kannst du das jederzeit aufheben.`,
    [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Blockieren",
        style: "destructive",
        onPress: async () => {
          const problem = await blockieren(id);
          if (problem) dialog("Nicht blockiert", problem);
          else danach?.();
        },
      },
    ],
  );
}
