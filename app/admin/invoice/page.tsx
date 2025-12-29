"use client";

import { useState } from "react";
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
  Calendar,
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

const mockInvoices = [
  {
    id: "1",
    invoiceNumber: "FAC-001",
    projectName: "Casa Kilma",
    clientName: "Kilma Rodriguez",
    date: "2024-03-15",
    dueDate: "2024-04-15",
    amount: 125000,
    status: "paid",
    type: "sale",
    documentType: "invoice",
  },
  {
    id: "2",
    invoiceNumber: "OC-002",
    projectName: "Consumo de DAKA",
    supplierName: "Ferretería Central",
    date: "2024-03-14",
    dueDate: "2024-03-29",
    amount: 45000,
    status: "pending",
    type: "purchase",
    documentType: "order",
  },
  {
    id: "3",
    invoiceNumber: "FAC-003",
    projectName: "Edificio Los Jardines",
    clientName: "Inmobiliaria del Caribe",
    date: "2024-03-10",
    dueDate: "2024-04-10",
    amount: 350000,
    status: "overdue",
    type: "sale",
    documentType: "invoice",
  },
  {
    id: "4",
    invoiceNumber: "OC-004",
    projectName: "Casa Kilma",
    supplierName: "Cemex Dominicana",
    date: "2024-03-12",
    dueDate: "2024-03-27",
    amount: 75000,
    status: "pending",
    type: "purchase",
    documentType: "order",
  },
  {
    id: "5",
    invoiceNumber: "COT-001",
    projectName: "Casa Kilma",
    clientName: "Kilma Rodriguez",
    date: "2024-03-08",
    dueDate: "2024-03-23",
    amount: 50000,
    status: "pending",
    type: "sale",
    documentType: "quote",
  },
  {
    id: "6",
    invoiceNumber: "COT-002",
    projectName: "Edificio Los Jardines",
    supplierName: "Materiales del Este",
    date: "2024-03-09",
    dueDate: "2024-03-24",
    amount: 85000,
    status: "pending",
    type: "purchase",
    documentType: "quote",
  },
];

const mockPaymentPlans = [
  {
    id: "1",
    plan_number: "PP-2025/2-819",
    project_name: "Remodelación Oficinas Tech Solutions",
    module_name: "A105",
    total_amount: 3000000,
    remaining_balance: 3000000,
    installments_count: 12,
    status: "active",
    created_at: "2024-03-01",
  },
];

export default function InvoicesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedDocumentType, setSelectedDocumentType] = useState("all");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);

  const filteredInvoices = mockInvoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.supplierName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === "all" || invoice.type === selectedType;
    const matchesDocumentType =
      selectedDocumentType === "all" ||
      invoice.documentType === selectedDocumentType;
    const matchesStatus =
      selectedStatuses.length === 0 ||
      selectedStatuses.includes(invoice.status);

    return matchesSearch && matchesType && matchesDocumentType && matchesStatus;
  });

  const totalSales = mockInvoices
    .filter((inv) => inv.type === "sale" && inv.status === "paid")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const totalPurchases = mockInvoices
    .filter((inv) => inv.type === "purchase" && inv.status === "paid")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const pendingInvoices = mockInvoices.filter(
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
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Nueva Cotización de Venta
                </button>
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Nueva Cotización de Compra
                </button>
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Nueva Orden de Venta
                </button>
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Nueva Orden de Compra
                </button>
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Nueva Factura de Venta
                </button>
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Nueva Factura de Compra
                </button>
                <div className="border-t border-gray-200 my-1"></div>
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Nuevo Plan de Pago
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
              RD$ {totalSales.toLocaleString()}
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
              RD$ {totalPurchases.toLocaleString()}
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
              {pendingInvoices}
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
                  <option value="all">Todas ({mockInvoices.length})</option>
                  <option value="sale">
                    Ventas (
                    {mockInvoices.filter((i) => i.type === "sale").length})
                  </option>
                  <option value="purchase">
                    Compras (
                    {mockInvoices.filter((i) => i.type === "purchase").length})
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
                  <option value="all">Todos ({mockInvoices.length})</option>
                  <option value="quote">
                    Cotizaciones (
                    {
                      mockInvoices.filter((i) => i.documentType === "quote")
                        .length
                    }
                    )
                  </option>
                  <option value="order">
                    Órdenes (
                    {
                      mockInvoices.filter((i) => i.documentType === "order")
                        .length
                    }
                    )
                  </option>
                  <option value="invoice">
                    Facturas (
                    {
                      mockInvoices.filter((i) => i.documentType === "invoice")
                        .length
                    }
                    )
                  </option>
                  <option value="paymentPlan">
                    Planes de Pago ({mockPaymentPlans.length})
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
                    Pagada (
                    {mockInvoices.filter((i) => i.status === "paid").length})
                  </button>
                  <button
                    onClick={() => toggleStatus("pending")}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${selectedStatuses.includes("pending") ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                  >
                    <Clock className="w-4 h-4" />
                    Pendiente (
                    {mockInvoices.filter((i) => i.status === "pending").length})
                  </button>
                  <button
                    onClick={() => toggleStatus("overdue")}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${selectedStatuses.includes("overdue") ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                  >
                    <AlertCircle className="w-4 h-4" />
                    Vencida (
                    {mockInvoices.filter((i) => i.status === "overdue").length})
                  </button>
                  <button
                    onClick={() => toggleStatus("draft")}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${selectedStatuses.includes("draft") ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}
                  >
                    <XCircle className="w-4 h-4" />
                    Borrador (
                    {mockInvoices.filter((i) => i.status === "draft").length})
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
                {filteredInvoices.map((invoice) => {
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
                        {invoice.amount.toLocaleString()}
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
                })}
              </tbody>
            </table>
          </div>
        </div>
      </CustomCard>

      {/* Payment Plans Section */}
      {(selectedDocumentType === "all" ||
        selectedDocumentType === "paymentPlan") &&
        mockPaymentPlans.length > 0 && (
          <CustomCard>
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5" />
                <h2 className="text-xl font-semibold">Planes de Pago</h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {mockPaymentPlans.length} planes de pago
              </p>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                        Número
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                        Proyecto
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                        Módulo
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                        Monto Total
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                        Balance
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">
                        Progreso
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
                    {mockPaymentPlans.map((plan) => {
                      const paidAmount =
                        plan.total_amount - plan.remaining_balance;
                      const progress = (paidAmount / plan.total_amount) * 100;

                      return (
                        <tr
                          key={plan.id}
                          className="border-b border-gray-100 hover:bg-gray-50"
                        >
                          <td className="py-3 px-4 font-medium text-sm">
                            {plan.plan_number}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {plan.project_name}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {plan.module_name}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            RD$ {plan.total_amount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-sm text-red-600">
                            RD$ {plan.remaining_balance.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            <div
                              className="space-y-1"
                              style={{ width: "128px" }}
                            >
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-600">
                                {progress.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <CustomBadge
                              className={
                                plan.status === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-blue-100 text-blue-800"
                              }
                            >
                              {plan.status === "completed"
                                ? "Completado"
                                : "Activo"}
                            </CustomBadge>
                          </td>
                          <td className="py-3 px-4">
                            <button className="flex items-center gap-1 px-3 py-1 text-sm hover:bg-gray-100 rounded-lg transition-colors">
                              <Eye className="w-4 h-4" />
                              Ver
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </CustomCard>
        )}
    </div>
  );
}
