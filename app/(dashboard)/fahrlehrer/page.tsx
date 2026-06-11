import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, ShieldCheck, UserCog } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Benutzerrolle, Fahrlehrer } from "@/lib/types";
import { BenutzerListe } from "./benutzer-liste";
import { BenutzerAkte } from "./benutzer-akte";

export const metadata = { title: "Benutzer · FahrschulApp" };

export default async function BenutzerPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const kontext = await getKontext();
  if (kontext?.fahrlehrer?.rolle !== "chef") {
    redirect("/dashboard");
  }

  const supabase = createClient();
  const [benutzerRes, rollenRes] = await Promise.all([
    supabase
      .from("fahrlehrer")
      .select("*")
      .order("nachname", { ascending: true })
      .order("vorname", { ascending: true }),
    supabase.from("benutzerrolle").select("id, name"),
  ]);

  const benutzer = (benutzerRes.data ?? []) as Fahrlehrer[];

  // Karte: eigene-Rollen-ID → Anzeigename (für die Rollen-Spalte).
  const rollenMap: Record<string, string> = {};
  for (const r of (rollenRes.data ?? []) as Pick<Benutzerrolle, "id" | "name">[]) {
    rollenMap[r.id] = r.name;
  }

  const selectedId = searchParams.id;
  const selected = selectedId ? benutzer.find((b) => b.id === selectedId) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader title="Benutzer" description="Dein Team und die Rollen.">
        <Button asChild variant="outline" size="sm">
          <Link href="/fahrlehrer/rollen">
            <ShieldCheck className="h-4 w-4" /> Rollen verwalten
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/fahrlehrer/neu">
            <Plus className="h-4 w-4" /> Neuer Benutzer
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className={cn(selected && "hidden lg:block")}>
          <BenutzerListe benutzer={benutzer} selectedId={selectedId} selfUserId={kontext.userId} rollenMap={rollenMap} />
        </div>

        <div className={cn(!selected && "hidden lg:block")}>
          {selected ? (
            <BenutzerAkte benutzer={selected} selfUserId={kontext.userId} rollenMap={rollenMap} />
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 py-24 text-center text-muted-foreground">
                <UserCog className="h-8 w-8" />
                <p className="text-sm">Wähle links einen Benutzer aus.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
