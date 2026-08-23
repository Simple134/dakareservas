"use client";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  TooltipItem,
} from "chart.js";
import { PendingRecord } from "@/src/types/erp";
import { chart } from "@/src/lib/chartColors";

ChartJS.register(ArcElement, Tooltip, Legend);

interface ProjectStatusChartProps {
  records: PendingRecord[];
}

export const ProjectStatusChart = ({ records }: ProjectStatusChartProps) => {
  /* Los estados reales del sistema son PENDING · PAST_DUE · COMPLETED ·
   * ARCHIVED. Este gráfico comparaba con "PAID", que no existe: la porción
   * «Pagado» salía siempre en cero y todo lo cobrado caía en «En Proceso». */
  const statusData = [
    {
      name: "Pendiente",
      value: records.filter((r) => r.state === "PENDING").length,
      color: chart.warning,
    },
    {
      name: "Vencida",
      value: records.filter((r) => r.state === "PAST_DUE").length,
      color: chart.danger,
    },
    {
      name: "Pagada",
      value: records.filter((r) => r.state === "COMPLETED").length,
      color: chart.success,
    },
    {
      name: "Anulada",
      value: records.filter((r) => r.state === "ARCHIVED").length,
      color: chart.ink3,
    },
  ].filter((item) => item.value > 0);

  const data = {
    labels: statusData.map((s) => s.name),
    datasets: [
      {
        data: statusData.map((s) => s.value),
        backgroundColor: statusData.map((s) => s.color),
        borderColor: statusData.map((s) => s.color),
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
      },
      tooltip: {
        callbacks: {
          label: function (context: TooltipItem<"pie">) {
            const label = context.label || "";
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce(
              (a: number, b: number) => a + b,
              0,
            );
            const percentage = ((value / total) * 100).toFixed(0);
            return `${label}: ${value} facturas (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="h-[300px]">
      <Pie data={data} options={options} />
    </div>
  );
};
