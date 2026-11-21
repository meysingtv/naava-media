import { useRouter } from "expo-router";

import { CenterInfo } from "@/components/ui";
import { TeamForm } from "@/components/team-form";
import { useOptionen } from "@/lib/optionen";
import { supabase } from "@/lib/supabase";

export default function NeuerMitarbeiter() {
  const router = useRouter();
  const opt = useOptionen();

  if (opt.loading) return <CenterInfo loading />;
  if (opt.error || !opt.data) return <CenterInfo text={opt.error ?? "Konnte Daten nicht laden."} error />;

  const fahrschuleId = opt.data.fahrschuleId;
  return (
    <TeamForm
      initial={{ vorname: "", nachname: "", email: "", telefon: "", rolle: "fahrlehrer", fuehrerscheinklassen: [], aktiv: true }}
      speichernText="Mitarbeiter anlegen"
      onSpeichern={async (w) => {
        const { error } = await supabase.from("fahrlehrer").insert({
          fahrschule_id: fahrschuleId,
          user_id: null,
          vorname: w.vorname,
          nachname: w.nachname,
          email: w.email.trim() || null,
          telefon: w.telefon.trim() || null,
          fuehrerscheinklassen: w.fuehrerscheinklassen,
          rolle: w.rolle,
          aktiv: w.aktiv,
        });
        if (error) return error.message;
        router.back();
        return null;
      }}
    />
  );
}
