import { Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { CenterInfo } from "@/components/ui";
import { FahrstundeForm } from "@/components/fahrstunde-form";
import { useOptionen } from "@/lib/optionen";
import { useLoader } from "@/lib/use-loader";
import { supabase } from "@/lib/supabase";
import { planeErinnerungen } from "@/lib/notifications";
import type { Fahrstunde } from "@/lib/types";

export default function FahrstundeBearbeiten() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const opt = useOptionen();
  const stundeQ = useLoader<Fahrstunde[]>(
    () => supabase.from("fahrstunde").select("*").eq("id", id).limit(1).returns<Fahrstunde[]>(),
    { cacheKey: `fahrstunde-${id}` },
  );
  const stunde = stundeQ.data?.[0];

  if (opt.loading || stundeQ.loading) return <CenterInfo loading />;
  if (stundeQ.error || !stunde || !opt.data) {
    return <CenterInfo text={stundeQ.error ?? "Fahrstunde nicht gefunden."} error />;
  }

  return (
    <FahrstundeForm
      optionen={opt.data}
      initial={{
        schueler_id: stunde.schueler_id,
        fahrlehrer_id: stunde.fahrlehrer_id,
        fahrzeug_id: stunde.fahrzeug_id,
        datum: stunde.datum,
        uhrzeit: stunde.uhrzeit.slice(0, 5),
        dauer_minuten: stunde.dauer_minuten,
        typ: stunde.typ,
        status: stunde.status,
        notiz: stunde.notiz ?? "",
      }}
      speichernText="Speichern"
      onSpeichern={async (w) => {
        const { error } = await supabase
          .from("fahrstunde")
          .update({
            schueler_id: w.schueler_id,
            fahrlehrer_id: w.fahrlehrer_id,
            fahrzeug_id: w.fahrzeug_id,
            datum: w.datum,
            uhrzeit: w.uhrzeit,
            dauer_minuten: w.dauer_minuten,
            typ: w.typ,
            status: w.status,
            notiz: w.notiz.trim() || null,
          })
          .eq("id", id);
        if (error) return error.message;
        await planeErinnerungen();
        router.back();
        return null;
      }}
      onLoeschen={() =>
        Alert.alert("Löschen", "Diese Fahrstunde wirklich löschen?", [
          { text: "Abbrechen", style: "cancel" },
          {
            text: "Löschen",
            style: "destructive",
            onPress: async () => {
              await supabase.from("fahrstunde").delete().eq("id", id);
              await planeErinnerungen();
              router.back();
            },
          },
        ])
      }
    />
  );
}
