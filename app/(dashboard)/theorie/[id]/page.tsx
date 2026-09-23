import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Eigenschaft, Eigenschaften } from "@/components/ui/eigenschaften";
import { DetailKopf } from "@/components/shared/detail-kopf";
import { LoeschenDialog } from "@/components/shared/loeschen-dialog";
import { formatDatum, formatUhrzeit } from "@/lib/utils";
import { heuteBerlin, wochentagKurz } from "@/lib/zeit";
import type { Theoriestunde } from "@/lib/types";
import { AnwesenheitForm, type AnwesenheitSchueler } from "./anwesenheit-form";
import { theoriestundeLoeschenRedirect } from "../actions";

export const metadata = { title: "Theoriestunde · FahrschulApp" };

export default async function TheoriestundeDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: stunde } = await supabase.from("theoriestunde").select("*").eq("id", params.id).maybeSingle();
  if (!stunde) notFound();
  const t = stunde as Theoriestunde;

  const [schuelerRes, teilnahmeRes, kursRes] = await Promise.all([
    supabase
      .from("fahrschueler")
      .select("id, vorname, nachname, avatar_farbe, ausbildung_beendet")
      .order("nachname", { ascending: true })
      .order("vorname", { ascending: true }),
    supabase.from("theorie_teilnahme").select("schueler_id, anwesend").eq("theoriestunde_id", t.id),
    t.kurs_id
      ? supabase.from("kurs").select("id, name").eq("id", t.kurs_id).maybeSingle<{ id: string; name: string }>()
      : Promise.resolve({ data: null }),
  ]);

  const anwesend = (teilnahmeRes.data ?? []).filter((x) => x.anwesend).map((x) => x.schueler_id as string);
  // Wer schon fertig ist, steht nur noch in der Liste, wenn er hier als anwesend eingetragen ist.
  const schueler = ((schuelerRes.data ?? []) as (AnwesenheitSchueler & { ausbildung_beendet: boolean })[]).filter(
    (s) => !s.ausbildung_beendet || anwesend.includes(s.id),
  );
  const heute = heuteBerlin();
  const titel = t.thema || "Theoriestunde";
  const tag = t.datum === heute ? "Heute" : `${wochentagKurz(t.datum)}, ${formatDatum(t.datum)}`;

  return (
    <div>
      <DetailKopf
        zurueck={{ href: "/theorie", label: "Theorie" }}
        titel={titel}
        kurztitel={`Theorie ${formatDatum(t.datum).slice(0, 6)}`}
        meta={[`${tag}, ${formatUhrzeit(t.uhrzeit)} Uhr`, kursRes.data?.name ?? null, t.max_teilnehmer ? `${t.max_teilnehmer} Plätze` : null]}
        aktionen={
          <LoeschenDialog
            action={theoriestundeLoeschenRedirect}
            id={t.id}
            titel="Theoriestunde löschen?"
            beschreibung="Der Termin und die erfasste Anwesenheit werden dauerhaft entfernt."
            buttonLabel=""
          />
        }
      />

      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <AnwesenheitForm theoriestundeId={t.id} schueler={schueler} initialPresent={anwesend} max={t.max_teilnehmer} />

        <aside className="min-w-0 space-y-8">
          <section>
            <h2 className="mb-2 text-13 font-semibold text-foreground">Details</h2>
            <Eigenschaften breite="schmal">
              <Eigenschaft label="Datum">{formatDatum(t.datum)}</Eigenschaft>
              <Eigenschaft label="Uhrzeit">{`${formatUhrzeit(t.uhrzeit)} Uhr`}</Eigenschaft>
              <Eigenschaft label="Thema">{t.thema}</Eigenschaft>
              <Eigenschaft label="Kurs">
                {kursRes.data && (
                  <Link href={`/kurse/${kursRes.data.id}`} className="hover:underline">
                    {kursRes.data.name}
                  </Link>
                )}
              </Eigenschaft>
              <Eigenschaft label="Plätze">{t.max_teilnehmer}</Eigenschaft>
            </Eigenschaften>
          </section>
        </aside>
      </div>
    </div>
  );
}
