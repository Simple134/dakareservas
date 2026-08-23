"use client";

import { useState, useEffect } from "react";
import { FileText, Pencil, CreditCard, BookOpen, X } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { SearchInput } from "@/src/components/ui/search-input";
import { SelectField } from "@/src/components/ui/native-select";
import { EmptyState } from "@/src/components/ui/empty-state";
import { cn } from "@/src/lib/utils";
import { LocalQuotationDialog } from "@/src/components/projects/LocalQuotationDialog";
import { EditLocalModal } from "@/src/components/projects/EditLocalModal";
import { LocalPaymentsModal } from "@/src/components/projects/LocalPaymentsModal";
import { LocalReservaModal } from "@/src/components/projects/LocalReservaModal";
import type { AppData } from "@/src/types/erp";

interface LocalesSectionProps {
  projectName: string;
  projectId: string;
  projectEndDate?: string;
  uniqueId?: string;
}

export function LocalesSection({
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
      const res = await fetch(`/api/erp/appData?${params.toString()}`);
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

  const statusVariant = (
    status: string,
  ): "success" | "warning" | "info" | "danger" | "default" => {
    switch (status) {
      case "VENDIDO":
        return "success";
      case "RESERVADO":
        return "warning";
      case "DISPONIBLE":
        return "info";
      case "BLOQUEADO":
        return "danger";
      default:
        return "default";
    }
  };

  /* La tarjeta entera iba teñida del color del estado (`bg-success-soft/50`
   * y compañía): una rejilla de veinte locales era un mosaico de cuatro
   * colores donde nada destacaba. El estado queda en la etiqueta y en un
   * filete lateral fino. */
  const statusRail = (status: string) => {
    switch (status) {
      case "VENDIDO":
        return "border-l-success";
      case "RESERVADO":
        return "border-l-warning";
      case "BLOQUEADO":
        return "border-l-danger";
      default:
        return "border-l-info";
    }
  };

  const hasPaymentsView = (status: string) =>
    ["VENDIDO", "RESERVADO", "BLOQUEADO"].includes(status);

  const getPaidByCurrency = (local: AppData): { USD: number; DOP: number } => {
    const reserva = reservasData.find(
      (r) => r.data?.locales_id === local.data?.id,
    );
    if (!reserva) {
      const total = (local.data?.payments ?? []).reduce(
        (s: number, p: { amount: number }) => s + p.amount,
        0,
      );
      return { USD: 0, DOP: total };
    }
    const approved = paymentsData.filter(
      (p) =>
        p.data?.allocation_id === reserva.data?.id &&
        p.data?.status === "approved",
    );
    return {
      USD: approved
        .filter((p) => p.data?.currency === "USD")
        .reduce((sum, p) => sum + ((p.data?.amount as number) ?? 0), 0),
      DOP: approved
        .filter((p) => p.data?.currency === "DOP")
        .reduce((sum, p) => sum + ((p.data?.amount as number) ?? 0), 0),
    };
  };

  const fmtAmt = (amount: number, currency: "USD" | "DOP") =>
    new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);

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

  const filtrosActivos =
    Boolean(searchTerm) ||
    selectedLevel !== "all" ||
    selectedStatus !== "all" ||
    Boolean(minPrice) ||
    Boolean(maxPrice) ||
    Boolean(minArea) ||
    Boolean(maxArea);

  const limpiarFiltros = () => {
    setSearchTerm("");
    setSelectedLevel("all");
    setSelectedStatus("all");
    setMinPrice("");
    setMaxPrice("");
    setMinArea("");
    setMaxArea("");
  };

  const cuenta = (estado: string) =>
    filtered.filter((l) => l.data?.status === estado).length;

  return (
    <>
      <div className="space-y-4">
        {/* Los cuatro recuentos eran bloques de color entero — verde, ámbar,
            azul y rojo a la vez, con la cifra del mismo tono que el fondo. El
            estado lo lleva el punto de la etiqueta, no la superficie. */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {(
            [
              ["Vendidos", "VENDIDO", "success"],
              ["Reservados", "RESERVADO", "warning"],
              ["Disponibles", "DISPONIBLE", "info"],
              ["Bloqueados", "BLOQUEADO", "danger"],
            ] as const
          ).map(([label, estado, variante]) => (
            <div
              key={estado}
              className="rounded-[12px] border border-rule bg-paper p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="eyebrow truncate">{label}</p>
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    variante === "success" && "bg-success",
                    variante === "warning" && "bg-warning",
                    variante === "info" && "bg-info",
                    variante === "danger" && "bg-danger",
                  )}
                  aria-hidden
                />
              </div>
              <p className="tabular mt-2 font-display text-[1.75rem] font-semibold leading-none tracking-[-0.02em] text-ink">
                {cuenta(estado)}
              </p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <section className="space-y-4 rounded-[12px] border border-rule bg-paper p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <h3 className="shrink-0 font-display text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">
              Locales comerciales
            </h3>
            <SearchInput
              className="flex-1"
              value={searchTerm}
              onValueChange={setSearchTerm}
              placeholder="Buscar por número de local…"
            />
            <p className="tabular shrink-0 text-[0.75rem] text-ink-3">
              {filtrosActivos
                ? `${filtered.length} de ${localesData.length}`
                : `${localesData.length} locales`}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SelectField
              label="Nivel"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
            >
              <option value="all">Todos los niveles</option>
              {Array.from(new Set(localesData.map((l) => l.data?.level)))
                .sort()
                .map((level) => (
                  <option key={level} value={level}>
                    Nivel {level}
                  </option>
                ))}
            </SelectField>

            <SelectField
              label="Estado"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="DISPONIBLE">Disponible</option>
              <option value="RESERVADO">Reservado</option>
              <option value="VENDIDO">Vendido</option>
              <option value="BLOQUEADO">Bloqueado</option>
            </SelectField>

            <div>
              <p className="eyebrow mb-1.5">Precio total</p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  numeric
                  placeholder="Mín"
                  aria-label="Precio mínimo"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
                <Input
                  type="number"
                  numeric
                  placeholder="Máx"
                  aria-label="Precio máximo"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>
            </div>

            <div>
              <p className="eyebrow mb-1.5">Área (m²)</p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  numeric
                  placeholder="Mín"
                  aria-label="Área mínima"
                  value={minArea}
                  onChange={(e) => setMinArea(e.target.value)}
                />
                <Input
                  type="number"
                  numeric
                  placeholder="Máx"
                  aria-label="Área máxima"
                  value={maxArea}
                  onChange={(e) => setMaxArea(e.target.value)}
                />
              </div>
            </div>
          </div>

          {filtrosActivos && (
            <div className="flex justify-end border-t border-rule pt-3">
              <Button variant="ghost" size="sm" onClick={limpiarFiltros}>
                <X className="mr-1.5 h-3.5 w-3.5" />
                Limpiar filtros
              </Button>
            </div>
          )}
        </section>

        {/* Locales Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((local) => {
            const paidByCurrency = getPaidByCurrency(local);
            const totalValue = local.data?.total_value || 0;
            const reserva = getReservaForLocal(local);
            // Use the currency of the actual payments (not the reserva header)
            const paymentCurrency: "USD" | "DOP" =
              paidByCurrency.USD > 0 ? "USD" : "DOP";
            const totalPaidMain =
              paymentCurrency === "USD"
                ? paidByCurrency.USD
                : paidByCurrency.DOP;
            const paidPct =
              totalValue > 0
                ? Math.min(100, Math.round((totalPaidMain / totalValue) * 100))
                : 0;
            const showPayments = hasPaymentsView(local.data?.status);

            return (
              <div
                key={local.id}
                className={cn(
                  "rounded-[12px] border border-l-2 border-rule bg-paper p-4",
                  "shadow-[0_1px_2px_rgba(7,35,75,0.04)]",
                  statusRail(local.data?.status || ""),
                )}
              >
                {/* Card header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-display text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">
                      Local #{local.data?.id}
                    </h4>
                    <p className="text-[0.75rem] text-ink-3">
                      Nivel {local.data?.level}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      variant={statusVariant(local.data?.status || "")}
                      dot
                    >
                      {local.data?.status}
                    </Badge>
                    {/* Edit button — always visible */}
                    <button
                      onClick={() => setEditModal({ isOpen: true, local })}
                      className="p-1.5 text-ink-3 hover:text-ink-2 hover:bg-paper/60 rounded-lg transition-colors"
                      title="Editar local"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Client info (if assigned) */}
                {local.data?.clientName && (
                  <p className="text-xs text-ink-2 mb-2 font-medium">
                    Cliente: {local.data.clientName}
                  </p>
                )}

                {/* Financial info */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-2">Área:</span>
                    <span className="font-semibold text-ink">
                      {local.data?.area_mt2?.toFixed(2)} m²
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-2">Precio/m²:</span>
                    <span className="font-semibold text-ink">
                      {fmtAmt(local.data?.price_per_mt2 || 0, "USD")}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-1.5 mt-1">
                    <span className="text-ink-2 font-medium">Valor Total:</span>
                    <span className="font-bold text-ink">
                      {fmtAmt(totalValue, "USD")}
                    </span>
                  </div>
                  {local.data?.separation_10 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-2">Separación:</span>
                      <span className="font-semibold text-ink-2">
                        {fmtAmt(local.data.separation_10, "USD")}
                      </span>
                    </div>
                  )}
                  {local.data?.separation_45 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-ink-2">Inicial:</span>
                      <span className="font-semibold text-ink-2">
                        {fmtAmt(local.data.separation_45, "USD")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Payment progress (for VENDIDO/RESERVADO/BLOQUEADO) */}
                {showPayments && totalValue > 0 && (
                  <div className="mt-3 pt-2 border-t border-current/10">
                    <div className="flex justify-between text-xs text-ink-3 mb-1">
                      <span>
                        Pagado{" "}
                        {[
                          paidByCurrency.USD > 0 &&
                            fmtAmt(paidByCurrency.USD, "USD"),
                          paidByCurrency.DOP > 0 &&
                            fmtAmt(paidByCurrency.DOP, "DOP"),
                        ]
                          .filter(Boolean)
                          .join(" + ") || "—"}{" "}
                        {paidPct > 0 && (
                          <span className="text-success font-medium">
                            ({paidPct}%)
                          </span>
                        )}
                      </span>
                      <span>
                        Pendiente{" "}
                        {fmtAmt(
                          Math.max(0, totalValue - totalPaidMain),
                          paymentCurrency,
                        )}
                      </span>
                    </div>
                    <div className="h-1.5 bg-paper/50 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success rounded-full transition-all duration-500"
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
                      className="flex-1 px-3 py-2 bg-info text-white rounded-lg hover:bg-info transition-colors font-medium flex items-center justify-center gap-1.5 text-sm"
                    >
                      <FileText className="w-4 h-4" />
                      Cotizar
                    </button>
                  )}

                  {reserva && (
                    <button
                      onClick={() => setReservaModal({ isOpen: true, local })}
                      className="flex-1 px-3 py-2 bg-info text-white rounded-lg hover:bg-info transition-colors font-medium flex items-center justify-center gap-1.5 text-sm"
                    >
                      <BookOpen className="w-4 h-4" />
                      Reserva
                    </button>
                  )}

                  {showPayments && (
                    <button
                      onClick={() => setPaymentsModal({ isOpen: true, local })}
                      className="flex-1 px-3 py-2 bg-shell text-white rounded-lg hover:bg-shell-3 transition-colors font-medium flex items-center justify-center gap-1.5 text-sm"
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
          <EmptyState
            title="No hay locales registrados"
            description="Este proyecto todavía no tiene unidades comerciales cargadas."
          />
        )}
        {localesData.length > 0 && filtered.length === 0 && (
          <EmptyState
            title="Ningún local coincide con los filtros"
            action={
              <Button variant="outline" size="sm" onClick={limpiarFiltros}>
                Limpiar filtros
              </Button>
            }
          />
        )}
      </div>

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
