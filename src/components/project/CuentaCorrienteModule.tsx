"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { InvoiceItem } from "@/src/types/erp";
import { KPICard } from "@/src/components/dashboard/KPICard";
import { Button } from "@/src/components/ui/button";
import { SearchInput } from "@/src/components/ui/search-input";
import { Pagination } from "@/src/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { money, percent } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";

/* Hallmark · design-system: design.md
 *
 * `CuentasPorCobrarModule` y `CuentasPorPagarModule` eran el mismo archivo dos
 * veces: 457 y 451 líneas cuyo `diff` completo eran cinco etiquetas, dos
 * iconos, `isSell` y el generador de PDF. Cualquier arreglo había que hacerlo
 * dos veces, y ya habían divergido —el de pagar ordenaba por `item.date` y el
 * de cobrar por `row.fecha`, que es una fecha ya formateada como texto y por
 * tanto se ordenaba mal—.
 *
 * Aquí queda una sola implementación; los dos módulos son ahora la
 * configuración de sus etiquetas.
 */

export interface CuentaRow {
  id: string;
  fecha: string;
  descripcion: string;
  itbis: number;
  isrRetenido: number;
  montoTotal: number;
  montoAplicado: number;
  balancePendiente: number;
}

export interface CuentaTotals {
  montoTotal: number;
  isrRetenido: number;
  montoAplicado: number;
  balancePendiente: number;
}

const ITEMS_PER_PAGE = 10;

function mapRow(item: InvoiceItem): CuentaRow {
  return {
    id: String(item.id),
    // Se guarda el ISO aparte para poder ordenar: la versión anterior ordenaba
    // por la fecha ya formateada («2/8/2026»), que como texto no ordena.
    fecha: item.date,
    descripcion:
      item.elements?.[0]?.comment || item.description || "Sin descripción",
    itbis: item.taxes || 0,
    isrRetenido: item.isrTaxRetention || 0,
    montoTotal: item.amount,
    montoAplicado: item.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0,
    balancePendiente: item.dueToPay || 0,
  };
}

const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "numeric",
    year: "numeric",
  });

interface CuentaCorrienteModuleProps {
  projectId: string | number;
  projectName?: string;
  /** true = ventas (por cobrar) · false = compras (por pagar). */
  isSell: boolean;
  labels: {
    /** «Total facturado» / «Total en compras» */
    total: string;
    /** «Cobrado» / «Pagado» */
    aplicado: string;
    /** «Pendiente por cobrar» / «Pendiente por pagar» */
    pendiente: string;
    /** Texto cuando no hay ninguna fila. */
    vacio: string;
    /** Título de la tabla. */
    tabla: string;
  };
  onDownloadPDF: (datos: {
    projectName: string;
    rows: CuentaRow[];
    totals: CuentaTotals;
  }) => Promise<void>;
}

export function CuentaCorrienteModule({
  projectId,
  projectName = "Proyecto",
  isSell,
  labels,
  onDownloadPDF,
}: CuentaCorrienteModuleProps) {
  const [allRows, setAllRows] = useState<CuentaRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          divisionId: String(projectId),
          isSell: String(isSell),
          type: "INVOICE",
          elements: "500",
          page: "1",
          ignoreDetailedData: "false",
        });
        const res = await fetch(`/api/erp/pendingRecord?${params}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          const rows: CuentaRow[] = (data.items || []).map(mapRow);
          rows.sort(
            (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
          );
          setAllRows(rows);
          setCurrentPage(1);
        }
      } catch (error) {
        if (!controller.signal.aborted)
          console.error("Error al cargar la cuenta corriente:", error);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [projectId, isSell]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter(
      (r) =>
        r.descripcion.toLowerCase().includes(q) ||
        fechaCorta(r.fecha).includes(q),
    );
  }, [allRows, searchQuery]);

  const totals: CuentaTotals = useMemo(
    () =>
      allRows.reduce(
        (acc, r) => ({
          montoTotal: acc.montoTotal + r.montoTotal,
          isrRetenido: acc.isrRetenido + r.isrRetenido,
          montoAplicado: acc.montoAplicado + r.montoAplicado,
          balancePendiente: acc.balancePendiente + r.balancePendiente,
        }),
        {
          montoTotal: 0,
          isrRetenido: 0,
          montoAplicado: 0,
          balancePendiente: 0,
        },
      ),
    [allRows],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / ITEMS_PER_PAGE),
  );
  const pageRows = filteredRows.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const pctAplicado =
    totals.montoTotal > 0
      ? (totals.montoAplicado / totals.montoTotal) * 100
      : 0;

  const descargar = async () => {
    setIsDownloading(true);
    try {
      // El PDF pinta `fecha` tal cual, así que se le entrega formateada: en la
      // tabla la fecha se guarda en ISO para poder ordenarla.
      await onDownloadPDF({
        projectName,
        rows: allRows.map((r) => ({ ...r, fecha: fechaCorta(r.fecha) })),
        totals,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KPICard
          loading={isLoading}
          kpi={{
            title: labels.total,
            value: money(totals.montoTotal),
            icon: "Receipt",
            hint: `${allRows.length} facturas`,
          }}
        />
        <KPICard
          loading={isLoading}
          kpi={{
            title: labels.aplicado,
            value: money(totals.montoAplicado),
            icon: "Wallet",
            hint:
              totals.montoTotal > 0
                ? `${percent(pctAplicado, 0)} del total`
                : "Sin facturas todavía",
          }}
        />
        <KPICard
          loading={isLoading}
          kpi={{
            title: labels.pendiente,
            value: money(totals.balancePendiente),
            icon: "Percent",
            hint:
              totals.isrRetenido > 0
                ? `Incluye ${money(totals.isrRetenido)} de ISR retenido`
                : "Sin retenciones de ISR",
          }}
        />
      </div>

      {!isLoading && totals.montoTotal > 0 && (
        <div>
          <div className="mb-1.5 flex justify-between text-[0.75rem] text-ink-2">
            <span className="tabular">
              {labels.aplicado} {percent(pctAplicado, 0)}
            </span>
            <span className="tabular">
              Pendiente {percent(100 - pctAplicado, 0)}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-3">
            <div
              className="h-full rounded-full bg-ink-2"
              style={{ width: `${pctAplicado}%` }}
            />
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-[12px] border border-rule bg-paper">
        <header className="flex flex-col gap-3 border-b border-rule px-4 py-3 sm:flex-row sm:items-center">
          <h3 className="shrink-0 font-display text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">
            {labels.tabla}
          </h3>
          {!isLoading && allRows.length > 0 && (
            <>
              <SearchInput
                className="flex-1"
                value={searchQuery}
                onValueChange={(v) => {
                  setSearchQuery(v);
                  setCurrentPage(1);
                }}
                placeholder="Buscar por descripción o fecha…"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={descargar}
                disabled={isDownloading}
                className="shrink-0"
              >
                {isDownloading ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.75} />
                )}
                {isDownloading ? "Generando…" : "Descargar PDF"}
              </Button>
            </>
          )}
        </header>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2
              className="h-5 w-5 animate-spin text-ink-3"
              aria-label="Cargando"
            />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="w-full min-w-48">Descripción</TableHead>
                  <TableHead numeric>ITBIS</TableHead>
                  <TableHead numeric>ISR retenido</TableHead>
                  <TableHead numeric>Monto total</TableHead>
                  <TableHead numeric>{labels.aplicado}</TableHead>
                  <TableHead numeric>Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allRows.length === 0 ? (
                  <TableEmpty colSpan={7}>{labels.vacio}</TableEmpty>
                ) : filteredRows.length === 0 ? (
                  <TableEmpty colSpan={7}>
                    Ningún documento coincide con «{searchQuery}».
                  </TableEmpty>
                ) : (
                  pageRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="tabular whitespace-nowrap text-[0.75rem] text-ink-3">
                        {fechaCorta(row.fecha)}
                      </TableCell>
                      <TableCell className="text-[0.8125rem] font-medium text-ink">
                        {row.descripcion}
                      </TableCell>
                      <TableCell
                        numeric
                        className="text-[0.8125rem] text-ink-2"
                      >
                        {money(row.itbis)}
                      </TableCell>
                      <TableCell numeric className="text-[0.8125rem]">
                        {row.isrRetenido > 0 ? (
                          <span className="font-medium text-danger">
                            {money(row.isrRetenido)}
                          </span>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </TableCell>
                      <TableCell
                        numeric
                        className="text-[0.8125rem] text-ink-2"
                      >
                        {money(row.montoTotal)}
                      </TableCell>
                      <TableCell
                        numeric
                        className="text-[0.8125rem] font-medium text-success"
                      >
                        {money(row.montoAplicado)}
                      </TableCell>
                      <TableCell
                        numeric
                        className={cn(
                          "text-[0.8125rem]",
                          row.balancePendiente > 0
                            ? "font-semibold text-ink"
                            : "text-ink-3",
                        )}
                      >
                        {money(row.balancePendiente)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {allRows.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell
                      colSpan={2}
                      className="text-[0.75rem] font-semibold uppercase tracking-[0.06em] text-ink-2"
                    >
                      Totales
                    </TableCell>
                    <TableCell numeric className="text-[0.8125rem]">
                      {money(allRows.reduce((s, r) => s + r.itbis, 0))}
                    </TableCell>
                    <TableCell numeric className="text-[0.8125rem]">
                      {money(totals.isrRetenido)}
                    </TableCell>
                    <TableCell numeric className="text-[0.8125rem]">
                      {money(totals.montoTotal)}
                    </TableCell>
                    <TableCell numeric className="text-[0.8125rem]">
                      {money(totals.montoAplicado)}
                    </TableCell>
                    <TableCell numeric className="text-[0.8125rem]">
                      {money(totals.balancePendiente)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>

            {filteredRows.length > 0 && (
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                totalItems={filteredRows.length}
                perPage={ITEMS_PER_PAGE}
                noun="documentos"
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}
