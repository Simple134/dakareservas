"use client";
import { useState, useEffect, useMemo } from "react";
import {
  Loader2,
  TrendingDown,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import { CustomCard } from "@/src/components/project/CustomCard";
import type { GestionoInvoiceItem } from "@/src/types/gestiono";
import { generateCuentasPorPagarPDF } from "@/lib/generateCuentasPorPagarPDF";

interface CuentasPorPagarModuleProps {
  projectId: string | number;
  projectName?: string;
}

interface CuentaRow {
  id: string;
  fecha: string;
  descripcion: string;
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
    montoTotal: item.amount,
    montoAplicado: item.paid || 0,
    balancePendiente: item.dueToPay || 0,
  };
}

export function CuentasPorPagarModule({
  projectId,
  projectName = "Proyecto",
}: CuentasPorPagarModuleProps) {
  const [allRows, setAllRows] = useState<CuentaRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          divisionId: String(projectId),
          isSell: "false",
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
          items.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          );
          const rows = items.map(mapRow);
          setAllRows(rows);
          setCurrentPage(1);
        }
      } catch (error) {
        if (!controller.signal.aborted)
          console.error("Error fetching cuentas por pagar:", error);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [projectId]);

  const totals = useMemo(
    () =>
      allRows.reduce(
        (acc, r) => ({
          montoTotal: acc.montoTotal + r.montoTotal,
          montoAplicado: acc.montoAplicado + r.montoAplicado,
          balancePendiente: acc.balancePendiente + r.balancePendiente,
        }),
        { montoTotal: 0, montoAplicado: 0, balancePendiente: 0 },
      ),
    [allRows],
  );

  const totalPages = Math.max(1, Math.ceil(allRows.length / ITEMS_PER_PAGE));
  const pageRows = allRows.slice(
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
      await generateCuentasPorPagarPDF({
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
        <CustomCard className="p-4 border-l-4 border-l-red-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg shrink-0">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">Total Compras</p>
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
              <p className="text-xs text-gray-500 font-medium">Total Pagado</p>
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

        <CustomCard className="p-4 border-l-4 border-l-orange-400">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg shrink-0">
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium">
                Pendiente por Pagar
              </p>
              {isLoading ? (
                <div className="h-7 w-32 bg-gray-200 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-lg md:text-2xl font-bold text-orange-600 truncate">
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
            <span>Pagado {paidPct}%</span>
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Detalle de Cuenta</h3>
          {!isLoading && allRows.length > 0 && (
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {isDownloading ? "Generando..." : "Descargar PDF"}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : allRows.length === 0 ? (
          <div className="text-sm text-gray-400 text-center py-12">
            No hay facturas de compra registradas
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
                    <th className="text-left py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                      Descripción
                    </th>
                    <th className="text-right py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">
                      Monto Total
                    </th>
                    <th className="text-right py-3 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">
                      Monto Pagado
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
                        {formatCurrency(row.montoTotal)}
                      </td>
                      <td className="py-3 px-5 text-right text-green-700 font-medium whitespace-nowrap">
                        {formatCurrency(row.montoAplicado)}
                      </td>
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <span
                          className={
                            row.balancePendiente > 0
                              ? "text-orange-600 font-semibold"
                              : "text-gray-400"
                          }
                        >
                          {formatCurrency(row.balancePendiente)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td
                      colSpan={2}
                      className="py-3 px-5 font-bold text-gray-600 text-xs uppercase tracking-wide"
                    >
                      Total
                    </td>
                    <td className="py-3 px-5 text-right font-bold text-gray-800 whitespace-nowrap">
                      {formatCurrency(totals.montoTotal)}
                    </td>
                    <td className="py-3 px-5 text-right font-bold text-green-700 whitespace-nowrap">
                      {formatCurrency(totals.montoAplicado)}
                    </td>
                    <td className="py-3 px-5 text-right font-bold text-orange-600 whitespace-nowrap">
                      {formatCurrency(totals.balancePendiente)}
                    </td>
                  </tr>
                </tfoot>
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
