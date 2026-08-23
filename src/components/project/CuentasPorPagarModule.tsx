"use client";

import { CuentaCorrienteModule } from "./CuentaCorrienteModule";
import { generateCuentasPorPagarPDF } from "@/lib/generateCuentasPorPagarPDF";

interface CuentasPorPagarModuleProps {
  projectId: string | number;
  projectName?: string;
}

export function CuentasPorPagarModule({
  projectId,
  projectName,
}: CuentasPorPagarModuleProps) {
  return (
    <CuentaCorrienteModule
      projectId={projectId}
      projectName={projectName}
      isSell={false}
      labels={{
        total: "Total en compras",
        aplicado: "Pagado",
        pendiente: "Pendiente por pagar",
        vacio: "No hay facturas de compra en este proyecto.",
        tabla: "Detalle de cuenta por pagar",
      }}
      onDownloadPDF={generateCuentasPorPagarPDF}
    />
  );
}
