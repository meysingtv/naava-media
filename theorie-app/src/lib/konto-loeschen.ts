import { CLIP_BUCKET } from "./clips-server";
import { PROFILBILD_BUCKET, profilbildEntfernen } from "./profilbild";
import { supabase } from "./supabase";

/**
 * Eigenes Konto endgültig löschen (SQL Abschnitt 27): erst das Konto auf dem
 * Server – alles daran Hängende geht per Kaskade mit –, dann die eigenen
 * Dateien im Speicher (Profilbild, Clips) und das Profilbild auf dem Gerät.
 * Gibt `null` bei Erfolg zurück, sonst eine verständliche Meldung.
 */
export async function kontoLoeschen(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) return "Bitte melde dich zuerst an.";

  // Dateien vorher auflisten – danach gibt es das Konto nicht mehr.
  const dateien: { bucket: string; pfade: string[] }[] = [];
  for (const bucket of [PROFILBILD_BUCKET, CLIP_BUCKET]) {
    const { data: liste } = await supabase.storage.from(bucket).list(uid, { limit: 1000 });
    dateien.push({ bucket, pfade: (liste ?? []).filter((d) => d.name && !d.name.startsWith(".")).map((d) => `${uid}/${d.name}`) });
  }

  const { error } = await supabase.rpc("lern_konto_loeschen");
  if (error) {
    const text = error.message ?? "";
    if (/lern_konto_loeschen|schema cache|does not exist/i.test(text)) return "Das SQL-Update fehlt noch (supabase/update-konto.sql).";
    if (/network|fetch/i.test(text)) return "Keine Verbindung. Bitte prüfe dein Internet.";
    return text || "Das Konto ließ sich gerade nicht löschen.";
  }

  // Der Zugangsschlüssel gilt noch kurz – damit die eigenen Dateien wegräumen.
  for (const { bucket, pfade } of dateien) {
    if (pfade.length) await supabase.storage.from(bucket).remove(pfade).catch(() => {});
  }
  await profilbildEntfernen().catch(() => {});
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  return null;
}
