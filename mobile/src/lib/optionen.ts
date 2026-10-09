import { useLoader } from "./use-loader";
import { supabase } from "./supabase";
import type { Option } from "@/components/form-fields";

export type Optionen = {
  fahrschuleId: string;
  schueler: Option[];
  fahrlehrer: Option[];
  fahrzeuge: Option[];
};

/** Lädt die Auswahllisten (Schüler/Lehrer/Fahrzeuge) + die eigene Fahrschul-ID. */
export function useOptionen() {
  return useLoader<Optionen>(
    async () => {
      const [schueler, lehrer, fahrzeuge, fahrschule] = await Promise.all([
        supabase
          .from("fahrschueler")
          .select("id, vorname, nachname")
          .order("nachname")
          .returns<{ id: string; vorname: string; nachname: string }[]>(),
        supabase
          .from("fahrlehrer")
          .select("id, vorname, nachname")
          .eq("aktiv", true)
          .order("nachname")
          .returns<{ id: string; vorname: string; nachname: string }[]>(),
        supabase
          .from("fahrzeug")
          .select("id, kennzeichen")
          .eq("aktiv", true)
          .order("kennzeichen")
          .returns<{ id: string; kennzeichen: string }[]>(),
        supabase.from("fahrschule").select("id").limit(1).returns<{ id: string }[]>(),
      ]);

      const error = schueler.error || lehrer.error || fahrzeuge.error || fahrschule.error;
      if (error) return { data: null, error };

      return {
        data: {
          fahrschuleId: fahrschule.data?.[0]?.id ?? "",
          schueler: (schueler.data ?? []).map((x) => ({ id: x.id, label: `${x.vorname} ${x.nachname}` })),
          fahrlehrer: (lehrer.data ?? []).map((x) => ({ id: x.id, label: `${x.vorname} ${x.nachname}` })),
          fahrzeuge: (fahrzeuge.data ?? []).map((x) => ({ id: x.id, label: x.kennzeichen })),
        },
        error: null,
      };
    },
    { cacheKey: "fahrstunde-optionen" },
  );
}
