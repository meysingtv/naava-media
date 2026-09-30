import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Appearance, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePathname } from "expo-router";

import { farben } from "@/lib/theme";

// Darstellung „Nachtfahrt“ (dunkel) oder „Tagfahrt“ (hell). Die Einstellung
// gilt fürs Gerät und wird nicht mit dem Konto synchronisiert.

export type Darstellung = "dunkel" | "hell";

const SPEICHER = "spur-darstellung";

/** Farben, die zwischen Dunkel und Hell wechseln (Home und seine Bausteine). */
export type Farbwelt = {
  hell: boolean;
  grund: string;
  flaeche: string;
  flaeche2: string;
  flaeche3: string;
  linie: string;
  linieStark: string;
  text: string;
  text2: string;
  text3: string;
  orange: string;
  orangeSoft: string;
  orangeLinie: string;
  gruen: string;
  gruenSoft: string;
  /** Kachel-Verlauf von oben nach unten (Himmel über dem Schild). */
  himmel: [string, string];
  /** Mast der Schilder. */
  mast: [string, string];
  /** Schein hinter einem beleuchteten Schild bzw. Schatten darunter. */
  schein: string;
  schatten: string;
};

export const NACHT: Farbwelt = {
  hell: false,
  grund: farben.grund,
  flaeche: farben.flaeche,
  flaeche2: farben.flaeche2,
  flaeche3: farben.flaeche3,
  linie: farben.linie,
  linieStark: farben.linieStark,
  text: farben.text,
  text2: farben.text2,
  text3: farben.text3,
  orange: farben.orange,
  orangeSoft: farben.orangeSoft,
  orangeLinie: farben.orangeLinie,
  gruen: farben.gruen,
  gruenSoft: farben.gruenSoft,
  himmel: ["#111820", "#080B0F"],
  mast: ["#4A5059", "#2A2F36"],
  schein: "rgba(255,244,214,0.16)",
  schatten: "rgba(0,0,0,0)",
};

export const TAG: Farbwelt = {
  hell: true,
  grund: "#F4F1EC",
  flaeche: "#FFFFFF",
  flaeche2: "#F1EDE6",
  flaeche3: "#E3DED5",
  linie: "rgba(28,22,14,0.08)",
  linieStark: "rgba(28,22,14,0.14)",
  text: "#14171B",
  text2: "#4D535B",
  text3: "#878C94",
  orange: "#F2540A",
  orangeSoft: "rgba(242,84,10,0.11)",
  orangeLinie: "rgba(242,84,10,0.45)",
  gruen: "#23A548",
  gruenSoft: "rgba(35,165,72,0.12)",
  himmel: ["#FFFFFF", "#F3EFE8"],
  mast: ["#C4C9CF", "#9CA3AB"],
  schein: "rgba(255,255,255,0)",
  schatten: "rgba(60,44,24,0.18)",
};

type Kontext = { darstellung: Darstellung; farbwelt: Farbwelt; setzen: (d: Darstellung) => void };

const DarstellungKontext = createContext<Kontext>({ darstellung: "dunkel", farbwelt: NACHT, setzen: () => {} });

export function DarstellungProvider({ children }: { children: ReactNode }) {
  const [darstellung, setDarstellung] = useState<Darstellung>("dunkel");

  useEffect(() => {
    AsyncStorage.getItem(SPEICHER)
      .then((w) => {
        if (w === "hell" || w === "dunkel") setDarstellung(w);
      })
      .catch(() => {});
  }, []);

  const wert = useMemo<Kontext>(
    () => ({
      darstellung,
      farbwelt: darstellung === "hell" ? TAG : NACHT,
      setzen: (d) => {
        setDarstellung(d);
        AsyncStorage.setItem(SPEICHER, d).catch(() => {});
      },
    }),
    [darstellung],
  );

  return <DarstellungKontext.Provider value={wert}>{children}</DarstellungKontext.Provider>;
}

export function useDarstellung(): Kontext {
  return useContext(DarstellungKontext);
}

/**
 * Bausteine wie die Crew-Karten gibt es auf Home (hell oder dunkel) und auf
 * dunklen Seiten. Home legt die Farbwelt für seinen Bereich fest, alle anderen
 * Seiten bleiben dunkel.
 */
const FarbweltKontext = createContext<Farbwelt>(NACHT);

export function FarbweltBereich({ farbwelt, children }: { farbwelt: Farbwelt; children: ReactNode }) {
  return <FarbweltKontext.Provider value={farbwelt}>{children}</FarbweltKontext.Provider>;
}

/** Farben des umgebenden Bereichs – außerhalb von Home immer dunkel. */
export function useFarbwelt(): Farbwelt {
  return useContext(FarbweltKontext);
}

/** Tab-Seiten, die im hellen Modus hell sind – alle anderen bleiben dunkel. */
const HELLE_SEITEN = new Set(["heute", "profil"]);

/** Ist die Seite (Name der Route oder Pfad wie „/heute“) gerade hell? */
export function istHelleSeite(darstellung: Darstellung, seite: string | null | undefined): boolean {
  return darstellung === "hell" && !!seite && HELLE_SEITEN.has(seite.replace(/^\//, ""));
}

/**
 * Fürs System ist die App fest dunkel (app.json). Die native iOS-Tab-Leiste
 * (Liquid Glass) richtet sich nach der Darstellung des Fensters – auf den hellen
 * Seiten schaltet das Fenster deshalb auf hell, dann ist die Leiste helles Glas.
 * Android hat eine eigene Leiste (tab-leiste.tsx), die das selbst regelt.
 */
export function DarstellungBruecke() {
  const { darstellung } = useDarstellung();
  const hell = istHelleSeite(darstellung, usePathname());

  useEffect(() => {
    if (Platform.OS === "ios") Appearance.setColorScheme(hell ? "light" : "dark");
  }, [hell]);

  return null;
}
