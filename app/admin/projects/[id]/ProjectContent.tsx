"use client";

import { useRouter } from "next/navigation";
import {
  MapPin,
  FileText,
  Calculator,
  CreditCard,
  Banknote,
  Users,
  Briefcase,
  Loader2,
  Pencil,
  HardHat,
  Receipt,
} from "lucide-react";
import { BudgetModule } from "@/src/components/project/BudgetModule";
import { FinancesModule } from "@/src/components/project/FinancesModule";
import { useState, useEffect, useMemo } from "react";
import { PurchaseDropdown } from "@/src/components/project/PurchaseDropdown";
import { SaleDropdown } from "@/src/components/project/SaleDropdown";
import { CreateInvoiceDialog } from "@/src/components/dashboard/CreateInvoice";
import { PageHeader, PageBody } from "@/src/components/ui/page-header";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { TabsBar } from "@/src/components/ui/tabs-bar";
import { EmptyState } from "@/src/components/ui/empty-state";
import { KPICard } from "@/src/components/dashboard/KPICard";
import { money, percent } from "@/src/lib/format";
import { Division, DivisionWithBalance, InvoiceItem } from "@/src/types/erp";
import { PersonnelModule } from "@/src/components/project/PersonnelModule";
import { LocalesSection } from "@/src/components/projects/LocalesSection";
import { ClientesSection } from "@/src/components/projects/ClientesSection";
import { EditProjectModal } from "@/src/components/project/EditProjectModal";
import { useErp } from "@/src/context/ErpContext";
import { CuentasPorCobrarModule } from "@/src/components/project/CuentasPorCobrarModule";
import { CuentasPorPagarModule } from "@/src/components/project/CuentasPorPagarModule";

/* Las secciones eran un desplegable dentro de una tarjeta titulada «Secciones
 * del Proyecto»: dos clics y un contenedor entero para lo que en el resto de la
 * aplicación es una barra de pestañas. Se pasa a `TabsBar`, la misma que usan
 * Facturas, Items y Configuración.
 *
 * Se han eliminado además tres secciones muertas que estaban comentadas aquí
 * pero cuyo contenido seguía en el archivo: «Ingresos/Pagos» repartía el
 * presupuesto en 30 % / 40 % inventados, «Contrataciones» listaba «Constructora
 * ABC» e «Instalaciones XYZ», y «Materiales» y «Costos Indirectos» nunca se
 * llegaron a construir. */
const SECTIONS = [
  { id: "presupuesto-general", label: "Presupuesto", icon: Calculator },
  { id: "facturacion", label: "Facturación", icon: FileText },
  { id: "cuentas-cobrar", label: "Por cobrar", icon: Receipt },
  { id: "cuentas-pagar", label: "Por pagar", icon: Banknote },
  { id: "gastos", label: "Gastos", icon: CreditCard },
  { id: "mano-obra", label: "Mano de obra", icon: HardHat },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "locales", label: "Locales", icon: Briefcase },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

interface ProjectContentProps {
  initialDivision: DivisionWithBalance;
  projectId: string;
}

export function ProjectContent({
  initialDivision,
  projectId,
}: ProjectContentProps) {
  const router = useRouter();
  const { refreshDivisions } = useErp();
  const [division, setDivision] = useState<DivisionWithBalance | null>(
    initialDivision,
  );
  const [selectedSection, setSelectedSection] = useState<SectionId>(
    "presupuesto-general",
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [financeRefreshKey, setFinanceRefreshKey] = useState(0);

  // Expenses State
  const [expensesTotal, setExpensesTotal] = useState<number>(0);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState<boolean>(false);

  // Sales invoices for BudgetModule progress
  const [salesInvoices, setSalesInvoices] = useState<InvoiceItem[]>([]);

  const totalExecuted = useMemo(
    () => salesInvoices.reduce((sum, inv) => sum + (inv.paid || 0), 0),
    [salesInvoices],
  );

  useEffect(() => {
    const fetchExpenses = async () => {
      if (selectedSection === "gastos" && division?.id) {
        setIsLoadingExpenses(true);
        try {
          /* Filtraba por `state: "PAID"`, un estado que no existe (los
           * reales son PENDING · PAST_DUE · COMPLETED · ARCHIVED), así que el
           * total de gastos de todos los proyectos salía en cero. Sin filtro
           * de estado, `toPay + totalPaid` es el gasto total en compras. */
          const params = new URLSearchParams({
            divisionId: String(division.id),
            isSell: "false",
            type: "INVOICE",
          });

          const res = await fetch(
            `/api/erp/pendingRecord?${params.toString()}`,
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

  // Fetch sales invoices for BudgetModule progress bars
  useEffect(() => {
    if (!division?.id) return;
    const fetchSalesInvoices = async () => {
      try {
        const params = new URLSearchParams({
          divisionId: String(division.id),
          isSell: "true",
          type: "INVOICE",
          ignoreDetailedData: "false",
          elements: "100",
          page: "1",
        });
        const res = await fetch(`/api/erp/pendingRecord?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setSalesInvoices(data.items || []);
        }
      } catch (error) {
        console.error("Error fetching sales invoices for budget:", error);
      }
    };
    fetchSalesInvoices();
  }, [division?.id, financeRefreshKey]);

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

  const statusVariant = (
    status: string,
  ): "info" | "success" | "default" | "warning" => {
    switch (status) {
      case "planning":
        return "info";
      case "execution":
        return "success";
      case "completed":
        return "default";
      default:
        return "warning";
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
      <PageBody>
        <EmptyState
          title="Proyecto no encontrado"
          description="El proyecto ya no existe o fue archivado."
          action={
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              Volver
            </Button>
          }
        />
      </PageBody>
    );
  }

  const avance =
    project.totalBudget > 0
      ? Math.min(100, (totalExecuted / project.totalBudget) * 100)
      : null;

  return (
    <>
      <PageHeader
        eyebrow={project.client}
        title={project.name}
        description={
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
            {project.location}
          </span>
        }
        actions={
          <>
            <Badge variant={statusVariant(project.status)} dot>
              {getStatusText(project.status)}
            </Badge>
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => setIsEditModalOpen(true)}
              title="Editar proyecto"
              aria-label="Editar proyecto"
            >
              <Pencil className="h-4 w-4" strokeWidth={1.75} />
            </Button>
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
          </>
        }
      />

      <PageBody className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard
            kpi={{
              title: "Presupuesto",
              value: project.totalBudget > 0 ? money(project.totalBudget) : "—",
              icon: "Wallet",
              hint:
                project.totalBudget > 0
                  ? `${project.budgetCategories.length} partidas`
                  : "Sin presupuesto registrado",
            }}
          />
          <KPICard
            kpi={{
              title: "Cobrado al cliente",
              value: money(totalExecuted),
              icon: "TrendingUp",
              hint: `${salesInvoices.length} facturas de venta`,
            }}
          />
          <KPICard
            kpi={{
              title: "Avance",
              value: avance === null ? "—" : percent(avance, 0),
              icon: "BarChart",
              hint:
                avance === null
                  ? "Necesita un presupuesto para calcularse"
                  : "Cobrado sobre el presupuesto",
            }}
          />
          <KPICard
            kpi={{
              title: "Pendiente de cobro",
              value: money(Math.max(project.totalBudget - totalExecuted, 0)),
              icon: "Receipt",
              hint: "Presupuesto que todavía no se ha cobrado",
            }}
          />
        </div>

        <TabsBar
          tabs={SECTIONS}
          value={selectedSection}
          onChange={setSelectedSection}
          aria-label="Secciones del proyecto"
        />

        <div className="space-y-5">
          {selectedSection === "presupuesto-general" && (
            <BudgetModule
              projectId={project?.id ?? 0}
              divisionId={division?.id ?? 0}
              categories={project?.budgetCategories}
              totalBudget={project?.totalBudget}
              divisionData={division as Division}
              salesInvoices={salesInvoices}
              onUpdate={() => {
                // Refresh division data after updating budget categories
                const fetchDivision = async () => {
                  if (!projectId) return;
                  try {
                    const res = await fetch(`/api/erp/divisions/${projectId}`);
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
                  const patchRes = await fetch("/api/erp/divisions", {
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
                  const res = await fetch(`/api/erp/divisions/${projectId}`);
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

          {selectedSection === "gastos" && (
            <section className="rounded-[12px] border border-rule bg-paper">
              <header className="border-b border-rule px-5 py-4">
                <h2 className="font-display text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">
                  Gastos del proyecto
                </h2>
                <p className="mt-0.5 text-[0.8125rem] text-ink-2">
                  Suma de las facturas de compra imputadas a este proyecto.
                </p>
              </header>
              <div className="flex items-baseline justify-between gap-4 px-5 py-5">
                <span className="text-[0.8125rem] text-ink-2">
                  Total en compras
                </span>
                <span className="tabular font-display text-[1.5rem] font-semibold leading-none text-ink">
                  {isLoadingExpenses ? (
                    <Loader2
                      className="h-5 w-5 animate-spin text-ink-3"
                      aria-label="Calculando"
                    />
                  ) : (
                    money(expensesTotal)
                  )}
                </span>
              </div>
              <p className="border-t border-rule px-5 py-3 text-[0.75rem] text-ink-3">
                {expensesTotal > 0
                  ? "El desglose por partida está en la pestaña Por pagar."
                  : "Todavía no hay facturas de compra en este proyecto."}
              </p>
            </section>
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
                  const res = await fetch(`/api/erp/divisions/${projectId}`);
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
            onDelete={async () => {
              // El contexto carga las divisiones una sola vez al montar: sin
              // esto el proyecto eliminado seguía en el side-rail y en el
              // dashboard hasta recargar la página a mano.
              await refreshDivisions();
              router.push("/admin");
            }}
          />
        </div>
      </PageBody>
    </>
  );
}
