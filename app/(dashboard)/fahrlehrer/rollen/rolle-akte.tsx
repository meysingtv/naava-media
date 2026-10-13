import Link from "next/link";
import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eigenschaft, Eigenschaften } from "@/components/ui/eigenschaften";
import { LoeschenDialog } from "@/components/shared/loeschen-dialog";
import { SchuelerAvatar } from "@/components/shared/schueler-avatar";
import { bereicheFuer } from "@/components/shared/bereiche";
import { SIDEBAR_BEREICHE } from "@/lib/constants";
import type { Benutzerrolle, Fahrlehrer, FahrlehrerRolle, RolleRecht } from "@/lib/types";
import { rolleLoeschen } from "../rollen-actions";
import type { RolleEintrag } from "./rollen-liste";

function Abschnitt({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border px-5 py-4">
      <h3 className="mb-2 text-13 font-semibold text-foreground">{titel}</h3>
      {children}
    </section>
  );
}

function rechtText(r?: RolleRecht): { text: string; ton: "default" | "secondary" | "outline" } {
  if (r?.bearbeiten) return { text: "Bearbeiten", ton: "default" };
  if (r?.ansehen) return { text: "Ansehen", ton: "secondary" };
  return { text: "Kein Zugriff", ton: "outline" };
}

/** Rolle im Überblick: Beschreibung, Zugang, Bereiche und wer sie hat. */
export function RolleAkte({
  eintrag,
  rolle,
  mitglieder,
}: {
  eintrag: RolleEintrag;
  rolle?: Benutzerrolle;
  mitglieder: Fahrlehrer[];
}) {
  const sidebar = (rolle?.rechte?.sidebar ?? {}) as Record<string, RolleRecht>;

  return (
    <section className="overflow-hidden rounded-xl bg-card shadow-panel">
      <header className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-[15px] font-semibold text-foreground">{eintrag.name}</h2>
            {eintrag.system && <Badge variant="secondary">Standard</Badge>}
          </div>
          <p className="mt-0.5 text-13 text-foreground-secondary">{eintrag.beschreibung || "Ohne Beschreibung"}</p>
        </div>
        {!eintrag.system && eintrag.id && (
          <div className="flex items-center gap-2">
            <LoeschenDialog
              action={rolleLoeschen}
              id={eintrag.id}
              titel="Rolle löschen?"
              beschreibung={`Die Rolle „${eintrag.name}“ wird gelöscht. Mitarbeiter mit dieser Rolle behalten ihre Grundrolle.`}
              buttonLabel=""
            />
            <Button asChild size="sm">
              <Link href={`/fahrlehrer/rollen?rolle=${eintrag.key}&edit=1`}>
                <Pencil /> Bearbeiten
              </Link>
            </Button>
          </div>
        )}
      </header>

      <Abschnitt titel="Zugang">
        <Eigenschaften breite="schmal">
          <Eigenschaft label="Zugangsart">{eintrag.zugangsart}</Eigenschaft>
          <Eigenschaft label="Anmeldung">{eintrag.web_zugang ? "Browser und App" : "Nur App"}</Eigenschaft>
        </Eigenschaften>
      </Abschnitt>

      <Abschnitt titel="Bereiche">
        {eintrag.system ? (
          <ul className="flex flex-wrap gap-1.5">
            {bereicheFuer(eintrag.key as FahrlehrerRolle).map((b) => (
              <li key={b.key}>
                <Badge variant="secondary">{b.label}</Badge>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="divide-y divide-border">
            {SIDEBAR_BEREICHE.map((b) => {
              const r = rechtText(sidebar[b.key]);
              return (
                <li key={b.key} className="flex items-center justify-between gap-3 py-2 text-13">
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground">{b.label}</span>
                    <span className="block truncate text-xs text-foreground-secondary">{b.beschreibung}</span>
                  </span>
                  <Badge variant={r.ton}>{r.text}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </Abschnitt>

      <Abschnitt titel={`Mitarbeiter (${mitglieder.length})`}>
        {mitglieder.length === 0 ? (
          <p className="text-13 text-foreground-secondary">Noch niemand hat diese Rolle.</p>
        ) : (
          <ul className="space-y-2">
            {mitglieder.map((b) => (
              <li key={b.id}>
                <Link href={`/fahrlehrer/${b.id}`} className="flex items-center gap-2.5 text-13 text-foreground hover:underline">
                  <SchuelerAvatar vorname={b.vorname} nachname={b.nachname} className="h-6 w-6 text-2xs" />
                  {b.vorname} {b.nachname}
                  {!b.aktiv && <span className="text-xs text-foreground-tertiary">archiviert</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Abschnitt>
    </section>
  );
}
