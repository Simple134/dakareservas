"use client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { useProjects } from "@/src/hooks/useProjects";
import { BudgetChart } from "@/src/components/charts/BudgetChart";
import { ProjectStatusChart } from "@/src/components/charts/ProjectStatusChart";

export function ProjectChart() {
  const { projects } = useProjects();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Presupuesto vs Ejecutado</CardTitle>
        </CardHeader>
        <CardContent>
          <BudgetChart projects={projects} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estado de Proyectos</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectStatusChart projects={projects} />
        </CardContent>
      </Card>
    </div>
  );
}
