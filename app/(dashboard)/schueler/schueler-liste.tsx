"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, GraduationCap, Mail, Phone, Search, Users } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SchuelerAvatar } from "@/components/shared/schueler-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDatum } from "@/lib/utils";
import type { Fahrschueler } from "@/lib/types";

type StatusFilter = "alle" | "theorie_offen" | "theorie_bestanden" | "pruefung_geplant";

export function SchuelerListe({ schueler }: { schueler: Fahrschueler[] }) {
  const [suche, setSuche] = useState("");
  const [klasse, setKlasse] = useState("alle");
  const [status, setStatus] = useState<StatusFilter>("alle");

  const verfuegbareKlassen = useMemo(() => {
    const set = new Set<string>();
    schueler.forEach((s) => s.fuehrerscheinklassen?.forEach((k) => set.add(k)));
    return Array.from(set).sort();
  }, [schueler]);

  const heute = new Date().toISOString().slice(0, 10);

  const gefiltert = useMemo(() => {
    const begriff = suche.trim().toLowerCase();
    return schueler.filter((s) => {
      if (begriff) {
        const name = `${s.vorname} ${s.nachname}`.toLowerCase();
        if (!name.includes(begriff)) return false;
      }
      if (klasse !== "alle" && !s.fuehrerscheinklassen?.includes(klasse)) return false;
      if (status === "theorie_bestanden" && !s.theorie_bestanden) return false;
      if (status === "theorie_offen" && s.theorie_bestanden) return false;
      if (status === "pruefung_geplant" && !(s.pruefung_termin && s.pruefung_termin >= heute)) {
        return false;
      }
      return true;
    });
  }, [schueler, suche, klasse, status, heute]);

  if (schueler.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Noch keine Schüler"
        description="Lege deinen ersten Fahrschüler an, um Fortschritt, Fahrstunden und Rechnungen zu verwalten."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder="Schüler suchen …"
            className="pl-9"
          />
        </div>
        <Select value={klasse} onValueChange={setKlasse}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Klasse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Klassen</SelectItem>
            {verfuegbareKlassen.map((k) => (
              <SelectItem key={k} value={k}>
                Klasse {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alle">Alle Status</SelectItem>
            <SelectItem value="theorie_offen">Theorie offen</SelectItem>
            <SelectItem value="theorie_bestanden">Theorie bestanden</SelectItem>
            <SelectItem value="pruefung_geplant">Prüfung geplant</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {gefiltert.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Keine Treffer"
          description="Für die gewählten Filter wurden keine Schüler gefunden."
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {gefiltert.map((s) => (
            <Link key={s.id} href={`/schueler/${s.id}`}>
              <Card className="group flex items-center gap-3 p-4 transition-shadow hover:shadow-md">
                <SchuelerAvatar
                  vorname={s.vorname}
                  nachname={s.nachname}
                  farbe={s.avatar_farbe}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {s.vorname} {s.nachname}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {s.fuehrerscheinklassen?.length ? (
                      s.fuehrerscheinklassen.map((k) => (
                        <Badge key={k} variant="secondary" className="px-1.5 py-0 text-[11px]">
                          {k}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Keine Klasse</span>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                    {s.telefon && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {s.telefon}
                      </span>
                    )}
                    {s.email && (
                      <span className="inline-flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{s.email}</span>
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {s.theorie_bestanden ? (
                      <Badge variant="success" className="text-[11px]">
                        Theorie bestanden
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[11px] text-amber-700">
                        Theorie offen
                      </Badge>
                    )}
                    {s.pruefung_termin && s.pruefung_termin >= heute && (
                      <Badge
                        variant="outline"
                        className="border-primary/20 bg-primary/5 text-[11px] text-primary"
                      >
                        <GraduationCap className="mr-1 h-3 w-3" />
                        Prüfung {formatDatum(s.pruefung_termin)}
                      </Badge>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
