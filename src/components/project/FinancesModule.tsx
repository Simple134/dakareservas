"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Download,
  ChevronDown,
  X,
  TrendingUp,
  ShoppingCart,
  // ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Plus,
} from "lucide-react";
import {
  CustomCard,
  CustomBadge,
  CustomButton,
} from "@/src/components/project/CustomCard";
import type {
  GestionoInvoiceItem,
  GestionoInvoicesResponse,
  // GestionoBeneficiary,
  // GestionoDivision,
} from "@/src/types/gestiono";
// import { useGestiono } from "@/src/context/Gestiono";
import { CreateInvoiceDialog } from "@/src/components/dashboard/CreateInvoice";
import { EditInvoiceDialog } from "@/src/components/dashboard/EditInvoiceDialog";
import { generateQuotePDF } from "@/lib/generateQuotePDF";
import { generateInvoicePDF } from "@/lib/generateInvoicePDF";

interface FinancesModuleProps {
  projectId: string | number;
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
  status: string;
  type: string;
  documentType: string;
}

function mapGestionoToInvoice(
  gestionoInvoice: GestionoInvoiceItem,
  // beneficiariesMap: Record<number, string> = {},
  // divisions: GestionoDivision[] = [],
): InvoiceDisplay {
  // const beneficiaryName =
  //   beneficiariesMap[gestionoInvoice.beneficiaryId] ||
  //   `Beneficiario ${gestionoInvoice.beneficiaryId}`;
  // const division = divisions.find((d) => d.id === gestionoInvoice.divisionId);

  let status = "pending";

  if (
    gestionoInvoice.dueToPay === 0 ||
    gestionoInvoice.paid >= gestionoInvoice.amount
  ) {
    status = "paid";
  } else if (gestionoInvoice.dueDate) {
    const dueDate = new Date(gestionoInvoice.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dueDate < today && gestionoInvoice.dueToPay > 0) {
      status = "overdue";
    }
  } else if (
    gestionoInvoice.state === "DRAFT" ||
    gestionoInvoice.state === "PENDING"
  ) {
    status = "draft";
  }

  return {
    id: String(gestionoInvoice.id),
    invoiceNumber: gestionoInvoice.taxId || `INV-${gestionoInvoice.id}`,
    projectName: gestionoInvoice.description || "Sin descripción", // Using description as project/concept placeholder
    clientName: "N/A", // We might need to fetch beneficiaries if we want names
    supplierName: "N/A",
    date: new Date(gestionoInvoice.date).toISOString().split("T")[0],
    dueDate: gestionoInvoice.dueDate
      ? new Date(gestionoInvoice.dueDate).toISOString().split("T")[0]
      : new Date(gestionoInvoice.date).toISOString().split("T")[0],
    amount: gestionoInvoice.amount,
    status: status,
    type: gestionoInvoice.isSell === 1 ? "sale" : "purchase",
    documentType:
      gestionoInvoice.type === "QUOTE"
        ? "QUOTE"
        : gestionoInvoice.type === "ORDER"
          ? "ORDER"
          : "INVOICE",
  };
}

export function FinancesModule({ projectId }: FinancesModuleProps) {
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

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedDocumentType, setSelectedDocumentType] = useState("all");
  const [activeTab, setActiveTab] = useState<"QUOTE" | "INVOICE" | "ORDER">(
    "INVOICE",
  ); // Default to INVOICE
  const [isSellFilter, setIsSellFilter] = useState<"all" | "true" | "false">(
    "all",
  );
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
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

  useEffect(() => {
    const fetchInvoices = async () => {
      setIsLoadingInvoices(true);
      try {
        const params = new URLSearchParams({
          divisionId: String(projectId),
          search: "",
          ignoreDetailedData: "false",
          state: "PENDING", // This might need adjustment if we want all states
          amount: "0",
          type: activeTab,
          isSell: isSellFilter === "all" ? "" : isSellFilter,
          elements: "50", // Limit
          page: "1",
        });

        const response = await fetch(
          `/api/gestiono/pendingRecord?${params.toString()}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: GestionoInvoicesResponse = await response.json();
        setRawInvoices(data.items || []);

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

    fetchInvoices();
  }, [projectId, refreshKey, activeTab, isSellFilter]);

  useEffect(() => {
    const mapped = rawInvoices.map((item) => mapGestionoToInvoice(item));
    const sorted = mapped.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
    setInvoices(sorted);
  }, [rawInvoices]);

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

  // KPIs specific to the current tab/filter context or general project context
  // Note: resume from API is based on the query. If we filter by type=INVOICE, it shows invoice totals.
  const totalSalesToCharge = resume.toCharge;
  const totalPurchasesToPay = resume.toPay;
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
      const isQuote = activeTab === "QUOTE";
      const method = isQuote ? "DELETE" : "PATCH";

      const response = await fetch(
        `/api/gestiono/pendingRecord/${deleteModalState.invoiceId}`,
        {
          method,
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

  const handleEditClick = (invoice: InvoiceDisplay) => {
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
    setRefreshKey((prev) => prev + 1);
  };

  const handleDownloadPDF = async (invoice: InvoiceDisplay) => {
    try {
      const fullRecord = rawInvoices.find((r) => String(r.id) === invoice.id);
      if (!fullRecord) {
        throw new Error("No se pudo encontrar el registro completo");
      }

      let recordWithElements = fullRecord;
      if (!fullRecord.elements || fullRecord.elements.length === 0) {
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
          beneficiaries.find((b: any) => b.id === fullRecord.beneficiaryId) ||
          null;
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
        // Check document type to determine which PDF generator to use
        if (recordWithElements.type === "INVOICE") {
          // Generate Invoice PDF
          await generateInvoicePDF({
            invoice: recordWithElements,
            beneficiary,
            elements: recordWithElements.elements || [],
            isSell: recordWithElements.isSell === 1,
          });
        } else {
          // Generate Quote or Order PDF
          await generateQuotePDF({
            quote: recordWithElements,
            beneficiary,
            elements: recordWithElements.elements || [],
            documentType: recordWithElements.type as "QUOTE" | "ORDER",
            isSell: recordWithElements.isSell === 1,
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
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("QUOTE")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "QUOTE"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
          }`}
        >
          Cotizaciones
        </button>
        <button
          onClick={() => setActiveTab("ORDER")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "ORDER"
              ? "border-purple-600 text-purple-600"
              : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
          }`}
        >
          Órdenes
        </button>
        <button
          onClick={() => setActiveTab("INVOICE")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "INVOICE"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
          }`}
        >
          Facturas
        </button>
      </div>

      {/* KPIs */}
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
            <h3 className="text-sm font-medium">Compras Pendientes</h3>
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

      {/* Filters */}
      <CustomCard className="p-6">
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
                  onClick={() => setIsSellFilter("all")}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border ${isSellFilter === "all" ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-gray-200"}`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setIsSellFilter("true")}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border ${isSellFilter === "true" ? "bg-green-50 border-green-500 text-green-700" : "bg-white border-gray-200"}`}
                >
                  Ventas
                </button>
                <button
                  onClick={() => setIsSellFilter("false")}
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3">Número</th>
                <th className="px-6 py-3">Descripción</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3 text-right">Monto</th>
                <th className="px-6 py-3">Estado</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingInvoices ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Cargando documentos...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    {hasActiveFilters
                      ? "No se encontraron documentos con los filtros aplicados"
                      : "No hay documentos registrados para este proyecto"}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => {
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
                      <td className="px-6 py-4">
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
                      <td className="px-6 py-4 text-gray-600">
                        {invoice.date}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">
                        RD${" "}
                        {invoice.amount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <CustomBadge className={statusBadge.className}>
                          {statusBadge.label}
                        </CustomBadge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleDownloadPDF(invoice)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Descargar PDF"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleEditClick(invoice)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
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
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
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
        onCreateInvoice={handleInvoiceCreated}
      />

      {editModalState.record && (
        <EditInvoiceDialog
          isOpen={editModalState.isOpen}
          onClose={handleEditClose}
          record={editModalState.record}
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
    </div>
  );
}
