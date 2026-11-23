"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, MoreHorizontal, type LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Panel } from "@/components/ui/panel";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /** Gesetzt = Spalte ist sortierbar. */
  sortValue?: (row: T) => string | number | null;
  align?: "left" | "right" | "center";
  numeric?: boolean;
  width?: string;
  hideBelow?: "sm" | "md" | "lg" | "xl";
  /** Identifikator der Zeile – klebt bei horizontalem Scroll. */
  primary?: boolean;
}

export interface RowAction {
  label: string;
  icon?: LucideIcon;
  href?: string;
  onSelect?: () => void;
  variant?: "default" | "danger";
  separatorBefore?: boolean;
}

export interface DataTableProps<T> {
  rows: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;

  rowHref?: (row: T) => string | undefined;
  onRowClick?: (row: T) => void;
  activeRowId?: string;

  selectable?: boolean;
  selected?: Set<string>;
  onSelectedChange?: (ids: Set<string>) => void;
  bulkActions?: (ids: string[]) => React.ReactNode;

  rowActions?: (row: T) => RowAction[];

  /** Filterleiste über der Tabelle – üblicherweise `<FilterBar …/>`. */
  toolbar?: React.ReactNode;
  sort?: { key: string; dir: "asc" | "desc" };
  onSortChange?: (s: { key: string; dir: "asc" | "desc" }) => void;
  defaultSort?: { key: string; dir: "asc" | "desc" };

  /** Bezeichnung der Zeilen im Fuß („Schüler", „Rechnungen"). */
  itemLabel?: string;
  /** Default 25; `false` schaltet die Pagination ab. */
  pageSize?: number | false;
  page?: number;
  onPageChange?: (p: number) => void;
  total?: number;

  mobileCard?: (row: T) => React.ReactNode;
  emptyState?: React.ReactNode;
  loading?: boolean;
  /** Abstand des klebenden Kopfs von oben (nur mit `maxHeight` wirksam). */
  stickyHeaderOffset?: number;
  maxHeight?: string;
  density?: "default" | "compact";
  footer?: React.ReactNode;
  caption?: string;
  className?: string;
}

const versteckt = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
} as const;

// ---------------------------------------------------------------------------
// Komponente
// ---------------------------------------------------------------------------

/**
 * Datentabelle v3 – reiner UI-Baustein ohne Datenlogik: Filterleiste,
 * Sortierung, Auswahl, Zeilenmenü und Pagination arbeiten auf den
 * übergebenen Zeilen. Serverseitiges Blättern über `page`/`total`.
 */
export function DataTable<T>({
  rows,
  columns,
  getRowId,
  rowHref,
  onRowClick,
  activeRowId,
  selectable,
  selected,
  onSelectedChange,
  bulkActions,
  rowActions,
  toolbar,
  sort,
  onSortChange,
  defaultSort,
  pageSize = 25,
  page,
  onPageChange,
  total,
  mobileCard,
  emptyState,
  loading,
  stickyHeaderOffset = 0,
  maxHeight,
  density = "default",
  footer,
  caption,
  className,
  itemLabel = "Einträge",
}: DataTableProps<T>) {
  const router = useRouter();
  // Sortierung: von außen gesteuert oder intern gehalten.
  const [internSort, setInternSort] = React.useState(defaultSort);
  const aktuelleSortierung = sort ?? internSort;

  // Pagination: von außen gesteuert oder intern gehalten.
  const [internPage, setInternPage] = React.useState(1);
  const aktuelleSeite = page ?? internPage;
  const serverseitig = total != null;

  const [internAuswahl, setInternAuswahl] = React.useState<Set<string>>(new Set());
  const auswahl = selected ?? internAuswahl;

  const letzteZeileRef = React.useRef<number | null>(null);

  function setzeAuswahl(neu: Set<string>) {
    if (onSelectedChange) onSelectedChange(neu);
    else setInternAuswahl(neu);
  }

  function sortiereNach(spalte: DataTableColumn<T>) {
    if (!spalte.sortValue) return;
    const gleich = aktuelleSortierung?.key === spalte.key;
    const naechste: { key: string; dir: "asc" | "desc" } =
      gleich && aktuelleSortierung?.dir === "asc"
        ? { key: spalte.key, dir: "desc" }
        : { key: spalte.key, dir: "asc" };
    if (onSortChange) onSortChange(naechste);
    else setInternSort(naechste);
  }

  // Sortieren (Text über localeCompare("de"), Zahlen numerisch)
  const sortiert = React.useMemo(() => {
    if (!aktuelleSortierung) return rows;
    const spalte = columns.find((c) => c.key === aktuelleSortierung.key);
    if (!spalte?.sortValue) return rows;
    const faktor = aktuelleSortierung.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = spalte.sortValue!(a);
      const vb = spalte.sortValue!(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * faktor;
      return String(va).localeCompare(String(vb), "de") * faktor;
    });
  }, [rows, columns, aktuelleSortierung]);

  const proSeite = pageSize === false ? sortiert.length : pageSize;
  const gesamt = total ?? sortiert.length;
  const seiten = proSeite > 0 ? Math.max(1, Math.ceil(gesamt / proSeite)) : 1;
  const sichtbar =
    pageSize === false || serverseitig
      ? sortiert
      : sortiert.slice((aktuelleSeite - 1) * proSeite, aktuelleSeite * proSeite);

  function blaettere(zu: number) {
    const ziel = Math.min(Math.max(1, zu), seiten);
    if (onPageChange) onPageChange(ziel);
    else setInternPage(ziel);
  }

  const alleSichtbarenIds = sichtbar.map(getRowId);
  const alleGewaehlt = alleSichtbarenIds.length > 0 && alleSichtbarenIds.every((id) => auswahl.has(id));
  const teilweise = !alleGewaehlt && alleSichtbarenIds.some((id) => auswahl.has(id));

  function waehleAlle(an: boolean) {
    const neu = new Set(auswahl);
    for (const id of alleSichtbarenIds) {
      if (an) neu.add(id);
      else neu.delete(id);
    }
    setzeAuswahl(neu);
  }

  function waehleZeile(index: number, id: string, an: boolean, shift: boolean) {
    const neu = new Set(auswahl);
    if (shift && letzteZeileRef.current != null) {
      const [von, bis] = [letzteZeileRef.current, index].sort((a, b) => a - b);
      for (let i = von; i <= bis; i++) {
        const zid = getRowId(sichtbar[i]);
        if (an) neu.add(zid);
        else neu.delete(zid);
      }
    } else if (an) {
      neu.add(id);
    } else {
      neu.delete(id);
    }
    letzteZeileRef.current = index;
    setzeAuswahl(neu);
  }

  const zeilenhoehe = density === "compact" ? "h-9" : "h-11";
  const spaltenZahl = columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);
  const leer = !loading && sichtbar.length === 0;

  return (
    <Panel padding="none" className={className}>
      {/* 1 – Filterleiste bzw. Bulk-Leiste */}
      {auswahl.size > 0 && bulkActions ? (
        <div className="flex min-h-12 items-center gap-3 border-b border-border bg-primary-soft px-4 text-13">
          <span className="font-medium text-foreground">{auswahl.size} ausgewählt</span>
          {bulkActions(Array.from(auswahl))}
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setzeAuswahl(new Set())}>
            Auswahl aufheben
          </Button>
        </div>
      ) : (
        toolbar
      )}

      {/* 2 – Mobil: Karten-Liste, sobald `mobileCard` vorliegt */}
      {mobileCard && (
        <div className="divide-y divide-border md:hidden">
          {sichtbar.map((row) => {
            const id = getRowId(row);
            const href = rowHref?.(row);
            const karte = <div className="px-4 py-3">{mobileCard(row)}</div>;
            return href ? (
              <Link key={id} href={href} className="block hover:bg-surface-muted/70">
                {karte}
              </Link>
            ) : (
              <div
                key={id}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(onRowClick && "cursor-pointer hover:bg-surface-muted/70")}
              >
                {karte}
              </div>
            );
          })}
          {leer && <div className="px-4">{emptyState}</div>}
        </div>
      )}

      {/* 3 – Tabelle */}
      <div
        className={cn(mobileCard && "hidden md:block", maxHeight && "overflow-y-auto scrollbar-thin")}
        style={maxHeight ? { maxHeight } : undefined}
      >
        <Table>
          {caption && <caption className="sr-only">{caption}</caption>}
          <TableHeader
            style={{ top: maxHeight ? 0 : stickyHeaderOffset }}
            className="max-md:!static max-md:!top-auto"
          >
            <TableRow className="hover:bg-transparent">
              {selectable && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={teilweise ? "indeterminate" : alleGewaehlt}
                    onCheckedChange={(v) => waehleAlle(v === true)}
                    aria-label="Alle Zeilen auswählen"
                  />
                </TableHead>
              )}
              {columns.map((c) => (
                <TableHead
                  key={c.key}
                  align={c.numeric ? "right" : c.align}
                  sortable={Boolean(c.sortValue)}
                  sorted={aktuelleSortierung?.key === c.key ? aktuelleSortierung.dir : false}
                  onSort={() => sortiereNach(c)}
                  style={c.width ? { width: c.width } : undefined}
                  className={cn(c.hideBelow && versteckt[c.hideBelow])}
                >
                  {c.header}
                </TableHead>
              ))}
              {rowActions && <TableHead className="w-10" aria-label="Aktionen" />}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading &&
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`} className={zeilenhoehe}>
                  {Array.from({ length: spaltenZahl }).map((__, j) => (
                    <TableCell key={j} className={zeilenhoehe}>
                      <div className="h-3 w-full max-w-[140px] animate-soft-pulse rounded-md bg-surface-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading &&
              sichtbar.map((row, index) => {
                const id = getRowId(row);
                const href = rowHref?.(row);
                const gewaehlt = auswahl.has(id);
                const aktiv = activeRowId === id;
                const aktionen = rowActions?.(row) ?? [];

                return (
                  <TableRow
                    key={id}
                    data-state={gewaehlt ? "selected" : undefined}
                    onClick={
                      onRowClick
                        ? () => onRowClick(row)
                        : href
                          ? (e) => {
                              if (e.metaKey || e.ctrlKey) window.open(href, "_blank");
                              else router.push(href);
                            }
                          : undefined
                    }
                    className={cn(
                      "group",
                      zeilenhoehe,
                      (onRowClick || href) && "cursor-pointer",
                      aktiv && "bg-primary-soft hover:bg-primary-soft",
                    )}
                  >
                    {selectable && (
                      <TableCell className={cn(zeilenhoehe, "w-10")} onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={gewaehlt}
                          onCheckedChange={(v) => waehleZeile(index, id, v === true, false)}
                          onClick={(e) =>
                            (e as React.MouseEvent).shiftKey &&
                            waehleZeile(index, id, !gewaehlt, true)
                          }
                          aria-label="Zeile auswählen"
                        />
                      </TableCell>
                    )}

                    {columns.map((c) => (
                      <TableCell
                        key={c.key}
                        align={c.align}
                        numeric={c.numeric}
                        className={cn(
                          zeilenhoehe,
                          c.hideBelow && versteckt[c.hideBelow],
                          c.primary && "sticky left-0 bg-card group-hover:bg-surface-muted md:static md:bg-transparent",
                        )}
                      >
                        {href && c.primary ? (
                          <Link href={href} className="block min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70" onClick={(e) => e.stopPropagation()}>
                            {c.cell(row)}
                          </Link>
                        ) : (
                          c.cell(row)
                        )}
                      </TableCell>
                    ))}

                    {rowActions && (
                      <TableCell className={cn(zeilenhoehe, "w-10")} onClick={(e) => e.stopPropagation()}>
                        {aktionen.length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                aria-label="Zeilenmenü"
                                className="row-action opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                              >
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {aktionen.map((a, i) => (
                                <React.Fragment key={a.label}>
                                  {a.separatorBefore && i > 0 && <DropdownMenuSeparator />}
                                  {a.href ? (
                                    <DropdownMenuItem asChild variant={a.variant}>
                                      <Link href={a.href} className="cursor-pointer">
                                        {a.icon && <a.icon />}
                                        {a.label}
                                      </Link>
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      variant={a.variant}
                                      onSelect={a.onSelect}
                                      className="cursor-pointer"
                                    >
                                      {a.icon && <a.icon />}
                                      {a.label}
                                    </DropdownMenuItem>
                                  )}
                                </React.Fragment>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}

            {leer && !mobileCard && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={spaltenZahl} className="h-auto p-0">
                  {emptyState}
                </TableCell>
              </TableRow>
            )}
          </TableBody>

          {footer && <TableFooter>{footer}</TableFooter>}
        </Table>
      </div>

      {/* 4 – Fuß: Anzahl und Blättern */}
      {!loading && gesamt > 0 && (
        <div className="flex h-10 items-center justify-between border-t border-border px-4 text-13 text-foreground-secondary">
          <span className="tabular-nums">
            {pageSize !== false && gesamt > proSeite
              ? `${(aktuelleSeite - 1) * proSeite + 1}–${Math.min(aktuelleSeite * proSeite, gesamt)} von ${gesamt} ${itemLabel}`
              : `${gesamt} ${itemLabel}`}
          </span>
          {pageSize !== false && gesamt > proSeite && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="xs"
                disabled={aktuelleSeite <= 1}
                onClick={() => blaettere(aktuelleSeite - 1)}
              >
                <ChevronLeft /> Zurück
              </Button>
              <Button
                variant="outline"
                size="xs"
                disabled={aktuelleSeite >= seiten}
                onClick={() => blaettere(aktuelleSeite + 1)}
              >
                Weiter <ChevronRight />
              </Button>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
