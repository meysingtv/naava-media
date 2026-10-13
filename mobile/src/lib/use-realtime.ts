import { useEffect } from "react";

import { supabase } from "./supabase";

/**
 * Lauscht auf Änderungen in einer Supabase-Tabelle und ruft `onChange` auf,
 * sobald irgendwo (Web, andere App, Datenbank) ein INSERT/UPDATE/DELETE passiert.
 * Damit synchronisieren sich Listen automatisch.
 */
export function useRealtime(channelName: string, table: string, onChange: () => void) {
  useEffect(() => {
    const kanal = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => onChange())
      .subscribe();

    return () => {
      supabase.removeChannel(kanal);
    };
    // onChange wird absichtlich nicht in deps gesetzt -> kein Re-Subscribe pro Render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, table]);
}
