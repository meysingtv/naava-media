import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const WOCHENTAGE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function MiniKalender({ markierteTage }: { markierteTage: string[] }) {
  const heute = new Date();
  const jahr = heute.getFullYear();
  const monat = heute.getMonth();
  const heuteTag = heute.getDate();
  const offset = (new Date(jahr, monat, 1).getDay() + 6) % 7; // Montag = 0
  const tageImMonat = new Date(jahr, monat + 1, 0).getDate();
  const markiert = new Set(markierteTage);

  const monatLabel = new Date(jahr, monat, 1).toLocaleDateString("de-DE", {
    month: "long",
    year: "numeric",
  });
  const zellen: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: tageImMonat }, (_, i) => i + 1),
  ];

  return (
    <Card>
      <CardHeader className="p-5 pb-3">
        <CardTitle className="capitalize">{monatLabel}</CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
          {WOCHENTAGE.map((d) => (
            <div key={d} className="py-1 text-2xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              {d}
            </div>
          ))}
          {zellen.map((t, i) => {
            if (t === null) return <div key={`leer-${i}`} />;
            const iso = `${jahr}-${pad(monat + 1)}-${pad(t)}`;
            const istHeute = t === heuteTag;
            const hatTermin = markiert.has(iso);
            return (
              <div key={iso} className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full text-[13px] tabular-nums",
                    istHeute
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "text-foreground-secondary",
                  )}
                >
                  {t}
                </span>
                <span
                  className={cn(
                    "mt-0.5 h-1 w-1 rounded-full",
                    hatTermin && !istHeute ? "bg-accent-bright" : "bg-transparent",
                  )}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
