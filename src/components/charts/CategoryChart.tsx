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

interface CategoryChartProps {
    categories: { name: string; count: number }[];
}

export const CategoryChart = ({ categories }: CategoryChartProps) => {
    const data = {
        labels: categories.map(c => c.name),
        datasets: [
            {
                label: 'Items',
                data: categories.map(c => c.count),
                backgroundColor: [
                    'rgba(168, 85, 247, 0.8)', // purple-500
                    'rgba(192, 132, 252, 0.8)', // purple-400
                    'rgba(216, 180, 254, 0.8)', // purple-300
                ],
                borderColor: [
                    'rgb(168, 85, 247)',
                    'rgb(192, 132, 252)',
                    'rgb(216, 180, 254)',
                ],
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
                        return `${context.parsed.x} items`;
                    }
                }
            }
        },
        scales: {
            x: {
                beginAtZero: true,
                ticks: {
                    stepSize: 1,
                }
            },
        },
    };

    return (
        <div style={{ height: '200px' }}>
            <Bar data={data} options={options} />
        </div>
    );
};
