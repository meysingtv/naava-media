import { useRouter } from "expo-router";

import { CenterInfo } from "@/components/ui";
import { FahrzeugForm } from "@/components/fahrzeug-form";
import { useOptionen } from "@/lib/optionen";
import { supabase } from "@/lib/supabase";

export default function NeuesFahrzeug() {
  const router = useRouter();
  const opt = useOptionen();

  if (opt.loading) return <CenterInfo loading />;
  if (opt.error || !opt.data) return <CenterInfo text={opt.error ?? "Konnte Daten nicht laden."} error />;

  const fahrschuleId = opt.data.fahrschuleId;
  return (
    <FahrzeugForm
      initial={{ kennzeichen: "", marke: "", modell: "", klasse: "", aktiv: true }}
      speichernText="Fahrzeug anlegen"
      onSpeichern={async (w) => {
        const { error } = await supabase.from("fahrzeug").insert({
          fahrschule_id: fahrschuleId,
          kennzeichen: w.kennzeichen,
          marke: w.marke.trim() || null,
          modell: w.modell.trim() || null,
          klasse: w.klasse.trim() || null,
          aktiv: w.aktiv,
        });
        if (error) return error.message;
        router.back();
        return null;
      }}
    />
  );
}
