import { Wrench } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

/** Platzhalter für Bereiche, die noch in Entwicklung sind. */
export function InEntwicklung({ title, beschreibung }: { title: string; beschreibung?: string }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={beschreibung ?? "Dieser Bereich kommt in Kürze."} />
      <EmptyState
        icon={Wrench}
        title="In Entwicklung"
        description="Dieser Bereich ist bald verfügbar – wir arbeiten daran."
        className="py-24"
      />
    </div>
  );
}
