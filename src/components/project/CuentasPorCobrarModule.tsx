"use client";
import { useState, useEffect, useMemo } from "react";
import {
  Loader2,
  TrendingUp,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  X,
} from "lucide-react";
import { CustomCard } from "@/src/components/project/CustomCard";
import type { GestionoInvoiceItem } from "@/src/types/gestiono";
import { generateCuentasPorCobrarPDF } from "@/lib/generateCuentasPorCobrarPDF";

interface CuentasPorCobrarModuleProps {
  projectId: string | number;
  projectName?: string;
}

interface CuentaRow {
  id: string;
  fecha: string;
  descripcion: string;
  itbis: number;
  isrRetenido: number;
  montoTotal: number;
  montoAplicado: number;
  balancePendiente: number;
}

const ITEMS_PER_PAGE = 10;

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(amount);

function mapRow(item: GestionoInvoiceItem): CuentaRow {
  return {
    id: String(item.id),
    fecha: new Date(item.date).toLocaleDateString("es-DO", {
      day: "2-digit",
      month: "numeric",
      year: "numeric",
    }),
    descripcion:
      item.elements?.[0]?.comment || item.description || "Sin descripción",
    itbis: item.taxes || 0,
    isrRetenido: item.isrTaxRetention || 0,
    montoTotal: item.amount,
    montoAplicado: item.payments?.reduce((sum, p) => sum + p.amount, 0) ?? 0,
    balancePendiente: item.dueToPay || 0,
  };
}

export function CuentasPorCobrarModule({
  projectId,
  projectName = "Proyecto",
}: CuentasPorCobrarModuleProps) {
  const [allRows, setAllRows] = useState<CuentaRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all invoices at once — paginate client-side
  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          divisionId: String(projectId),
          isSell: "true",
          type: "INVOICE",
          elements: "500",
          page: "1",
          ignoreDetailedData: "false",
        });
        const res = await fetch(
          `/api/gestiono/pendingRecord?${params.toString()}`,
          { signal: controller.signal },
        );
        if (res.ok) {
          const data = await res.json();
          const items: GestionoInvoiceItem[] = data.items || [];
          const rows = items.map(mapRow);
          rows.sort(
            (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
          );
          setAllRows(rows);
          setCurrentPage(1);
        }
      } catch (error) {
        if (!controller.signal.aborted)
          console.error("Error fetching cuentas por cobrar:", error);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [projectId]);

  // Filter rows client-side based on search query
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return allRows;
    return allRows.filter(
      (r) =>
        r.descripcion.toLowerCase().includes(q) ||
        r.fecha.toLowerCase().includes(q),
    );
  }, [allRows, searchQuery]);

  // Column totals from the full dataset (not just current page)
  const totals = useMemo(
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

  // Pagination — operates on filtered rows
  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / ITEMS_PER_PAGE),
  );
  const pageRows = filteredRows.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const paidPct =
    totals.montoTotal > 0
      ? Math.round((totals.montoAplicado / totals.montoTotal) * 100)
      : 0;

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      await generateCuentasPorCobrarPDF({
        projectName,
        rows: allRows,
        totals,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <CustomCard className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg shrink-0">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">
                Total Facturado
              </p>
              {isLoading ? (
                <div className="h-7 w-32 bg-gray-200 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-lg md:text-2xl font-bold text-gray-900 truncate">
                  {formatCurrency(totals.montoTotal)}
                </p>
              )}
            </div>
          </div>
        </CustomCard>

        <CustomCard className="p-4 border-l-4 border-l-green-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg shrink-0">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">
                Total Recibido
              </p>
              {isLoading ? (
                <div className="h-7 w-32 bg-gray-200 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-lg md:text-2xl font-bold text-green-700 truncate">
                  {formatCurrency(totals.montoAplicado)}
                </p>
              )}
            </div>
          </div>
        </CustomCard>

        <CustomCard className="p-4 border-l-4 border-l-slate-400">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-50 rounded-lg shrink-0">
              <Clock className="w-5 h-5 text-slate-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">
                Pendiente por Cobrar
              </p>
              {isLoading ? (
                <div className="h-7 w-32 bg-gray-200 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-lg md:text-2xl font-bold text-slate-600 truncate">
                  {formatCurrency(totals.balancePendiente)}
                </p>
              )}
            </div>
          </div>
        </CustomCard>
      </div>

      {/* Progress bar */}
      {!isLoading && totals.montoTotal > 0 && (
        <div className="px-1">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Cobrado {paidPct}%</span>
            <span>Pendiente {100 - paidPct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{ width: `${paidPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Table */}
      <CustomCard className="p-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 shrink-0">
            Detalle de Cuenta
          </h3>
          {!isLoading && allRows.length > 0 && (
            <>
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por descripción o fecha..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-8 pr-8 py-1.5 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setCurrentPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                {isDownloading ? "Generando..." : "Descargar PDF"}
              </button>
            </>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : allRows.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-12">
            No hay facturas de venta registradas
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-12">
            No se encontraron resultados para &quot;{searchQuery}&quot;
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">
                      Fecha
                    </th>
                    <th className="text-left py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wide w-full min-w-[200px]">
                      Descripción
                    </th>
                    <th className="text-right py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">
                      ITBIS
                    </th>
                    <th className="text-right py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">
                      ISR Retenido
                    </th>
                    <th className="text-right py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">
                      Monto Total
                    </th>
                    <th className="text-right py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">
                      Monto Aplicado
                    </th>
                    <th className="text-right py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">
                      Blce Pendiente
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageRows.map((row, i) => (
                    <tr
                      key={row.id}
                      className={i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}
                    >
                      <td className="py-3 px-5 text-gray-500 whitespace-nowrap text-xs">
                        {row.fecha}
                      </td>
                      <td className="py-3 px-5 text-gray-900 font-medium">
                        {row.descripcion}
                      </td>
                      <td className="py-3 px-5 text-right text-gray-700 whitespace-nowrap">
                        {formatCurrency(row.itbis)}
                      </td>
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        {row.isrRetenido > 0 ? (
                          <span className="text-red-600 font-medium">
                            {formatCurrency(row.isrRetenido)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-right text-gray-700 whitespace-nowrap">
                        {formatCurrency(row.montoTotal)}
                      </td>
                      <td className="py-3 px-5 text-right text-green-700 font-medium whitespace-nowrap">
                        {formatCurrency(row.montoAplicado)}
                      </td>
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <span
                          className={
                            row.balancePendiente > 0
                              ? "text-slate-600 font-semibold"
                              : "text-gray-400"
                          }
                        >
                          {formatCurrency(row.balancePendiente)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  Página {currentPage} de {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - currentPage) <= 1,
                    )
                    .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                      if (
                        idx > 0 &&
                        (p as number) - (arr[idx - 1] as number) > 1
                      )
                        acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((item, idx) =>
                      item === "..." ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-1 text-gray-400 text-xs"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={item}
                          onClick={() => setCurrentPage(item as number)}
                          className={`w-7 h-7 text-xs rounded-md transition-colors ${
                            currentPage === item
                              ? "bg-gray-900 text-white font-semibold"
                              : "hover:bg-gray-100 text-gray-600"
                          }`}
                        >
                          {item}
                        </button>
                      ),
                    )}
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </CustomCard>
    </div>
  );
}
