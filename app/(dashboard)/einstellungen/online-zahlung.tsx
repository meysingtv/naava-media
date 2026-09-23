"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, CreditCard, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SubmitButton } from "@/components/shared/submit-button";
import { cn } from "@/lib/utils";
import type { StripeStatus } from "@/lib/zahlung/status";
import { EinstellungsKarte } from "./einstellungen-form";
import { onlineZahlungSetzen, stripeVerbinden } from "./stripe-actions";

function Hinweis({ ton, children }: { ton: "warnung" | "erfolg"; children: React.ReactNode }) {
  const Icon = ton === "erfolg" ? CheckCircle2 : AlertTriangle;
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-xl px-4 py-3 text-13",
        ton === "erfolg" ? "bg-success-soft text-success" : "bg-warning-soft text-warning-text",
      )}
    >
      <Icon className="mt-px h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/**
 * Online-Zahlung: Fahrschule verbindet ihr Stripe-Konto, danach schaltet die
 * Geschäftsführung „Jetzt bezahlen“ für die Schüler in App und Portal frei.
 */
export function OnlineZahlung({ status, hinweis, grund }: { status: StripeStatus; hinweis?: string; grund?: string }) {
  const [aktiv, setAktiv] = React.useState(status.aktiv);
  const [speichert, starten] = React.useTransition();

  function umschalten(an: boolean) {
    setAktiv(an);
    starten(async () => {
      const r = await onlineZahlungSetzen(an);
      if (r.error) {
        toast.error(r.error);
        setAktiv(!an);
      } else if (r.message) toast.success(r.message);
    });
  }

  const zustand = !status.kontoId ? "getrennt" : status.bereit ? "bereit" : "einrichtung";
  const zustandText =
    zustand === "bereit"
      ? `Verbunden · ${status.kontoId}`
      : zustand === "einrichtung"
        ? "Einrichtung bei Stripe noch nicht abgeschlossen"
        : "Noch nicht verbunden";

  return (
    <EinstellungsKarte
      titel="Online-Zahlung mit Stripe"
      beschreibung="Schüler bezahlen offene Rechnungen direkt in der App und im Portal – mit Apple Pay, Karte, Lastschrift oder Klarna. Das Geld geht auf dein eigenes Stripe-Konto."
    >
      <div className="space-y-5">
        {!status.serverBereit && (
          <Hinweis ton="warnung">
            Online-Zahlung ist auf dem Server noch nicht eingerichtet – es fehlen die Stripe-Schlüssel (STRIPE_SECRET_KEY,
            STRIPE_WEBHOOK_SECRET) oder der SUPABASE_SERVICE_ROLE_KEY.
          </Hinweis>
        )}
        {status.migrationFehlt && (
          <Hinweis ton="warnung">
            Für diese Funktion fehlt noch das Datenbank-Update 0021. Spiel es einmal im Supabase-SQL-Editor ein.
          </Hinweis>
        )}
        {status.serverBereit && !status.webhookBereit && (
          <Hinweis ton="warnung">
            Der Stripe-Webhook fehlt (STRIPE_WEBHOOK_SECRET) – ohne ihn werden Zahlungen nicht automatisch als bezahlt gebucht.
          </Hinweis>
        )}
        {hinweis === "zurueck" &&
          (zustand === "bereit" ? (
            <Hinweis ton="erfolg">Stripe ist verbunden. Schalte unten die Online-Zahlung für deine Schüler frei.</Hinweis>
          ) : (
            <Hinweis ton="warnung">
              Stripe prüft noch deine Angaben oder es fehlen Daten. Das dauert meist nur wenige Minuten – sonst „Einrichtung
              fortsetzen“.
            </Hinweis>
          ))}
        {hinweis === "erneut" && (
          <Hinweis ton="warnung">Der Einrichtungslink ist abgelaufen. Klick einfach noch einmal auf „Einrichtung fortsetzen“.</Hinweis>
        )}
        {hinweis === "fehler" && <Hinweis ton="warnung">Stripe meldet: {grund || "Unbekannter Fehler."}</Hinweis>}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-text">
              <CreditCard className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Stripe-Konto</p>
              <p className={cn("truncate text-13", zustand === "bereit" ? "text-success" : "text-foreground-secondary")}>{zustandText}</p>
            </div>
          </div>
          {zustand === "bereit" ? (
            <Button asChild variant="outline" size="sm">
              <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer">
                Stripe-Dashboard <ExternalLink aria-hidden="true" />
              </a>
            </Button>
          ) : (
            <form action={stripeVerbinden}>
              <SubmitButton size="sm" disabled={!status.serverBereit || status.migrationFehlt}>
                {zustand === "getrennt" ? "Mit Stripe verbinden" : "Einrichtung fortsetzen"}
              </SubmitButton>
            </form>
          )}
        </div>

        {zustand === "bereit" && (
          <div className="flex items-start justify-between gap-4 border-t border-border pt-5">
            <div>
              <p className="text-sm font-medium text-foreground">Schüler können online bezahlen</p>
              <p className="mt-0.5 text-13 text-foreground-secondary">
                In App und Portal erscheint bei offenen Rechnungen „Jetzt bezahlen“. Bezahlte Rechnungen werden automatisch gebucht.
                Schüler mit SEPA-Mandat zahlen weiter per Lastschrift.
              </p>
            </div>
            <Switch checked={aktiv} onCheckedChange={umschalten} disabled={speichert} aria-label="Online-Zahlung für Schüler" />
          </div>
        )}

        <p className="text-xs text-foreground-tertiary">
          Welche Zahlarten angeboten werden, stellst du im Stripe-Dashboard unter „Zahlungsmethoden“ ein. Stripe berechnet je
          Zahlung eine Gebühr; Auszahlungen gehen auf das Bankkonto, das du bei Stripe hinterlegst.
        </p>
      </div>
    </EinstellungsKarte>
  );
}
