import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Animated, Appearance, StyleSheet, useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";

import { DUNKEL, farben, farbschemaAnwenden, FarbKontext, type Farbschema } from "./theme";

/**
 * Erscheinungsbild: Dunkel, Hell (Weiß/Orange) oder wie das iPhone.
 * Beim Wechsel wird die Palette getauscht und die Navigation neu aufgebaut;
 * ein Schleier in der alten Grundfarbe verdeckt den Neuaufbau und blendet
 * dann weich aus. Danach geht es zurück dorthin, wo umgeschaltet wurde.
 */

export type Erscheinung = "dunkel" | "hell" | "system";

const SPEICHER = "spur-erscheinung";

type Kontext = {
  wahl: Erscheinung;
  schema: Farbschema;
  waehlen: (w: Erscheinung, rueckweg?: string[]) => void;
  /** Einmalig: Seiten, die nach dem Neuaufbau wieder geöffnet werden sollen. */
  rueckwegHolen: () => string[] | null;
  /** Neuaufbau fertig – Schleier ausblenden. */
  uebergangFertig: () => void;
};

const ErscheinungKontext = createContext<Kontext | null>(null);

function schemaFuer(wahl: Erscheinung, system: string | null | undefined): Farbschema {
  if (wahl === "hell") return "hell";
  if (wahl === "system") return system === "light" ? "hell" : "dunkel";
  return "dunkel";
}

export function ErscheinungProvider({ children }: { children: ReactNode }) {
  const [wahl, setWahl] = useState<Erscheinung | null>(null);
  const system = useColorScheme();
  const [schleier, setSchleier] = useState<string | null>(null);
  const deckkraft = useRef(new Animated.Value(0)).current;
  const rueckweg = useRef<string[] | null>(null);
  const angewandt = useRef<Farbschema | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(SPEICHER)
      .then((w) => setWahl(w === "hell" || w === "system" ? w : "dunkel"))
      .catch(() => setWahl("dunkel"));
  }, []);

  // Native Teile (Tab-Leiste, Tastatur, Hinweisfenster) folgen dem Schema.
  useEffect(() => {
    if (!wahl) return;
    // Im Web gibt es das nicht – dort reicht die eigene Palette.
    const setzen = (Appearance as { setColorScheme?: (s: "light" | "dark" | null) => void }).setColorScheme;
    setzen?.(wahl === "system" ? null : wahl === "hell" ? "light" : "dark");
  }, [wahl]);

  const schema = schemaFuer(wahl ?? "dunkel", system);

  // Palette tauschen, bevor irgendetwas mit dem neuen Schema gezeichnet wird.
  if (wahl && angewandt.current !== schema) {
    farbschemaAnwenden(schema);
    angewandt.current = schema;
  }

  useEffect(() => {
    if (!wahl) return;
    SystemUI.setBackgroundColorAsync(farben.grund).catch(() => {});
  }, [schema, wahl]);

  const ausblenden = useCallback(
    (verzoegerung: number) => {
      Animated.timing(deckkraft, { toValue: 0, duration: 280, delay: verzoegerung, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setSchleier(null);
      });
    },
    [deckkraft],
  );

  const waehlen = useCallback(
    (w: Erscheinung, weg?: string[]) => {
      if (w === wahl) return;
      AsyncStorage.setItem(SPEICHER, w).catch(() => {});
      // Bleibt das Schema gleich (z. B. Dunkel → System bei dunklem iPhone), reicht der neue Wert.
      if (w !== "system" && schemaFuer(w, null) === angewandt.current) {
        setWahl(w);
        return;
      }
      rueckweg.current = weg ?? null;
      deckkraft.stopAnimation();
      deckkraft.setValue(1);
      setSchleier(farben.grund);
      setWahl(w);
    },
    [wahl, deckkraft],
  );

  // Falls kein Neuaufbau nötig war (gleiches Schema), den Schleier trotzdem lösen.
  useEffect(() => {
    if (!schleier) return;
    const t = setTimeout(() => {
      rueckweg.current = null;
      ausblenden(0);
    }, 1400);
    return () => clearTimeout(t);
  }, [schleier, ausblenden]);

  const wert = useMemo<Kontext>(
    () => ({
      wahl: wahl ?? "dunkel",
      schema,
      waehlen,
      rueckwegHolen: () => {
        const w = rueckweg.current;
        rueckweg.current = null;
        return w;
      },
      uebergangFertig: () => ausblenden(380),
    }),
    [wahl, schema, waehlen, ausblenden],
  );

  if (!wahl) return null;

  return (
    <ErscheinungKontext.Provider value={wert}>
      {children}
      {schleier ? <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: schleier, opacity: deckkraft }]} /> : null}
    </ErscheinungKontext.Provider>
  );
}

export function useErscheinung(): Kontext {
  const k = useContext(ErscheinungKontext);
  if (!k) throw new Error("useErscheinung außerhalb von ErscheinungProvider");
  return k;
}

/** Bereiche, die immer dunkel bleiben (Clips): geteilte Bausteine zeichnen hier dunkel. */
export function ImmerDunkel({ children }: { children: ReactNode }) {
  return <FarbKontext.Provider value={DUNKEL}>{children}</FarbKontext.Provider>;
}

/**
 * Für Seiten, die immer dunkel sind (Clips, Kamera): helle Statusleiste,
 * solange die Seite zu sehen ist – danach wieder passend zum Schema.
 */
export function useHelleStatusleiste() {
  const k = useContext(ErscheinungKontext);
  const schema = k?.schema ?? "dunkel";
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("light", true);
      return () => setStatusBarStyle(schema === "hell" ? "dark" : "light", true);
    }, [schema]),
  );
}
