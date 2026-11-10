import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Banknote, CheckCircle2, ExternalLink, Lock } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/shared/copy-button";
import { RECHNUNG_STATUS } from "@/lib/constants";
import { formatDatum, formatEuro } from "@/lib/utils";
import type { Rechnung, RechnungPosition } from "@/lib/types";
import { SubmitButton } from "@/components/shared/submit-button";
import { vorgangAbgleichen } from "@/lib/zahlung/buchung";
import { getSchuelerKontext } from "../../kontext";
import { PortalShell } from "../../portal-shell";
import { portalBezahlen } from "../zahlung-actions";

export const metadata = { title: "Rechnung" };

export default async function PortalRechnungDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { zahlung?: string; grund?: string; vorgang?: string };
}) {
  // Zurück von Stripe: Zahlung sofort bei Stripe abholen und verbuchen.
  if (searchParams.zahlung === "erfolg" && searchParams.vorgang) {
    await vorgangAbgleichen(searchParams.vorgang).catch(() => null);
  }

  const { schueler, schule } = await getSchuelerKontext();
  const schuleName = schule?.name ?? "Fahrschule";

  const supabase = createClient();
  const [{ data: rechnungData }, { data: posData }, { data: onlineData }] = await Promise.all([
    supabase.from("rechnung").select("*").eq("id", params.id).maybeSingle(),
    supabase
      .from("rechnung_position")
      .select("*")
      .eq("rechnung_id", params.id)
      .returns<RechnungPosition[]>(),
    // Online-Zahlung mit Stripe (Update 0021) – ohne Update einfach aus.
    supabase.rpc("portal_online_zahlung"),
  ]);
  const onlineZahlung = onlineData === true;

  if (!rechnungData) notFound();
  const r = rechnungData as Rechnung;
  const positionen = posData ?? [];
  const st = RECHNUNG_STATUS[r.status];
  const bezahlt = r.status === "bezahlt";
  const perLastschrift = Boolean(schueler?.sepa_mandat_ref);

  return (
    <PortalShell schuleName={schuleName}>
      <Link
        href="/portal/rechnungen"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Zurück
      </Link>

      <div className="space-y-4">
        {/* Kopf */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{r.nummer}</h1>
            <p className="text-sm text-muted-foreground">vom {formatDatum(r.rechnungsdatum)}</p>
          </div>
          <Badge variant="outline" className={st.badge}>
            {st.label}
          </Badge>
        </div>

        {/* Positionen */}
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {positionen.map((p) => (
                <div key={p.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{p.beschreibung}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.menge} {p.einheit} × {formatEuro(Number(p.einzelpreis))}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium tabular-nums">
                    {formatEuro(Number(p.menge) * Number(p.einzelpreis))}
                  </span>
                </div>
              ))}
              {positionen.length === 0 && (
                <p className="px-4 py-4 text-sm text-muted-foreground">Keine Positionen hinterlegt.</p>
              )}
            </div>
            <div className="flex items-center justify-between border-t px-4 py-3">
              <span className="text-sm font-medium">Gesamt (inkl. MwSt.)</span>
              <span className="text-lg font-semibold tabular-nums">{formatEuro(Number(r.betrag_brutto))}</span>
            </div>
          </CardContent>
        </Card>

        {/* Rückmeldung von der Stripe-Bezahlseite */}
        {!bezahlt && searchParams.zahlung === "erfolg" && (
          <Card className="border-success/30 bg-success-soft">
            <CardContent className="flex items-center gap-2 p-4 text-success">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">Danke! Deine Zahlung wird bestätigt – das dauert meist nur einen Moment.</span>
            </CardContent>
          </Card>
        )}
        {!bezahlt && searchParams.zahlung === "fehler" && (
          <Card className="border-warning/30 bg-warning-soft">
            <CardContent className="flex items-center gap-2 p-4 text-warning-text">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">{searchParams.grund || "Die Zahlung konnte nicht gestartet werden."}</span>
            </CardContent>
          </Card>
        )}

        {/* Bezahlen */}
        {bezahlt ? (
          <Card className="border-success/30 bg-success-soft">
            <CardContent className="flex items-center gap-2 p-4 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-sm font-medium">
                Bezahlt{r.bezahlt_am ? ` am ${formatDatum(r.bezahlt_am)}` : ""} – danke!
              </span>
            </CardContent>
          </Card>
        ) : perLastschrift ? (
          <Card>
            <CardContent className="flex items-center gap-2 p-4">
              <Banknote className="h-5 w-5 text-primary" strokeWidth={1.75} />
              <span className="text-sm text-foreground">
                Dieser Betrag wird per <strong>SEPA-Lastschrift</strong> eingezogen – du musst nichts tun.
              </span>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-4 p-4">
              <p className="text-sm font-medium text-foreground">Bezahlen</p>

              {onlineZahlung && (
                <form action={portalBezahlen} className="space-y-2">
                  <input type="hidden" name="rechnung_id" value={r.id} />
                  <SubmitButton className="w-full">
                    <Lock className="h-4 w-4" /> Jetzt bezahlen · {formatEuro(Number(r.betrag_brutto))}
                  </SubmitButton>
                  <p className="text-center text-xs text-muted-foreground">
                    Sicher über Stripe – z. B. mit Apple Pay, Karte oder Lastschrift.
                  </p>
                </form>
              )}

              {!onlineZahlung && schule?.zahlungslink && (
                <Button asChild className="w-full">
                  <a href={schule.zahlungslink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" /> Online bezahlen
                  </a>
                </Button>
              )}

              {schule?.iban && (
                <div className="space-y-2 rounded-lg border bg-surface p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Per Überweisung
                  </p>
                  {[
                    { label: "Empfänger", value: schule.kontoinhaber ?? schule.name },
                    { label: "IBAN", value: schule.iban },
                    { label: "Betrag", value: formatEuro(Number(r.betrag_brutto)) },
                    { label: "Verwendungszweck", value: r.nummer },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{row.label}</p>
                        <p className="truncate font-medium text-foreground">{row.value}</p>
                      </div>
                      <CopyButton text={row.value} label={row.label} />
                    </div>
                  ))}
                </div>
              )}

              {!onlineZahlung && !schule?.zahlungslink && !schule?.iban && (
                <p className="text-sm text-muted-foreground">
                  Zahlungsinfos folgen – bitte wende dich an deine Fahrschule.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PortalShell>
  );
}
