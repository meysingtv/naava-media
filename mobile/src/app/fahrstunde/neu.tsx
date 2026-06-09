import { useLocalSearchParams, useRouter } from "expo-router";

import { CenterInfo } from "@/components/ui";
import { FahrstundeForm } from "@/components/fahrstunde-form";
import { useOptionen } from "@/lib/optionen";
import { supabase } from "@/lib/supabase";
import { heuteISO } from "@/lib/format";
import { planeErinnerungen } from "@/lib/notifications";

export default function NeueFahrstunde() {
  const router = useRouter();
  const { datum } = useLocalSearchParams<{ datum?: string }>();
  const opt = useOptionen();

  if (opt.loading) return <CenterInfo loading />;
  if (opt.error || !opt.data) return <CenterInfo text={opt.error ?? "Konnte Daten nicht laden."} error />;

  const data = opt.data;
  return (
    <FahrstundeForm
      optionen={data}
      initial={{
        schueler_id: null,
        fahrlehrer_id: null,
        fahrzeug_id: null,
        datum: datum ?? heuteISO(),
        uhrzeit: "09:00",
        dauer_minuten: 45,
        typ: "normal",
        status: "geplant",
        notiz: "",
      }}
      speichernText="Fahrstunde anlegen"
      onSpeichern={async (w) => {
        const { error } = await supabase.from("fahrstunde").insert({
          fahrschule_id: data.fahrschuleId,
          schueler_id: w.schueler_id,
          fahrlehrer_id: w.fahrlehrer_id,
          fahrzeug_id: w.fahrzeug_id,
          datum: w.datum,
          uhrzeit: w.uhrzeit,
          dauer_minuten: w.dauer_minuten,
          typ: w.typ,
          status: w.status,
          notiz: w.notiz.trim() || null,
        });
        if (error) return error.message;
        await planeErinnerungen();
        router.back();
        return null;
      }}
    />
  );
}
