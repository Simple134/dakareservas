"use client";

import { useState } from "react";
import {
  X,
  FileText,
  ExternalLink,
  Loader2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Receipt,
} from "lucide-react";
import type { AppData } from "@/src/types/gestiono";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReservaData {
  id: string;
  locales_id: number;
  status: "approved" | "pending" | string;
  currency: string;
  payment_method: string;
  user_type: "fisica" | "juridica" | string;
  persona_fisica_id: string;
  persona_juridica_id: string;
  product_id: string;
  cotizacion_url: string;
  created_at: string;
}

export interface PaymentData {
  id: string;
  allocation_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  receipt_url: string;
  status: "approved" | "rejected" | string;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "DOP",
    minimumFractionDigits: 2,
  }).format(amount);

const formatDate = (dateStr: string) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle2 className="w-3 h-3" /> Aprobado
      </span>
    );
  if (status === "rejected")
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <XCircle className="w-3 h-3" /> Rechazado
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
      <Clock className="w-3 h-3" /> Pendiente
    </span>
  );
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface LocalReservaModalProps {
  localId: number;
  localLevel: number;
  localArea: number;
  reserva: AppData;
  payments: AppData[];
  onClose: () => void;
  onReservaUpdated: (updated: AppData) => void;
  onPaymentUpdated: (updated: AppData) => void;
  onPaymentDeleted: (id: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LocalReservaModal({
  localId,
  localLevel,
  localArea,
  reserva,
  payments,
  onClose,
  onReservaUpdated,
  onPaymentUpdated,
  onPaymentDeleted,
}: LocalReservaModalProps) {
  const reservaData = reserva.data as ReservaData;

  const [reservaStatus, setReservaStatus] = useState(reservaData.status);
  const [savingReserva, setSavingReserva] = useState(false);

  const [paymentStatuses, setPaymentStatuses] = useState<
    Record<number, string>
  >(() =>
    Object.fromEntries(
      payments.map((p) => [p.id, (p.data as PaymentData).status]),
    ),
  );
  const [savingPayment, setSavingPayment] = useState<number | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<number | null>(null);

  const approvedPayments = payments.filter(
    (p) => (p.data as PaymentData).status === "approved",
  );
  const totalApproved = approvedPayments.reduce(
    (sum, p) => sum + (p.data as PaymentData).amount,
    0,
  );

  const handleSaveReserva = async () => {
    if (reservaStatus === reservaData.status) return;
    setSavingReserva(true);
    try {
      const res = await fetch("/api/gestiono/appData", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: reserva.id,
          appId: reserva.appId,
          type: reserva.type,
          data: { ...reservaData, status: reservaStatus },
          strategy: "replace",
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      const updated = await res.json();
      onReservaUpdated(updated);
    } catch (err) {
      console.error(err);
      alert("Error al actualizar la reserva");
    } finally {
      setSavingReserva(false);
    }
  };

  const handleSavePaymentStatus = async (payment: AppData) => {
    const newStatus = paymentStatuses[payment.id];
    const currentStatus = (payment.data as PaymentData).status;
    if (newStatus === currentStatus) return;
    setSavingPayment(payment.id);
    try {
      const res = await fetch("/api/gestiono/appData", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: payment.id,
          appId: payment.appId,
          type: payment.type,
          data: { ...(payment.data as PaymentData), status: newStatus },
          strategy: "replace",
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      const updated = await res.json();
      onPaymentUpdated(updated);
    } catch (err) {
      console.error(err);
      alert("Error al actualizar el pago");
    } finally {
      setSavingPayment(null);
    }
  };

  const handleDeletePayment = async (payment: AppData) => {
    if (!confirm("¿Eliminar este pago? Esta acción no se puede deshacer."))
      return;
    setDeletingPayment(payment.id);
    try {
      const res = await fetch(`/api/gestiono/appData?id=${payment.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al eliminar");
      onPaymentDeleted(payment.id);
    } catch (err) {
      console.error(err);
      alert("Error al eliminar el pago");
    } finally {
      setDeletingPayment(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Reserva — Local #{localId}
            </h2>
            <p className="text-sm text-gray-500">
              Nivel {localLevel} • {localArea?.toFixed(2)} m²
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Reserva Details */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Información de la Reserva
            </p>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-gray-500">Fecha:</span>{" "}
                <span className="font-medium text-gray-800">
                  {formatDate(reservaData.created_at)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Tipo cliente:</span>{" "}
                <span className="font-medium text-gray-800 capitalize">
                  Persona {reservaData.user_type}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Moneda:</span>{" "}
                <span className="font-medium text-gray-800">
                  {reservaData.currency}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Método de pago:</span>{" "}
                <span className="font-medium text-gray-800">
                  {reservaData.payment_method || "—"}
                </span>
              </div>
            </div>

            {reservaData.cotizacion_url && (
              <a
                href={reservaData.cotizacion_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                <FileText className="w-4 h-4" />
                Ver cotización
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {/* Estado editable */}
            <div className="flex items-center gap-3 pt-1">
              <label className="text-sm text-gray-500">Estado:</label>
              <select
                value={reservaStatus}
                onChange={(e) => setReservaStatus(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="approved">Aprobado</option>
                <option value="pending">Pendiente</option>
              </select>
              {reservaStatus !== reservaData.status && (
                <button
                  onClick={handleSaveReserva}
                  disabled={savingReserva}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingReserva && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Guardar
                </button>
              )}
            </div>
          </div>

          {/* Payments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Pagos ({payments.length})
              </p>
              {approvedPayments.length > 0 && (
                <p className="text-sm font-semibold text-green-700">
                  Total aprobado:{" "}
                  {formatCurrency(
                    totalApproved,
                    (approvedPayments[0].data as PaymentData).currency,
                  )}
                </p>
              )}
            </div>

            {payments.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No hay pagos registrados para esta reserva
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((payment) => {
                  const pd = payment.data as PaymentData;
                  const currentStatus =
                    paymentStatuses[payment.id] ?? pd.status;
                  const isDirty = currentStatus !== pd.status;
                  const isDeleting = deletingPayment === payment.id;
                  const isSaving = savingPayment === payment.id;

                  return (
                    <div
                      key={payment.id}
                      className="border border-gray-200 rounded-lg p-3 flex items-start gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-gray-900">
                            {formatCurrency(pd.amount, pd.currency)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {pd.currency}
                          </span>
                          <StatusBadge status={pd.status} />
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                          <span>{formatDate(pd.created_at)}</span>
                          {pd.payment_method && pd.payment_method !== "N/A" && (
                            <span className="capitalize">
                              {pd.payment_method}
                            </span>
                          )}
                          {pd.receipt_url && (
                            <a
                              href={pd.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                            >
                              <Receipt className="w-3 h-3" />
                              Comprobante
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Status edit + save */}
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={currentStatus}
                          onChange={(e) =>
                            setPaymentStatuses((prev) => ({
                              ...prev,
                              [payment.id]: e.target.value,
                            }))
                          }
                          className="px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="approved">Aprobado</option>
                          <option value="rejected">Rechazado</option>
                        </select>
                        {isDirty && (
                          <button
                            onClick={() => handleSavePaymentStatus(payment)}
                            disabled={isSaving}
                            className="p-1.5 text-xs text-white bg-gray-900 rounded-lg hover:bg-gray-700 disabled:opacity-50"
                          >
                            {isSaving ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              "Guardar"
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePayment(payment)}
                          disabled={isDeleting}
                          className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded disabled:opacity-50"
                          title="Eliminar pago"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
