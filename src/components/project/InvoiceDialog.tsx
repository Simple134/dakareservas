"use client";

import { useState, useEffect, useRef } from "react";
import { X, ChevronDown, Check } from "lucide-react";
import { CustomButton, CustomCard } from "./CustomCard";
import { GestionoBeneficiary } from "@/src/types/gestiono";

interface InvoiceDialogProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    projectName?: string;
}

export function InvoiceDialog({
    isOpen,
    onClose,
    projectId,
    projectName,
}: InvoiceDialogProps) {
    const [invoiceNumber, setInvoiceNumber] = useState("");
    const [issueDate, setIssueDate] = useState(
        new Date().toISOString().split("T")[0]
    );
    const [selectedClient, setSelectedClient] = useState<GestionoBeneficiary | null>(null);
    const [clientSearch, setClientSearch] = useState("");
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const [clients, setClients] = useState<GestionoBeneficiary[]>([]);
    const [isLoadingClients, setIsLoadingClients] = useState(false);
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch clients from API
    useEffect(() => {
        const fetchClients = async () => {
            setIsLoadingClients(true);
            try {
                const params = new URLSearchParams({
                    withContacts: "true",
                    withTaxData: "true",
                });
                const response = await fetch(
                    `/api/gestiono/beneficiaries?${params.toString()}`
                );
                if (response.ok) {
                    const data = await response.json();
                    // Filter only clients
                    setClients(data);
                }
            } catch (error) {
                console.error("Error fetching clients:", error);
            } finally {
                setIsLoadingClients(false);
            }
        };

        if (isOpen) {
            fetchClients();
        }
    }, [isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setShowClientDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!isOpen) return null;

    const subtotal = amount;
    const itbis = subtotal * 0.18; // 18% ITBIS
    const total = subtotal + itbis;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-DO", {
            style: "currency",
            currency: "DOP",
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const handleSubmit = async () => {
        try {
            const invoiceData = {
                projectId,
                invoiceNumber,
                issueDate,
                clientId: selectedClient?.id,
                clientName: selectedClient?.name,
                rnc: selectedClient?.taxId || "",
                description,
                amount,
                subtotal,
                itbis,
                total,
            };

            console.log("Invoice data:", invoiceData);
            onClose();
        } catch (error) {
            console.error("Error creating invoice:", error);
        }
    };

    const filteredClients = clients.filter((client) =>
        client.name.toLowerCase().includes(clientSearch.toLowerCase())
    );

    const handleClientSelect = (client: GestionoBeneficiary) => {
        setSelectedClient(client);
        setClientSearch(client.name);
        setShowClientDropdown(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <CustomCard className="w-full max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 text-white p-6 flex justify-between items-center z-10 rounded-t-lg">
                    <div>
                        <h2 className="text-2xl font-bold">Nueva Factura de Venta</h2>
                        <p className="text-green-100 text-sm mt-1">
                            Proyecto: {projectName || "N/A"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-green-800 rounded-full p-2 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Invoice Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Número de Factura
                            </label>
                            <input
                                type="text"
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                placeholder="FACO-000000001"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Fecha de Emisión
                            </label>
                            <input
                                type="date"
                                value={issueDate}
                                onChange={(e) => setIssueDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Client Selector */}
                    <div className="relative" ref={dropdownRef}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cliente
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={clientSearch}
                                onChange={(e) => {
                                    setClientSearch(e.target.value);
                                    setShowClientDropdown(true);
                                    if (!e.target.value) {
                                        setSelectedClient(null);
                                    }
                                }}
                                onFocus={() => setShowClientDropdown(true)}
                                placeholder="Buscar cliente..."
                                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                            <ChevronDown
                                className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-transform ${showClientDropdown ? "rotate-180" : ""
                                    }`}
                            />
                        </div>

                        {/* Dropdown */}
                        {showClientDropdown && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {isLoadingClients ? (
                                    <div className="p-4 text-center text-gray-500">
                                        Cargando clientes...
                                    </div>
                                ) : filteredClients.length === 0 ? (
                                    <div className="p-4 text-center text-gray-500">
                                        No se encontraron clientes
                                    </div>
                                ) : (
                                    filteredClients.map((client) => (
                                        <button
                                            key={client.id}
                                            onClick={() => handleClientSelect(client)}
                                            className="w-full px-4 py-3 text-left hover:bg-green-50 transition-colors flex items-center justify-between"
                                        >
                                            <div>
                                                <p className="font-medium text-gray-900">
                                                    {client.name}
                                                </p>
                                                {client.taxId && (
                                                    <p className="text-sm text-gray-500">
                                                        RNC: {client.taxId}
                                                    </p>
                                                )}
                                            </div>
                                            {selectedClient?.id === client.id && (
                                                <Check className="w-5 h-5 text-green-600" />
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* RNC Display (read-only) */}
                    {selectedClient && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                RNC
                            </label>
                            <input
                                type="text"
                                value={selectedClient.taxId || "No disponible"}
                                readOnly
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                            />
                        </div>
                    )}

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Descripción del Servicio/Producto
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Detalle del servicio o producto facturado..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            rows={4}
                        />
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Monto Base (sin ITBIS)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                                RD$
                            </span>
                            <input
                                type="number"
                                value={amount || ""}
                                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                step="0.01"
                                className="w-full pl-14 pr-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="bg-gray-50 rounded-lg p-6">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">Subtotal</span>
                                <span className="font-medium text-gray-900">
                                    {formatCurrency(subtotal)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">ITBIS (18%)</span>
                                <span className="font-medium text-gray-900">
                                    {formatCurrency(itbis)}
                                </span>
                            </div>
                            <div className="border-t-2 border-gray-300 pt-3 flex justify-between items-center">
                                <span className="text-lg font-bold text-gray-900">
                                    TOTAL A PAGAR
                                </span>
                                <span className="text-2xl font-bold text-green-600">
                                    {formatCurrency(total)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex justify-end gap-3 rounded-b-lg">
                    <CustomButton
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-500 text-white hover:bg-gray-600"
                    >
                        Cancelar
                    </CustomButton>
                    <CustomButton
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-green-600 text-white hover:bg-green-700"
                    >
                        Guardar Factura
                    </CustomButton>
                </div>
            </CustomCard>
        </div>
    );
}
