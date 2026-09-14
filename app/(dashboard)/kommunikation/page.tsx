import { MessageSquare } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { formatDatum } from "@/lib/utils";
import type { Fahrschueler, Nachricht, Pruefung, Rechnung } from "@/lib/types";
import { Compose, type Segmente } from "./compose";

export const metadata = { title: "Kommunikation · FahrschulApp" };

export default async function KommunikationPage() {
  const supabase = createClient();
  const heute = new Date().toISOString().slice(0, 10);

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
    <div className="space-y-6">
      <PageHeader
        title="Kommunikation"
        description="Sammel-E-Mails an Schüler-Segmente – mit Vorlagen und Verlauf."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Compose segmente={segmente} />

        <Card className="overflow-hidden">
          <div className="border-b bg-surface/60 px-4 py-2.5">
            <p className="text-[13px] font-medium text-muted-foreground">Verlauf</p>
          </div>
          {log.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-14 text-center text-muted-foreground">
              <MessageSquare className="h-7 w-7" strokeWidth={1.5} />
              <p className="text-sm">Noch keine Nachrichten versendet.</p>
            </div>
          ) : (
            <div className="max-h-[520px] divide-y overflow-y-auto scrollbar-thin">
              {log.map((n) => (
                <div key={n.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {n.betreff || "(ohne Betreff)"}
                    </p>
                    <Badge variant="secondary">{n.anzahl}</Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {n.empfaenger ?? "—"} · {formatDatum(n.created_at.slice(0, 10))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Hinweis: Der Versand öffnet dein E-Mail-Programm (BCC an das Segment). Ein automatischer
        Server-Versand lässt sich später per E-Mail-Dienst (z. B. Resend/SMTP) ergänzen.
      </p>
    </div>
  );
}
