"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { CustomButton, CustomCard } from "./CustomCard";

interface QuotationItem {
    id: string;
    articleNo: string;
    description: string;
    quantity: number;
    price: number;
    amount: number;
}

interface QuotationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    projectName?: string;
}

export function QuotationDialog({
    isOpen,
    onClose,
    projectId,
    projectName,
}: QuotationDialogProps) {
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [conditions, setConditions] = useState("");
    const [deliveryAddress, setDeliveryAddress] = useState("");
    const [responsiblePerson, setResponsiblePerson] = useState("");
    const [supplier, setSupplier] = useState("");
    const [phone, setPhone] = useState("");
    const [observations, setObservations] = useState("");
    const [discountPercent, setDiscountPercent] = useState(0);
    const [taxPercent, setTaxPercent] = useState(18);

    const [items, setItems] = useState<QuotationItem[]>([
        {
            id: "1",
            articleNo: "",
            description: "",
            quantity: 0,
            price: 0,
            amount: 0,
        },
    ]);

    if (!isOpen) return null;

    const addItem = () => {
        const newItem: QuotationItem = {
            id: Date.now().toString(),
            articleNo: "",
            description: "",
            quantity: 0,
            price: 0,
            amount: 0,
        };
        setItems([...items, newItem]);
    };

    const removeItem = (id: string) => {
        if (items.length > 1) {
            setItems(items.filter((item) => item.id !== id));
        }
    };

    const updateItem = (
        id: string,
        field: keyof QuotationItem,
        value: string | number
    ) => {
        setItems(
            items.map((item) => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };
                    if (field === "quantity" || field === "price") {
                        updated.amount = updated.quantity * updated.price;
                    }
                    return updated;
                }
                return item;
            })
        );
    };

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const discount = subtotal * (discountPercent / 100);
    const taxableAmount = subtotal - discount;
    const tax = taxableAmount * (taxPercent / 100);
    const total = taxableAmount + tax;

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("es-DO", {
            style: "currency",
            currency: "DOP",
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const handleSubmit = async () => {
        try {
            const quotationData = {
                projectId,
                date,
                conditions,
                deliveryAddress,
                responsiblePerson,
                supplier,
                phone,
                items,
                observations,
                subtotal,
                discountPercent,
                discount,
                taxPercent,
                tax,
                total,
            };

            console.log("Quotation data:", quotationData);
            onClose();
        } catch (error) {
            console.error("Error creating quotation:", error);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <CustomCard className="w-full max-w-6xl bg-white max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 flex justify-between items-center z-10 rounded-t-lg">
                    <div>
                        <h2 className="text-2xl font-bold">Nueva Cotización</h2>
                        <p className="text-purple-100 text-sm mt-1">
                            Proyecto: {projectName || "N/A"}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-purple-800 rounded-full p-2 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Fecha
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Condiciones de Pago
                            </label>
                            <input
                                type="text"
                                value={conditions}
                                onChange={(e) => setConditions(e.target.value)}
                                placeholder="Ej: 50% inicial, 50% final"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Persona Encargada
                            </label>
                            <input
                                type="text"
                                value={responsiblePerson}
                                onChange={(e) => setResponsiblePerson(e.target.value)}
                                placeholder="Nombre del contacto"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Supplier Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Suplidor
                            </label>
                            <input
                                type="text"
                                value={supplier}
                                onChange={(e) => setSupplier(e.target.value)}
                                placeholder="Nombre del suplidor"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Teléfono
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="809-000-0000"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Dirección de Entrega
                            </label>
                            <input
                                type="text"
                                value={deliveryAddress}
                                onChange={(e) => setDeliveryAddress(e.target.value)}
                                placeholder="Dirección del proyecto"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Items Table */}
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Artículos
                            </h3>
                            <CustomButton
                                onClick={addItem}
                                className="bg-purple-600 text-white hover:bg-purple-700"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Agregar Artículo
                            </CustomButton>
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            No.
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Descripción
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Cantidad
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Precio Unit.
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                                            Total
                                        </th>
                                        <th className="px-4 py-3 w-16"></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {items.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text"
                                                    value={item.articleNo}
                                                    onChange={(e) =>
                                                        updateItem(item.id, "articleNo", e.target.value)
                                                    }
                                                    placeholder={`${index + 1}`}
                                                    className="w-20 px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text"
                                                    value={item.description}
                                                    onChange={(e) =>
                                                        updateItem(item.id, "description", e.target.value)
                                                    }
                                                    placeholder="Descripción del artículo"
                                                    className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={item.quantity || ""}
                                                    onChange={(e) =>
                                                        updateItem(
                                                            item.id,
                                                            "quantity",
                                                            parseFloat(e.target.value) || 0
                                                        )
                                                    }
                                                    placeholder="0"
                                                    className="w-24 px-2 py-1 text-sm border border-gray-200 rounded text-right focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    value={item.price || ""}
                                                    onChange={(e) =>
                                                        updateItem(
                                                            item.id,
                                                            "price",
                                                            parseFloat(e.target.value) || 0
                                                        )
                                                    }
                                                    placeholder="0.00"
                                                    step="0.01"
                                                    className="w-32 px-2 py-1 text-sm border border-gray-200 rounded text-right focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 font-medium text-right">
                                                {formatCurrency(item.amount)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className="text-red-500 hover:text-red-700 disabled:text-gray-300"
                                                    disabled={items.length === 1}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Observations */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Observaciones
                        </label>
                        <textarea
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                            placeholder="Notas adicionales o instrucciones especiales..."
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            rows={3}
                        />
                    </div>

                    {/* Totals */}
                    <div className="bg-gray-50 rounded-lg p-6">
                        <div className="max-w-md ml-auto space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600">Subtotal</span>
                                <span className="font-medium text-gray-900">
                                    {formatCurrency(subtotal)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-600">Descuento</span>
                                    <input
                                        type="number"
                                        value={discountPercent}
                                        onChange={(e) =>
                                            setDiscountPercent(parseFloat(e.target.value) || 0)
                                        }
                                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-right"
                                        step="0.1"
                                        min="0"
                                        max="100"
                                    />
                                    <span className="text-gray-600">%</span>
                                </div>
                                <span className="font-medium text-red-600">
                                    -{formatCurrency(discount)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-600">Impuestos</span>
                                    <input
                                        type="number"
                                        value={taxPercent}
                                        onChange={(e) =>
                                            setTaxPercent(parseFloat(e.target.value) || 0)
                                        }
                                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded text-right"
                                        step="0.1"
                                        min="0"
                                        max="100"
                                    />
                                    <span className="text-gray-600">%</span>
                                </div>
                                <span className="font-medium text-gray-900">
                                    {formatCurrency(tax)}
                                </span>
                            </div>
                            <div className="border-t-2 border-gray-300 pt-3 flex justify-between items-center">
                                <span className="text-lg font-bold text-gray-900">TOTAL</span>
                                <span className="text-2xl font-bold text-purple-600">
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
                        className="px-6 py-2 bg-purple-600 text-white hover:bg-purple-700"
                    >
                        Guardar Cotización
                    </CustomButton>
                </div>
            </CustomCard>
        </div>
    );
}
