import { useRouter } from "expo-router";

import { CenterInfo } from "@/components/ui";
import { SchuelerForm } from "@/components/schueler-form";
import { useOptionen } from "@/lib/optionen";
import { supabase } from "@/lib/supabase";
import { zufallsAvatarFarbe } from "@/lib/constants";

export default function NeuerSchueler() {
  const router = useRouter();
  const opt = useOptionen();

  if (opt.loading) return <CenterInfo loading />;
  if (opt.error || !opt.data) return <CenterInfo text={opt.error ?? "Konnte Daten nicht laden."} error />;

  const fahrschuleId = opt.data.fahrschuleId;
  return (
    <SchuelerForm
      initial={{
        vorname: "",
        nachname: "",
        telefon: "",
        email: "",
        fuehrerscheinklassen: [],
        theorie_bestanden: false,
        pruefung_termin: null,
      }}
      speichernText="Schüler anlegen"
      onSpeichern={async (w) => {
        const { error } = await supabase.from("fahrschueler").insert({
          fahrschule_id: fahrschuleId,
          vorname: w.vorname,
          nachname: w.nachname,
          telefon: w.telefon.trim() || null,
          email: w.email.trim() || null,
          fuehrerscheinklassen: w.fuehrerscheinklassen,
          theorie_bestanden: w.theorie_bestanden,
          pruefung_termin: w.pruefung_termin,
          avatar_farbe: zufallsAvatarFarbe(),
        });
        if (error) return error.message;
        router.back();
        return null;
      }}
    />
  );
}
