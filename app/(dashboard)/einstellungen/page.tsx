import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, ChevronRight, CreditCard, ReceiptText, ShieldCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { getKontext } from "@/lib/supabase/queries";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import type { Leistung } from "@/lib/types";
import { FahrschuleForm, ZahlungForm } from "./einstellungen-form";
import { LeistungNeu, Preisliste } from "./preisliste";

export const metadata = { title: "Einstellungen · FahrschulApp" };

const BEREICHE = [
  { key: "fahrschule", label: "Fahrschule", icon: Building2 },
  { key: "zahlung", label: "Rechnungen und Zahlung", icon: CreditCard },
  { key: "preisliste", label: "Preisliste", icon: ReceiptText },
] as const;

type Bereich = (typeof BEREICHE)[number]["key"];

export default async function EinstellungenPage({ searchParams }: { searchParams: { bereich?: string } }) {
  const kontext = await getKontext();
  if (!kontext?.fahrschule) redirect("/auth/login");
  // Nur die Geschäftsführung darf das Profil der Fahrschule bearbeiten.
  if (kontext.fahrlehrer?.rolle !== "chef") redirect("/dashboard");

  const bereich: Bereich = BEREICHE.some((b) => b.key === searchParams.bereich) ? (searchParams.bereich as Bereich) : "fahrschule";

  const supabase = createClient();
  const leistungen =
    bereich === "preisliste"
      ? (
          await supabase
            .from("leistung")
            .select("*")
            .order("sortierung", { ascending: true })
            .order("name", { ascending: true })
            .returns<Leistung[]>()
        ).data ?? []
      : [];

  return (
    <div>
      <PageHeader title="Einstellungen">{bereich === "preisliste" ? <LeistungNeu /> : null}</PageHeader>

      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Einstellungen" className="lg:sticky lg:top-20 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col [scrollbar-width:none]">
            {BEREICHE.map((b) => {
              const aktiv = b.key === bereich;
              return (
                <li key={b.key} className="shrink-0">
                  <Link
                    href={b.key === "fahrschule" ? "/einstellungen" : `/einstellungen?bereich=${b.key}`}
                    aria-current={aktiv ? "page" : undefined}
                    className={cn(
                      "flex h-9 items-center gap-2.5 rounded-lg px-3 text-13 font-medium transition-colors",
                      aktiv ? "bg-card text-foreground shadow-panel" : "text-foreground-secondary hover:bg-card/60 hover:text-foreground",
                    )}
                  >
                    <b.icon className={cn("h-4 w-4", aktiv ? "text-primary-text" : "text-foreground-tertiary")} strokeWidth={1.75} aria-hidden="true" />
                    {b.label}
                  </Link>
                </li>
              );
            })}
            <li className="shrink-0 lg:mt-3 lg:border-t lg:border-border lg:pt-3">
              <Link
                href="/fahrlehrer/rollen"
                className="flex h-9 items-center gap-2.5 rounded-lg px-3 text-13 font-medium text-foreground-secondary transition-colors hover:bg-card/60 hover:text-foreground"
              >
                <ShieldCheck className="h-4 w-4 text-foreground-tertiary" strokeWidth={1.75} aria-hidden="true" />
                Rollen und Rechte
                <ChevronRight className="ml-auto hidden h-3.5 w-3.5 text-foreground-tertiary lg:block" strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </li>
          </ul>
        </nav>

        <div className="min-w-0 max-w-3xl">
          {bereich === "fahrschule" && <FahrschuleForm fahrschule={kontext.fahrschule} />}
          {bereich === "zahlung" && <ZahlungForm fahrschule={kontext.fahrschule} />}
          {bereich === "preisliste" && <Preisliste leistungen={leistungen} />}
        </div>
      </div>
    </div>
  );
}
