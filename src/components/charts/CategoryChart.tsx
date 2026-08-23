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
import { alpha, seriesColor } from "@/src/lib/chartColors";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

interface CategoryChartProps {
  categories: { name: string; count: number }[];
}

export const CategoryChart = ({ categories }: CategoryChartProps) => {
  const data = {
    labels: categories.map((c) => c.name),
    datasets: [
      {
        label: "Items",
        data: categories.map((c) => c.count),
        backgroundColor: categories.map((_, i) => alpha(seriesColor(i), 0.85)),
        borderColor: categories.map((_, i) => seriesColor(i)),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    indexAxis: "y" as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context: TooltipItem<"bar">) {
            return `${context.parsed.x} items`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  return (
    <div style={{ height: "200px" }}>
      <Bar data={data} options={options} />
    </div>
  );
};
