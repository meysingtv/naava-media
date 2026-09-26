import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Ist ein Server eingetragen? Ohne Server läuft die App im Gastmodus. */
export const serverVerbunden = Boolean(url && anonKey);

const istServer = Platform.OS === "web" && typeof window === "undefined";

export const supabase = createClient(url ?? "https://nicht-eingerichtet.invalid", anonKey ?? "nicht-eingerichtet", {
  auth: {
    storage: istServer ? undefined : AsyncStorage,
    autoRefreshToken: !istServer,
    persistSession: !istServer,
    detectSessionInUrl: false,
  },
});

if (!istServer && serverVerbunden) {
  AppState.addEventListener("change", (zustand) => {
    if (zustand === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
