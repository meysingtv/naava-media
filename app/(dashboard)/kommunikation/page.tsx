import { createClient } from "@/lib/supabase/server";
import { Karte, KarteLeer } from "@/components/ui/karte";
import { PageHeader } from "@/components/shared/page-header";
import { formatDatum } from "@/lib/utils";
import { heuteBerlin } from "@/lib/zeit";
import type { Fahrschueler, Nachricht, Pruefung, Rechnung } from "@/lib/types";
import { Compose, type Segmente } from "./compose";

export const metadata = { title: "Kommunikation · FahrschulApp" };

export default async function KommunikationPage() {
  const supabase = createClient();
  const heute = heuteBerlin();

  const [schuelerRes, rechnungRes, pruefungRes, logRes] = await Promise.all([
    supabase
      .from("fahrschueler")
      .select("id, email, theorie_bestanden")
      .returns<Pick<Fahrschueler, "id" | "email" | "theorie_bestanden">[]>(),
    supabase.from("rechnung").select("schueler_id, status").returns<
      Pick<Rechnung, "schueler_id" | "status">[]
    >(),
    supabase
      .from("pruefung")
      .select("schueler_id, datum, ergebnis")
      .returns<Pick<Pruefung, "schueler_id" | "datum" | "ergebnis">[]>(),
    supabase
      .from("nachricht")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<Nachricht[]>(),
  ]);

  const schueler = schuelerRes.data ?? [];
  const rechnungen = rechnungRes.data ?? [];
  const pruefungen = pruefungRes.data ?? [];
  const log = logRes.data ?? [];

  const emailVon: Record<string, string> = {};
  for (const s of schueler) if (s.email) emailVon[s.id] = s.email;

  const offeneRechnungIds = new Set(
    rechnungen.filter((r) => r.schueler_id && r.status !== "bezahlt").map((r) => r.schueler_id as string),
  );
  const pruefungNahtIds = new Set(
    pruefungen.filter((p) => p.schueler_id && p.ergebnis === "offen" && p.datum >= heute).map((p) => p.schueler_id as string),
  );

  const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

  const segmente: Segmente = {
    alle: uniq(schueler.map((s) => s.email ?? "")),
    theorie_offen: uniq(schueler.filter((s) => !s.theorie_bestanden).map((s) => s.email ?? "")),
    offene_rechnung: uniq(Array.from(offeneRechnungIds).map((id) => emailVon[id] ?? "")),
    pruefung_naht: uniq(Array.from(pruefungNahtIds).map((id) => emailVon[id] ?? "")),
  };

  return (
    <div>
      <PageHeader title="Nachrichten" />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Compose segmente={segmente} />

        <Karte titel="Verlauf" meta={log.length ? `letzte ${log.length}` : undefined} className="lg:self-start">
          {log.length === 0 ? (
            <KarteLeer>Noch keine Nachricht verschickt.</KarteLeer>
          ) : (
            <ul className="max-h-[560px] divide-y divide-border overflow-y-auto border-t border-border scrollbar-thin">
              {log.map((n) => (
                <li key={n.id} className="px-5 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate text-13 font-medium text-foreground">{n.betreff || "Ohne Betreff"}</p>
                    <span className="shrink-0 text-xs tabular-nums text-foreground-tertiary">{formatDatum(n.created_at.slice(0, 10))}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-foreground-secondary">
                    {n.empfaenger ?? "Empfänger unbekannt"}
                    {n.anzahl ? ` · ${n.anzahl} Empfänger` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Karte>
      </div>
    </div>
  );
}
