"use client";

import { useMemo } from "react";
import { CuentaCorrienteModule, type CuentaRow } from "./CuentaCorrienteModule";
import { generateCuentasPorCobrarPDF } from "@/lib/generateCuentasPorCobrarPDF";
import { useCuentasLocales } from "@/src/hooks/useCuentasLocales";

/* La implementación está en CuentaCorrienteModule: este módulo y su gemelo de
 * pagar eran el mismo archivo duplicado. */

interface CuentasPorCobrarModuleProps {
  projectId: string | number;
  projectName?: string;
  /** Solo los proyectos con locales en venta tienen `unique_id`. */
  uniqueId?: string;
  onVerLocal?: (localId: number) => void;
}

export function CuentasPorCobrarModule({
  projectId,
  projectName,
  uniqueId,
  onVerLocal,
}: CuentasPorCobrarModuleProps) {
  const { cuentas, estado, reintentar } = useCuentasLocales(uniqueId);

  // Un local vendido es una factura más: entra en la misma tabla y totales.
  const filasLocales: CuentaRow[] = useMemo(
    () =>
      cuentas.map((c) => ({
        id: `local-${c.localId}`,
        fecha: c.fecha,
        descripcion: `${c.nombre} · Nivel ${c.nivel}`,
        detalle: c.cliente ?? "Sin cliente asignado",
        itbis: 0,
        isrRetenido: 0,
        montoTotal: c.valor,
        montoAplicado: c.cobrado,
        balancePendiente: c.pendiente,
        moneda: c.moneda,
        localId: c.localId,
      })),
    [cuentas],
  );

  return (
    <CuentaCorrienteModule
      projectId={projectId}
      projectName={projectName}
      isSell
      labels={{
        total: "Total facturado",
        aplicado: "Cobrado",
        pendiente: "Pendiente por cobrar",
        vacio: "No hay facturas de venta ni locales vendidos en este proyecto.",
        tabla: "Detalle de cuenta por cobrar",
      }}
      onDownloadPDF={generateCuentasPorCobrarPDF}
      extraRows={filasLocales}
      extraEstado={estado}
      onRetryExtra={reintentar}
      onVerLocal={onVerLocal}
    />
  );
}
