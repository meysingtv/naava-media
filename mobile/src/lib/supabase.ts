import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[Supabase] Umgebungsvariablen fehlen. Lege mobile/.env an (siehe .env.example) " +
      "und starte den Dev-Server neu.",
  );
}

// Beim Web-Server-Rendering (Node) gibt es kein window/AsyncStorage.
const istServer = Platform.OS === "web" && typeof window === "undefined";

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
  auth: {
    storage: istServer ? undefined : AsyncStorage,
    autoRefreshToken: !istServer,
    persistSession: !istServer,
    detectSessionInUrl: false,
  },
});

// Token nur erneuern, solange die App im Vordergrund ist (Supabase-Empfehlung für RN).
if (!istServer) {
  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
