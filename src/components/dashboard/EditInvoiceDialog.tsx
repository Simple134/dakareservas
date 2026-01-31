"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2, Calculator, Building2, X, Save } from "lucide-react";

import { useGestiono } from "@/src/context/Gestiono";
import {
  GestionoBeneficiary,
  PendingRecord,
  PendingRecordElement,
  GestionoInvoiceItem,
  Currency,
} from "@/src/types/gestiono";

interface EditInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  record: GestionoInvoiceItem;
  onUpdate: () => void;
}

export function EditInvoiceDialog({
  isOpen,
  onClose,
  record,
  onUpdate,
}: EditInvoiceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [gestionoBeneficiaries, setGestionoBeneficiaries] = useState<
    GestionoBeneficiary[]
  >([]);
  const [savingElementId, setSavingElementId] = useState<number | null>(null);
  const [originalElements] = useState(record.elements || []);

  const { divisions: gestionoDivisions } = useGestiono();

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
          `/api/gestiono/beneficiaries?${params.toString()}`,
        );
        if (response.ok) {
          const data = await response.json();
          setGestionoBeneficiaries(data || []);
        }
      } catch (error) {
        console.error("Error fetching beneficiaries:", error);
      }
    };
    fetchBeneficiaries();
  }, [isOpen]);

  // Calculate totals
  const subtotal = (watchElements || []).reduce(
    (sum: number, item: any) =>
      sum + (item?.quantity || 0) * (item?.price || 0),
    0,
  );
  const taxAmount = subtotal * 0.18; // ITBIS 18%
  const total = subtotal + taxAmount;

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
      unit: "unidad",
      price: 0,
      variation: 0,
      taxes: [],
    } as PendingRecordElement);
  };

  const removeItem = async (index: number) => {
    const element = watchElements?.[index];

    // If the element has an ID > 0, it exists in the database, so delete it via API
    if (element?.id && element.id > 0) {
      try {
        const response = await fetch(`/api/gestiono/element`, {
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

        console.log("✅ Element deleted:", element.id);
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
      // If element is new (id === 0), create it using POST
      if (!element.id || element.id === 0) {
        const elementPayload = {
          pendingRecordId: record.id,
          description: element.description,
          quantity: Number(element.quantity) || 0,
          unit: element.unit || "unidad",
          price: Number(element.price) || 0,
          variation: Number(element.variation) || 0,
        };

        console.log("📦 Creating new element:", elementPayload);

        const response = await fetch(`/api/gestiono/element`, {
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

        console.log("✅ Elemento creado");
      } else {
        // Update existing element using PATCH
        const elementPayload = {
          id: element.id,
          description: element.description,
          quantity: Number(element.quantity) || 0,
          unit: element.unit || "unidad",
          price: Number(element.price) || 0,
          variation: Number(element.variation) || 0,
        };

        console.log("📦 Updating element:", elementPayload);

        const response = await fetch(`/api/gestiono/element`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(elementPayload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.details || `Error al actualizar elemento ${element.id}`
          );
        }

        console.log("✅ Elemento actualizado");
      }

      // Refresh the data
      onUpdate();
    } catch (error) {
      console.error("Error saving element:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Error al guardar elemento"
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
      original.variation !== Number(currentElement.variation)
    );
  };

  const onSubmit = async (data: Partial<PendingRecord>) => {
    setSubmitError(null);
    setSubmitSuccess(false);
    setIsSubmitting(true);

    try {
      console.log("📤 Actualizando registro...");

      const formatDateToISO = (dateStr: string | undefined): string => {
        if (!dateStr) return new Date().toISOString();
        try {
          const date = new Date(dateStr);
          return date.toISOString();
        } catch {
          return new Date().toISOString();
        }
      };

      // Only update record metadata (dates, notes, reference)
      const recordPayload = {
        id: record.id,
        date: formatDateToISO(data.date),
        dueDate: formatDateToISO(data.dueDate),
        reference: data.reference,
        notes: data.notes,
      };

      console.log("📦 Updating record metadata:", recordPayload);

      const recordResponse = await fetch(
        `/api/gestiono/pendingRecord/update`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(recordPayload),
        }
      );

      if (!recordResponse.ok) {
        const errorData = await recordResponse.json().catch(() => ({}));
        throw new Error(errorData.details || "Error al actualizar registro");
      }

      console.log("✅ Registro actualizado");

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Editar {getDocumentName()}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        {submitError && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-red-600 text-xl">❌</span>
              <div>
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-600 mt-1">{submitError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {submitSuccess && (
          <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-green-600 text-xl">✅</span>
              <div>
                <p className="text-sm font-medium text-green-800">
                  ¡Actualizado exitosamente!
                </p>
                <p className="text-sm text-green-600 mt-1">
                  Los cambios se han guardado correctamente.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Configuración del Documento */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Información Básica
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Número de Referencia
                </label>
                <input
                  type="text"
                  {...register("reference")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Fecha
                </label>
                <input
                  type="date"
                  {...register("date")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Fecha de Vencimiento
                </label>
                <input
                  type="date"
                  {...register("dueDate")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Asignación de Proyecto */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">
                Proyecto y Cliente
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Proyecto
                </label>
                <select
                  {...register("divisionId", { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {gestionoDivisions.map((division) => (
                    <option key={division.id} value={division.id}>
                      {division.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {record.isSell ? "Cliente" : "Proveedor"}
                </label>
                <select
                  {...register("beneficiaryId", { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {gestionoBeneficiaries.map((beneficiary) => (
                    <option key={beneficiary.id} value={beneficiary.id}>
                      {beneficiary.name}
                      {beneficiary.taxId ? ` (${beneficiary.taxId})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Elementos de la Factura */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Elementos</h3>
              <button
                type="button"
                onClick={addItem}
                style={{ borderRadius: "50px" }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span className="font-bold">Agregar Elemento</span>
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-13 gap-2 text-xs font-semibold text-gray-700 pb-2 border-b">
                <div className="col-span-5">Descripción</div>
                <div className="col-span-2">Cantidad</div>
                <div className="col-span-1">Unidad</div>
                <div className="col-span-2">Precio</div>
                <div className="col-span-1">Total</div>
                <div className="col-span-2"></div>
              </div>

              {fields.map((field, index) => {
                const element = watchElements?.[index];
                const itemTotal =
                  (element?.quantity || 0) * (element?.price || 0);
                const showSaveButton = hasElementChanges(index);
                const isSaving = savingElementId === (element?.id || index);

                return (
                  <div
                    key={field.id}
                    className="grid grid-cols-13 gap-2 items-center"
                  >
                    <div className="col-span-5">
                      <input
                        type="text"
                        {...register(`elements.${index}.description`)}
                        placeholder="Descripción del elemento"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        {...register(`elements.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>

                    <div className="col-span-1">
                      <input
                        type="text"
                        {...register(`elements.${index}.unit`)}
                        placeholder="und"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        {...register(`elements.${index}.price`, {
                          valueAsNumber: true,
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>

                    <div className="col-span-1">
                      <input
                        type="text"
                        value={itemTotal.toFixed(2)}
                        disabled
                        className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-600"
                      />
                    </div>

                    <div className="col-span-2 flex justify-center gap-2">
                      {showSaveButton && (
                        <button
                          type="button"
                          onClick={() => saveElement(index)}
                          disabled={isSaving}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors disabled:opacity-30"
                          title="Guardar cambios"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notas y Totales */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Notas */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Notas
              </h3>
              <textarea
                {...register("notes")}
                rows={4}
                placeholder="Notas adicionales..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
              />
            </div>

            {/* Resumen de Totales */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-5 h-5 text-gray-700" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Resumen de Totales
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-green-600">ITBIS (18%):</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(taxAmount)}
                  </span>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-gray-900">
                      Total:
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
