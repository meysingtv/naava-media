import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function FormMessage({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null;
  const istFehler = Boolean(error);
  return (
    <div
      role={istFehler ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm",
        istFehler
          ? "border-destructive/25 bg-destructive-soft text-destructive"
          : "border-success/25 bg-success-soft text-success",
      )}
    >
      {istFehler ? (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span>{error ?? message}</span>
    </div>
  );
}
