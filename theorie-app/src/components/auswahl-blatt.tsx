import { useEffect, useRef, useState } from "react";
import { Alert, useWindowDimensions, type GestureResponderEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MENUE_BREITE, MENUE_TITEL, MENUE_ZEILE, MenueFenster, type MenueEintrag } from "@/components/aufklapp-menue";
import { useHelleSeite } from "@/lib/darstellung";

type Anfrage = { titel: string; optionen: MenueEintrag[]; ort: { x: number; y: number } | null; fertig: (i: number | null) => void };

let zeigen: ((a: Anfrage) => void) | null = null;

// Wo der Finger zuletzt aufgesetzt hat – dort klappt das Menü auf (wie das
// iPhone-Kontextmenü beim langen Drücken auf eine Nachricht).
let letzteBeruehrung: { x: number; y: number; zeit: number } | null = null;

/** In der Wurzel der App eingehängt (onTouchStart/onPointerDown): merkt sich die Stelle. */
export function beruehrungMerken(e: GestureResponderEvent | { nativeEvent: { pageX: number; pageY: number } }) {
  letzteBeruehrung = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY, zeit: Date.now() };
}

/**
 * Auswahlmenü als kleines Glas-Menü an der Stelle, an der man getippt oder
 * lange gedrückt hat. Liefert den gewählten Eintrag oder null (daneben getippt).
 */
export function auswahlBlatt(titel: string, optionen: MenueEintrag[]): Promise<number | null> {
  const b = letzteBeruehrung && Date.now() - letzteBeruehrung.zeit < 3000 ? letzteBeruehrung : null;
  return new Promise((fertig) => {
    if (zeigen) {
      zeigen({ titel, optionen, ort: b ? { x: b.x, y: b.y } : null, fertig });
      return;
    }
    // Ohne Menü (sollte nicht vorkommen): einfacher Dialog.
    Alert.alert(titel, undefined, [
      ...optionen.map((o, i) => ({ text: o.text, style: o.gefahr ? ("destructive" as const) : ("default" as const), onPress: () => fertig(i) })),
      { text: "Abbrechen", style: "cancel" as const, onPress: () => fertig(null) },
    ]);
  });
}

/** Einmal in der App eingebunden; zeigt die Menüs aus auswahlBlatt(). */
export function AuswahlBlattHost() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const hell = useHelleSeite();
  const [anfrage, setAnfrage] = useState<Anfrage | null>(null);
  const [offen, setOffen] = useState(false);
  const ergebnis = useRef<number | null>(null);

  useEffect(() => {
    zeigen = (a) => {
      ergebnis.current = null;
      setAnfrage(a);
      setOffen(true);
    };
    return () => {
      zeigen = null;
    };
  }, []);

  if (!anfrage) return null;

  // Lage: neben dem Finger, nie über den Rand; unten wenig Platz → darüber.
  const hoehe = (anfrage.titel ? MENUE_TITEL : 0) + anfrage.optionen.length * MENUE_ZEILE;
  const rand = 14;
  const oben = insets.top + rand;
  const unten = height - insets.bottom - rand;
  let lage: { top: number; left: number };
  let ursprung: "top left" | "bottom left" = "top left";
  if (anfrage.ort) {
    const left = Math.min(Math.max(anfrage.ort.x - 40, rand), width - MENUE_BREITE - rand);
    if (anfrage.ort.y + 16 + hoehe <= unten) lage = { top: anfrage.ort.y + 16, left };
    else {
      lage = { top: Math.max(oben, anfrage.ort.y - 16 - hoehe), left };
      ursprung = "bottom left";
    }
  } else {
    lage = { top: Math.max(oben, (height - hoehe) / 2), left: (width - MENUE_BREITE) / 2 };
  }

  return (
    <MenueFenster
      offen={offen}
      lage={lage}
      ursprung={ursprung}
      hell={hell}
      titel={anfrage.titel}
      eintraege={anfrage.optionen}
      onWahl={(i) => {
        ergebnis.current = i;
        setOffen(false);
      }}
      onSchliessen={() => setOffen(false)}
      onZu={() => {
        const a = anfrage;
        setAnfrage(null);
        a.fertig(ergebnis.current);
      }}
    />
  );
}
