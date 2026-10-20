import { serverVerbunden, supabase } from "./supabase";

// Manager (Web-Panel /manager): Zugänge anlegen, ändern, pausieren, sperren und
// löschen. Alles läuft über die Edge Function „manager“ – nur sie hat den
// Dienstschlüssel von Supabase und prüft, dass der Inhaber fragt.

export type Rolle = "schueler" | "fahrlehrer";
export type ZugangStatus = "aktiv" | "pausiert" | "gesperrt";

export type ManagerNutzer = {
  id: string;
  email: string;
  name: string;
  benutzername: string;
  klasse: string;
  rolle: Rolle;
  avatar_farbe: string | null;
  bild_pfad: string | null;
  xp: number;
  serie: number;
  fragen_gesamt: number;
  fragen_richtig: number;
  status: ZugangStatus;
  pausiert_bis: string | null;
  fahrlehrer_id: string | null;
  notiz: string;
  darf_clips: boolean;
  /** Inhaber-Konto: lässt sich nicht sperren oder löschen. */
  inhaber: boolean;
  /** Das eigene Konto. */
  ich: boolean;
  /** „email“, „google“ oder „apple“. */
  anbieter: string;
  bestaetigt: boolean;
  erstellt_am: string;
  zuletzt_aktiv: string | null;
};

export type NeuerZugang = {
  email: string;
  passwort: string;
  name: string;
  benutzername?: string;
  rolle: Rolle;
  klasse: string;
  fahrlehrer_id: string | null;
  notiz: string;
  darf_clips: boolean;
};

export type Aenderung = Partial<{
  name: string;
  benutzername: string;
  email: string;
  passwort: string;
  rolle: Rolle;
  klasse: string;
  fahrlehrer_id: string | null;
  notiz: string;
  darf_clips: boolean;
}>;

/** Fehlermeldung aus einer Antwort der Edge Function lesen. */
async function fehlerText(error: { message: string; context?: unknown }): Promise<string> {
  const antwort = error.context as Response | undefined;
  if (antwort && typeof antwort.json === "function") {
    if (antwort.status === 404) return "Die Server-Funktion „manager“ ist noch nicht eingerichtet (README → Web-Panel & Manager).";
    try {
      const j = (await antwort.clone().json()) as { fehler?: string; message?: string };
      if (j.fehler) return j.fehler;
      if (j.message) return j.message;
    } catch {
      // kein JSON
    }
  }
  if (/failed to send|fetch|network/i.test(error.message)) return "Server nicht erreichbar. Ist die Funktion „manager“ eingerichtet und das Internet da?";
  return error.message;
}

async function aufruf<T>(inhalt: Record<string, unknown>): Promise<T> {
  if (!serverVerbunden) throw new Error("Die App ist noch mit keinem Server verbunden (.env fehlt).");
  const { data, error } = await supabase.functions.invoke<T & { fehler?: string }>("manager", { body: inhalt });
  if (error) throw new Error(await fehlerText(error));
  if (data && typeof data === "object" && "fehler" in data && data.fehler) throw new Error(data.fehler);
  return data as T;
}

export async function managerListe(): Promise<ManagerNutzer[]> {
  const d = await aufruf<{ nutzer: ManagerNutzer[] }>({ aktion: "liste" });
  return d.nutzer ?? [];
}

export async function zugangAnlegen(z: NeuerZugang): Promise<string> {
  const d = await aufruf<{ id: string }>({ aktion: "anlegen", ...z });
  return d.id;
}

export async function zugangAendern(id: string, a: Aenderung): Promise<void> {
  await aufruf({ aktion: "aendern", id, ...a });
}

/** Status setzen. Bei „pausiert“ mit `tage` endet die Pause von selbst. */
export async function zugangStatus(id: string, status: ZugangStatus, tage?: number): Promise<void> {
  await aufruf({ aktion: "status", id, status, tage });
}

export async function zugangLoeschen(id: string): Promise<void> {
  await aufruf({ aktion: "loeschen", id });
}

/** Gut lesbares Passwort zum Weitergeben (ohne 0/O, 1/l/I). */
export function passwortVorschlag(): string {
  const buchstaben = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const ziffern = "23456789";
  const zufall = (n: number) => {
    const z = new Uint32Array(1);
    globalThis.crypto.getRandomValues(z);
    return z[0] % n;
  };
  const teil = (len: number) => Array.from({ length: len }, () => buchstaben[zufall(buchstaben.length)]).join("");
  return `${teil(4)}-${teil(4)}-${Array.from({ length: 3 }, () => ziffern[zufall(ziffern.length)]).join("")}`;
}

export const STATUS_TEXT: Record<ZugangStatus, string> = { aktiv: "Aktiv", pausiert: "Pausiert", gesperrt: "Gesperrt" };
export const ROLLE_TEXT: Record<Rolle, string> = { schueler: "Fahrschüler", fahrlehrer: "Fahrlehrer" };
