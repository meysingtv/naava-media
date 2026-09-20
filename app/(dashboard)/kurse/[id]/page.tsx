import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Plus, UserMinus, Users } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/shared/page-header";
import { SchuelerAvatar } from "@/components/shared/schueler-avatar";
import { LoeschenDialog } from "@/components/shared/loeschen-dialog";
import { THEORIE_GRUNDSTOFF } from "@/lib/constants";
import { formatDatum } from "@/lib/utils";
import type { Fahrschueler, Kurs, Theoriestunde } from "@/lib/types";
import { kursLoeschen, kursStatusSetzen, teilnehmerEntfernen, teilnehmerHinzufuegen } from "../actions";

export const metadata = { title: "Kurs · FahrschulApp" };

const feld =
  "h-9 rounded-md border border-border-strong bg-background px-3 text-sm shadow-xs focus-visible:border-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20";

type TeilnahmeRow = {
  id: string;
  schueler_id: string;
  fahrschueler: Pick<Fahrschueler, "id" | "vorname" | "nachname" | "avatar_farbe"> | null;
};

export default async function KursDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: kursData } = await supabase.from("kurs").select("*").eq("id", params.id).maybeSingle();
  if (!kursData) notFound();
  const kurs = kursData as Kurs;

  const [teilnahmeRes, alleRes, stundenRes] = await Promise.all([
    supabase
      .from("kurs_teilnahme")
      .select("id, schueler_id, fahrschueler(id, vorname, nachname, avatar_farbe)")
      .eq("kurs_id", kurs.id)
      .returns<TeilnahmeRow[]>(),
    supabase
      .from("fahrschueler")
      .select("id, vorname, nachname")
      .order("nachname")
      .returns<Pick<Fahrschueler, "id" | "vorname" | "nachname">[]>(),
    supabase
      .from("theoriestunde")
      .select("id, datum, uhrzeit, thema")
      .eq("kurs_id", kurs.id)
      .order("datum", { ascending: true })
      .returns<Pick<Theoriestunde, "id" | "datum" | "uhrzeit" | "thema">[]>(),
  ]);

  const teilnahmen = teilnahmeRes.data ?? [];
  const eingeschrieben = new Set(teilnahmen.map((t) => t.schueler_id));
  const verfuegbar = (alleRes.data ?? []).filter((s) => !eingeschrieben.has(s.id));
  const stunden = stundenRes.data ?? [];
  const grundstoffProzent = Math.min(100, Math.round((stunden.length / THEORIE_GRUNDSTOFF) * 100));

  return (
    <div className="space-y-6">
      <Link
        href="/kurse"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Alle Kurse
      </Link>

      <PageHeader title={kurs.name} description={kurs.klasse ? `Klasse ${kurs.klasse}` : "Theoriekurs"}>
        <form action={kursStatusSetzen}>
          <input type="hidden" name="id" value={kurs.id} />
          <select name="status" defaultValue={kurs.status} className={feld}>
            <option value="geplant">Geplant</option>
            <option value="laufend">Laufend</option>
            <option value="beendet">Beendet</option>
          </select>
          <button type="submit" className="ml-2 rounded-md border border-border-strong px-3 py-1.5 text-sm font-medium transition-colors hover:bg-surface">
            Status speichern
          </button>
        </form>
        <LoeschenDialog
          action={kursLoeschen}
          id={kurs.id}
          titel="Kurs löschen?"
          beschreibung="Der Kurs und die Teilnehmer-Zuordnungen werden entfernt."
          buttonLabel=""
        />
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Teilnehmer */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 p-5 pb-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} /> Teilnehmer
              <Badge variant="secondary">{teilnahmen.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-0">
            {verfuegbar.length > 0 && (
              <form action={teilnehmerHinzufuegen} className="flex gap-2">
                <input type="hidden" name="kurs_id" value={kurs.id} />
                <select name="schueler_id" defaultValue="" className={`${feld} min-w-0 flex-1`} required>
                  <option value="" disabled>
                    Schüler wählen …
                  </option>
                  {verfuegbar.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.vorname} {s.nachname}
                    </option>
                  ))}
                </select>
                <Button type="submit" size="sm">
                  <Plus /> Hinzufügen
                </Button>
              </form>
            )}

            {teilnahmen.length === 0 ? (
              <p className="rounded-md bg-surface-muted/60 py-6 text-center text-sm text-muted-foreground">
                Noch keine Teilnehmer.
              </p>
            ) : (
              <div className="divide-y rounded-md border">
                {teilnahmen.map((t) => (
                  <div key={t.id} className="flex items-center gap-2.5 px-3 py-2">
                    <SchuelerAvatar
                      vorname={t.fahrschueler?.vorname}
                      nachname={t.fahrschueler?.nachname}
                      farbe={t.fahrschueler?.avatar_farbe}
                      className="h-8 w-8 text-xs"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {t.fahrschueler?.vorname} {t.fahrschueler?.nachname}
                    </span>
                    <form action={teilnehmerEntfernen}>
                      <input type="hidden" name="id" value={t.id} />
                      <input type="hidden" name="kurs_id" value={kurs.id} />
                      <button
                        type="submit"
                        aria-label="Entfernen"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Theorie-Einheiten */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 p-5 pb-3">
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} /> Theorie-Einheiten
            </CardTitle>
            <Button asChild variant="outline" size="sm">
              <Link href="/theorie">Theorie planen</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 p-5 pt-0">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Grundstoff</span>
                <span className="text-muted-foreground">
                  {stunden.length} / {THEORIE_GRUNDSTOFF}
                </span>
              </div>
              <Progress value={grundstoffProzent} indicatorClassName={stunden.length >= THEORIE_GRUNDSTOFF ? "bg-success" : undefined} />
            </div>
            {stunden.length === 0 ? (
              <p className="rounded-md bg-surface-muted/60 py-6 text-center text-sm text-muted-foreground">
                Noch keine Theorie-Einheiten diesem Kurs zugeordnet.
              </p>
            ) : (
              <div className="divide-y rounded-md border">
                {stunden.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>{s.thema || "Theorieeinheit"}</span>
                    <span className="text-muted-foreground">{formatDatum(s.datum)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
