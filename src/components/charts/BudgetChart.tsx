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
import { PendingRecord, GestionoDivision } from "@/src/types/gestiono";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

interface BudgetChartProps {
  records: PendingRecord[];
  divisions: GestionoDivision[];
}

export const BudgetChart = ({ records, divisions }: BudgetChartProps) => {
  const budgetData = records
    .map((record) => {
      const division = divisions.find(d => d.id === record.divisionId);
      const name = division
        ? division.name
        : (record.description || `Record #${record.id}`);

      return {
        name: name.slice(0, 8) + (name.length > 8 ? "..." : ""),
        facturado: record.amount,
        cobrado: record.paid,
      };
    })

  const data = {
    labels: budgetData.map((p) => p.name),
    datasets: [
      {
        label: "Facturado", // Was Presupuesto
        data: budgetData.map((p) => p.facturado),
        backgroundColor: "rgba(59, 130, 246, 0.8)", // blue-500
        borderColor: "rgb(59, 130, 246)",
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: "Cobrado", // Was Ejecutado
        data: budgetData.map((p) => p.cobrado),
        backgroundColor: "rgba(16, 185, 129, 0.8)", // green-500
        borderColor: "rgb(16, 185, 129)",
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
            return `${context.dataset.label}: $${value.toLocaleString()}`;
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
              return `$${(value / 1000).toFixed(1)}k`;
            }
            return `$${value}`;
          },
        },
      },
    },
  };

  return (
    <div style={{ height: "300px" }}>
      <Bar data={data} options={options} />
    </div>
  );
};
