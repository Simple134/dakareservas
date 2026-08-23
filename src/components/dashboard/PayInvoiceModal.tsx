"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  DollarSign,
  CreditCard,
  Banknote,
  Building2,
  Upload,
} from "lucide-react";
import { Modal } from "@/src/components/ui/modal";
import { Button } from "@/src/components/ui/button";

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
    reference?: string;
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
      reference: invoice.reference || "",
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

        const uploadRes = await fetch("/api/erp/uploadFile", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error("Error al subir el comprobante");
        }

        const uploadData = await uploadRes.json();

        // Construct metadata based on user requirement
        // Assuming uploadData.file.url or uploadData.file.public is the key/link
        const s3Key = uploadData.file.public || uploadData.file.url;

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

      const response = await fetch(`/api/erp/pendingRecord/pay/${invoice.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

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

  const FORM_ID = "registrar-pago";

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="md"
      busy={isSubmitting}
      title="Registrar pago"
      description={`${invoice.invoiceNumber} · ${
        invoice.type === "sale" ? "cobro al cliente" : "pago al proveedor"
      }`}
      footer={
        <>
          {submitError && (
            <p
              role="alert"
              className="mr-auto text-[0.75rem] text-danger sm:max-w-xs"
            >
              {submitError}
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
            Registrar pago
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >
        {/* Invoice Summary */}
        <div className="bg-paper-2 border border-rule rounded-lg p-4">
          <h3 className="text-sm font-medium text-ink-2 mb-3">
            Resumen de la Factura
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-ink-2">
                {invoice.type === "sale" ? "Cliente" : "Proveedor"}
              </p>
              <p className="text-sm font-medium text-ink">
                {invoice.type === "sale"
                  ? invoice.clientName
                  : invoice.supplierName}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-2">Monto Total</p>
              <p className="text-sm font-medium text-ink">
                {formatCurrency(invoice.amount)}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-2">Monto Pagado</p>
              <p className="text-sm font-medium text-ink">
                {formatCurrency(invoice.paid)}
              </p>
            </div>
            <div>
              <p className="text-xs text-ink-2">Monto Pendiente</p>
              <p className="text-sm font-medium text-success">
                {formatCurrency(invoice.dueToPay)}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-ink-2 mb-2">
            Método de Pago *
          </label>
          <div className="grid grid-cols-3 gap-3 z-0">
            {(["CASH", "TRANSFER", "CARD"] as const).map((method) => (
              <label
                key={method}
                className={`relative flex items-center justify-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedMethod === method
                    ? "border-info bg-info-soft"
                    : "border-rule hover:border-rule-strong"
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
            <label className="block text-sm font-medium text-ink-2 mb-1.5">
              Comprobante de Pago
            </label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-rule-strong border-dashed rounded-lg cursor-pointer bg-paper-2 hover:bg-paper-3 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 text-ink-3 mb-2" />
                <p className="text-sm text-ink-3">
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
          <label className="block text-sm font-medium text-ink-2 mb-1.5">
            Monto a Pagar *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-ink-3">RD$</span>
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
              className="w-full pl-12 pr-3 py-2 border border-rule-strong rounded-md focus:outline-none focus:ring-2 focus:ring-gold"
              placeholder="0.00"
            />
          </div>
          {errors.amount && (
            <p className="mt-1 text-sm text-danger">{errors.amount.message}</p>
          )}
          <p className="mt-1 text-xs text-ink-3">
            Máximo: {formatCurrency(invoice.dueToPay)}
          </p>
        </div>

        {/* Reference */}
        <div>
          <label className="block text-sm font-medium text-ink-2 mb-1.5">
            Referencia *
          </label>
          <input
            type="text"
            {...register("reference", {
              required: "El número de referencia es requerido",
            })}
            className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
            placeholder="Número de referencia, cheque, etc."
          />
          {errors.reference && (
            <p className="mt-1 text-sm text-danger">
              {errors.reference.message}
            </p>
          )}
          <p className="mt-1 text-xs text-ink-3">
            Número de cheque, transferencia u otro identificador
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-ink-2 mb-1.5">
            Descripción
          </label>
          <textarea
            {...register("description")}
            rows={3}
            className="min-h-20 py-2 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3 resize-none focus:outline-none focus:ring-2 focus:ring-gold"
            placeholder="Notas adicionales sobre el pago..."
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-ink-2 mb-1.5">
            Fecha del Pago
          </label>
          <input
            type="date"
            {...register("date")}
            className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
          />
        </div>
      </form>
    </Modal>
  );
}
