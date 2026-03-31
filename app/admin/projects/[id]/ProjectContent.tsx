"use client";

import { useRouter } from "next/navigation";
import {
  CalendarDays,
  MapPin,
  DollarSign,
  TrendingUp,
  FileText,
  Calculator,
  CreditCard,
  Banknote,
  Users,
  Briefcase,
  TrendingDown,
  Loader2,
  Pencil,
  HardHat,
  Receipt,
} from "lucide-react";
import { BudgetModule } from "@/src/components/project/BudgetModule";
import { FinancesModule } from "@/src/components/project/FinancesModule";
import { useState, useRef, useEffect } from "react";
import { PurchaseDropdown } from "@/src/components/project/PurchaseDropdown";
import { SaleDropdown } from "@/src/components/project/SaleDropdown";
import { CreateInvoiceDialog } from "@/src/components/dashboard/CreateInvoice";
import { CustomSelect } from "@/src/components/project/CustomSelect";
import {
  CustomBadge,
  CustomButton,
  CustomCard,
} from "@/src/components/project/CustomCard";
import {
  GestionoDivision,
  GestionoDivisionWithBalance,
} from "@/src/types/gestiono";
import { MaterialsModule } from "@/src/components/project/MaterialsModule";
import { PersonnelModule } from "@/src/components/project/PersonnelModule";
import { LocalesSection } from "@/src/components/projects/LocalesSection";
import { ClientesSection } from "@/src/components/projects/ClientesSection";
import { EditProjectModal } from "@/src/components/project/EditProjectModal";
import { CuentasPorCobrarModule } from "@/src/components/project/CuentasPorCobrarModule";
import { CuentasPorPagarModule } from "@/src/components/project/CuentasPorPagarModule";

const sections = [
  {
    value: "presupuesto-general",
    label: "Presupuesto General",
    icon: Calculator,
  },
  // { value: "costos-indirectos", label: "Costos Indirectos", icon: TrendingDown, },
  { value: "facturacion", label: "Facturación", icon: FileText },
  { value: "cuentas-cobrar", label: "Cuenta por Cobrar", icon: Receipt },
  { value: "cuentas-pagar", label: "Cuenta por Pagar", icon: Banknote },
  // { value: "ingresos-pagos", label: "Ingresos/Pagos", icon: Banknote, },
  { value: "gastos", label: "Gastos", icon: CreditCard },
  // { value: "materiales", label: "Materiales", icon: ShoppingCart, },
  // { value: "contrataciones", label: "Contrataciones", icon: Briefcase, },
  { value: "mano-obra", label: "Mano de Obra", icon: HardHat },
  { value: "clientes", label: "Clientes", icon: Users },
  { value: "locales", label: "Locales", icon: Briefcase },
];

interface ProjectContentProps {
  initialDivision: GestionoDivisionWithBalance;
  projectId: string;
}

export function ProjectContent({
  initialDivision,
  projectId,
}: ProjectContentProps) {
  const router = useRouter();
  const [division, setDivision] = useState<GestionoDivisionWithBalance | null>(
    initialDivision,
  );
  const [selectedSection, setSelectedSection] = useState("presupuesto-general");
  const selectRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [financeRefreshKey, setFinanceRefreshKey] = useState(0);

  // Expenses State
  const [expensesTotal, setExpensesTotal] = useState<number>(0);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState<boolean>(false);

  useEffect(() => {
    const fetchExpenses = async () => {
      if (selectedSection === "gastos" && division?.id) {
        setIsLoadingExpenses(true);
        try {
          const params = new URLSearchParams({
            divisionId: String(division.id),
            isSell: "false",
            type: "INVOICE",
            state: "PAID",
          });

          const res = await fetch(
            `/api/gestiono/pendingRecord?${params.toString()}`,
          );
          if (res.ok) {
            const data = await res.json();
            if (data.resume) {
              const total =
                (data.resume.toPay || 0) + (data.resume.totalPaid || 0);
              setExpensesTotal(total);
            }
          }
        } catch (error) {
          console.error("Error fetching expenses:", error);
        } finally {
          setIsLoadingExpenses(false);
        }
      }
    };
    fetchExpenses();
  }, [selectedSection, division?.id]);

  // Estado unificado para manejar todos los documentos
  const [documentDialogState, setDocumentDialogState] = useState<{
    isOpen: boolean;
    documentType: "quote" | "order" | "invoice";
    transactionType: "sale" | "purchase";
  }>({
    isOpen: false,
    documentType: "quote",
    transactionType: "sale",
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planning":
        return "bg-yellow-500 text-white hover:bg-yellow-600";
      case "execution":
        return "bg-green-500 text-white hover:bg-green-600";
      case "completed":
        return "bg-blue-500 text-white hover:bg-blue-600";
      default:
        return "bg-gray-500 text-white hover:bg-gray-600";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "planning":
        return "Planificación";
      case "execution":
        return "Ejecución";
      case "completed":
        return "Completado";
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const project = division
    ? {
        id: division.id,
        name: division.name,
        client: (division.metadata?.client as string) || "Cliente Desconocido",
        location:
          (division.metadata?.location as string) || "Ubicación desconocida",
        status: (division.metadata?.status as string) || "planning",
        totalBudget: (division.metadata?.budget as number) || 0,
        executedBudget: division.monthlyExpenses || 0,
        completionPercentage:
          (division.metadata?.completionPercentage as number) || 0,
        profitMargin: (division.metadata?.profitMargin as number) || 0,
        startDate:
          (division.metadata?.startDate as string) || new Date().toISOString(),
        endDate:
          (division.metadata?.endDate as string) || new Date().toISOString(),
        budgetCategories:
          (division.metadata?.budgetCategories as unknown as Array<{
            id: string;
            name: string;
            amount: number;
            percentage: number;
          }>) || [],
        uniqueId: (division.metadata?.unique_id as string) || "",
      }
    : null;

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold text-gray-800">
          Proyecto no encontrado
        </h1>
        <CustomButton onClick={() => router.back()}>Volver</CustomButton>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white w-full">
      <main className="flex-1 p-2 lg:p-6 space-y-6 animate-fade-in w-full">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-gray-900 truncate">
                {project?.name}
              </h1>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
                title="Editar proyecto"
              >
                <Pencil className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-500 mt-1 text-sm sm:text-base">
              Cliente: {project?.client}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">{project?.location}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <CustomBadge
              className={getStatusColor(project?.status || "planning")}
            >
              {getStatusText(project?.status || "planning")}
            </CustomBadge>
            <PurchaseDropdown
              onQuotationClick={() =>
                setDocumentDialogState({
                  isOpen: true,
                  documentType: "quote",
                  transactionType: "purchase",
                })
              }
              onPurchaseOrderClick={() =>
                setDocumentDialogState({
                  isOpen: true,
                  documentType: "order",
                  transactionType: "purchase",
                })
              }
              onInvoiceClick={() =>
                setDocumentDialogState({
                  isOpen: true,
                  documentType: "invoice",
                  transactionType: "purchase",
                })
              }
            />
            <SaleDropdown
              onQuotationClick={() =>
                setDocumentDialogState({
                  isOpen: true,
                  documentType: "quote",
                  transactionType: "sale",
                })
              }
              onInvoiceClick={() =>
                setDocumentDialogState({
                  isOpen: true,
                  documentType: "invoice",
                  transactionType: "sale",
                })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <CustomCard className="p-3 md:p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
              <div className="p-2 md:p-3 bg-green-50 rounded-full w-fit">
                <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm font-medium text-gray-500">
                  Presupuesto Total
                </p>
                <p className="text-lg md:text-2xl font-bold text-gray-900 truncate">
                  {formatCurrency(project?.totalBudget || 0)}
                </p>
              </div>
            </div>
          </CustomCard>

          <CustomCard className="p-3 md:p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
              <div className="p-2 md:p-3 bg-blue-50 rounded-full w-fit">
                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm font-medium text-gray-500">
                  Ejecutado
                </p>
                <p className="text-lg md:text-2xl font-bold text-gray-900 truncate">
                  {formatCurrency(project?.executedBudget || 0)}
                </p>
              </div>
            </div>
          </CustomCard>

          <CustomCard className="p-3 md:p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
              <div className="p-2 md:p-3 bg-purple-50 rounded-full w-fit">
                <CalendarDays className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm font-medium text-gray-500">
                  Progreso
                </p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">
                  {project?.completionPercentage || 0}%
                </p>
              </div>
            </div>
          </CustomCard>

          <CustomCard className="p-3 md:p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
              <div className="p-2 md:p-3 bg-orange-50 rounded-full w-fit">
                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm font-medium text-gray-500">
                  Margen
                </p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">
                  {project?.profitMargin || 0}%
                </p>
              </div>
            </div>
          </CustomCard>
        </div>

        <CustomCard className="p-4 md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold text-gray-900">
              Secciones del Proyecto
            </h3>
            <CustomSelect
              value={selectedSection}
              onChange={setSelectedSection}
              options={sections}
              ref={selectRef as React.RefObject<HTMLDivElement>}
              isOpen={isOpen}
              setIsOpen={setIsOpen}
            />
          </div>
        </CustomCard>

        {/* Dynamic Content */}
        <div className="space-y-6">
          {selectedSection === "presupuesto-general" && (
            <BudgetModule
              projectId={project?.id ?? 0}
              divisionId={division?.id ?? 0}
              categories={project?.budgetCategories}
              totalBudget={project?.totalBudget}
              divisionData={division as GestionoDivision}
              onUpdate={() => {
                // Refresh division data after updating budget categories
                const fetchDivision = async () => {
                  if (!projectId) return;
                  try {
                    const res = await fetch(
                      `/api/gestiono/divisions/${projectId}`,
                    );
                    if (res.ok) {
                      const data = await res.json();
                      const divData = Array.isArray(data) ? data[0] : data;
                      setDivision(divData);
                    }
                  } catch (error) {
                    console.error("Error refreshing division:", error);
                  }
                };
                fetchDivision();
              }}
            />
          )}

          {selectedSection === "costos-indirectos" && (
            <CustomCard className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">
                  Costos Indirectos
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-sm text-gray-500">
                    Gastos Administrativos
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency((project?.totalBudget || 0) * 0.05)}
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-sm text-gray-500">Seguros y Permisos</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency((project?.totalBudget || 0) * 0.03)}
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-sm text-gray-500">Imprevistos</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency((project?.totalBudget || 0) * 0.02)}
                  </p>
                </div>
              </div>
            </CustomCard>
          )}

          {selectedSection === "facturacion" && (
            <FinancesModule
              projectId={project?.id ?? 0}
              budgetCategories={project?.budgetCategories}
              refreshTrigger={financeRefreshKey}
              onConvertSaleToInvoice={async (title, amount) => {
                const currentBudget =
                  (division?.metadata?.budget as number) || 0;
                const currentCategories =
                  (division?.metadata?.budgetCategories as unknown as Array<{
                    id: string;
                    name: string;
                    amount: number;
                    percentage: number;
                  }>) || [];
                const newCategory = {
                  id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
                  name: title,
                  amount,
                  percentage: 0,
                };
                try {
                  const patchRes = await fetch("/api/gestiono/divisions", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      id: division?.id,
                      metadata: {
                        ...division?.metadata,
                        budget: currentBudget + amount,
                        budgetCategories: [...currentCategories, newCategory],
                      },
                    }),
                  });
                  if (!patchRes.ok) {
                    throw new Error(
                      `Error al actualizar presupuesto (${patchRes.status})`,
                    );
                  }
                  const res = await fetch(
                    `/api/gestiono/divisions/${projectId}`,
                  );
                  if (res.ok) {
                    const d = await res.json();
                    setDivision(Array.isArray(d) ? d[0] : d);
                  }
                } catch (error) {
                  console.error(
                    "Error updating budget on invoice conversion:",
                    error,
                  );
                }
              }}
            />
          )}

          {selectedSection === "cuentas-cobrar" && (
            <CuentasPorCobrarModule
              projectId={project?.id ?? 0}
              projectName={project?.name ?? ""}
            />
          )}

          {selectedSection === "cuentas-pagar" && (
            <CuentasPorPagarModule
              projectId={project?.id ?? 0}
              projectName={project?.name ?? ""}
            />
          )}

          {selectedSection === "ingresos-pagos" && (
            <CustomCard className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">
                  Ingresos y Pagos
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3 text-green-600">Ingresos</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between p-2 bg-green-50 rounded">
                      <span className="text-gray-600">Pago inicial</span>
                      <span className="font-bold text-green-700">
                        +{formatCurrency((project?.totalBudget || 0) * 0.3)}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-green-50 rounded">
                      <span className="text-gray-600">Avance 50%</span>
                      <span className="font-bold text-green-700">
                        +{formatCurrency((project?.totalBudget || 0) * 0.4)}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3 text-red-600">Egresos</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between p-2 bg-red-50 rounded">
                      <span className="text-gray-600">Materiales</span>
                      <span className="font-bold text-red-700">
                        -{formatCurrency((project?.executedBudget || 0) * 0.6)}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-red-50 rounded">
                      <span className="text-gray-600">Mano de obra</span>
                      <span className="font-bold text-red-700">
                        -{formatCurrency((project?.executedBudget || 0) * 0.3)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CustomCard>
          )}
          {selectedSection === "gastos" && (
            <CustomCard className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Gastos</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                  <span className="text-gray-700">Total de Gastos</span>
                  <span className="font-bold text-red-600">
                    {isLoadingExpenses ? (
                      <Loader2 className="w-4 h-4 animate-spin inline" />
                    ) : (
                      formatCurrency(expensesTotal)
                    )}
                  </span>
                </div>
                {expensesTotal > 0 ? (
                  <div className="text-sm text-gray-500 text-center py-4">
                    Desglose no disponible
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 text-center py-4">
                    No hay gastos registrados
                  </div>
                )}
              </div>
            </CustomCard>
          )}
          {selectedSection === "materiales" && (
            <MaterialsModule projectId={projectId} />
          )}
          {selectedSection === "contrataciones" && (
            <CustomCard className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Contrataciones</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 border rounded-lg bg-white">
                  <div>
                    <p className="font-medium text-gray-900">
                      Constructora ABC
                    </p>
                    <p className="text-sm text-gray-500">
                      Estructura principal
                    </p>
                  </div>
                  <CustomBadge className="bg-green-100 text-green-700">
                    Activo
                  </CustomBadge>
                </div>
                <div className="flex justify-between items-center p-4 border rounded-lg bg-white">
                  <div>
                    <p className="font-medium text-gray-900">
                      Instalaciones XYZ
                    </p>
                    <p className="text-sm text-gray-500">
                      Electricidad y plomería
                    </p>
                  </div>
                  <CustomBadge className="bg-yellow-100 text-yellow-700">
                    Pendiente
                  </CustomBadge>
                </div>
              </div>
            </CustomCard>
          )}

          {selectedSection === "mano-obra" && (
            <PersonnelModule projectId={project?.id ?? ""} />
          )}

          {selectedSection === "locales" && (
            <LocalesSection
              projectName={division?.name || ""}
              projectId={projectId}
              projectEndDate={project.endDate}
              uniqueId={project.uniqueId}
            />
          )}

          {selectedSection === "clientes" && (
            <ClientesSection uniqueId={project.uniqueId} />
          )}
          {/* Diálogo unificado para crear documentos */}
          <CreateInvoiceDialog
            isOpen={documentDialogState.isOpen}
            onClose={() =>
              setDocumentDialogState((prev) => ({ ...prev, isOpen: false }))
            }
            documentType={documentDialogState.documentType}
            transactionType={documentDialogState.transactionType}
            projectId={projectId}
            budgetCategories={project?.budgetCategories}
            onCreateInvoice={async () => {
              // Budget categories are only added when a SALE quote is converted
              // to an invoice via ConvertModal → onConvertSaleToInvoice.
              // Direct document creation (purchase or sale) does not modify categories.
              setFinanceRefreshKey((prev) => prev + 1);
            }}
          />

          {/* Modal para editar proyecto */}
          <EditProjectModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            divisionId={division?.id ?? 0}
            metadata={division?.metadata}
            currentData={{
              name: project?.name || "",
              client: project?.client || "",
              location: project?.location || "",
              status: project?.status || "planning",
              projectType:
                (division?.metadata?.projectType as string) || "Residencial",
              permissionCategory:
                (division?.metadata?.permissionCategory as string) || "Mayor",
              totalBudget: project?.totalBudget || 0,
              startDate: project?.startDate || "",
              endDate: project?.endDate || "",
              description: (division?.metadata?.description as string) || "",
            }}
            onSave={() => {
              const fetchDivision = async () => {
                if (!projectId) return;
                try {
                  const res = await fetch(
                    `/api/gestiono/divisions/${projectId}`,
                  );
                  if (res.ok) {
                    const data = await res.json();
                    const divData = Array.isArray(data) ? data[0] : data;
                    setDivision(divData);
                  }
                } catch (error) {
                  console.error("Error refreshing division:", error);
                }
              };
              fetchDivision();
            }}
            onDelete={() => router.push("/admin")}
          />
        </div>
      </main>
    </div>
  );
}
