import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  Search,
  Eye,
} from "lucide-react";
import { CreateInvoiceDialog } from "@/src/components/dashboard/CreateInvoice";
import { CustomCard, CustomButton } from "@/src/components/project/CustomCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";
import { PendingRecord } from "@/src/types/gestiono";

interface FinancesModuleProps {
  projectId: string | number;
  records?: PendingRecord[];
}

export function FinancesModule({ projectId, records = [] }: FinancesModuleProps) {
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  // Calculations
  const totalIncome = records
    .filter(r => r.isSell)
    .reduce((acc, r) => acc + r.amount, 0);

  const totalExpenses = records
    .filter(r => !r.isSell)
    .reduce((acc, r) => acc + r.amount, 0);

  const netCashFlow = totalIncome - totalExpenses;

  // Filter records
  const filteredRecords = records.filter(record => {
    const matchesSearch =
      record.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(record.id).includes(searchTerm);

    const matchesType = selectedType === "all" ||
      (selectedType === "sale" && record.isSell) ||
      (selectedType === "purchase" && !record.isSell);

    return matchesSearch && matchesType;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Intl.DateTimeFormat('es-DO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  // Adapted Tabs Implementation
  const renderTabs = () => (
    <div className="flex space-x-1 rounded-xl bg-gray-100 p-1 mb-6">
      {['overview', 'transactions', 'invoices'].map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${activeTab === tab
            ? 'bg-white text-blue-700 shadow'
            : 'text-gray-500 hover:bg-white/[0.12] hover:text-black'
            }`}
        >
          {tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <CustomCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Módulo Financiero</h2>
        </div>

        {renderTabs()}

        {activeTab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-green-700 font-medium">Ingresos Totales</p>
                  <p className="text-2xl font-bold text-green-800">{formatCurrency(totalIncome)}</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-100">
              <div className="flex items-center gap-3">
                <TrendingDown className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-sm text-red-700 font-medium">Egresos Totales</p>
                  <p className="text-2xl font-bold text-red-800">{formatCurrency(totalExpenses)}</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-700 font-medium">Balance Neto</p>
                  <p className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-blue-800' : 'text-red-800'}`}>
                    {formatCurrency(netCashFlow)}
                  </p>
                </div>
              </div>
            </div>

            {/* Flujo de Caja (Simple List Summary) */}
            <div className="col-span-1 md:col-span-3 mt-4">
              <h3 className="font-semibold text-lg mb-4">Ultimos Movimientos</h3>
              <div className="space-y-3">
                {records.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-100">
                    <div className="flex items-center gap-3">
                      {r.isSell ? <TrendingUp className="w-5 h-5 text-green-500" /> : <TrendingDown className="w-5 h-5 text-red-500" />}
                      <div>
                        <p className="font-medium text-gray-900">{r.description || (r.isSell ? "Ingreso" : "Gasto")}</p>
                        <p className="text-xs text-gray-500">{formatDate(r.date)}</p>
                      </div>
                    </div>
                    <span className={`font-semibold ${r.isSell ? "text-green-600" : "text-red-600"}`}>
                      {r.isSell ? "+" : "-"}{formatCurrency(r.amount)}
                    </span>
                  </div>
                ))}
                {records.length === 0 && <p className="text-gray-500 text-sm">No hay movimientos recientes.</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === "transactions" && (
          <div className="space-y-4">
            {/* Transactions Table - Historial de Movimientos */}
            <div className="rounded-md border border-gray-200 overflow-hidden bg-white">
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-lg">Historial de Movimientos</h3>
                <p className="text-sm text-gray-500 mt-1">Transacciones de ingresos y egresos del proyecto</p>
              </div>
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Método de Pago</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        No hay movimientos registrados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((r) => (
                      <TableRow key={r.id} className="hover:bg-gray-50/50">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {r.isSell ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />}
                            <Badge variant={r.isSell ? "default" : "destructive"}>
                              {r.isSell ? "Ingreso" : "Egreso"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-gray-900">{r.description || (r.isSell ? "Pago recibido" : "Gasto")}</TableCell>
                        <TableCell className={`text-right font-medium ${r.isSell ? "text-green-600" : "text-red-600"}`}>
                          {r.isSell ? "+" : "-"}{formatCurrency(r.amount)}
                        </TableCell>
                        <TableCell className="text-gray-600">{formatDate(r.date)}</TableCell>
                        <TableCell className="text-gray-600">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-gray-400" />
                            <span>{"N/A"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.state === "PAID" ? "default" : r.state === "OVERDUE" ? "destructive" : "secondary"} className={r.state === "PAID" ? "bg-green-600 hover:bg-green-700" : ""}>
                            {r.state === "PAID" ? "Pagado" : r.state === "PENDING" ? "Pendiente" : r.state}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {activeTab === "invoices" && (
          <div className="space-y-4">
            {/* Invoice Filters */}
            <div className="rounded-md border border-gray-200 bg-white p-4">
              <div className="space-y-4">
                <div className="relative">
                  <input
                    placeholder="Buscar por descripción o referencia..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="p-4 h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    className="px-2 py-1 border border-gray-200 rounded-md"
                    onClick={() => setSelectedType("all")}
                  >
                    Todos
                  </button>
                  <button
                    className="px-2 py-1 border border-gray-200 rounded-md"
                    onClick={() => setSelectedType("sale")}
                  >
                    Ventas
                  </button>
                  <button
                    className="px-2 py-1 border border-gray-200 rounded-md"
                    onClick={() => setSelectedType("purchase")}
                  >
                    Compras
                  </button>
                </div>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="rounded-md border border-gray-200 overflow-hidden bg-white">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">Facturas del Proyecto</h3>
                  <p className="text-sm text-gray-500 mt-1">{filteredRecords.length} documentos encontrados</p>
                </div>
                <CustomButton onClick={() => setIsInvoiceDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Factura
                </CustomButton>
              </div>
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                        {searchTerm || selectedType !== "all"
                          ? "No se encontraron documentos con los filtros aplicados"
                          : "No hay facturas para este proyecto"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecords.map((r) => (
                      <TableRow key={r.id} className="hover:bg-gray-50/50">
                        <TableCell className="font-medium text-gray-900">{r.reference || `#${r.id}`}</TableCell>
                        <TableCell>
                          <Badge variant={r.isSell ? "default" : "secondary"}>
                            {r.isSell ? "Venta" : "Compra"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">{r.description || "N/A"}</TableCell>
                        <TableCell className="text-gray-600">{formatDate(r.date)}</TableCell>
                        <TableCell className="text-gray-600">{r.dueDate ? formatDate(r.dueDate) : "N/A"}</TableCell>
                        <TableCell className={`text-right font-medium ${r.isSell ? "text-green-600" : "text-red-600"}`}>
                          {r.isSell ? "+" : "-"}{formatCurrency(r.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.state === "PAID" ? "default" : r.state === "OVERDUE" ? "destructive" : "secondary"} className={r.state === "PAID" ? "bg-green-600 hover:bg-green-700" : ""}>
                            {r.state === "PAID" ? "Pagada" : r.state === "PENDING" ? "Pendiente" : r.state === "OVERDUE" ? "Vencida" : r.state}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <button className="h-8 w-8 p-0">
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <CreateInvoiceDialog
          isOpen={isInvoiceDialogOpen}
          onClose={() => setIsInvoiceDialogOpen(false)}
        />
      </CustomCard>
    </div>
  );
}
