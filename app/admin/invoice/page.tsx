"use client";

import { useState, useEffect } from "react";
import {
  Filter,
  Eye,
  Edit2,
  Trash2,
  Download,
  X,
  TrendingUp,
  ShoppingCart,
  Clock,
  Image as ImageIcon,
  History,
  Plus,
} from "lucide-react";
import { PageHeader, PageBody } from "@/src/components/ui/page-header";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { SearchInput } from "@/src/components/ui/search-input";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";
import { Pagination } from "@/src/components/ui/pagination";
import { TabsBar } from "@/src/components/ui/tabs-bar";
import { FilterChip, FilterGroup } from "@/src/components/ui/filter-chip";
import { KPICard } from "@/src/components/dashboard/KPICard";
import { MenuButton } from "@/src/components/ui/menu-button";
import { DocumentDetailModal } from "@/src/components/dashboard/DocumentDetailModal";
import { FilePreviewModal } from "@/src/components/dashboard/FilePreviewModal";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { money, count as fmtCount } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";

type BadgeVariant =
  "default" | "outline" | "brand" | "success" | "warning" | "danger" | "info";

const DOC_TABS = [
  { id: "QUOTE", label: "Cotizaciones" },
  { id: "ORDER", label: "Órdenes" },
  { id: "INVOICE", label: "Facturas" },
  { id: "HISTORY", label: "Historial", icon: History },
] as const;

const NUEVOS_DOCUMENTOS = [
  { transaccion: "sale", documento: "quote", label: "Cotización de venta" },
  {
    transaccion: "purchase",
    documento: "quote",
    label: "Cotización de compra",
  },
  { transaccion: "sale", documento: "order", label: "Orden de venta" },
  { transaccion: "purchase", documento: "order", label: "Orden de compra" },
  { transaccion: "sale", documento: "invoice", label: "Factura de venta" },
  { transaccion: "purchase", documento: "invoice", label: "Factura de compra" },
] as const;
import type {
  InvoiceItem,
  InvoicesResponse,
  Beneficiary,
  Division,
  PaymentRecord,
} from "@/src/types/erp";
import { useErp } from "@/src/context/ErpContext";
import { CreateInvoiceDialog } from "@/src/components/dashboard/CreateInvoice";
import { EditInvoiceDialog } from "@/src/components/dashboard/EditInvoiceDialog";
import { generateQuotePDF } from "@/lib/generateQuotePDF";
import { generateInvoicePDF } from "@/lib/generateInvoicePDF";
import { PayInvoiceModal } from "@/src/components/dashboard/PayInvoiceModal";
import { ConvertModal } from "@/src/components/dashboard/ConvertModal";
import { useAuth } from "@/src/context/AuthContext";

interface InvoiceDisplay {
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
  type: string;
  documentType: string;
  attachedFileUrl?: string;
  attachedFileName?: string;
  reference?: string;
  payments?: PaymentRecord[];
}

/* La misma fila de acciones se pintaba dos veces —una en la tabla de
 * escritorio y otra en la tarjeta de móvil— con seis botones duplicados en
 * cada sitio. Al extraerla, añadir o quitar una acción se hace una sola vez.
 */
function AccionDoc({
  label,
  onClick,
  children,
  tono = "neutro",
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  tono?: "neutro" | "peligro";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "rounded-[6px] p-1.5 transition-colors duration-[120ms]",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold",
        tono === "peligro"
          ? "text-ink-3 hover:bg-danger-soft hover:text-danger"
          : "text-ink-3 hover:bg-paper-3 hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

function AccionesDocumento({
  invoice,
  enHistorial,
  onVer,
  onPdf,
  onEditar,
  onEliminar,
  onComprobante,
}: {
  invoice: InvoiceDisplay;
  enHistorial: boolean;
  onVer: (i: InvoiceDisplay) => void;
  onPdf: (i: InvoiceDisplay) => void;
  onEditar: (i: InvoiceDisplay) => void;
  onEliminar: (id: string, numero: string, tipoDoc: string) => void;
  onComprobante: (url: string, nombre?: string) => void;
}) {
  return (
    <>
      <AccionDoc label="Ver documento" onClick={() => onVer(invoice)}>
        <Eye className="h-4 w-4" strokeWidth={1.75} />
      </AccionDoc>
      <AccionDoc label="Descargar PDF" onClick={() => onPdf(invoice)}>
        <Download className="h-4 w-4" strokeWidth={1.75} />
      </AccionDoc>
      {!enHistorial && (
        <>
          <AccionDoc label="Editar" onClick={() => onEditar(invoice)}>
            <Edit2 className="h-4 w-4" strokeWidth={1.75} />
          </AccionDoc>
          <AccionDoc
            label="Eliminar"
            tono="peligro"
            onClick={() =>
              onEliminar(
                invoice.id,
                invoice.invoiceNumber,
                invoice.documentType,
              )
            }
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          </AccionDoc>
        </>
      )}
      {invoice.attachedFileUrl && (
        <AccionDoc
          label="Ver comprobante"
          onClick={() =>
            onComprobante(invoice.attachedFileUrl!, invoice.attachedFileName)
          }
        >
          <ImageIcon className="h-4 w-4" strokeWidth={1.75} />
        </AccionDoc>
      )}
    </>
  );
}

function mapErpToInvoice(
  erpInvoice: InvoiceItem,
  beneficiariesMap: Record<number, string> = {},
  divisions: Division[] = [],
  beneficiaryIsrMap: Record<number, number> = {},
): InvoiceDisplay {
  const beneficiaryName =
    beneficiariesMap[erpInvoice.beneficiaryId] ||
    `Beneficiario ${erpInvoice.beneficiaryId}`;
  const division = divisions.find((d) => d.id === erpInvoice.divisionId);

  let status = "pending";

  if (erpInvoice.dueToPay === 0 || erpInvoice.paid >= erpInvoice.amount) {
    status = "paid";
  } else if (erpInvoice.dueDate) {
    const dueDate = new Date(erpInvoice.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dueDate < today && erpInvoice.dueToPay > 0) {
      status = "overdue";
    }
  } else if (erpInvoice.state === "DRAFT" || erpInvoice.state === "PENDING") {
    status = "draft";
  }

  let attachedFileUrl: string | undefined;
  let attachedFileName: string | undefined;
  if (erpInvoice.metadata && typeof erpInvoice.metadata === "object") {
    const meta = erpInvoice.metadata;
    if (meta.files && Array.isArray(meta.files) && meta.files.length > 0) {
      attachedFileUrl = meta.files[0].s3Key as string;
      attachedFileName = meta.files[0].fileName as string | undefined;
    } else if (meta.attachedfileurl) {
      attachedFileUrl = meta.attachedfileurl as string;
    }
  }
  let displayAmount = erpInvoice.dueToPay;
  const isPurchase = erpInvoice.isSell === 0;
  const isrRate = beneficiaryIsrMap[erpInvoice.beneficiaryId] || 0;
  if (isPurchase && isrRate > 0) {
    if (isrRate >= 0.1 && isrRate < 0.3) {
      // 10%: Full retention — ITBIS retained + ISR on subtotal
      const isrAmount = erpInvoice.subTotal * isrRate;
      const itbisRetenido = erpInvoice.taxes;
      displayAmount =
        erpInvoice.subTotal + erpInvoice.taxes - itbisRetenido - isrAmount;
    } else if (isrRate >= 0.3) {
      // 30%: ISR applied to ITBIS
      const isrAmount = erpInvoice.taxes * isrRate;
      displayAmount = erpInvoice.subTotal + erpInvoice.taxes - isrAmount;
    } else {
      // 2%: ISR on subtotal only, no ITBIS
      const isrAmount = erpInvoice.subTotal * isrRate;
      displayAmount = erpInvoice.subTotal - isrAmount;
    }
  }

  const elementTitle = erpInvoice.elements?.[0]?.comment;

  return {
    id: String(erpInvoice.id),
    invoiceNumber: erpInvoice.taxId || `INV-${erpInvoice.id}`,
    projectName:
      elementTitle ||
      division?.name ||
      erpInvoice.description ||
      "Sin proyecto",
    clientName: erpInvoice.isSell ? beneficiaryName : undefined,
    supplierName: !erpInvoice.isSell ? beneficiaryName : undefined,
    date: erpInvoice.date
      ? new Date(erpInvoice.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    dueDate: erpInvoice.dueDate
      ? new Date(erpInvoice.dueDate).toISOString().split("T")[0]
      : erpInvoice.date
        ? new Date(erpInvoice.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
    amount: displayAmount,
    paid: erpInvoice.paid || 0,
    dueToPay: erpInvoice.dueToPay || 0,
    status: status,
    type: erpInvoice.isSell === 1 ? "sale" : "purchase",
    documentType:
      erpInvoice.type === "QUOTE"
        ? "QUOTE"
        : erpInvoice.type === "ORDER"
          ? "ORDER"
          : "INVOICE",
    attachedFileUrl,
    attachedFileName,
    reference: erpInvoice.reference || undefined,
    payments: erpInvoice.payments || [],
  };
}

export default function InvoicesPage() {
  const { divisions, isLoading: isLoadingContext } = useErp();
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceDisplay[]>([]);
  const [rawInvoices, setRawInvoices] = useState<InvoiceItem[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  const [isLoadingBeneficiaries, setIsLoadingBeneficiaries] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [resume, setResume] = useState<{
    toCharge: number;
    totalCharged: number;
    toPay: number;
    totalPaid: number;
    toChargeRecordsCount: number;
    toPayRecordsCount: number;
  }>({
    toCharge: 0,
    totalCharged: 0,
    toPay: 0,
    totalPaid: 0,
    toChargeRecordsCount: 0,
    toPayRecordsCount: 0,
  });
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedDocumentType, setSelectedDocumentType] = useState("all");
  const [activeTab, setActiveTab] = useState<
    "QUOTE" | "INVOICE" | "ORDER" | "HISTORY"
  >("QUOTE");

  // History tab state
  const [historyFromDate, setHistoryFromDate] = useState(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDay.toISOString();
  });
  const [historyToDate, setHistoryToDate] = useState(() => {
    const now = new Date();
    const lastDay = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    return lastDay.toISOString();
  });
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyInvoices, setHistoryInvoices] = useState<InvoiceDisplay[]>([]);
  const [historyRawInvoices, setHistoryRawInvoices] = useState<InvoiceItem[]>(
    [],
  );
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSellFilter, setIsSellFilter] = useState<"all" | "true" | "false">(
    "all",
  );
  const [showWithImages, setShowWithImages] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [beneficiariesMap, setBeneficiariesMap] = useState<
    Record<number, string>
  >({});
  const [beneficiaryIsrMap, setBeneficiaryIsrMap] = useState<
    Record<number, number>
  >({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [createDialogState, setCreateDialogState] = useState<{
    isOpen: boolean;
    documentType: "invoice" | "quote" | "order";
    transactionType: "sale" | "purchase";
  }>({
    isOpen: false,
    documentType: "invoice",
    transactionType: "sale",
  });
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    invoiceId: string | null;
    invoiceNumber: string | null;
    documentType: string | null;
  }>({
    isOpen: false,
    invoiceId: null,
    invoiceNumber: null,
    documentType: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewModalState, setViewModalState] = useState<{
    isOpen: boolean;
    invoice: InvoiceDisplay | null;
  }>({
    isOpen: false,
    invoice: null,
  });

  const [payModalState, setPayModalState] = useState<{
    isOpen: boolean;
    invoice: InvoiceDisplay | null;
  }>({
    isOpen: false,
    invoice: null,
  });
  const [editModalState, setEditModalState] = useState<{
    isOpen: boolean;
    record: InvoiceItem | null;
  }>({
    isOpen: false,
    record: null,
  });

  const [convertModalState, setConvertModalState] = useState<{
    isOpen: boolean;
    invoiceId: string | null;
    invoiceNumber: string | null;
  }>({
    isOpen: false,
    invoiceId: null,
    invoiceNumber: null,
  });

  const [imagePreviewState, setImagePreviewState] = useState<{
    isOpen: boolean;
    imageUrl: string | null;
    fileName?: string | null;
  }>({
    isOpen: false,
    imageUrl: null,
    fileName: null,
  });

  useEffect(() => {
    const fetchBeneficiaries = async () => {
      setIsLoadingBeneficiaries(true);
      try {
        const response = await fetch("/api/erp/beneficiaries");
        if (response.ok) {
          const beneficiaries: Beneficiary[] = await response.json();
          const map: Record<number, string> = {};
          const isrMap: Record<number, number> = {};
          beneficiaries.forEach((b) => {
            map[b.id] = b.name;
            const isr = b.metadata?.isrTaxRetention;
            if (isr) {
              isrMap[b.id] = Number(isr);
            }
          });
          setBeneficiariesMap(map);
          setBeneficiaryIsrMap(isrMap);
        }
      } catch (error) {
        console.error("Error fetching beneficiaries:", error);
      } finally {
        setIsLoadingBeneficiaries(false);
      }
    };
    fetchBeneficiaries();
  }, []);

  useEffect(() => {
    const fetchInvoices = async () => {
      setIsLoadingInvoices(true);
      try {
        const params = new URLSearchParams({
          search: "",
          ignoreDetailedData: "false",
          state: "PENDING",
          amount: "0",
          type: activeTab,
          isSell: isSellFilter === "all" ? "" : isSellFilter,
          elements: String(itemsPerPage),
          page: String(currentPage),
        });

        const advancedSearch: {
          field: string;
          method: string;
          value: string;
        }[] = [];
        if (activeTab === "QUOTE" || activeTab === "ORDER") {
          advancedSearch.push({
            field: "sourcePendingRecordId",
            method: "is null",
            value: "",
          });
        }
        if (showWithImages) {
          advancedSearch.push({
            field: "$files",
            method: "is not null",
            value: "",
          });
        }
        if (advancedSearch.length > 0) {
          params.append("advancedSearch", JSON.stringify(advancedSearch));
        }

        const response = await fetch(
          `/api/erp/pendingRecord?${params.toString()}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: InvoicesResponse = await response.json();
        setRawInvoices(data.items || []);
        setTotalPages(data.totalPages || 1);
        setTotalItems(data.totalItems || 0);

        // Guardar resume data del API
        if (data.resume) {
          setResume({
            toCharge: data.resume.toCharge || 0,
            totalCharged: data.resume.totalCharged || 0,
            toPay: data.resume.toPay || 0,
            totalPaid: data.resume.totalPaid || 0,
            toChargeRecordsCount: data.resume.toChargeRecordsCount || 0,
            toPayRecordsCount: data.resume.toPayRecordsCount || 0,
          });
        }
      } catch (error) {
        console.error("❌ Error fetching invoices:", error);
      } finally {
        setIsLoadingInvoices(false);
      }
    };

    if (activeTab !== "HISTORY") {
      fetchInvoices();
    }
  }, [
    currentPage,
    itemsPerPage,
    refreshKey,
    activeTab,
    isSellFilter,
    showWithImages,
  ]);

  // Fetch history (paid) invoices
  useEffect(() => {
    if (activeTab !== "HISTORY") return;

    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const params = new URLSearchParams({
          itemsPerPage: "10",
          amountMethod: "ALL",
          amount: "0",
          fromDate: historyFromDate,
          state: "COMPLETED",
          toDate: historyToDate,
          page: String(historyPage),
        });

        const response = await fetch(
          `/api/erp/pendingRecord?${params.toString()}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: InvoicesResponse = await response.json();
        setHistoryRawInvoices(data.items || []);
        setHistoryTotalPages(data.totalPages || 1);
      } catch (error) {
        console.error("❌ Error fetching history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [activeTab, historyFromDate, historyToDate, historyPage, refreshKey]);

  // Map history raw invoices to display format
  useEffect(() => {
    if (activeTab !== "HISTORY") return;
    const mapped = historyRawInvoices.map((item) =>
      mapErpToInvoice(item, beneficiariesMap, divisions, beneficiaryIsrMap),
    );
    const sorted = mapped.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
    setHistoryInvoices(sorted);
  }, [
    historyRawInvoices,
    beneficiariesMap,
    divisions,
    beneficiaryIsrMap,
    activeTab,
  ]);

  useEffect(() => {
    const mapped = rawInvoices.map((item) =>
      mapErpToInvoice(item, beneficiariesMap, divisions, beneficiaryIsrMap),
    );

    // Sort by date descending (newest first)
    const sorted = mapped.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // Descending order
    });

    setInvoices(sorted);
  }, [rawInvoices, beneficiariesMap, divisions, beneficiaryIsrMap]);

  const isLoading =
    isLoadingInvoices || isLoadingBeneficiaries || isLoadingContext;

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoice.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ??
        false) ||
      (invoice.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ??
        false);

    const matchesType = selectedType === "all" || invoice.type === selectedType;
    const matchesDocumentType =
      selectedDocumentType === "all" ||
      invoice.documentType === selectedDocumentType;
    const matchesStatus =
      selectedStatuses.length === 0 ||
      selectedStatuses.includes(invoice.status);

    return matchesSearch && matchesType && matchesDocumentType && matchesStatus;
  });

  // Recalculate resume totals with corrected ISR (subtotal-based + ITBIS retention)
  const { correctedToPay, correctedToCharge } = (() => {
    let toPay = 0;
    let toCharge = 0;
    rawInvoices.forEach((inv) => {
      const isPurchase = inv.isSell === 0;
      const isrRate = beneficiaryIsrMap[inv.beneficiaryId] || 0;
      let amount = inv.dueToPay;
      if (isPurchase && isrRate > 0) {
        if (isrRate >= 0.1 && isrRate < 0.3) {
          // 10%: Full retention
          const isrAmount = inv.subTotal * isrRate;
          const itbisRetenido = inv.taxes;
          amount = inv.subTotal + inv.taxes - itbisRetenido - isrAmount;
        } else if (isrRate >= 0.3) {
          // 30%: ISR on ITBIS
          const isrAmount = inv.taxes * isrRate;
          amount = inv.subTotal + inv.taxes - isrAmount;
        } else {
          // 2%: ISR on subtotal only
          const isrAmount = inv.subTotal * isrRate;
          amount = inv.subTotal - isrAmount;
        }
      }
      if (isPurchase) {
        toPay += amount;
      } else {
        toCharge += amount;
      }
    });
    return { correctedToPay: toPay, correctedToCharge: toCharge };
  })();
  const totalSalesToCharge = correctedToCharge;
  const totalPurchasesToPay = correctedToPay;
  const pendingRecordsCount =
    resume.toChargeRecordsCount + resume.toPayRecordsCount;

  /* Los estados pasan de pares de clases sueltas a las variantes del sistema:
   * la misma escala que usan el dashboard y la ficha de proyecto, para que
   * «pagada» tenga el mismo verde en las tres pantallas. */
  const getStatusBadge = (
    status: string,
  ): { label: string; variant: BadgeVariant } => {
    const statusConfig: Record<
      string,
      { label: string; variant: BadgeVariant }
    > = {
      paid: { label: "Pagada", variant: "success" },
      pending: { label: "Pendiente", variant: "warning" },
      overdue: { label: "Vencida", variant: "danger" },
      draft: { label: "Borrador", variant: "default" },
    };

    return statusConfig[status] ?? statusConfig.draft;
  };

  const getTypeBadge = (
    type: string,
  ): { label: string; variant: BadgeVariant } =>
    type === "sale"
      ? { label: "Venta", variant: "success" }
      : { label: "Compra", variant: "info" };

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  };

  const hasActiveFilters =
    selectedType !== "all" ||
    selectedDocumentType !== "all" ||
    selectedStatuses.length > 0 ||
    searchTerm !== "";

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedType("all");
    setSelectedDocumentType("all");
    setSelectedStatuses([]);
    setShowWithImages(false);
  };

  const handleCreateInvoice = (
    transactionType: "sale" | "purchase",
    documentType: "invoice" | "quote" | "order",
  ) => {
    setCreateDialogState({
      isOpen: true,
      transactionType,
      documentType,
    });
  };

  const handleInvoiceCreated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleDeleteClick = (
    invoiceId: string,
    invoiceNumber: string,
    documentType: string,
  ) => {
    setDeleteModalState({
      isOpen: true,
      invoiceId,
      invoiceNumber,
      documentType,
    });
  };

  const handlePayInvoice = (invoice: InvoiceDisplay) => {
    setPayModalState({
      isOpen: true,
      invoice,
    });
    handleViewClose();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalState.invoiceId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/erp/pendingRecord/${deleteModalState.invoiceId}`,
        {
          method: "PATCH",
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Error response:", errorData);
        throw new Error(errorData.details || "Error al eliminar el documento");
      }

      // Cerrar modal y refrescar lista
      setDeleteModalState({
        isOpen: false,
        invoiceId: null,
        invoiceNumber: null,
        documentType: null,
      });
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("❌ Error deleting invoice:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Error al eliminar el documento. Por favor, intenta de nuevo.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalState({
      isOpen: false,
      invoiceId: null,
      invoiceNumber: null,
      documentType: null,
    });
  };

  const handleViewClick = (invoice: InvoiceDisplay) => {
    setViewModalState({
      isOpen: true,
      invoice,
    });
  };

  const handleViewClose = () => {
    setViewModalState({
      isOpen: false,
      invoice: null,
    });
  };

  const handleEditClick = (invoice: InvoiceDisplay) => {
    // Find the full record from rawInvoices
    const fullRecord = rawInvoices.find((r) => String(r.id) === invoice.id);
    if (fullRecord) {
      setEditModalState({
        isOpen: true,
        record: fullRecord,
      });
    }
  };

  const handleEditClose = () => {
    setEditModalState({
      isOpen: false,
      record: null,
    });
  };

  const handleConvertRecord = async (
    invoiceId: string,
    newType: "ORDER" | "INVOICE",
    metadata?: {
      files: { s3Key: string; fileName: string }[];
      reference?: string;
    },
  ) => {
    try {
      // 1. Buscar el registro original completo
      const originalRecord = rawInvoices.find(
        (r) => String(r.id) === invoiceId,
      );
      if (!originalRecord) {
        throw new Error("No se encontró el registro original");
      }

      // 2. Si no tiene elements, obtenerlos del API
      let recordWithElements = originalRecord;
      if (!originalRecord.elements || originalRecord.elements.length === 0) {
        const detailsResponse = await fetch(
          `/api/erp/pendingRecord/${originalRecord.id}`,
        );
        if (detailsResponse.ok) {
          recordWithElements = await detailsResponse.json();
        }
      }

      // 3. Crear el nuevo registro con los datos del original
      const createFromData = {
        description: recordWithElements.description,
        notes: recordWithElements.notes,
        divisionId: recordWithElements.divisionId,
        beneficiaryId: recordWithElements.beneficiaryId,
        type: newType,
        isSell: Boolean(recordWithElements.isSell), // Convertir 0/1 a boolean
        date: recordWithElements.date,
        dueDate: recordWithElements.dueDate,
        currency: recordWithElements.currency,
        generateTaxId: "none",
        taxId: "",
        updatePrices: false,
        createFirstInvoice: false,
        sourcePendingRecordId: recordWithElements.id,
        clientdata:
          typeof recordWithElements.clientdata === "object" &&
          recordWithElements.clientdata !== null
            ? recordWithElements.clientdata
            : undefined,
        metadata: {
          ...(recordWithElements.metadata || {}),
          ...(metadata ? { files: metadata.files } : {}),
        },
        ...(metadata?.reference ? { reference: metadata.reference } : {}),
        elements:
          recordWithElements.elements?.map((el) => ({
            description: el.description,
            unit: el.unit,
            quantity: el.quantity,
            price: el.price,
            variation: el.variation,
            ...(el.resourceId ? { resourceId: el.resourceId } : {}), // ← Solo incluir si existe
            taxes: el.taxes?.map((tax) => ({ taxRateId: tax.taxRateId })) ?? [],
          })) ?? [],
      };

      const response = await fetch(`/api/erp/pendingRecord`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createFromData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || "Error al convertir el documento");
      }

      // 4. Refresh list
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("❌ Error converting record:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Error al convertir el documento.",
      );
    }
  };

  const handleDownloadPDF = async (invoice: InvoiceDisplay) => {
    try {
      // Find the full record from rawInvoices
      const fullRecord = rawInvoices.find((r) => String(r.id) === invoice.id);
      if (!fullRecord) {
        throw new Error("No se pudo encontrar el registro completo");
      }

      // Fetch full details including elements if not present
      let recordWithElements = fullRecord;
      if (!fullRecord.elements || fullRecord.elements.length === 0) {
        const detailsResponse = await fetch(
          `/api/erp/pendingRecord/${fullRecord.id}`,
        );
        if (detailsResponse.ok) {
          recordWithElements = await detailsResponse.json();
        }
      }

      // Fetch beneficiary details
      const beneficiaryResponse = await fetch(
        `/api/erp/beneficiaries?withContacts=true`,
      );
      let beneficiary = null;
      if (beneficiaryResponse.ok) {
        const beneficiaries = await beneficiaryResponse.json();
        beneficiary =
          beneficiaries.find(
            (b: Beneficiary) => b.id === fullRecord.beneficiaryId,
          ) || null;
      }

      // Check if it's a purchase record with ISR retention
      const isPurchase = recordWithElements.isSell === 0;
      const isrRate = beneficiary?.metadata?.isrTaxRetention
        ? Number(beneficiary.metadata.isrTaxRetention)
        : 0;
      const hasRetention = isPurchase && isrRate > 0;

      // Generate PDF directly, automatically applying retention if present
      await generatePDFForRecord(
        recordWithElements,
        beneficiary,
        hasRetention,
        hasRetention ? isrRate : 0,
      );
    } catch (error) {
      console.error("❌ Error generating PDF:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Error al generar el PDF. Por favor, intenta de nuevo.",
      );
    }
  };

  const generatePDFForRecord = async (
    recordWithElements: InvoiceItem,
    beneficiary: Beneficiary | null,
    applyRetention: boolean,
    retentionRate: number,
  ) => {
    // Check if it is a Local Quotation
    const isLocalQuotation =
      (recordWithElements.reference &&
        recordWithElements.reference.toLowerCase().includes("local")) ||
      (typeof recordWithElements.clientdata !== "string" &&
        recordWithElements.clientdata?.quotationType === "LOCAL_COMMERCIAL");
    if (
      isLocalQuotation &&
      recordWithElements.clientdata &&
      typeof recordWithElements.clientdata !== "string"
    ) {
      // Parse local specific data
      const clientData = recordWithElements.clientdata;
      let localInfo;
      let paymentPlan;

      try {
        localInfo =
          typeof clientData.localInfo === "string"
            ? JSON.parse(clientData.localInfo)
            : clientData.localInfo;

        paymentPlan =
          typeof clientData.paymentPlan === "string"
            ? JSON.parse(clientData.paymentPlan)
            : clientData.paymentPlan;
      } catch (e) {
        console.error("Error parsing local data:", e);
        throw new Error("Datos de cotización de local inválidos");
      }

      const { generateLocalQuotePDF } =
        await import("@/src/lib/generateLocalQuotePDF");

      // Get project name
      const division = divisions.find(
        (d) => d.id === recordWithElements.divisionId,
      );
      await generateLocalQuotePDF({
        localData: {
          id: Number(clientData.localId),
          level: localInfo.level,
          area_mt2: localInfo.area,
          price_per_mt2: localInfo.pricePerM2,
          total_value: localInfo.totalValue,
          status: "DISPONIBLE",
        },
        beneficiary,
        projectName: division?.name || "",
        paymentPlan: paymentPlan,
        quotationDate: recordWithElements.date,
      });
    } else {
      const division = divisions.find(
        (d) => d.id === recordWithElements.divisionId,
      );
      const projectName = division?.name || "";
      const category = recordWithElements.elements?.[0]?.comment || "";

      if (recordWithElements.type === "INVOICE") {
        await generateInvoicePDF({
          invoice: recordWithElements,
          beneficiary,
          elements: recordWithElements.elements || [],
          payments: recordWithElements.payments || [],
          isSell: recordWithElements.isSell === 1,
          userName: user?.user_metadata?.full_name || user?.email || "",
          applyRetention,
          retentionRate,
          projectName,
          category,
        });
      } else {
        await generateQuotePDF({
          quote: recordWithElements,
          beneficiary,
          elements: recordWithElements.elements || [],
          documentType: recordWithElements.type as "QUOTE" | "ORDER",
          isSell: recordWithElements.isSell === 1,
          userName: user?.user_metadata?.full_name || user?.email || "",
          applyRetention,
          retentionRate,
          projectName,
          category,
        });
      }
    }
  };

  const TITULO: Record<string, { title: string; description: string }> = {
    QUOTE: {
      title: "Cotizaciones",
      description:
        "Propuestas emitidas y recibidas, antes de convertirse en orden o factura.",
    },
    ORDER: {
      title: "Órdenes",
      description: "Órdenes de compra y de venta en curso.",
    },
    INVOICE: {
      title: "Facturas",
      description: "Documentos fiscales de venta y de compra.",
    },
    HISTORY: {
      title: "Historial",
      description:
        "Todos los documentos del período, incluidos los cerrados y archivados.",
    },
  };

  const encabezado = TITULO[activeTab] ?? TITULO.INVOICE;

  return (
    <>
      <PageHeader
        title={encabezado.title}
        description={encabezado.description}
        actions={
          <MenuButton
            label="Crear documento"
            icon={Plus}
            variant="default"
            options={NUEVOS_DOCUMENTOS.map((opcion) => ({
              label: opcion.label,
              icon: opcion.transaccion === "sale" ? TrendingUp : ShoppingCart,
              tone: opcion.transaccion === "sale" ? "success" : "info",
              onSelect: () =>
                handleCreateInvoice(opcion.transaccion, opcion.documento),
            }))}
          />
        }
      />

      <PageBody className="space-y-5">
        <TabsBar
          tabs={DOC_TABS}
          value={activeTab}
          onChange={(id) => {
            setActiveTab(id);
            if (id === "HISTORY") setHistoryPage(1);
          }}
          aria-label="Tipos de documento"
        />

        {/* KPIs — en Historial el rango de fechas ocupa su sitio */}
        {activeTab !== "HISTORY" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <KPICard
              loading={isLoading}
              kpi={{
                title: "Ventas por cobrar",
                value: money(totalSalesToCharge),
                icon: "TrendingUp",
                hint: "Saldo pendiente de clientes",
              }}
            />
            <KPICard
              loading={isLoading}
              kpi={{
                title: "Compras por pagar",
                value: money(totalPurchasesToPay),
                icon: "Wallet",
                hint: "Saldo pendiente a proveedores",
              }}
            />
            <KPICard
              loading={isLoading}
              kpi={{
                title: "Documentos pendientes",
                value: fmtCount(pendingRecordsCount),
                icon: "Receipt",
                hint: "Sin saldar en esta vista",
              }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 rounded-[12px] border border-rule bg-paper p-4 sm:grid-cols-2 sm:max-w-lg">
            <div>
              <label htmlFor="desde" className="eyebrow mb-1.5 block">
                Desde
              </label>
              <input
                id="desde"
                type="date"
                value={historyFromDate.split("T")[0]}
                onChange={(e) => {
                  const d = new Date(e.target.value + "T04:00:00.000Z");
                  setHistoryFromDate(d.toISOString());
                  setHistoryPage(1);
                }}
                className="tabular h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold"
              />
            </div>
            <div>
              <label htmlFor="hasta" className="eyebrow mb-1.5 block">
                Hasta
              </label>
              <input
                id="hasta"
                type="date"
                value={historyToDate.split("T")[0]}
                onChange={(e) => {
                  const d = new Date(e.target.value + "T23:59:59.999Z");
                  setHistoryToDate(d.toISOString());
                  setHistoryPage(1);
                }}
                className="tabular h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold"
              />
            </div>
          </div>
        )}

        {/* Búsqueda y filtros */}
        {activeTab !== "HISTORY" && (
          <section className="space-y-4 rounded-[12px] border border-rule bg-paper p-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <SearchInput
                className="flex-1"
                value={searchTerm}
                onValueChange={setSearchTerm}
                placeholder="Buscar por número, proyecto, cliente o proveedor…"
              />
              <Button
                variant={isFilterOpen ? "secondary" : "outline"}
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                <Filter className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
                Filtros
                {(hasActiveFilters || showWithImages) && (
                  <span className="tabular ml-1.5 rounded-full bg-gold-soft px-1.5 text-[0.6875rem] font-semibold text-gold-strong">
                    {(selectedType !== "all" ? 1 : 0) +
                      (selectedDocumentType !== "all" ? 1 : 0) +
                      selectedStatuses.length +
                      (showWithImages ? 1 : 0)}
                  </span>
                )}
              </Button>
            </div>

            {/* Filtros activos: cada uno se quita pulsándolo */}
            {(hasActiveFilters || showWithImages) && (
              <div className="flex flex-wrap gap-1.5">
                {selectedType !== "all" && (
                  <FilterChip active onClick={() => setSelectedType("all")}>
                    {selectedType === "sale" ? "Ventas" : "Compras"}
                    <X className="h-3 w-3" />
                  </FilterChip>
                )}
                {selectedDocumentType !== "all" && (
                  <FilterChip
                    active
                    onClick={() => setSelectedDocumentType("all")}
                  >
                    {selectedDocumentType === "quote"
                      ? "Cotizaciones"
                      : selectedDocumentType === "order"
                        ? "Órdenes"
                        : "Facturas"}
                    <X className="h-3 w-3" />
                  </FilterChip>
                )}
                {showWithImages && (
                  <FilterChip active onClick={() => setShowWithImages(false)}>
                    Con comprobante
                    <X className="h-3 w-3" />
                  </FilterChip>
                )}
                {selectedStatuses.map((status) => (
                  <FilterChip
                    key={status}
                    active
                    onClick={() => toggleStatus(status)}
                  >
                    {getStatusBadge(status).label}
                    <X className="h-3 w-3" />
                  </FilterChip>
                ))}
              </div>
            )}

            {isFilterOpen && (
              <div className="grid gap-5 border-t border-rule pt-4 md:grid-cols-3">
                <FilterGroup label="Transacción" icon={TrendingUp}>
                  <FilterChip
                    active={isSellFilter === "all"}
                    onClick={() => setIsSellFilter("all")}
                  >
                    Todas
                  </FilterChip>
                  <FilterChip
                    icon={TrendingUp}
                    active={isSellFilter === "true"}
                    onClick={() => setIsSellFilter("true")}
                  >
                    Ventas
                  </FilterChip>
                  <FilterChip
                    icon={ShoppingCart}
                    active={isSellFilter === "false"}
                    onClick={() => setIsSellFilter("false")}
                  >
                    Compras
                  </FilterChip>
                </FilterGroup>

                <FilterGroup label="Estado" icon={Clock}>
                  {(["paid", "pending", "overdue", "draft"] as const).map(
                    (estado) => (
                      <FilterChip
                        key={estado}
                        active={selectedStatuses.includes(estado)}
                        count={
                          invoices.filter((i) => i.status === estado).length
                        }
                        onClick={() => toggleStatus(estado)}
                      >
                        {getStatusBadge(estado).label}
                      </FilterChip>
                    ),
                  )}
                </FilterGroup>

                <FilterGroup label="Extras" icon={ImageIcon}>
                  <FilterChip
                    icon={ImageIcon}
                    active={showWithImages}
                    onClick={() => setShowWithImages(!showWithImages)}
                  >
                    Con comprobante
                  </FilterChip>
                </FilterGroup>

                <div className="md:col-span-3">
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Limpiar filtros
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Listado */}
        <section className="overflow-hidden rounded-[12px] border border-rule bg-paper">
          <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule px-4 py-3">
            <h2 className="font-display text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">
              {encabezado.title}
            </h2>
            <p className="tabular text-[0.75rem] text-ink-3">
              {fmtCount(
                (activeTab === "HISTORY" ? historyInvoices : filteredInvoices)
                  .length,
              )}{" "}
              documentos
            </p>
          </header>

          {/* Móvil: la tabla de nueve columnas no cabe por debajo de md. */}
          <ul className="divide-y divide-rule md:hidden">
            {(activeTab === "HISTORY" ? isLoadingHistory : isLoading) ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <li key={idx} className="space-y-2 px-4 py-3" aria-busy>
                  <div className="h-3 w-24 animate-pulse rounded bg-paper-3" />
                  <div className="h-3 w-40 animate-pulse rounded bg-paper-3" />
                  <div className="h-3 w-20 animate-pulse rounded bg-paper-3" />
                </li>
              ))
            ) : (activeTab === "HISTORY" ? historyInvoices : filteredInvoices)
                .length === 0 ? (
              <li className="px-4 py-10 text-center text-[0.8125rem] text-ink-3">
                No se encontraron documentos.
              </li>
            ) : (
              (activeTab === "HISTORY"
                ? historyInvoices
                : filteredInvoices
              ).map((invoice) => {
                const statusBadge = getStatusBadge(invoice.status);
                const typeBadge = getTypeBadge(invoice.type);
                return (
                  <li key={invoice.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="tabular truncate text-[0.8125rem] font-medium text-ink">
                          {invoice.invoiceNumber}
                        </p>
                        <p className="truncate text-[0.75rem] text-ink-3">
                          {invoice.projectName}
                        </p>
                      </div>
                      <Badge variant={typeBadge.variant}>
                        {typeBadge.label}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span
                        className={cn(
                          "tabular font-mono text-[0.8125rem] font-semibold",
                          invoice.type === "sale" ? "text-success" : "text-ink",
                        )}
                      >
                        {invoice.type === "sale" ? "+" : "−"}
                        {money(invoice.amount)}
                      </span>
                      <Badge variant={statusBadge.variant} dot>
                        {statusBadge.label}
                      </Badge>
                    </div>
                    <div className="mt-1.5 flex items-center justify-between gap-3 text-[0.75rem] text-ink-3">
                      <span className="truncate">
                        {invoice.clientName || invoice.supplierName}
                      </span>
                      <span className="tabular shrink-0">{invoice.date}</span>
                    </div>
                    <div className="mt-2.5 flex items-center gap-0.5 border-t border-rule pt-2">
                      <AccionesDocumento
                        invoice={invoice}
                        enHistorial={activeTab === "HISTORY"}
                        onVer={handleViewClick}
                        onPdf={handleDownloadPDF}
                        onEditar={handleEditClick}
                        onEliminar={handleDeleteClick}
                        onComprobante={(url, nombre) =>
                          setImagePreviewState({
                            isOpen: true,
                            imageUrl: url,
                            fileName: nombre,
                          })
                        }
                      />
                    </div>
                  </li>
                );
              })
            )}
          </ul>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Proyecto</TableHead>
                  <TableHead>Cliente / Proveedor</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead numeric>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(activeTab === "HISTORY" ? isLoadingHistory : isLoading) ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <TableRow key={idx} aria-busy>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <TableCell key={j}>
                          <div className="h-3 w-full animate-pulse rounded bg-paper-3" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (activeTab === "HISTORY"
                    ? historyInvoices
                    : filteredInvoices
                  ).length === 0 ? (
                  <TableEmpty colSpan={9}>
                    No se encontraron documentos con estos filtros.
                  </TableEmpty>
                ) : (
                  (activeTab === "HISTORY"
                    ? historyInvoices
                    : filteredInvoices
                  ).map((invoice) => {
                    const statusBadge = getStatusBadge(invoice.status);
                    const typeBadge = getTypeBadge(invoice.type);
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="tabular text-[0.8125rem] font-medium text-ink">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          <Badge variant={typeBadge.variant}>
                            {typeBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-48 truncate text-[0.8125rem] text-ink-2">
                          {invoice.projectName}
                        </TableCell>
                        <TableCell className="max-w-48 truncate text-[0.8125rem] text-ink-2">
                          {invoice.clientName || invoice.supplierName}
                        </TableCell>
                        <TableCell className="tabular text-[0.8125rem] text-ink-2">
                          {invoice.date}
                        </TableCell>
                        <TableCell className="tabular text-[0.8125rem] text-ink-2">
                          {invoice.dueDate}
                        </TableCell>
                        <TableCell
                          numeric
                          className={cn(
                            "text-[0.8125rem] font-semibold",
                            invoice.type === "sale"
                              ? "text-success"
                              : "text-ink",
                          )}
                        >
                          {invoice.type === "sale" ? "+" : "−"}
                          {money(invoice.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadge.variant} dot>
                            {statusBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-0.5">
                            <AccionesDocumento
                              invoice={invoice}
                              enHistorial={activeTab === "HISTORY"}
                              onVer={handleViewClick}
                              onPdf={handleDownloadPDF}
                              onEditar={handleEditClick}
                              onEliminar={handleDeleteClick}
                              onComprobante={(url, nombre) =>
                                setImagePreviewState({
                                  isOpen: true,
                                  imageUrl: url,
                                  fileName: nombre,
                                })
                              }
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {activeTab !== "HISTORY" && (
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              perPage={itemsPerPage}
              noun="documentos"
              onPageChange={setCurrentPage}
            />
          )}
          {activeTab === "HISTORY" && (
            <Pagination
              page={historyPage}
              totalPages={historyTotalPages}
              noun="documentos"
              onPageChange={setHistoryPage}
            />
          )}
        </section>

        <CreateInvoiceDialog
          isOpen={createDialogState.isOpen}
          onClose={() =>
            setCreateDialogState((prev) => ({ ...prev, isOpen: false }))
          }
          documentType={createDialogState.documentType}
          transactionType={createDialogState.transactionType}
          onCreateInvoice={handleInvoiceCreated}
        />
      </PageBody>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={deleteModalState.isOpen}
        title={
          activeTab === "QUOTE" ? "Eliminar cotización" : "Archivar documento"
        }
        description={
          activeTab === "QUOTE" ? (
            <>
              La cotización{" "}
              <span className="tabular font-semibold text-ink">
                {deleteModalState.invoiceNumber}
              </span>{" "}
              se borra por completo. No se puede deshacer.
            </>
          ) : (
            <>
              El documento{" "}
              <span className="tabular font-semibold text-ink">
                {deleteModalState.invoiceNumber}
              </span>{" "}
              deja de aparecer en el listado. No se borra: sigue en el
              historial, porque es un documento fiscal.
            </>
          )
        }
        confirmLabel={activeTab === "QUOTE" ? "Eliminar" : "Archivar"}
        pendingLabel={activeTab === "QUOTE" ? "Eliminando…" : "Archivando…"}
        pending={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      <DocumentDetailModal
        open={viewModalState.isOpen}
        onClose={handleViewClose}
        invoice={viewModalState.invoice}
        onEdit={(invoice) => {
          handleViewClose();
          handleEditClick(invoice as InvoiceDisplay);
        }}
        onPay={(invoice) => handlePayInvoice(invoice as InvoiceDisplay)}
        onConvertToOrder={(invoice) => {
          handleConvertRecord(invoice.id, "ORDER");
          handleViewClose();
        }}
        onConvertToInvoice={(invoice) => {
          handleViewClose();
          setConvertModalState({
            isOpen: true,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
          });
        }}
      />

      {/* Edit Invoice Modal */}
      {editModalState.isOpen && editModalState.record && (
        <EditInvoiceDialog
          isOpen={editModalState.isOpen}
          onClose={handleEditClose}
          record={editModalState.record}
          onUpdate={handleInvoiceCreated}
        />
      )}

      {/* Pay Invoice Modal */}
      {payModalState.isOpen && payModalState.invoice && (
        <PayInvoiceModal
          isOpen={payModalState.isOpen}
          onClose={() => setPayModalState({ isOpen: false, invoice: null })}
          invoice={{
            id: payModalState.invoice.id,
            invoiceNumber: payModalState.invoice.invoiceNumber,
            clientName: payModalState.invoice.clientName,
            supplierName: payModalState.invoice.supplierName,
            amount: payModalState.invoice.amount,
            paid: payModalState.invoice.paid,
            dueToPay: payModalState.invoice.dueToPay,
            type: payModalState.invoice.type as "sale" | "purchase",
            reference: payModalState.invoice.reference,
          }}
          onPaymentSuccess={() => {
            setRefreshKey((prev) => prev + 1);
            setPayModalState({ isOpen: false, invoice: null });
          }}
        />
      )}

      {/* Convert Modal (Order -> Invoice) */}
      {convertModalState.isOpen && (
        <ConvertModal
          isOpen={convertModalState.isOpen}
          onClose={() =>
            setConvertModalState({
              isOpen: false,
              invoiceId: null,
              invoiceNumber: null,
            })
          }
          invoiceNumber={convertModalState.invoiceNumber || ""}
          onConfirm={async (convertData) => {
            if (convertModalState.invoiceId) {
              await handleConvertRecord(
                convertModalState.invoiceId,
                "INVOICE",
                convertData,
              );
            }
          }}
        />
      )}
      {/* File Preview Modal */}
      <FilePreviewModal
        open={imagePreviewState.isOpen}
        onClose={() =>
          setImagePreviewState({
            isOpen: false,
            imageUrl: null,
            fileName: null,
          })
        }
        fileUrl={imagePreviewState.imageUrl}
        fileName={imagePreviewState.fileName}
      />
    </>
  );
}
