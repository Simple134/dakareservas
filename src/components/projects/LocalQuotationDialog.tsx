"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  X,
  Calculator,
  Users,
  Building2,
  Calendar,
  FileText,
  Plus,
} from "lucide-react";
import { Beneficiary } from "@/src/types/erp";
import AddBeneficiaryModal from "@/src/components/AddBeneficiaryModal";

interface LocalQuotationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  localData: {
    id: number;
    level: number;
    area_mt2: number;
    price_per_mt2: number;
    total_value: number;
    separation_10?: number;
    separation_45?: number;
    status: string;
  } | null;
  projectName: string;
  projectId: string;
  projectEndDate?: string;
}

interface QuotationForm {
  beneficiaryId: number;
  quotationDate: string;
  validUntil: string;
  numberOfInstallments: number;
  terms: string;
  notes: string;
  projectEndDate?: string;
}

export function LocalQuotationDialog({
  isOpen,
  onClose,
  localData,
  projectName,
  projectId,
  projectEndDate,
}: LocalQuotationDialogProps) {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBeneficiaryModalOpen, setIsBeneficiaryModalOpen] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] =
    useState<Beneficiary | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<QuotationForm>({
    defaultValues: {
      beneficiaryId: 0,
      quotationDate: new Date().toISOString().split("T")[0],
      validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      numberOfInstallments: 12,
      terms:
        "Esta cotización es válida por 3 días y está sujeta a disponibilidad del local.",
      notes: "",
    },
  });

  const watchBeneficiaryId = watch("beneficiaryId");
  const watchNumberOfInstallments = watch("numberOfInstallments");
  const watchQuotationDate = watch("quotationDate");

  // Fetch beneficiaries
  useEffect(() => {
    const fetchBeneficiaries = async () => {
      if (!isOpen) return;
      try {
        const params = new URLSearchParams({
          withContacts: "true",
        });
        const response = await fetch(
          `/api/erp/beneficiaries?${params.toString()}`,
        );
        if (response.ok) {
          const data = await response.json();
          setBeneficiaries(data || []);
        }
      } catch (error) {
        console.error("Error fetching beneficiaries:", error);
      }
    };
    fetchBeneficiaries();
  }, [isOpen]);

  // Update selected beneficiary when ID changes
  useEffect(() => {
    if (watchBeneficiaryId) {
      const beneficiary = beneficiaries.find(
        (b) => b.id === Number(watchBeneficiaryId),
      );
      setSelectedBeneficiary(beneficiary || null);
    } else {
      setSelectedBeneficiary(null);
    }
  }, [watchBeneficiaryId, beneficiaries]);

  // Sincronizar validUntil y términos con la última cuota
  useEffect(() => {
    if (watchQuotationDate && watchNumberOfInstallments) {
      const date = new Date(watchQuotationDate);
      date.setMonth(date.getMonth() + watchNumberOfInstallments);
      const dateStr = date.toISOString().split("T")[0];
      setValue("validUntil", dateStr);

      // Actualizar términos para reflejar la validez real si es el valor por defecto
      const currentTerms = watch("terms");
      if (
        !currentTerms ||
        currentTerms.includes("cotización es válida por 3 días")
      ) {
        setValue(
          "terms",
          `Esta cotización es válida hasta el final del plan de pagos (${dateStr}) y está sujeta a disponibilidad del local.`,
        );
      }
    }
  }, [watchQuotationDate, watchNumberOfInstallments, setValue, watch]);

  // Reset form and set installments based on projectEndDate when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (projectEndDate) {
        const end = new Date(projectEndDate);
        const start = new Date();
        const months =
          (end.getFullYear() - start.getFullYear()) * 12 +
          (end.getMonth() - start.getMonth());
        if (months > 0) {
          setValue("numberOfInstallments", months);
        }
      }
    } else {
      reset();
      setSelectedBeneficiary(null);
    }
  }, [isOpen, projectEndDate, reset, setValue]);

  if (!isOpen || !localData) return null;

  // Calculate payment plan
  const separation10 = localData.separation_10 || localData.total_value * 0.1;
  const separation45 = localData.separation_45 || localData.total_value * 0.45;
  const remainingCapital = localData.total_value - separation10 - separation45;
  const installmentAmount = remainingCapital / watchNumberOfInstallments;

  // Generate installments
  const installments = Array.from(
    { length: watchNumberOfInstallments },
    (_, i) => {
      const dueDate = new Date(watchQuotationDate);
      dueDate.setMonth(dueDate.getMonth() + i + 1);
      return {
        installmentNumber: i + 1,
        dueDate: dueDate.toISOString().split("T")[0],
        amount: installmentAmount,
        description: `Cuota ${i + 1} de ${watchNumberOfInstallments}`,
      };
    },
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const generateQuotationPDF = async () => {
    const { generateLocalQuotePDF } =
      await import("@/src/lib/generateLocalQuotePDF");

    await generateLocalQuotePDF({
      localData: localData,
      beneficiary: selectedBeneficiary,
      projectName: projectName,
      paymentPlan: {
        separation10,
        separation45,
        remainingCapital,
        numberOfInstallments: watchNumberOfInstallments,
        installmentAmount,
        installments: installments.map((inst) => ({
          number: inst.installmentNumber,
          dueDate: inst.dueDate,
          amount: inst.amount,
          description: inst.description,
        })),
      },
      quotationDate: watchQuotationDate,
    });
  };

  const onSubmit = async (data: QuotationForm) => {
    setIsSubmitting(true);
    try {
      // 1. Generar PDF
      await generateQuotationPDF();

      // 2. Crear cotización en pending records
      const quotationPayload = {
        type: "QUOTE",
        isSell: true,
        divisionId: Number(projectId),
        beneficiaryId: data.beneficiaryId,
        currency: "DOP",
        isInstantDelivery: false,
        date: new Date(data.quotationDate).toISOString(),
        dueDate: new Date(data.validUntil).toISOString(),
        reference: `${Math.random().toString(36).substring(2, 7).toUpperCase()}-L${localData.id}`,
        notes: data.notes || "",
        elements: [
          {
            description: `Local #${localData.id} - Nivel ${localData.level} - ${localData.area_mt2.toFixed(2)} m²`,
            quantity: 1,
            unit: "unidad",
            price: localData.total_value,
            variation: 0,
            taxes: [],
          },
        ],
        // Datos específicos del local en clientdata
        clientdata: {
          localId: localData.id.toString(),
          localInfo: JSON.stringify({
            level: localData.level,
            area: localData.area_mt2,
            pricePerM2: localData.price_per_mt2,
            totalValue: localData.total_value,
          }),
          paymentPlan: JSON.stringify({
            separation10,
            separation45,
            remainingCapital,
            numberOfInstallments: data.numberOfInstallments,
            installmentAmount,
            installments: installments.map((inst) => ({
              number: inst.installmentNumber,
              dueDate: inst.dueDate,
              amount: inst.amount,
              description: inst.description,
            })),
          }),
          terms: data.terms,
          quotationType: "LOCAL_COMMERCIAL",
        },
      };

      const response = await fetch("/api/erp/pendingRecord", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(quotationPayload),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Error al crear cotización");
      }

      alert("Cotización generada y guardada exitosamente!");
      onClose();
    } catch (error) {
      console.error("Error generando cotización:", error);
      alert(
        "Error al generar la cotización: " +
          (error instanceof Error ? error.message : "Error desconocido"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[oklch(21%_0.021_250_/_0.45)] backdrop-blur-[2px] flex items-center justify-center z-50 p-4">
      <div className="bg-paper rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-paper border-b border-rule px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-info" />
            <div>
              <h2 className="text-xl font-semibold text-ink">
                Cotización de Local #{localData.id}
              </h2>
              <p className="text-sm text-ink-3">
                Nivel {localData.level} • {localData.area_mt2.toFixed(2)} m²
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ink-3 hover:text-ink-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Información del Local */}
          <div className="bg-info-soft border border-info/20 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-info" />
              <h3 className="text-lg font-semibold text-ink">
                Información del Local
              </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-ink-2">Número de Local</p>
                <p className="text-lg font-bold text-ink">#{localData.id}</p>
              </div>
              <div>
                <p className="text-sm text-ink-2">Nivel</p>
                <p className="text-lg font-bold text-ink">{localData.level}</p>
              </div>
              <div>
                <p className="text-sm text-ink-2">Área</p>
                <p className="text-lg font-bold text-ink">
                  {localData.area_mt2.toFixed(2)} m²
                </p>
              </div>
              <div>
                <p className="text-sm text-ink-2">Precio por m²</p>
                <p className="text-lg font-bold text-ink">
                  {formatCurrency(localData.price_per_mt2)}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-info/30">
              <div className="flex justify-between items-center">
                <span className="text-base font-medium text-ink-2">
                  Valor Total del Local:
                </span>
                <span className="text-2xl font-bold text-info">
                  {formatCurrency(localData.total_value)}
                </span>
              </div>
            </div>
          </div>

          {/* Configuración de Fechas */}
          <div className="bg-paper border border-rule rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-ink-2" />
              <h3 className="text-lg font-semibold text-ink">
                Configuración de Cotización
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink-2 mb-1.5">
                  Fecha de Cotización
                </label>
                <input
                  type="date"
                  {...register("quotationDate", { required: true })}
                  className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-2 mb-1.5">
                  Válido Hasta
                </label>
                <input
                  type="date"
                  {...register("validUntil", { required: true })}
                  className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                />
              </div>
            </div>
          </div>

          {/* Información del Cliente */}
          <div className="bg-paper border border-rule rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-ink-2" />
              <h3 className="text-lg font-semibold text-ink">
                Información del Cliente
              </h3>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-ink-2">
                  Cliente
                </label>
                <button
                  type="button"
                  onClick={() => setIsBeneficiaryModalOpen(true)}
                  className="text-xs text-info hover:text-info font-medium flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Añadir nuevo cliente
                </button>
              </div>
              <select
                {...register("beneficiaryId", {
                  required: true,
                  valueAsNumber: true,
                })}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-gold ${
                  errors.beneficiaryId ? "border-danger" : "border-rule-strong"
                }`}
              >
                <option value="">Seleccionar cliente...</option>
                {beneficiaries.map((beneficiary) => (
                  <option key={beneficiary.id} value={beneficiary.id}>
                    {beneficiary.name}
                    {beneficiary.taxId ? ` (${beneficiary.taxId})` : ""}
                  </option>
                ))}
              </select>
              {errors.beneficiaryId && (
                <p className="mt-1 text-sm text-danger">
                  Debe seleccionar un cliente
                </p>
              )}

              {/* Display selected beneficiary info */}
              {selectedBeneficiary && (
                <div className="mt-4 p-4 bg-paper-2 rounded-lg">
                  <p className="text-sm font-medium text-ink">
                    {selectedBeneficiary.name}
                  </p>
                  {selectedBeneficiary.taxId && (
                    <p className="text-sm text-ink-2">
                      RNC/Cédula: {selectedBeneficiary.taxId}
                    </p>
                  )}
                  {selectedBeneficiary.contacts &&
                    selectedBeneficiary.contacts.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {selectedBeneficiary.contacts
                          .filter(
                            (c) => c.type === "email" || c.type === "phone",
                          )
                          .map((contact, idx) => (
                            <p key={idx} className="text-sm text-ink-2">
                              {contact.type === "email" ? "📧" : "📱"}{" "}
                              {contact.data}
                            </p>
                          ))}
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>

          {/* Método de Pago para Capital */}
          <div className="bg-paper border border-rule rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5 text-ink-2" />
              <h3 className="text-lg font-semibold text-ink">
                Método de Pago para Capital
              </h3>
            </div>

            {/* Separaciones */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-success-soft border border-success/20 rounded-lg">
                <p className="text-sm text-ink-2 mb-1">Separación 10%</p>
                <p className="text-xl font-bold text-success">
                  {formatCurrency(separation10)}
                </p>
              </div>
              <div className="p-4 bg-warning-soft border border-warning/25 rounded-lg">
                <p className="text-sm text-ink-2 mb-1">Inicial 45%</p>
                <p className="text-xl font-bold text-warning">
                  {formatCurrency(separation45)}
                </p>
              </div>
              <div className="p-4 bg-info-soft border border-info/20 rounded-lg">
                <p className="text-sm text-ink-2 mb-1">Capital Restante</p>
                <p className="text-xl font-bold text-info">
                  {formatCurrency(remainingCapital)}
                </p>
              </div>
            </div>

            {/* Número de Cuotas */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-ink-2 mb-1.5">
                Número de Cuotas Mensuales
              </label>
              <input
                type="number"
                {...register("numberOfInstallments", {
                  valueAsNumber: true,
                  min: 1,
                })}
                className="w-full md:w-32 px-3 py-2 border border-rule-strong rounded-md focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <span className="ml-2 text-ink-2">meses</span>
              <p className="mt-2 text-sm text-ink-2">
                Cuota mensual:{" "}
                <span className="font-semibold text-ink">
                  {formatCurrency(installmentAmount)}
                </span>
              </p>
            </div>

            {/* Tabla de Pagos */}
            <div className="border border-rule rounded-lg overflow-hidden">
              <div className="bg-paper-2 px-4 py-2 border-b border-rule">
                <h4 className="font-semibold text-ink">Plan de Pagos</h4>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-paper-3 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-ink-2">
                        #
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-ink-2">
                        Fecha de Pago
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-ink-2">
                        Monto
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule">
                    {installments.map((installment) => (
                      <tr
                        key={installment.installmentNumber}
                        className="hover:bg-paper-2"
                      >
                        <td className="px-4 py-2 text-sm text-ink">
                          {installment.installmentNumber}
                        </td>
                        <td className="px-4 py-2 text-sm text-ink-2">
                          {formatDate(installment.dueDate)}
                        </td>
                        <td className="px-4 py-2 text-sm text-ink text-right font-medium">
                          {formatCurrency(installment.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Términos y Condiciones */}
          <div className="bg-paper border border-rule rounded-lg p-6">
            <h3 className="text-lg font-semibold text-ink mb-4">
              Términos y Condiciones
            </h3>
            <textarea
              {...register("terms")}
              rows={3}
              className="min-h-20 py-2 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3 resize-none focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="Términos y condiciones de la cotización..."
            />
          </div>

          {/* Notas Adicionales */}
          <div className="bg-paper border border-rule rounded-lg p-6">
            <h3 className="text-lg font-semibold text-ink mb-4">
              Notas Adicionales
            </h3>
            <textarea
              {...register("notes")}
              rows={3}
              className="min-h-20 py-2 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3 resize-none focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="Notas adicionales (opcional)..."
            />
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-rule">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2 border border-rule-strong text-ink-2 rounded-md hover:bg-paper-2 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-info text-white rounded-md hover:bg-info transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Generar Cotización
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Add Beneficiary Modal */}
      <AddBeneficiaryModal
        isOpen={isBeneficiaryModalOpen}
        onClose={() => setIsBeneficiaryModalOpen(false)}
        onSuccess={async () => {
          // Refetch beneficiaries after adding a new one
          try {
            const params = new URLSearchParams({
              type: "CLIENT",
              withContacts: "true",
            });
            const response = await fetch(
              `/api/erp/beneficiaries?${params.toString()}`,
            );
            if (response.ok) {
              const data = await response.json();
              setBeneficiaries(data || []);
              // Select the newly added beneficiary (last in the list)
              if (data && data.length > 0) {
                const newBeneficiary = data[data.length - 1];
                setValue("beneficiaryId", newBeneficiary.id);
              }
            }
          } catch (error) {
            console.error("Error refetching beneficiaries:", error);
          }
        }}
      />
    </div>
  );
}
