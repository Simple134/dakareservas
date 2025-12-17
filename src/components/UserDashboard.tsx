"use client";
import { Loader2, CreditCard, LogOut, FileText } from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";

// Define types based on DB schema
type DashboardData = {
    userName: string | null;
    localeCode?: string;
    totalAmount: number;
    paidAmount: number;
    paidCurrency: string; // 'USD' or 'DOP'
    pendingAmount: number;
    progress: number;
    installments: any[]; // Placeholder for now
    cotizacion_url?: string | null;
};

export const UserDashboard = ({
    data,
    loading,
    error,
    onOpenPaymentSidebar
}: {
    data: DashboardData | null;
    loading: boolean;
    error: string | null;
    onOpenPaymentSidebar: () => void;
}) => {
    const { signOut } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#131E29]">
                <Loader2 size={48} className="animate-spin text-[#A9780F]" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-white bg-[#131E29] min-h-screen">
                <h1 className="text-2xl font-bold text-red-500">Error</h1>
                <p>{error}</p>
                <button onClick={() => signOut()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                    Cerrar Sesión
                </button>
            </div>
        );
    }

    if (!data) return null;

    // Currency formatters
    const formatUSD = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);
    };

    const formatDynamic = (amount: number, currency: string) => {
        const locale = currency === 'DOP' ? 'es-DO' : 'en-US';
        return new Intl.NumberFormat(locale, { style: 'currency', currency: currency, minimumFractionDigits: 2 }).format(amount);
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans">

            <main className="container mx-auto px-4 py-8">
                {/* Introduction / Title */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-[#131E29]">Bienvenido, {data.userName}</h1>
                        <p className="text-gray-500">Resumen de su inversión</p>
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="flex items-center gap-2 bg-white text-gray-700 hover:text-red-700 hover:bg-red-50 font-medium py-2 px-4 rounded-lg border border-gray-200 shadow-sm transition-all"
                    >
                        <LogOut size={18} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>

                {/* Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Monto Total */}
                    <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-[#131E29]">
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Monto Total</p>
                        <h2 className="text-3xl font-bold text-[#131E29]">{formatUSD(data.totalAmount)}</h2>
                    </div>

                    {/* Balance Pendiente */}
                    <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Balance Pendiente</p>
                        <h2 className="text-3xl font-bold text-red-600">{formatUSD(data.pendingAmount)}</h2>
                    </div>

                    {/* Pagado */}
                    <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-[#A9780F]">
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Pagado</p>
                        <h2 className="text-3xl font-bold text-[#A9780F]">{formatDynamic(data.paidAmount, data.paidCurrency)}</h2>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-8">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-bold text-gray-700">Progreso del Plan</span>
                        <span className="text-sm font-bold text-[#A9780F]">{data.progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                        <div
                            className="bg-[#A9780F] h-4 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${data.progress}%` }}
                        ></div>
                    </div>
                </div>

                {/* Action Button */}
                <div className="flex justify-end mb-8 gap-4">
                    {data.cotizacion_url && (
                        <a
                            href={data.cotizacion_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-[#131E29] text-white font-bold py-2 px-6 rounded-lg shadow-sm transition-all hover:bg-[#2a425a]"
                        >
                            <FileText size={18} />
                            <span>Ver Cotización</span>
                        </a>
                    )}
                    <button
                        onClick={onOpenPaymentSidebar}
                        className="flex items-center gap-2 bg-white border border-[#A9780F] text-[#A9780F]  font-bold py-2 px-6 rounded-lg shadow-sm transition-all hover:bg-[#A9780F] hover:text-white"
                    >
                        <CreditCard size={18} />
                        <span>Abonar a Capital</span>
                    </button>
                </div>

                {/* Payments Table */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h3 className="text-xl font-bold text-[#131E29]">Historial de Pagos</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#131E29] text-white">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">#</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Monto Pagado</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Método</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Recibo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {/* Empty state or placeholder rows */}
                                {data.installments.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                            No hay pagos registrados.
                                        </td>
                                    </tr>
                                ) : (
                                    data.installments.map((payment: any) => {
                                        const formattedDate = new Date(payment.date).toLocaleDateString('es-DO', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        });

                                        const statusColors: Record<string, string> = {
                                            'approved': 'bg-green-100 text-green-800',
                                            'pending': 'bg-yellow-100 text-yellow-800',
                                            'rejected': 'bg-red-100 text-red-800'
                                        };

                                        const statusClass = statusColors[payment.status] || 'bg-gray-100 text-gray-800';

                                        const methodLabels: Record<string, string> = {
                                            'transfer': 'Transferencia',
                                            'card': 'Tarjeta',
                                            'cash': 'Efectivo',
                                            'N/A': 'N/A'
                                        };

                                        return (
                                            <tr key={payment.number} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">{payment.number}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{formattedDate}</td>
                                                <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                                    {formatDynamic(payment.amount, payment.currency)}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-700">
                                                    {methodLabels[payment.paymentMethod] || payment.paymentMethod}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}`}>
                                                        {payment.status === 'approved' ? 'Aprobado' : payment.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    {payment.receiptUrl ? (
                                                        <a
                                                            href={payment.receiptUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[#A9780F] hover:text-[#8b6609] font-medium"
                                                        >
                                                            Ver Recibo
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-400">N/A</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>
        </div>
    );
};
