import { useEffect, useRef } from "react";

import { useKonto } from "./konto";
import { LEER, serieAktuell, useStand, type Stand } from "./stand";
import { supabase } from "./supabase";

function summen(s: Stand) {
  let gesamt = 0;
  let richtig = 0;
  for (const f of Object.values(s.fragen)) {
    gesamt += f.r + f.f;
    richtig += f.r;
  }
  return { gesamt, richtig };
}

/**
 * Hält den Lernstand mit dem Konto synchron: Beim Anmelden wird ein neuerer
 * Stand vom Server übernommen, danach wird jede Änderung gesichert und die
 * neuen XP für die Rangliste gemeldet.
 */
export function SyncBruecke() {
  const { session } = useKonto();
  const { stand, bereit, ersetzen, gebuchtSetzen } = useStand();
  const nutzer = session?.user.id ?? null;
  const geladenFuer = useRef<string | null>(null);
  const standRef = useRef(stand);
  standRef.current = stand;

  // Beim Anmelden: Server-Stand holen und den weiteren Stand behalten.
  useEffect(() => {
    if (!nutzer || !bereit || geladenFuer.current === nutzer) return;
    geladenFuer.current = nutzer;
    (async () => {
      const { data } = await supabase.from("lern_sync").select("daten").eq("user_id", nutzer).maybeSingle<{ daten: Stand }>();
      const server = data?.daten;
      if (server && (server.xp ?? 0) > standRef.current.xp) {
        ersetzen({ ...LEER, ...server });
      }
    })();
  }, [nutzer, bereit, ersetzen]);

  // Änderungen sichern und XP melden (gebündelt).
  useEffect(() => {
    if (!nutzer || !bereit || geladenFuer.current !== nutzer) return;
    const t = setTimeout(async () => {
      const s = standRef.current;
      await supabase.from("lern_sync").upsert({ user_id: nutzer, daten: s, aktualisiert_am: new Date().toISOString() });

      const { gesamt, richtig } = summen(s);
      const xp = s.xp - s.gebucht.xp;
      if (xp <= 0 && gesamt <= s.gebucht.gesamt) return;
      const { error } = await supabase.rpc("lern_xp_buchen", {
        p_xp: Math.max(0, xp),
        p_gesamt: Math.max(0, gesamt - s.gebucht.gesamt),
        p_richtig: Math.max(0, richtig - s.gebucht.richtig),
        p_serie: serieAktuell(s),
      });
      if (!error) gebuchtSetzen({ xp: s.xp, gesamt, richtig });
    }, 3000);
    return () => clearTimeout(t);
  }, [stand, nutzer, bereit, gebuchtSetzen]);

  return null;
}
