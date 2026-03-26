"use client";
import { useState, useEffect, useRef } from "react";
import {
  Search,
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
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Image as ImageIcon,
} from "lucide-react";
import {
  CustomCard,
  CustomBadge,
  CustomButton,
} from "@/src/components/project/CustomCard";
import type {
  GestionoInvoiceItem,
  GestionoInvoicesResponse,
  GestionoBeneficiary,
  PaymentRecord,
  // GestionoDivision,
} from "@/src/types/gestiono";
// import { useGestiono } from "@/src/context/Gestiono";
import { CreateInvoiceDialog } from "@/src/components/dashboard/CreateInvoice";
import { EditInvoiceDialog } from "@/src/components/dashboard/EditInvoiceDialog";
import { ConvertModal } from "@/src/components/dashboard/ConvertModal";
import { PayInvoiceModal } from "@/src/components/dashboard/PayInvoiceModal";
import { generateQuotePDF } from "@/lib/generateQuotePDF";
import { generateInvoicePDF } from "@/lib/generateInvoicePDF";
import { useAuth } from "@/src/context/AuthContext";

interface FinancesModuleProps {
  projectId: string | number;
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
  reference?: string;
  payments?: PaymentRecord[];
}

function mapGestionoToInvoice(
  gestionoInvoice: GestionoInvoiceItem,
  beneficiariesMap: Record<number, string> = {},
  beneficiaryIsrMap: Record<number, number> = {},
): InvoiceDisplay {
  const beneficiaryName =
    beneficiariesMap[gestionoInvoice.beneficiaryId] ||
    `Beneficiario ${gestionoInvoice.beneficiaryId}`;

  let status = "pending";

  if (gestionoInvoice.state === "DRAFT") {
    status = "draft";
  } else if (
    gestionoInvoice.amount > 0 &&
    gestionoInvoice.paid >= gestionoInvoice.amount
  ) {
    status = "paid";
  } else if (gestionoInvoice.dueDate) {
    const dueDate = new Date(gestionoInvoice.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dueDate < today && gestionoInvoice.paid < gestionoInvoice.amount) {
      status = "overdue";
    }
  }

  // Recalculate amount with ISR from subtotal + full ITBIS retained
  let displayAmount = gestionoInvoice.amount - gestionoInvoice.paid;
  const isPurchase = gestionoInvoice.isSell === 0;
  const isrRate = beneficiaryIsrMap[gestionoInvoice.beneficiaryId] || 0;
  if (isPurchase && isrRate > 0) {
    if (isrRate >= 0.1 && isrRate < 0.3) {
      // 10%: Full retention — ITBIS retained + ISR on subtotal
      const isrAmount = gestionoInvoice.subTotal * isrRate;
      const itbisRetenido = gestionoInvoice.taxes;
      displayAmount =
        gestionoInvoice.subTotal +
        gestionoInvoice.taxes -
        itbisRetenido -
        isrAmount;
    } else if (isrRate >= 0.3) {
      // 30%: ISR applied to ITBIS
      const isrAmount = gestionoInvoice.taxes * isrRate;
      displayAmount =
        gestionoInvoice.subTotal + gestionoInvoice.taxes - isrAmount;
    } else {
      // 2%: ISR on subtotal only, no ITBIS
      const isrAmount = gestionoInvoice.subTotal * isrRate;
      displayAmount = gestionoInvoice.subTotal - isrAmount;
    }
  }

  let attachedFileUrl: string | undefined;
  if (
    gestionoInvoice.metadata &&
    typeof gestionoInvoice.metadata === "object"
  ) {
    const meta = gestionoInvoice.metadata;
    if (meta.files && Array.isArray(meta.files) && meta.files.length > 0) {
      attachedFileUrl = meta.files[0].s3Key as string;
    } else if (meta.attachedfileurl) {
      attachedFileUrl = meta.attachedfileurl as string;
    }
  }

  // Si los elementos tienen un título (comment), usarlo como descripción
  const elementTitle = gestionoInvoice.elements?.[0]?.comment;

  return {
    id: String(gestionoInvoice.id),
    invoiceNumber: gestionoInvoice.taxId || `INV-${gestionoInvoice.id}`,
    projectName:
      elementTitle || gestionoInvoice.description || "Sin descripción",
    clientName: gestionoInvoice.isSell ? beneficiaryName : undefined,
    supplierName: !gestionoInvoice.isSell ? beneficiaryName : undefined,
    date: gestionoInvoice.date
      ? new Date(gestionoInvoice.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0],
    dueDate: gestionoInvoice.dueDate
      ? new Date(gestionoInvoice.dueDate).toISOString().split("T")[0]
      : gestionoInvoice.date
        ? new Date(gestionoInvoice.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
    amount: displayAmount,
    paid: gestionoInvoice.paid || 0,
    dueToPay: gestionoInvoice.dueToPay || 0,
    status: status,
    type: gestionoInvoice.isSell === 1 ? "sale" : "purchase",
    documentType:
      gestionoInvoice.type === "QUOTE"
        ? "QUOTE"
        : gestionoInvoice.type === "ORDER"
          ? "ORDER"
          : "INVOICE",
    attachedFileUrl,
    reference: gestionoInvoice.reference || undefined,
    payments: gestionoInvoice.payments || [],
  };
}

export function FinancesModule({
  projectId,
  budgetCategories = [],
  refreshTrigger = 0,
  onConvertSaleToInvoice,
}: FinancesModuleProps) {
  // const { divisions } = useGestiono();
  const [invoices, setInvoices] = useState<InvoiceDisplay[]>([]);
  const [rawInvoices, setRawInvoices] = useState<GestionoInvoiceItem[]>([]);
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
  // KPI totals: sales = resume.toCharge + ITBIS charged; purchases = ISR-corrected
  const [kpiTotals, setKpiTotals] = useState({ toCharge: 0, toPay: 0 });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedDocumentType, setSelectedDocumentType] = useState("all");
  const [activeTab, setActiveTab] = useState<
    "QUOTE" | "INVOICE" | "ORDER" | "HISTORY"
  >("QUOTE");

  // History tab date range state
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
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();

  // Cache beneficiary data across tab switches — keyed by projectId+refreshKey+refreshTrigger
  const beneficiaryCacheRef = useRef<{
    key: string;
    map: Record<number, string>;
    isrMap: Record<number, number>;
  } | null>(null);

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

        // KPI fetch: all records without pagination to compute accurate totals
        const kpiParams = new URLSearchParams({
          divisionId: String(projectId),
          ignoreDetailedData: "true",
          state: "PENDING",
          type: activeTab,
          elements: "1000",
          page: "1",
        });
        if (activeTab === "QUOTE" || activeTab === "ORDER") {
          kpiParams.append(
            "advancedSearch",
            JSON.stringify([
              { field: "sourcePendingRecordId", method: "is null", value: "" },
            ]),
          );
        }

        // Use cached beneficiaries if available for the current project/refresh key
        const cacheKey = `${projectId}-${refreshKey}-${refreshTrigger}`;
        const hasBeneficiaryCache =
          beneficiaryCacheRef.current?.key === cacheKey;

        const [invoicesRes, maybeBeneficiariesRes, kpiRes] = await Promise.all([
          fetch(`/api/gestiono/pendingRecord?${invoiceParams.toString()}`, {
            signal,
          }),
          hasBeneficiaryCache
            ? Promise.resolve(null)
            : fetch(
                `/api/gestiono/beneficiaries?withContacts=false&withTaxData=false`,
                { signal },
              ),
          fetch(`/api/gestiono/pendingRecord?${kpiParams.toString()}`, {
            signal,
          }),
        ]);

        const [invoiceData, kpiData]: [
          GestionoInvoicesResponse,
          GestionoInvoicesResponse,
        ] = await Promise.all([
          invoicesRes.ok ? invoicesRes.json() : Promise.resolve({ items: [] }),
          kpiRes.ok ? kpiRes.json() : Promise.resolve({ items: [] }),
        ]);

        // Build beneficiary maps — from cache or from fresh fetch
        const map: Record<number, string> = {};
        const isrMap: Record<number, number> = {};
        if (hasBeneficiaryCache) {
          Object.assign(map, beneficiaryCacheRef.current!.map);
          Object.assign(isrMap, beneficiaryCacheRef.current!.isrMap);
        } else {
          const beneficiaryData: GestionoBeneficiary[] =
            maybeBeneficiariesRes?.ok ? await maybeBeneficiariesRes.json() : [];
          (beneficiaryData || []).forEach((b) => {
            map[b.id] = b.name;
            const isr = b.metadata?.isrTaxRetention;
            if (isr) isrMap[b.id] = Number(isr);
          });
          beneficiaryCacheRef.current = { key: cacheKey, map, isrMap };
        }
        // KPI: sales = resume.toCharge + all ITBIS charged; purchases = ISR-corrected
        const serverToCharge = invoiceData.resume?.toCharge || 0;
        let salesTaxes = 0;
        let kpiToPay = 0;
        (kpiData.items || []).forEach((inv) => {
          if (inv.isSell !== 0) {
            salesTaxes += inv.taxes || 0;
          } else {
            const isrRate = isrMap[inv.beneficiaryId] || 0;
            let amount = inv.amount - inv.paid;
            if (isrRate > 0) {
              const ratio =
                inv.amount > 0 ? (inv.amount - inv.paid) / inv.amount : 1;
              const remainingSubTotal = inv.subTotal * ratio;
              const remainingTaxes = inv.taxes * ratio;
              if (isrRate >= 0.1 && isrRate < 0.3) {
                const isrAmount = remainingSubTotal * isrRate;
                const itbisRetenido = remainingTaxes;
                amount =
                  remainingSubTotal +
                  remainingTaxes -
                  itbisRetenido -
                  isrAmount;
              } else if (isrRate >= 0.3) {
                const isrAmount = remainingTaxes * isrRate;
                amount = remainingSubTotal + remainingTaxes - isrAmount;
              } else {
                const isrAmount = remainingSubTotal * isrRate;
                amount = remainingSubTotal - isrAmount;
              }
            }
            kpiToPay += amount;
          }
        });
        setKpiTotals({
          toCharge: serverToCharge + salesTaxes,
          toPay: kpiToPay,
        });

        const items = invoiceData.items || [];
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
        const mapped = items.map((item) =>
          mapGestionoToInvoice(item, map, isrMap),
        );
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
          amountMethod: "ALL",
          amount: "0",
          ignoreDetailedData: "false",
          state: "COMPLETED",
          fromDate: historyFromDate,
          toDate: historyToDate,
          page: String(historyPage),
        });

        const cacheKey = `${projectId}-${refreshKey}-${refreshTrigger}`;
        const hasBeneficiaryCache =
          beneficiaryCacheRef.current?.key === cacheKey;

        const [historyRes, maybeBeneficiariesRes] = await Promise.all([
          fetch(`/api/gestiono/pendingRecord?${historyParams.toString()}`, {
            signal,
          }),
          hasBeneficiaryCache
            ? Promise.resolve(null)
            : fetch(
                `/api/gestiono/beneficiaries?withContacts=false&withTaxData=false`,
                { signal },
              ),
        ]);

        const historyData: GestionoInvoicesResponse = historyRes.ok
          ? await historyRes.json()
          : { items: [], totalPages: 1 };

        const map: Record<number, string> = {};
        const isrMap: Record<number, number> = {};
        if (hasBeneficiaryCache) {
          Object.assign(map, beneficiaryCacheRef.current!.map);
          Object.assign(isrMap, beneficiaryCacheRef.current!.isrMap);
        } else {
          const beneficiaryData: GestionoBeneficiary[] =
            maybeBeneficiariesRes?.ok ? await maybeBeneficiariesRes.json() : [];
          (beneficiaryData || []).forEach((b) => {
            map[b.id] = b.name;
            const isr = b.metadata?.isrTaxRetention;
            if (isr) isrMap[b.id] = Number(isr);
          });
          beneficiaryCacheRef.current = { key: cacheKey, map, isrMap };
        }

        const items = historyData.items || [];

        setHistoryTotalPages(historyData.totalPages || 1);

        const mapped = items.map((item) =>
          mapGestionoToInvoice(item, map, isrMap),
        );
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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { label: "Pagada", className: "bg-green-100 text-green-800" },
      pending: {
        label: "Pendiente",
        className: "bg-yellow-100 text-yellow-800",
      },
      overdue: { label: "Vencida", className: "bg-red-100 text-red-800" },
      draft: { label: "Borrador", className: "bg-gray-100 text-gray-800" },
    };
    return (
      statusConfig[status as keyof typeof statusConfig] || statusConfig.draft
    );
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
    record: GestionoInvoiceItem | null;
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

  const [expandedPayments, setExpandedPayments] = useState<Set<number>>(
    new Set(),
  );

  const togglePaymentExpanded = (paymentId: number) => {
    setExpandedPayments((prev) => {
      const next = new Set(prev);
      if (next.has(paymentId)) {
        next.delete(paymentId);
      } else {
        next.add(paymentId);
      }
      return next;
    });
  };

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
  }>({
    isOpen: false,
    imageUrl: null,
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
        `/api/gestiono/pendingRecord/${deleteModalState.invoiceId}`,
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
    setExpandedPayments(new Set());
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
        `/api/gestiono/pendingRecord/${fullRecord.id}`,
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
        `/api/gestiono/pendingRecord/${originalRecord.id}`,
      );
      if (detailsResponse.ok) {
        recordWithElements = await detailsResponse.json();
      }

      const response = await fetch(`/api/gestiono/pendingRecord`, {
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
        const title = recordWithElements.description || "Sin nombre";
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
          `/api/gestiono/pendingRecord/${fullRecord.id}`,
        );
        if (detailsResponse.ok) {
          recordWithElements = await detailsResponse.json();
        }
      }

      const beneficiaryResponse = await fetch(
        `/api/gestiono/beneficiaries?withContacts=true`,
      );
      let beneficiary = null;
      if (beneficiaryResponse.ok) {
        const beneficiaries = await beneficiaryResponse.json();
        beneficiary =
          beneficiaries.find(
            (b: GestionoBeneficiary) => b.id === fullRecord.beneficiaryId,
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

        // Check document type to determine which PDF generator to use
        if (recordWithElements.type === "INVOICE") {
          // Generate Invoice PDF
          await generateInvoicePDF({
            invoice: recordWithElements,
            beneficiary,
            elements: recordWithElements.elements || [],
            payments: recordWithElements.payments || [],
            isSell: recordWithElements.isSell === 1,
            userName: user?.user_metadata?.full_name || user?.email || "",
            applyRetention: hasRetention,
            retentionRate: hasRetention ? isrRate : 0,
          });
        } else {
          // Generate Quote or Order PDF
          await generateQuotePDF({
            quote: recordWithElements,
            beneficiary,
            elements: recordWithElements.elements || [],
            documentType: recordWithElements.type as "QUOTE" | "ORDER",
            isSell: recordWithElements.isSell === 1,
            userName: user?.user_metadata?.full_name || user?.email || "",
            applyRetention: hasRetention,
            retentionRate: hasRetention ? isrRate : 0,
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
    setIsCreateMenuOpen(false);
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

  return (
    <div className="space-y-6">
      {/* Header with Title and Create Button */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Módulo Financiero</h2>
          <p className="text-gray-600">Gestión de documentos del proyecto</p>
        </div>
        <div className="relative">
          {/* Dropdown Menu */}
          {isCreateMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="py-1">
                <button
                  onClick={() => handleCreateInvoice("sale", "quote")}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Nueva Cotización de Venta
                </button>
                <button
                  onClick={() => handleCreateInvoice("purchase", "quote")}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4 text-red-600" />
                  Nueva Cotización de Compra
                </button>
                {/* Orders */}
                <button
                  onClick={() => handleCreateInvoice("sale", "order")}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Nueva Orden de Venta
                </button>
                <button
                  onClick={() => handleCreateInvoice("purchase", "order")}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4 text-red-600" />
                  Nueva Orden de Compra
                </button>
                {/* Invoices */}
                <button
                  onClick={() => handleCreateInvoice("sale", "invoice")}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Nueva Factura de Venta
                </button>
                <button
                  onClick={() => handleCreateInvoice("purchase", "invoice")}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4 text-red-600" />
                  Nueva Factura de Compra
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => {
            setActiveTab("QUOTE");
            setActivePage(1);
          }}
          className={`px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === "QUOTE"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
          }`}
        >
          Cotizaciones
        </button>
        <button
          onClick={() => {
            setActiveTab("ORDER");
            setActivePage(1);
          }}
          className={`px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === "ORDER"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
          }`}
        >
          Órdenes
        </button>
        <button
          onClick={() => {
            setActiveTab("INVOICE");
            setActivePage(1);
          }}
          className={`px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === "INVOICE"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
          }`}
        >
          Facturas
        </button>
        <button
          onClick={() => {
            setActiveTab("HISTORY");
            setHistoryPage(1);
          }}
          className={`px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
            activeTab === "HISTORY"
              ? "border-amber-600 text-amber-600"
              : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <History className="w-4 h-4" />
            Historial
          </span>
        </button>
      </div>

      {/* KPIs - Hide in History mode */}
      {activeTab !== "HISTORY" && (
        <div className="grid gap-4 md:grid-cols-3">
          <CustomCard className="p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Ventas Pendientes</h3>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {isLoadingInvoices ? (
                <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
              ) : (
                `RD$ ${totalSalesToCharge.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </div>
            <p className="text-xs text-gray-600">Por cobrar</p>
          </CustomCard>

          <CustomCard className="p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">
                {activeTab === "QUOTE"
                  ? "Cotizaciones Pendientes"
                  : activeTab === "ORDER"
                    ? "Órdenes Pendientes"
                    : "Facturas Pendientes"}
              </h3>
            </div>
            <div className="text-2xl font-bold text-red-600">
              {isLoadingInvoices ? (
                <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
              ) : (
                `RD$ ${totalPurchasesToPay.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </div>
            <p className="text-xs text-gray-600">Por pagar</p>
          </CustomCard>

          <CustomCard className="p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Documentos</h3>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {isLoadingInvoices ? (
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
              ) : (
                pendingRecordsCount
              )}
            </div>
            <p className="text-xs text-gray-600">Registros activos</p>
          </CustomCard>
        </div>
      )}

      {/* History Date Range Picker */}
      {activeTab === "HISTORY" && (
        <CustomCard className="p-4 md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Desde
              </label>
              <input
                type="date"
                value={historyFromDate.split("T")[0]}
                onChange={(e) => {
                  const d = new Date(e.target.value + "T04:00:00.000Z");
                  setHistoryFromDate(d.toISOString());
                  setHistoryPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hasta
              </label>
              <input
                type="date"
                value={historyToDate.split("T")[0]}
                onChange={(e) => {
                  const d = new Date(e.target.value + "T23:59:59.999Z");
                  setHistoryToDate(d.toISOString());
                  setHistoryPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </CustomCard>
      )}

      {/* Filters - Hide in History mode */}
      {activeTab !== "HISTORY" && (
        <CustomCard className="p-4 md:p-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <CustomButton
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
              {hasActiveFilters && (
                <CustomBadge className="ml-2 bg-blue-100 text-blue-800">
                  {(selectedType !== "all" ? 1 : 0) +
                    (selectedDocumentType !== "all" ? 1 : 0) +
                    selectedStatuses.length}
                </CustomBadge>
              )}
            </CustomButton>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mt-4">
              {selectedType !== "all" && (
                <button onClick={() => setSelectedType("all")}>
                  <CustomBadge className="bg-gray-100 text-gray-800 gap-1 cursor-pointer">
                    {selectedType === "sale" ? "Ventas" : "Compras"}
                    <X className="w-3 h-3" />
                  </CustomBadge>
                </button>
              )}
              {selectedStatuses.map((status) => (
                <button key={status} onClick={() => toggleStatus(status)}>
                  <CustomBadge className="bg-gray-100 text-gray-800 gap-1 cursor-pointer">
                    {getStatusBadge(status).label}
                    <X className="w-3 h-3" />
                  </CustomBadge>
                </button>
              ))}
            </div>
          )}
        </CustomCard>
      )}

      {/* Filters Panel */}
      {isFilterOpen && (
        <CustomCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Filtros</h3>
            <button
              onClick={() => setIsFilterOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Transaction Type */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <TrendingUp className="w-4 h-4" />
                Tipo de Transacción
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsSellFilter("all");
                    setActivePage(1);
                  }}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border ${isSellFilter === "all" ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-gray-200"}`}
                >
                  Todas
                </button>
                <button
                  onClick={() => {
                    setIsSellFilter("true");
                    setActivePage(1);
                  }}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border ${isSellFilter === "true" ? "bg-green-50 border-green-500 text-green-700" : "bg-white border-gray-200"}`}
                >
                  Ventas
                </button>
                <button
                  onClick={() => {
                    setIsSellFilter("false");
                    setActivePage(1);
                  }}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border ${isSellFilter === "false" ? "bg-red-50 border-red-500 text-red-700" : "bg-white border-gray-200"}`}
                >
                  Compras
                </button>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Clock className="w-4 h-4" />
                Estado
              </label>
              <div className="space-y-2">
                {["paid", "pending", "overdue", "draft"].map((status) => (
                  <button
                    key={status}
                    onClick={() => toggleStatus(status)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg border ${selectedStatuses.includes(status) ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-gray-200"}`}
                  >
                    {getStatusBadge(status).label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6">
            <CustomButton
              onClick={clearFilters}
              className="w-full bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <X className="w-4 h-4 mr-2" />
              Limpiar filtros
            </CustomButton>
          </div>
        </CustomCard>
      )}

      {/* Table */}
      <CustomCard className="overflow-hidden">
        {/* Mobile Card Layout */}
        <div className="block md:hidden p-4 space-y-3">
          {(activeTab === "HISTORY" ? isLoadingHistory : isLoadingInvoices) ? (
            <div className="py-8 text-center text-gray-500">
              Cargando documentos...
            </div>
          ) : (activeTab === "HISTORY" ? historyInvoices : filteredInvoices)
              .length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              {activeTab === "HISTORY"
                ? "No hay registros en este rango de fechas"
                : hasActiveFilters
                  ? "No se encontraron documentos con los filtros aplicados"
                  : "No hay documentos registrados para este proyecto"}
            </div>
          ) : (
            (activeTab === "HISTORY" ? historyInvoices : filteredInvoices).map(
              (invoice) => {
                const statusBadge = getStatusBadge(invoice.status);
                return (
                  <div
                    key={invoice.id}
                    className="p-3 border border-gray-100 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {invoice.invoiceNumber}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {invoice.projectName}
                        </p>
                      </div>
                      <CustomBadge
                        className={
                          invoice.type === "sale"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }
                      >
                        {invoice.type === "sale" ? "Venta" : "Compra"}
                      </CustomBadge>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">
                        RD${" "}
                        {invoice.amount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                      <CustomBadge className={statusBadge.className}>
                        {statusBadge.label}
                      </CustomBadge>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {invoice.date}
                    </div>
                    <div className="flex items-center gap-1 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleViewClick(invoice)}
                        className="p-1.5 text-gray-400 hover:text-blue-600"
                        title="Ver"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(invoice)}
                        className="p-1.5 text-gray-400 hover:text-blue-600"
                        title="PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {activeTab !== "HISTORY" && (
                        <>
                          <button
                            onClick={() => handleEditClick(invoice)}
                            className="p-1.5 text-gray-400 hover:text-blue-600"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteClick(
                                invoice.id,
                                invoice.invoiceNumber,
                                invoice.documentType,
                              )
                            }
                            className="p-1.5 text-gray-400 hover:text-red-600"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {invoice.attachedFileUrl && (
                        <button
                          onClick={() =>
                            setImagePreviewState({
                              isOpen: true,
                              imageUrl: invoice.attachedFileUrl!,
                            })
                          }
                          className="p-1.5 text-gray-400 hover:text-blue-600"
                          title="Ver Comprobante"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                      )}
                      {activeTab !== "HISTORY" &&
                        (activeTab === "QUOTE" || activeTab === "ORDER") && (
                          <button
                            onClick={() =>
                              setConvertModalState({
                                isOpen: true,
                                invoiceId: invoice.id,
                                invoiceNumber: invoice.invoiceNumber,
                              })
                            }
                            className="ml-auto p-1.5 text-blue-600 hover:text-blue-800"
                            title={
                              activeTab === "QUOTE"
                                ? "Convertir a Orden/Factura"
                                : "Convertir a Factura"
                            }
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                    </div>
                  </div>
                );
              },
            )
          )}
        </div>

        {/* Desktop Table Layout */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3">Número</th>
                <th className="px-6 py-3">Descripción</th>
                <th className="px-6 py-3 text-center">Tipo</th>
                <th className="px-6 py-3 text-center">Fecha</th>
                <th className="px-6 py-3 text-center">Monto</th>
                <th className="px-6 py-3 text-center">Estado</th>
                <th className="px-6 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(
                activeTab === "HISTORY" ? isLoadingHistory : isLoadingInvoices
              ) ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Cargando documentos...
                  </td>
                </tr>
              ) : (activeTab === "HISTORY" ? historyInvoices : filteredInvoices)
                  .length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    {activeTab === "HISTORY"
                      ? "No hay registros en este rango de fechas"
                      : hasActiveFilters
                        ? "No se encontraron documentos con los filtros aplicados"
                        : "No hay documentos registrados para este proyecto"}
                  </td>
                </tr>
              ) : (
                (activeTab === "HISTORY"
                  ? historyInvoices
                  : filteredInvoices
                ).map((invoice) => {
                  const statusBadge = getStatusBadge(invoice.status);
                  return (
                    <tr
                      key={invoice.id}
                      className="bg-white border-b hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                        {invoice.projectName}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <CustomBadge
                          className={
                            invoice.type === "sale"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {invoice.type === "sale" ? "Venta" : "Compra"}
                        </CustomBadge>
                      </td>
                      <td className="px-6 py-4 text-center text-gray-600">
                        {invoice.date}
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-gray-900">
                        RD${" "}
                        {invoice.amount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <CustomBadge className={statusBadge.className}>
                          {statusBadge.label}
                        </CustomBadge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleViewClick(invoice)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="Ver detalles"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(invoice)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="Descargar PDF"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          {activeTab !== "HISTORY" && (
                            <>
                              <button
                                onClick={() => handleEditClick(invoice)}
                                className="p-1 text-gray-400 hover:text-blue-600"
                                title="Editar"
                              >
                                <Edit2 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteClick(
                                    invoice.id,
                                    invoice.invoiceNumber,
                                    invoice.documentType,
                                  )
                                }
                                className="p-1 text-gray-400 hover:text-red-600"
                                title="Eliminar"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          {invoice.attachedFileUrl && (
                            <button
                              onClick={() =>
                                setImagePreviewState({
                                  isOpen: true,
                                  imageUrl: invoice.attachedFileUrl!,
                                })
                              }
                              className="p-1 text-gray-400 hover:text-blue-600"
                              title="Ver Comprobante"
                            >
                              <ImageIcon className="w-5 h-5" />
                            </button>
                          )}
                          {activeTab !== "HISTORY" &&
                            (activeTab === "QUOTE" ||
                              activeTab === "ORDER") && (
                              <button
                                onClick={() =>
                                  setConvertModalState({
                                    isOpen: true,
                                    invoiceId: invoice.id,
                                    invoiceNumber: invoice.invoiceNumber,
                                  })
                                }
                                className="p-1 text-blue-600 hover:text-blue-800"
                                title={
                                  activeTab === "QUOTE"
                                    ? "Convertir a Orden/Factura"
                                    : "Convertir a Factura"
                                }
                              >
                                <ArrowRight className="w-5 h-5" />
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </CustomCard>

      {/* Active Tab Pagination */}
      {activeTab !== "HISTORY" && activeTotalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-gray-200 pt-4">
          <div className="text-sm text-gray-600">
            Mostrando{" "}
            <span className="font-medium">
              {(activePage - 1) * itemsPerPage + 1}
            </span>{" "}
            -{" "}
            <span className="font-medium">
              {Math.min(activePage * itemsPerPage, activeTotalItems)}
            </span>{" "}
            de <span className="font-medium">{activeTotalItems}</span>{" "}
            documentos
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActivePage((p) => Math.max(p - 1, 1))}
              disabled={activePage <= 1 || isLoadingInvoices}
              className={`px-3 py-2 text-sm rounded border transition-colors ${
                activePage <= 1 || isLoadingInvoices
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Anterior
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: activeTotalPages }, (_, i) => i + 1)
                .filter(
                  (page) =>
                    page === 1 ||
                    page === activeTotalPages ||
                    Math.abs(page - activePage) <= 1,
                )
                .map((page, idx, arr) => {
                  const showEllipsisBefore = idx > 0 && page - arr[idx - 1] > 1;
                  return (
                    <div key={page} className="flex items-center gap-1">
                      {showEllipsisBefore && (
                        <span className="px-2 text-gray-400">...</span>
                      )}
                      <button
                        onClick={() => setActivePage(page)}
                        disabled={isLoadingInvoices}
                        className={`px-3 py-1 text-sm rounded transition-colors ${
                          page === activePage
                            ? "bg-blue-600 text-white border border-blue-600"
                            : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                        } ${isLoadingInvoices ? "cursor-not-allowed opacity-50" : ""}`}
                      >
                        {page}
                      </button>
                    </div>
                  );
                })}
            </div>

            <button
              onClick={() =>
                setActivePage((p) => Math.min(p + 1, activeTotalPages))
              }
              disabled={activePage >= activeTotalPages || isLoadingInvoices}
              className={`px-3 py-2 text-sm rounded border transition-colors ${
                activePage >= activeTotalPages || isLoadingInvoices
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {/* History Pagination */}
      {activeTab === "HISTORY" && historyTotalPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-2">
          <button
            onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
            disabled={historyPage <= 1}
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">
            Página {historyPage} de {historyTotalPages}
          </span>
          <button
            onClick={() =>
              setHistoryPage((p) => Math.min(historyTotalPages, p + 1))
            }
            disabled={historyPage >= historyTotalPages}
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      <CreateInvoiceDialog
        isOpen={createDialogState.isOpen}
        onClose={() =>
          setCreateDialogState((prev) => ({ ...prev, isOpen: false }))
        }
        documentType={createDialogState.documentType}
        transactionType={createDialogState.transactionType}
        projectId={
          typeof projectId === "number" ? String(projectId) : projectId
        } // Ensure string if needed or logic adjustments
        budgetCategories={budgetCategories}
        onCreateInvoice={handleInvoiceCreated}
      />

      {editModalState.record && (
        <EditInvoiceDialog
          isOpen={editModalState.isOpen}
          onClose={handleEditClose}
          record={editModalState.record}
          budgetCategories={budgetCategories}
          onUpdate={handleInvoiceCreated}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Confirmar eliminación
            </h3>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de que quieres eliminar{" "}
              {deleteModalState.documentType === "QUOTE"
                ? "la cotización"
                : "el documento"}{" "}
              <span className="font-medium text-gray-900">
                {deleteModalState.invoiceNumber}
              </span>
              ? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* View Details Modal */}
      {viewModalState.isOpen && viewModalState.invoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Detalles del Documento
              </h2>
              <button
                onClick={handleViewClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Número</p>
                  <p className="font-semibold text-gray-900">
                    {viewModalState.invoice.invoiceNumber}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tipo</p>
                  <div className="mt-1">
                    <CustomBadge
                      className={
                        viewModalState.invoice.type === "sale"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {viewModalState.invoice.type === "sale"
                        ? "Venta"
                        : "Compra"}
                    </CustomBadge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Descripción</p>
                  <p className="font-semibold text-gray-900">
                    {viewModalState.invoice.projectName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    {viewModalState.invoice.type === "sale"
                      ? "Cliente"
                      : "Proveedor"}
                  </p>
                  <p className="font-semibold text-gray-900">
                    {viewModalState.invoice.clientName ||
                      viewModalState.invoice.supplierName ||
                      "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha</p>
                  <p className="font-semibold text-gray-900">
                    {viewModalState.invoice.date}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vencimiento</p>
                  <p className="font-semibold text-gray-900">
                    {viewModalState.invoice.dueDate}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Estado</p>
                  <div className="mt-1">
                    <CustomBadge
                      className={
                        getStatusBadge(viewModalState.invoice.status).className
                      }
                    >
                      {getStatusBadge(viewModalState.invoice.status).label}
                    </CustomBadge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Monto Total</p>
                  <p
                    className={`text-lg font-bold ${viewModalState.invoice.type === "sale" ? "text-green-600" : "text-red-600"}`}
                  >
                    {viewModalState.invoice.type === "sale" ? "+" : "-"}RD${" "}
                    {viewModalState.invoice.amount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
                {viewModalState.invoice.documentType === "INVOICE" &&
                  viewModalState.invoice.paid > 0 && (
                    <div>
                      <p className="text-sm text-gray-600">Total Pagado</p>
                      <p className="text-lg font-bold text-green-600">
                        RD${" "}
                        {viewModalState.invoice.paid.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  )}
                {viewModalState.invoice.documentType === "INVOICE" &&
                  viewModalState.invoice.paid > 0 &&
                  viewModalState.invoice.dueToPay > 0 && (
                    <div>
                      <p className="text-sm text-gray-600">Pendiente</p>
                      <p className="text-lg font-bold text-orange-500">
                        RD${" "}
                        {viewModalState.invoice.dueToPay.toLocaleString(
                          "en-US",
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          },
                        )}
                      </p>
                    </div>
                  )}
                {viewModalState.invoice.reference && (
                  <div>
                    <p className="text-sm text-gray-600">Nº Comprobante</p>
                    <p className="font-semibold text-gray-900">
                      {viewModalState.invoice.reference}
                    </p>
                  </div>
                )}
              </div>

              {/* Payment History */}
              {viewModalState.invoice.payments &&
                viewModalState.invoice.payments.length > 0 && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <History className="w-4 h-4" />
                      Historial de Pagos (
                      {viewModalState.invoice.payments.length})
                    </h4>
                    <div className="space-y-2">
                      {viewModalState.invoice.payments.map((payment) => {
                        const isExpanded = expandedPayments.has(payment.id);
                        const methodLabel =
                          payment.paymentMethod === "CASH"
                            ? "Efectivo"
                            : payment.paymentMethod === "TRANSFER"
                              ? "Transferencia"
                              : payment.paymentMethod === "CARD"
                                ? "Tarjeta"
                                : payment.paymentMethod;
                        return (
                          <div
                            key={payment.id}
                            className="bg-green-50 border border-green-100 rounded-lg overflow-hidden"
                          >
                            {/* Row principal — siempre visible */}
                            <button
                              type="button"
                              onClick={() => togglePaymentExpanded(payment.id)}
                              className="w-full flex items-center justify-between px-3 py-2 hover:bg-green-100 transition-colors text-left"
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs font-medium text-gray-700">
                                  {new Date(payment.date).toLocaleDateString(
                                    "es-DO",
                                    {
                                      day: "2-digit",
                                      month: "2-digit",
                                      year: "numeric",
                                    },
                                  )}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {methodLabel}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-green-600">
                                  RD${" "}
                                  {payment.amount.toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                                )}
                              </div>
                            </button>

                            {/* Detalle expandido */}
                            {isExpanded && (
                              <div className="border-t border-green-100 px-3 py-3 grid grid-cols-2 gap-x-4 gap-y-2 bg-white">
                                <div>
                                  <p className="text-xs text-gray-400 uppercase tracking-wide">
                                    Método de Pago
                                  </p>
                                  <p className="text-xs font-medium text-gray-800 mt-0.5">
                                    {methodLabel}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400 uppercase tracking-wide">
                                    Fecha
                                  </p>
                                  <p className="text-xs font-medium text-gray-800 mt-0.5">
                                    {new Date(payment.date).toLocaleDateString(
                                      "es-DO",
                                      {
                                        weekday: "long",
                                        day: "2-digit",
                                        month: "long",
                                        year: "numeric",
                                      },
                                    )}
                                  </p>
                                </div>
                                {payment.reference && (
                                  <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wide">
                                      Referencia
                                    </p>
                                    <p className="text-xs font-medium text-gray-800 mt-0.5">
                                      {payment.reference}
                                    </p>
                                  </div>
                                )}
                                {payment.currency && (
                                  <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wide">
                                      Moneda
                                    </p>
                                    <p className="text-xs font-medium text-gray-800 mt-0.5">
                                      {payment.currency}
                                    </p>
                                  </div>
                                )}
                                {payment.type && (
                                  <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wide">
                                      Tipo
                                    </p>
                                    <p className="text-xs font-medium text-gray-800 mt-0.5">
                                      {payment.type === "CREDIT_PAYMENT"
                                        ? "Pago con crédito"
                                        : "Pago"}
                                    </p>
                                  </div>
                                )}
                                {payment.state && (
                                  <div>
                                    <p className="text-xs text-gray-400 uppercase tracking-wide">
                                      Estado
                                    </p>
                                    <p className="text-xs font-medium text-gray-800 mt-0.5">
                                      {payment.state}
                                    </p>
                                  </div>
                                )}
                                {payment.description && (
                                  <div className="col-span-2">
                                    <p className="text-xs text-gray-400 uppercase tracking-wide">
                                      Descripción
                                    </p>
                                    <p className="text-xs font-medium text-gray-800 mt-0.5">
                                      {payment.description}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Actions */}
              <div className="flex gap-3 border-t border-gray-200 pt-4">
                <CustomButton
                  onClick={handleViewClose}
                  className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Cerrar
                </CustomButton>

                {/* Conversion Buttons - Only for Quotes and Orders */}
                {viewModalState.invoice.documentType === "QUOTE" && (
                  <>
                    {viewModalState.invoice.type !== "sale" && (
                      <CustomButton
                        onClick={() => {
                          handleConvertRecord(
                            viewModalState.invoice!.id,
                            "ORDER",
                          );
                          handleViewClose();
                        }}
                        className="flex-1 bg-purple-600 text-white hover:bg-purple-700 flex items-center justify-center gap-2"
                      >
                        <ArrowRight className="w-4 h-4" />
                        Convertir a Orden
                      </CustomButton>
                    )}
                    <CustomButton
                      onClick={() => {
                        handleViewClose();
                        setConvertModalState({
                          isOpen: true,
                          invoiceId: viewModalState.invoice!.id,
                          invoiceNumber: viewModalState.invoice!.invoiceNumber,
                        });
                      }}
                      className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center gap-2"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Convertir a Factura
                    </CustomButton>
                  </>
                )}

                {viewModalState.invoice.documentType === "ORDER" && (
                  <CustomButton
                    onClick={() => {
                      handleViewClose();
                      setConvertModalState({
                        isOpen: true,
                        invoiceId: viewModalState.invoice!.id,
                        invoiceNumber: viewModalState.invoice!.invoiceNumber,
                      });
                    }}
                    className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center gap-2"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Convertir a Factura
                  </CustomButton>
                )}

                {/* Pay Button - Only for Invoices */}
                {viewModalState.invoice.documentType === "INVOICE" && (
                  <CustomButton
                    onClick={() => handlePayInvoice(viewModalState.invoice!)}
                    className="flex-1 bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <DollarSign className="w-4 h-4" />
                    Pagar
                  </CustomButton>
                )}

                <CustomButton
                  onClick={() => {
                    handleViewClose();
                    handleEditClick(viewModalState.invoice!);
                  }}
                  className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                >
                  Editar
                </CustomButton>
              </div>
            </div>
          </div>
        </div>
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

      {/* Image Preview Modal */}
      {imagePreviewState.isOpen && imagePreviewState.imageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="relative bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-auto">
            <button
              onClick={() =>
                setImagePreviewState({ isOpen: false, imageUrl: null })
              }
              className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors z-10"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
            <div className="p-2">
              <img
                src={imagePreviewState.imageUrl}
                alt="Comprobante"
                className="max-w-full h-auto rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
