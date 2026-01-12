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

// Tipo para factura en el componente
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

// Mapear factura de Gestiono a formato del componente
function mapGestionoToInvoice(
  gestionoInvoice: GestionoInvoiceItem,
  beneficiariesMap: Record<number, string> = {},
  divisions: GestionoDivision[] = [],
): InvoiceDisplay {
  // Mapear estado
  const statusMap: Record<string, string> = {
    COMPLETED: "paid",
    PENDING: "pending",
    PAST_DUE: "overdue",
    DRAFT: "draft",
  };

  const beneficiaryName =
    beneficiariesMap[gestionoInvoice.beneficiaryId] ||
    `Beneficiario ${gestionoInvoice.beneficiaryId}`;
  const division = divisions.find((d) => d.id === gestionoInvoice.divisionId);

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
    status: statusMap[gestionoInvoice.state] || "draft",
    type: gestionoInvoice.isSell === 1 ? "sale" : "purchase",
    documentType: "invoice", // Gestiono solo devuelve INVOICE en este endpoint
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
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedDocumentType, setSelectedDocumentType] = useState("all");
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
        const response = await fetch(
          `/api/gestiono/invoices?elementsPerPage=${itemsPerPage}&page=${currentPage}`,
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: GestionoInvoicesResponse = await response.json();
        setRawInvoices(data.items || []);
        setTotalPages(data.totalPages || 1);
        setTotalItems(data.totalItems || 0);
      } catch (error) {
        console.error("❌ Error fetching invoices:", error);
      } finally {
        setIsLoadingInvoices(false);
      }
    };

    fetchInvoices();
  }, [currentPage, itemsPerPage, refreshKey]);

  useEffect(() => {
    const mapped = rawInvoices.map((item) =>
      mapGestionoToInvoice(item, beneficiariesMap, divisions),
    );
    setInvoices(mapped);
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

  const totalSales = invoices
    .filter((inv) => inv.type === "sale" && inv.status === "paid")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalPurchases = invoices
    .filter((inv) => inv.type === "purchase" && inv.status === "paid")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const pendingInvoices = invoices.filter(
    (inv) => inv.status === "pending",
  ).length;

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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturas</h1>
          <p className="text-gray-600">
            Gestiona todas las facturas de ventas y compras
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
                `RD$ ${totalSales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </div>
            <p className="text-xs text-gray-600">Facturas de venta pagadas</p>
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
                `RD$ ${totalPurchases.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </div>
            <p className="text-xs text-gray-600">Facturas de compra pagadas</p>
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
                pendingInvoices
              )}
            </div>
            <p className="text-xs text-gray-600">Facturas por cobrar/pagar</p>
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
            <div className="grid gap-6 md:grid-cols-3">
              {/* Tipo de Transacción */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <TrendingUp className="w-4 h-4" />
                  Tipo de Transacción
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todas ({invoices.length})</option>
                  <option value="sale">
                    Ventas ({invoices.filter((i) => i.type === "sale").length})
                  </option>
                  <option value="purchase">
                    Compras (
                    {invoices.filter((i) => i.type === "purchase").length})
                  </option>
                </select>
              </div>

              {/* Tipo de Documento */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-medium">
                  Tipo de Documento
                </label>
                <select
                  value={selectedDocumentType}
                  onChange={(e) => setSelectedDocumentType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos ({invoices.length})</option>
                  <option value="quote">
                    Cotizaciones (
                    {invoices.filter((i) => i.documentType === "quote").length})
                  </option>
                  <option value="order">
                    Órdenes (
                    {invoices.filter((i) => i.documentType === "order").length})
                  </option>
                  <option value="invoice">
                    Facturas (
                    {
                      invoices.filter((i) => i.documentType === "invoice")
                        .length
                    }
                    )
                  </option>
                </select>
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
                    const canConvert =
                      invoice.documentType === "quote" ||
                      invoice.documentType === "order";

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
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Ver"
                            >
                              <Eye className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4 text-gray-600" />
                            </button>
                            {canConvert && (
                              <button
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Convertir a Factura"
                              >
                                <ArrowRight className="w-4 h-4 text-gray-600" />
                              </button>
                            )}
                            <button
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Descargar"
                            >
                              <Download className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
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
                  className={`px-3 py-2 text-sm rounded border transition-colors ${
                    currentPage === 1 || isLoading
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
                            className={`px-3 py-1 text-sm rounded transition-colors ${
                              page === currentPage
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
                  className={`px-3 py-2 text-sm rounded border transition-colors ${
                    currentPage === totalPages || isLoading
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
    </div>
  );
}
