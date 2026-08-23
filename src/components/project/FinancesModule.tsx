"use client";
import { useState, useEffect, useRef, useCallback } from "react";
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
  ArrowRight,
  History,
  Image as ImageIcon,
  Plus,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { SearchInput } from "@/src/components/ui/search-input";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";
import { Pagination } from "@/src/components/ui/pagination";
import { TabsBar } from "@/src/components/ui/tabs-bar";
import { FilterChip, FilterGroup } from "@/src/components/ui/filter-chip";
import { MenuButton } from "@/src/components/ui/menu-button";
import { KPICard } from "@/src/components/dashboard/KPICard";
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
  PaymentRecord,
  // Division,
} from "@/src/types/erp";
// import { useErp } from "@/src/context/ErpContext";
import { CreateInvoiceDialog } from "@/src/components/dashboard/CreateInvoice";
import { EditInvoiceDialog } from "@/src/components/dashboard/EditInvoiceDialog";
import { ConvertModal } from "@/src/components/dashboard/ConvertModal";
import { PayInvoiceModal } from "@/src/components/dashboard/PayInvoiceModal";
import { generateQuotePDF } from "@/lib/generateQuotePDF";
import { generateInvoicePDF } from "@/lib/generateInvoicePDF";
import { useAuth } from "@/src/context/AuthContext";

/* La fila de acciones se repetía completa en la tabla y en la tarjeta de
 * móvil: siete botones duplicados. */
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

interface FinancesModuleProps {
  projectId: string | number;
  projectName?: string;
  budgetCategories?: {
    id: string;
    name: string;
    amount: number;
    percentage: number;
  }[];
  refreshTrigger?: number;
  onConvertSaleToInvoice?: (title: string, amount: number) => void;
}

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

function AccionesDoc({
  invoice,
  activeTab,
  onVer,
  onPdf,
  onEditar,
  onEliminar,
  onConvertir,
  onComprobante,
}: {
  invoice: InvoiceDisplay;
  activeTab: string;
  onVer: (i: InvoiceDisplay) => void;
  onPdf: (i: InvoiceDisplay) => void;
  onEditar: (i: InvoiceDisplay) => void;
  onEliminar: (id: string, numero: string, tipoDoc: string) => void;
  onConvertir: (id: string, numero: string) => void;
  onComprobante: (url: string, nombre?: string) => void;
}) {
  const enHistorial = activeTab === "HISTORY";
  const convertible =
    !enHistorial && (activeTab === "QUOTE" || activeTab === "ORDER");

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
      {convertible && (
        <AccionDoc
          label={
            activeTab === "QUOTE"
              ? "Convertir a orden o factura"
              : "Convertir a factura"
          }
          onClick={() => onConvertir(invoice.id, invoice.invoiceNumber)}
        >
          <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
        </AccionDoc>
      )}
    </>
  );
}

function mapErpToInvoice(
  erpInvoice: InvoiceItem,
  beneficiariesMap: Record<number, string> = {},
  beneficiaryIsrMap: Record<number, number> = {},
): InvoiceDisplay {
  const beneficiaryName =
    beneficiariesMap[erpInvoice.beneficiaryId] ||
    `Beneficiario ${erpInvoice.beneficiaryId}`;

  let status = "pending";

  if (erpInvoice.state === "DRAFT") {
    status = "draft";
  } else if (erpInvoice.state === "COMPLETED") {
    status = "paid";
  } else if (
    erpInvoice.amount > 0 &&
    (erpInvoice.dueToPay <= 0 || erpInvoice.paid >= erpInvoice.amount)
  ) {
    status = "paid";
  } else if (erpInvoice.dueDate) {
    const dueDate = new Date(erpInvoice.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dueDate < today && erpInvoice.dueToPay > 0) {
      status = "overdue";
    }
  }

  // Use dueToPay from API as it handles floating-point accurately;
  // fallback to amount - paid for cases where dueToPay is not available
  let displayAmount =
    typeof erpInvoice.dueToPay === "number"
      ? erpInvoice.dueToPay
      : erpInvoice.amount - erpInvoice.paid;
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

  // Si los elementos tienen un título (comment), usarlo como descripción
  const elementTitle = erpInvoice.elements?.[0]?.comment;

  return {
    id: String(erpInvoice.id),
    invoiceNumber: erpInvoice.taxId || `INV-${erpInvoice.id}`,
    projectName: elementTitle || erpInvoice.description || "Sin descripción",
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

export function FinancesModule({
  projectId,
  projectName = "",
  budgetCategories = [],
  refreshTrigger = 0,
  onConvertSaleToInvoice,
}: FinancesModuleProps) {
  // const { divisions } = useErp();
  const [invoices, setInvoices] = useState<InvoiceDisplay[]>([]);
  const [rawInvoices, setRawInvoices] = useState<InvoiceItem[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
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
  const [kpiTotals, setKpiTotals] = useState({ toCharge: 0, toPay: 0 });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedDocumentType, setSelectedDocumentType] = useState("all");
  const [activeTab, setActiveTab] = useState<
    "QUOTE" | "INVOICE" | "ORDER" | "HISTORY"
  >("QUOTE");

  // History tab date range state — empty by default to load all completed records
  const [historyFromDate, setHistoryFromDate] = useState("");
  const [historyToDate, setHistoryToDate] = useState("");
  const [activePage, setActivePage] = useState(1);
  const [activeTotalPages, setActiveTotalPages] = useState(1);
  const [activeTotalItems, setActiveTotalItems] = useState(0);
  const itemsPerPage = 10;
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyInvoices, setHistoryInvoices] = useState<InvoiceDisplay[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSellFilter, setIsSellFilter] = useState<"all" | "true" | "false">(
    "all",
  );
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();

  // Cache beneficiary data across tab switches — keyed by projectId+refreshKey+refreshTrigger
  // Se cachea la PROMESA, no el resultado: los dos useEffect de abajo arrancan
  // a la vez, y con un cache de resultado ambos leian el cache vacio y pedian
  // los mismos 68KB. Con la promesa, el segundo se engancha al primero.
  type MapasBeneficiarios = {
    map: Record<number, string>;
    isrMap: Record<number, number>;
  };
  const beneficiaryCacheRef = useRef<{
    key: string;
    data: Promise<MapasBeneficiarios>;
  } | null>(null);

  // Sin `signal` a proposito: si el useEffect que la inicio aborta, la promesa
  // compartida no debe arrastrar al otro consumidor.
  const pedirBeneficiarios = useCallback(
    (cacheKey: string): Promise<MapasBeneficiarios> => {
      if (beneficiaryCacheRef.current?.key === cacheKey)
        return beneficiaryCacheRef.current.data;

      const data = fetch(
        `/api/erp/beneficiaries?withContacts=false&withTaxData=false`,
      )
        .then(async (r) => {
          const map: Record<number, string> = {};
          const isrMap: Record<number, number> = {};
          const lista: Beneficiary[] = r.ok ? await r.json() : [];
          (lista || []).forEach((b) => {
            map[b.id] = b.name;
            const isr = b.metadata?.isrTaxRetention;
            if (isr) isrMap[b.id] = Number(isr);
          });
          return { map, isrMap };
        })
        .catch((e) => {
          // Un fallo no puede quedar cacheado para siempre.
          if (beneficiaryCacheRef.current?.key === cacheKey)
            beneficiaryCacheRef.current = null;
          throw e;
        });

      beneficiaryCacheRef.current = { key: cacheKey, data };
      return data;
    },
    [],
  );

  const [createDialogState, setCreateDialogState] = useState<{
    isOpen: boolean;
    documentType: "invoice" | "quote" | "order";
    transactionType: "sale" | "purchase";
  }>({
    isOpen: false,
    documentType: "invoice",
    transactionType: "sale",
  });

  // Fetch invoices + beneficiaries in parallel for active tabs
  useEffect(() => {
    if (activeTab === "HISTORY") return;

    const controller = new AbortController();
    const { signal } = controller;

    const fetchAll = async () => {
      setIsLoadingInvoices(true);
      try {
        const invoiceParams = new URLSearchParams({
          divisionId: String(projectId),
          ignoreDetailedData: "false",
          state: "PENDING",
          type: activeTab,
          isSell: isSellFilter === "all" ? "" : isSellFilter,
          elements: "10",
          page: String(activePage),
        });
        if (activeTab === "QUOTE" || activeTab === "ORDER") {
          invoiceParams.append(
            "advancedSearch",
            JSON.stringify([
              { field: "sourcePendingRecordId", method: "is null", value: "" },
            ]),
          );
        }

        // Use cached beneficiaries if available for the current project/refresh key
        const cacheKey = `${projectId}-${refreshKey}-${refreshTrigger}`;
        const [invoicesRes, beneficiarios] = await Promise.all([
          fetch(`/api/erp/pendingRecord?${invoiceParams.toString()}`, {
            signal,
          }),
          pedirBeneficiarios(cacheKey),
        ]);

        const invoiceData: InvoicesResponse = invoicesRes.ok
          ? await invoicesRes.json()
          : { items: [] };

        // Copia: los mapas viven en el cache compartido, no se mutan aqui.
        const map = { ...beneficiarios.map };
        const isrMap = { ...beneficiarios.isrMap };

        const items = invoiceData.items || [];

        // KPI: uses same formula as mapErpToInvoice — no ratio, full subTotal/taxes
        const serverToCharge = invoiceData.resume?.toCharge || 0;
        let salesTaxes = 0;
        let kpiToPay = 0;
        items.forEach((inv) => {
          if (inv.isSell !== 0) {
            salesTaxes += inv.taxes || 0;
          } else {
            const isrRate = isrMap[inv.beneficiaryId] || 0;
            let amount = inv.subTotal + inv.taxes;
            if (isrRate >= 0.1 && isrRate < 0.3) {
              // ITBIS totalmente retenido + ISR sobre subtotal → subTotal * (1 - isrRate)
              amount = inv.subTotal * (1 - isrRate);
            } else if (isrRate >= 0.3) {
              amount = inv.subTotal + inv.taxes - inv.taxes * isrRate;
            } else if (isrRate > 0) {
              amount = inv.subTotal - inv.subTotal * isrRate;
            }
            kpiToPay += amount;
          }
        });
        setKpiTotals({
          toCharge: serverToCharge + salesTaxes,
          toPay: kpiToPay,
        });

        setRawInvoices(items);
        setActiveTotalPages(invoiceData.totalPages || 1);
        setActiveTotalItems(invoiceData.totalItems || 0);

        if (invoiceData.resume) {
          setResume({
            toCharge: invoiceData.resume.toCharge || 0,
            totalCharged: invoiceData.resume.totalCharged || 0,
            toPay: invoiceData.resume.toPay || 0,
            totalPaid: invoiceData.resume.totalPaid || 0,
            toChargeRecordsCount: invoiceData.resume.toChargeRecordsCount || 0,
            toPayRecordsCount: invoiceData.resume.toPayRecordsCount || 0,
          });
        }

        // Map and sort inline — single render
        const mapped = items.map((item) => mapErpToInvoice(item, map, isrMap));
        mapped.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        setInvoices(mapped);
      } catch (error) {
        if (signal.aborted) return;
        console.error("❌ Error fetching data:", error);
      } finally {
        if (!signal.aborted) setIsLoadingInvoices(false);
      }
    };

    fetchAll();
    return () => controller.abort();
  }, [
    projectId,
    refreshKey,
    refreshTrigger,
    activeTab,
    isSellFilter,
    activePage,
    pedirBeneficiarios,
  ]);

  // Fetch history (paid) invoices + beneficiaries in parallel
  useEffect(() => {
    if (activeTab !== "HISTORY") return;

    const controller = new AbortController();
    const { signal } = controller;

    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const historyParams = new URLSearchParams({
          itemsPerPage: itemsPerPage.toString(),
          divisionId: String(projectId),
          ignoreDetailedData: "false",
          state: "COMPLETED",
          page: String(historyPage),
        });
        if (historyFromDate) historyParams.set("fromDate", historyFromDate);
        if (historyToDate) historyParams.set("toDate", historyToDate);

        const cacheKey = `${projectId}-${refreshKey}-${refreshTrigger}`;
        const [historyRes, beneficiarios] = await Promise.all([
          fetch(`/api/erp/pendingRecord?${historyParams.toString()}`, {
            signal,
          }),
          pedirBeneficiarios(cacheKey),
        ]);

        const historyData: InvoicesResponse = historyRes.ok
          ? await historyRes.json()
          : { items: [], totalPages: 1 };

        // Copia: los mapas viven en el cache compartido, no se mutan aqui.
        const map = { ...beneficiarios.map };
        const isrMap = { ...beneficiarios.isrMap };

        const items = historyData.items || [];

        setHistoryTotalPages(historyData.totalPages || 1);
        setRawInvoices(items);

        const mapped = items.map((item) => mapErpToInvoice(item, map, isrMap));
        mapped.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        setHistoryInvoices(mapped);
      } catch (error) {
        if (signal.aborted) return;
        console.error("❌ Error fetching history:", error);
      } finally {
        if (!signal.aborted) setIsLoadingHistory(false);
      }
    };

    fetchHistory();
    return () => controller.abort();
  }, [
    activeTab,
    projectId,
    historyFromDate,
    historyToDate,
    historyPage,
    refreshKey,
    refreshTrigger,
    pedirBeneficiarios,
  ]);

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.projectName.toLowerCase().includes(searchTerm.toLowerCase());
    // (invoice.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    // (invoice.supplierName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    const matchesType = selectedType === "all" || invoice.type === selectedType;
    const matchesDocumentType =
      selectedDocumentType === "all" ||
      invoice.documentType === selectedDocumentType;
    const matchesStatus =
      selectedStatuses.length === 0 ||
      selectedStatuses.includes(invoice.status);

    return matchesSearch && matchesType && matchesDocumentType && matchesStatus;
  });

  const totalSalesToCharge = kpiTotals.toCharge;
  const totalPurchasesToPay = kpiTotals.toPay;
  const pendingRecordsCount =
    resume.toChargeRecordsCount + resume.toPayRecordsCount;

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
  const [editModalState, setEditModalState] = useState<{
    isOpen: boolean;
    record: InvoiceItem | null;
  }>({
    isOpen: false,
    record: null,
  });

  const [viewModalState, setViewModalState] = useState<{
    isOpen: boolean;
    invoice: InvoiceDisplay | null;
  }>({
    isOpen: false,
    invoice: null,
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

  const [payModalState, setPayModalState] = useState<{
    isOpen: boolean;
    invoice: InvoiceDisplay | null;
  }>({
    isOpen: false,
    invoice: null,
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

  const handlePayInvoice = (invoice: InvoiceDisplay) => {
    setPayModalState({
      isOpen: true,
      invoice,
    });
    handleViewClose();
  };

  const handleEditClick = async (invoice: InvoiceDisplay) => {
    const fullRecord = rawInvoices.find((r) => String(r.id) === invoice.id);
    if (!fullRecord) return;

    let recordWithElements = fullRecord;
    const needsFullFetch =
      !fullRecord.elements ||
      fullRecord.elements.length === 0 ||
      fullRecord.elements[0].comment === undefined;
    if (needsFullFetch) {
      const detailsResponse = await fetch(
        `/api/erp/pendingRecord/${fullRecord.id}`,
      );
      if (detailsResponse.ok) {
        recordWithElements = await detailsResponse.json();
      }
    }

    setEditModalState({
      isOpen: true,
      record: recordWithElements,
    });
  };

  const handleConvertRecord = async (
    invoiceId: string,
    newType: "ORDER" | "INVOICE",
  ) => {
    try {
      const originalRecord = rawInvoices.find(
        (r) => String(r.id) === invoiceId,
      );
      if (!originalRecord) {
        throw new Error("No se encontró el registro original");
      }

      // Fetch full details with elements
      let recordWithElements = originalRecord;
      const detailsResponse = await fetch(
        `/api/erp/pendingRecord/${originalRecord.id}`,
      );
      if (detailsResponse.ok) {
        recordWithElements = await detailsResponse.json();
      }

      const response = await fetch(`/api/erp/pendingRecord`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: recordWithElements.description,
          notes: recordWithElements.notes,
          divisionId: recordWithElements.divisionId,
          beneficiaryId: recordWithElements.beneficiaryId,
          type: newType,
          isSell: Boolean(recordWithElements.isSell),
          date: recordWithElements.date,
          dueDate: recordWithElements.dueDate ?? new Date().toISOString(),
          currency: recordWithElements.currency,
          generateTaxId: "none",
          taxId: "",
          updatePrices: false,
          createFirstInvoice: false,
          clientdata:
            typeof recordWithElements.clientdata === "object" &&
            recordWithElements.clientdata !== null
              ? recordWithElements.clientdata
              : undefined,
          metadata: recordWithElements.metadata || {},
          elements:
            recordWithElements.elements?.map((el) => ({
              description: el.description,
              unit: el.unit,
              quantity: el.quantity,
              price: el.price,
              variation: el.variation,
              ...(el.resourceId != null ? { resourceId: el.resourceId } : {}),
              ...(el.comment != null ? { comment: el.comment } : {}),
              taxes:
                el.taxes?.map((tax) => ({ taxRateId: tax.taxRateId })) ?? [],
            })) ?? [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || "Error al convertir el documento");
      }

      if (
        newType === "INVOICE" &&
        recordWithElements.isSell &&
        onConvertSaleToInvoice
      ) {
        const docTotal =
          recordWithElements.elements?.reduce(
            (sum, el) => sum + (el.quantity || 0) * (el.price || 0),
            0,
          ) ?? 0;
        const title = recordWithElements.elements?.[0]?.comment || "Sin nombre";
        onConvertSaleToInvoice(title, docTotal);
      }

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

  const handleEditClose = () => {
    setEditModalState({
      isOpen: false,
      record: null,
    });
  };

  const handleDownloadPDF = async (invoice: InvoiceDisplay) => {
    try {
      const fullRecord = rawInvoices.find((r) => String(r.id) === invoice.id);
      if (!fullRecord) {
        throw new Error("No se pudo encontrar el registro completo");
      }

      let recordWithElements = fullRecord;
      const needsFullFetch =
        !fullRecord.elements ||
        fullRecord.elements.length === 0 ||
        fullRecord.elements[0].comment === undefined;
      if (needsFullFetch) {
        const detailsResponse = await fetch(
          `/api/erp/pendingRecord/${fullRecord.id}`,
        );
        if (detailsResponse.ok) {
          recordWithElements = await detailsResponse.json();
        }
      }

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

        // We don't have divisions handy, but maybe we can use projectName or fetch it.
        // For project context, we passed projectId.
        // Let's assume projectName from invoice display or a fallback.

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
          projectName: invoice.projectName, // Using invoice project name
          paymentPlan: paymentPlan,
          quotationDate: recordWithElements.date,
        });
      } else {
        // Check if it's a purchase record with ISR retention
        const isPurchase = recordWithElements.isSell === 0;
        const isrRate = beneficiary?.metadata?.isrTaxRetention
          ? Number(beneficiary.metadata.isrTaxRetention)
          : 0;
        const hasRetention = isPurchase && isrRate > 0;

        const category = recordWithElements.elements?.[0]?.comment || "";
        // Check document type to determine which PDF generator to use
        if (recordWithElements.type === "INVOICE") {
          await generateInvoicePDF({
            invoice: recordWithElements,
            beneficiary,
            elements: recordWithElements.elements || [],
            payments: recordWithElements.payments || [],
            isSell: recordWithElements.isSell === 1,
            userName: user?.user_metadata?.full_name || user?.email || "",
            applyRetention: hasRetention,
            retentionRate: hasRetention ? isrRate : 0,
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
            applyRetention: hasRetention,
            retentionRate: hasRetention ? isrRate : 0,
            projectName,
            category,
          });
        }
      }
    } catch (error) {
      console.error("❌ Error generating PDF:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Error al generar el PDF. Por favor, intenta de nuevo.",
      );
    }
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
  };

  const vacioTexto =
    activeTab === "HISTORY"
      ? "No hay documentos en este rango de fechas."
      : hasActiveFilters
        ? "Ningún documento coincide con los filtros aplicados."
        : "Este proyecto todavía no tiene documentos.";

  const TITULO: Record<string, string> = {
    QUOTE: "Cotizaciones del proyecto",
    ORDER: "Órdenes del proyecto",
    INVOICE: "Facturas del proyecto",
    HISTORY: "Historial de documentos",
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-[1rem] font-semibold tracking-[-0.01em] text-ink">
            {TITULO[activeTab] ?? TITULO.INVOICE}
          </h2>
          <p className="mt-0.5 text-[0.8125rem] text-ink-2">
            Cotizaciones, órdenes y facturas imputadas a este proyecto.
          </p>
        </div>
        {/* El menú existía pero no tenía botón que lo abriera: `isCreateMenuOpen`
            sólo se ponía a true desde código que ya no estaba. Se crea desde la
            cabecera del proyecto y también desde aquí. */}
        <MenuButton
          label="Crear documento"
          icon={Plus}
          variant="default"
          size="sm"
          options={NUEVOS_DOCUMENTOS.map((opcion) => ({
            label: opcion.label,
            icon: opcion.transaccion === "sale" ? TrendingUp : ShoppingCart,
            tone: opcion.transaccion === "sale" ? "success" : "info",
            onSelect: () =>
              handleCreateInvoice(opcion.transaccion, opcion.documento),
          }))}
        />
      </div>

      <TabsBar
        tabs={DOC_TABS}
        value={activeTab}
        onChange={(id) => {
          setActiveTab(id);
          setActivePage(1);
          if (id === "HISTORY") setHistoryPage(1);
        }}
        aria-label="Tipos de documento del proyecto"
      />

      {activeTab !== "HISTORY" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <KPICard
            loading={isLoadingInvoices}
            kpi={{
              title: "Ventas por cobrar",
              value: money(totalSalesToCharge),
              icon: "TrendingUp",
              hint: "Saldo pendiente del cliente",
            }}
          />
          <KPICard
            loading={isLoadingInvoices}
            kpi={{
              title: "Compras por pagar",
              value: money(totalPurchasesToPay),
              icon: "Wallet",
              hint: "Saldo pendiente a proveedores",
            }}
          />
          <KPICard
            loading={isLoadingInvoices}
            kpi={{
              title: "Documentos activos",
              value: fmtCount(pendingRecordsCount),
              icon: "Receipt",
              hint: "Sin saldar en esta vista",
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 rounded-[12px] border border-rule bg-paper p-4 sm:max-w-lg sm:grid-cols-2">
          <div>
            <label htmlFor="fin-desde" className="eyebrow mb-1.5 block">
              Desde
            </label>
            <input
              id="fin-desde"
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
            <label htmlFor="fin-hasta" className="eyebrow mb-1.5 block">
              Hasta
            </label>
            <input
              id="fin-hasta"
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

      {activeTab !== "HISTORY" && (
        <section className="space-y-4 rounded-[12px] border border-rule bg-paper p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <SearchInput
              className="flex-1"
              value={searchTerm}
              onValueChange={setSearchTerm}
              placeholder="Buscar por número, contacto o referencia…"
            />
            <Button
              variant={isFilterOpen ? "secondary" : "outline"}
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <Filter className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Filtros
              {hasActiveFilters && (
                <span className="tabular ml-1.5 rounded-full bg-gold-soft px-1.5 text-[0.6875rem] font-semibold text-gold-strong">
                  {(selectedType !== "all" ? 1 : 0) +
                    (selectedDocumentType !== "all" ? 1 : 0) +
                    selectedStatuses.length}
                </span>
              )}
            </Button>
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap gap-1.5">
              {selectedType !== "all" && (
                <FilterChip active onClick={() => setSelectedType("all")}>
                  {selectedType === "sale" ? "Ventas" : "Compras"}
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
            <div className="grid gap-5 border-t border-rule pt-4 md:grid-cols-2">
              <FilterGroup label="Transacción" icon={TrendingUp}>
                <FilterChip
                  active={isSellFilter === "all"}
                  onClick={() => {
                    setIsSellFilter("all");
                    setActivePage(1);
                  }}
                >
                  Todas
                </FilterChip>
                <FilterChip
                  icon={TrendingUp}
                  active={isSellFilter === "true"}
                  onClick={() => {
                    setIsSellFilter("true");
                    setActivePage(1);
                  }}
                >
                  Ventas
                </FilterChip>
                <FilterChip
                  icon={ShoppingCart}
                  active={isSellFilter === "false"}
                  onClick={() => {
                    setIsSellFilter("false");
                    setActivePage(1);
                  }}
                >
                  Compras
                </FilterChip>
              </FilterGroup>

              <FilterGroup label="Estado" icon={Clock}>
                {(["paid", "pending", "overdue", "draft"] as const).map(
                  (status) => (
                    <FilterChip
                      key={status}
                      active={selectedStatuses.includes(status)}
                      onClick={() => toggleStatus(status)}
                    >
                      {getStatusBadge(status).label}
                    </FilterChip>
                  ),
                )}
              </FilterGroup>

              <div className="md:col-span-2">
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
        {/* Móvil */}
        <ul className="divide-y divide-rule md:hidden">
          {(activeTab === "HISTORY" ? isLoadingHistory : isLoadingInvoices) ? (
            <li className="px-4 py-10 text-center text-[0.8125rem] text-ink-3">
              Cargando documentos…
            </li>
          ) : (activeTab === "HISTORY" ? historyInvoices : filteredInvoices)
              .length === 0 ? (
            <li className="px-4 py-10 text-center text-[0.8125rem] text-ink-3">
              {vacioTexto}
            </li>
          ) : (
            (activeTab === "HISTORY" ? historyInvoices : filteredInvoices).map(
              (invoice) => {
                const statusBadge = getStatusBadge(invoice.status);
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
                      <Badge
                        variant={invoice.type === "sale" ? "success" : "info"}
                      >
                        {invoice.type === "sale" ? "Venta" : "Compra"}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="tabular font-mono text-[0.8125rem] font-semibold text-ink">
                        {money(invoice.amount)}
                      </span>
                      <Badge variant={statusBadge.variant} dot>
                        {statusBadge.label}
                      </Badge>
                    </div>
                    <p className="tabular mt-1.5 text-[0.75rem] text-ink-3">
                      {invoice.date}
                    </p>
                    <div className="mt-2.5 flex items-center gap-0.5 border-t border-rule pt-2">
                      <AccionesDoc
                        invoice={invoice}
                        activeTab={activeTab}
                        onVer={handleViewClick}
                        onPdf={handleDownloadPDF}
                        onEditar={handleEditClick}
                        onEliminar={handleDeleteClick}
                        onConvertir={(id, numero) =>
                          setConvertModalState({
                            isOpen: true,
                            invoiceId: id,
                            invoiceNumber: numero,
                          })
                        }
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
              },
            )
          )}
        </ul>

        {/* Escritorio */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead numeric>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(
                activeTab === "HISTORY" ? isLoadingHistory : isLoadingInvoices
              ) ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} aria-busy>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <div className="h-3 w-full animate-pulse rounded bg-paper-3" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (activeTab === "HISTORY" ? historyInvoices : filteredInvoices)
                  .length === 0 ? (
                <TableEmpty colSpan={7}>{vacioTexto}</TableEmpty>
              ) : (
                (activeTab === "HISTORY"
                  ? historyInvoices
                  : filteredInvoices
                ).map((invoice) => {
                  const statusBadge = getStatusBadge(invoice.status);
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="tabular text-[0.8125rem] font-medium text-ink">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell className="max-w-56 truncate text-[0.8125rem] text-ink-2">
                        {invoice.projectName}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={invoice.type === "sale" ? "success" : "info"}
                        >
                          {invoice.type === "sale" ? "Venta" : "Compra"}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular text-[0.8125rem] text-ink-2">
                        {invoice.date}
                      </TableCell>
                      <TableCell
                        numeric
                        className={cn(
                          "text-[0.8125rem] font-semibold",
                          invoice.type === "sale" ? "text-success" : "text-ink",
                        )}
                      >
                        {money(invoice.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadge.variant} dot>
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-0.5">
                          <AccionesDoc
                            invoice={invoice}
                            activeTab={activeTab}
                            onVer={handleViewClick}
                            onPdf={handleDownloadPDF}
                            onEditar={handleEditClick}
                            onEliminar={handleDeleteClick}
                            onConvertir={(id, numero) =>
                              setConvertModalState({
                                isOpen: true,
                                invoiceId: id,
                                invoiceNumber: numero,
                              })
                            }
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
            page={activePage}
            totalPages={activeTotalPages}
            totalItems={activeTotalItems}
            perPage={10}
            noun="documentos"
            onPageChange={setActivePage}
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

      <ConfirmDialog
        open={deleteModalState.isOpen}
        title={
          deleteModalState.documentType === "QUOTE"
            ? "Eliminar cotización"
            : "Archivar documento"
        }
        description={
          deleteModalState.documentType === "QUOTE" ? (
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
              deja de aparecer en el listado del proyecto. Sigue en el
              historial: es un documento fiscal.
            </>
          )
        }
        confirmLabel={
          deleteModalState.documentType === "QUOTE" ? "Eliminar" : "Archivar"
        }
        pendingLabel={
          deleteModalState.documentType === "QUOTE"
            ? "Eliminando…"
            : "Archivando…"
        }
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

      {/* Estos dos diálogos nunca se llegaron a montar: `handleCreateInvoice`
          y `handleEditClick` guardaban su estado y no había nada que lo
          consumiera, así que «Crear documento» y «Editar» no hacían nada en
          la pestaña de Facturación del proyecto. */}
      <CreateInvoiceDialog
        isOpen={createDialogState.isOpen}
        onClose={() =>
          setCreateDialogState((prev) => ({ ...prev, isOpen: false }))
        }
        documentType={createDialogState.documentType}
        transactionType={createDialogState.transactionType}
        projectId={String(projectId)}
        budgetCategories={budgetCategories}
        onCreateInvoice={handleInvoiceCreated}
      />

      {editModalState.isOpen && editModalState.record && (
        <EditInvoiceDialog
          isOpen={editModalState.isOpen}
          onClose={handleEditClose}
          record={editModalState.record}
          onUpdate={handleInvoiceCreated}
        />
      )}

      {/* Convert Modal (Quote/Order -> Invoice) */}
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
          onConfirm={async () => {
            if (convertModalState.invoiceId) {
              await handleConvertRecord(convertModalState.invoiceId, "INVOICE");
            }
          }}
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
    </div>
  );
}
