import { ListChecks } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatDatum } from "@/lib/utils";

export interface TempAufgabe {
  titel: string;
  faellig: string | null;
  kunde: string | null;
  prioritaet: "niedrig" | "mittel" | "hoch";
}

const PRIO: Record<string, { label: string; dot: string }> = {
  niedrig: { label: "Niedrig", dot: "bg-slate-300" },
  mittel: { label: "Mittel", dot: "bg-slate-500" },
  hoch: { label: "Hoch", dot: "bg-slate-800" },
};

export function AufgabenCard({ aufgaben }: { aufgaben: TempAufgabe[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between p-4 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="h-4 w-4 text-muted-foreground" /> Aufgaben
        </CardTitle>
        <span className="text-xs text-muted-foreground">Zuweisung folgt</span>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b bg-muted/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Fällig</th>
                <th className="px-4 py-2 font-medium">Titel</th>
                <th className="hidden px-4 py-2 font-medium md:table-cell">Kunde</th>
                <th className="px-4 py-2 font-medium">Priorität</th>
                <th className="px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {aufgaben.map((a, i) => {
                const prio = PRIO[a.prioritaet] ?? PRIO.mittel;
                return (
                  <tr key={i} className="transition-colors hover:bg-muted/40">
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                      {a.faellig ? formatDatum(a.faellig) : "—"}
                    </td>
                    <td className="px-4 py-2.5 font-medium">{a.titel}</td>
                    <td className="hidden whitespace-nowrap px-4 py-2.5 text-muted-foreground md:table-cell">
                      {a.kunde ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className={cn("h-2 w-2 rounded-full", prio.dot)} />
                        {prio.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                        Offen
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
