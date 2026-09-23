import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

type LoaderResult<T> = { data: T | null; error: { message: string } | null };

type State<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  offline: boolean;
};

/**
 * Lädt Daten von Supabase mit Lade- und Fehlerzustand.
 * - `cacheKey`: legt das letzte Ergebnis lokal ab und zeigt es bei
 *   Verbindungsfehlern wieder an (Offline-Betrieb).
 * - Aktualisiert sich beim erneuten Fokussieren des Screens still im Hintergrund.
 * - `refresh()` lädt immer still nach. Den Kreisel beim Herunterziehen steuert
 *   `useZiehen` – ein per Code gesetztes `refreshing` schiebt auf iOS den
 *   Inhalt nach unten und springt nicht zuverlässig zurück.
 */
export function useLoader<T>(
  loader: () => PromiseLike<LoaderResult<T>>,
  options?: { cacheKey?: string },
) {
  const cacheKey = options?.cacheKey;
  const [state, setState] = useState<State<T>>({
    data: null,
    loading: true,
    error: null,
    offline: false,
  });

  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async () => {
    const { data, error } = await loaderRef.current();

    if (error) {
      if (cacheKey) {
        try {
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached) {
            setState({ data: JSON.parse(cached) as T, loading: false, error: null, offline: true });
            return;
          }
        } catch {
          // Cache nicht lesbar – Fehler unten anzeigen.
        }
      }
      setState((s) => ({ ...s, loading: false, error: error.message }));
      return;
    }

    setState({ data, loading: false, error: null, offline: false });
    if (cacheKey && data != null) {
      AsyncStorage.setItem(cacheKey, JSON.stringify(data)).catch(() => {});
    }
  }, [cacheKey]);

  useEffect(() => {
    run();
  }, [run]);

  // Beim Zurückkehren auf den Screen still neu laden (nicht beim ersten Fokus).
  const erstesFokus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (erstesFokus.current) {
        erstesFokus.current = false;
        return;
      }
      run();
    }, [run]),
  );

  return { ...state, refresh: run };
}

/**
 * Herunterziehen zum Aktualisieren: Der Kreisel läuft nur, solange der Nutzer
 * selbst nachlädt – nie bei stillen Aktualisierungen (Fokus, Realtime).
 */
export function useZiehen(neu: () => Promise<unknown>) {
  const [aktiv, setAktiv] = useState(false);
  const neuRef = useRef(neu);
  neuRef.current = neu;

  const onRefresh = useCallback(async () => {
    setAktiv(true);
    try {
      await neuRef.current();
    } finally {
      setAktiv(false);
    }
  }, []);

  return { refreshing: aktiv, onRefresh };
}
