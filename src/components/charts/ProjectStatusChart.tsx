"use client";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  TooltipItem,
} from "chart.js";
import { PendingRecord } from "@/src/types/gestiono";

ChartJS.register(ArcElement, Tooltip, Legend);

interface ProjectStatusChartProps {
  records: PendingRecord[];
}

export const ProjectStatusChart = ({ records }: ProjectStatusChartProps) => {
  const statusData = [
    {
      name: "Pendiente",
      value: records.filter((r) => r.state === 'PENDING').length,
      color: "#f59e0b", // amber-500
    },
    {
      name: "En Proceso", // Covers PARTIALLY_PAID, DRAFT, etc if needed, or mapped logic
      value: records.filter((r) => r.state !== 'PENDING' && r.state !== 'PAID').length,
      color: "#3b82f6", // blue-500
    },
    {
      name: "Pagado",
      value: records.filter((r) => r.state === 'PAID').length,
      color: "#10b981", // green-500
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
    <div style={{ height: "300px" }}>
      <Pie data={data} options={options} />
    </div>
  );
};
