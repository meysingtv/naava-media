import { CalendarDays, CalendarPlus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FAHRSTUNDE_TYPEN } from "@/lib/constants";
import { cn, formatDatum, formatUhrzeit } from "@/lib/utils";
import type { Fahrstunde } from "@/lib/types";
import { getSchuelerKontext } from "../kontext";
import { PortalShell } from "../portal-shell";

export const metadata = { title: "Meine Termine" };

const STATUS: Record<string, { label: string; variant: "default" | "success" | "secondary" }> = {
  geplant: { label: "Geplant", variant: "default" },
  abgeschlossen: { label: "Erledigt", variant: "success" },
  ausgefallen: { label: "Ausgefallen", variant: "secondary" },
};

function Zeile({ f, vergangen, kalender }: { f: Fahrstunde; vergangen?: boolean; kalender?: boolean }) {
  const typ = FAHRSTUNDE_TYPEN[f.typ];
  const st = STATUS[f.status] ?? STATUS.geplant;
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3", vergangen && "opacity-80")}>
      <span className={cn("h-9 w-1 shrink-0 rounded-full", f.status === "ausgefallen" ? "bg-border-strong" : typ?.dot)} />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium text-foreground", f.status === "ausgefallen" && "line-through")}>
          {typ?.label ?? "Fahrstunde"}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDatum(f.datum)} · {formatUhrzeit(f.uhrzeit)} Uhr · {f.dauer_minuten} Min
        </p>
      </div>
      {kalender && (
        <a
          href={`/portal/termine/${f.id}/ics`}
          className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-primary active:scale-95"
          aria-label="Zum Kalender hinzufügen"
        >
          <CalendarPlus className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </a>
      )}
      <Badge variant={st.variant}>{st.label}</Badge>
    </div>
  );
}

export default async function PortalTerminePage() {
  const { schule } = await getSchuelerKontext();
  const supabase = createClient();
  const heute = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("fahrstunde")
    .select("*")
    .order("datum", { ascending: false })
    .order("uhrzeit", { ascending: false })
    .returns<Fahrstunde[]>();

  const alle = data ?? [];
  const anstehend = alle
    .filter((f) => f.datum >= heute && f.status === "geplant")
    .sort((a, b) => a.datum.localeCompare(b.datum) || a.uhrzeit.localeCompare(b.uhrzeit));
  const vergangen = alle.filter((f) => !(f.datum >= heute && f.status === "geplant"));

  return (
    <PortalShell schuleName={schule?.name ?? "Fahrschule"}>
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Meine Termine</h1>

      {alle.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-strong py-14 text-center text-muted-foreground">
          <CalendarDays className="h-7 w-7" strokeWidth={1.5} />
          <p className="text-sm">Noch keine Termine.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Anstehend ({anstehend.length})
            </p>
            {anstehend.length === 0 ? (
              <Card className="px-4 py-6 text-center text-sm text-muted-foreground">Kein Termin geplant.</Card>
            ) : (
              <Card className="divide-y overflow-hidden">
                {anstehend.map((f) => (
                  <Zeile key={f.id} f={f} kalender />
                ))}
              </Card>
            )}
          </div>

          {vergangen.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Verlauf</p>
              <Card className="divide-y overflow-hidden">
                {vergangen.slice(0, 100).map((f) => (
                  <Zeile key={f.id} f={f} vergangen />
                ))}
              </Card>
            </div>
          )}
        </div>
      )}
    </PortalShell>
  );
}
