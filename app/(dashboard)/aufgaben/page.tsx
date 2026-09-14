import { Check, ListChecks, RotateCcw, Trash2 } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { cn, formatDatum } from "@/lib/utils";
import type { Aufgabe, Fahrschueler } from "@/lib/types";
import { AufgabeNeu } from "./aufgabe-neu";
import { aufgabeLoeschen, aufgabeStatusSetzen } from "./actions";

export const metadata = { title: "Aufgaben · FahrschulApp" };

type AufgabeMitSchueler = Aufgabe & {
  fahrschueler: Pick<Fahrschueler, "id" | "vorname" | "nachname"> | null;
};

const PRIO: Record<string, { label: string; dot: string; rang: number }> = {
  hoch: { label: "Hoch", dot: "bg-destructive", rang: 0 },
  mittel: { label: "Mittel", dot: "bg-warning", rang: 1 },
  niedrig: { label: "Niedrig", dot: "bg-border-strong", rang: 2 },
};

function Zeile({ a, heute }: { a: AufgabeMitSchueler; heute: string }) {
  const erledigt = a.status === "erledigt";
  const prio = PRIO[a.prioritaet] ?? PRIO.mittel;
  const ueberfaellig = !erledigt && a.faellig_am != null && a.faellig_am < heute;
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <form action={aufgabeStatusSetzen}>
        <input type="hidden" name="id" value={a.id} />
        <input type="hidden" name="status" value={erledigt ? "offen" : "erledigt"} />
        <button
          type="submit"
          aria-label={erledigt ? "Wieder öffnen" : "Als erledigt markieren"}
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-[6px] border transition-colors duration-fast",
            erledigt
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border-strong bg-background hover:border-primary",
          )}
        >
          {erledigt && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </button>
      </form>

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm font-medium", erledigt ? "text-muted-foreground line-through" : "text-foreground")}>
          {a.titel}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {a.fahrschueler && (
            <span>
              {a.fahrschueler.vorname} {a.fahrschueler.nachname}
            </span>
          )}
          {a.faellig_am && (
            <span className={cn(ueberfaellig && "font-medium text-destructive")}>
              fällig {formatDatum(a.faellig_am)}
            </span>
          )}
        </div>
      </div>

      {!erledigt && (
        <span className="inline-flex items-center gap-1.5 text-xs text-foreground-secondary">
          <span className={cn("h-2 w-2 rounded-full", prio.dot)} />
          {prio.label}
        </span>
      )}

      <div className="flex items-center gap-1">
        {erledigt && (
          <form action={aufgabeStatusSetzen}>
            <input type="hidden" name="id" value={a.id} />
            <input type="hidden" name="status" value="offen" />
            <button
              type="submit"
              aria-label="Wieder öffnen"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </form>
        )}
        <form action={aufgabeLoeschen}>
          <input type="hidden" name="id" value={a.id} />
          <button
            type="submit"
            aria-label="Löschen"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default async function AufgabenPage() {
  const supabase = createClient();
  const heute = new Date().toISOString().slice(0, 10);

  const [aufgabenRes, schuelerRes] = await Promise.all([
    supabase
      .from("aufgabe")
      .select("*, fahrschueler(id, vorname, nachname)")
      .order("faellig_am", { ascending: true, nullsFirst: false })
      .returns<AufgabeMitSchueler[]>(),
    supabase
      .from("fahrschueler")
      .select("id, vorname, nachname")
      .order("nachname")
      .returns<Pick<Fahrschueler, "id" | "vorname" | "nachname">[]>(),
  ]);

  const alle = aufgabenRes.data ?? [];
  const offen = alle
    .filter((a) => a.status !== "erledigt")
    .sort(
      (a, b) =>
        (PRIO[a.prioritaet]?.rang ?? 1) - (PRIO[b.prioritaet]?.rang ?? 1) ||
        (a.faellig_am ?? "9999").localeCompare(b.faellig_am ?? "9999"),
    );
  const erledigt = alle.filter((a) => a.status === "erledigt");
  const schueler = (schuelerRes.data ?? []).map((s) => ({
    id: s.id,
    label: `${s.vorname} ${s.nachname}`,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Aufgaben" description={`${offen.length} offen · ${erledigt.length} erledigt`}>
        <AufgabeNeu schueler={schueler} />
      </PageHeader>

      {alle.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Noch keine Aufgaben"
          description="Lege dein erstes To-do an – z. B. Prüfungstermine planen oder Nachweise anfordern."
        >
          <AufgabeNeu schueler={schueler} />
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="border-b bg-surface/60 px-4 py-2.5">
              <p className="text-[13px] font-medium text-muted-foreground">Offen ({offen.length})</p>
            </div>
            {offen.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Alles erledigt – stark! 🎉
              </p>
            ) : (
              <div className="divide-y">
                {offen.map((a) => (
                  <Zeile key={a.id} a={a} heute={heute} />
                ))}
              </div>
            )}
          </Card>

          {erledigt.length > 0 && (
            <Card className="overflow-hidden">
              <div className="flex items-center gap-2 border-b bg-surface/60 px-4 py-2.5">
                <p className="text-[13px] font-medium text-muted-foreground">
                  Erledigt ({erledigt.length})
                </p>
                <Badge variant="success" className="ml-auto">
                  <Check className="h-3 w-3" strokeWidth={3} /> fertig
                </Badge>
              </div>
              <div className="divide-y opacity-90">
                {erledigt.slice(0, 30).map((a) => (
                  <Zeile key={a.id} a={a} heute={heute} />
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
