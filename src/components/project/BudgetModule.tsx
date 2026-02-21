"use client";

import { GestionoDivision } from "@/src/types/gestiono";
import { Plus, X, Save, Loader2 } from "lucide-react";
import { useState, useCallback, useRef } from "react";

interface BudgetCategory {
  id: string;
  name: string;
  amount: number;
  percentage: number;
}

interface BudgetModuleProps {
  projectId: string | number;
  divisionId: number;
  categories?: BudgetCategory[];
  totalBudget?: number;
  divisionData?: GestionoDivision;
  onUpdate?: () => void;
}

// Counter for unique IDs to avoid Date.now() collisions
let idCounter = 0;
function generateUniqueId(): string {
  idCounter += 1;
  return `cat_${Date.now()}_${idCounter}`;
}

export function BudgetModule({
  projectId,
  divisionId,
  categories = [],
  totalBudget = 0,
  divisionData,
  onUpdate,
}: BudgetModuleProps) {
  // Sanitize categories to ensure all fields have valid defaults
  const sanitizeCategories = useCallback(
    (cats: BudgetCategory[]): BudgetCategory[] =>
      (cats || []).map((cat) => ({
        id: cat.id || generateUniqueId(),
        name: typeof cat.name === "string" ? cat.name : "Sin nombre",
        amount: Number.isFinite(Number(cat.amount)) ? Number(cat.amount) : 0,
        percentage: Number.isFinite(Number(cat.percentage))
          ? Number(cat.percentage)
          : 0,
      })),
    [],
  );

  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>(
    () => sanitizeCategories(categories),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Keep a ref to the initial categories for cancel
  const initialCategoriesRef = useRef(categories);

  const formatCurrency = (amount: number) => {
    const safeAmount = Number.isFinite(amount) ? amount : 0;
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 0,
    }).format(safeAmount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#131E29] text-white">
            Ejecutado
          </span>
        );
      case "in-progress":
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#131E29] text-white">
            Ejecutado
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
            Presupuestado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const getProgress = (budgeted: number, executed: number) => {
    if (!Number.isFinite(budgeted) || budgeted === 0) return 0;
    if (!Number.isFinite(executed)) return 0;
    return Math.min(100, Math.round((executed / budgeted) * 100));
  };

  const addCategory = useCallback(() => {
    const newCategory: BudgetCategory = {
      id: generateUniqueId(),
      name: "Nueva Categoría",
      percentage: 0,
      amount: 0,
    };
    setBudgetCategories((prev) => [...prev, newCategory]);
    setIsEditing(true);
  }, []);

  const removeCategory = useCallback((id: string) => {
    setBudgetCategories((prev) => prev.filter((cat) => cat.id !== id));
  }, []);

  const updateCategoryName = useCallback((id: string, name: string) => {
    setBudgetCategories((prev) =>
      prev.map((cat) => (cat.id === id ? { ...cat, name } : cat)),
    );
  }, []);

  const updateCategoryPercentage = useCallback(
    (id: string, percentage: number) => {
      const safePercentage = Number.isFinite(percentage) ? percentage : 0;
      setBudgetCategories((prev) =>
        prev.map((cat) =>
          cat.id === id
            ? {
                ...cat,
                percentage: safePercentage,
                amount: (totalBudget * safePercentage) / 100,
              }
            : cat,
        ),
      );
    },
    [totalBudget],
  );

  const updateCategoryAmount = useCallback(
    (id: string, amount: number) => {
      const safeAmount = Number.isFinite(amount) ? amount : 0;
      setBudgetCategories((prev) =>
        prev.map((cat) =>
          cat.id === id
            ? {
                ...cat,
                amount: safeAmount,
                percentage:
                  totalBudget > 0 ? (safeAmount / totalBudget) * 100 : 0,
              }
            : cat,
        ),
      );
    },
    [totalBudget],
  );

  const saveBudgetCategories = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/gestiono/divisions", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: divisionId,
          metadata: {
            ...divisionData?.metadata,
            budgetCategories: budgetCategories,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Error al actualizar las partidas presupuestarias");
      }

      setSuccess(true);
      setIsEditing(false);
      initialCategoriesRef.current = budgetCategories;

      // Call parent update callback if provided
      if (onUpdate) {
        onUpdate();
      }

      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEditing = useCallback(() => {
    setBudgetCategories(sanitizeCategories(initialCategoriesRef.current));
    setIsEditing(false);
    setError(null);
  }, [sanitizeCategories]);

  const totalPercentage = budgetCategories.reduce(
    (sum, cat) => sum + (Number.isFinite(cat.percentage) ? cat.percentage : 0),
    0,
  );

  // Map categories to budget items format for display
  const budgetItems = budgetCategories.map((cat) => ({
    id: cat.id,
    category: cat.name,
    budgeted: Number.isFinite(cat.amount) ? cat.amount : 0,
    executed: 0, // Not tracked in metadata currently
    status: "pending" as const,
  }));

  // Format percentage for display (avoid long floats)
  const formatPercentage = (value: number): string => {
    if (!Number.isFinite(value)) return "0.0";
    return value.toFixed(1);
  };

  // Safely get input string value for number inputs
  const getNumberInputValue = (
    value: number | undefined | null,
    decimals?: number,
  ): string => {
    if (value === null || value === undefined) return "";
    if (!Number.isFinite(value)) return "";
    if (value === 0) return "";
    if (decimals !== undefined) {
      return Number(value.toFixed(decimals)).toString();
    }
    return String(value);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-6 flex flex-row items-center justify-between border-b border-gray-100">
        <div>
          <h3 className="font-semibold text-lg text-gray-900">
            Desglose por Categorias
          </h3>
          {isEditing && (
            <p className="text-xs text-gray-500 mt-1">
              Total: {formatPercentage(totalPercentage)}%
              {totalPercentage > 100 && (
                <span className="text-red-600 ml-2">
                  ⚠️ El porcentaje excede el 100%
                </span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={cancelEditing}
                disabled={isSaving}
                className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors h-9 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveBudgetCategories}
                disabled={isSaving || totalPercentage > 100}
                style={{ borderRadius: "1rem" }}
                className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors h-9 px-4 py-2 bg-[#131E29] text-white hover:bg-[#1a2b3c] disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Guardar
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={addCategory}
              style={{ borderRadius: "1rem" }}
              className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors h-9 px-4 py-2 bg-[#131E29] text-white hover:bg-[#1a2b3c]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Categoría
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
          ✓ Partidas presupuestarias actualizadas correctamente
        </div>
      )}

      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th
                  className={`text-left py-3 font-medium text-gray-500 text-sm ${isEditing ? "w-[40%]" : "w-[30%]"}`}
                >
                  Categoría
                </th>
                <th
                  className={`text-left py-3 font-medium text-gray-500 text-sm ${isEditing ? "w-[20%]" : "w-[15%]"}`}
                >
                  %
                </th>
                <th
                  className={`text-left py-3 font-medium text-gray-500 text-sm ${isEditing ? "w-[30%]" : "w-[20%]"}`}
                >
                  Presupuestado
                </th>
                {!isEditing && (
                  <th className="text-left py-3 font-medium text-gray-500 text-sm w-[25%]">
                    Progreso
                  </th>
                )}
                <th className="text-left py-3 font-medium text-gray-500 text-sm w-[10%]">
                  {isEditing ? "" : "Estado"}
                </th>
              </tr>
            </thead>
            <tbody>
              {isEditing
                ? budgetCategories.map((category) => (
                    <tr
                      key={category.id}
                      className="border-b border-gray-50 last:border-0"
                    >
                      <td className="py-3">
                        <input
                          type="text"
                          value={category.name}
                          onChange={(e) =>
                            updateCategoryName(category.id, e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#131E29] focus:border-transparent"
                        />
                      </td>
                      <td className="py-3">
                        <input
                          type="number"
                          value={getNumberInputValue(category.percentage, 2)}
                          onChange={(e) =>
                            updateCategoryPercentage(
                              category.id,
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          step="0.1"
                          min="0"
                          max="100"
                          placeholder="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-[#131E29] focus:border-transparent"
                        />
                      </td>
                      <td className="py-3">
                        <input
                          type="number"
                          value={getNumberInputValue(category.amount)}
                          onChange={(e) =>
                            updateCategoryAmount(
                              category.id,
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          step="0.01"
                          min="0"
                          placeholder="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-[#131E29] focus:border-transparent"
                        />
                      </td>
                      <td className="py-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeCategory(category.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                : budgetItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="py-4 font-medium text-gray-900 text-sm">
                        {item.category}
                      </td>
                      <td className="py-4 text-left text-gray-600 text-sm">
                        {formatPercentage(
                          budgetCategories.find((c) => c.id === item.id)
                            ?.percentage ?? 0,
                        )}
                        %
                      </td>
                      <td className="py-4 text-left font-medium text-gray-900 text-sm">
                        {formatCurrency(item.budgeted)}
                      </td>
                      <td className="py-4 w-[25%]">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#131E29] rounded-full"
                              style={{
                                width: `${getProgress(item.budgeted, item.executed)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 min-w-[2rem]">
                            {getProgress(item.budgeted, item.executed)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 text-left">
                        {getStatusBadge(item.status)}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {isEditing && (
            <button
              type="button"
              onClick={addCategory}
              className="w-full mt-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-[#131E29] hover:text-[#131E29] transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Agregar Categoría
            </button>
          )}

          {budgetCategories.length === 0 && !isEditing && (
            <div className="text-center py-8 text-gray-500">
              No hay partidas presupuestarias definidas. Haga clic &quot;Nueva
              Partida&quot; para agregar una.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
