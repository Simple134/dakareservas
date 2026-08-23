"use client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import {
  BudgetChart,
  BudgetSeriesPoint,
} from "@/src/components/charts/BudgetChart";
import { ProjectStatusChart } from "@/src/components/charts/ProjectStatusChart";
import { PendingRecord } from "@/src/types/erp";
import { ProjectSummary } from "@/src/hooks/useDashboardMetrics";

/* Antes este componente hacía `pendingRecords as unknown` y comprobaba si era
 * un array vacío para decidir si había datos — una salvaguarda contra una forma
 * que el endpoint nunca devuelve. Ahora recibe lo ya derivado.
 */

interface ProjectChartProps {
  records: PendingRecord[];
  projects: ProjectSummary[];
}

const PROYECTOS_EN_GRAFICO = 8;

export function ProjectChart({ records, projects }: ProjectChartProps) {
  const series: BudgetSeriesPoint[] = projects
    .filter((p) => p.invoiced > 0)
    .sort((a, b) => b.invoiced - a.invoiced)
    .slice(0, PROYECTOS_EN_GRAFICO)
    .map((p) => ({
      name: p.name.length > 14 ? `${p.name.slice(0, 14)}…` : p.name,
      facturado: p.invoiced,
      cobrado: p.collected,
    }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Facturado vs. cobrado por proyecto</CardTitle>
        </CardHeader>
        <CardContent>
          {series.length > 0 ? (
            <BudgetChart series={series} />
          ) : (
            <p className="py-12 text-center text-[0.8125rem] text-ink-3">
              Aún no hay ventas facturadas contra ningún proyecto.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estado de las facturas</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length > 0 ? (
            <ProjectStatusChart records={records} />
          ) : (
            <p className="py-12 text-center text-[0.8125rem] text-ink-3">
              Aún no hay facturas registradas.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
