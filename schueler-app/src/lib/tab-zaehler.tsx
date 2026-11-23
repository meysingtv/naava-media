import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type TabZaehler = {
  zaehler: Record<string, number>;
  setzen: (tab: string, anzahl: number) => void;
};

const Kontext = createContext<TabZaehler | null>(null);

/** Zähler für die Tab-Leiste (z. B. offene Rechnungen am Tab „Bezahlen“). */
export function TabZaehlerProvider({ children }: { children: ReactNode }) {
  const [zaehler, setZaehler] = useState<Record<string, number>>({});
  const setzen = useCallback((tab: string, anzahl: number) => {
    setZaehler((z) => (z[tab] === anzahl ? z : { ...z, [tab]: anzahl }));
  }, []);
  const wert = useMemo(() => ({ zaehler, setzen }), [zaehler, setzen]);
  return <Kontext.Provider value={wert}>{children}</Kontext.Provider>;
}

export function useTabZaehler(): Record<string, number> {
  return useContext(Kontext)?.zaehler ?? {};
}

/** Meldet einen Zähler an die Tab-Leiste, sobald er bekannt ist. */
export function useTabZaehlerMelden(tab: string, anzahl: number | null) {
  const setzen = useContext(Kontext)?.setzen;
  useEffect(() => {
    if (setzen && anzahl != null) setzen(tab, anzahl);
  }, [setzen, tab, anzahl]);
}
