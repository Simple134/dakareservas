"use client";

import { CuentaCorrienteModule } from "./CuentaCorrienteModule";
import { generateCuentasPorCobrarPDF } from "@/lib/generateCuentasPorCobrarPDF";

/* La implementación está en CuentaCorrienteModule: este módulo y su gemelo de
 * pagar eran el mismo archivo duplicado. */

interface CuentasPorCobrarModuleProps {
  projectId: string | number;
  projectName?: string;
}

export function CuentasPorCobrarModule({
  projectId,
  projectName,
}: CuentasPorCobrarModuleProps) {
  return (
    <CuentaCorrienteModule
      projectId={projectId}
      projectName={projectName}
      isSell
      labels={{
        total: "Total facturado",
        aplicado: "Cobrado",
        pendiente: "Pendiente por cobrar",
        vacio: "No hay facturas de venta en este proyecto.",
        tabla: "Detalle de cuenta por cobrar",
      }}
      onDownloadPDF={generateCuentasPorCobrarPDF}
    />
  );
}
