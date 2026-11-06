import { serverAdresse, serverSchluessel, supabase } from "./supabase";

// Hochladen im Browser (Web-Panel): Die App-Version streamt Dateien über
// expo-file-system, das es im Web nicht gibt. Hier geht eine ausgewählte Datei
// per XMLHttpRequest direkt in den Speicher – mit Fortschritt und Abbruch.

/** Höchstgröße eines Videos (wie die Speicher-Buckets: 50 MB). */
export const MAX_VIDEO_WEB = 50 * 1024 * 1024;

/** Erlaubte Videoformate (wie in den Buckets eingestellt). */
export const VIDEO_TYPEN = ["video/mp4", "video/quicktime"];

/** Endung zur Datei: „mov“ für QuickTime, sonst „mp4“. */
export function videoEndung(datei: File): "mp4" | "mov" {
  return datei.type === "video/quicktime" || /\.mov$/i.test(datei.name) ? "mov" : "mp4";
}

/** Prüft ein Video vor dem Hochladen. null = in Ordnung, sonst ein Hinweis. */
export function videoPruefen(datei: File): string | null {
  const typ = datei.type || (/\.mov$/i.test(datei.name) ? "video/quicktime" : /\.mp4$/i.test(datei.name) ? "video/mp4" : "");
  if (!VIDEO_TYPEN.includes(typ)) return "Bitte ein Video als MP4 oder MOV auswählen.";
  if (datei.size > MAX_VIDEO_WEB) return `Das Video ist zu groß (${Math.round(datei.size / 1024 / 1024)} MB, höchstens 50 MB). Kürze es oder exportiere es kleiner.`;
  return null;
}

/** Länge eines Videos in Sekunden (aus den Metadaten), null wenn unbekannt. */
export function videoDauer(datei: Blob): Promise<number | null> {
  if (typeof document === "undefined") return Promise.resolve(null);
  return new Promise((fertig) => {
    const adresse = URL.createObjectURL(datei);
    const video = document.createElement("video");
    let erledigt = false;
    const ende = (wert: number | null) => {
      if (erledigt) return;
      erledigt = true;
      URL.revokeObjectURL(adresse);
      fertig(wert);
    };
    video.preload = "metadata";
    video.onloadedmetadata = () => ende(Number.isFinite(video.duration) ? video.duration : null);
    video.onerror = () => ende(null);
    setTimeout(() => ende(null), 8000);
    video.src = adresse;
  });
}

function fehlerAus(status: number, body: string): string {
  if (status === 413) return "Das Video ist zu groß (höchstens 50 MB).";
  try {
    const j = JSON.parse(body) as { message?: string; error?: string };
    const t = j.message || j.error || "";
    if (/row-level security|unauthorized|not allowed/i.test(t)) return "Hochladen darf nur der Inhaber.";
    if (/mime|type/i.test(t)) return "Dieses Videoformat geht nicht – bitte MP4 oder MOV.";
    if (t) return t;
  } catch {
    // kein JSON
  }
  return `Hochladen fehlgeschlagen (Fehler ${status}).`;
}

/** Datei in einen Speicher-Bucket laden. `abbruch.aktuell()` bricht ab. */
export async function webHochladen(d: {
  bucket: string;
  pfad: string;
  datei: Blob;
  typ: string;
  onFortschritt?: (anteil: number) => void;
  abbruch?: { aktuell: (() => void) | null };
}): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Bitte melde dich an.");
  await new Promise<void>((fertig, fehler) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${serverAdresse}/storage/v1/object/${d.bucket}/${d.pfad}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", serverSchluessel);
    xhr.setRequestHeader("Content-Type", d.typ);
    xhr.setRequestHeader("cache-control", "max-age=31536000");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) d.onFortschritt?.(e.loaded / e.total);
    };
    xhr.onload = () => (xhr.status < 300 ? fertig() : fehler(new Error(fehlerAus(xhr.status, xhr.responseText))));
    xhr.onerror = () => fehler(new Error("Keine Verbindung zum Server."));
    xhr.onabort = () => fehler(new Error("Hochladen abgebrochen."));
    if (d.abbruch) d.abbruch.aktuell = () => xhr.abort();
    xhr.send(d.datei);
  }).finally(() => {
    if (d.abbruch) d.abbruch.aktuell = null;
  });
}

/** Zufälliger Dateiname wie in der App. */
export function dateiName(endung: string): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.${endung}`;
}
