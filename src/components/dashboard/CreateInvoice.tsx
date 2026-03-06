"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import {
  Plus,
  Trash2,
  Calculator,
  Building2,
  TrendingUp,
  X,
} from "lucide-react";

import { useGestiono } from "@/src/context/Gestiono";
import {
  GestionoBeneficiary,
  PendingRecord,
  PendingRecordElement,
  TaxRate,
} from "@/src/types/gestiono";
import AddBeneficiaryModal from "@/src/components/AddBeneficiaryModal";

// Props mínimas para el componente (solo UI)
interface BudgetCategory {
  id: string;
  name: string;
  amount: number;
  percentage: number;
}

interface CreateInvoiceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  clientName?: string;
  documentType?: "quote" | "order" | "invoice";
  transactionType?: "sale" | "purchase";
  budgetCategories?: BudgetCategory[];
  onCreateInvoice?: (invoice: Partial<PendingRecord>) => void;
}

export function CreateInvoiceDialog({
  isOpen,
  onClose,
  projectId,
  documentType = "invoice",
  transactionType = "sale",
  budgetCategories = [],
  onCreateInvoice,
}: CreateInvoiceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [gestionoBeneficiaries, setGestionoBeneficiaries] = useState<
    GestionoBeneficiary[]
  >([]);
  const [selectedBeneficiary, setSelectedBeneficiary] =
    useState<GestionoBeneficiary | null>(null);

  const [taxesList, setTaxesList] = useState<TaxRate[]>([]);
  const [generalTitle, setGeneralTitle] = useState("");

  const { divisions: gestionoDivisions } = useGestiono();
  const [selectedDivisionId, setSelectedDivisionId] = useState<number>(183);
  const [isBeneficiaryModalOpen, setIsBeneficiaryModalOpen] = useState(false);

  // Map documentType to Gestiono API type
  const getGestionoType = (): "INVOICE" | "QUOTE" | "ORDER" => {
    switch (documentType) {
      case "quote":
        return "QUOTE";
      case "order":
        return "ORDER";
      default:
        return "INVOICE";
    }
  };

  // Get Spanish document name
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

  // Form usando PendingRecord
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<
    Partial<
      PendingRecord & {
        conditions?: string;
        shippingAddress?: string;
        contactPerson?: string;
        requestedFrom?: string;
        sendTo?: string;
        supplierPhone?: string;
        authorizedBy?: string;
        authorizedDate?: string;
        preparedBy?: string;
      }
    >
  >({
    defaultValues: {
      type: getGestionoType(),
      date: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      isSell: transactionType === "sale" ? true : false,
      divisionId: selectedDivisionId,
      beneficiaryId: 0,
      currency: "DOP",
      isInstantDelivery: false,
      reference: "",
      notes: "",
      // Arrays
      elements: [
        {
          id: 0,
          pendingRecordId: 0,
          description: "",
          quantity: 1,
          unit: "UND",
          price: 0,
          variation: 0,
          taxes: [],
        },
      ],
      conditions: "",
      shippingAddress: "",
      contactPerson: "",
      requestedFrom: "",
      sendTo: "",
      supplierPhone: "",
      authorizedBy: "",
      authorizedDate: "",
      preparedBy: "",
    },
  });

  // useFieldArray para elementos (items de la factura)
  const { fields, append, remove } = useFieldArray({
    control,
    name: "elements",
  });

  const watchElements = watch("elements");
  const watchIsSell = watch("isSell");

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

  // Fetch taxes list
  useEffect(() => {
    const fetchTaxes = async () => {
      if (!isOpen) return;
      try {
        const response = await fetch(`/api/gestiono/taxes`);
        if (response.ok) {
          const data = await response.json();
          setTaxesList(data || []);
          console.log("📋 Taxes list:", data);
        }
      } catch (error) {
        console.error("Error fetching taxes:", error);
      }
    };
    fetchTaxes();
  }, [isOpen]);

  // Update division when context changes or projectId is provided
  useEffect(() => {
    if (isOpen && gestionoDivisions.length > 0) {
      // If projectId is provided, try to find and select that division
      if (projectId) {
        const matchingDivision = gestionoDivisions.find(
          (div) => String(div.id) === projectId,
        );
        if (matchingDivision) {
          setSelectedDivisionId(matchingDivision.id);
          setValue("divisionId", matchingDivision.id);
          return;
        }
      }
      // Otherwise, use the first division
      setSelectedDivisionId(gestionoDivisions[0].id);
      setValue("divisionId", gestionoDivisions[0].id);
    }
  }, [isOpen, gestionoDivisions, projectId, setValue]);

  // Update isSell and type when transactionType or documentType changes
  useEffect(() => {
    if (isOpen) {
      setValue("isSell", transactionType === "sale");
      setValue("type", getGestionoType());
    }
  }, [isOpen, transactionType, documentType, setValue]);

  // Reset form when dialog closes to ensure clean state on next open
  useEffect(() => {
    if (!isOpen) {
      reset();
      setSubmitError(null);
    }
  }, [isOpen, reset]);

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
  const isPurchaseRetention = !watchIsSell && beneficiaryIsrRate > 0;
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

  const discountAmount = 0;
  let total: number;
  if (isPurchaseRetention && is2Percent) {
    // 2%: Subtotal - ISR only, no ITBIS
    total = subtotal - isrRetentionAmount;
  } else if (hasFullRetention) {
    // 10%: Total Facturado - ITBIS - ISR
    total =
      totalFacturado - discountAmount - itbisRetenido - isrRetentionAmount;
  } else if (isPurchaseRetention && is30Percent) {
    // 30%: Subtotal + ITBIS - ISR(on ITBIS)
    total = subtotal + taxAmount - isrRetentionAmount;
  } else {
    total = subtotal + taxAmount - discountAmount;
  }

  // Show category selector only for purchases when budget categories are available
  const showCategories =
    transactionType === "purchase" && budgetCategories.length > 0;

  // Update totals in form
  useEffect(() => {
    setValue("subTotal", subtotal);
    setValue("taxes", taxAmount);
    setValue("amount", total);
    setValue("dueToPay", total);
  }, [subtotal, taxAmount, total, setValue]);

  const addItem = () => {
    append({
      id: 0,
      pendingRecordId: 0,
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

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const handleBeneficiarySelect = (beneficiaryId: string) => {
    const selected = gestionoBeneficiaries.find(
      (b) => String(b.id) === beneficiaryId,
    );
    if (selected) {
      setValue("beneficiaryId", selected.id);
      setSelectedBeneficiary(selected);
    } else {
      setSelectedBeneficiary(null);
    }
  };

  const onSubmit = async (data: Partial<PendingRecord>) => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      console.log("📤 Enviando factura a Gestiono...");

      // Helper function to convert YYYY-MM-DD to ISO 8601
      const formatDateToISO = (dateStr: string | undefined): string => {
        if (!dateStr) return new Date().toISOString();
        try {
          const date = new Date(dateStr);
          return date.toISOString();
        } catch {
          return new Date().toISOString();
        }
      };

      // Preparar payload solo con campos necesarios para el API
      const payload = {
        type: getGestionoType(),
        isSell: data.isSell,
        divisionId: data.divisionId,
        beneficiaryId: data.beneficiaryId,
        currency: data.currency,
        isInstantDelivery: data.isInstantDelivery,
        date: formatDateToISO(data.date),
        dueDate: formatDateToISO(data.dueDate),
        reference: data.reference,
        notes: data.notes,
        elements: (data.elements || []).map((el) => ({
          description: el.description,
          comment: generalTitle,
          quantity: el.quantity,
          price: el.price,
          unit: el.unit,
          variation: el.variation || 0,
          taxes: el.taxes || [],
        })),
      };

      // Keep track of which taxes each element should have
      const elementTaxes = (data.elements || []).map(
        (el) => el.taxes?.[0]?.taxRateId ?? 0,
      );

      console.log("📦 Payload:", payload);

      const response = await fetch("/api/gestiono/pendingRecord", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!result.configured) {
        console.warn("⚠️ Gestiono no está configurado:", result.details);
        reset();
        const dataWithTitle = {
          ...data,
          elements: (data.elements || []).map((el) => ({
            ...el,
            comment: generalTitle,
          })),
        };
        onCreateInvoice?.(dataWithTitle);
        onClose();
        return;
      }

      if (!result.success) {
        throw new Error(result.error || "Error al crear factura");
      }

      console.log("✅ Factura creada en Gestiono:", result);

      // Add taxes to each element via separate endpoint
      const createdElements = result.data?.elements || [];
      for (let i = 0; i < createdElements.length; i++) {
        const taxRateId = elementTaxes[i];
        if (taxRateId > 0 && createdElements[i]?.id) {
          console.log(
            `➕ Adding tax ${taxRateId} to element ${createdElements[i].id}`,
          );
          await fetch(`/api/gestiono/element/taxes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pendingRecordElementId: createdElements[i].id,
              taxRateId,
            }),
          });
        }
      }

      // Reset form and close immediately
      reset();
      // Inyectar el generalTitle como comment en los elementos antes de pasar al callback
      const dataWithTitle = {
        ...data,
        elements: (data.elements || []).map((el) => ({
          ...el,
          comment: generalTitle,
        })),
      };
      onCreateInvoice?.(dataWithTitle);
      onClose();
    } catch (error: unknown) {
      console.error("❌ Error creando factura:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error al crear factura";
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
        <div className="md:sticky md:top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">
              Crear {getDocumentName()} de{" "}
              {transactionType === "sale" ? "Venta" : "Compra"}
            </h2>
            <div className="flex items-center gap-1.5 text-green-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">
                {transactionType === "sale" ? "Venta" : "Compra"}
              </span>
            </div>
          </div>
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

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Configuración del Documento */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Configuración del Documento
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Campos específicos para Cotización y Orden de Compra */}
          {(documentType === "quote" || documentType === "order") && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Información de Envío
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Dirección Pedido
                  </label>
                  <input
                    type="text"
                    {...register("requestedFrom")}
                    placeholder="De donde sale el pedido"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Enviar a
                  </label>
                  <input
                    type="text"
                    {...register("sendTo")}
                    placeholder="Dirección de destino"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {documentType === "quote" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Persona Encargada
                    </label>
                    <input
                      type="text"
                      {...register("contactPerson")}
                      placeholder="Nombre de la persona encargada"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {documentType === "order" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Proyecto
                    </label>
                    <input
                      type="text"
                      {...register("shippingAddress")}
                      placeholder="Nombre del proyecto"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tel.
                  </label>
                  <input
                    type="tel"
                    {...register("supplierPhone")}
                    placeholder="Teléfono de contacto"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Asignación de Proyecto */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">
                Asignación de Proyecto
              </h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Proyecto
              </label>
              <select
                {...register("divisionId", { valueAsNumber: true })}
                onChange={(e) => setSelectedDivisionId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {gestionoDivisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Información del Beneficiario */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Información del{" "}
              {transactionType === "sale" ? "Cliente" : "Proveedor"}
            </h3>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  {transactionType === "sale" ? "Cliente" : "Proveedor"}
                </label>
                <button
                  type="button"
                  onClick={() => setIsBeneficiaryModalOpen(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Añadir nuevo{" "}
                  {transactionType === "sale" ? "Cliente" : "Proveedor"}
                </button>
              </div>
              <select
                {...register("beneficiaryId", { valueAsNumber: true })}
                onChange={(e) => handleBeneficiarySelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Seleccionar beneficiario...</option>
                {gestionoBeneficiaries.map((beneficiary) => (
                  <option key={beneficiary.id} value={beneficiary.id}>
                    {beneficiary.name}{" "}
                    {beneficiary.taxId ? `(${beneficiary.taxId})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Elementos de la Factura */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                Elementos de la {getDocumentName()}
              </h3>
              <button
                type="button"
                onClick={addItem}
                style={{ borderRadius: "50px" }}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 transition-colors text-sm font-medium w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                <span className="font-bold">Agregar Elemento</span>
              </button>
            </div>

            {/* Título General */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Título General
              </label>
              <input
                type="text"
                value={generalTitle}
                onChange={(e) => setGeneralTitle(e.target.value)}
                placeholder="Ej: Materiales, Mano de Obra, Estructura..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Este título se usará como categoría en el presupuesto del
                proyecto.
              </p>
            </div>

            <div className="space-y-3">
              {/* Desktop Header - hidden on mobile */}
              <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-semibold text-gray-700 pb-2 border-b">
                <div className="col-span-4">
                  {showCategories ? "Categoría" : "Descripción"}
                </div>
                <div className="col-span-1">Cant.</div>
                <div className="col-span-1">Unidad</div>
                <div className="col-span-2">Precio</div>
                <div className="col-span-2">Impuesto</div>
                <div className="col-span-1">Total</div>
                <div className="col-span-1"></div>
              </div>

              {fields.map((field, index) => {
                const element = watchElements?.[index];
                const itemSubtotal =
                  (element?.quantity || 0) * (element?.price || 0);
                const elTaxRateId = element?.taxes?.[0]?.taxRateId;
                const elTax = taxesList.find((t) => t.id === elTaxRateId);
                const itemTotal =
                  itemSubtotal + itemSubtotal * (elTax?.rate || 0);

                return (
                  <div key={field.id}>
                    {/* Mobile Card Layout */}
                    <div className="block md:hidden p-3 border border-gray-100 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-500">
                          Elemento {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          disabled={fields.length === 1}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">
                          {showCategories ? "Categoría" : "Descripción"}
                        </label>
                        {showCategories ? (
                          <select
                            onChange={(e) => {
                              const cat = budgetCategories.find(
                                (c) => c.id === e.target.value,
                              );
                              if (cat) {
                                setValue(
                                  `elements.${index}.description`,
                                  cat.name,
                                );
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                          >
                            <option value="">Seleccionar categoría...</option>
                            {budgetCategories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name} (
                                {new Intl.NumberFormat("es-DO", {
                                  style: "currency",
                                  currency: "DOP",
                                  minimumFractionDigits: 0,
                                }).format(cat.amount)}
                                )
                              </option>
                            ))}
                          </select>
                        ) : (
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-gray-500">Cant.</label>
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">
                            Unidad
                          </label>
                          <select
                            value={element?.unit || "UND"}
                            onChange={(e) =>
                              setValue(`elements.${index}.unit`, e.target.value)
                            }
                            className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm bg-white"
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
                            <option value="GL">GL</option>
                            <option value="ROLLO">ROLLO</option>
                            <option value="SACO">SACO</option>
                            <option value="CUBETA">CUBETA</option>
                            <option value="LÁMINA">LÁMINA</option>
                            <option value="VARILLA">VARILLA</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">
                            Precio
                          </label>
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500">
                            Impuesto
                          </label>
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
                            className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
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
                          <label className="text-xs text-gray-500">Total</label>
                          <input
                            type="text"
                            value={itemTotal.toFixed(2)}
                            disabled
                            className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-600"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Desktop Grid Layout */}
                    <div className="hidden md:grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        {showCategories ? (
                          <select
                            onChange={(e) => {
                              const cat = budgetCategories.find(
                                (c) => c.id === e.target.value,
                              );
                              if (cat) {
                                setValue(
                                  `elements.${index}.description`,
                                  cat.name,
                                );
                              }
                            }}
                            className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm bg-white"
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
                            {...register(`elements.${index}.description`)}
                            placeholder="Descripción del elemento"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          />
                        )}
                      </div>

                      <div className="col-span-1">
                        <input
                          type="text"
                          {...register(`elements.${index}.quantity`, {
                            setValueAs: (v: string) =>
                              v === "" ? 0 : Number(v),
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>

                      <div className="col-span-1">
                        <select
                          {...register(`elements.${index}.unit`)}
                          className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm bg-white"
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
                          <option value="ROLLO">ROLLO</option>
                          <option value="SACO">SACO</option>
                          <option value="CUBETA">CUBETA</option>
                          <option value="LÁMINA">LÁMINA</option>
                          <option value="VARILLA">VARILLA</option>
                        </select>
                      </div>

                      <div className="col-span-2">
                        <input
                          type="text"
                          {...register(`elements.${index}.price`, {
                            setValueAs: (v: string) =>
                              v === "" ? 0 : Number(v),
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        />
                      </div>

                      <div className="col-span-2">
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
                          className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="">Sin impuesto</option>
                          {taxesList.map((tax) => (
                            <option key={tax.id} value={tax.id}>
                              {tax.slug} ({(tax.rate * 100).toFixed(0)}%)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-1">
                        <input
                          type="text"
                          value={itemTotal.toFixed(2)}
                          disabled
                          className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-600"
                        />
                      </div>

                      <div className="col-span-1 flex justify-center">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          disabled={fields.length === 1}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-30"
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Notas / Observaciones */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {documentType === "invoice"
                  ? "Notas"
                  : "Observaciones / Instrucciones"}
              </h3>
              <textarea
                {...register("notes")}
                rows={4}
                placeholder={
                  documentType === "invoice"
                    ? "Notas adicionales..."
                    : "Observaciones e instrucciones especiales..."
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
              />
              {documentType === "quote" && (
                <p className="text-xs text-gray-500 mt-2">
                  Esta cotización está sujeta a cambios de precios sin previo
                  aviso o validez por 3 días
                </p>
              )}
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

                {/* {documentType !== "invoice" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Descuento:</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(discountAmount)}
                    </span>
                  </div>
                )} */}

                {/* ITBIS — hidden for 2% since total is subtotal-only */}
                {!(isPurchaseRetention && is2Percent) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">
                      {documentType === "invoice" ? "ITBIS" : "Impuestos"} (por
                      elemento):
                    </span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(taxAmount)}
                    </span>
                  </div>
                )}

                {/* 2%: Hide ITBIS line, show only ISR deduction */}
                {isPurchaseRetention && is2Percent && (
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600">
                      ISR Retenido ({(beneficiaryIsrRate * 100).toFixed(0)}%):
                    </span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(isrRetentionAmount)}
                    </span>
                  </div>
                )}

                {/* 10%: Full retention format */}
                {hasFullRetention && (
                  <>
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-gray-900">Total Facturado:</span>
                      <span className="text-gray-900">
                        {formatCurrency(totalFacturado)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">Itbis Retenido:</span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(itbisRetenido)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">
                        ISR Retenido ({(beneficiaryIsrRate * 100).toFixed(0)}%):
                      </span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(isrRetentionAmount)}
                      </span>
                    </div>
                  </>
                )}

                {/* 30%: ISR on ITBIS */}
                {isPurchaseRetention && is30Percent && (
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600">
                      ISR Retenido ({(beneficiaryIsrRate * 100).toFixed(0)}%):
                    </span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(isrRetentionAmount)}
                    </span>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-gray-900">
                      {hasFullRetention ? "Total Pago" : "Total"}{" "}
                      {documentType === "invoice" ? "" : "RD$"}:
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Campos de autorización para Cotización y Orden de Compra */}
          {/* {(documentType === "quote" || documentType === "order") && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Autorización
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {documentType === "quote"
                      ? "Realizado por"
                      : "Firma Autorizada"}
                  </label>
                  <input
                    type="text"
                    {...register("preparedBy")}
                    placeholder="Nombre"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {documentType === "quote" ? "Autorizado por" : "Fecha"}
                  </label>
                  {documentType === "quote" ? (
                    <input
                      type="text"
                      {...register("authorizedBy")}
                      placeholder="Nombre"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <input
                      type="date"
                      {...register("authorizedDate")}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>
              </div>
            </div>
          )} */}

          {/* Campo específico para Factura: RNC del cliente */}
          {documentType === "invoice" && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Información Fiscal
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    RNC del Cliente
                  </label>
                  <input
                    type="text"
                    {...register("taxId")}
                    placeholder="RNC o Cédula"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Realizado por
                  </label>
                  <input
                    type="text"
                    {...register("preparedBy")}
                    placeholder="Nombre del emisor"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              style={{ borderRadius: "50px" }}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ borderRadius: "50px" }}
              className="px-6 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Creando {getDocumentName().toLowerCase()}...
                </>
              ) : (
                `Crear ${getDocumentName()} de ${transactionType === "sale" ? "Venta" : "Compra"}`
              )}
            </button>
          </div>
        </form>

        {/* Modal para añadir nuevo beneficiario */}
        <AddBeneficiaryModal
          isOpen={isBeneficiaryModalOpen}
          onClose={() => setIsBeneficiaryModalOpen(false)}
          onSuccess={async () => {
            const response = await fetch("/api/gestiono/beneficiaries");
            if (response.ok) {
              await response.json();
              setIsBeneficiaryModalOpen(false);
            }
          }}
        />
      </div>
    </div>
  );
}
