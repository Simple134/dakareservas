"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/src/lib/supabase/client";
import { Database, Tables } from "@/src/types/supabase";
import Login from "@/src/components/Login";
import { LogOut, X, CheckCircle2, Clock } from "lucide-react";

type ProductAllocationResponse = Tables<'product_allocations'> & {
    product: { name: string } | null;
    persona_fisica: (Tables<'persona_fisica'> & { locales: Tables<'locales'> | null }) | null;
    persona_juridica: (Tables<'persona_juridica'> & { locales: Tables<'locales'> | null }) | null;
};

interface ReservationViewModel {
    id: string;
    created_at: string;
    status: string;

    client_name: string;
    client_type_label: string;
    identification_label: string;
    identification_value: string;

    product_name: string;
    amount: number;
    currency: string;
    payment_method: string;
    receipt_url: string | null;
    bank_name: string | null;
    transaction_number: string | null;

    email: string | null;
    phone?: string;
    address_display: string;
    unit_code: string | null;
    locale_id: number | null;

    locale_details?: {
        level: number;
        area_mt2: number;
        price_per_mt2: number;
        total_value: number;
        status: string;
    };

    raw_fisica?: Tables<'persona_fisica'>;
    raw_juridica?: Tables<'persona_juridica'>;
}

export default function AdminPage() {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [reservations, setReservations] = useState<ReservationViewModel[]>([]);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [selectedReservation, setSelectedReservation] = useState<ReservationViewModel | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (session) {
            fetchReservations();
        }
    }, [session]);

    const fetchReservations = async () => {
        try {
            const { data, error } = await supabase
                .from("product_allocations")
                .select(`
                    *,
                    product:products(name),
                    persona_fisica(*, locales(*)),
                    persona_juridica(*, locales(*))
                `)
                .order("created_at", { ascending: false })
                .returns<ProductAllocationResponse[]>();

            if (error) throw error;

            const transformed: ReservationViewModel[] = (data || []).map((item) => {
                const isFisica = !!item.persona_fisica;
                const isJuridica = !!item.persona_juridica;

                if (!isFisica && !isJuridica) return null;

                let viewModel: ReservationViewModel;

                if (isFisica && item.persona_fisica) {
                    const pf = item.persona_fisica;
                    const addressParts = [
                        pf.address_street,
                        pf.address_house ? `#${pf.address_house}` : '',
                        pf.address_sector,
                        pf.address_province
                    ].filter(Boolean).join(", ");

                    const locale = pf.locales;

                    viewModel = {
                        id: item.id,
                        created_at: item.created_at,
                        status: item.status || 'pending',
                        client_name: `${pf.first_name || ''} ${pf.last_name || ''}`.trim(),
                        client_type_label: "Cliente",
                        identification_label: pf.passport ? "Pasaporte" : "Cédula",
                        identification_value: pf.passport || pf.identification || "N/A",
                        product_name: item.product?.name || "Desconocido",
                        amount: item.amount || 0,
                        currency: item.currency || "USD",
                        payment_method: item.payment_method || "N/A",
                        receipt_url: item.receipt_url,
                        bank_name: item.bank_name,
                        transaction_number: null, // Add to schema if needed
                        email: pf.email,
                        address_display: addressParts,
                        unit_code: pf.unit_code,
                        locale_id: pf.locale_id,
                        locale_details: locale ? {
                            level: locale.level,
                            area_mt2: locale.area_mt2,
                            price_per_mt2: locale.price_per_mt2,
                            total_value: locale.total_value,
                            status: locale.status
                        } : undefined,
                        raw_fisica: pf
                    };
                } else if (isJuridica && item.persona_juridica) {
                    const pj = item.persona_juridica;
                    const addressParts = [
                        pj.company_address_street,
                        pj.company_address_house ? `#${pj.company_address_house}` : '',
                        pj.company_address_sector,
                        pj.company_address_province
                    ].filter(Boolean).join(", ");

                    const locale = pj.locales;

                    viewModel = {
                        id: item.id,
                        created_at: item.created_at,
                        status: item.status || 'pending',
                        client_name: pj.company_name || "Empresa Sin Nombre",
                        client_type_label: "Empresa",
                        identification_label: "RNC",
                        identification_value: pj.rnc || "N/A",
                        product_name: item.product?.name || "Desconocido",
                        amount: item.amount || 0,
                        currency: item.currency || "USD",
                        payment_method: item.payment_method || "N/A",
                        receipt_url: item.receipt_url,
                        bank_name: item.bank_name,
                        transaction_number: null,
                        email: pj.email,
                        address_display: addressParts,
                        unit_code: pj.unit_code,
                        locale_id: pj.locale_id,
                        locale_details: locale ? {
                            level: locale.level,
                            area_mt2: locale.area_mt2,
                            price_per_mt2: locale.price_per_mt2,
                            total_value: locale.total_value,
                            status: locale.status
                        } : undefined,
                        raw_juridica: pj
                    };
                } else {
                    return null;
                }

                return viewModel;
            }).filter((item): item is ReservationViewModel => item !== null);

            setReservations(transformed);
        } catch (err: any) {
            console.error("Error fetching:", err);
            setFetchError(err.message);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const handleRowClick = (reservation: ReservationViewModel) => {
        setSelectedReservation(reservation);
        setSidebarOpen(true);
    };

    const closeSidebar = () => {
        setSidebarOpen(false);
        setTimeout(() => setSelectedReservation(null), 300);
    };

    const updateStatus = async (newStatus: string) => {
        if (!selectedReservation) return;

        setUpdatingStatus(true);
        try {
            const { error: allocationError } = await supabase
                .from("product_allocations")
                .update({ status: newStatus })
                .eq("id", selectedReservation.id);

            if (allocationError) throw allocationError;

            if (newStatus === "approved" && selectedReservation.locale_id) {
                const { error: localeError } = await supabase
                    .from("locales")
                    .update({ status: "VENDIDO" })
                    .eq("id", selectedReservation.locale_id);

                if (localeError) {
                    console.error("Error updating locale status:", localeError);
                    alert("Reserva aprobada, pero hubo un error actualizando el estado del local: " + localeError.message);
                }
            }

            // Update local state
            setReservations((prev) =>
                prev.map((r) =>
                    r.id === selectedReservation.id ? { ...r, status: newStatus } : r
                )
            );
            setSelectedReservation({ ...selectedReservation, status: newStatus });
        } catch (err: any) {
            alert("Error updating status: " + err.message);
        } finally {
            setUpdatingStatus(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#131E29]">
                <div className="text-xl text-white">Loading...</div>
            </div>
        );
    }

    if (!session) {
        return <Login />;
    }

    return (
        <div className="min-h-screen bg-white p-8 font-sans">
            <div className="mx-auto max-w-7xl">
                <div className="flex flex-col md:flex-row items-center justify-between p-4">
                    <div className="flex items-end justify-center">
                        <Image
                            src="/logoDaka.png"
                            alt="Daka Logo"
                            width={120}
                            height={60}
                            className="object-contain"
                            priority
                        />
                    </div>
                    <button
                        onClick={handleLogout}
                        className="mr-2 h-6 w-6 text-[#A9780F] hover:text-[#8e650c] transition-colors">
                        <LogOut />
                    </button>
                </div>

                {fetchError && (
                    <div className="mb-4 rounded-md bg-red-900/50 p-4 text-red-200 border border-red-700">
                        Error fetching reservations: {fetchError}
                    </div>
                )}

                <div className="overflow-hidden rounded-xl bg-white shadow-2xl border-2 border-[#A9780F]">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700"
                                    >
                                        Fecha
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700"
                                    >
                                        Cliente / Empresa
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700"
                                    >
                                        ID
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700"
                                    >
                                        Producto
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700"
                                    >
                                        Moneda
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700"
                                    >
                                        Método Pago
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700"
                                    >
                                        Precio
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700"
                                    >
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {reservations.map((reservation) => (
                                    <tr
                                        key={reservation.id}
                                        onClick={() => handleRowClick(reservation)}
                                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                                    >
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                            {new Date(reservation.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                                            <div className="flex flex-col">
                                                <span>{reservation.client_name}</span>
                                                <span className="text-xs text-gray-500">{reservation.client_type_label}</span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                            <div className="flex flex-col">
                                                <span>{reservation.identification_value}</span>
                                                <span className="text-xs text-gray-500">{reservation.identification_label}</span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                            {reservation.product_name || "-"}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                            {reservation.currency || "USD"}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                            {reservation.payment_method || "-"}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-[#A9780F]">
                                            {reservation.amount
                                                ? new Intl.NumberFormat('en-US', { style: 'currency', currency: reservation.currency || 'USD' }).format(reservation.amount)
                                                : "-"}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${reservation.status === "approved"
                                                    ? "bg-green-100 text-green-800"
                                                    : reservation.status === "pending"
                                                        ? "bg-yellow-100 text-yellow-800"
                                                        : "bg-red-100 text-red-800"
                                                    }`}
                                            >
                                                {reservation.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {reservations.length === 0 && !fetchError && (
                        <div className="p-12 text-center">
                            <p className="text-gray-500 text-lg">No reservations found.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar */}
            <div
                className={`fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${sidebarOpen ? "translate-x-0" : "translate-x-full"
                    } border-l-4 border-[#A9780F]`}
            >
                {selectedReservation && (
                    <div className="h-full flex flex-col">
                        {/* Header */}
                        <div className="bg-[#131E29] p-6 flex items-center justify-between">
                            <h2 className="text-2xl font-bold text-white">Detalles de Reserva</h2>
                            <button
                                onClick={closeSidebar}
                                className="text-white hover:text-[#A9780F] transition-colors"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Status Section */}
                            <div className={`bg-gray-50 rounded-lg p-4 border-2 border-[#A9780F] ${selectedReservation.status === "approved" ? "hidden" : ""}`}>
                                <h3 className="text-sm font-bold text-black mb-3 uppercase">Confirmar</h3>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            updateStatus("approved")
                                            closeSidebar()
                                        }}
                                        disabled={updatingStatus}
                                        className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${selectedReservation.status === "approved"
                                            ? "bg-green-500 text-white shadow-lg"
                                            : "bg-white border-2 border-green-300 text-green-700 hover:bg-green-50"
                                            } disabled:opacity-50`}
                                    >
                                        <CheckCircle2 size={18} />
                                        Aprobar
                                    </button>
                                </div>
                            </div>

                            {/* Client Info */}
                            <div>
                                <h3 className="text-sm font-bold text-black mb-3 uppercase border-b-2 border-[#A9780F] pb-2">
                                    {selectedReservation.client_type_label}
                                </h3>
                                <div className="space-y-2">
                                    <DetailRow label="Nombre / Razón Social" value={selectedReservation.client_name} />
                                    <DetailRow label={selectedReservation.identification_label} value={selectedReservation.identification_value} />

                                    {selectedReservation.email && (
                                        <DetailRow label="Email" value={selectedReservation.email} />
                                    )}

                                    {/* Additional Individual Fields */}
                                    {selectedReservation.raw_fisica && (
                                        <>
                                            <DetailRow label="Género" value={selectedReservation.raw_fisica.gender || '-'} />
                                            <DetailRow label="Nacionalidad" value={selectedReservation.raw_fisica.nationality || '-'} />
                                            <DetailRow label="Estado Civil" value={selectedReservation.raw_fisica.marital_status || '-'} />
                                            <DetailRow label="Ocupación" value={selectedReservation.raw_fisica.occupation || '-'} />
                                        </>
                                    )}

                                    {/* Additional Corporate Fields */}
                                    {selectedReservation.raw_juridica && (
                                        <>
                                            <DetailRow label="Tipo Empresa" value={selectedReservation.raw_juridica.company_type || '-'} />
                                            <DetailRow label="Rep. Legal" value={selectedReservation.raw_juridica.rep_name || '-'} />
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <h3 className="text-sm font-bold text-black mb-3 uppercase border-b-2 border-[#A9780F] pb-2">
                                    Dirección
                                </h3>
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-900">{selectedReservation.address_display}</p>
                                </div>
                            </div>

                            {/* Unit Info (Enhanced) */}
                            {selectedReservation.unit_code && (
                                <div>
                                    <h3 className="text-sm font-bold text-black mb-3 uppercase border-b-2 border-[#A9780F] pb-2">
                                        Información de Unidad
                                    </h3>
                                    <div className="space-y-2">
                                        <DetailRow label="Código" value={selectedReservation.unit_code} />

                                        {selectedReservation.locale_details ? (
                                            <>
                                                <DetailRow label="Nivel" value={selectedReservation.locale_details.level.toString()} />
                                                <DetailRow label="Área" value={`${selectedReservation.locale_details.area_mt2} mt²`} />
                                                <DetailRow
                                                    label="Precio / mt²"
                                                    value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedReservation.locale_details.price_per_mt2)}
                                                />
                                                <DetailRow
                                                    label="Valor Total"
                                                    value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedReservation.locale_details.total_value)}
                                                    highlight
                                                />
                                                <DetailRow label="Estado Actual" value={selectedReservation.locale_details.status} />
                                            </>
                                        ) : (
                                            <p className="text-sm text-yellow-600 italic">Detalles adicionales del local no disponibles en la base de datos.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Product & Payment */}
                            <div>
                                <h3 className="text-sm font-bold text-black mb-3 uppercase border-b-2 border-[#A9780F] pb-2">
                                    Producto & Pago
                                </h3>
                                <div className="space-y-2">
                                    <DetailRow label="Producto" value={selectedReservation.product_name} />
                                    <DetailRow label="Moneda" value={selectedReservation.currency} />
                                    <DetailRow
                                        label="Monto Reserva"
                                        value={new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedReservation.currency || 'USD' }).format(selectedReservation.amount)}
                                        highlight
                                    />
                                    <DetailRow label="Método de Pago" value={selectedReservation.payment_method} />
                                    {selectedReservation.bank_name && (
                                        <DetailRow label="Banco" value={selectedReservation.bank_name} />
                                    )}
                                </div>
                            </div>

                            {/* Payment Receipt */}
                            {selectedReservation.receipt_url && (
                                <div>
                                    <h3 className="text-sm font-bold text-black mb-3 uppercase border-b-2 border-[#A9780F] pb-2">
                                        Comprobante de Pago
                                    </h3>
                                    <div className="mt-2">
                                        {selectedReservation.receipt_url.toLowerCase().endsWith('.pdf') ? (
                                            // PDF Display
                                            <a
                                                href={selectedReservation.receipt_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block w-full"
                                            >
                                                <div className="relative h-48 w-full bg-gray-100 rounded-lg overflow-hidden border-2 border-[#A9780F] hover:border-[#8e650c] transition-colors flex items-center justify-center group cursor-pointer">
                                                    <div className="text-center px-6">
                                                        <svg
                                                            className="w-16 h-16 mx-auto mb-3 text-[#A9780F] group-hover:scale-110 transition-transform"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                                            />
                                                        </svg>
                                                        <p className="text-sm font-bold text-gray-900 mb-1">
                                                            Comprobante PDF
                                                        </p>
                                                        <p className="text-xs text-gray-600 group-hover:text-[#A9780F] transition-colors">
                                                            Clic para ver documento
                                                        </p>
                                                    </div>
                                                </div>
                                            </a>
                                        ) : (
                                            // Image Display
                                            <a href={selectedReservation.receipt_url} target="_blank" rel="noopener noreferrer" className="block relative group cursor-zoom-in">
                                                <div className="relative h-48 w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                                    <img
                                                        src={selectedReservation.receipt_url}
                                                        alt="Comprobante de pago"
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                        <div className="opacity-0 group-hover:opacity-100 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm transition-all transform translate-y-2 group-hover:translate-y-0">
                                                            Clic para ampliar
                                                        </div>
                                                    </div>
                                                </div>
                                            </a>
                                        )}
                                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                            <Clock size={12} />
                                            Subido el {new Date(selectedReservation.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                )}
            </div>

            {/* Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
                    onClick={closeSidebar}
                />
            )}
        </div>
    );
}

function DetailRow({
    label,
    value,
    highlight = false,
}: {
    label: string;
    value: string;
    highlight?: boolean;
}) {
    return (
        <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-sm text-gray-600 font-medium">{label}:</span>
            <span
                className={`text-sm font-semibold ${highlight ? "text-[#A9780F]" : "text-gray-900"
                    }`}
            >
                {value}
            </span>
        </div>
    );
}
