import { useEffect, useRef, useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";

import { dateiHochladen } from "./clips-server";
import { useKonto } from "./konto";
import { supabase } from "./supabase";

/**
 * Profilbild – liegt auf dem Gerät (als Daten-URL) und, mit Konto, zusätzlich
 * auf dem Server, damit andere es bei Clips und Kommentaren sehen.
 * Ohne Bild zeigt die App die Initialen.
 */

export const PROFILBILD_BUCKET = "lern-profilbilder";

const SCHLUESSEL = "spur-profilbild";
let bild: string | null = null;
let geladen = false;
const hoerer = new Set<() => void>();

function melden() {
  for (const h of hoerer) h();
}

async function laden() {
  if (geladen) return;
  geladen = true;
  try {
    bild = await AsyncStorage.getItem(SCHLUESSEL);
  } catch {
    bild = null;
  }
  melden();
}

export function useProfilbild(): string | null {
  useEffect(() => {
    laden();
  }, []);
  return useSyncExternalStore(
    (h) => {
      hoerer.add(h);
      return () => {
        hoerer.delete(h);
      };
    },
    () => bild,
    () => bild,
  );
}

/** Öffentliche Adresse eines Profilbilds auf dem Server. */
export function profilbildUrl(pfad: string): string {
  return supabase.storage.from(PROFILBILD_BUCKET).getPublicUrl(pfad).data.publicUrl;
}

/** Bild aus der Mediathek wählen und quadratisch zuschneiden. */
export async function profilbildWaehlen(): Promise<boolean> {
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.45,
    base64: true,
  });
  const datei = r.canceled ? null : r.assets?.[0];
  if (!datei?.base64) return false;
  bild = `data:${datei.mimeType ?? "image/jpeg"};base64,${datei.base64}`;
  melden();
  await AsyncStorage.setItem(SCHLUESSEL, bild).catch(() => {});
  return true;
}

export async function profilbildEntfernen() {
  bild = null;
  melden();
  await AsyncStorage.removeItem(SCHLUESSEL).catch(() => {});
}

/**
 * Das Bild vom Gerät auf den Server laden und im Profil eintragen.
 * `altPfad` wird danach gelöscht. Gibt den neuen Pfad zurück.
 */
export async function profilbildHochladen(altPfad: string | null): Promise<string | null> {
  const lokal = bild;
  if (!lokal) return null;
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return null;

  const mime = lokal.slice(5, lokal.indexOf(";"));
  const typ = mime === "image/png" || mime === "image/webp" ? mime : "image/jpeg";
  const endung = typ === "image/png" ? "png" : typ === "image/webp" ? "webp" : "jpg";
  const datei = `${FileSystem.cacheDirectory}profilbild-${Date.now()}.${endung}`;
  const pfad = `${session.user.id}/${Date.now().toString(36)}.${endung}`;

  await FileSystem.writeAsStringAsync(datei, lokal.slice(lokal.indexOf(",") + 1), { encoding: FileSystem.EncodingType.Base64 });
  try {
    await dateiHochladen(PROFILBILD_BUCKET, datei, pfad, typ, session.access_token);
  } finally {
    FileSystem.deleteAsync(datei, { idempotent: true }).catch(() => {});
  }
  const { error } = await supabase.rpc("lern_profilbild_setzen", { p_pfad: pfad });
  if (error) {
    await supabase.storage.from(PROFILBILD_BUCKET).remove([pfad]);
    throw new Error(error.message);
  }
  if (altPfad) await supabase.storage.from(PROFILBILD_BUCKET).remove([altPfad]);
  return pfad;
}

/** Profilbild auf dem Server entfernen. */
export async function profilbildServerEntfernen(altPfad: string | null): Promise<void> {
  const { error } = await supabase.rpc("lern_profilbild_setzen", { p_pfad: null });
  if (!error && altPfad) await supabase.storage.from(PROFILBILD_BUCKET).remove([altPfad]);
}

/**
 * Einmal je Anmeldung: Liegt ein Bild nur auf dem Gerät, aber noch nicht im
 * Konto (z. B. aus der Zeit vor Clips), wird es automatisch hochgeladen.
 */
export function ProfilbildAbgleich() {
  const { session, profil, profilNeuLaden } = useKonto();
  const lokal = useProfilbild();
  const versucht = useRef<string | null>(null);
  const nutzer = session?.user.id ?? null;

  useEffect(() => {
    if (!nutzer || !profil || profil.bild_pfad || !lokal || versucht.current === nutzer) return;
    versucht.current = nutzer;
    profilbildHochladen(null)
      .then((p) => (p ? profilNeuLaden() : undefined))
      .catch(() => {});
  }, [nutzer, profil, lokal, profilNeuLaden]);

  return null;
}
