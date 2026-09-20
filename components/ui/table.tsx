import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Datentabelle v3: 44-px-Zeilen, klebender Kopf in Satzschrift (keine
 * Versalien), Haarlinien nur INNERHALB des Panels, Zahlen tabellarisch.
 */
const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-x-auto scrollbar-thin">
      <table ref={ref} className={cn("w-full caption-bottom text-13 tabular-nums", className)} {...props} />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn("sticky top-0 z-sticky bg-surface-muted [&_tr]:border-b [&_tr]:border-border", className)}
      {...props}
    />
  ),
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  ),
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot
      ref={ref}
      className={cn("border-t border-border bg-surface-muted font-medium [&>tr]:last:border-b-0", className)}
      {...props}
    />
  ),
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "h-11 border-b border-border transition-colors duration-fast hover:bg-surface-muted/70",
        "data-[state=selected]:bg-primary-soft/60 data-[state=selected]:shadow-[inset_3px_0_0_hsl(var(--primary))]",
        className,
      )}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const ausrichtung = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
} as const;

export interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sorted?: "asc" | "desc" | false;
  onSort?: () => void;
  align?: "left" | "right" | "center";
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, sortable, sorted = false, onSort, align = "left", children, ...props }, ref) => (
    <th
      ref={ref}
      aria-sort={sortable ? (sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : "none") : undefined}
      className={cn(
        "h-10 whitespace-nowrap px-3 align-middle text-xs font-medium text-foreground-secondary first:pl-4 last:pr-4",
        "[&:has([role=checkbox])]:w-10 [&:has([role=checkbox])]:pr-0",
        ausrichtung[align],
        className,
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={cn(
            "group inline-flex items-center gap-1 rounded-sm text-xs font-medium text-foreground-secondary transition-colors duration-fast hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
            align === "right" && "flex-row-reverse",
          )}
        >
          {children}
          {sorted === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
          ) : sorted === "desc" ? (
            <ArrowDown className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <ArrowUpDown
              className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
              strokeWidth={1.75}
              aria-hidden="true"
            />
          )}
        </button>
      ) : (
        children
      )}
    </th>
  ),
);
TableHead.displayName = "TableHead";

export interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  align?: "left" | "right" | "center";
  numeric?: boolean;
  muted?: boolean;
}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, align = "left", numeric, muted, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        "h-11 px-3 align-middle first:pl-4 last:pr-4 [&:has([role=checkbox])]:pr-0",
        numeric ? "text-right tabular-nums" : ausrichtung[align],
        muted && "text-muted-foreground",
        className,
      )}
      {...props}
    />
  ),
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn("mt-3 text-xs text-muted-foreground", className)} {...props} />
  ),
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
