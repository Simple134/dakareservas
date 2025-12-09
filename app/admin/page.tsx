"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/src/lib/supabase/client";
import { Database } from "@/src/types/supabase";
import Login from "@/src/components/Login";
import { LogOut, X, CheckCircle2, Clock } from "lucide-react";

type Reservation = Database["public"]["Tables"]["reservations"]["Row"];

export default function AdminPage() {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
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
                .from("reservations")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;
            setReservations(data || []);
        } catch (err: any) {
            setFetchError(err.message);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const handleRowClick = (reservation: Reservation) => {
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
            // 1. Update Reservation Status
            const { error: reservationError } = await supabase
                .from("reservations")
                .update({ status: newStatus })
                .eq("id", selectedReservation.id);

            if (reservationError) throw reservationError;

            // 2. If Approving AND unit_code exists, update Locale Status to 'VENDIDO'
            if (newStatus === "approved" && selectedReservation.unit_code) {
                const { error: localeError } = await supabase
                    .from("locales")
                    .update({ status: "VENDIDO" })
                    .eq("id", parseInt(selectedReservation.unit_code)); // unit_code is the locale ID

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
                                        Cliente
                                    </th>
                                    <th
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700"
                                    >
                                        Cedula
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
                                            {reservation.first_name
                                                ? `${reservation.first_name} ${reservation.last_name}`
                                                : reservation.company_name || "N/A"}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                            {reservation.identification ||
                                                reservation.rnc ||
                                                reservation.passport ||
                                                "N/A"}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                            {reservation.product || "-"}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                            {reservation.payment_method || "-"}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-[#A9780F]">
                                            {reservation.reservation_amount
                                                ? `$${reservation.reservation_amount.toLocaleString()}`
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
                                    {selectedReservation.client_type === "fisica" ? "Información Personal" : "Información de Empresa"}
                                </h3>
                                <div className="space-y-2">
                                    {selectedReservation.first_name && (
                                        <DetailRow label="Nombre" value={`${selectedReservation.first_name} ${selectedReservation.last_name}`} />
                                    )}
                                    {selectedReservation.company_name && (
                                        <DetailRow label="Empresa" value={selectedReservation.company_name} />
                                    )}
                                    {selectedReservation.identification && (
                                        <DetailRow label="Cédula" value={selectedReservation.identification} />
                                    )}
                                    {selectedReservation.rnc && (
                                        <DetailRow label="RNC" value={selectedReservation.rnc} />
                                    )}
                                    {selectedReservation.passport && (
                                        <DetailRow label="Pasaporte" value={selectedReservation.passport} />
                                    )}
                                    {selectedReservation.gender && (
                                        <DetailRow label="Género" value={selectedReservation.gender} />
                                    )}
                                    {selectedReservation.nationality && (
                                        <DetailRow label="Nacionalidad" value={selectedReservation.nationality} />
                                    )}
                                    {selectedReservation.marital_status && (
                                        <DetailRow label="Estado Civil" value={selectedReservation.marital_status} />
                                    )}
                                    {selectedReservation.occupation && (
                                        <DetailRow label="Ocupación" value={selectedReservation.occupation} />
                                    )}
                                </div>
                            </div>

                            {/* Address */}
                            {selectedReservation.address_street && (
                                <div>
                                    <h3 className="text-sm font-bold text-black mb-3 uppercase border-b-2 border-[#A9780F] pb-2">
                                        Dirección
                                    </h3>
                                    <div className="space-y-2">
                                        <DetailRow label="Calle" value={selectedReservation.address_street} />
                                        {selectedReservation.address_house && (
                                            <DetailRow label="Casa #" value={selectedReservation.address_house} />
                                        )}
                                        {selectedReservation.address_sector && (
                                            <DetailRow label="Sector" value={selectedReservation.address_sector} />
                                        )}
                                        {selectedReservation.address_municipality && (
                                            <DetailRow label="Municipio" value={selectedReservation.address_municipality} />
                                        )}
                                        {selectedReservation.address_province && (
                                            <DetailRow label="Provincia" value={selectedReservation.address_province} />
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
                                    {selectedReservation.product && (
                                        <DetailRow label="Producto" value={selectedReservation.product} />
                                    )}
                                    {selectedReservation.reservation_amount && (
                                        <DetailRow
                                            label="Monto"
                                            value={`$${selectedReservation.reservation_amount.toLocaleString()}`}
                                            highlight
                                        />
                                    )}
                                    {selectedReservation.payment_method && (
                                        <DetailRow label="Método de Pago" value={selectedReservation.payment_method} />
                                    )}
                                    {selectedReservation.bank_name && (
                                        <DetailRow label="Banco" value={selectedReservation.bank_name} />
                                    )}
                                    {selectedReservation.transaction_number && (
                                        <DetailRow label="# Transacción" value={selectedReservation.transaction_number} />
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
                                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                            <Clock size={12} />
                                            Subido el {new Date(selectedReservation.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Unit Info */}
                            {selectedReservation.unit_code && (
                                <div>
                                    <h3 className="text-sm font-bold text-black mb-3 uppercase border-b-2 border-[#A9780F] pb-2">
                                        Información de Unidad
                                    </h3>
                                    <div className="space-y-2">
                                        <DetailRow label="Código" value={selectedReservation.unit_code} />
                                        {selectedReservation.unit_level && (
                                            <DetailRow label="Nivel" value={selectedReservation.unit_level} />
                                        )}
                                        {selectedReservation.unit_meters && (
                                            <DetailRow label="Metros²" value={selectedReservation.unit_meters} />
                                        )}
                                        {selectedReservation.unit_parking && (
                                            <DetailRow label="Parqueo" value={selectedReservation.unit_parking} />
                                        )}
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
