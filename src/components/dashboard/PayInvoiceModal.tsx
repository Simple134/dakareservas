"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  X,
  DollarSign,
  CreditCard,
  Banknote,
  Building2,
  Upload,
} from "lucide-react";

interface PayInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: {
    id: string;
    invoiceNumber: string;
    clientName?: string;
    supplierName?: string;
    amount: number;
    paid: number;
    dueToPay: number;
    type: "sale" | "purchase";
  };
  onPaymentSuccess: () => void;
}

interface PaymentFormData {
  paymentMethod: "CASH" | "TRANSFER" | "CARD";
  accountId: 165;
  amount: number;
  reference?: string;
  description?: string;
  date?: string;
  metadata?: {
    files: Array<{
      s3Key: string;
      fileName: string;
    }>;
  };
}

export function PayInvoiceModal({
  isOpen,
  onClose,
  invoice,
  onPaymentSuccess,
}: PayInvoiceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<PaymentFormData>({
    defaultValues: {
      amount: invoice.dueToPay,
      date: new Date().toISOString().split("T")[0],
      paymentMethod: "CASH",
    },
  });

  const selectedMethod = watch("paymentMethod");

  const onSubmit = async (data: PaymentFormData) => {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      // Validar que el monto no exceda lo pendiente
      if (data.amount > invoice.dueToPay) {
        throw new Error("El monto no puede ser mayor al monto pendiente");
      }

      if (data.amount <= 0) {
        throw new Error("El monto debe ser mayor a 0");
      }

      // Handle file upload if present and required
      let metadata = undefined;
      if (
        (selectedMethod === "TRANSFER" || selectedMethod === "CARD") &&
        selectedFile
      ) {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadRes = await fetch("/api/gestiono/uploadFile", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error("Error al subir el comprobante");
        }

        const uploadData = await uploadRes.json();

        // Construct metadata based on user requirement
        // Assuming uploadData.file.url or uploadData.file.public is the key/link
        const s3Key = uploadData.file.url || uploadData.file.public;

        metadata = {
          files: [
            {
              s3Key: s3Key,
              fileName: selectedFile.name,
            },
          ],
        };
      }

      const payload = {
        ...data,
        accountId: 165,
        date: data.date
          ? new Date(data.date).toISOString()
          : new Date().toISOString(),
        metadata,
      };

      const response = await fetch(
        `/api/gestiono/pendingRecord/pay/${invoice.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Error al procesar el pago");
      }

      // Pago exitoso
      onPaymentSuccess();
    } catch (error) {
      console.error("❌ Error processing payment:", error);
      setSubmitError(
        error instanceof Error ? error.message : "Error al procesar el pago",
      );
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

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case "CASH":
        return <Banknote className="w-5 h-5" />;
      case "CARD":
        return <CreditCard className="w-5 h-5" />;
      case "TRANSFER":
        return <Building2 className="w-5 h-5" />;
      default:
        return <DollarSign className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b z-10 border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Procesar Pago
              </h2>
              <p className="text-sm text-gray-600">{invoice.invoiceNumber}</p>
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
          {/* Invoice Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Resumen de la Factura
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600">
                  {invoice.type === "sale" ? "Cliente" : "Proveedor"}
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {invoice.type === "sale"
                    ? invoice.clientName
                    : invoice.supplierName}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Monto Total</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatCurrency(invoice.amount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Monto Pagado</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatCurrency(invoice.paid)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Monto Pendiente</p>
                <p className="text-sm font-medium text-green-600">
                  {formatCurrency(invoice.dueToPay)}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Método de Pago *
            </label>
            <div className="grid grid-cols-3 gap-3 z-0">
              {(["CASH", "TRANSFER", "CARD"] as const).map((method) => (
                <label
                  key={method}
                  className={`relative flex items-center justify-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedMethod === method
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    value={method}
                    {...register("paymentMethod", { required: true })}
                    className="sr-only"
                  />
                  {getPaymentMethodIcon(method)}
                  <span className="text-sm font-medium">
                    {method === "CASH"
                      ? "Efectivo"
                      : method === "TRANSFER"
                        ? "Transferencia"
                        : "Tarjeta"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* File Upload for Transfer/Card */}
          {(selectedMethod === "TRANSFER" || selectedMethod === "CARD") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Comprobante de Pago
              </label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    {selectedFile
                      ? selectedFile.name
                      : "Click para subir comprobante"}
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                  accept="image/*,application/pdf"
                />
              </label>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Monto a Pagar *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">RD$</span>
              </div>
              <input
                type="number"
                step="0.01"
                {...register("amount", {
                  required: "El monto es requerido",
                  valueAsNumber: true,
                  min: 0.01,
                  max: invoice.dueToPay,
                })}
                className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">
                {errors.amount.message}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Máximo: {formatCurrency(invoice.dueToPay)}
            </p>
          </div>

          {/* Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Referencia *
            </label>
            <input
              type="text"
              {...register("reference", {
                required: "El número de referencia es requerido",
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Número de referencia, cheque, etc."
            />
            {errors.reference && (
              <p className="mt-1 text-sm text-red-600">
                {errors.reference.message}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Número de cheque, transferencia u otro identificador
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Descripción
            </label>
            <textarea
              {...register("description")}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Notas adicionales sobre el pago..."
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Fecha del Pago
            </label>
            <input
              type="date"
              {...register("date")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Procesando..." : "Procesar Pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
