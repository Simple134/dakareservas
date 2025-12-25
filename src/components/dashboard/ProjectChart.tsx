"use client"; // Essential for Recharts
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useProjects } from "@/src/hooks/useProjects";

export function ProjectChart() {
  const { projects } = useProjects();

  const budgetData = projects
    .map((project) => ({
      name: project.name.split(" ")[0] + "...", // Truncate for display
      presupuesto: project.totalBudget / 1000, // Show in K for cleaner axis
      ejecutado: project.executedBudget / 1000,
      margen: project.profitMargin,
    }))
    .slice(0, 5); // Limit to top 5 for clarity

  const statusData = [
    {
      name: "Planificación",
      value: projects.filter((p) => p.status === "planning").length,
      color: "#f59e0b",
    },
    {
      name: "Ejecución",
      value: projects.filter((p) => p.status === "execution").length,
      color: "#10b981",
    },
    {
      name: "Completado",
      value: projects.filter((p) => p.status === "completed").length,
      color: "#3b82f6",
    },
  ].filter((item) => item.value > 0);

  const formatCurrencyAxis = (value: number) => `$${value}k`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Presupuesto vs Ejecutado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis tickFormatter={formatCurrencyAxis} fontSize={12} />
                <Tooltip
                  formatter={(value: number | undefined) => [
                    `$${((value || 0) * 1000).toLocaleString()}`,
                    "",
                  ]}
                  labelFormatter={(label) => `Proyecto: ${label}`}
                />
                <Bar
                  dataKey="presupuesto"
                  fill="#3b82f6"
                  name="Presupuesto"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="ejecutado"
                  fill="#10b981"
                  name="Ejecutado"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estado de Proyectos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
