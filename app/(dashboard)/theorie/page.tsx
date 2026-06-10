import Link from "next/link";
import { BookOpen, CalendarClock, ChevronRight } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { LoeschenDialog } from "@/components/shared/loeschen-dialog";
import { formatDatum, formatUhrzeit } from "@/lib/utils";
import type { Theoriestunde } from "@/lib/types";
import { TheoriestundeDialog } from "./theoriestunde-dialog";
import { theoriestundeLoeschen } from "./actions";

export const metadata = { title: "Theorie · FahrschulApp" };

type StundeMitAnzahl = Theoriestunde & {
  teilnahme: { count: number }[] | null;
};

export default async function TheoriePage() {
  const supabase = createClient();
  const heute = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("theoriestunde")
    .select("*, teilnahme:theorie_teilnahme(count)")
    .order("datum", { ascending: false })
    .order("uhrzeit", { ascending: false })
    .returns<StundeMitAnzahl[]>();

  const stunden = data ?? [];
  const anstehend = stunden.filter((t) => t.datum >= heute).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Theorie"
        description="Theorieunterricht planen und die Anwesenheit deiner Schüler erfassen."
      >
        <TheoriestundeDialog />
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Theoriestunden gesamt" value={stunden.length} icon={BookOpen} />
        <StatCard
          label="Anstehend"
          value={anstehend}
          icon={CalendarClock}
          iconClassName="bg-emerald-100 text-emerald-600"
          hint="Termine ab heute"
        />
      </div>

      {stunden.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Noch keine Theoriestunden"
          description="Lege deinen ersten Theorie-Termin an, um die Anwesenheit zu dokumentieren."
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Datum</th>
                  <th className="px-4 py-3 font-medium">Uhrzeit</th>
                  <th className="px-4 py-3 font-medium">Thema</th>
                  <th className="px-4 py-3 font-medium">Teilnehmer</th>
                  <th className="px-4 py-3 text-right font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stunden.map((t) => {
                  const anzahl = t.teilnahme?.[0]?.count ?? 0;
                  return (
                    <tr key={t.id} className="transition-colors hover:bg-muted/40">
                      <td className="whitespace-nowrap px-4 py-3 font-medium">
                        <span className="inline-flex items-center gap-2">
                          {formatDatum(t.datum)}
                          {t.datum === heute && (
                            <Badge className="text-[10px]">Heute</Badge>
                          )}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {formatUhrzeit(t.uhrzeit)} Uhr
                      </td>
                      <td className="px-4 py-3">{t.thema || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <Badge variant="secondary">
                          {anzahl}
                          {t.max_teilnehmer ? ` / ${t.max_teilnehmer}` : ""}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/theorie/${t.id}`}>
                              Anwesenheit <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <LoeschenDialog
                            action={theoriestundeLoeschen}
                            id={t.id}
                            titel="Theoriestunde löschen?"
                            beschreibung="Der Termin und die erfasste Anwesenheit werden dauerhaft entfernt."
                            buttonLabel=""
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
