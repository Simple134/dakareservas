"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, FileText, ShoppingCart } from "lucide-react";
import { CustomButton } from "./CustomCard";

interface PurchaseDropdownProps {
    onQuotationClick: () => void;
    onPurchaseOrderClick: () => void;
}

export function PurchaseDropdown({
    onQuotationClick,
    onPurchaseOrderClick,
}: PurchaseDropdownProps) {
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

    const handlePurchaseOrderClick = () => {
        onPurchaseOrderClick();
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <CustomButton
                onClick={() => setIsOpen(!isOpen)}
                className="bg-purple-600 text-white hover:bg-purple-700 shadow-sm flex items-center gap-2"
            >
                <ShoppingCart className="w-4 h-4" />
                Compra
                <ChevronDown
                    className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""
                        }`}
                />
            </CustomButton>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
                    <button
                        onClick={handleQuotationClick}
                        className="w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors flex items-center gap-3 border-b border-gray-100"
                    >
                        <FileText className="w-4 h-4 text-purple-600" />
                        <div>
                            <p className="font-medium text-gray-900">Cotización</p>
                            <p className="text-xs text-gray-500">
                                Crear nueva cotización
                            </p>
                        </div>
                    </button>
                    <button
                        onClick={handlePurchaseOrderClick}
                        className="w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors flex items-center gap-3"
                    >
                        <ShoppingCart className="w-4 h-4 text-purple-600" />
                        <div>
                            <p className="font-medium text-gray-900">Orden de Compra</p>
                            <p className="text-xs text-gray-500">
                                Crear orden de compra
                            </p>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
}
