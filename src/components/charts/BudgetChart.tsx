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

interface BudgetChartProps {
    projects: Array<{
        name: string;
        totalBudget: number;
        executedBudget: number;
    }>;
}

export const BudgetChart = ({ projects }: BudgetChartProps) => {
    const budgetData = projects
        .map((project) => ({
            name: project.name.split(" ")[0] + "...",
            presupuesto: project.totalBudget / 1000,
            ejecutado: project.executedBudget / 1000,
        }))
        .slice(0, 5);

    const data = {
        labels: budgetData.map(p => p.name),
        datasets: [
            {
                label: 'Presupuesto',
                data: budgetData.map(p => p.presupuesto),
                backgroundColor: 'rgba(59, 130, 246, 0.8)', // blue-500
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1,
                borderRadius: 4,
            },
            {
                label: 'Ejecutado',
                data: budgetData.map(p => p.ejecutado),
                backgroundColor: 'rgba(16, 185, 129, 0.8)', // green-500
                borderColor: 'rgb(16, 185, 129)',
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
                position: 'top' as const,
            },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        const value = context.parsed.y || 0;
                        return `${context.dataset.label}: $${(value * 1000).toLocaleString()}`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                ticks: {
                    callback: function (value: any) {
                        return `$${value}k`;
                    }
                }
            },
        },
    };

    return (
        <div style={{ height: '300px' }}>
            <Bar data={data} options={options} />
        </div>
    );
};
