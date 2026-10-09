import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "./supabase";

type AuthValue = {
  session: Session | null;
  /** Konto ist mit einem Fahrschüler verknüpft (Zugangscode eingelöst). */
  verknuepft: boolean;
  laedt: boolean;
  pruefen: () => Promise<boolean>;
};

const AuthContext = createContext<AuthValue>({ session: null, verknuepft: false, laedt: true, pruefen: async () => false });

export function useAuth() {
  return useContext(AuthContext);
}

/** Prüft, ob das angemeldete Konto zu einem Fahrschüler gehört. */
export async function istSchueler(): Promise<boolean> {
  const { data, error } = await supabase.rpc("current_schueler_id");
  return !error && Boolean(data);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [verknuepft, setVerknuepft] = useState(false);
  const [laedt, setLaedt] = useState(true);

  const pruefen = useCallback(async () => {
    const ok = await istSchueler();
    setVerknuepft(ok);
    return ok;
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await pruefen();
      setLaedt(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, naechste) => {
      setSession(naechste);
      if (!naechste) setVerknuepft(false);
    });
    return () => data.subscription.unsubscribe();
  }, [pruefen]);

  return <AuthContext.Provider value={{ session, verknuepft, laedt, pruefen }}>{children}</AuthContext.Provider>;
}
