"use client";

import { useState, useEffect } from "react";
import { Briefcase, FileText } from "lucide-react";
import { CustomCard } from "@/src/components/project/CustomCard";
import { CustomBadge } from "@/src/components/project/CustomCard";
import { LocalQuotationDialog } from "@/src/components/projects/LocalQuotationDialog";

interface LocalesSectionProps {
    formatCurrency: (amount: number) => string;
    projectName: string;
    projectId: string;
}

export function LocalesSection({ formatCurrency, projectName, projectId }: LocalesSectionProps) {
    const [localesData, setLocalesData] = useState<any[]>([]);

    // Locales filters
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedLevel, setSelectedLevel] = useState<string>("all");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");
    const [minPrice, setMinPrice] = useState<string>("");
    const [maxPrice, setMaxPrice] = useState<string>("");
    const [minArea, setMinArea] = useState<string>("");
    const [maxArea, setMaxArea] = useState<string>("");

    // Quotation dialog state
    const [quotationDialog, setQuotationDialog] = useState<{
        isOpen: boolean;
        selectedLocal: any | null;
    }>({ isOpen: false, selectedLocal: null });

    useEffect(() => {
        const fetchLocales = async () => {
            try {
                const queryParams = new URLSearchParams({
                    type: "locales",
                });
                const res = await fetch(`/api/gestiono/appData?${queryParams.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    // The API returns {appData: Array, organizations: Object}
                    if (data.appData && Array.isArray(data.appData)) {
                        setLocalesData(data.appData);
                    } else if (Array.isArray(data)) {
                        // Fallback in case structure changes
                        setLocalesData(data);
                    }
                } else {
                    console.error("Failed to fetch locales");
                }
            } catch (error) {
                console.error("Error fetching locales:", error);
            }
        };
        fetchLocales();
    }, []);

    const getFilteredLocales = () => {
        return localesData.filter((local) => {
            // Search filter
            if (searchTerm && !local.data?.id.toString().includes(searchTerm)) {
                return false;
            }
            // Level filter
            if (selectedLevel !== "all" && local.data?.level.toString() !== selectedLevel) {
                return false;
            }
            // Status filter
            if (selectedStatus !== "all" && local.data?.status !== selectedStatus) {
                return false;
            }
            // Price range filter
            if (minPrice && local.data?.total_value < parseFloat(minPrice)) {
                return false;
            }
            if (maxPrice && local.data?.total_value > parseFloat(maxPrice)) {
                return false;
            }
            // Area range filter
            if (minArea && local.data?.area_mt2 < parseFloat(minArea)) {
                return false;
            }
            if (maxArea && local.data?.area_mt2 > parseFloat(maxArea)) {
                return false;
            }
            return true;
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "VENDIDO":
                return "bg-green-100 text-green-800 border-green-200";
            case "RESERVADO":
                return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "DISPONIBLE":
                return "bg-blue-100 text-blue-800 border-blue-200";
            default:
                return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    return (
        <>
            <CustomCard className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-gray-500" />
                        <h3 className="font-semibold text-gray-900">Locales Comerciales</h3>
                    </div>
                    <div className="text-sm text-gray-600">
                        Total: {localesData.length} locales
                    </div>
                </div>

                {/* Filters Section */}
                <div className="mb-6 space-y-4">
                    {/* Search Bar */}
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar por número de local..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <svg
                            className="absolute left-3 top-3 w-4 h-4 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                    </div>

                    {/* Filter Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Level Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nivel
                            </label>
                            <select
                                value={selectedLevel}
                                onChange={(e) => setSelectedLevel(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">Todos los niveles</option>
                                {Array.from(new Set(localesData.map(l => l.data?.level))).sort().map(level => (
                                    <option key={level} value={level}>Nivel {level}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Estado
                            </label>
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="all">Todos los estados</option>
                                <option value="DISPONIBLE">Disponible</option>
                                <option value="RESERVADO">Reservado</option>
                                <option value="VENDIDO">Vendido</option>
                            </select>
                        </div>

                        {/* Price Range */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Precio Total
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    placeholder="Mín"
                                    value={minPrice}
                                    onChange={(e) => setMinPrice(e.target.value)}
                                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                                <input
                                    type="number"
                                    placeholder="Máx"
                                    value={maxPrice}
                                    onChange={(e) => setMaxPrice(e.target.value)}
                                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                            </div>
                        </div>

                        {/* Area Range */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Área (m²)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    placeholder="Mín"
                                    value={minArea}
                                    onChange={(e) => setMinArea(e.target.value)}
                                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                                <input
                                    type="number"
                                    placeholder="Máx"
                                    value={maxArea}
                                    onChange={(e) => setMaxArea(e.target.value)}
                                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Clear Filters Button */}
                    {(searchTerm || selectedLevel !== "all" || selectedStatus !== "all" || minPrice || maxPrice || minArea || maxArea) && (
                        <div className="flex justify-end">
                            <button
                                onClick={() => {
                                    setSearchTerm("");
                                    setSelectedLevel("all");
                                    setSelectedStatus("all");
                                    setMinPrice("");
                                    setMaxPrice("");
                                    setMinArea("");
                                    setMaxArea("");
                                }}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Limpiar filtros
                            </button>
                        </div>
                    )}
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                        <p className="text-sm text-gray-600 mb-1">Vendidos</p>
                        <p className="text-2xl font-bold text-green-700">
                            {getFilteredLocales().filter(l => l.data?.status === "VENDIDO").length}
                        </p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                        <p className="text-sm text-gray-600 mb-1">Reservados</p>
                        <p className="text-2xl font-bold text-yellow-700">
                            {getFilteredLocales().filter(l => l.data?.status === "RESERVADO").length}
                        </p>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-sm text-gray-600 mb-1">Disponibles</p>
                        <p className="text-2xl font-bold text-blue-700">
                            {getFilteredLocales().filter(l => l.data?.status === "DISPONIBLE").length}
                        </p>
                    </div>
                </div>

                {/* Filtered Results Counter */}
                {(searchTerm || selectedLevel !== "all" || selectedStatus !== "all" || minPrice || maxPrice || minArea || maxArea) && (
                    <div className="mb-4 text-sm text-gray-600">
                        Mostrando {getFilteredLocales().length} de {localesData.length} locales
                    </div>
                )}

                {/* Locales Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getFilteredLocales().map((local) => (
                        <div
                            key={local.id}
                            className={`p-4 rounded-lg border-2 ${local.data?.status === "VENDIDO"
                                ? "border-green-200 bg-green-50/50"
                                : local.data?.status === "RESERVADO"
                                    ? "border-yellow-200 bg-yellow-50/50"
                                    : "border-blue-200 bg-blue-50/50"
                                }`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h4 className="font-bold text-lg text-gray-900">
                                        Local #{local.data?.id}
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                        Nivel {local.data?.level}
                                    </p>
                                </div>
                                <CustomBadge
                                    className={getStatusColor(local.data?.status || "")}
                                >
                                    {local.data?.status}
                                </CustomBadge>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Área:</span>
                                    <span className="font-semibold text-gray-900">
                                        {local.data?.area_mt2?.toFixed(2)} m²
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Precio/m²:</span>
                                    <span className="font-semibold text-gray-900">
                                        {formatCurrency(local.data?.price_per_mt2 || 0)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm border-t pt-2">
                                    <span className="text-gray-600 font-medium">Valor Total:</span>
                                    <span className="font-bold text-gray-900">
                                        {formatCurrency(local.data?.total_value || 0)}
                                    </span>
                                </div>
                                {local.data?.separation_10 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Separación 10%:</span>
                                        <span className="font-semibold text-gray-700">
                                            {formatCurrency(local.data.separation_10)}
                                        </span>
                                    </div>
                                )}
                                {local.data?.separation_45 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Separación 45%:</span>
                                        <span className="font-semibold text-gray-700">
                                            {formatCurrency(local.data.separation_45)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Botón de Cotizar (solo para locales disponibles) */}
                            {local.data?.status === "DISPONIBLE" && (
                                <button
                                    onClick={() => setQuotationDialog({
                                        isOpen: true,
                                        selectedLocal: local.data
                                    })}
                                    className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                                >
                                    <FileText className="w-4 h-4" />
                                    Cotizar Local
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {localesData.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p>No hay locales registrados</p>
                    </div>
                )}
            </CustomCard>

            {/* Local Quotation Dialog */}
            <LocalQuotationDialog
                isOpen={quotationDialog.isOpen}
                onClose={() => setQuotationDialog({ isOpen: false, selectedLocal: null })}
                localData={quotationDialog.selectedLocal}
                projectName={projectName}
                projectId={projectId}
            />
        </>
    );
}
