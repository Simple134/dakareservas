"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";
import { count } from "@/src/lib/format";

/* Paginación del Workbench. Items y Facturas la escribían cada una por su
 * cuenta, y ambas pintaban un botón por página: con 40 páginas la barra hacía
 * scroll horizontal. Aquí la lista de páginas se recorta alrededor de la
 * actual. */

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Total de filas, para el texto «mostrando X – Y de Z». */
  totalItems?: number;
  perPage?: number;
  /** Nombre de lo que se lista, en plural. */
  noun?: string;
  onPageChange: (pagina: number) => void;
  className?: string;
}

/** Ventana de páginas alrededor de la actual, con elipsis. */
function ventana(page: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const cerca = [page - 1, page, page + 1].filter((p) => p > 1 && p < total);
  const paginas: (number | "…")[] = [1];
  if (cerca[0] && cerca[0] > 2) paginas.push("…");
  paginas.push(...cerca);
  if (cerca[cerca.length - 1] < total - 1) paginas.push("…");
  paginas.push(total);
  return paginas;
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  perPage = 10,
  noun = "resultados",
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1 && !totalItems) return null;
  const desde = totalItems ? (page - 1) * perPage + 1 : 0;
  const hasta = totalItems ? Math.min(page * perPage, totalItems) : 0;

  return (
    <nav
      aria-label="Paginación"
      className={cn(
        "flex flex-col gap-3 border-t border-rule px-4 py-3",
        "sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {typeof totalItems === "number" && (
        <p className="text-[0.75rem] text-ink-2">
          <span className="tabular">
            {count(desde)}–{count(hasta)}
          </span>{" "}
          de{" "}
          <span className="tabular font-semibold text-ink">
            {count(totalItems)}
          </span>{" "}
          {noun}
        </p>
      )}

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <ChevronLeft className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Anterior</span>
        </Button>

        <div className="hidden items-center gap-0.5 sm:flex">
          {ventana(page, totalPages).map((p, i) =>
            p === "…" ? (
              <span
                key={`gap-${i}`}
                className="px-1.5 text-[0.75rem] text-ink-3"
                aria-hidden
              >
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                aria-current={p === page ? "page" : undefined}
                className={cn(
                  "tabular h-8 min-w-8 rounded-[6px] px-2 text-[0.75rem] font-medium",
                  "transition-colors duration-[120ms]",
                  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold",
                  p === page
                    ? "bg-gold-soft text-gold-strong"
                    : "text-ink-2 hover:bg-paper-3 hover:text-ink",
                )}
              >
                {p}
              </button>
            ),
          )}
        </div>

        <span className="tabular px-2 text-[0.75rem] text-ink-2 sm:hidden">
          {page} / {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          <span className="hidden sm:inline">Siguiente</span>
          <ChevronRight className="h-4 w-4 sm:ml-1" />
        </Button>
      </div>
    </nav>
  );
}
