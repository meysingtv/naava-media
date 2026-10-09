import * as React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/shared/submit-button";
import { cn } from "@/lib/utils";

/**
 * Formular-Aufbau v4 – wie die Einstellungen bei Stripe: links Titel und ein
 * Satz Erklärung, rechts die Felder in einer weißen Karte. Auf schmalen
 * Bildschirmen stehen beide untereinander.
 */
export function FormularAbschnitt({
  titel,
  beschreibung,
  children,
  className,
}: {
  titel: string;
  beschreibung?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("grid gap-x-10 gap-y-3 lg:grid-cols-[240px_minmax(0,1fr)]", className)}>
      <div className="lg:pt-1">
        <h2 className="text-sm font-semibold text-foreground">{titel}</h2>
        {beschreibung && <p className="mt-1 text-13 text-foreground-secondary">{beschreibung}</p>}
      </div>
      <div className="min-w-0 rounded-xl bg-card p-5 shadow-panel sm:p-6">{children}</div>
    </section>
  );
}

/** Raster für Felder: eine Spalte auf dem Handy, zwei ab Tablet. */
export function FeldGitter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid gap-x-4 gap-y-5 sm:grid-cols-2", className)}>{children}</div>;
}

/** Ankreuzfeld mit Beschriftung (und optionalem Hinweis darunter). */
export function Ankreuzfeld({
  name,
  label,
  hinweis,
  defaultChecked,
  className,
}: {
  name: string;
  label: string;
  hinweis?: string;
  defaultChecked?: boolean | null;
  className?: string;
}) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3", className)}>
      <input
        type="checkbox"
        name={name}
        defaultChecked={Boolean(defaultChecked)}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-border-strong"
      />
      <span className="min-w-0">
        <span className="block text-13 font-medium text-foreground">{label}</span>
        {hinweis && <span className="block text-xs text-foreground-secondary">{hinweis}</span>}
      </span>
    </label>
  );
}

/**
 * Klebende Speicherleiste am unteren Rand: bleibt beim Scrollen sichtbar,
 * liegt am Ende des Formulars bündig am Seitenende.
 */
export function Speicherleiste({
  abbrechenHref,
  speichernLabel = "Speichern",
  hinweis,
}: {
  abbrechenHref: string;
  speichernLabel?: string;
  /** Kurzer Text links (z. B. „Pflichtfelder sind markiert"). */
  hinweis?: string;
}) {
  return (
    <div className="sticky bottom-0 z-sticky -mx-4 -mb-16 mt-10 flex items-center justify-end gap-2 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 print:hidden">
      {hinweis && <p className="mr-auto hidden text-13 text-foreground-secondary sm:block">{hinweis}</p>}
      <Button asChild variant="outline" size="sm">
        <Link href={abbrechenHref}>Abbrechen</Link>
      </Button>
      <SubmitButton size="sm">{speichernLabel}</SubmitButton>
    </div>
  );
}
