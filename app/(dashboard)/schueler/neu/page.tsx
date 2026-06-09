import { PageHeader } from "@/components/shared/page-header";
import { SchuelerForm } from "../schueler-form";

export const metadata = { title: "Neuer Schüler · FahrschulApp" };

export default function NeuerSchuelerPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Neuer Schüler" description="Lege einen neuen Fahrschüler an." />
      <SchuelerForm />
    </div>
  );
}
