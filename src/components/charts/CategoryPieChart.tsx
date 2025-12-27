"use client";
import { Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface PieChartProps {
    categories: { name: string; count: number; percentage: number }[];
    totalItems: number;
}

export const CategoryPieChart = ({ categories, totalItems }: PieChartProps) => {
    const data = {
        labels: categories.map(c => c.name),
        datasets: [
            {
                data: categories.map(c => c.count),
                backgroundColor: [
                    'rgba(168, 85, 247, 0.8)', // purple-400
                    'rgba(134, 239, 172, 0.8)', // green-300
                    'rgba(251, 191, 36, 0.8)',  // yellow-400
                ],
                borderColor: [
                    'rgb(168, 85, 247)',
                    'rgb(134, 239, 172)',
                    'rgb(251, 191, 36)',
                ],
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
                    label: function (context: any) {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const percentage = ((value / totalItems) * 100).toFixed(1);
                        return `${label}: ${value} items (${percentage}%)`;
                    }
                }
            }
        },
        cutout: '60%',
    };

    return (
        <div style={{ height: '200px', position: 'relative' }}>
            <Doughnut data={data} options={options} />
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                pointerEvents: 'none'
            }}>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Total</p>
                <p style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>{totalItems}</p>
            </div>
        </div>
    );
};
