import { useCallback, useRef, useState } from "react";
import { Modal, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Button } from "@/components/ui";
import { bezahlen, type BezahlErgebnis } from "@/lib/zahlung";
import { useTheme } from "@/lib/theme-context";
import { karte, space } from "@/lib/theme";

/** Bezahlen starten und das Ergebnis merken; `nachher` lädt danach die Listen neu. */
export function useBezahlen(nachher: () => Promise<unknown>) {
  const [laeuft, setLaeuft] = useState<string | null>(null);
  const [ergebnis, setErgebnis] = useState<BezahlErgebnis | null>(null);
  const nachherRef = useRef(nachher);
  nachherRef.current = nachher;
  const aktiv = useRef(false);

  const bezahle = useCallback(async (rechnungIds: string[], schluessel = rechnungIds.join(",")) => {
    if (aktiv.current) return;
    aktiv.current = true;
    setLaeuft(schluessel);
    try {
      const e = await bezahlen(rechnungIds);
      if (e.art === "bezahlt") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (e.art === "fehler") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      // Abbrechen ist eine bewusste Entscheidung – dafür kein Fenster.
      if (e.art !== "abgebrochen") setErgebnis(e);
      await nachherRef.current();
    } finally {
      aktiv.current = false;
      setLaeuft(null);
    }
  }, []);

  return { bezahle, laeuft, ergebnis, schliessen: () => setErgebnis(null) };
}

type Anzeige = { icon: keyof typeof Ionicons.glyphMap; farbe: string; titel: string; text: string };

/** Ergebnis nach der Stripe-Bezahlseite als ruhiges Fenster in der Mitte. */
export function ZahlungsErgebnis({ ergebnis, onClose }: { ergebnis: BezahlErgebnis | null; onClose: () => void }) {
  const { colors } = useTheme();
  if (!ergebnis || ergebnis.art === "abgebrochen") return null;

  const anzeige: Record<Exclude<BezahlErgebnis["art"], "abgebrochen">, Anzeige> = {
    bezahlt: {
      icon: "checkmark",
      farbe: colors.success,
      titel: "Danke – bezahlt!",
      text: "Deine Zahlung ist eingegangen. Die Rechnung ist jetzt als bezahlt markiert.",
    },
    in_pruefung: {
      icon: "time",
      farbe: colors.warning,
      titel: "Zahlung unterwegs",
      text: "Deine Lastschrift wird geprüft. Sobald das Geld da ist, wird die Rechnung automatisch als bezahlt markiert – meist nach 2 bis 5 Werktagen.",
    },
    wartet: {
      icon: "hourglass",
      farbe: colors.accent,
      titel: "Fast geschafft",
      text: "Deine Zahlung wird gerade bestätigt. Das dauert meist nur einen Moment – die Rechnung aktualisiert sich von selbst.",
    },
    fehler: {
      icon: "alert",
      farbe: colors.danger,
      titel: "Das hat nicht geklappt",
      text: ergebnis.meldung ?? "Bitte versuch es später noch einmal.",
    },
  };
  const a = anzeige[ergebnis.art];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "center", padding: space(6) }}>
        <View style={[karte(colors), { padding: space(6), alignItems: "center", gap: space(3) }]}>
          <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: a.farbe + "22", alignItems: "center", justifyContent: "center" }}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: a.farbe, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name={a.icon} size={30} color="#FFFFFF" />
            </View>
          </View>
          <Text style={{ fontSize: 22, fontWeight: "800", color: colors.text, textAlign: "center", marginTop: space(1) }}>{a.titel}</Text>
          <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: "center", lineHeight: 21 }}>{a.text}</Text>
          <View style={{ alignSelf: "stretch", marginTop: space(2) }}>
            <Button title="Fertig" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
