"use client";

import { useState, useEffect } from "react";
import { X, Save, Loader2 } from "lucide-react";

export type LocalStatus = "DISPONIBLE" | "RESERVADO" | "VENDIDO" | "BLOQUEADO";

interface LocalData {
  id: number;
  level: number;
  area_mt2: number;
  price_per_mt2: number;
  total_value: number;
  separation_10?: number;
  separation_45?: number;
  status: LocalStatus;
  [key: string]: unknown;
}

interface AppDataLocal {
  id: number; // AppData record ID
  appId: number;
  type: string;
  data: LocalData;
}

interface EditLocalModalProps {
  local: AppDataLocal;
  onClose: () => void;
  onSave: (updatedLocal: AppDataLocal) => void;
}

const STATUS_OPTIONS: { value: LocalStatus; label: string }[] = [
  { value: "DISPONIBLE", label: "Disponible" },
  { value: "RESERVADO", label: "Reservado" },
  { value: "VENDIDO", label: "Vendido" },
  { value: "BLOQUEADO", label: "Bloqueado" },
];

export function EditLocalModal({
  local,
  onClose,
  onSave,
}: EditLocalModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    status: local.data.status as LocalStatus,
    area_mt2: local.data.area_mt2,
    price_per_mt2: local.data.price_per_mt2,
    total_value: local.data.total_value,
    separation_10: local.data.separation_10 ?? local.data.total_value * 0.1,
    separation_45: local.data.separation_45 ?? local.data.total_value * 0.45,
  });

  // Auto-recalculate total when area or price changes
  useEffect(() => {
    const total = form.area_mt2 * form.price_per_mt2;
    setForm((prev) => ({
      ...prev,
      total_value: total,
      separation_10: total * 0.1,
      separation_45: total * 0.45,
    }));
  }, [form.area_mt2, form.price_per_mt2]);

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedData = {
        ...local.data,
        ...form,
      };

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
      console.error("Error saving local:", error);
      alert("Error al guardar los cambios");
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 0,
    }).format(n);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Editar Local #{local.data.id}
            </h2>
            <p className="text-sm text-gray-500">Nivel {local.data.level}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Estado
            </label>
            <select
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Area and price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Área (m²)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.area_mt2}
                onChange={(e) =>
                  handleChange("area_mt2", parseFloat(e.target.value) || 0)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Precio / m²
              </label>
              <input
                type="number"
                step="0.01"
                value={form.price_per_mt2}
                onChange={(e) =>
                  handleChange("price_per_mt2", parseFloat(e.target.value) || 0)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Total value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Valor Total
            </label>
            <input
              type="number"
              step="0.01"
              value={form.total_value}
              onChange={(e) =>
                handleChange("total_value", parseFloat(e.target.value) || 0)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1">
              Se recalcula automáticamente al cambiar área × precio
            </p>
          </div>

          {/* Separations */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Separación (10%)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.separation_10}
                onChange={(e) =>
                  handleChange("separation_10", parseFloat(e.target.value) || 0)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Inicial (45%)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.separation_45}
                onChange={(e) =>
                  handleChange("separation_45", parseFloat(e.target.value) || 0)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Capital summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Separación:</span>
              <span className="font-medium">
                {formatCurrency(form.separation_10)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Inicial:</span>
              <span className="font-medium">
                {formatCurrency(form.separation_45)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-gray-900 pt-1 border-t border-gray-200 mt-1">
              <span>Capital restante:</span>
              <span>
                {formatCurrency(
                  form.total_value - form.separation_10 - form.separation_45,
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
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
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
