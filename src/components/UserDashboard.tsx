"use client";
import { Loader2, CreditCard, LogOut } from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";

// Define types based on DB schema
type DashboardData = {
    userName: string | null;
    localeCode?: string;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    progress: number;
    installments: any[]; // Placeholder for now
};

export const UserDashboard = ({
    data,
    loading,
    error
}: {
    data: DashboardData | null;
    loading: boolean;
    error: string | null;
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

    // Currency formatter
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 2 }).format(amount);
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
                        <h2 className="text-3xl font-bold text-[#131E29]">{formatCurrency(data.totalAmount)}</h2>
                    </div>

                    {/* Balance Pendiente */}
                    <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Balance Pendiente</p>
                        <h2 className="text-3xl font-bold text-red-600">{formatCurrency(data.pendingAmount)}</h2>
                    </div>

                    {/* Pagado */}
                    <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-[#A9780F]">
                        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Pagado</p>
                        <h2 className="text-3xl font-bold text-[#A9780F]">{formatCurrency(data.paidAmount)}</h2>
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
                <div className="flex justify-end mb-8">
                    <button className="flex items-center gap-2 bg-white border border-[#A9780F] text-[#A9780F] hover:bg-[#A9780F] hover:text-white font-bold py-2 px-6 rounded-lg shadow-sm transition-all">
                        <CreditCard size={18} />
                        <span>Abonar a Capital</span>
                    </button>
                </div>

                {/* Installments Table */}
                <div className="bg-white rounded-xl shadow-md overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h3 className="text-xl font-bold text-[#131E29]">Cuotas</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#131E29] text-white">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">#</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Monto</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Pagado</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Pendiente</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Vencimiento</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {/* Empty state or placeholder rows */}
                                {data.installments.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                            No hay cuotas programadas.
                                        </td>
                                    </tr>
                                ) : (
                                    // Placeholder for future mapping
                                    data.installments.map((inst, idx) => (
                                        <tr key={idx}>
                                            <td className="px-6 py-4">{idx + 1}</td>
                                            {/* ... */}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </main>
        </div>
    );
};
