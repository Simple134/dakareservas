"use client";

import { useState } from "react";
import { useProjects, Project } from "@/src/hooks/useProjects";
import { useAuth } from "@/src/hooks/useAuth";
import { KPICard, KPI } from "@/src/components/dashboard/KPICard";
import { ProjectCard } from "@/src/components/dashboard/ProjectCard";
import { ProjectChart } from "@/src/components/dashboard/ProjectChart";
import { BenefitsCard } from "@/src/components/dashboard/BenefitsCard";
import { CreateInvoiceDialog } from "@/src/components/dashboard/CreateInvoice";
import { Button } from "@/src/components/ui/button";
import { Plus, Receipt, LogOut, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useGestiono } from "@/src/context/Gestiono";
import { PendingRecord } from "@/src/types/gestiono";

export function DashboardView() {
  const { isLoading } = useProjects();
  const { signOut } = useAuth();
  const { divisions, pendingRecords } = useGestiono();
  const router = useRouter();
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);

  const activeProjectsList: Project[] = divisions
    .filter((div) => {
      if ((div.type as string) === "ROOT" || div.subDivisionOf !== 183 || !div.metadata) return false;
      let meta: any = div.metadata;
      if (typeof meta === 'string') {
        try { meta = JSON.parse(meta); } catch { return false; }
      }
      return meta && meta.budget !== undefined && meta.status !== undefined;
    })
    .map((div) => {
      let meta: any = div.metadata || {};
      if (typeof meta === 'string') {
        try { meta = JSON.parse(meta); } catch { meta = {}; }
      }
      let status: Project["status"] = "planning";
      const metaStatus = String(meta.status || "").toLowerCase();
      if (metaStatus.includes("ejecuci") || metaStatus === "execution") status = "execution";
      if (metaStatus.includes("complete") || metaStatus === "completed") status = "completed";
      return {
        id: div.id,
        name: div.name,
        client: meta.client || "Cliente General",
        startDate: meta.startDate || new Date().toISOString(),
        endDate: meta.endDate || new Date().toISOString(),
        totalBudget: Number(meta.budget) || 0,
        executedBudget: 0,
        status,
        location: meta.location || "Sin ubicación",
        profitMargin: 20,
        completionPercentage: 0,
        project_type: meta.projectType || "General",
        permitting_category: meta.permissionCategory || "General",
        ownerProfileId: undefined
      };
    });

  const resume = pendingRecords?.resume

  const totalCharged = resume?.totalCharged || 0;
  const toCharge = resume?.toCharge || 0;
  const totalRevenue = totalCharged + toCharge;

  const items: PendingRecord[] = pendingRecords?.items || [];

  let totalGrossProfit = 0;
  let totalItemsAmount = 0;

  const calculateTrend = (values: number[]): number => {
    if (values.length < 2) return 0;
    const mid = Math.ceil(values.length / 2);
    const recent = values.slice(0, mid).reduce((a, b) => a + b, 0);
    const previous = values.slice(mid).reduce((a, b) => a + b, 0);

    if (previous === 0) return recent > 0 ? 100 : 0;
    return ((recent - previous) / previous) * 100;
  };

  const revenueValues: number[] = [];
  const marginValues: number[] = [];
  const paymentValues: number[] = [];

  items.forEach((item: PendingRecord) => {
    totalGrossProfit += item.grossProfit || 0;
    totalItemsAmount += item.amount || 0;

    revenueValues.push(item.amount);

    const itemMargin = item.amount > 0 ? ((item.grossProfit) / item.amount) * 100 : 0;
    marginValues.push(itemMargin);

    paymentValues.push(item.paid);
  });

  const calculatedMargin = totalItemsAmount > 0 ? (totalGrossProfit / totalItemsAmount) * 100 : 20;
  const averageMargin = calculatedMargin;

  const netProfit = totalRevenue * (averageMargin / 100);
  const cashFlow = resume?.totalPaid || 0;

  const revenueTrend = calculateTrend(revenueValues);
  const marginTrend = calculateTrend(marginValues);
  const cashFlowTrend = calculateTrend(paymentValues);

  const kpis: KPI[] = [
    {
      title: "Proyectos Activos",
      value: activeProjectsList.length,
      change: 0,
      changeType: "neutral",
      icon: "Building2",
      color: "primary",
    },
    {
      title: "Ingresos Totales",
      value: `USD $${(totalRevenue).toLocaleString('en-US')}`,
      change: Number(revenueTrend.toFixed(1)),
      changeType: revenueTrend >= 0 ? "positive" : "negative",
      icon: "TrendingUp",
      color: "success",
    },
    {
      title: "Margen Promedio",
      value: `${averageMargin.toFixed(1)}%`,
      change: Number(marginTrend.toFixed(1)),
      changeType: marginTrend >= 0 ? "positive" : "negative",
      icon: "Percent",
      color: "warning",
    },
    {
      title: "Flujo de Caja",
      value: `USD $${(cashFlow).toLocaleString('en-US')}`,
      change: Number(cashFlowTrend.toFixed(1)),
      changeType: cashFlowTrend >= 0 ? "positive" : "negative",
      icon: "Wallet",
      color: "info",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="lg:text-4xl text-2xl font-bold text-foreground tracking-tight">
            Dashboard Ejecutivo
          </h1>
          <p className="text-muted-foreground mt-2 text-base">
            Bienvenido al Sistema ERP DAKA - Gestión Integral de Proyectos de
            Construcción
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <button
            style={{ borderRadius: "8px" }}
            className="bg-white flex items-center gap-2 border shadow-sm rounded-md p-2"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span className="text-sm lg:text-base">Cerrar Sesión</span>
          </button>
          <button
            style={{ borderRadius: "8px" }}
            className="bg-white flex items-center gap-2 border shadow-sm rounded-md p-2"
            onClick={() => setIsInvoiceDialogOpen(true)}
          >
            <Receipt className="w-4 h-4 mr-2" />
            <span className="text-sm lg:text-base">Nueva Factura</span>
          </button>
          <button
            className="bg-gradient-to-r from-[#224397] to-blue-500 text-white font-bold flex items-center gap-2 rounded-md p-2"
            onClick={() => router.push("/admin/projects/create")}
            style={{ borderRadius: "8px" }}
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="text-sm lg:text-base">Nuevo Proyecto</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => (
          <KPICard key={index} kpi={kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <BenefitsCard
          title="Análisis de Beneficios"
          totalProjects={activeProjectsList.length}
          totalRevenue={totalRevenue}
          totalCosts={totalRevenue - netProfit} // Costs derived from profit
          netProfit={netProfit}
          profitMargin={averageMargin}
          targetMargin={25} // Objetivo default
          monthlyGrowth={8.5} // Mock
          projectedAnnualProfit={netProfit * 12}
        />
      </div>
      <ProjectChart />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">
            Proyectos Activos
          </h2>
          <p className="text-sm text-muted-foreground font-medium">
            {activeProjectsList.length} proyectos en curso
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeProjectsList.length > 0 ? (
            activeProjectsList.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onSelect={(p) => router.push(`/admin/projects/${p.id}`)}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground mb-4">
                No hay proyectos creados aún
              </p>
              <Button onClick={() => router.push("/admin/projects/create")}>
                <Plus className="w-4 h-4 mr-2" />
                Crear Primer Proyecto
              </Button>
            </div>
          )}
        </div>
      </div>

      <CreateInvoiceDialog
        isOpen={isInvoiceDialogOpen}
        onClose={() => setIsInvoiceDialogOpen(false)}
        onCreateInvoice={(invoice) => {
          console.log("Invoice created:", invoice);
          setIsInvoiceDialogOpen(false);
        }}
      />
    </div>
  );
}
