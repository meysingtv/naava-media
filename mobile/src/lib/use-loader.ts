import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

type LoaderResult<T> = { data: T | null; error: { message: string } | null };

type State<T> = {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  offline: boolean;
};

/**
 * Lädt Daten von Supabase mit Lade-/Refresh-/Fehlerzustand.
 * - `cacheKey`: legt das letzte Ergebnis lokal ab und zeigt es bei
 *   Verbindungsfehlern wieder an (Offline-Betrieb).
 * - Aktualisiert sich beim erneuten Fokussieren des Screens leise im Hintergrund.
 */
export function useLoader<T>(
  loader: () => PromiseLike<LoaderResult<T>>,
  options?: { cacheKey?: string },
) {
  const cacheKey = options?.cacheKey;
  const [state, setState] = useState<State<T>>({
    data: null,
    loading: true,
    refreshing: false,
    error: null,
    offline: false,
  });

  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(
    async (refreshing: boolean) => {
      setState((s) => ({ ...s, loading: !refreshing && s.data === null, refreshing, error: null }));
      const { data, error } = await loaderRef.current();

      if (error) {
        if (cacheKey) {
          try {
            const cached = await AsyncStorage.getItem(cacheKey);
            if (cached) {
              setState({
                data: JSON.parse(cached) as T,
                loading: false,
                refreshing: false,
                error: null,
                offline: true,
              });
              return;
            }
          } catch {
            // Cache nicht lesbar – Fehler unten anzeigen.
          }
        }
        setState((s) => ({ ...s, loading: false, refreshing: false, error: error.message }));
        return;
      }

      setState({ data, loading: false, refreshing: false, error: null, offline: false });
      if (cacheKey && data != null) {
        AsyncStorage.setItem(cacheKey, JSON.stringify(data)).catch(() => {});
      }
    },
    [cacheKey],
  );

  useEffect(() => {
    run(false);
  }, [run]);

  // Beim Zurückkehren auf den Screen leise neu laden (nicht beim ersten Fokus).
  const erstesFokus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (erstesFokus.current) {
        erstesFokus.current = false;
        return;
      }
      run(true);
    }, [run]),
  );

  return { ...state, refresh: () => run(true) };
}
