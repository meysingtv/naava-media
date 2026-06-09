import { useCallback, useEffect, useRef, useState } from "react";

type LoaderResult<T> = { data: T | null; error: { message: string } | null };

type State<T> = {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

/**
 * Lädt Daten von Supabase, inkl. Lade-/Refresh-/Fehlerzustand.
 * Der Loader wird in einer Ref gehalten, damit keine veralteten Closures
 * entstehen und der Effekt nur einmal beim Mounten läuft.
 */
export function useLoader<T>(loader: () => PromiseLike<LoaderResult<T>>) {
  const [state, setState] = useState<State<T>>({
    data: null,
    loading: true,
    refreshing: false,
    error: null,
  });

  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async (refreshing: boolean) => {
    setState((s) => ({ ...s, loading: !refreshing, refreshing, error: null }));
    const { data, error } = await loaderRef.current();
    setState({ data, loading: false, refreshing: false, error: error?.message ?? null });
  }, []);

  useEffect(() => {
    run(false);
  }, [run]);

  return { ...state, refresh: () => run(true) };
}
