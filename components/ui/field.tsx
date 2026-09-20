import * as React from "react";
import { AlertCircle } from "lucide-react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface FieldProps {
  label: string;
  htmlFor?: string;
  /** Hilfetext unter dem Feld. */
  hint?: string;
  /** Ersetzt den Hilfetext und markiert das Feld als fehlerhaft. */
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactElement;
}

/**
 * Standardgerüst für jedes Formularfeld v3: Label ÜBER dem Feld, Hilfetext
 * und Fehler DARUNTER. `aria-invalid` und `aria-describedby` werden auf das
 * Kind verdrahtet – nie ein Platzhalter als Label.
 */
export function Field({ label, htmlFor, hint, error, required, className, children }: FieldProps) {
  const autoId = React.useId();
  const id = htmlFor ?? (children.props as { id?: string }).id ?? autoId;
  const beschreibungsId = error ? `${id}-fehler` : hint ? `${id}-hinweis` : undefined;

  const kind = React.cloneElement(children, {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": beschreibungsId,
  } as Record<string, unknown>);

  return (
    <div className={cn("min-w-0", className)}>
      <Label htmlFor={id} required={required} className="mb-1.5">
        {label}
      </Label>
      {kind}
      {error ? (
        <p id={beschreibungsId} role="alert" className="mt-1.5 flex items-center gap-1 text-xs text-destructive-text">
          <AlertCircle className="h-3 w-3 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={beschreibungsId} className="mt-1.5 text-xs text-foreground-tertiary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
