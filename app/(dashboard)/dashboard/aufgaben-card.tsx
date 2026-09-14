import Link from "next/link";
import { ArrowRight, ListChecks } from "lucide-react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatDatum } from "@/lib/utils";

export interface TempAufgabe {
  titel: string;
  faellig: string | null;
  kunde: string | null;
  prioritaet: "niedrig" | "mittel" | "hoch";
}

const PRIO: Record<string, { label: string; dot: string }> = {
  niedrig: { label: "Niedrig", dot: "bg-border-strong" },
  mittel: { label: "Mittel", dot: "bg-warning" },
  hoch: { label: "Hoch", dot: "bg-destructive" },
};

export function AufgabenCard({ aufgaben }: { aufgaben: TempAufgabe[] }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between space-y-0 p-5 pb-3">
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} /> Aufgaben
        </CardTitle>
        <Link
          href="/aufgaben"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary-hover"
        >
          Alle ansehen <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      {aufgaben.length === 0 ? (
        <p className="border-t px-5 py-10 text-center text-sm text-muted-foreground">
          Keine offenen Aufgaben. 🎉
        </p>
      ) : (
      <div className="max-h-[420px] overflow-y-auto border-t scrollbar-thin">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-surface">
              <TableHead className="pl-5">Fällig</TableHead>
              <TableHead>Titel</TableHead>
              <TableHead className="hidden md:table-cell">Kunde</TableHead>
              <TableHead>Priorität</TableHead>
              <TableHead className="pr-5">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aufgaben.map((a, i) => {
              const prio = PRIO[a.prioritaet] ?? PRIO.mittel;
              return (
                <TableRow key={i}>
                  <TableCell className="whitespace-nowrap pl-5 text-muted-foreground">
                    {a.faellig ? formatDatum(a.faellig) : "—"}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{a.titel}</TableCell>
                  <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">
                    {a.kunde ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-foreground-secondary">
                      <span className={cn("h-2 w-2 rounded-full", prio.dot)} />
                      {prio.label}
                    </span>
                  </TableCell>
                  <TableCell className="pr-5">
                    <Badge variant="warning">Offen</Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      )}
    </Card>
  );
}
