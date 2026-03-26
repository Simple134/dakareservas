"use client";

import { useState, useEffect } from "react";
import {
  Briefcase,
  FileText,
  Pencil,
  CreditCard,
  BookOpen,
} from "lucide-react";
import { CustomCard } from "@/src/components/project/CustomCard";
import { CustomBadge } from "@/src/components/project/CustomCard";
import { LocalQuotationDialog } from "@/src/components/projects/LocalQuotationDialog";
import { EditLocalModal } from "@/src/components/projects/EditLocalModal";
import { LocalPaymentsModal } from "@/src/components/projects/LocalPaymentsModal";
import { LocalReservaModal } from "@/src/components/projects/LocalReservaModal";
import type { AppData } from "@/src/types/gestiono";

interface LocalesSectionProps {
  formatCurrency: (amount: number) => string;
  projectName: string;
  projectId: string;
  projectEndDate?: string;
  uniqueId?: string;
}

export function LocalesSection({
  formatCurrency,
  projectName,
  projectId,
  projectEndDate,
  uniqueId,
}: LocalesSectionProps) {
  const [localesData, setLocalesData] = useState<AppData[]>([]);
  const [reservasData, setReservasData] = useState<AppData[]>([]);
  const [paymentsData, setPaymentsData] = useState<AppData[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [minArea, setMinArea] = useState<string>("");
  const [maxArea, setMaxArea] = useState<string>("");

  // Dialog state
  const [quotationDialog, setQuotationDialog] = useState<{
    isOpen: boolean;
    selectedLocal: Record<string, unknown> | null;
  }>({ isOpen: false, selectedLocal: null });

  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    local: AppData | null;
  }>({ isOpen: false, local: null });

  const [paymentsModal, setPaymentsModal] = useState<{
    isOpen: boolean;
    local: AppData | null;
  }>({ isOpen: false, local: null });

  const [reservaModal, setReservaModal] = useState<{
    isOpen: boolean;
    local: AppData | null;
  }>({ isOpen: false, local: null });

  useEffect(() => {
    if (!uniqueId) return;

    const fetchByType = async (type: string): Promise<AppData[]> => {
      const params = new URLSearchParams({ type, appId: uniqueId });
      const res = await fetch(`/api/gestiono/appData?${params.toString()}`);
      if (!res.ok) return [];
      const data = await res.json();
      if (data.appData && Array.isArray(data.appData)) return data.appData;
      if (Array.isArray(data)) return data;
      return [];
    };

    Promise.all([
      fetchByType("locales"),
      fetchByType("reservas"),
      fetchByType("payments"),
    ])
      .then(([locales, reservas, payments]) => {
        setLocalesData(locales);
        setReservasData(reservas);
        setPaymentsData(payments);
      })
      .catch((err) => console.error("Error fetching locales data:", err));
  }, [uniqueId]);

  const getReservaForLocal = (local: AppData): AppData | undefined =>
    reservasData.find((r) => r.data?.locales_id === local.data?.id);

  const getPaymentsForReserva = (reserva: AppData): AppData[] =>
    paymentsData.filter((p) => p.data?.allocation_id === reserva.data?.id);

  const getFilteredLocales = () =>
    localesData.filter((local) => {
      if (searchTerm && !local.data?.id?.toString().includes(searchTerm))
        return false;
      if (
        selectedLevel !== "all" &&
        local.data?.level.toString() !== selectedLevel
      )
        return false;
      if (selectedStatus !== "all" && local.data?.status !== selectedStatus)
        return false;
      if (minPrice && local.data?.total_value < parseFloat(minPrice))
        return false;
      if (maxPrice && local.data?.total_value > parseFloat(maxPrice))
        return false;
      if (minArea && local.data?.area_mt2 < parseFloat(minArea)) return false;
      if (maxArea && local.data?.area_mt2 > parseFloat(maxArea)) return false;
      return true;
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "VENDIDO":
        return "bg-green-100 text-green-800 border-green-200";
      case "RESERVADO":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "DISPONIBLE":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "BLOQUEADO":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getCardBorder = (status: string) => {
    switch (status) {
      case "VENDIDO":
        return "border-green-200 bg-green-50/50";
      case "RESERVADO":
        return "border-yellow-200 bg-yellow-50/50";
      case "BLOQUEADO":
        return "border-red-200 bg-red-50/50";
      default:
        return "border-blue-200 bg-blue-50/50";
    }
  };

  const hasPaymentsView = (status: string) =>
    ["VENDIDO", "RESERVADO", "BLOQUEADO"].includes(status);

  const getTotalPaid = (local: AppData): number => {
    const reserva = reservasData.find(
      (r) => r.data?.locales_id === local.data?.id,
    );
    if (!reserva) {
      // fallback to old embedded payments
      return (local.data?.payments ?? []).reduce(
        (s: number, p: { amount: number }) => s + p.amount,
        0,
      );
    }
    return paymentsData
      .filter(
        (p) =>
          p.data?.allocation_id === reserva.data?.id &&
          p.data?.status === "approved",
      )
      .reduce((sum, p) => sum + ((p.data?.amount as number) ?? 0), 0);
  };

  const handleLocalSaved = (updatedLocal: AppData) => {
    setLocalesData((prev) =>
      prev.map((l) => (l.id === updatedLocal.id ? updatedLocal : l)),
    );
    setEditModal({ isOpen: false, local: null });
  };

  const handlePaymentsSaved = (updatedLocal: AppData) => {
    setLocalesData((prev) =>
      prev.map((l) => (l.id === updatedLocal.id ? updatedLocal : l)),
    );
    setPaymentsModal({ isOpen: false, local: null });
  };

  const handleReservaUpdated = (updated: AppData) => {
    setReservasData((prev) =>
      prev.map((r) => (r.id === updated.id ? updated : r)),
    );
  };

  const handlePaymentUpdated = (updated: AppData) => {
    setPaymentsData((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p)),
    );
  };

  const handlePaymentDeleted = (id: number) => {
    setPaymentsData((prev) => prev.filter((p) => p.id !== id));
  };

  const filtered = getFilteredLocales();

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

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por número de local..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nivel
              </label>
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los niveles</option>
                {Array.from(new Set(localesData.map((l) => l.data?.level)))
                  .sort()
                  .map((level) => (
                    <option key={level} value={level}>
                      Nivel {level}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los estados</option>
                <option value="DISPONIBLE">Disponible</option>
                <option value="RESERVADO">Reservado</option>
                <option value="VENDIDO">Vendido</option>
                <option value="BLOQUEADO">Bloqueado</option>
              </select>
            </div>

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
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="number"
                  placeholder="Máx"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

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
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="number"
                  placeholder="Máx"
                  value={maxArea}
                  onChange={(e) => setMaxArea(e.target.value)}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          {(searchTerm ||
            selectedLevel !== "all" ||
            selectedStatus !== "all" ||
            minPrice ||
            maxPrice ||
            minArea ||
            maxArea) && (
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-green-50 rounded-lg border border-green-100">
            <p className="text-sm text-gray-600 mb-1">Vendidos</p>
            <p className="text-2xl font-bold text-green-700">
              {filtered.filter((l) => l.data?.status === "VENDIDO").length}
            </p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
            <p className="text-sm text-gray-600 mb-1">Reservados</p>
            <p className="text-2xl font-bold text-yellow-700">
              {filtered.filter((l) => l.data?.status === "RESERVADO").length}
            </p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm text-gray-600 mb-1">Disponibles</p>
            <p className="text-2xl font-bold text-blue-700">
              {filtered.filter((l) => l.data?.status === "DISPONIBLE").length}
            </p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg border border-red-100">
            <p className="text-sm text-gray-600 mb-1">Bloqueados</p>
            <p className="text-2xl font-bold text-red-600">
              {filtered.filter((l) => l.data?.status === "BLOQUEADO").length}
            </p>
          </div>
        </div>

        {(searchTerm ||
          selectedLevel !== "all" ||
          selectedStatus !== "all" ||
          minPrice ||
          maxPrice ||
          minArea ||
          maxArea) && (
          <div className="mb-4 text-sm text-gray-600">
            Mostrando {filtered.length} de {localesData.length} locales
          </div>
        )}

        {/* Locales Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((local) => {
            const totalPaid = getTotalPaid(local);
            const totalValue = local.data?.total_value || 0;
            const paidPct =
              totalValue > 0
                ? Math.min(100, Math.round((totalPaid / totalValue) * 100))
                : 0;
            const showPayments = hasPaymentsView(local.data?.status);
            const reserva = getReservaForLocal(local);

            return (
              <div
                key={local.id}
                className={`p-4 rounded-lg border-2 ${getCardBorder(local.data?.status)}`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">
                      Local #{local.data?.id}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Nivel {local.data?.level}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CustomBadge
                      className={getStatusColor(local.data?.status || "")}
                    >
                      {local.data?.status}
                    </CustomBadge>
                    {/* Edit button — always visible */}
                    <button
                      onClick={() => setEditModal({ isOpen: true, local })}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-white/60 rounded-lg transition-colors"
                      title="Editar local"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Client info (if assigned) */}
                {local.data?.clientName && (
                  <p className="text-xs text-gray-600 mb-2 font-medium">
                    Cliente: {local.data.clientName}
                  </p>
                )}

                {/* Financial info */}
                <div className="space-y-1.5">
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
                  <div className="flex justify-between text-sm border-t pt-1.5 mt-1">
                    <span className="text-gray-600 font-medium">
                      Valor Total:
                    </span>
                    <span className="font-bold text-gray-900">
                      {formatCurrency(totalValue)}
                    </span>
                  </div>
                  {local.data?.separation_10 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Separación:</span>
                      <span className="font-semibold text-gray-700">
                        {formatCurrency(local.data.separation_10)}
                      </span>
                    </div>
                  )}
                  {local.data?.separation_45 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Inicial:</span>
                      <span className="font-semibold text-gray-700">
                        {formatCurrency(local.data.separation_45)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Payment progress (for VENDIDO/RESERVADO/BLOQUEADO) */}
                {showPayments && totalValue > 0 && (
                  <div className="mt-3 pt-2 border-t border-current/10">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>
                        Pagado {formatCurrency(totalPaid)}{" "}
                        <span className="text-green-600 font-medium">
                          ({paidPct}%)
                        </span>
                      </span>
                      <span>
                        Pendiente{" "}
                        {formatCurrency(Math.max(0, totalValue - totalPaid))}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all duration-500"
                        style={{ width: `${paidPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-4 flex gap-2">
                  {local.data?.status === "DISPONIBLE" && (
                    <button
                      onClick={() =>
                        setQuotationDialog({
                          isOpen: true,
                          selectedLocal: local.data as Record<string, unknown>,
                        })
                      }
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-1.5 text-sm"
                    >
                      <FileText className="w-4 h-4" />
                      Cotizar
                    </button>
                  )}

                  {reserva && (
                    <button
                      onClick={() => setReservaModal({ isOpen: true, local })}
                      className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-1.5 text-sm"
                    >
                      <BookOpen className="w-4 h-4" />
                      Reserva
                    </button>
                  )}

                  {showPayments && (
                    <button
                      onClick={() => setPaymentsModal({ isOpen: true, local })}
                      className="flex-1 px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center justify-center gap-1.5 text-sm"
                    >
                      <CreditCard className="w-4 h-4" />
                      Pagos
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {localesData.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No hay locales registrados</p>
          </div>
        )}
      </CustomCard>

      {/* Quotation Dialog */}
      <LocalQuotationDialog
        isOpen={quotationDialog.isOpen}
        onClose={() =>
          setQuotationDialog({ isOpen: false, selectedLocal: null })
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        localData={quotationDialog.selectedLocal as any}
        projectName={projectName}
        projectId={projectId}
        projectEndDate={projectEndDate}
      />

      {/* Edit Local Modal */}
      {editModal.isOpen && editModal.local && (
        <EditLocalModal
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          local={editModal.local as any}
          onClose={() => setEditModal({ isOpen: false, local: null })}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onSave={(u: any) => handleLocalSaved(u as AppData)}
        />
      )}

      {/* Payments Modal */}
      {paymentsModal.isOpen && paymentsModal.local && (
        <LocalPaymentsModal
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          local={paymentsModal.local as any}
          onClose={() => setPaymentsModal({ isOpen: false, local: null })}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onSave={(u: any) => handlePaymentsSaved(u as AppData)}
        />
      )}

      {/* Reserva Modal */}
      {reservaModal.isOpen &&
        reservaModal.local &&
        (() => {
          const reserva = getReservaForLocal(reservaModal.local);
          if (!reserva) return null;
          const payments = getPaymentsForReserva(reserva);
          const local = reservaModal.local;
          return (
            <LocalReservaModal
              localId={local.data?.id as number}
              localLevel={local.data?.level as number}
              localArea={local.data?.area_mt2 as number}
              reserva={reserva}
              payments={payments}
              onClose={() => setReservaModal({ isOpen: false, local: null })}
              onReservaUpdated={handleReservaUpdated}
              onPaymentUpdated={handlePaymentUpdated}
              onPaymentDeleted={handlePaymentDeleted}
            />
          );
        })()}
    </>
  );
}
