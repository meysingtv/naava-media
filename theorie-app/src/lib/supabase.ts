import "react-native-url-polyfill/auto";
import "./krypto";
import { AppState, Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";

import { sichererSpeicher } from "./sicherer-speicher";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Ist ein Server eingetragen? Ohne Server läuft die App im Gastmodus. */
export const serverVerbunden = Boolean(url && anonKey);

/** Für direkte Uploads (Videos werden gestreamt statt in den Speicher geladen). */
export const serverAdresse = (url ?? "").replace(/\/+$/, "");
export const serverSchluessel = anonKey ?? "";

const istServer = Platform.OS === "web" && typeof window === "undefined";

export const supabase = createClient(url ?? "https://nicht-eingerichtet.invalid", anonKey ?? "nicht-eingerichtet", {
  auth: {
    // Anmeldung verschlüsselt im Schlüsselbund/Keystore.
    storage: istServer ? undefined : sichererSpeicher,
    autoRefreshToken: !istServer,
    persistSession: !istServer,
    detectSessionInUrl: false,
    // PKCE: Links aus Mails und vom Google-/Apple-Login tragen nur einen
    // Einmal-Code, der nur mit dem Geheimnis auf diesem Gerät einlösbar ist.
    // Abgefangene oder untergeschobene Links melden so niemanden an.
    flowType: "pkce",
  },
});

if (!istServer && serverVerbunden) {
  AppState.addEventListener("change", (zustand) => {
    if (zustand === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
