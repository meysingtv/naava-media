import { Check, ClipboardCheck, Percent, Trash2, X } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SchuelerAvatar } from "@/components/shared/schueler-avatar";
import { FUEHRERSCHEINKLASSEN } from "@/lib/constants";
import { cn, formatDatum, formatUhrzeit } from "@/lib/utils";
import type { Fahrschueler, PruefungMitSchueler } from "@/lib/types";
import { PruefungNeu } from "./pruefung-neu";
import { pruefungErgebnisSetzen, pruefungLoeschen } from "./actions";

export const metadata = { title: "Prüfungen · FahrschulApp" };

const ERGEBNIS: Record<string, { label: string; variant: "warning" | "success" | "destructive" }> = {
  offen: { label: "Offen", variant: "warning" },
  bestanden: { label: "Bestanden", variant: "success" },
  nicht_bestanden: { label: "Nicht bestanden", variant: "destructive" },
};

function PruefungZeile({ p }: { p: PruefungMitSchueler }) {
  const erg = ERGEBNIS[p.ergebnis] ?? ERGEBNIS.offen;
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="w-16 shrink-0">
        <p className="text-sm font-semibold text-foreground tabular-nums">{formatDatum(p.datum)}</p>
        {p.uhrzeit && <p className="text-xs text-muted-foreground tabular-nums">{formatUhrzeit(p.uhrzeit)}</p>}
      </div>
      {p.fahrschueler ? (
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <SchuelerAvatar
            vorname={p.fahrschueler.vorname}
            nachname={p.fahrschueler.nachname}
            farbe={p.fahrschueler.avatar_farbe}
            className="h-8 w-8 text-xs"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {p.fahrschueler.vorname} {p.fahrschueler.nachname}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {p.art === "praxis" ? "Praktische Prüfung" : "Theorieprüfung"}
              {p.klasse ? ` · Klasse ${p.klasse}` : ""} · {p.versuch}. Versuch
            </p>
          </div>
        </div>
      ) : (
        <div className="min-w-0 flex-1 text-sm text-muted-foreground">Ohne Schüler</div>
      )}

      {p.pruefstelle && (
        <Badge variant="outline" className="hidden sm:inline-flex">
          {p.pruefstelle}
        </Badge>
      )}
      <Badge variant={erg.variant}>{erg.label}</Badge>

      {p.ergebnis === "offen" ? (
        <div className="flex items-center gap-1">
          <form action={pruefungErgebnisSetzen}>
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="ergebnis" value="bestanden" />
            <input type="hidden" name="schueler_id" value={p.schueler_id ?? ""} />
            <input type="hidden" name="art" value={p.art} />
            <button
              type="submit"
              aria-label="Bestanden"
              className="flex h-8 w-8 items-center justify-center rounded-md text-success transition-colors hover:bg-success-soft"
            >
              <Check className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </form>
          <form action={pruefungErgebnisSetzen}>
            <input type="hidden" name="id" value={p.id} />
            <input type="hidden" name="ergebnis" value="nicht_bestanden" />
            <input type="hidden" name="schueler_id" value={p.schueler_id ?? ""} />
            <input type="hidden" name="art" value={p.art} />
            <button
              type="submit"
              aria-label="Nicht bestanden"
              className="flex h-8 w-8 items-center justify-center rounded-md text-destructive transition-colors hover:bg-destructive-soft"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </form>
        </div>
      ) : (
        <form action={pruefungLoeschen}>
          <input type="hidden" name="id" value={p.id} />
          <button
            type="submit"
            aria-label="Löschen"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </form>
      )}
    </div>
  );
}

export default async function PruefungenPage() {
  const supabase = createClient();
  const heute = new Date().toISOString().slice(0, 10);

  const [pruefungenRes, schuelerRes] = await Promise.all([
    supabase
      .from("pruefung")
      .select("*, fahrschueler(id, vorname, nachname, avatar_farbe)")
      .order("datum", { ascending: false })
      .returns<PruefungMitSchueler[]>(),
    supabase
      .from("fahrschueler")
      .select("id, vorname, nachname, fuehrerscheinklassen")
      .order("nachname")
      .returns<Pick<Fahrschueler, "id" | "vorname" | "nachname" | "fuehrerscheinklassen">[]>(),
  ]);

  const pruefungen = pruefungenRes.data ?? [];
  const anstehend = pruefungen
    .filter((p) => p.ergebnis === "offen" && p.datum >= heute)
    .sort((a, b) => a.datum.localeCompare(b.datum));
  const vergangen = pruefungen.filter((p) => !(p.ergebnis === "offen" && p.datum >= heute));

  const abgeschlossen = pruefungen.filter((p) => p.ergebnis !== "offen");
  const bestanden = abgeschlossen.filter((p) => p.ergebnis === "bestanden").length;
  const quote = abgeschlossen.length > 0 ? Math.round((bestanden / abgeschlossen.length) * 100) : null;

  const schueler = (schuelerRes.data ?? []).map((s) => ({
    id: s.id,
    label: `${s.vorname} ${s.nachname}`,
    klasse: s.fuehrerscheinklassen?.[0] ?? "",
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Prüfungen" description="Theorie- & Praxisprüfungen planen und Ergebnisse erfassen.">
        <PruefungNeu schueler={schueler} klassen={[...FUEHRERSCHEINKLASSEN]} />
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Anstehende Prüfungen" value={anstehend.length} icon={ClipboardCheck} />
        <StatCard
          label="Bestehensquote"
          value={quote != null ? `${quote}%` : "—"}
          icon={Percent}
          iconClassName={quote != null && quote >= 60 ? "bg-success-soft text-success" : undefined}
          hint={`${bestanden} von ${abgeschlossen.length} bestanden`}
        />
        <StatCard label="Prüfungen gesamt" value={pruefungen.length} icon={ClipboardCheck} />
      </div>

      {pruefungen.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Noch keine Prüfungen"
          description="Lege die erste Theorie- oder Praxisprüfung an, um Termine und Ergebnisse zu verwalten."
        >
          <PruefungNeu schueler={schueler} klassen={[...FUEHRERSCHEINKLASSEN]} />
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="border-b bg-surface/60 px-4 py-2.5">
              <p className="text-[13px] font-medium text-muted-foreground">
                Anstehend ({anstehend.length})
              </p>
            </div>
            {anstehend.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Keine anstehenden Prüfungen.
              </p>
            ) : (
              <div className="divide-y">
                {anstehend.map((p) => (
                  <PruefungZeile key={p.id} p={p} />
                ))}
              </div>
            )}
          </Card>

          {vergangen.length > 0 && (
            <Card className="overflow-hidden">
              <div className="border-b bg-surface/60 px-4 py-2.5">
                <p className="text-[13px] font-medium text-muted-foreground">
                  Ergebnisse &amp; vergangene ({vergangen.length})
                </p>
              </div>
              <div className={cn("divide-y")}>
                {vergangen.slice(0, 50).map((p) => (
                  <PruefungZeile key={p.id} p={p} />
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
