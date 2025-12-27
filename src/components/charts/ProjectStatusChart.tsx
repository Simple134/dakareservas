"use client";
import { Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface ProjectStatusChartProps {
    projects: Array<{
        status: string;
    }>;
}

export const ProjectStatusChart = ({ projects }: ProjectStatusChartProps) => {
    const statusData = [
        {
            name: "Planificación",
            value: projects.filter((p) => p.status === "planning").length,
            color: "#f59e0b", // amber-500
        },
        {
            name: "Ejecución",
            value: projects.filter((p) => p.status === "execution").length,
            color: "#10b981", // green-500
        },
        {
            name: "Completado",
            value: projects.filter((p) => p.status === "completed").length,
            color: "#3b82f6", // blue-500
        },
    ].filter((item) => item.value > 0);

    const data = {
        labels: statusData.map(s => s.name),
        datasets: [
            {
                data: statusData.map(s => s.value),
                backgroundColor: statusData.map(s => s.color),
                borderColor: statusData.map(s => s.color),
                borderWidth: 2,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
            },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(0);
                        return `${label}: ${value} proyectos (${percentage}%)`;
                    }
                }
            }
        },
    };

    return (
        <div style={{ height: '300px' }}>
            <Pie data={data} options={options} />
        </div>
    );
};
