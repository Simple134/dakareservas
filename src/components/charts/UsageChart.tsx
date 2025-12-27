"use client";
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

interface UsageChartProps {
    items: { name: string; usageCount: number }[];
}

export const UsageChart = ({ items }: UsageChartProps) => {
    const data = {
        labels: items.map(item => item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name),
        datasets: [
            {
                label: 'Usos',
                data: items.map(item => item.usageCount),
                backgroundColor: 'rgba(34, 197, 94, 0.8)', // green-500
                borderColor: 'rgb(34, 197, 94)',
                borderWidth: 1,
            },
        ],
    };

    const options = {
        indexAxis: 'y' as const,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        return `${context.parsed.x} usos`;
                    }
                }
            }
        },
        scales: {
            x: {
                beginAtZero: true,
                ticks: {
                    stepSize: 5,
                }
            },
        },
    };

    return (
        <div style={{ height: '250px' }}>
            <Bar data={data} options={options} />
        </div>
    );
};
