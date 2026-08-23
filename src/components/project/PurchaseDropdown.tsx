"use client";

import { FileText, Receipt, ShoppingCart } from "lucide-react";
import { MenuButton } from "@/src/components/ui/menu-button";

interface PurchaseDropdownProps {
  onQuotationClick: () => void;
  onPurchaseOrderClick: () => void;
  onInvoiceClick: () => void;
}

export function PurchaseDropdown({
  onQuotationClick,
  onPurchaseOrderClick,
  onInvoiceClick,
}: PurchaseDropdownProps) {
  return (
    <MenuButton
      label="Compra"
      icon={ShoppingCart}
      options={[
        {
          label: "Cotización",
          hint: "Solicitud a un proveedor",
          icon: FileText,
          tone: "info",
          onSelect: onQuotationClick,
        },
        {
          label: "Orden de compra",
          hint: "Compromiso con el proveedor",
          icon: ShoppingCart,
          tone: "info",
          onSelect: onPurchaseOrderClick,
        },
        {
          label: "Factura",
          hint: "Documento fiscal de compra",
          icon: Receipt,
          tone: "info",
          onSelect: onInvoiceClick,
        },
      ]}
    />
  );
}
