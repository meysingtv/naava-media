import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Users } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { LoeschenDialog } from "@/components/shared/loeschen-dialog";
import { formatDatum, formatUhrzeit } from "@/lib/utils";
import type { Theoriestunde } from "@/lib/types";
import { AnwesenheitForm, type AnwesenheitSchueler } from "./anwesenheit-form";
import { theoriestundeLoeschenRedirect } from "../actions";

export const metadata = { title: "Theoriestunde · FahrschulApp" };

export default async function TheoriestundeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: stunde } = await supabase
    .from("theoriestunde")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!stunde) {
    notFound();
  }
  const t = stunde as Theoriestunde;

  const [schuelerRes, teilnahmeRes] = await Promise.all([
    supabase
      .from("fahrschueler")
      .select("id, vorname, nachname, avatar_farbe")
      .order("nachname", { ascending: true })
      .order("vorname", { ascending: true }),
    supabase
      .from("theorie_teilnahme")
      .select("schueler_id, anwesend")
      .eq("theoriestunde_id", t.id),
  ]);

  const schueler = (schuelerRes.data ?? []) as AnwesenheitSchueler[];
  const present = (teilnahmeRes.data ?? [])
    .filter((x) => x.anwesend)
    .map((x) => x.schueler_id as string);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground">
        <Link href="/theorie">
          <ArrowLeft className="h-4 w-4" /> Zurück zur Übersicht
        </Link>
      </Button>

      <PageHeader
        title={formatDatum(t.datum)}
        description={`${formatUhrzeit(t.uhrzeit)} Uhr${t.thema ? ` · ${t.thema}` : ""}`}
      >
        <LoeschenDialog
          action={theoriestundeLoeschenRedirect}
          id={t.id}
          titel="Theoriestunde löschen?"
          beschreibung="Der Termin und die erfasste Anwesenheit werden dauerhaft entfernt."
        />
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        {t.thema && (
          <Badge variant="secondary" className="gap-1">
            <BookOpen className="h-3 w-3" /> {t.thema}
          </Badge>
        )}
        <Badge variant="outline" className="gap-1">
          <Users className="h-3 w-3" /> {present.length}
          {t.max_teilnehmer ? ` / ${t.max_teilnehmer}` : ""} anwesend
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Anwesenheit</CardTitle>
        </CardHeader>
        <CardContent>
          <AnwesenheitForm
            theoriestundeId={t.id}
            schueler={schueler}
            initialPresent={present}
          />
        </CardContent>
      </Card>
    </div>
  );
}
