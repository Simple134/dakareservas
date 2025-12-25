"use client"

import { useState } from "react";
import { useProjects } from "@/src/hooks/useProjects"; // Using the hook we created
import { useAuth } from "@/src/hooks/useAuth";
import { KPICard, KPI } from "@/src/components/dashboard/KPICard";
import { ProjectCard } from "@/src/components/dashboard/ProjectCard";
import { ProjectChart } from "@/src/components/dashboard/ProjectChart";
import { BenefitsCard } from "@/src/components/dashboard/BenefitsCard";
import { CreateInvoiceDialog } from "@/src/components/dashboard/CreateInvoice";
import { Button } from "@/src/components/ui/button";
import { Plus, Receipt, LogOut, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function DashboardView() {
    const { projects, isLoading } = useProjects();
    const { signOut } = useAuth(); // Assuming useAuth exposes signOut
    const router = useRouter();
    const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);

    // KPI Calculations
    const activeProjects = projects.filter(p => p.status !== 'completed');
    const totalRevenue = projects.reduce((sum, project) => sum + Number(project.totalBudget), 0);
    const totalCosts = projects.reduce((sum, project) => sum + Number(project.executedBudget), 0);
    const netProfit = totalRevenue - totalCosts;

    const averageMargin = projects.length > 0
        ? projects.reduce((sum, project) => sum + (Number(project.profitMargin) || 0), 0) / projects.length
        : 0;

    // Mock data for variation
    const kpis: KPI[] = [
        {
            title: 'Proyectos Activos',
            value: activeProjects.length,
            change: 1,
            changeType: 'positive',
            icon: 'Building2',
            color: 'primary'
        },
        {
            title: 'Ingresos Totales',
            value: `RD$ ${(totalRevenue / 1000000).toFixed(1)}M`,
            change: 15.2,
            changeType: 'positive',
            icon: 'TrendingUp',
            color: 'success'
        },
        {
            title: 'Margen Promedio',
            value: `${averageMargin.toFixed(1)}%`,
            change: -2.1,
            changeType: 'negative',
            icon: 'Percent',
            color: 'warning'
        },
        {
            title: 'Flujo de Caja',
            value: `RD$ ${(netProfit / 1000).toFixed(0)}K`,
            change: 8.5,
            changeType: 'positive',
            icon: 'Wallet',
            color: 'info'
        }
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
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-foreground tracking-tight">Dashboard Ejecutivo</h1>
                    <p className="text-muted-foreground mt-2 text-base">
                        Bienvenido al Sistema ERP DAKA - Gestión Integral de Proyectos de Construcción
                    </p>
                </div>
                <div className="flex gap-3 items-center">
                    <button
                        style={{ borderRadius: '8px' }}
                        className="bg-white flex items-center gap-2 border shadow-sm rounded-md p-2"
                        onClick={signOut}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Cerrar Sesión
                    </button>
                    <button
                        style={{ borderRadius: '8px' }}
                        className="bg-white flex items-center gap-2 border shadow-sm rounded-md p-2"
                        onClick={() => setIsInvoiceDialogOpen(true)}
                    >
                        <Receipt className="w-4 h-4 mr-2" />
                        Nueva Factura
                    </button>
                    <button className="bg-gradient-to-r from-[#224397] to-blue-500 text-white font-bold flex items-center gap-2 rounded-md p-2" onClick={() => {}} style={{ borderRadius: '8px' }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Nuevo Proyecto
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi, index) => (
                    <KPICard key={index} kpi={kpi} />
                ))}
            </div>

            {/* Benefits Section */}
            <div className="grid grid-cols-1 gap-6">
                <BenefitsCard
                    title="Análisis de Beneficios"
                    totalProjects={activeProjects.length}
                    totalRevenue={totalRevenue}
                    totalCosts={totalCosts}
                    netProfit={netProfit}
                    profitMargin={averageMargin}
                    targetMargin={20}
                    monthlyGrowth={8.5}
                    projectedAnnualProfit={netProfit * 12}
                />
            </div>

            {/* Charts */}
            <ProjectChart />

            {/* Projects Grid */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold tracking-tight">Proyectos Activos</h2>
                    <p className="text-sm text-muted-foreground font-medium">
                        {activeProjects.length} proyectos en curso
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.length > 0 ? (
                        projects.map((project) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                onSelect={(p) => router.push(`/user/${p.ownerProfileId}`)}
                            />
                        ))
                    ) : (
                        <div className="col-span-full text-center py-12">
                            <p className="text-muted-foreground mb-4">No hay proyectos creados aún</p>
                            <Button onClick={() => router.push('/projects/create')}>
                                <Plus className="w-4 h-4 mr-2" />
                                Crear Primer Proyecto
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Invoice Dialog */}
            <CreateInvoiceDialog
                isOpen={isInvoiceDialogOpen}
                onClose={() => setIsInvoiceDialogOpen(false)}
                onCreateInvoice={(invoice) => {
                    console.log('Invoice created:', invoice);
                    // Aquí puedes agregar la lógica para guardar la factura
                    setIsInvoiceDialogOpen(false);
                }}
            />
        </div>
    );
}
