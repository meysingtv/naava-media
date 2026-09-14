import { CheckCircle2, GraduationCap } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { pflichtFahrtenFuer } from "@/lib/constants";
import { cn, formatDatum } from "@/lib/utils";
import type { Fahrstunde, Pruefung } from "@/lib/types";
import { getSchuelerKontext } from "../kontext";
import { PortalShell } from "../portal-shell";

export const metadata = { title: "Mein Fortschritt" };

function Balken({ label, ist, soll }: { label: string; ist: number; soll: number }) {
  const prozent = soll > 0 ? Math.min(100, Math.round((ist / soll) * 100)) : 100;
  const fertig = ist >= soll;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className={fertig ? "font-semibold text-success" : "text-muted-foreground"}>
          {ist} / {soll}
        </span>
      </div>
      <Progress value={prozent} indicatorClassName={fertig ? "bg-success" : undefined} />
    </div>
  );
}

export default async function PortalFortschrittPage() {
  const { schueler, schule } = await getSchuelerKontext();
  const schuleName = schule?.name ?? "Fahrschule";

  if (!schueler) {
    return (
      <PortalShell schuleName={schuleName}>
        <p className="text-sm text-muted-foreground">Kein Zugang.</p>
      </PortalShell>
    );
  }

  const supabase = createClient();
  const [stundenRes, pruefungRes] = await Promise.all([
    supabase.from("fahrstunde").select("typ, status").returns<Pick<Fahrstunde, "typ" | "status">[]>(),
    supabase
      .from("pruefung")
      .select("art, datum, ergebnis, versuch")
      .order("datum", { ascending: false })
      .returns<Pick<Pruefung, "art" | "datum" | "ergebnis" | "versuch">[]>(),
  ]);

  const stunden = (stundenRes.data ?? []).filter((f) => f.status === "abgeschlossen");
  const pruefungen = pruefungRes.data ?? [];
  const klasse = schueler.fuehrerscheinklassen?.[0] ?? "B";
  const pflicht = pflichtFahrtenFuer(klasse);
  const zaehle = (typ: Fahrstunde["typ"]) => stunden.filter((f) => f.typ === typ).length;

  return (
    <PortalShell schuleName={schuleName}>
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Mein Fortschritt</h1>

      <div className="space-y-4">
        {/* Theorie */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Theorie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            <div className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm">
              <span className="font-medium">Theorieprüfung</span>
              {schueler.theorie_bestanden ? (
                <Badge variant="success">
                  <CheckCircle2 className="h-3 w-3" /> bestanden
                </Badge>
              ) : (
                <Badge variant="warning">offen</Badge>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">Lernstand (App)</span>
                <span className="text-muted-foreground">{schueler.lernstatus ?? 0}%</span>
              </div>
              <Progress value={schueler.lernstatus ?? 0} />
            </div>
          </CardContent>
        </Card>

        {/* Praxis / Sonderfahrten */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm">Praxis · Klasse {klasse}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0">
            <Balken label="Überlandfahrten" ist={zaehle("ueberland")} soll={pflicht.ueberland} />
            <Balken label="Autobahnfahrten" ist={zaehle("autobahn")} soll={pflicht.autobahn} />
            <Balken label="Nachtfahrten" ist={zaehle("nacht")} soll={pflicht.nacht} />
            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">Übungsstunden gesamt</span>
              <span className="font-semibold tabular-nums">{stunden.length}</span>
            </div>
          </CardContent>
        </Card>

        {/* Prüfungen */}
        {pruefungen.length > 0 && (
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm">Prüfungen</CardTitle>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {pruefungen.map((p, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span>
                    <span className="font-medium">{p.art === "praxis" ? "Praktisch" : "Theorie"}</span>
                    <span className="text-muted-foreground"> · {formatDatum(p.datum)}</span>
                  </span>
                  <Badge
                    variant={
                      p.ergebnis === "bestanden" ? "success" : p.ergebnis === "nicht_bestanden" ? "destructive" : "warning"
                    }
                  >
                    {p.ergebnis === "bestanden" ? "bestanden" : p.ergebnis === "nicht_bestanden" ? "nicht best." : "offen"}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
          <GraduationCap className={cn("h-5 w-5 text-primary")} strokeWidth={1.75} />
          Weiter so – du schaffst das! 💪
        </div>
      </div>
    </PortalShell>
  );
}
