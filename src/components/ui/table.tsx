import * as React from "react";
import { cn } from "@/src/lib/utils";

/* Hallmark · design-system: design.md
 *
 * Densidad de tabla del sistema: fila 44 px, cabecera en mayúsculas 11 px con
 * tracking 0.06em, hover en paper-3, sin bordes verticales. La tabla hace
 * scroll dentro de su propio contenedor — el body nunca hace scroll horizontal.
 */

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="table-scroll relative w-full">
    <table
      ref={ref}
      className={cn(
        "w-full caption-bottom border-collapse text-[0.8125rem] text-ink",
        className,
      )}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn("bg-paper-2 [&_tr]:border-b [&_tr]:border-rule", className)}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t border-rule-strong bg-paper-2 font-semibold [&>tr]:last:border-b-0",
      className,
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-rule transition-colors duration-[120ms]",
      "hover:bg-paper-3 data-[state=selected]:bg-gold-soft",
      className,
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }
>(({ className, numeric, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 px-4 align-middle whitespace-nowrap",
      "text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-ink-2",
      numeric ? "text-right" : "text-left",
      "[&:has([role=checkbox])]:w-10 [&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }
>(({ className, numeric, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "h-11 px-4 align-middle",
      // Cifras en columna: proporcionales en una columna de montos es un
      // defecto de lectura, no una preferencia estética.
      numeric && "tabular text-right font-mono",
      "[&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-3 text-[0.8125rem] text-ink-2", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

/** Fila vacía con mensaje. Evita que cada módulo invente su propio "sin datos". */
function TableEmpty({
  colSpan,
  children = "Sin resultados",
}: {
  colSpan: number;
  children?: React.ReactNode;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="h-28 px-4 text-center text-[0.8125rem] text-ink-3"
      >
        {children}
      </td>
    </tr>
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  TableEmpty,
};
