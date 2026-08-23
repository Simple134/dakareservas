"use client";

import { useEffect, useState, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import {
  Plus,
  Trash2,
  Calculator,
  Building2,
  Save,
  ChevronDown,
} from "lucide-react";
import { Modal } from "@/src/components/ui/modal";
import { Button } from "@/src/components/ui/button";
import { cn } from "@/src/lib/utils";

import { useErp } from "@/src/context/ErpContext";
import {
  Beneficiary,
  PendingRecord,
  PendingRecordElement,
  InvoiceItem,
  Currency,
  TaxRate,
} from "@/src/types/erp";

interface BudgetCategory {
  id: string;
  name: string;
  amount: number;
  percentage: number;
}

interface EditInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  record: InvoiceItem;
  budgetCategories?: BudgetCategory[];
  onUpdate: () => void;
}

export function EditInvoiceDialog({
  isOpen,
  onClose,
  record,
  budgetCategories = [],
  onUpdate,
}: EditInvoiceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [erpBeneficiaries, setErpBeneficiaries] = useState<Beneficiary[]>([]);
  const [savingElementId, setSavingElementId] = useState<number | null>(null);
  const [originalElements] = useState(record.elements || []);
  const [selectedBeneficiary, setSelectedBeneficiary] =
    useState<Beneficiary | null>(null);

  const [taxesList, setTaxesList] = useState<TaxRate[]>([]);
  const [generalTitle, setGeneralTitle] = useState(
    (record.elements || [])[0]?.comment || "",
  );
  const [beneficiarySearch, setBeneficiarySearch] = useState("");
  const [isBeneficiaryOpen, setIsBeneficiaryOpen] = useState(false);
  const beneficiaryDropdownRef = useRef<HTMLDivElement>(null);

  const sortedFilteredBeneficiaries = [...erpBeneficiaries]
    .sort((a, b) => a.name.localeCompare(b.name, "es"))
    .filter(
      (b) =>
        b.name.toLowerCase().includes(beneficiarySearch.toLowerCase()) ||
        (b.taxId &&
          b.taxId.toLowerCase().includes(beneficiarySearch.toLowerCase())),
    );

  const { divisions: erpDivisions } = useErp();

  // Determine document type
  const documentType =
    record.type === "QUOTE"
      ? "quote"
      : record.type === "ORDER"
        ? "order"
        : "invoice";

  const getDocumentName = (): string => {
    switch (documentType) {
      case "quote":
        return "Cotización";
      case "order":
        return "Orden";
      default:
        return "Factura";
    }
  };

  // Form with pre-filled data
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<Partial<PendingRecord>>({
    defaultValues: {
      type: record.type,
      date: new Date(record.date).toISOString().split("T")[0],
      dueDate: record.dueDate
        ? new Date(record.dueDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      isSell: Boolean(record.isSell),
      divisionId: record.divisionId,
      beneficiaryId: record.beneficiaryId,
      currency: record.currency as Currency,
      reference: record.reference || undefined,
      notes: record.notes || "",
      elements: (record.elements || []).map((el) => ({
        ...el,
        id: el.id || 0,
        pendingRecordId: record.id,
        salesTaxRate: el.salesTaxRate ? el.salesTaxRate * 100 : 18,
        taxes: el.taxes || [],
      })),
    },
  });

  // useFieldArray for elements
  const { fields, append, remove } = useFieldArray({
    control,
    name: "elements",
  });

  const watchElements = watch("elements");

  // Fetch beneficiaries
  useEffect(() => {
    const fetchBeneficiaries = async () => {
      if (!isOpen) return;
      try {
        const params = new URLSearchParams({
          withContacts: "true",
          withTaxData: "false",
        });
        const response = await fetch(
          `/api/erp/beneficiaries?${params.toString()}`,
        );
        if (response.ok) {
          const data = await response.json();
          setErpBeneficiaries(data || []);
        }
      } catch (error) {
        console.error("Error fetching beneficiaries:", error);
      }
    };
    fetchBeneficiaries();
  }, [isOpen]);

  // Fetch taxes list
  useEffect(() => {
    const fetchTaxes = async () => {
      if (!isOpen) return;
      try {
        const response = await fetch(`/api/erp/taxes`);
        if (response.ok) {
          const data = await response.json();
          setTaxesList(data || []);
        }
      } catch (error) {
        console.error("Error fetching taxes:", error);
      }
    };
    fetchTaxes();
  }, [isOpen]);

  // Close beneficiary dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        beneficiaryDropdownRef.current &&
        !beneficiaryDropdownRef.current.contains(e.target as Node)
      ) {
        setIsBeneficiaryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Set selected beneficiary and re-sync form values when beneficiaries are loaded
  useEffect(() => {
    if (erpBeneficiaries.length > 0 && record.beneficiaryId) {
      const found = erpBeneficiaries.find((b) => b.id === record.beneficiaryId);
      setSelectedBeneficiary(found || null);
      // Re-set form value so the <select> shows the correct beneficiary
      setValue("beneficiaryId", record.beneficiaryId);
    }
  }, [erpBeneficiaries, record.beneficiaryId, setValue]);

  // Calculate totals with per-element tax
  const subtotal = (watchElements || []).reduce(
    (sum: number, item: Partial<PendingRecordElement>) =>
      sum + (item?.quantity || 0) * (item?.price || 0),
    0,
  );
  const taxAmount = (watchElements || []).reduce(
    (sum: number, item: Partial<PendingRecordElement>) => {
      const itemSubtotal = (item?.quantity || 0) * (item?.price || 0);
      const taxRateId = item?.taxes?.[0]?.taxRateId;
      const tax = taxesList.find((t) => t.id === taxRateId);
      const rate = tax?.rate || 0;
      return sum + itemSubtotal * rate;
    },
    0,
  );

  // ISR Tax Retention
  const beneficiaryIsrRate = selectedBeneficiary?.metadata?.isrTaxRetention
    ? Number(selectedBeneficiary.metadata.isrTaxRetention)
    : 0;

  // Three-tier ISR retention logic
  const isPurchaseRetention = !record.isSell && beneficiaryIsrRate > 0;
  const is10Percent = beneficiaryIsrRate >= 0.1 && beneficiaryIsrRate < 0.3;
  const is30Percent = beneficiaryIsrRate >= 0.3;
  const is2Percent = beneficiaryIsrRate > 0 && beneficiaryIsrRate < 0.1;

  // 10%: Full retention (ITBIS retained + ISR on subtotal)
  const hasFullRetention = isPurchaseRetention && is10Percent;
  const totalFacturado = subtotal + taxAmount;
  const itbisRetenido = hasFullRetention ? taxAmount : 0;
  const isrRetentionAmount = isPurchaseRetention
    ? is30Percent
      ? taxAmount * beneficiaryIsrRate
      : subtotal * beneficiaryIsrRate
    : 0;

  let total: number;
  if (isPurchaseRetention && is2Percent) {
    total = subtotal - isrRetentionAmount;
  } else if (hasFullRetention) {
    total = totalFacturado - itbisRetenido - isrRetentionAmount;
  } else if (isPurchaseRetention && is30Percent) {
    total = subtotal + taxAmount - isrRetentionAmount;
  } else {
    total = subtotal + taxAmount;
  }

  // Show category selector only for purchases when budget categories are available
  const showCategories = !record.isSell && budgetCategories.length > 0;

  // Update totals in form
  useEffect(() => {
    setValue("subTotal", subtotal);
    setValue("taxes", taxAmount);
    setValue("amount", total);
  }, [subtotal, taxAmount, total, setValue]);

  const addItem = () => {
    append({
      id: 0,
      pendingRecordId: record.id,
      description: "",
      quantity: 1,
      unit: "UND",
      price: 0,
      variation: 0,
      taxes:
        taxesList.length > 0
          ? [
              {
                taxRateId: taxesList[0].id,
                id: 0,
                pendingRecordElementId: 0,
                isIncludedInPrice: false,
              },
            ]
          : [],
    } as PendingRecordElement);
  };

  // Auto-add one element when dialog opens with no elements (wait for taxes to load for correct ITBIS default)
  useEffect(() => {
    if (isOpen && fields.length === 0 && taxesList.length > 0) {
      addItem();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, fields.length, taxesList.length]);

  const removeItem = async (index: number) => {
    const element = watchElements?.[index];

    // If the element has an ID > 0, it exists in the database, so delete it via API
    if (element?.id && element.id > 0) {
      try {
        const response = await fetch(`/api/erp/element`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: element.id, pendingRecordId: record.id }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("Error deleting element:", errorData);
          return;
        }

        remove(index);
      } catch (error) {
        console.error("Error deleting element:", error);
      }
    } else {
      // New element not yet saved, just remove from form
      remove(index);
    }
  };

  // Save individual element (create new or update existing)
  const saveElement = async (index: number) => {
    const element = watchElements?.[index];
    if (!element) return;

    setSavingElementId(element.id || index);

    try {
      let elementId = element.id || 0;

      // If element is new (id === 0), create it using POST
      if (!element.id || element.id === 0) {
        const elementPayload = {
          pendingRecordId: record.id,
          description: element.description,
          comment: generalTitle,
          quantity: Number(element.quantity) || 0,
          unit: element.unit || "UD",
          price: Number(element.price) || 0,
          variation: Number(element.variation) || 0,
        };

        const response = await fetch(`/api/erp/element`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(elementPayload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.details || "Error al crear elemento");
        }

        const result = await response.json();
        // Try to get the new element ID from the response
        if (result?.elements) {
          const newEl = result.elements[result.elements.length - 1];
          elementId = newEl?.id || 0;
        } else if (result?.id) {
          elementId = result.id;
        }
      } else {
        // Update existing element using PATCH
        const elementPayload = {
          id: element.id,
          description: element.description,
          comment: generalTitle,
          quantity: Number(element.quantity) || 0,
          unit: element.unit || "UD",
          price: Number(element.price) || 0,
          variation: Number(element.variation) || 0,
        };

        const response = await fetch(`/api/erp/element`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(elementPayload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.details || `Error al actualizar elemento ${element.id}`,
          );
        }
      }

      // Handle taxes separately via add/remove endpoints
      if (elementId > 0) {
        const originalElement = originalElements.find(
          (el) => el.id === elementId,
        );
        const oldTaxRateId = originalElement?.taxes?.[0]?.taxRateId ?? 0;
        const newTaxRateId = element.taxes?.[0]?.taxRateId ?? 0;

        if (oldTaxRateId !== newTaxRateId) {
          // Remove old tax if it existed
          if (oldTaxRateId > 0) {
            await fetch(`/api/erp/element/taxes`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pendingRecordElementId: elementId,
                taxRateId: oldTaxRateId,
              }),
            });
          }

          // Add new tax if selected
          if (newTaxRateId > 0) {
            await fetch(`/api/erp/element/taxes`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                pendingRecordElementId: elementId,
                taxRateId: newTaxRateId,
              }),
            });
          }
        }
      }

      // Refresh the data
      onUpdate();
    } catch (error) {
      console.error("Error saving element:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Error al guardar elemento",
      );
    } finally {
      setSavingElementId(null);
    }
  };

  // Check if element has changes or is new
  const hasElementChanges = (index: number): boolean => {
    const currentElement = watchElements?.[index];
    if (!currentElement) return false;

    // Show save button for new elements
    if (!currentElement.id || currentElement.id === 0) return true;

    // Find original element
    const original = originalElements.find((el) => el.id === currentElement.id);
    if (!original) return true;

    // Compare fields
    return (
      original.description !== currentElement.description ||
      original.quantity !== Number(currentElement.quantity) ||
      original.unit !== currentElement.unit ||
      original.price !== Number(currentElement.price) ||
      original.variation !== Number(currentElement.variation) ||
      (original.taxes?.[0]?.taxRateId ?? 0) !==
        (currentElement.taxes?.[0]?.taxRateId ?? 0)
    );
  };

  /* Mismo hueco que en el diálogo de creación: `errors` se desestructuraba y
   * no se leía en ningún sitio, y ningún campo llevaba reglas. Se podía dejar
   * un documento sin beneficiario o sin líneas al editarlo. */
  const validar = (data: Partial<PendingRecord>): boolean => {
    clearErrors();
    let valido = true;

    if (!data.divisionId) {
      setError("divisionId", { message: "Elige el proyecto." });
      valido = false;
    }
    if (!data.beneficiaryId) {
      setError("beneficiaryId", {
        message: record.isSell
          ? "Elige el cliente al que se emite."
          : "Elige el proveedor que emite.",
      });
      valido = false;
    }
    const utiles = (data.elements ?? []).filter(
      (el) => el?.description?.trim() && Number(el.price) > 0,
    );
    if (utiles.length === 0) {
      setError("elements", {
        message: "El documento necesita al menos una línea con precio.",
      });
      valido = false;
    }

    return valido;
  };

  const onSubmit = async (data: Partial<PendingRecord>) => {
    setSubmitError(null);
    setSubmitSuccess(false);
    if (!validar(data)) return;
    setIsSubmitting(true);

    try {
      const formatDateToISO = (dateStr: string | undefined): string => {
        if (!dateStr) return new Date().toISOString();
        try {
          const date = new Date(dateStr);
          return date.toISOString();
        } catch {
          return new Date().toISOString();
        }
      };

      // Update record metadata + beneficiary/division
      const recordPayload = {
        id: record.id,
        date: formatDateToISO(data.date),
        dueDate: formatDateToISO(data.dueDate),
        reference: data.reference,
        notes: data.notes,
        beneficiaryId: data.beneficiaryId,
        divisionId: data.divisionId,
        description: generalTitle,
      };

      const recordResponse = await fetch(`/api/erp/pendingRecord/update`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(recordPayload),
      });

      if (!recordResponse.ok) {
        const errorData = await recordResponse.json().catch(() => ({}));
        throw new Error(errorData.details || "Error al actualizar registro");
      }

      setSubmitSuccess(true);
      onUpdate();

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: unknown) {
      console.error("❌ Error actualizando:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error al actualizar";
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const FORM_ID = "editar-documento";

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="xl"
      busy={isSubmitting}
      title={`Editar ${getDocumentName().toLowerCase()}${record.reference ? ` · ${record.reference}` : ""}`}
      description={
        record.isSell
          ? "Documento emitido al cliente."
          : "Documento recibido de un proveedor."
      }
      footer={
        <>
          {(submitError || submitSuccess || Object.keys(errors).length > 0) && (
            <p
              role="status"
              className={cn(
                "mr-auto text-[0.75rem] sm:max-w-md",
                submitError || Object.keys(errors).length > 0
                  ? "text-danger"
                  : "text-success",
              )}
            >
              {submitError ??
                (errors.divisionId?.message as string) ??
                (errors.beneficiaryId?.message as string) ??
                (errors.elements?.message as string) ??
                "Cambios guardados."}
            </p>
          )}
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Guardar cambios
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >
        {/* Configuración del Documento */}
        <div className="bg-paper border border-rule rounded-lg p-6">
          <h3 className="text-lg font-semibold text-ink mb-4">
            Información Básica
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-2 mb-1.5">
                # Num
              </label>
              <input
                type="text"
                {...register("reference")}
                className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-2 mb-1.5">
                Fecha
              </label>
              <input
                type="date"
                {...register("date")}
                className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-2 mb-1.5">
                Fecha de Vencimiento
              </label>
              <input
                type="date"
                {...register("dueDate")}
                className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
              />
            </div>
          </div>
        </div>

        {/* Asignación de Proyecto */}
        <div className="bg-paper border border-rule rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-ink-2" />
            <h3 className="text-lg font-semibold text-ink">
              Proyecto y Cliente
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-2 mb-1.5">
                Proyecto
              </label>
              <select
                {...register("divisionId", { valueAsNumber: true })}
                className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
              >
                {erpDivisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-2 mb-1.5">
                {record.isSell ? "Cliente" : "Proveedor"}
              </label>
              <div ref={beneficiaryDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsBeneficiaryOpen((v) => !v)}
                  className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3 text-left text-sm flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-gold bg-paper"
                >
                  <span
                    className={selectedBeneficiary ? "text-ink" : "text-ink-3"}
                  >
                    {selectedBeneficiary
                      ? `${selectedBeneficiary.name}${selectedBeneficiary.taxId ? ` (${selectedBeneficiary.taxId})` : ""}`
                      : "Seleccionar beneficiario..."}
                  </span>
                  <ChevronDown className="w-4 h-4 text-ink-3 shrink-0" />
                </button>
                {isBeneficiaryOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-paper border border-rule rounded-md shadow-lg">
                    <div className="p-2 border-b border-rule">
                      <input
                        type="text"
                        value={beneficiarySearch}
                        onChange={(e) => setBeneficiarySearch(e.target.value)}
                        placeholder="Buscar por nombre o RNC..."
                        className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                        autoFocus
                      />
                    </div>
                    <ul className="max-h-48 overflow-y-auto">
                      {sortedFilteredBeneficiaries.map((b) => (
                        <li key={b.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setValue("beneficiaryId", b.id);
                              setSelectedBeneficiary(b);
                              setIsBeneficiaryOpen(false);
                              setBeneficiarySearch("");
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-ink hover:bg-paper-2"
                          >
                            {b.name}
                            {b.taxId ? ` (${b.taxId})` : ""}
                          </button>
                        </li>
                      ))}
                      {sortedFilteredBeneficiaries.length === 0 && (
                        <li className="px-3 py-2 text-sm text-ink-3">
                          No se encontraron resultados
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Elementos de la Factura */}
        <div className="bg-paper border border-rule rounded-lg p-4 md:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-ink">
              Elementos
            </h3>
            <button
              type="button"
              onClick={addItem}
              style={{ borderRadius: "50px" }}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-shell text-white rounded-md hover:bg-shell-2 transition-colors text-sm font-medium w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span className="font-bold">Agregar Elemento</span>
            </button>
          </div>

          {/* Título General */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-ink-2 mb-1.5">
              Título General
            </label>
            {showCategories ? (
              <select
                value={
                  budgetCategories.find((c) => c.name === generalTitle)?.id ||
                  ""
                }
                onChange={(e) => {
                  const cat = budgetCategories.find(
                    (c) => c.id === e.target.value,
                  );
                  if (cat) setGeneralTitle(cat.name);
                }}
                className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
              >
                <option value="">Seleccionar categoría...</option>
                {budgetCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={generalTitle}
                onChange={(e) => setGeneralTitle(e.target.value)}
                placeholder="Ej: Materiales, Mano de Obra, Estructura..."
                className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
              />
            )}
            <p className="text-xs text-ink-3 mt-1">
              Este título se usará como categoría en el presupuesto del
              proyecto.
            </p>
          </div>

          <div className="space-y-3">
            {/* Desktop Header - hidden on mobile */}
            <div className="hidden md:grid grid-cols-13 gap-2 text-xs font-semibold text-ink-2 pb-2 border-b">
              <div className="col-span-4">Descripción</div>
              <div className="col-span-1">Cant.</div>
              <div className="col-span-1">Unidad</div>
              <div className="col-span-2">Precio</div>
              <div className="col-span-2">Impuesto</div>
              <div className="col-span-1">Total</div>
              <div className="col-span-2"></div>
            </div>

            {fields.map((field, index) => {
              const element = watchElements?.[index];
              const itemSubtotal =
                (element?.quantity || 0) * (element?.price || 0);
              const elTaxRateId = element?.taxes?.[0]?.taxRateId;
              const elTax = taxesList.find((t) => t.id === elTaxRateId);
              const itemTotal =
                itemSubtotal + itemSubtotal * (elTax?.rate || 0);
              const showSaveButton = hasElementChanges(index);
              const isSaving = savingElementId === (element?.id || index);

              return (
                <div key={field.id}>
                  {/* Mobile Card Layout */}
                  <div className="block md:hidden p-3 border border-rule rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-ink-3">
                        Elemento {index + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        {showSaveButton && (
                          <button
                            type="button"
                            onClick={() => saveElement(index)}
                            disabled={isSaving}
                            className="p-1.5 text-success hover:bg-success-soft rounded-md disabled:opacity-30"
                            title="Guardar cambios"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-1.5 text-danger hover:bg-danger-soft rounded-md"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-ink-3">Descripción</label>
                      <input
                        type="text"
                        value={element?.description || ""}
                        onChange={(e) =>
                          setValue(
                            `elements.${index}.description`,
                            e.target.value,
                          )
                        }
                        placeholder="Descripción del elemento"
                        className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-ink-3">Cant.</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={element?.quantity ?? 0}
                          onChange={(e) => {
                            const v = e.target.value;
                            setValue(
                              `elements.${index}.quantity`,
                              v === "" ? 0 : Number(v) || 0,
                            );
                          }}
                          className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-ink-3">Unidad</label>
                        <select
                          value={element?.unit || "UND"}
                          onChange={(e) =>
                            setValue(`elements.${index}.unit`, e.target.value)
                          }
                          className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                        >
                          <option value="UND">UND</option>
                          <option value="M²">M²</option>
                          <option value="ML">ML</option>
                          <option value="M³">M³</option>
                          <option value="GL">GL</option>
                          <option value="PA">PA</option>
                          <option value="P²">P²</option>
                          <option value="PL">PL</option>
                          <option value="KG">KG</option>
                          <option value="LB">LB</option>
                          <option value="TON">TON</option>
                          <option value="LT">LT</option>
                          <option value="GL (líq)">GL (líq)</option>
                          <option value="FD">FD</option>
                          <option value="HR">HR</option>
                          <option value="DÍA">DÍA</option>
                          <option value="SEM">SEM</option>
                          <option value="MES">MES</option>
                          <option value="VIAJE">VIAJE</option>
                          <option value="ROLLO">ROLLO</option>
                          <option value="SACO">SACO</option>
                          <option value="CUBETA">CUBETA</option>
                          <option value="LÁMINA">LÁMINA</option>
                          <option value="VARILLA">VARILLA</option>
                          <option value="QQ">QQ</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-ink-3">Precio</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={element?.price ?? 0}
                          onChange={(e) => {
                            const v = e.target.value;
                            setValue(
                              `elements.${index}.price`,
                              v === "" ? 0 : Number(v) || 0,
                            );
                          }}
                          className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-ink-3">Impuesto</label>
                        <select
                          value={element?.taxes?.[0]?.taxRateId || ""}
                          onChange={(e) => {
                            const taxRateId = Number(e.target.value);
                            if (taxRateId) {
                              setValue(`elements.${index}.taxes`, [
                                {
                                  taxRateId,
                                  id: 0,
                                  pendingRecordElementId: 0,
                                  isIncludedInPrice: false,
                                },
                              ]);
                            } else {
                              setValue(`elements.${index}.taxes`, []);
                            }
                          }}
                          className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                        >
                          <option value="">Sin impuesto</option>
                          {taxesList.map((tax) => (
                            <option key={tax.id} value={tax.id}>
                              {tax.slug} ({(tax.rate * 100).toFixed(0)}%)
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-ink-3">Total</label>
                        <input
                          type="text"
                          value={itemTotal.toFixed(2)}
                          disabled
                          className="w-full px-3 py-2 border border-rule rounded-md bg-paper-2 text-sm text-ink-2"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Desktop Grid Layout */}
                  <div className="hidden md:grid grid-cols-13 gap-2 items-center">
                    <div className="col-span-4">
                      <input
                        type="text"
                        {...register(`elements.${index}.description`)}
                        placeholder="Descripción del elemento"
                        className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                      />
                    </div>

                    <div className="col-span-1">
                      <input
                        type="text"
                        {...register(`elements.${index}.quantity`, {
                          setValueAs: (v: string) => (v === "" ? 0 : Number(v)),
                        })}
                        className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                      />
                    </div>

                    <div className="col-span-1">
                      <select
                        {...register(`elements.${index}.unit`)}
                        className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                      >
                        <option value="UND">UND</option>
                        <option value="M²">M²</option>
                        <option value="ML">ML</option>
                        <option value="M³">M³</option>
                        <option value="GL">GL</option>
                        <option value="PA">PA</option>
                        <option value="P²">P²</option>
                        <option value="PL">PL</option>
                        <option value="KG">KG</option>
                        <option value="LB">LB</option>
                        <option value="TON">TON</option>
                        <option value="LT">LT</option>
                        <option value="GL (líq)">GL (líq)</option>
                        <option value="FD">FD</option>
                        <option value="HR">HR</option>
                        <option value="DÍA">DÍA</option>
                        <option value="SEM">SEM</option>
                        <option value="MES">MES</option>
                        <option value="VIAJE">VIAJE</option>
                        <option value="ROLLO">ROLLO</option>
                        <option value="SACO">SACO</option>
                        <option value="CUBETA">CUBETA</option>
                        <option value="LÁMINA">LÁMINA</option>
                        <option value="VARILLA">VARILLA</option>
                        <option value="QQ">QQ</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <input
                        type="text"
                        {...register(`elements.${index}.price`, {
                          setValueAs: (v: string) => (v === "" ? 0 : Number(v)),
                        })}
                        className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                      />
                    </div>

                    <div className="col-span-1">
                      <select
                        value={element?.taxes?.[0]?.taxRateId || ""}
                        onChange={(e) => {
                          const taxRateId = Number(e.target.value);
                          if (taxRateId) {
                            setValue(`elements.${index}.taxes`, [
                              {
                                taxRateId,
                                id: 0,
                                pendingRecordElementId: 0,
                                isIncludedInPrice: false,
                              },
                            ]);
                          } else {
                            setValue(`elements.${index}.taxes`, []);
                          }
                        }}
                        className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                      >
                        <option value="">Sin impuesto</option>
                        {taxesList.map((tax) => (
                          <option key={tax.id} value={tax.id}>
                            {tax.slug} ({(tax.rate * 100).toFixed(0)}%)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <input
                        type="text"
                        value={itemTotal.toFixed(2)}
                        disabled
                        className="w-full px-3 py-2 border border-rule rounded-md bg-paper-2 text-sm text-ink-2"
                      />
                    </div>

                    <div className="col-span-2 flex justify-center gap-2">
                      {showSaveButton && (
                        <button
                          type="button"
                          onClick={() => saveElement(index)}
                          disabled={isSaving}
                          className="p-2 text-success hover:bg-success-soft rounded-md transition-colors disabled:opacity-30"
                          title="Guardar cambios"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-2 text-danger hover:bg-danger-soft rounded-md transition-colors disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notas y Totales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notas */}
          <div className="bg-paper border border-rule rounded-lg p-6">
            <h3 className="text-lg font-semibold text-ink mb-4">Notas</h3>
            <textarea
              {...register("notes")}
              rows={4}
              placeholder="Notas adicionales..."
              className="min-h-20 py-2 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3 resize-none"
            />
          </div>

          {/* Resumen de Totales */}
          <div className="bg-paper border border-rule rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5 text-ink-2" />
              <h3 className="text-lg font-semibold text-ink">
                Resumen de Totales
              </h3>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-ink-2">Subtotal:</span>
                <span className="font-medium text-ink">
                  {formatCurrency(subtotal)}
                </span>
              </div>

              {/* ITBIS — hidden for 2% since total is subtotal-only */}
              {!(isPurchaseRetention && is2Percent) && (
                <div className="flex justify-between text-sm">
                  <span className="text-success">ITBIS (por elemento):</span>
                  <span className="font-medium text-success">
                    {formatCurrency(taxAmount)}
                  </span>
                </div>
              )}

              {/* 2%: Hide ITBIS, show ISR deduction from subtotal */}
              {isPurchaseRetention && is2Percent && (
                <div className="flex justify-between text-sm">
                  <span className="text-danger">
                    ISR Retenido ({(beneficiaryIsrRate * 100).toFixed(0)}%):
                  </span>
                  <span className="font-medium text-danger">
                    -{formatCurrency(isrRetentionAmount)}
                  </span>
                </div>
              )}

              {/* 10%: Full retention format */}
              {hasFullRetention && (
                <>
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-ink">Total Facturado:</span>
                    <span className="text-ink">
                      {formatCurrency(totalFacturado)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-danger">Itbis Retenido:</span>
                    <span className="font-medium text-danger">
                      -{formatCurrency(itbisRetenido)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-danger">
                      ISR Retenido ({(beneficiaryIsrRate * 100).toFixed(0)}%):
                    </span>
                    <span className="font-medium text-danger">
                      -{formatCurrency(isrRetentionAmount)}
                    </span>
                  </div>
                </>
              )}

              {/* 30%: ISR on ITBIS */}
              {isPurchaseRetention && is30Percent && (
                <div className="flex justify-between text-sm">
                  <span className="text-danger">
                    ISR Retenido ({(beneficiaryIsrRate * 100).toFixed(0)}%):
                  </span>
                  <span className="font-medium text-danger">
                    -{formatCurrency(isrRetentionAmount)}
                  </span>
                </div>
              )}

              <div className="border-t border-rule pt-3">
                <div className="flex justify-between">
                  <span className="text-lg font-bold text-ink">
                    {hasFullRetention ? "Total Pago:" : "Total:"}
                  </span>
                  <span className="text-lg font-bold text-ink">
                    {formatCurrency(total)}
                  </span>
                </div>
                {record.payments && record.payments.length > 0 && (
                  <div className="flex justify-between mt-2">
                    <span className="text-sm font-medium text-success">
                      Total Pagado:
                    </span>
                    <span className="text-sm font-medium text-success">
                      {formatCurrency(
                        record.payments.reduce((sum, p) => sum + p.amount, 0),
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
