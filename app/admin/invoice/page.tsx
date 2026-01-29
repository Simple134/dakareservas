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
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
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
  GestionoDivision,
} from "@/src/types/gestiono";
import { useGestiono } from "@/src/context/Gestiono";
import { CreateInvoiceDialog } from "@/src/components/dashboard/CreateInvoice";
import { EditInvoiceDialog } from "@/src/components/dashboard/EditInvoiceDialog";
import { generateQuotePDF } from "@/lib/generateQuotePDF";

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
  beneficiariesMap: Record<number, string> = {},
  divisions: GestionoDivision[] = [],
): InvoiceDisplay {
  const beneficiaryName =
    beneficiariesMap[gestionoInvoice.beneficiaryId] ||
    `Beneficiario ${gestionoInvoice.beneficiaryId}`;
  const division = divisions.find((d) => d.id === gestionoInvoice.divisionId);

  let status = "pending";

  if (gestionoInvoice.dueToPay === 0 || gestionoInvoice.paid >= gestionoInvoice.amount) {
    status = "paid";
  }
  else if (gestionoInvoice.dueDate) {
    const dueDate = new Date(gestionoInvoice.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dueDate < today && gestionoInvoice.dueToPay > 0) {
      status = "overdue";
    }
  }
  else if (gestionoInvoice.state === "DRAFT" || gestionoInvoice.state === "PENDING") {
    status = "draft";
  }

  return {
    id: String(gestionoInvoice.id),
    invoiceNumber: gestionoInvoice.taxId || `INV-${gestionoInvoice.id}`,
    projectName:
      division?.name || gestionoInvoice.description || "Sin proyecto",
    clientName: gestionoInvoice.isSell ? beneficiaryName : undefined,
    supplierName: !gestionoInvoice.isSell ? beneficiaryName : undefined,
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

export default function InvoicesPage() {
  const { divisions, isLoading: isLoadingContext } = useGestiono();
  const [invoices, setInvoices] = useState<InvoiceDisplay[]>([]);
  const [rawInvoices, setRawInvoices] = useState<GestionoInvoiceItem[]>([]);
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
  const [activeTab, setActiveTab] = useState<"QUOTE" | "INVOICE" | "ORDER">(
    "QUOTE",
  );
  const [isSellFilter, setIsSellFilter] = useState<"all" | "true" | "false">(
    "all",
  );
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [beneficiariesMap, setBeneficiariesMap] = useState<
    Record<number, string>
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
  const [editModalState, setEditModalState] = useState<{
    isOpen: boolean;
    record: GestionoInvoiceItem | null;
  }>({
    isOpen: false,
    record: null,
  });

  useEffect(() => {
    const fetchBeneficiaries = async () => {
      setIsLoadingBeneficiaries(true);
      try {
        const response = await fetch("/api/gestiono/beneficiaries");
        if (response.ok) {
          const beneficiaries: GestionoBeneficiary[] = await response.json();
          const map: Record<number, string> = {};
          beneficiaries.forEach((b) => {
            map[b.id] = b.name;
          });
          setBeneficiariesMap(map);
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

        const response = await fetch(
          `/api/gestiono/pendingRecord?${params.toString()}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: GestionoInvoicesResponse = await response.json();
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

    fetchInvoices();
  }, [currentPage, itemsPerPage, refreshKey, activeTab, isSellFilter]);

  useEffect(() => {
    const mapped = rawInvoices.map((item) =>
      mapGestionoToInvoice(item, beneficiariesMap, divisions),
    );

    // Sort by date descending (newest first)
    const sorted = mapped.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // Descending order
    });

    setInvoices(sorted);
  }, [rawInvoices, beneficiariesMap, divisions]);

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

  // Usar datos del API resume en lugar de cálculos locales
  const totalSalesToCharge = resume.toCharge; // Monto pendiente a cobrar
  const totalPurchasesToPay = resume.toPay; // Monto pendiente a pagar
  const pendingRecordsCount =
    resume.toChargeRecordsCount + resume.toPayRecordsCount; // Total de registros pendientes

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

  const getTypeBadge = (type: string, documentType: string) => {
    const typeMap = {
      quote: type === "sale" ? "Cotización Venta" : "Cotización Compra",
      order: type === "sale" ? "Orden Venta" : "Orden Compra",
      invoice: type === "sale" ? "Factura Venta" : "Factura Compra",
    };

    const classMap = {
      quote: "bg-blue-100 text-blue-800",
      order: "bg-purple-100 text-purple-800",
      invoice: "bg-indigo-100 text-indigo-800",
    };

    return {
      label: typeMap[documentType as keyof typeof typeMap] || "Documento",
      className:
        classMap[documentType as keyof typeof classMap] ||
        "bg-gray-100 text-gray-800",
    };
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

  const handleDeleteClick = (invoiceId: string, invoiceNumber: string, documentType: string) => {
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
    // Refresh list after edit
    setRefreshKey((prev) => prev + 1);
  };

  const handleConvertRecord = async (
    invoiceId: string,
    newType: "ORDER" | "INVOICE",
  ) => {
    try {
      const response = await fetch(
        `/api/gestiono/pendingRecord/update`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: parseInt(invoiceId),
            type: newType,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || "Error al convertir el documento");
      }

      // Refresh list
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error("❌ Error converting record:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Error al convertir el documento. Por favor, intenta de nuevo.",
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
          `/api/gestiono/pendingRecord/${fullRecord.id}`,
        );
        if (detailsResponse.ok) {
          recordWithElements = await detailsResponse.json();
        }
      }

      // Fetch beneficiary details
      const beneficiaryResponse = await fetch(
        `/api/gestiono/beneficiaries?withContacts=true`,
      );
      let beneficiary = null;
      if (beneficiaryResponse.ok) {
        const beneficiaries = await beneficiaryResponse.json();
        beneficiary =
          beneficiaries.find(
            (b: any) => b.id === fullRecord.beneficiaryId,
          ) || null;
      }

      // Check if it is a Local Quotation
      const isLocalQuotation =
        (recordWithElements.reference &&
          recordWithElements.reference.toLowerCase().includes("local")) ||
        (typeof recordWithElements.clientdata !== "string" && recordWithElements.clientdata?.quotationType === "LOCAL_COMMERCIAL");

      if (isLocalQuotation && recordWithElements.clientdata && typeof recordWithElements.clientdata !== "string") {
        // Parse local specific data
        const clientData = recordWithElements.clientdata;
        let localInfo;
        let paymentPlan;

        try {
          localInfo = typeof clientData.localInfo === 'string'
            ? JSON.parse(clientData.localInfo)
            : clientData.localInfo;

          paymentPlan = typeof clientData.paymentPlan === 'string'
            ? JSON.parse(clientData.paymentPlan)
            : clientData.paymentPlan;
        } catch (e) {
          console.error("Error parsing local data:", e);
          throw new Error("Datos de cotización de local inválidos");
        }

        const { generateLocalQuotePDF } = await import("@/src/lib/generateLocalQuotePDF");

        // Get project name
        const division = divisions.find((d) => d.id === fullRecord.divisionId);

        await generateLocalQuotePDF({
          localData: {
            id: Number(clientData.localId),
            level: localInfo.level,
            area_mt2: localInfo.area,
            price_per_mt2: localInfo.pricePerM2,
            total_value: localInfo.totalValue,
            status: "DISPONIBLE" // Status might not be needed for PDF or fetched from elsewhere, using filler or what's available
          },
          beneficiary,
          projectName: division?.name || invoice.projectName,
          paymentPlan: paymentPlan,
          quotationDate: recordWithElements.date
        });

      } else {
        // Generate Standard PDF
        await generateQuotePDF({
          quote: recordWithElements,
          beneficiary,
          elements: recordWithElements.elements || [],
        });
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{activeTab === "QUOTE" ? "Cotizaciones" : activeTab === "INVOICE" ? "Facturas" : "Ordenes"}</h1>
          <p className="text-gray-600">
            Gestiona todas las {activeTab === "QUOTE" ? "cotizaciones" : activeTab === "INVOICE" ? "facturas" : "ordenes"}
          </p>
        </div>
        <div className="relative">
          <CustomButton
            onClick={() => setIsCreateMenuOpen(!isCreateMenuOpen)}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <span className="mr-2">+</span>
            Nuevo Documento
            <ChevronDown className="w-4 h-4 ml-2" />
          </CustomButton>

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

      {/* Tabs for Document Types */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("QUOTE")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "QUOTE"
            ? "border-blue-600 text-blue-600"
            : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
            }`}
        >
          Cotizaciones
        </button>
        <button
          onClick={() => setActiveTab("ORDER")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "ORDER"
            ? "border-purple-600 text-purple-600"
            : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
            }`}
        >
          Órdenes
        </button>
        <button
          onClick={() => setActiveTab("INVOICE")}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === "INVOICE"
            ? "border-indigo-600 text-indigo-600"
            : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
            }`}
        >
          Facturas
        </button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <CustomCard>
          <div className="p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Ventas Totales</h3>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? (
                <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
              ) : (
                `RD$ ${totalSalesToCharge.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </div>
            <p className="text-xs text-gray-600">Pendiente a cobrar</p>
          </div>
        </CustomCard>

        <CustomCard>
          <div className="p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Compras Totales</h3>
            </div>
            <div className="text-2xl font-bold text-red-600">
              {isLoading ? (
                <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
              ) : (
                `RD$ ${totalPurchasesToPay.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </div>
            <p className="text-xs text-gray-600">Pendiente a pagar</p>
          </div>
        </CustomCard>

        <CustomCard>
          <div className="p-6">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="text-sm font-medium">Pendientes</h3>
            </div>
            <div className="text-2xl font-bold text-yellow-600">
              {isLoading ? (
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
              ) : (
                pendingRecordsCount
              )}
            </div>
            <p className="text-xs text-gray-600">Registros pendientes</p>
          </div>
        </CustomCard>
      </div>

      {/* Search and Filters */}
      <CustomCard>
        <div className="p-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por número, proyecto, cliente o proveedor..."
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
              {selectedDocumentType !== "all" && (
                <button onClick={() => setSelectedDocumentType("all")}>
                  <CustomBadge className="bg-gray-100 text-gray-800 gap-1 cursor-pointer">
                    {selectedDocumentType === "quote"
                      ? "Cotizaciones"
                      : selectedDocumentType === "order"
                        ? "Órdenes"
                        : "Facturas"}
                    <X className="w-3 h-3" />
                  </CustomBadge>
                </button>
              )}
              {selectedStatuses.map((status) => (
                <button key={status} onClick={() => toggleStatus(status)}>
                  <CustomBadge className="bg-gray-100 text-gray-800 gap-1 cursor-pointer">
                    {status === "paid"
                      ? "Pagada"
                      : status === "pending"
                        ? "Pendiente"
                        : status === "overdue"
                          ? "Vencida"
                          : "Borrador"}
                    <X className="w-3 h-3" />
                  </CustomBadge>
                </button>
              ))}
            </div>
          )}
        </div>
      </CustomCard>

      {/* Filters Panel */}
      {isFilterOpen && (
        <CustomCard>
          <div className="p-6">
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
              {/* Tipo de Transacción (Venta/Compra) */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <TrendingUp className="w-4 h-4" />
                  Tipo de Transacción
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => setIsSellFilter("all")}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded-lg border transition-colors ${isSellFilter === "all"
                      ? "bg-blue-50 border-blue-500 text-blue-700 font-medium"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    Todas
                  </button>
                  <button
                    onClick={() => setIsSellFilter("true")}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded-lg border transition-colors ${isSellFilter === "true"
                      ? "bg-green-50 border-green-500 text-green-700 font-medium"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    Ventas
                  </button>
                  <button
                    onClick={() => setIsSellFilter("false")}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded-lg border transition-colors ${isSellFilter === "false"
                      ? "bg-red-50 border-red-500 text-red-700 font-medium"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Compras
                  </button>
                </div>
              </div>

              {/* Estado */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="w-4 h-4" />
                  Estado
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => toggleStatus("paid")}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${selectedStatuses.includes("paid") ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Pagada ({invoices.filter((i) => i.status === "paid").length}
                    )
                  </button>
                  <button
                    onClick={() => toggleStatus("pending")}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${selectedStatuses.includes("pending") ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                  >
                    <Clock className="w-4 h-4" />
                    Pendiente (
                    {invoices.filter((i) => i.status === "pending").length})
                  </button>
                  <button
                    onClick={() => toggleStatus("overdue")}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${selectedStatuses.includes("overdue") ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                  >
                    <AlertCircle className="w-4 h-4" />
                    Vencida (
                    {invoices.filter((i) => i.status === "overdue").length})
                  </button>
                  <button
                    onClick={() => toggleStatus("draft")}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${selectedStatuses.includes("draft") ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                  >
                    <XCircle className="w-4 h-4" />
                    Borrador (
                    {invoices.filter((i) => i.status === "draft").length})
                  </button>
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
          </div>
        </CustomCard>
      )}

      {/* Invoices Table */}
      <CustomCard>
        <div className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Lista de Facturas</h2>
            <p className="text-sm text-gray-600">
              {filteredInvoices.length} facturas encontradas
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Número
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Tipo
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Proyecto
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Cliente/Proveedor
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Fecha
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Vencimiento
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Monto
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Estado
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-gray-100 animate-pulse"
                    >
                      <td className="py-3 px-4">
                        <div className="h-4 w-24 bg-gray-200 rounded" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-6 w-20 bg-gray-200 rounded-full" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 w-32 bg-gray-200 rounded" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 w-40 bg-gray-200 rounded" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 w-24 bg-gray-200 rounded" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 w-24 bg-gray-200 rounded" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-4 w-20 bg-gray-200 rounded" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-6 w-24 bg-gray-200 rounded-full" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-8 w-24 bg-gray-200 rounded" />
                      </td>
                    </tr>
                  ))
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-500">
                      No se encontraron facturas matching
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((invoice) => {
                    const statusBadge = getStatusBadge(invoice.status);
                    const typeBadge = getTypeBadge(
                      invoice.type,
                      invoice.documentType,
                    );

                    return (
                      <tr
                        key={invoice.id}
                        className="border-b border-gray-100 hover:bg-gray-50"
                      >
                        <td className="py-3 px-4 font-medium text-sm">
                          {invoice.invoiceNumber}
                        </td>
                        <td className="py-3 px-4">
                          <CustomBadge className={typeBadge.className}>
                            {typeBadge.label}
                          </CustomBadge>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {invoice.projectName}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {invoice.clientName || invoice.supplierName}
                        </td>
                        <td className="py-3 px-4 text-sm">{invoice.date}</td>
                        <td className="py-3 px-4 text-sm">{invoice.dueDate}</td>
                        <td
                          className={`py-3 px-4 text-sm font-medium ${invoice.type === "sale" ? "text-green-600" : "text-red-600"}`}
                        >
                          {invoice.type === "sale" ? "+" : "-"}RD${" "}
                          {invoice.amount.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <CustomBadge className={statusBadge.className}>
                            {statusBadge.label}
                          </CustomBadge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleViewClick(invoice)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Ver"
                            >
                              <Eye className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => handleEditClick(invoice)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(invoice)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Descargar PDF"
                            >
                              <Download className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteClick(
                                  invoice.id,
                                  invoice.invoiceNumber,
                                  invoice.documentType,
                                )
                              }
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
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

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
              <div className="text-sm text-gray-600">
                Mostrando{" "}
                <span className="font-medium">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>{" "}
                -{" "}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, totalItems)}
                </span>{" "}
                de <span className="font-medium">{totalItems}</span> facturas
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(prev - 1, 1))
                  }
                  disabled={currentPage === 1 || isLoading}
                  className={`px-3 py-2 text-sm rounded border transition-colors ${currentPage === 1 || isLoading
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  Anterior
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      // Mostrar primera, última, actual y adyacentes
                      return (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - currentPage) <= 1
                      );
                    })
                    .map((page, idx, arr) => {
                      // Agregar ellipsis si hay saltos
                      const showEllipsisBefore =
                        idx > 0 && page - arr[idx - 1] > 1;

                      return (
                        <div key={page} className="flex items-center gap-1">
                          {showEllipsisBefore && (
                            <span className="px-2 text-gray-400">...</span>
                          )}
                          <button
                            onClick={() => setCurrentPage(page)}
                            disabled={isLoading}
                            className={`px-3 py-1 text-sm rounded transition-colors ${page === currentPage
                              ? "bg-blue-600 text-white border border-blue-600"
                              : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                              } ${isLoading ? "cursor-not-allowed opacity-50" : ""}`}
                          >
                            {page}
                          </button>
                        </div>
                      );
                    })}
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages || isLoading}
                  className={`px-3 py-2 text-sm rounded border transition-colors ${currentPage === totalPages || isLoading
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
        <CreateInvoiceDialog
          isOpen={createDialogState.isOpen}
          onClose={() =>
            setCreateDialogState((prev) => ({ ...prev, isOpen: false }))
          }
          documentType={createDialogState.documentType}
          transactionType={createDialogState.transactionType}
          onCreateInvoice={handleInvoiceCreated}
        />
      </CustomCard>

      {/* Delete Confirmation Modal */}
      {deleteModalState.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold">
                {activeTab === "QUOTE"
                  ? "Confirmar Eliminación"
                  : "Confirmar Archivado"}
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              {activeTab === "QUOTE" ? (
                <>
                  ¿Estás seguro que quieres eliminar permanentemente la
                  cotización{" "}
                  <span className="font-semibold">
                    {deleteModalState.invoiceNumber}
                  </span>
                  ? Esta acción no se puede deshacer y el documento será
                  eliminado completamente.
                </>
              ) : (
                <>
                  ¿Estás seguro que quieres archivar el documento{" "}
                  <span className="font-semibold">
                    {deleteModalState.invoiceNumber}
                  </span>
                  ? El documento será archivado pero no eliminado permanentemente.
                </>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <CustomButton
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </CustomButton>
              <CustomButton
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting
                  ? activeTab === "QUOTE"
                    ? "Eliminando..."
                    : "Archivando..."
                  : activeTab === "QUOTE"
                    ? "Eliminar"
                    : "Archivar"}
              </CustomButton>
            </div>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
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
              {/* Header Info */}
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
                        getTypeBadge(
                          viewModalState.invoice.type,
                          viewModalState.invoice.documentType,
                        ).className
                      }
                    >
                      {
                        getTypeBadge(
                          viewModalState.invoice.type,
                          viewModalState.invoice.documentType,
                        ).label
                      }
                    </CustomBadge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Proyecto</p>
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
              </div>

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
                    <CustomButton
                      onClick={() => {
                        handleConvertRecord(viewModalState.invoice!.id, "ORDER");
                        handleViewClose();
                      }}
                      className="flex-1 bg-purple-600 text-white hover:bg-purple-700 flex items-center justify-center gap-2"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Convertir a Orden
                    </CustomButton>
                    <CustomButton
                      onClick={() => {
                        handleConvertRecord(viewModalState.invoice!.id, "INVOICE");
                        handleViewClose();
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
                      handleConvertRecord(viewModalState.invoice!.id, "INVOICE");
                      handleViewClose();
                    }}
                    className="flex-1 bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center gap-2"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Convertir a Factura
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

      {/* Edit Invoice Modal */}
      {editModalState.isOpen && editModalState.record && (
        <EditInvoiceDialog
          isOpen={editModalState.isOpen}
          onClose={handleEditClose}
          record={editModalState.record}
          onUpdate={handleInvoiceCreated}
        />
      )}
    </div>
  );
}
