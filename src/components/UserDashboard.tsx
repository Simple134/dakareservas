"use client";
import { Loader2, CreditCard, LogOut, FileText, Building2 } from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";
import { useState, useEffect } from "react";

// Define types based on DB schema
export type InvestmentData = {
    id: string; // allocation ID
    localeId: number;
    localeCode: string; // e.g., "Local 109"
    totalAmount: number;
    paidAmount: number;
    paidCurrency: string; // 'USD' or 'DOP'
    pendingAmount: number;
    progress: number;
    installments: {
        number: number;
        id: string;
        amount: number;
        currency: string;
        date: string;
        status: string;
        paymentMethod: string;
        receiptUrl: string;
    }[];
    cotizacion_url?: string | null;
}

type DashboardData = {
    userName: string | null;
    investments: InvestmentData[];
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
    onOpenPaymentSidebar: (investmentId: string) => void;
}) => {
    const { signOut } = useAuth();
    const [selectedInvestmentId, setSelectedInvestmentId] = useState<string | null>(null);

    // Set initial selected investment when data loads
    useEffect(() => {
        if (data?.investments && data.investments.length > 0 && !selectedInvestmentId) {
            setSelectedInvestmentId(data.investments[0].id);
        }
    }, [data, selectedInvestmentId]);

    const selectedInvestment = data?.investments.find(inv => inv.id === selectedInvestmentId) || data?.investments[0];

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

    if (!data || !selectedInvestment) return (
        <div className="min-h-screen bg-gray-50 font-sans p-8">
            <div className="container mx-auto">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-[#131E29]">Bienvenido, {data?.userName || 'Usuario'}</h1>
                        <p className="text-gray-500">No hay inversiones activas.</p>
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="bg-white"
                    >
                        <LogOut size={18} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </div>
        </div>
    );

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
                <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-[#131E29]">Bienvenido, {data.userName}</h1>
                        <p className="text-gray-500">Resumen de su inversión</p>
                    </div>
                    <button
                        onClick={() => signOut()}
                        className="bg-white"
                    >
                        <LogOut size={18} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>

                {/* Local Selection Tabs */}
                {data.investments.length > 1 && (
                    <div className="mb-8 overflow-x-auto pb-2">
                        <div className="flex gap-3">
                            {data.investments.map((inv) => (
                                <button
                                    key={inv.id}
                                    onClick={() => setSelectedInvestmentId(inv.id)}
                                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border font-medium transition-all whitespace-nowrap ${selectedInvestmentId === inv.id
                                        ? 'bg-[#131E29] text-white border-[#131E29] shadow-md'
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-[#A9780F] hover:text-[#A9780F]'
                                        }`}
                                >
                                    <Building2 size={18} className={selectedInvestmentId === inv.id ? "text-[#A9780F]" : ""} />
                                    <span>{inv.localeCode}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Single Local Title if only one */}
                {data.investments.length === 1 && (
                    <div className="mb-6 flex items-center gap-2 text-[#131E29]">
                        <Building2 size={24} className="text-[#A9780F]" />
                        <h2 className="text-xl font-bold">{selectedInvestment.localeCode}</h2>
                    </div>
                )}

                {/* Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Monto Total */}
                    <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-[#131E29]">
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Monto Total</p>
                        <h2 className="text-3xl font-bold text-[#131E29]">{formatUSD(selectedInvestment.totalAmount)}</h2>
                    </div>

                    {/* Balance Pendiente */}
                    <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Balance Pendiente</p>
                        <h2 className="text-3xl font-bold text-red-600">{formatUSD(selectedInvestment.pendingAmount)}</h2>
                    </div>

                    {/* Pagado */}
                    <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-[#A9780F]">
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Pagado</p>
                        <h2 className="text-3xl font-bold text-[#A9780F]">{formatDynamic(selectedInvestment.paidAmount, selectedInvestment.paidCurrency)}</h2>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="bg-white rounded-xl shadow-md p-6 mb-8">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-sm font-bold text-gray-700">Progreso del Plan</span>
                        <span className="text-sm font-bold text-[#A9780F]">{selectedInvestment.progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                        <div
                            className="bg-[#A9780F] h-4 rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${selectedInvestment.progress}%` }}
                        ></div>
                    </div>
                </div>

                {/* Action Button */}
                <div className="flex justify-end mb-8 gap-4">
                    {selectedInvestment.cotizacion_url && (
                        <a
                            href={selectedInvestment.cotizacion_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-[#131E29] text-white font-bold py-2 px-6 rounded-lg shadow-sm transition-all hover:bg-[#2a425a]"
                        >
                            <FileText size={18} />
                            <span>Ver Cotización</span>
                        </a>
                    )}
                    <button
                        onClick={() => onOpenPaymentSidebar(selectedInvestment.id)}
                        className="flex items-center gap-2 bg-white border border-[#A9780F] text-[#A9780F]  font-bold py-2 px-6 rounded-lg shadow-sm transition-all"
                    >
                        <CreditCard size={18} />
                        <span>Abonar al {selectedInvestment.localeCode}</span>
                    </button>
                </div>

                {/* Payments Table */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-[#131E29]">Historial de Pagos</h3>
                        <span className="text-sm text-gray-500 font-medium">{selectedInvestment.localeCode}</span>
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
                                {selectedInvestment.installments.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                            No hay pagos registrados para este local.
                                        </td>
                                    </tr>
                                ) : (
                                    selectedInvestment.installments.map((payment: any) => {
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
                                            <tr key={payment.id} className="hover:bg-gray-50">
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
