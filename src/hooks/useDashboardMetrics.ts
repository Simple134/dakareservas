"use client";

import { useMemo } from "react";
import { useErp } from "@/src/context/ErpContext";
import { Division, PendingRecord } from "@/src/types/erp";

/* Único lugar donde se derivan las cifras del dashboard.
 *
 * Regla: nada de lo que se muestre aquí se inventa. Si un dato no existe en
 * Supabase (crecimiento mensual, proyección anual, objetivo de margen) no se
 * pinta un número inventado — se omite la tarjeta.
 */

export type ProjectSummary = {
  id: number;
  name: string;
  client: string | null;
  location: string | null;
  status: "planning" | "execution" | "completed";
  /** metadata.budget de la división. */
  budget: number;
  /** Compras registradas contra el proyecto. */
  spent: number;
  /** Ventas facturadas al cliente del proyecto. */
  invoiced: number;
  /** Cobrado de esas ventas. */
  collected: number;
  /* collected / budget, acotado a 100. `null` si no hay presupuesto.
   *
   * El presupuesto de un proyecto aquí es lo que se le va a facturar al
   * cliente, no el coste previsto: BudgetModule y la barra de progreso de la
   * ficha ya miden el avance como cobrado ÷ presupuesto. La primera versión de
   * este hook lo medía contra las compras, y el mismo proyecto mostraba dos
   * porcentajes distintos según la pantalla. */
  consumption: number | null;
  invoiceCount: number;
};

export type DashboardMetrics = {
  isLoading: boolean;
  error: string | null;
  projects: ProjectSummary[];
  activeProjects: number;
  /** Documentos de tipo INVOICE efectivamente considerados. */
  invoiceCount: number;
  /** Ventas: subtotal sin impuestos. */
  salesNet: number;
  /** Compras: subtotal sin impuestos. */
  purchasesNet: number;
  /** salesNet - purchasesNet. */
  grossMargin: number;
  /** grossMargin / salesNet, en porcentaje. */
  grossMarginPct: number;
  /** resume.toCharge — por cobrar, con impuestos. */
  toCharge: number;
  toChargeCount: number;
  /** resume.toPay — por pagar. */
  toPay: number;
  toPayCount: number;
  /** resume.totalCharged — cobrado. */
  collected: number;
  /** resume.totalPaid — pagado. */
  paid: number;
  taxesCollected: number;
  taxesPaid: number;
};

const ESTADOS: Record<string, ProjectSummary["status"]> = {
  planificación: "planning",
  planificacion: "planning",
  planning: "planning",
  ejecución: "execution",
  ejecucion: "execution",
  execution: "execution",
  completado: "completed",
  completed: "completed",
  complete: "completed",
};

/** metadata llega como objeto o como texto JSON según el origen de la fila. */
function leerMetadata(division: Division): Record<string, unknown> {
  const meta = division.metadata as unknown;
  if (!meta) return {};
  if (typeof meta === "string") {
    try {
      return JSON.parse(meta) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return meta as Record<string, unknown>;
}

function texto(valor: unknown): string | null {
  const s = String(valor ?? "").trim();
  return s.length > 0 ? s : null;
}

function normalizarEstado(valor: unknown): ProjectSummary["status"] {
  const clave = String(valor ?? "")
    .trim()
    .toLowerCase();
  return ESTADOS[clave] ?? "planning";
}

export function useDashboardMetrics(): DashboardMetrics {
  const { divisions, pendingRecords, isLoading, error } = useErp();

  return useMemo(() => {
    const items: PendingRecord[] = pendingRecords?.items ?? [];
    const resume = pendingRecords?.resume;

    // Acumuladores por división en una sola pasada sobre las facturas.
    type Acc = {
      spent: number;
      invoiced: number;
      collected: number;
      count: number;
    };
    const porDivision = new Map<number, Acc>();
    const acc = (id: number): Acc => {
      const previo = porDivision.get(id);
      if (previo) return previo;
      const nuevo = { spent: 0, invoiced: 0, collected: 0, count: 0 };
      porDivision.set(id, nuevo);
      return nuevo;
    };

    let salesNet = 0;
    let purchasesNet = 0;

    for (const item of items) {
      // isSell se serializa como 0/1, no como booleano.
      const esVenta = Number(item.isSell) === 1;
      if (esVenta) salesNet += item.subTotal || 0;
      else purchasesNet += item.subTotal || 0;

      if (item.divisionId) {
        const a = acc(item.divisionId);
        a.count += 1;
        if (esVenta) {
          a.invoiced += item.amount || 0;
          a.collected += item.paid || 0;
        } else {
          a.spent += item.amount || 0;
        }
      }
    }

    const projects: ProjectSummary[] = divisions
      .filter((d) => (d.type as string) === "PROJECT")
      .map((d) => {
        const meta = leerMetadata(d);
        const budget = Number(meta.budget) || 0;
        const a = porDivision.get(d.id) ?? {
          spent: 0,
          invoiced: 0,
          collected: 0,
          count: 0,
        };
        return {
          id: d.id,
          name: d.name.trim(),
          client: texto(meta.client),
          location: texto(meta.location),
          status: normalizarEstado(meta.status),
          budget,
          spent: a.spent,
          invoiced: a.invoiced,
          collected: a.collected,
          consumption:
            budget > 0 ? Math.min((a.collected / budget) * 100, 100) : null,
          invoiceCount: a.count,
        };
      })
      // Los que más se mueven primero: es un tablero de trabajo, no un índice.
      .sort((a, b) => b.invoiceCount - a.invoiceCount || b.budget - a.budget);

    const grossMargin = salesNet - purchasesNet;

    return {
      isLoading,
      error,
      projects,
      activeProjects: projects.filter((p) => p.status === "execution").length,
      invoiceCount: items.length,
      salesNet,
      purchasesNet,
      grossMargin,
      grossMarginPct: salesNet > 0 ? (grossMargin / salesNet) * 100 : 0,
      toCharge: resume?.toCharge ?? 0,
      toChargeCount: resume?.toChargeRecordsCount ?? 0,
      toPay: resume?.toPay ?? 0,
      toPayCount: resume?.toPayRecordsCount ?? 0,
      collected: resume?.totalCharged ?? 0,
      paid: resume?.totalPaid ?? 0,
      taxesCollected: resume?.taxesCollected ?? 0,
      taxesPaid: resume?.taxesPaid ?? 0,
    };
  }, [divisions, pendingRecords, isLoading, error]);
}
