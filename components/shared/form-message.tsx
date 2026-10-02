import { AlertCircle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

/** Formular-Rückmeldung v3: Soft-Fläche, lesbare `*-text`-Stufe, kein Rahmen. */
export function FormMessage({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null;
  const istFehler = Boolean(error);
  return (
    <div
      role={istFehler ? "alert" : "status"}
      className={cn(
        "flex gap-2.5 rounded-md px-3 py-2.5 text-13",
        istFehler ? "bg-destructive-soft text-destructive-text" : "bg-success-soft text-success-text",
      )}
    >
      {istFehler ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      )}
      <span>{error ?? message}</span>
    </div>
  );
}
