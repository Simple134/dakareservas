"use client";

import { Division, InvoiceItem } from "@/src/types/erp";
import { Plus, X, Save } from "lucide-react";
import { useState, useCallback, useRef, useMemo } from "react";

interface BudgetCategory {
  id: string;
  name: string;
  amount: number;
  percentage: number;
}

import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Input } from "@/src/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { money } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";

interface BudgetModuleProps {
  projectId: string | number;
  divisionId: number;
  categories?: BudgetCategory[];
  totalBudget?: number;
  divisionData?: Division;
  salesInvoices?: InvoiceItem[];
  onUpdate?: () => void;
}

// Counter for unique IDs to avoid Date.now() collisions
let idCounter = 0;
function generateUniqueId(): string {
  idCounter += 1;
  return `cat_${Date.now()}_${idCounter}`;
}

export function BudgetModule({
  divisionId,
  categories = [],
  totalBudget = 0,
  divisionData,
  salesInvoices = [],
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

  const formatCurrency = (amount: number) =>
    money(Number.isFinite(amount) ? amount : 0);

  /* Los tres estados daban dos etiquetas: «completed» e «in-progress»
   * mostraban ambos «Ejecutado» con el mismo relleno, así que una partida a
   * medias y una terminada eran indistinguibles. */
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="success" dot>
            Ejecutada
          </Badge>
        );
      case "in-progress":
        return (
          <Badge variant="info" dot>
            En curso
          </Badge>
        );
      default:
        return <Badge variant="default">Presupuestada</Badge>;
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
      // Calculate the difference between new and old category totals
      const newTotal = budgetCategories.reduce(
        (sum, cat) => sum + (Number.isFinite(cat.amount) ? cat.amount : 0),
        0,
      );
      const oldTotal = (initialCategoriesRef.current || []).reduce(
        (sum, cat) =>
          sum + (Number.isFinite(Number(cat.amount)) ? Number(cat.amount) : 0),
        0,
      );
      const budgetDifference = newTotal - oldTotal;
      const updatedBudget = totalBudget + budgetDifference;

      const response = await fetch("/api/erp/divisions", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: divisionId,
          metadata: {
            ...divisionData?.metadata,
            budgetCategories: budgetCategories,
            budget: updatedBudget,
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

  // Sum paid amounts from sales invoices grouped by category (elements[0].comment)
  const executedByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const invoice of salesInvoices) {
      const category = invoice.elements?.[0]?.comment;
      if (category) {
        map[category] = (map[category] || 0) + (invoice.paid || 0);
      }
    }
    return map;
  }, [salesInvoices]);

  // Map categories to budget items format for display
  const budgetItems = budgetCategories.map((cat) => ({
    id: cat.id,
    category: cat.name,
    budgeted: Number.isFinite(cat.amount) ? cat.amount : 0,
    executed: executedByCategory[cat.name] || 0,
    status:
      (executedByCategory[cat.name] || 0) >=
      (Number.isFinite(cat.amount) ? cat.amount : 0)
        ? ("completed" as const)
        : (executedByCategory[cat.name] || 0) > 0
          ? ("in-progress" as const)
          : ("pending" as const),
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
    <section className="overflow-hidden rounded-[12px] border border-rule bg-paper">
      <header className="flex flex-col gap-3 border-b border-rule px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-display text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">
            Partidas del presupuesto
          </h3>
          <p className="mt-0.5 text-[0.75rem] text-ink-2">
            {isEditing ? (
              <>
                Reparto actual:{" "}
                <span
                  className={cn(
                    "tabular font-semibold",
                    Math.abs(totalPercentage - 100) < 0.01
                      ? "text-success"
                      : "text-warning",
                  )}
                >
                  {formatPercentage(totalPercentage)} %
                </span>
              </>
            ) : (
              "El avance de cada partida sale de las facturas de venta imputadas a ella."
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={cancelEditing}
                disabled={isSaving}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={saveBudgetCategories}
                loading={isSaving}
                disabled={isSaving}
              >
                <Save className="mr-1.5 h-3.5 w-3.5" strokeWidth={2} />
                Guardar partidas
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={addCategory}>
              <Plus className="mr-1.5 h-3.5 w-3.5" strokeWidth={2} />
              Añadir partida
            </Button>
          )}
        </div>
      </header>

      {error && (
        <p className="border-b border-rule bg-danger-soft px-4 py-2.5 text-[0.8125rem] text-danger">
          {error}
        </p>
      )}
      {success && (
        <p className="border-b border-rule bg-success-soft px-4 py-2.5 text-[0.8125rem] text-success">
          Partidas actualizadas.
        </p>
      )}

      {/* Móvil */}
      <ul className="divide-y divide-rule md:hidden">
        {isEditing
          ? budgetCategories.map((category) => (
              <li key={category.id} className="space-y-2.5 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={category.name}
                    aria-label="Nombre de la partida"
                    onChange={(e) =>
                      updateCategoryName(category.id, e.target.value)
                    }
                  />
                  <button
                    type="button"
                    onClick={() => removeCategory(category.id)}
                    aria-label={`Quitar ${category.name}`}
                    className="shrink-0 rounded-[6px] p-1.5 text-ink-3 transition-colors duration-[120ms] hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold"
                  >
                    <X className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="eyebrow mb-1 block">Porcentaje</span>
                    <Input
                      type="number"
                      numeric
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={getNumberInputValue(category.percentage, 2)}
                      onChange={(e) =>
                        updateCategoryPercentage(
                          category.id,
                          parseFloat(e.target.value) || 0,
                        )
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="eyebrow mb-1 block">Monto</span>
                    <Input
                      type="number"
                      numeric
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={getNumberInputValue(category.amount)}
                      onChange={(e) =>
                        updateCategoryAmount(
                          category.id,
                          parseFloat(e.target.value) || 0,
                        )
                      }
                    />
                  </label>
                </div>
              </li>
            ))
          : budgetItems.map((item) => {
              const avance = getProgress(item.budgeted, item.executed);
              return (
                <li key={item.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate text-[0.8125rem] font-medium text-ink">
                      {item.category}
                    </p>
                    {getStatusBadge(item.status)}
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between gap-3">
                    <span className="tabular text-[0.75rem] text-ink-2">
                      {formatPercentage(
                        budgetCategories.find((c) => c.id === item.id)
                          ?.percentage ?? 0,
                      )}{" "}
                      %
                    </span>
                    <span className="tabular font-mono text-[0.8125rem] font-medium text-ink">
                      {formatCurrency(item.budgeted)}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-paper-3">
                    <div
                      className="h-full rounded-full bg-ink-2"
                      style={{ width: `${avance}%` }}
                    />
                  </div>
                  <p className="tabular mt-1 text-[0.75rem] text-ink-3">
                    {avance} % ejecutado · {formatCurrency(item.executed)}
                  </p>
                </li>
              );
            })}
        {budgetCategories.length === 0 && !isEditing && (
          <li className="px-4 py-10 text-center text-[0.8125rem] text-ink-3">
            Este proyecto no tiene partidas presupuestarias.
          </li>
        )}
      </ul>

      {/* Escritorio */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[32%]">Partida</TableHead>
              <TableHead numeric className="w-[12%]">
                %
              </TableHead>
              <TableHead numeric className="w-[18%]">
                Presupuestado
              </TableHead>
              {!isEditing && (
                <>
                  <TableHead numeric className="w-[16%]">
                    Ejecutado
                  </TableHead>
                  <TableHead className="w-[16%]">Avance</TableHead>
                  <TableHead>Estado</TableHead>
                </>
              )}
              {isEditing && (
                <TableHead className="text-right">Quitar</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isEditing ? (
              budgetCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>
                    <Input
                      value={category.name}
                      aria-label="Nombre de la partida"
                      onChange={(e) =>
                        updateCategoryName(category.id, e.target.value)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      numeric
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="0"
                      aria-label="Porcentaje"
                      value={getNumberInputValue(category.percentage, 2)}
                      onChange={(e) =>
                        updateCategoryPercentage(
                          category.id,
                          parseFloat(e.target.value) || 0,
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      numeric
                      step="0.01"
                      min="0"
                      placeholder="0"
                      aria-label="Monto"
                      value={getNumberInputValue(category.amount)}
                      onChange={(e) =>
                        updateCategoryAmount(
                          category.id,
                          parseFloat(e.target.value) || 0,
                        )
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      type="button"
                      onClick={() => removeCategory(category.id)}
                      aria-label={`Quitar ${category.name}`}
                      className="rounded-[6px] p-1.5 text-ink-3 transition-colors duration-[120ms] hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold"
                    >
                      <X className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            ) : budgetItems.length === 0 ? (
              <TableEmpty colSpan={6}>
                Este proyecto no tiene partidas presupuestarias. Púlsalo en
                «Añadir partida» para crear la primera.
              </TableEmpty>
            ) : (
              budgetItems.map((item) => {
                const avance = getProgress(item.budgeted, item.executed);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="text-[0.8125rem] font-medium text-ink">
                      {item.category}
                    </TableCell>
                    <TableCell numeric className="text-[0.8125rem] text-ink-2">
                      {formatPercentage(
                        budgetCategories.find((c) => c.id === item.id)
                          ?.percentage ?? 0,
                      )}
                    </TableCell>
                    <TableCell numeric className="text-[0.8125rem]">
                      {formatCurrency(item.budgeted)}
                    </TableCell>
                    <TableCell numeric className="text-[0.8125rem] text-ink-2">
                      {formatCurrency(item.executed)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-full min-w-14 overflow-hidden rounded-full bg-paper-3">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              avance >= 100 ? "bg-success" : "bg-ink-2",
                            )}
                            style={{ width: `${avance}%` }}
                          />
                        </div>
                        <span className="tabular w-9 shrink-0 text-right text-[0.75rem] text-ink-2">
                          {avance} %
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {isEditing && (
          <div className="px-4 py-3">
            <button
              type="button"
              onClick={addCategory}
              className="flex w-full items-center justify-center gap-2 rounded-[8px] border border-dashed border-rule-strong py-2 text-[0.8125rem] text-ink-2 transition-colors duration-[120ms] hover:border-gold hover:text-gold-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              Añadir partida
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
