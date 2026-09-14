import Link from "next/link";
import { ChevronRight, GraduationCap, Users } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { FUEHRERSCHEINKLASSEN } from "@/lib/constants";
import { formatDatum } from "@/lib/utils";
import type { Kurs } from "@/lib/types";
import { KursNeu } from "./kurs-neu";

export const metadata = { title: "Kurse · FahrschulApp" };

const STATUS: Record<string, { label: string; variant: "warning" | "success" | "secondary" }> = {
  geplant: { label: "Geplant", variant: "warning" },
  laufend: { label: "Laufend", variant: "success" },
  beendet: { label: "Beendet", variant: "secondary" },
};

type KursMitCount = Kurs & { kurs_teilnahme: { count: number }[] | null };

export default async function KursePage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("kurs")
    .select("*, kurs_teilnahme(count)")
    .order("created_at", { ascending: false })
    .returns<KursMitCount[]>();

  const kurse = data ?? [];
  const laufend = kurse.filter((k) => k.status === "laufend").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Kurse" description="Theoriekurse als Gruppe planen und Teilnehmer verwalten.">
        <KursNeu klassen={[...FUEHRERSCHEINKLASSEN]} />
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Kurse gesamt" value={kurse.length} icon={GraduationCap} />
        <StatCard label="Laufende Kurse" value={laufend} icon={GraduationCap} iconClassName={laufend > 0 ? "bg-success-soft text-success" : undefined} />
        <StatCard
          label="Teilnehmer gesamt"
          value={kurse.reduce((s, k) => s + (k.kurs_teilnahme?.[0]?.count ?? 0), 0)}
          icon={Users}
        />
      </div>

      {kurse.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Noch keine Kurse"
          description="Lege deinen ersten Theoriekurs an und ordne ihm Schüler zu."
        >
          <KursNeu klassen={[...FUEHRERSCHEINKLASSEN]} />
        </EmptyState>
      ) : (
        <Card className="divide-y overflow-hidden">
          {kurse.map((k) => {
            const st = STATUS[k.status] ?? STATUS.geplant;
            return (
              <Link
                key={k.id}
                href={`/kurse/${k.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                  <GraduationCap className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{k.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {k.klasse ? `Klasse ${k.klasse} · ` : ""}
                    {k.start_datum ? `Start ${formatDatum(k.start_datum)} · ` : ""}
                    {k.kurs_teilnahme?.[0]?.count ?? 0} Teilnehmer
                  </p>
                </div>
                <Badge variant={st.variant}>{st.label}</Badge>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            );
          })}
        </Card>
      )}
    </div>
  );
}
