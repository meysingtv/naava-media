"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";

export interface Frage {
  thema: string;
  frage: string;
  antwort: string;
}

/** Häufige Fragen: nach Thema gruppiert, mit Suche über Frage und Antwort. */
export function Fragen({ fragen }: { fragen: Frage[] }) {
  const [suche, setSuche] = useState("");

  const gruppen = useMemo(() => {
    const q = suche.trim().toLowerCase();
    const treffer = q ? fragen.filter((f) => `${f.frage} ${f.antwort} ${f.thema}`.toLowerCase().includes(q)) : fragen;
    const map = new Map<string, Frage[]>();
    for (const f of treffer) map.set(f.thema, [...(map.get(f.thema) ?? []), f]);
    return Array.from(map.entries());
  }, [fragen, suche]);

  return (
    <Panel padding="none">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-[15px] font-semibold text-foreground">Häufige Fragen</h2>
        <div className="w-full sm:w-[280px]">
          <Input
            inputSize="sm"
            leadingIcon={Search}
            type="search"
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder="Frage suchen, z. B. Lastschrift"
            aria-label="Fragen durchsuchen"
          />
        </div>
      </div>

      {gruppen.length === 0 ? (
        <p className="px-5 py-10 text-center text-13 text-foreground-secondary">Dazu gibt es noch keine Antwort. Frag den Assistenten unten links.</p>
      ) : (
        gruppen.map(([thema, liste]) => (
          <section key={thema} aria-label={thema}>
            <h3 className="border-b border-border bg-surface-muted/60 px-5 py-1.5 text-xs font-semibold text-foreground-secondary">{thema}</h3>
            <ul className="divide-y divide-border border-b border-border last:border-b-0">
              {liste.map((f) => (
                <li key={f.frage}>
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-3.5 text-13 font-medium text-foreground transition-colors hover:bg-surface-muted/50 [&::-webkit-details-marker]:hidden">
                      {f.frage}
                      <ChevronDown
                        className="h-4 w-4 shrink-0 text-foreground-tertiary transition-transform duration-fast group-open:rotate-180"
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                    </summary>
                    <p className="px-5 pb-4 text-13 leading-6 text-foreground-secondary">{f.antwort}</p>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </Panel>
  );
}
