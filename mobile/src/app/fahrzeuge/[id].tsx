import { Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { CenterInfo } from "@/components/ui";
import { FahrzeugForm } from "@/components/fahrzeug-form";
import { useLoader } from "@/lib/use-loader";
import { supabase } from "@/lib/supabase";
import type { Fahrzeug } from "@/lib/types";

export default function FahrzeugBearbeiten() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const q = useLoader<Fahrzeug[]>(
    () => supabase.from("fahrzeug").select("*").eq("id", id).limit(1).returns<Fahrzeug[]>(),
    { cacheKey: `fahrzeug-${id}` },
  );
  const f = q.data?.[0];

  if (q.loading) return <CenterInfo loading />;
  if (q.error || !f) return <CenterInfo text={q.error ?? "Fahrzeug nicht gefunden."} error />;

  return (
    <FahrzeugForm
      initial={{ kennzeichen: f.kennzeichen, marke: f.marke ?? "", modell: f.modell ?? "", klasse: f.klasse ?? "", aktiv: f.aktiv }}
      speichernText="Speichern"
      onSpeichern={async (w) => {
        const { error } = await supabase
          .from("fahrzeug")
          .update({ kennzeichen: w.kennzeichen, marke: w.marke.trim() || null, modell: w.modell.trim() || null, klasse: w.klasse.trim() || null, aktiv: w.aktiv })
          .eq("id", id);
        if (error) return error.message;
        router.back();
        return null;
      }}
      onLoeschen={() =>
        Alert.alert("Löschen", "Dieses Fahrzeug wirklich löschen?", [
          { text: "Abbrechen", style: "cancel" },
          { text: "Löschen", style: "destructive", onPress: async () => { await supabase.from("fahrzeug").delete().eq("id", id); router.back(); } },
        ])
      }
    />
  );
}
