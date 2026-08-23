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

interface UsageChartProps {
  items: { name: string; usageCount: number }[];
}

export const UsageChart = ({ items }: UsageChartProps) => {
  const data = {
    labels: items.map((item) =>
      item.name.length > 15 ? item.name.substring(0, 15) + "..." : item.name,
    ),
    datasets: [
      {
        label: "Usos",
        data: items.map((item) => item.usageCount),
        backgroundColor: alpha(chart.gold, 0.85),
        borderColor: chart.gold,
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
            return `${context.parsed.x} usos`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          stepSize: 5,
        },
      },
    },
  };

  return (
    <div style={{ height: "250px" }}>
      <Bar data={data} options={options} />
    </div>
  );
};
