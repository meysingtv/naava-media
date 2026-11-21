"use client";

import { useMemo, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Field } from "@/components/ui/field";
import { FeldGitter } from "@/components/ui/formular";
import { Input } from "@/components/ui/input";
import { FilterBar } from "@/components/shared/filter-bar";
import { FormularDialog } from "@/components/shared/formular-dialog";
import { formatEuro } from "@/lib/utils";
import type { Leistung } from "@/lib/types";
import { leistungErstellen, leistungLoeschen } from "./leistungen-actions";

/** Leistung anlegen – Name, Preis, Einheit, Klasse und Kategorie. */
export function LeistungNeu() {
  return (
    <FormularDialog
      action={leistungErstellen}
      ausloeser="Leistung anlegen"
      titel="Neue Leistung"
      beschreibung="Beim Schreiben einer Rechnung fügst du sie mit einem Klick als Position ein."
      erfolg="Leistung gespeichert"
    >
      <Field label="Name" required>
        <Input name="name" required autoFocus placeholder="z. B. Übungsstunde 45 Min." />
      </Field>
      <FeldGitter>
        <Field label="Preis" required>
          <Input name="preis" type="number" step="0.01" min="0" required placeholder="0,00" trailing="€" />
        </Field>
        <Field label="Einheit">
          <Input name="einheit" defaultValue="Stk" />
        </Field>
        <Field label="Kategorie" hint="z. B. Fahrstunde, Gebühr, Material">
          <Input name="kategorie" />
        </Field>
        <Field label="Klasse" hint="Optional">
          <Input name="klasse" placeholder="z. B. B" />
        </Field>
      </FeldGitter>
    </FormularDialog>
  );
}

export function Preisliste({ leistungen }: { leistungen: Leistung[] }) {
  const [suche, setSuche] = useState("");
  const [, startTransition] = useTransition();

  const gefiltert = useMemo(() => {
    const q = suche.trim().toLowerCase();
    return q ? leistungen.filter((l) => `${l.name} ${l.kategorie ?? ""} ${l.klasse ?? ""}`.toLowerCase().includes(q)) : leistungen;
  }, [leistungen, suche]);

  function loeschen(l: Leistung) {
    const daten = new FormData();
    daten.set("id", l.id);
    startTransition(async () => {
      await leistungLoeschen(daten);
      toast.success(`„${l.name}“ gelöscht`);
    });
  }

  const spalten: DataTableColumn<Leistung>[] = [
    {
      key: "name",
      header: "Leistung",
      primary: true,
      sortValue: (l) => l.name,
      cell: (l) => <span className="font-medium text-foreground">{l.name}</span>,
    },
    {
      key: "kategorie",
      header: "Kategorie",
      hideBelow: "md",
      sortValue: (l) => l.kategorie ?? "",
      cell: (l) => <span className="text-foreground-secondary">{l.kategorie || "—"}</span>,
    },
    {
      key: "klasse",
      header: "Klasse",
      hideBelow: "md",
      sortValue: (l) => l.klasse ?? "",
      cell: (l) => <span className="text-foreground-secondary">{l.klasse || "—"}</span>,
    },
    {
      key: "einheit",
      header: "Einheit",
      hideBelow: "lg",
      cell: (l) => <span className="text-foreground-secondary">{l.einheit}</span>,
    },
    {
      key: "preis",
      header: "Preis",
      numeric: true,
      sortValue: (l) => Number(l.preis),
      cell: (l) => <span className="font-medium text-foreground">{formatEuro(Number(l.preis))}</span>,
    },
  ];

  return (
    <DataTable
      rows={gefiltert}
      columns={spalten}
      getRowId={(l) => l.id}
      itemLabel="Leistungen"
      caption="Preisliste"
      pageSize={false}
      rowActions={(l) => [{ label: "Löschen", icon: Trash2, variant: "danger", onSelect: () => loeschen(l) }]}
      toolbar={<FilterBar search={{ placeholder: "Leistung, Kategorie oder Klasse", value: suche, onChange: setSuche }} />}
      emptyState={
        <p className="px-4 py-10 text-center text-13 text-foreground-secondary">
          {leistungen.length ? "Keine Leistung gefunden." : "Noch keine Leistungen. Lege z. B. Übungsstunde, Sonderfahrt und Grundgebühr an."}
        </p>
      }
    />
  );
}
