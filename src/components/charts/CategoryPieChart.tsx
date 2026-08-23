"use client";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  TooltipItem,
} from "chart.js";
import { alpha, seriesColor } from "@/src/lib/chartColors";

ChartJS.register(ArcElement, Tooltip, Legend);

interface PieChartProps {
  categories: { name: string; count: number; percentage: number }[];
  totalItems: number;
}

export const CategoryPieChart = ({ categories, totalItems }: PieChartProps) => {
  const data = {
    labels: categories.map((c) => c.name),
    datasets: [
      {
        data: categories.map((c) => c.count),
        backgroundColor: categories.map((_, i) => alpha(seriesColor(i), 0.85)),
        borderColor: categories.map((_, i) => seriesColor(i)),
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context: TooltipItem<"doughnut">) {
            const label = context.label || "";
            const value = context.parsed || 0;
            const percentage = ((value / totalItems) * 100).toFixed(1);
            return `${label}: ${value} items (${percentage}%)`;
          },
        },
      },
    },
    cutout: "60%",
  };

  return (
    <div style={{ height: "200px", position: "relative" }}>
      <Doughnut data={data} options={options} />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <p style={{ fontSize: "12px", color: "var(--color-ink-2)", margin: 0 }}>
          Total
        </p>
        <p style={{ fontSize: "18px", fontWeight: "bold", margin: 0 }}>
          {totalItems}
        </p>
      </div>
    </div>
  );
};
