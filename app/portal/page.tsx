import Link from "next/link";
import { ArrowRight, CalendarDays, CalendarPlus, CheckCircle2, Clock, Receipt } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FAHRSTUNDE_TYPEN } from "@/lib/constants";
import { formatDatum, formatEuro, formatUhrzeit } from "@/lib/utils";
import type { Fahrstunde, Rechnung } from "@/lib/types";
import { getSchuelerKontext } from "./kontext";
import { PortalShell } from "./portal-shell";
import { ladePortalAnfragen } from "./termine/anfragen-daten";

export const metadata = { title: "Mein Portal" };

function begruessung(): string {
  const h = new Date().getHours();
  if (h < 11) return "Guten Morgen";
  if (h < 18) return "Hallo";
  return "Guten Abend";
}

export default async function PortalStartPage() {
  const { schueler, schule } = await getSchuelerKontext();
  const schuleName = schule?.name ?? "Fahrschule";

  if (!schueler) {
    return (
      <PortalShell schuleName={schuleName}>
        <p className="text-sm text-muted-foreground">Dein Zugang ist noch nicht verknüpft.</p>
      </PortalShell>
    );
  }

  const supabase = createClient();
  const heute = new Date().toISOString().slice(0, 10);

  const [naechsteRes, rechnungRes, anfrage] = await Promise.all([
    supabase
      .from("fahrstunde")
      .select("*")
      .gte("datum", heute)
      .neq("status", "ausgefallen")
      .order("datum", { ascending: true })
      .order("uhrzeit", { ascending: true })
      .limit(1)
      .returns<Fahrstunde[]>(),
    supabase.from("rechnung").select("betrag_brutto, status").returns<
      Pick<Rechnung, "betrag_brutto" | "status">[]
    >(),
    ladePortalAnfragen(),
  ]);
  const offeneAnfragen = anfrage.anfragen.filter((a) => a.status === "offen").length;

  const naechste = naechsteRes.data?.[0];
  const offen = (rechnungRes.data ?? []).filter((r) => r.status !== "bezahlt");
  const offenerBetrag = offen.reduce((s, r) => s + Number(r.betrag_brutto ?? 0), 0);

  return (
    <PortalShell schuleName={schuleName}>
      <div className="space-y-5">
        <div>
          <p className="text-sm text-muted-foreground">{begruessung()},</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{schueler.vorname}!</h1>
        </div>

        {/* Nächster Termin */}
        <Card>
          <CardContent className="p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Nächster Termin
            </p>
            {naechste ? (
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <CalendarDays className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground">
                    {FAHRSTUNDE_TYPEN[naechste.typ]?.label ?? "Fahrstunde"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDatum(naechste.datum)} · {formatUhrzeit(naechste.uhrzeit)} Uhr
                  </p>
                </div>
                <Badge variant="default">{naechste.dauer_minuten} Min</Badge>
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" /> Aktuell kein Termin geplant.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Kacheln */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Theorie</p>
              <p className="mt-1 flex items-center gap-1.5 text-base font-semibold">
                {schueler.theorie_bestanden ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-success" /> bestanden
                  </>
                ) : (
                  <span className="text-foreground">{schueler.lernstatus ?? 0}% gelernt</span>
                )}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Offen</p>
              <p className={`mt-1 text-base font-semibold tabular-nums ${offenerBetrag > 0 ? "text-warning" : "text-success"}`}>
                {formatEuro(offenerBetrag)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Links */}
        <div className="space-y-2">
          {anfrage.regeln?.erlaubt && (
            <Link
              href="/portal/termine#anfragen"
              className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-surface"
            >
              <CalendarPlus className="h-5 w-5 text-primary" strokeWidth={1.75} />
              <span className="flex-1 text-sm font-medium">Fahrstunde anfragen</span>
              {offeneAnfragen > 0 && <Badge variant="warning">{offeneAnfragen} offen</Badge>}
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          )}
          <Link
            href="/portal/termine"
            className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-surface"
          >
            <CalendarDays className="h-5 w-5 text-primary" strokeWidth={1.75} />
            <span className="flex-1 text-sm font-medium">Alle Termine ansehen</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link
            href="/portal/rechnungen"
            className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-surface"
          >
            <Receipt className="h-5 w-5 text-primary" strokeWidth={1.75} />
            <span className="flex-1 text-sm font-medium">Meine Rechnungen</span>
            {offen.length > 0 && <Badge variant="warning">{offen.length}</Badge>}
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </PortalShell>
  );
}
