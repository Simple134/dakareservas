"use client";

import { useState } from "react";
import { X, Save, Loader2 } from "lucide-react";
import type { Moneda } from "@/src/lib/locales/moneda";

export type LocalStatus = "DISPONIBLE" | "RESERVADO" | "VENDIDO" | "BLOQUEADO";

interface LocalData {
  id: number;
  level: number;
  area_mt2: number;
  price_per_mt2: number;
  total_value: number;
  currency?: Moneda;
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
  /** Moneda con la que se muestra hoy el local, si todavía no la declara. */
  monedaActual: Moneda;
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
  monedaActual,
  onClose,
  onSave,
}: EditLocalModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    status: local.data.status as LocalStatus,
    currency: (local.data.currency ?? monedaActual) as Moneda,
    area_mt2: local.data.area_mt2,
    price_per_mt2: local.data.price_per_mt2,
    total_value: local.data.total_value,
    separation_10: local.data.separation_10 ?? local.data.total_value * 0.1,
    separation_45: local.data.separation_45 ?? local.data.total_value * 0.45,
  });

  const redondear = (n: number) => Math.round(n * 100) / 100;

  const handleChange = (field: string, value: string | number) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Solo área y precio recalculan el total y la separación; abrir el
      // modal no debe pisar los valores ya guardados.
      if (field === "area_mt2" || field === "price_per_mt2") {
        const total = redondear(next.area_mt2 * next.price_per_mt2);
        next.total_value = total;
        next.separation_10 = redondear(total * 0.1);
        next.separation_45 = redondear(total * 0.45);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedData = {
        ...local.data,
        ...form,
      };

      const res = await fetch("/api/erp/appData", {
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
      currency: form.currency,
      minimumFractionDigits: 0,
    }).format(n);

  return (
    <div className="fixed inset-0 bg-[oklch(21%_0.021_250_/_0.45)] flex items-center justify-center z-50 p-4">
      <div className="bg-paper rounded-xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rule">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              Editar Local #{local.data.id}
            </h2>
            <p className="text-sm text-ink-3">Nivel {local.data.level}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-ink-3 hover:text-ink-2 rounded-lg hover:bg-paper-3 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1.5">
              Estado
            </label>
            <select
              value={form.status}
              onChange={(e) => handleChange("status", e.target.value)}
              className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3 focus:border-transparent"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Moneda del precio */}
          <fieldset>
            <legend className="block text-sm font-medium text-ink-2 mb-1.5">
              Moneda del precio
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["USD", "Dólares (US$)"],
                  ["DOP", "Pesos (RD$)"],
                ] as const
              ).map(([valor, etiqueta]) => (
                <label
                  key={valor}
                  className={`flex h-10 cursor-pointer items-center justify-center rounded-[8px] border text-[0.8125rem] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold ${
                    form.currency === valor
                      ? "border-gold bg-paper-2 font-semibold text-ink"
                      : "border-rule-strong text-ink-2 hover:border-ink-3"
                  }`}
                >
                  <input
                    type="radio"
                    name="moneda-local"
                    value={valor}
                    checked={form.currency === valor}
                    onChange={() => handleChange("currency", valor)}
                    className="sr-only"
                  />
                  {etiqueta}
                </label>
              ))}
            </div>
            <p className="text-xs text-ink-3 mt-1">
              Todos los montos de este local se guardan y se muestran en esta
              moneda. Los pagos en la otra moneda se convierten solo para el
              progreso.
            </p>
          </fieldset>

          {/* Area and price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-2 mb-1.5">
                Área (m²)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.area_mt2}
                onChange={(e) =>
                  handleChange("area_mt2", parseFloat(e.target.value) || 0)
                }
                className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-2 mb-1.5">
                Precio / m² ({form.currency === "USD" ? "US$" : "RD$"})
              </label>
              <input
                type="number"
                step="0.01"
                value={form.price_per_mt2}
                onChange={(e) =>
                  handleChange("price_per_mt2", parseFloat(e.target.value) || 0)
                }
                className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3 focus:border-transparent"
              />
            </div>
          </div>

          {/* Total value */}
          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1.5">
              Valor total ({form.currency === "USD" ? "US$" : "RD$"})
            </label>
            <input
              type="number"
              step="0.01"
              value={form.total_value}
              onChange={(e) =>
                handleChange("total_value", parseFloat(e.target.value) || 0)
              }
              className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3 focus:border-transparent"
            />
            <p className="text-xs text-ink-3 mt-1">
              Se recalcula automáticamente al cambiar área × precio
            </p>
          </div>

          {/* Separations */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-2 mb-1.5">
                Separación (10%)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.separation_10}
                onChange={(e) =>
                  handleChange("separation_10", parseFloat(e.target.value) || 0)
                }
                className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-2 mb-1.5">
                Inicial (45%)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.separation_45}
                onChange={(e) =>
                  handleChange("separation_45", parseFloat(e.target.value) || 0)
                }
                className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3 focus:border-transparent"
              />
            </div>
          </div>

          {/* Capital summary */}
          <div className="bg-paper-2 rounded-lg p-4">
            <div className="flex justify-between text-sm text-ink-2 mb-1">
              <span>Separación:</span>
              <span className="font-medium">
                {formatCurrency(form.separation_10)}
              </span>
            </div>
            <div className="flex justify-between text-sm text-ink-2 mb-1">
              <span>Inicial:</span>
              <span className="font-medium">
                {formatCurrency(form.separation_45)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-semibold text-ink pt-1 border-t border-rule mt-1">
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
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-rule">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm text-ink-2 border border-rule-strong rounded-lg hover:bg-paper-2 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-shell rounded-lg hover:bg-shell-3 transition-colors disabled:opacity-50 flex items-center gap-2"
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
