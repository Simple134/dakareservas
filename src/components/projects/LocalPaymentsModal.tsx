"use client";

import { useState } from "react";
import {
  X,
  Plus,
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
  Trash2,
  Upload,
  FileText,
  ExternalLink,
} from "lucide-react";

export interface LocalPayment {
  id: string;
  amount: number;
  date: string;
  type: "separacion" | "inicial" | "cuota" | "capital" | "otro";
  description: string;
  cuotaNumber?: number;
  receipt_url?: string;
}

interface LocalData {
  id: number;
  level: number;
  area_mt2: number;
  price_per_mt2: number;
  total_value: number;
  separation_10?: number;
  separation_45?: number;
  status: string;
  clientName?: string;
  payments?: LocalPayment[];
  [key: string]: unknown;
}

interface AppDataLocal {
  id: number;
  appId: number;
  type: string;
  data: LocalData;
}

interface LocalPaymentsModalProps {
  local: AppDataLocal;
  onClose: () => void;
  onSave: (updatedLocal: AppDataLocal) => void;
}

const PAYMENT_TYPES = [
  { value: "separacion", label: "Separación" },
  { value: "inicial", label: "Inicial" },
  { value: "cuota", label: "Cuota mensual" },
  { value: "capital", label: "Capital" },
  { value: "otro", label: "Otro" },
] as const;

const TYPE_COLORS: Record<string, string> = {
  separacion: "bg-purple-100 text-purple-700",
  inicial: "bg-yellow-100 text-yellow-700",
  cuota: "bg-blue-100 text-blue-700",
  capital: "bg-green-100 text-green-700",
  otro: "bg-gray-100 text-gray-700",
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 0,
  }).format(n);

const formatDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

function generateId() {
  return `pay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function LocalPaymentsModal({
  local,
  onClose,
  onSave,
}: LocalPaymentsModalProps) {
  const [payments, setPayments] = useState<LocalPayment[]>(
    local.data.payments ?? [],
  );
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newPayment, setNewPayment] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    type: "cuota" as LocalPayment["type"],
    description: "",
    cuotaNumber: "",
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const sep10 = local.data.separation_10 ?? local.data.total_value * 0.1;
  const sep45 = local.data.separation_45 ?? local.data.total_value * 0.45;
  const capital = local.data.total_value - sep10 - sep45;

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
  const totalPending = local.data.total_value - totalPaid;
  const paidPct =
    local.data.total_value > 0
      ? Math.min(100, Math.round((totalPaid / local.data.total_value) * 100))
      : 0;

  const addPayment = async () => {
    const amount = parseFloat(newPayment.amount);
    if (!amount || amount <= 0) return;

    let receipt_url: string | undefined;

    if (receiptFile) {
      setIsUploading(true);
      try {
        const prefix = payments.length + 1;
        const prefixedFile = new File(
          [receiptFile],
          `${prefix}_${receiptFile.name}`,
          { type: receiptFile.type },
        );
        const formData = new FormData();
        formData.append("file", prefixedFile);
        const uploadRes = await fetch("/api/gestiono/uploadFile", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) throw new Error("Error al subir el comprobante");
        const uploadData = await uploadRes.json();
        receipt_url = uploadData.file?.public || uploadData.file?.url;
      } catch (err) {
        console.error(err);
        alert("Error al subir el comprobante");
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    const payment: LocalPayment = {
      id: generateId(),
      amount,
      date: newPayment.date,
      type: newPayment.type,
      description:
        newPayment.description ||
        PAYMENT_TYPES.find((t) => t.value === newPayment.type)?.label ||
        newPayment.type,
      ...(newPayment.type === "cuota" && newPayment.cuotaNumber
        ? { cuotaNumber: parseInt(newPayment.cuotaNumber) }
        : {}),
      ...(receipt_url ? { receipt_url } : {}),
    };
    setPayments((prev) => [payment, ...prev]);
    setNewPayment({
      amount: "",
      date: new Date().toISOString().split("T")[0],
      type: "cuota",
      description: "",
      cuotaNumber: "",
    });
    setReceiptFile(null);
    setShowForm(false);
  };

  const removePayment = async (id: string) => {
    setDeletingId(id);
    const updated = payments.filter((p) => p.id !== id);
    try {
      const updatedData = { ...local.data, payments: updated };
      const res = await fetch("/api/gestiono/appData", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: local.id,
          appId: local.appId,
          type: local.type,
          data: updatedData,
          strategy: "merge",
        }),
      });
      if (!res.ok) throw new Error("Error al eliminar");
      setPayments(updated);
      onSave({ ...local, data: updatedData });
    } catch (error) {
      console.error("Error deleting payment:", error);
      alert("Error al eliminar el pago");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedData = { ...local.data, payments };
      const res = await fetch("/api/gestiono/appData", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: local.id,
          appId: local.appId,
          type: local.type,
          data: updatedData,
          strategy: "merge",
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      onSave({ ...local, data: updatedData });
    } catch (error) {
      console.error("Error saving payments:", error);
      alert("Error al guardar los pagos");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Pagos — Local #{local.data.id}
            </h2>
            <p className="text-sm text-gray-500">
              Nivel {local.data.level} • {local.data.area_mt2?.toFixed(2)} m²
              {local.data.clientName && ` • ${local.data.clientName}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500">Valor Total</span>
              </div>
              <p className="text-base font-bold text-gray-900">
                {formatCurrency(local.data.total_value)}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-100">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-xs text-gray-500">Pagado</span>
              </div>
              <p className="text-base font-bold text-green-700">
                {formatCurrency(totalPaid)}
              </p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-orange-400" />
                <span className="text-xs text-gray-500">Pendiente</span>
              </div>
              <p className="text-base font-bold text-orange-600">
                {formatCurrency(totalPending)}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Pagado {paidPct}%</span>
              <span>Pendiente {100 - paidPct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${paidPct}%` }}
              />
            </div>
          </div>

          {/* Payment plan breakdown */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Plan de Pago
            </p>
            {[
              { label: "Separación (10%)", amount: sep10, type: "separacion" },
              { label: "Inicial (45%)", amount: sep45, type: "inicial" },
              {
                label: "Capital restante (45%)",
                amount: capital,
                type: "capital",
              },
            ].map(({ label, amount, type }) => {
              const paid = payments
                .filter((p) => p.type === type)
                .reduce((s, p) => s + p.amount, 0);
              const pending = Math.max(0, amount - paid);
              return (
                <div
                  key={type}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-600">{label}</span>
                  <div className="flex items-center gap-3 text-right">
                    <span className="text-green-600 font-medium">
                      {formatCurrency(paid)}
                    </span>
                    <span className="text-gray-300">/</span>
                    <span className="text-gray-700 font-medium">
                      {formatCurrency(amount)}
                    </span>
                    {pending > 0 && (
                      <span className="text-orange-500 text-xs">
                        -{formatCurrency(pending)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add payment button */}
          <div>
            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Registrar pago
              </button>
            ) : (
              <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
                <p className="text-sm font-semibold text-gray-700">
                  Nuevo pago
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Tipo
                    </label>
                    <select
                      value={newPayment.type}
                      onChange={(e) =>
                        setNewPayment((p) => ({
                          ...p,
                          type: e.target.value as LocalPayment["type"],
                        }))
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {PAYMENT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={newPayment.date}
                      onChange={(e) =>
                        setNewPayment((p) => ({ ...p, date: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Monto (DOP)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newPayment.amount}
                      onChange={(e) =>
                        setNewPayment((p) => ({ ...p, amount: e.target.value }))
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  {newPayment.type === "cuota" && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        # Cuota
                      </label>
                      <input
                        type="number"
                        placeholder="1"
                        value={newPayment.cuotaNumber}
                        onChange={(e) =>
                          setNewPayment((p) => ({
                            ...p,
                            cuotaNumber: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">
                      Descripción (opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Notas del pago..."
                      value={newPayment.description}
                      onChange={(e) =>
                        setNewPayment((p) => ({
                          ...p,
                          description: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs text-gray-600 mb-1">
                      Comprobante (opcional)
                    </label>
                    {receiptFile ? (
                      <div className="flex items-center gap-2 p-2 border border-blue-200 bg-blue-50 rounded-lg">
                        {receiptFile.type.startsWith("image/") ? (
                          <img
                            src={URL.createObjectURL(receiptFile)}
                            alt="preview"
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                        )}
                        <span className="text-xs text-gray-700 truncate flex-1">
                          {receiptFile.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setReceiptFile(null)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 w-full px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                        <Upload className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          Subir imagen o PDF
                        </span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,application/pdf"
                          onChange={(e) => {
                            if (e.target.files?.[0])
                              setReceiptFile(e.target.files[0]);
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={addPayment}
                    disabled={isUploading}
                    className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isUploading && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    {isUploading ? "Subiendo..." : "Agregar"}
                  </button>
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Payments table */}
          {payments.length > 0 ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Fecha
                    </th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Tipo
                    </th>
                    <th className="text-left py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Descripción
                    </th>
                    <th className="text-right py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Monto
                    </th>
                    <th className="py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Comp.
                    </th>
                    <th className="py-2 px-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="py-2.5 px-4 text-gray-500 whitespace-nowrap text-xs">
                        {formatDate(p.date)}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[p.type] || "bg-gray-100 text-gray-700"}`}
                        >
                          {PAYMENT_TYPES.find((t) => t.value === p.type)
                            ?.label ?? p.type}
                          {p.cuotaNumber ? ` #${p.cuotaNumber}` : ""}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-gray-700">
                        {p.description}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-gray-900 whitespace-nowrap">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        {p.receipt_url ? (
                          <a
                            href={p.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-500 hover:text-blue-700"
                            title="Ver comprobante"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-gray-200">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-2">
                        <button
                          onClick={() => removePayment(p.id)}
                          disabled={deletingId === p.id}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded disabled:opacity-50"
                        >
                          {deletingId === p.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td
                      colSpan={3}
                      className="py-2.5 px-4 text-xs font-bold text-gray-600 uppercase"
                    >
                      Total pagado
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-green-700 whitespace-nowrap">
                      {formatCurrency(totalPaid)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              No hay pagos registrados
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isSaving ? "Guardando..." : "Guardar pagos"}
          </button>
        </div>
      </div>
    </div>
  );
}
