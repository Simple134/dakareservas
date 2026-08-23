"use client";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TooltipItem,
} from "chart.js";
import { alpha, chart } from "@/src/lib/chartColors";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

export type BudgetSeriesPoint = {
  name: string;
  facturado: number;
  cobrado: number;
};

interface BudgetChartProps {
  /* Antes el gráfico recibía las facturas en crudo y pintaba una barra por
   * documento: con el censo completo son 97 barras de 8 caracteres. La
   * agregación por proyecto la hace ahora quien llama. */
  series: BudgetSeriesPoint[];
}

export const BudgetChart = ({ series }: BudgetChartProps) => {
  const budgetData = series;

  const data = {
    labels: budgetData.map((p) => p.name),
    datasets: [
      {
        label: "Facturado", // Was Presupuesto
        data: budgetData.map((p) => p.facturado),
        backgroundColor: alpha(chart.gold, 0.85),
        borderColor: chart.gold,
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: "Cobrado", // Was Ejecutado
        data: budgetData.map((p) => p.cobrado),
        backgroundColor: alpha(chart.info, 0.85),
        borderColor: chart.info,
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      tooltip: {
        callbacks: {
          label: function (context: TooltipItem<"bar">) {
            const value = context.parsed.y || 0;
            return `${context.dataset.label}: RD$${value.toLocaleString("es-DO")}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value: number | string) {
            if (typeof value === "number" && value >= 1000) {
              return `RD$${(value / 1000).toFixed(0)}k`;
            }
            return `RD$${value}`;
          },
        },
      },
    },
  };

  return (
    <div className="h-[300px]">
      <Bar data={data} options={options} />
    </div>
  );
};
