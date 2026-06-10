import Link from "next/link";
import { UserPlus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { SchuelerListe } from "./schueler-liste";
import type { Fahrschueler } from "@/lib/types";

export const metadata = { title: "Schüler · FahrschulApp" };

export default async function SchuelerPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("fahrschueler")
    .select("*")
    .order("nachname", { ascending: true })
    .order("vorname", { ascending: true });

  const schueler = (data ?? []) as Fahrschueler[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schüler"
        description={`${schueler.length} ${schueler.length === 1 ? "Schüler" : "Schüler"} insgesamt`}
      >
        <Button asChild variant="outline">
          <Link href="/schueler/neu">
            <UserPlus /> Neuer Schüler
          </Link>
        </Button>
      </PageHeader>

      <SchuelerListe schueler={schueler} />
    </div>
  );
}
