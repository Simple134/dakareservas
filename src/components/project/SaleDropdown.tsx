"use client";

import { FileText, Receipt } from "lucide-react";
import { MenuButton } from "@/src/components/ui/menu-button";

/* La mecánica del desplegable (clic fuera, Escape, foco) vive en MenuButton:
 * aquí sólo quedan las opciones. */

interface SaleDropdownProps {
  onQuotationClick: () => void;
  onInvoiceClick: () => void;
}

export function SaleDropdown({
  onQuotationClick,
  onInvoiceClick,
}: SaleDropdownProps) {
  return (
    <MenuButton
      label="Venta"
      icon={Receipt}
      options={[
        {
          label: "Cotización",
          hint: "Propuesta al cliente",
          icon: FileText,
          tone: "success",
          onSelect: onQuotationClick,
        },
        {
          label: "Factura",
          hint: "Documento fiscal de venta",
          icon: Receipt,
          tone: "success",
          onSelect: onInvoiceClick,
        },
      ]}
    />
  );
}
