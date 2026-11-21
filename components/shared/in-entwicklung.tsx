import { Wrench } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

/** Platzhalter für Bereiche, die noch in Entwicklung sind. */
export function InEntwicklung({ title, beschreibung }: { title: string; beschreibung?: string }) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState
        variant="panel"
        icon={Wrench}
        title="In Entwicklung"
        description={beschreibung ?? "Dieser Bereich ist bald verfügbar."}
      />
    </>
  );
}
