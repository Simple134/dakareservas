"use client";
import { useAuth } from "@/src/hooks/useAuth";
import { KPICard, KPI } from "@/src/components/dashboard/KPICard";
import { ProjectCard } from "@/src/components/dashboard/ProjectCard";
import { ProjectChart } from "@/src/components/dashboard/ProjectChart";
import { BenefitsCard } from "@/src/components/dashboard/BenefitsCard";
import { PageHeader, PageBody } from "@/src/components/ui/page-header";
import { Button } from "@/src/components/ui/button";
import { Plus, LogOut, Loader2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useErp } from "@/src/context/ErpContext";
import { useDashboardMetrics } from "@/src/hooks/useDashboardMetrics";
import { moneyShort, count } from "@/src/lib/format";

/* Hallmark · design-system: design.md · familia Workbench
 *
 * La barra de página es la compartida (`PageHeader`), no una inventada aquí con
 * `text-4xl` y dos botones con degradado azul. El único botón primario de la
 * vista es «Nuevo proyecto».
 */

const PROYECTOS_VISIBLES = 9;

export function DashboardView() {
  const { signOut } = useAuth();
  const { pendingRecords } = useErp();
  const m = useDashboardMetrics();
  const router = useRouter();

  const kpis: KPI[] = [
    {
      title: "Facturado a clientes",
      value: moneyShort(m.salesNet),
      icon: "TrendingUp",
      hint: `${count(m.invoiceCount)} facturas · neto de impuestos`,
    },
    {
      title: "Por cobrar",
      value: moneyShort(m.toCharge),
      icon: "Receipt",
      hint: `${count(m.toChargeCount)} documentos pendientes`,
    },
    {
      title: "Por pagar",
      value: moneyShort(m.toPay),
      icon: "Wallet",
      hint: `${count(m.toPayCount)} documentos pendientes`,
    },
    {
      title: "Proyectos en ejecución",
      value: m.activeProjects,
      icon: "Building2",
      hint: `${count(m.projects.length)} proyectos registrados`,
    },
  ];

  const proyectos = m.projects.slice(0, PROYECTOS_VISIBLES);

  return (
    <>
      <PageHeader
        title="Panel ejecutivo"
        description="Cartera de proyectos, facturación y cobranza de Daka Dominicana."
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              Cerrar sesión
            </Button>
            <Button onClick={() => router.push("/admin/projects/create")}>
              <Plus className="mr-1.5 h-4 w-4" strokeWidth={2} />
              Crear proyecto
            </Button>
          </>
        }
      />

      <PageBody className="space-y-5">
        {m.error && (
          <div className="flex items-start gap-2.5 rounded-[8px] border border-danger/20 bg-danger-soft px-4 py-3">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-danger"
              strokeWidth={1.75}
              aria-hidden
            />
            <p className="text-[0.8125rem] text-danger">
              {m.error}. Las cifras mostradas pueden estar incompletas.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KPICard key={kpi.title} kpi={kpi} loading={m.isLoading} />
          ))}
        </div>

        {m.isLoading ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-[12px] border border-rule bg-paper">
            <Loader2
              className="h-6 w-6 animate-spin text-gold"
              aria-label="Cargando datos del ERP"
            />
          </div>
        ) : (
          <>
            <BenefitsCard
              salesNet={m.salesNet}
              purchasesNet={m.purchasesNet}
              grossMargin={m.grossMargin}
              grossMarginPct={m.grossMarginPct}
              taxesCollected={m.taxesCollected}
              taxesPaid={m.taxesPaid}
              invoiceCount={m.invoiceCount}
            />

            <ProjectChart
              records={pendingRecords?.items ?? []}
              projects={m.projects}
            />

            <section className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-2">
                <h2 className="font-display text-[1rem] font-semibold tracking-[-0.01em] text-ink">
                  Proyectos
                </h2>
                <p className="tabular text-[0.75rem] text-ink-3">
                  {proyectos.length === m.projects.length
                    ? `${count(m.projects.length)} en total`
                    : `${count(proyectos.length)} de ${count(m.projects.length)}`}
                </p>
              </div>

              {m.projects.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {proyectos.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onSelect={(p) => router.push(`/admin/projects/${p.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[12px] border border-rule bg-paper px-6 py-12 text-center">
                  <p className="text-[0.875rem] text-ink-2">
                    Todavía no hay proyectos registrados.
                  </p>
                  <Button
                    className="mt-4"
                    onClick={() => router.push("/admin/projects/create")}
                  >
                    <Plus className="mr-1.5 h-4 w-4" strokeWidth={2} />
                    Crear el primer proyecto
                  </Button>
                </div>
              )}

              {m.projects.length > proyectos.length && (
                <p className="text-[0.75rem] text-ink-3">
                  Se muestran los {PROYECTOS_VISIBLES} proyectos con más
                  actividad facturada.
                </p>
              )}
            </section>
          </>
        )}
      </PageBody>
    </>
  );
}
