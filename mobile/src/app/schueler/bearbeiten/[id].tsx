import { Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { CenterInfo } from "@/components/ui";
import { SchuelerForm } from "@/components/schueler-form";
import { useLoader } from "@/lib/use-loader";
import { supabase } from "@/lib/supabase";
import type { Fahrschueler } from "@/lib/types";

export default function SchuelerBearbeiten() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const q = useLoader<Fahrschueler[]>(
    () => supabase.from("fahrschueler").select("*").eq("id", id).limit(1).returns<Fahrschueler[]>(),
    { cacheKey: `schueler-edit-${id}` },
  );
  const s = q.data?.[0];

  if (q.loading) return <CenterInfo loading />;
  if (q.error || !s) return <CenterInfo text={q.error ?? "Schüler nicht gefunden."} error />;

  return (
    <SchuelerForm
      initial={{
        vorname: s.vorname,
        nachname: s.nachname,
        telefon: s.telefon ?? "",
        email: s.email ?? "",
        fuehrerscheinklassen: s.fuehrerscheinklassen ?? [],
        theorie_bestanden: s.theorie_bestanden,
        pruefung_termin: s.pruefung_termin,
      }}
      speichernText="Speichern"
      onSpeichern={async (w) => {
        const { error } = await supabase
          .from("fahrschueler")
          .update({
            vorname: w.vorname,
            nachname: w.nachname,
            telefon: w.telefon.trim() || null,
            email: w.email.trim() || null,
            fuehrerscheinklassen: w.fuehrerscheinklassen,
            theorie_bestanden: w.theorie_bestanden,
            pruefung_termin: w.pruefung_termin,
          })
          .eq("id", id);
        if (error) return error.message;
        router.back();
        return null;
      }}
      onLoeschen={() =>
        Alert.alert("Löschen", "Diesen Schüler wirklich löschen?", [
          { text: "Abbrechen", style: "cancel" },
          {
            text: "Löschen",
            style: "destructive",
            onPress: async () => {
              await supabase.from("fahrschueler").delete().eq("id", id);
              router.back();
            },
          },
        ])
      }
    />
  );
}
