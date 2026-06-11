import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Globe, Plus, Shield, ShieldCheck, Smartphone } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Benutzerrolle } from "@/lib/types";
import { RolleEditor } from "./rolle-editor";

export const metadata = { title: "Rollen & Berechtigungen · FahrschulApp" };

export default async function RollenPage({
  searchParams,
}: {
  searchParams: { rolle?: string; neu?: string };
}) {
  const kontext = await getKontext();
  if (kontext?.fahrlehrer?.rolle !== "chef") {
    redirect("/dashboard");
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("benutzerrolle")
    .select("*")
    .order("created_at", { ascending: true });

  const rollen = (data ?? []) as Benutzerrolle[];

  const neu = searchParams.neu === "1";
  const selectedId = searchParams.rolle;
  const selected = selectedId ? rollen.find((r) => r.id === selectedId) : undefined;
  const panel = neu || Boolean(selected);

  return (
    <div className="pb-16">
      {/* Kopfleiste mit Aktionen oben rechts */}
      <div className="sticky top-0 z-20 -mx-4 mb-6 border-b bg-background/80 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/fahrlehrer"
              aria-label="Zurück zu Benutzer"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight">Rollen & Berechtigungen</h1>
              <p className="truncate text-xs text-muted-foreground">
                Lege Rollen an und steuere, wer was sehen und bearbeiten darf.
              </p>
            </div>
          </div>
          <Button asChild size="sm">
            <Link href="/fahrlehrer/rollen?neu=1">
              <Plus className="h-4 w-4" /> Neue Rolle
            </Link>
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          {/* Rollen-Liste */}
          <div className={cn(panel && "hidden lg:block")}>
            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="border-b px-5 py-3.5">
                <h2 className="text-sm font-semibold">Rollen</h2>
                <p className="text-xs text-muted-foreground">{rollen.length} angelegt</p>
              </div>

              {rollen.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Shield className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">Noch keine Rollen</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Lege z. B. Büro oder Fahrlehrer mit eigenen Rechten an.
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/fahrlehrer/rollen?neu=1">
                      <Plus className="h-4 w-4" /> Erste Rolle anlegen
                    </Link>
                  </Button>
                </div>
              ) : (
                <ul className="divide-y">
                  {rollen.map((r) => {
                    const aktiv = r.id === selectedId;
                    return (
                      <li key={r.id}>
                        <Link
                          href={`/fahrlehrer/rollen?rolle=${r.id}`}
                          className={cn(
                            "flex items-center gap-3 px-5 py-3.5 transition-colors",
                            aktiv ? "bg-primary/5" : "hover:bg-muted/50",
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                              aktiv ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                            )}
                          >
                            <ShieldCheck className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{r.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {r.beschreibung || "Keine Beschreibung"}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            {r.zugangsart && (
                              <Badge variant="secondary" className="font-normal">
                                {r.zugangsart}
                              </Badge>
                            )}
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              {r.web_zugang ? (
                                <>
                                  <Globe className="h-3 w-3" /> Web + Mobile
                                </>
                              ) : (
                                <>
                                  <Smartphone className="h-3 w-3" /> Nur Mobile
                                </>
                              )}
                            </span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Editor / Platzhalter */}
          <div className={cn(!panel && "hidden lg:block")}>
            {panel ? (
              <RolleEditor key={selected?.id ?? "neu"} rolle={selected} />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed bg-card/50 px-6 py-24 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                  <ShieldCheck className="h-6 w-6" />
                </span>
                <p className="text-sm text-muted-foreground">
                  Wähle links eine Rolle aus oder lege eine neue an.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
