import { Car } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { cn, initialen } from "@/lib/utils";
import type { Fahrlehrer, Fahrzeug } from "@/lib/types";
import { FahrzeugListe } from "./fahrzeug-liste";
import { FahrzeugAkte } from "./fahrzeug-akte";
import { FahrzeugForm } from "./fahrzeug-form";

export const metadata = { title: "Fahrzeuge · FahrschulApp" };

export interface FahrlehrerOption {
  id: string;
  kuerzel: string;
  name: string;
}

export default async function FahrzeugePage({
  searchParams,
}: {
  searchParams: { id?: string; edit?: string; neu?: string };
}) {
  const supabase = createClient();

  const [fahrzeugRes, lehrerRes] = await Promise.all([
    supabase.from("fahrzeug").select("*").order("name", { ascending: true }),
    supabase
      .from("fahrlehrer")
      .select("id, vorname, nachname")
      .eq("aktiv", true)
      .order("nachname")
      .returns<Pick<Fahrlehrer, "id" | "vorname" | "nachname">[]>(),
  ]);

  const fahrzeuge = (fahrzeugRes.data ?? []) as Fahrzeug[];

  const fahrlehrerMap: Record<string, string> = {};
  const options: FahrlehrerOption[] = (lehrerRes.data ?? []).map((f) => {
    const kuerzel = initialen(f.vorname, f.nachname);
    fahrlehrerMap[f.id] = kuerzel;
    return { id: f.id, kuerzel, name: `${f.vorname} ${f.nachname}` };
  });

  const neu = searchParams.neu === "1";
  const edit = searchParams.edit === "1";
  const selectedId = searchParams.id;
  const selected = selectedId ? fahrzeuge.find((f) => f.id === selectedId) : undefined;
  const panelAktiv = neu || (selected && edit) || selected;

  return (
    <div className="space-y-6">
      <PageHeader title="Fahrzeuge" description="Die Flotte deiner Fahrschule." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        {/* Liste */}
        <div className={cn(panelAktiv && "hidden lg:block")}>
          <FahrzeugListe
            fahrzeuge={fahrzeuge}
            selectedId={selectedId}
            fahrlehrerMap={fahrlehrerMap}
          />
        </div>

        {/* Detail / Bearbeiten / Neu */}
        <div className={cn(!panelAktiv && "hidden lg:block")}>
          {neu ? (
            <FahrzeugForm options={options} />
          ) : selected && edit ? (
            <FahrzeugForm fahrzeug={selected} options={options} />
          ) : selected ? (
            <FahrzeugAkte fahrzeug={selected} fahrlehrerMap={fahrlehrerMap} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 py-24 text-center text-muted-foreground">
                <Car className="h-8 w-8" />
                <p className="text-sm">Wähle links ein Fahrzeug oder lege ein neues an.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
