"use client";

import { useEffect, useState, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import {
  Plus,
  Trash2,
  Calculator,
  Building2,
  TrendingUp,
  X,
  ChevronDown,
} from "lucide-react";

import { useErp } from "@/src/context/ErpContext";
import {
  Beneficiary,
  PendingRecord,
  PendingRecordElement,
  TaxRate,
} from "@/src/types/erp";
import AddBeneficiaryModal from "@/src/components/AddBeneficiaryModal";
import { Modal, ModalSection, FieldError } from "@/src/components/ui/modal";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";
import { NativeSelect } from "@/src/components/ui/native-select";
import { Badge } from "@/src/components/ui/badge";

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
  const [erpBeneficiaries, setErpBeneficiaries] = useState<Beneficiary[]>([]);
  const [selectedBeneficiary, setSelectedBeneficiary] =
    useState<Beneficiary | null>(null);

  const [taxesList, setTaxesList] = useState<TaxRate[]>([]);
  const [generalTitle, setGeneralTitle] = useState("");
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
  const [selectedDivisionId, setSelectedDivisionId] = useState<number>(183);
  const [isBeneficiaryModalOpen, setIsBeneficiaryModalOpen] = useState(false);

  // Traduce documentType al tipo de documento del ERP
  const getErpType = (): "INVOICE" | "QUOTE" | "ORDER" => {
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
    setError,
    clearErrors,
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
      type: getErpType(),
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

  // Update division when context changes or projectId is provided
  useEffect(() => {
    if (isOpen && erpDivisions.length > 0) {
      // If projectId is provided, try to find and select that division
      if (projectId) {
        const matchingDivision = erpDivisions.find(
          (div) => String(div.id) === projectId,
        );
        if (matchingDivision) {
          setSelectedDivisionId(matchingDivision.id);
          setValue("divisionId", matchingDivision.id);
          return;
        }
      }
      // Otherwise, use the first division
      setSelectedDivisionId(erpDivisions[0].id);
      setValue("divisionId", erpDivisions[0].id);
    }
  }, [isOpen, erpDivisions, projectId, setValue]);

  // Update isSell and type when transactionType or documentType changes
  useEffect(() => {
    if (isOpen) {
      setValue("isSell", transactionType === "sale");
      setValue("type", getErpType());
    }
  }, [isOpen, transactionType, documentType, setValue]);

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

  // Reset form when dialog closes to ensure clean state on next open
  useEffect(() => {
    if (!isOpen) {
      reset();
      setSubmitError(null);
      setSelectedBeneficiary(null);
      setGeneralTitle("");
      setBeneficiarySearch("");
      setIsBeneficiaryOpen(false);
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
    const selected = erpBeneficiaries.find(
      (b) => String(b.id) === beneficiaryId,
    );
    if (selected) {
      setValue("beneficiaryId", selected.id);
      setSelectedBeneficiary(selected);
    } else {
      setSelectedBeneficiary(null);
    }
  };

  /* El formulario no validaba nada: `formState.errors` se desestructuraba y
   * no se usaba en ningún sitio, y ningún campo llevaba reglas. Se podía
   * guardar un documento sin beneficiario y sin una sola línea — comprobado
   * contra la API: se crea, con importe 0, y nace ya en estado COMPLETED. */
  const validar = (data: Partial<PendingRecord>): boolean => {
    clearErrors();
    let valido = true;

    if (!data.divisionId) {
      setError("divisionId", {
        message: "Elige el proyecto al que pertenece el documento.",
      });
      valido = false;
    }
    if (!data.beneficiaryId) {
      setError("beneficiaryId", {
        message:
          transactionType === "sale"
            ? "Elige el cliente al que se emite."
            : "Elige el proveedor que emite.",
      });
      valido = false;
    }

    const lineas = data.elements ?? [];
    const utiles = lineas.filter(
      (el) => el?.description?.trim() && Number(el.price) > 0,
    );
    if (utiles.length === 0) {
      setError("elements", {
        message:
          "Añade al menos una línea con descripción y precio mayor que cero.",
      });
      valido = false;
    }

    return valido;
  };

  const onSubmit = async (data: Partial<PendingRecord>) => {
    setSubmitError(null);
    if (!validar(data)) return;
    setIsSubmitting(true);

    try {
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
        type: getErpType(),
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

      const response = await fetch("/api/erp/pendingRecord", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!result.configured) {
        console.warn("⚠️ El ERP no está configurado:", result.details);
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

      // Add taxes to each element via separate endpoint
      const createdElements = result.data?.elements || [];
      for (let i = 0; i < createdElements.length; i++) {
        const taxRateId = elementTaxes[i];
        if (taxRateId > 0 && createdElements[i]?.id) {
          await fetch(`/api/erp/element/taxes`, {
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

  const FORM_ID = "crear-documento";
  const esVenta = transactionType === "sale";

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="xl"
      busy={isSubmitting}
      title={
        <span className="flex items-center gap-2">
          {`Crear ${getDocumentName().toLowerCase()}`}
          <Badge variant={esVenta ? "success" : "info"}>
            {esVenta ? "Venta" : "Compra"}
          </Badge>
        </span>
      }
      description={
        esVenta
          ? "Documento que se emite al cliente."
          : "Documento que recibimos de un proveedor."
      }
      footer={
        <>
          {/* El aviso de error vive junto a las acciones: es donde está la
              mirada cuando se pulsa Guardar. */}
          {(submitError || errors.elements) && (
            <p
              role="alert"
              className="mr-auto text-[0.75rem] text-danger sm:max-w-md"
            >
              {submitError ?? (errors.elements?.message as string)}
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
            {`Crear ${getDocumentName().toLowerCase()}`}
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
            Configuración del Documento
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Campos específicos para Cotización y Orden de Compra */}
        {(documentType === "quote" || documentType === "order") && (
          <div className="bg-paper border border-rule rounded-lg p-6">
            <h3 className="text-lg font-semibold text-ink mb-4">
              Información de Envío
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-2 mb-1.5">
                  Dirección Pedido
                </label>
                <input
                  type="text"
                  {...register("requestedFrom")}
                  placeholder="De donde sale el pedido"
                  className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-2 mb-1.5">
                  Enviar a
                </label>
                <input
                  type="text"
                  {...register("sendTo")}
                  placeholder="Dirección de destino"
                  className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                />
              </div>

              {documentType === "quote" && (
                <div>
                  <label className="block text-sm font-medium text-ink-2 mb-1.5">
                    Persona Encargada
                  </label>
                  <input
                    type="text"
                    {...register("contactPerson")}
                    placeholder="Nombre de la persona encargada"
                    className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                  />
                </div>
              )}

              {documentType === "order" && (
                <div>
                  <label className="block text-sm font-medium text-ink-2 mb-1.5">
                    Proyecto
                  </label>
                  <input
                    type="text"
                    {...register("shippingAddress")}
                    placeholder="Nombre del proyecto"
                    className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-ink-2 mb-1.5">
                  Tel.
                </label>
                <input
                  type="tel"
                  {...register("supplierPhone")}
                  placeholder="Teléfono de contacto"
                  className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                />
              </div>
            </div>
          </div>
        )}

        {/* Asignación de Proyecto */}
        <div className="bg-paper border border-rule rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-ink-2" />
            <h3 className="text-lg font-semibold text-ink">
              Asignación de Proyecto
            </h3>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink-2 mb-1.5">
              Proyecto
            </label>
            <NativeSelect
              {...register("divisionId", {
                valueAsNumber: true,
                required: "Elige el proyecto al que pertenece el documento.",
              })}
              invalid={Boolean(errors.divisionId)}
              onChange={(e) => setSelectedDivisionId(Number(e.target.value))}
            >
              <option value="">Selecciona un proyecto…</option>
              {erpDivisions.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.name}
                </option>
              ))}
            </NativeSelect>
            <FieldError>{errors.divisionId?.message as string}</FieldError>
          </div>
        </div>

        {/* Información del Beneficiario */}
        <div className="bg-paper border border-rule rounded-lg p-6">
          <h3 className="text-lg font-semibold text-ink mb-4">
            Información del{" "}
            {transactionType === "sale" ? "Cliente" : "Proveedor"}
          </h3>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-ink-2">
                {transactionType === "sale" ? "Cliente" : "Proveedor"}
              </label>
              <button
                type="button"
                onClick={() => setIsBeneficiaryModalOpen(true)}
                className="text-xs text-info hover:text-info font-medium flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Añadir nuevo{" "}
                {transactionType === "sale" ? "Cliente" : "Proveedor"}
              </button>
            </div>
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
                    <li>
                      <button
                        type="button"
                        onClick={() => {
                          setValue("beneficiaryId", 0);
                          setSelectedBeneficiary(null);
                          setIsBeneficiaryOpen(false);
                          setBeneficiarySearch("");
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-ink-3 hover:bg-paper-2"
                      >
                        Seleccionar beneficiario...
                      </button>
                    </li>
                    {sortedFilteredBeneficiaries.map((b) => (
                      <li key={b.id}>
                        <button
                          type="button"
                          onClick={() => {
                            handleBeneficiarySelect(String(b.id));
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

        {/* Elementos de la Factura */}
        <div className="bg-paper border border-rule rounded-lg p-4 md:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-ink">
              Elementos de la {getDocumentName()}
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
            <div className="hidden md:grid grid-cols-12 gap-2 text-xs font-semibold text-ink-2 pb-2 border-b">
              <div className="col-span-4">Descripción</div>
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
                  <div className="block md:hidden p-3 border border-rule rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-ink-3">
                        Elemento {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={fields.length === 1}
                        className="p-1.5 text-danger hover:bg-danger-soft rounded-md disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
                          <option value="GL">GL</option>
                          <option value="ROLLO">ROLLO</option>
                          <option value="SACO">SACO</option>
                          <option value="CUBETA">CUBETA</option>
                          <option value="LÁMINA">LÁMINA</option>
                          <option value="VARILLA">VARILLA</option>
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
                  <div className="hidden md:grid grid-cols-12 gap-2 items-center">
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
                          setValueAs: (v: string) => (v === "" ? 0 : Number(v)),
                        })}
                        className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
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

                    <div className="col-span-1">
                      <input
                        type="text"
                        value={itemTotal.toFixed(2)}
                        disabled
                        className="w-full px-3 py-2 border border-rule rounded-md bg-paper-2 text-sm text-ink-2"
                      />
                    </div>

                    <div className="col-span-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={fields.length === 1}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notas / Observaciones */}
          <div className="bg-paper border border-rule rounded-lg p-6">
            <h3 className="text-lg font-semibold text-ink mb-4">
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
              className="min-h-20 py-2 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3 resize-none"
            />
            {documentType === "quote" && (
              <p className="text-xs text-ink-3 mt-2">
                Esta cotización está sujeta a cambios de precios sin previo
                aviso o validez por 3 días
              </p>
            )}
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

              {/* {documentType !== "invoice" && (
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-2">Descuento:</span>
                    <span className="font-medium text-ink">
                      {formatCurrency(discountAmount)}
                    </span>
                  </div>
                )} */}

              {/* ITBIS — hidden for 2% since total is subtotal-only */}
              {!(isPurchaseRetention && is2Percent) && (
                <div className="flex justify-between text-sm">
                  <span className="text-success">
                    {documentType === "invoice" ? "ITBIS" : "Impuestos"} (por
                    elemento):
                  </span>
                  <span className="font-medium text-success">
                    {formatCurrency(taxAmount)}
                  </span>
                </div>
              )}

              {/* 2%: Hide ITBIS line, show only ISR deduction */}
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
                    {hasFullRetention ? "Total Pago" : "Total"}{" "}
                    {documentType === "invoice" ? "" : "RD$"}:
                  </span>
                  <span className="text-lg font-bold text-ink">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Campos de autorización para Cotización y Orden de Compra */}
        {/* {(documentType === "quote" || documentType === "order") && (
            <div className="bg-paper border border-rule rounded-lg p-6">
              <h3 className="text-lg font-semibold text-ink mb-4">
                Autorización
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink-2 mb-1.5">
                    {documentType === "quote"
                      ? "Realizado por"
                      : "Firma Autorizada"}
                  </label>
                  <input
                    type="text"
                    {...register("preparedBy")}
                    placeholder="Nombre"
                    className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-2 mb-1.5">
                    {documentType === "quote" ? "Autorizado por" : "Fecha"}
                  </label>
                  {documentType === "quote" ? (
                    <input
                      type="text"
                      {...register("authorizedBy")}
                      placeholder="Nombre"
                      className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                    />
                  ) : (
                    <input
                      type="date"
                      {...register("authorizedDate")}
                      className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                    />
                  )}
                </div>
              </div>
            </div>
          )} */}

        {/* Campo específico para Factura: RNC del cliente */}
        {documentType === "invoice" && (
          <div className="bg-paper border border-rule rounded-lg p-6">
            <h3 className="text-lg font-semibold text-ink mb-4">
              Información Fiscal
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-2 mb-1.5">
                  RNC del Cliente
                </label>
                <input
                  type="text"
                  {...register("taxId")}
                  placeholder="RNC o Cédula"
                  className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-2 mb-1.5">
                  Realizado por
                </label>
                <input
                  type="text"
                  {...register("preparedBy")}
                  placeholder="Nombre del emisor"
                  className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                />
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Modal para añadir nuevo beneficiario */}
      <AddBeneficiaryModal
        isOpen={isBeneficiaryModalOpen}
        onClose={() => setIsBeneficiaryModalOpen(false)}
        onSuccess={async () => {
          const response = await fetch("/api/erp/beneficiaries");
          if (response.ok) {
            await response.json();
            setIsBeneficiaryModalOpen(false);
          }
        }}
      />
    </Modal>
  );
}
