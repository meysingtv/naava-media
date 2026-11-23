import { Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { CenterInfo } from "@/components/ui";
import { TeamForm } from "@/components/team-form";
import { useLoader } from "@/lib/use-loader";
import { supabase } from "@/lib/supabase";
import type { Fahrlehrer } from "@/lib/types";

export default function MitarbeiterBearbeiten() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const q = useLoader<Fahrlehrer[]>(
    () => supabase.from("fahrlehrer").select("*").eq("id", id).limit(1).returns<Fahrlehrer[]>(),
    { cacheKey: `team-${id}` },
  );
  const f = q.data?.[0];

  if (q.loading) return <CenterInfo loading />;
  if (q.error || !f) return <CenterInfo text={q.error ?? "Mitarbeiter nicht gefunden."} error />;

  return (
    <TeamForm
      initial={{
        vorname: f.vorname,
        nachname: f.nachname,
        email: f.email ?? "",
        telefon: f.telefon ?? "",
        rolle: f.rolle,
        fuehrerscheinklassen: f.fuehrerscheinklassen ?? [],
        aktiv: f.aktiv,
      }}
      speichernText="Speichern"
      onSpeichern={async (w) => {
        const { error } = await supabase
          .from("fahrlehrer")
          .update({
            vorname: w.vorname,
            nachname: w.nachname,
            email: w.email.trim() || null,
            telefon: w.telefon.trim() || null,
            fuehrerscheinklassen: w.fuehrerscheinklassen,
            rolle: w.rolle,
            aktiv: w.aktiv,
          })
          .eq("id", id);
        if (error) return error.message;
        router.back();
        return null;
      }}
      onLoeschen={() =>
        Alert.alert("Löschen", "Diesen Mitarbeiter wirklich löschen?", [
          { text: "Abbrechen", style: "cancel" },
          { text: "Löschen", style: "destructive", onPress: async () => { await supabase.from("fahrlehrer").delete().eq("id", id); router.back(); } },
        ])
      }
    />
  );
}
