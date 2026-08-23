"use client";

import { useState } from "react";
import {
  ArrowRight,
  ChevronDown,
  DollarSign,
  Edit2,
  History,
} from "lucide-react";
import { Modal } from "@/src/components/ui/modal";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { PaymentRecord } from "@/src/types/erp";
import { money } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";

/* Hallmark · design-system: design.md
 *
 * El modal del ojo estaba escrito dos veces —en la ruta de facturas y en el
 * módulo financiero del proyecto— con ~330 y ~300 líneas casi idénticas. Ya
 * habían divergido: el de la ruta muestra «Pendiente» y el número de
 * comprobante, el del proyecto no.
 *
 * Los datos van en una lista de definición de dos columnas en vez de una
 * rejilla de bloques sueltos: en un documento fiscal lo que se busca es un
 * dato concreto, y una columna de etiquetas alineadas se recorre con la vista.
 */

export interface DocumentDetail {
  id: string;
  invoiceNumber: string;
  projectName: string;
  clientName?: string;
  supplierName?: string;
  date: string;
  dueDate: string;
  amount: number;
  paid: number;
  dueToPay: number;
  status: string;
  /** "sale" | "purchase" */
  type: string;
  /** "QUOTE" | "ORDER" | "INVOICE" */
  documentType: string;
  reference?: string;
  payments?: PaymentRecord[];
}

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

const ESTADO: Record<string, { label: string; variant: BadgeVariant }> = {
  paid: { label: "Pagada", variant: "success" },
  pending: { label: "Pendiente", variant: "warning" },
  overdue: { label: "Vencida", variant: "danger" },
  draft: { label: "Borrador", variant: "default" },
};

const METODO: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
  CARD: "Tarjeta",
};

function Dato({
  label,
  children,
  destacado = false,
}: {
  label: string;
  children: React.ReactNode;
  destacado?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule py-2.5 last:border-0">
      <dt className="text-[0.8125rem] text-ink-2">{label}</dt>
      <dd
        className={cn(
          "min-w-0 text-right",
          destacado
            ? "tabular font-mono text-[0.9375rem] font-semibold text-ink"
            : "text-[0.8125rem] font-medium text-ink",
        )}
      >
        {children}
      </dd>
    </div>
  );
}

interface DocumentDetailModalProps {
  open: boolean;
  onClose: () => void;
  invoice: DocumentDetail | null;
  onEdit: (invoice: DocumentDetail) => void;
  onPay: (invoice: DocumentDetail) => void;
  /** Cotización de compra → orden. */
  onConvertToOrder: (invoice: DocumentDetail) => void;
  /** Cotización u orden → factura. */
  onConvertToInvoice: (invoice: DocumentDetail) => void;
}

export function DocumentDetailModal({
  open,
  onClose,
  invoice,
  onEdit,
  onPay,
  onConvertToOrder,
  onConvertToInvoice,
}: DocumentDetailModalProps) {
  const [expandido, setExpandido] = useState<Set<number>>(new Set());

  if (!invoice) return null;

  const esVenta = invoice.type === "sale";
  const estado = ESTADO[invoice.status] ?? ESTADO.draft;
  const pagos = invoice.payments ?? [];
  const convertible =
    invoice.documentType === "QUOTE" || invoice.documentType === "ORDER";

  const alternar = (id: number) =>
    setExpandido((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={invoice.invoiceNumber}
      description={
        invoice.documentType === "QUOTE"
          ? "Cotización"
          : invoice.documentType === "ORDER"
            ? "Orden"
            : "Factura"
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          <Button variant="outline" onClick={() => onEdit(invoice)}>
            <Edit2 className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
            Editar
          </Button>
          {invoice.documentType === "QUOTE" && !esVenta && (
            <Button variant="outline" onClick={() => onConvertToOrder(invoice)}>
              <ArrowRight className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Convertir a orden
            </Button>
          )}
          {convertible && (
            <Button onClick={() => onConvertToInvoice(invoice)}>
              <ArrowRight className="mr-1.5 h-4 w-4" strokeWidth={2} />
              Convertir a factura
            </Button>
          )}
          {invoice.documentType === "INVOICE" && (
            <Button onClick={() => onPay(invoice)}>
              <DollarSign className="mr-1.5 h-4 w-4" strokeWidth={2} />
              Registrar pago
            </Button>
          )}
        </>
      }
    >
      <dl>
        <Dato label="Tipo">
          <Badge variant={esVenta ? "success" : "info"}>
            {esVenta ? "Venta" : "Compra"}
          </Badge>
        </Dato>
        <Dato label="Estado">
          <Badge variant={estado.variant} dot>
            {estado.label}
          </Badge>
        </Dato>
        <Dato label="Proyecto">{invoice.projectName}</Dato>
        <Dato label={esVenta ? "Cliente" : "Proveedor"}>
          {invoice.clientName || invoice.supplierName || "—"}
        </Dato>
        <Dato label="Fecha">
          <span className="tabular">{invoice.date}</span>
        </Dato>
        <Dato label="Vencimiento">
          <span className="tabular">{invoice.dueDate}</span>
        </Dato>
        {invoice.reference && (
          <Dato label="Nº de comprobante">
            <span className="tabular">{invoice.reference}</span>
          </Dato>
        )}
        <Dato label="Monto total" destacado>
          {money(invoice.amount)}
        </Dato>
        {invoice.paid > 0 && (
          <Dato label="Pagado">
            <span className="tabular font-mono text-success">
              {money(invoice.paid)}
            </span>
          </Dato>
        )}
        {invoice.dueToPay > 0 && (
          <Dato label="Pendiente">
            <span className="tabular font-mono text-warning">
              {money(invoice.dueToPay)}
            </span>
          </Dato>
        )}
      </dl>

      {pagos.length > 0 && (
        <section className="mt-5">
          <h4 className="eyebrow mb-2 flex items-center gap-1.5">
            <History className="h-3.5 w-3.5" />
            Historial de pagos ({pagos.length})
          </h4>
          <ul className="divide-y divide-rule overflow-hidden rounded-[8px] border border-rule">
            {pagos.map((pago) => {
              const abierto = expandido.has(pago.id);
              const metodo = METODO[pago.paymentMethod] ?? pago.paymentMethod;
              return (
                <li key={pago.id}>
                  <button
                    type="button"
                    onClick={() => alternar(pago.id)}
                    aria-expanded={abierto}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors duration-[120ms] hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold"
                  >
                    <span className="min-w-0">
                      <span className="tabular block text-[0.8125rem] font-medium text-ink">
                        {new Date(pago.date).toLocaleDateString("es-DO", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                      <span className="block text-[0.75rem] text-ink-3">
                        {metodo}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="tabular font-mono text-[0.8125rem] font-semibold text-success">
                        {money(pago.amount)}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-ink-3 transition-transform duration-[120ms]",
                          abierto && "rotate-180",
                        )}
                        aria-hidden
                      />
                    </span>
                  </button>

                  {abierto && (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-rule bg-paper-2 px-3 py-3">
                      <div>
                        <dt className="eyebrow">Método</dt>
                        <dd className="mt-0.5 text-[0.75rem] text-ink">
                          {metodo}
                        </dd>
                      </div>
                      <div>
                        <dt className="eyebrow">Fecha</dt>
                        <dd className="mt-0.5 text-[0.75rem] text-ink">
                          {new Date(pago.date).toLocaleDateString("es-DO", {
                            weekday: "long",
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })}
                        </dd>
                      </div>
                      {pago.reference && (
                        <div>
                          <dt className="eyebrow">Referencia</dt>
                          <dd className="tabular mt-0.5 text-[0.75rem] text-ink">
                            {pago.reference}
                          </dd>
                        </div>
                      )}
                      {pago.currency && (
                        <div>
                          <dt className="eyebrow">Moneda</dt>
                          <dd className="mt-0.5 text-[0.75rem] text-ink">
                            {pago.currency}
                          </dd>
                        </div>
                      )}
                      {pago.type && (
                        <div>
                          <dt className="eyebrow">Tipo</dt>
                          <dd className="mt-0.5 text-[0.75rem] text-ink">
                            {pago.type === "CREDIT_PAYMENT"
                              ? "Pago con crédito"
                              : "Pago"}
                          </dd>
                        </div>
                      )}
                      {pago.state && (
                        <div>
                          <dt className="eyebrow">Estado</dt>
                          <dd className="mt-0.5 text-[0.75rem] text-ink">
                            {pago.state}
                          </dd>
                        </div>
                      )}
                      {pago.description && (
                        <div className="col-span-2">
                          <dt className="eyebrow">Descripción</dt>
                          <dd className="mt-0.5 text-[0.75rem] text-ink">
                            {pago.description}
                          </dd>
                        </div>
                      )}
                    </dl>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </Modal>
  );
}
