import { Wrench } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";

/** Platzhalter für Bereiche, die noch in Entwicklung sind. */
export function InEntwicklung({ title, beschreibung }: { title: string; beschreibung?: string }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={beschreibung ?? "Dieser Bereich kommt in Kürze."} />
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Wrench className="h-7 w-7" />
          </span>
          <p className="text-base font-semibold">In Entwicklung</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Dieser Bereich ist bald verfügbar – wir arbeiten daran. 🚧
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
