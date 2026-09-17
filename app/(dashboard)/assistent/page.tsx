import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { AssistentChat } from "./assistent-chat";

export const metadata = { title: "Assistent · FahrschulApp" };

export default function AssistentPage() {
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Übersicht" title="Assistent" description="Steuere die Fahrschule per Chat – planen, nachfragen, abrechnen.">
        <Badge>KI · Beta</Badge>
      </PageHeader>
      <AssistentChat />
    </div>
  );
}
