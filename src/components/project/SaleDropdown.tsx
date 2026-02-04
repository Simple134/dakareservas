"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, FileText, Receipt, TrendingUp } from "lucide-react";
import { CustomButton } from "./CustomCard";

interface SaleDropdownProps {
  onQuotationClick: () => void;
  onInvoiceClick: () => void;
}

export function SaleDropdown({
  onQuotationClick,
  onInvoiceClick,
}: SaleDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleQuotationClick = () => {
    onQuotationClick();
    setIsOpen(false);
  };

  const handleInvoiceClick = () => {
    onInvoiceClick();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <CustomButton
        onClick={() => setIsOpen(!isOpen)}
        className="bg-green-600 text-white hover:bg-green-700 shadow-sm flex items-center gap-2"
      >
        <Receipt className="w-4 h-4" />
        Venta
        <ChevronDown
          className={`w-4 h-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </CustomButton>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
          <button
            onClick={handleQuotationClick}
            className="w-full px-4 py-3 text-left hover:bg-green-50 transition-colors flex items-center gap-3 border-b border-gray-100"
          >
            <FileText className="w-4 h-4 text-green-600" />
            <div>
              <p className="font-medium text-gray-900">Cotización</p>
              <p className="text-xs text-gray-500">Crear nueva cotización</p>
            </div>
          </button>
          <button
            onClick={handleInvoiceClick}
            className="w-full px-4 py-3 text-left hover:bg-green-50 transition-colors flex items-center gap-3"
          >
            <Receipt className="w-4 h-4 text-green-600" />
            <div>
              <p className="font-medium text-gray-900">Factura</p>
              <p className="text-xs text-gray-500">Crear factura de venta</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
