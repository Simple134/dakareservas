"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/src/lib/supabase/client";
import { Database, Tables } from "@/src/types/supabase";
import Login from "@/src/components/Login";
import AlertModal, { AlertType } from "@/src/components/AlertModal";
import { LogOut, X, CheckCircle2, Clock, Trash2, Save, Search } from "lucide-react";
import { ReservationViewModel } from "@/src/types/ReservationsTypes";
import DetailRow from "@/src/lib/DetailRow";
import { SidebarLocales, SidebarReservation } from "@/src/components/Sidebar";

type ProductAllocationResponse = Tables<'product_allocations'> & {
    product: { name: string } | null;
    locales: Tables<'locales'> | null;
    persona_fisica: Tables<'persona_fisica'> | null;
    persona_juridica: Tables<'persona_juridica'> | null;
    locales_id?: number | null;
};


export default function AdminPage() {
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [reservations, setReservations] = useState<ReservationViewModel[]>([]);
    const [locales, setLocales] = useState<Tables<'locales'>[]>([]);
    const [products, setProducts] = useState<Tables<'products'>[]>([]);
    const [view, setView] = useState<'reservations' | 'locales'>('reservations');
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [selectedReservation, setSelectedReservation] = useState<ReservationViewModel | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Payment Edit State
    const [editAmount, setEditAmount] = useState<string>('');
    const [editCurrency, setEditCurrency] = useState<string>('USD');
    const [editPaymentMethod, setEditPaymentMethod] = useState<string>('');
    const [editReceiptFile, setEditReceiptFile] = useState<File | null>(null);

    // Filters for Locales
    const [levelFilter, setLevelFilter] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [minPriceFilter, setMinPriceFilter] = useState<string>("");
    const [maxPriceFilter, setMaxPriceFilter] = useState<string>("");

    // Filters for Reservations
    const [searchQuery, setSearchQuery] = useState("");
    const [resFilterProduct, setResFilterProduct] = useState("all");
    const [resFilterCurrency, setResFilterCurrency] = useState("all");
    const [resFilterPaymentMethod, setResFilterPaymentMethod] = useState("all");
    const [resFilterStatus, setResFilterStatus] = useState("all");

    // Locale Management State
    const [selectedLocale, setSelectedLocale] = useState<Tables<'locales'> | null>(null);
    const [localeOwner, setLocaleOwner] = useState<any | null>(null);
    const [availableUsers, setAvailableUsers] = useState<any[]>([]);
    const [assignTab, setAssignTab] = useState<'existing' | 'new'>('existing');
    const [newUserType, setNewUserType] = useState<'fisica' | 'juridica'>('fisica');
    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [newUserForm, setNewUserForm] = useState({
        firstName: '',
        lastName: '',
        identification: '',
        companyName: '',
        rnc: '',
        email: ''
    });

    // Alert Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        title: '',
        message: '',
        type: 'info' as AlertType,
        isConfirm: false,
        onConfirm: () => { }
    });

    const showAlert = (title: string, message: string, type: AlertType = 'info') => {
        setModalConfig({
            title,
            message,
            type,
            isConfirm: false,
            onConfirm: () => { }
        });
        setModalOpen(true);
    };

    const showConfirm = (title: string, message: string, onConfirm: () => void) => {
        setModalConfig({
            title,
            message,
            type: 'warning',
            isConfirm: true,
            onConfirm: () => {
                onConfirm();
                setModalOpen(false);
            }
        });
        setModalOpen(true);
    };

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
            fetchLocales();
            fetchProducts();
        }
    }, [session]);

    useEffect(() => {
        if (view === 'locales' && session) {
            fetchAvailableUsers();
        }
    }, [view, session]);

    const fetchReservations = async () => {
        try {
            const { data, error } = await supabase
                .from("product_allocations")
                .select(`
                    *,
                    product:products(name),
                    locales(*),
                    persona_fisica(*),
                    persona_juridica(*)
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

                    const locale = item.locales;

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
                        transaction_number: null,
                        email: pf.email,
                        address_display: addressParts,
                        unit_code: pf.unit_code,
                        locale_id: item.locales_id ?? null,
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

                    const locale = item.locales;

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
                        locale_id: item.locales_id ?? null,
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
            console.error("Error fetching reservations:", err);
            setFetchError(err.message);
        }
    };

    const fetchLocales = async () => {
        try {
            const { data, error } = await supabase
                .from("locales")
                .select("*")
                .order("id", { ascending: true });

            if (error) throw error;
            setLocales(data || []);
        } catch (err: any) {
            console.error("Error fetching locales:", err);
        }
    };

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from("products")
                .select("*")
                .order("name", { ascending: true });

            if (error) throw error;
            setProducts(data || []);
        } catch (err: any) {
            console.error("Error fetching products:", err);
        }
    }

    const fetchAvailableUsers = async () => {
        try {
            // Need to verify schema of persona_fisica and juridica to make sure we select correct fields
            const { data: fisica } = await supabase.from('persona_fisica').select('id, first_name, last_name, identification, passport, email');
            const { data: juridica } = await supabase.from('persona_juridica').select('id, company_name, rnc, email');

            const uniqueUsersMap = new Map();

            (fisica || []).forEach(f => {
                const id = f.identification || f.passport;
                if (id && !uniqueUsersMap.has(id)) {
                    uniqueUsersMap.set(id, {
                        ...f,
                        type: 'fisica',
                        label: `${f.first_name || ''} ${f.last_name || ''} (${id})`.trim()
                    });
                }
            });

            (juridica || []).forEach(j => {
                const id = j.rnc;
                if (id && !uniqueUsersMap.has(id)) {
                    uniqueUsersMap.set(id, {
                        ...j,
                        type: 'juridica',
                        label: `${j.company_name} (${id})`
                    });
                }
            });

            setAvailableUsers(Array.from(uniqueUsersMap.values()));
        } catch (error) {
            console.error("Error fetching users", error);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    // Reservation Handlers
    const handleRowClick = (reservation: ReservationViewModel) => {
        setSelectedReservation(reservation);

        // Init edit state
        setEditAmount(reservation.amount?.toString() || '');
        setEditCurrency(reservation.currency || 'USD');
        setEditPaymentMethod(reservation.payment_method || '');
        setEditReceiptFile(null);

        setSelectedLocale(null);
        setSidebarOpen(true);
    };

    // Locale Handlers
    const handleLocaleClick = async (locale: Tables<'locales'>) => {
        setSelectedLocale(locale);
        setSelectedReservation(null);
        setLocaleOwner(null);
        setSidebarOpen(true);
        setSelectedProductId("");

        // Fetch owner logic if not available
        if (locale.status !== 'DISPONIBLE') {
            // Find the allocation for this locale
            const { data: allocation } = await supabase
                .from('product_allocations')
                .select(`
                    *,
                    persona_fisica(*),
                    persona_juridica(*)
                `)
                .eq('locales_id', locale.id)
                .in('status', ['approved', 'pending']) // Assuming these are the "active" statuses
                .maybeSingle();

            if (allocation) {
                if (allocation.persona_fisica) {
                    setLocaleOwner({ ...allocation.persona_fisica, type: 'fisica', allocation_id: allocation.id });
                } else if (allocation.persona_juridica) {
                    setLocaleOwner({ ...allocation.persona_juridica, type: 'juridica', allocation_id: allocation.id });
                }
            }
        }
    };

    const closeSidebar = () => {
        setSidebarOpen(false);
        setTimeout(() => {
            setSelectedReservation(null);
            setSelectedLocale(null);
            setLocaleOwner(null);
            // Reset forms
            setNewUserForm({
                firstName: '',
                lastName: '',
                identification: '',
                companyName: '',
                rnc: '',
                email: ''
            });
            setEditAmount('');
            setEditCurrency('USD');
            setEditPaymentMethod('');
            setEditReceiptFile(null);
            setSelectedProductId("");
        }, 300);
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
                    showAlert("Advertencia", "Reserva aprobada, pero hubo un error actualizando el estado del local: " + localeError.message, 'warning');
                } else {
                    setLocales(prev => prev.map(l => l.id === selectedReservation.locale_id ? { ...l, status: "VENDIDO" } : l));
                }
            }

            setReservations((prev) =>
                prev.map((r) =>
                    r.id === selectedReservation.id ? { ...r, status: newStatus } : r
                )
            );
            setSelectedReservation({ ...selectedReservation, status: newStatus });
        } catch (err: any) {
            showAlert("Error", "Error updating status: " + err.message, 'error');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const deleteReservation = () => {
        if (!selectedReservation) return;
        setSidebarOpen(false);

        showConfirm(
            "Eliminar Reserva",
            "¿Estás seguro de eliminar esta reserva? Esta acción no se puede deshacer.",
            async () => {
                setUpdatingStatus(true);
                try {
                    const { error } = await supabase
                        .from("product_allocations")
                        .delete()
                        .eq("id", selectedReservation.id);

                    if (error) throw error;

                    setReservations(prev => prev.filter(r => r.id !== selectedReservation.id));
                    closeSidebar();
                    showAlert("Éxito", "Reserva eliminada.", 'success');
                } catch (err: any) {
                    showAlert("Error", "Error eliminando reserva: " + err.message, 'error');
                } finally {
                    setUpdatingStatus(false);
                }
            }
        );
    };

    const handleUpdatePaymentInfo = async () => {
        if (!selectedReservation) return;
        setUpdatingStatus(true);
        try {
            let receiptUrl = selectedReservation.receipt_url;

            if (editReceiptFile) {
                const fileExt = editReceiptFile.name.split('.').pop();
                const fileName = `${selectedReservation.id}-${Math.random()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('receipts')
                    .upload(fileName, editReceiptFile);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('receipts')
                    .getPublicUrl(fileName);

                receiptUrl = publicUrlData.publicUrl;
            }

            const updates: any = {
                amount: parseFloat(editAmount) || 0,
                currency: editCurrency,
                payment_method: editPaymentMethod,
                receipt_url: receiptUrl
            };

            const { error } = await supabase
                .from('product_allocations')
                .update(updates)
                .eq('id', selectedReservation.id);

            if (error) throw error;

            // Updates local
            const updatedReservation = { ...selectedReservation, ...updates };

            setReservations(prev => prev.map(r => r.id === selectedReservation.id ? updatedReservation : r));
            setSelectedReservation(updatedReservation);
            setEditReceiptFile(null);

            showAlert("Éxito", "Información de pago actualizada correctamente.", 'success');
        } catch (error: any) {
            console.error(error);
            showAlert("Error", "Error actualizando pago: " + error.message, 'error');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const assignLocaleToUser = async (userId: string, type: 'fisica' | 'juridica') => {
        if (!selectedLocale) return;
        if (!selectedProductId) {
            showAlert("Atención", "Por favor seleccione un producto para la reserva.", 'warning');
            return;
        }
        setSidebarOpen(false);
        setUpdatingStatus(true);
        try {
            // Create Product Allocation
            const { error: allocError } = await supabase.from('product_allocations').insert({
                product_id: selectedProductId,
                user_type: type,
                status: 'pending', // Admin manual assignment assumed approved
                persona_fisica_id: type === 'fisica' ? userId : null,
                persona_juridica_id: type === 'juridica' ? userId : null,
                amount: 0, // Should probably be input, but creating with 0 for now as manual assignment
                currency: 'USD',
                locales_id: selectedLocale.id
            });

            if (allocError) throw allocError;

            if (selectedLocale.status === 'DISPONIBLE') {
                await supabase.from('locales').update({ status: 'BLOQUEADO' }).eq('id', selectedLocale.id);
                setLocales(prev => prev.map(l => l.id === selectedLocale.id ? { ...l, status: 'BLOQUEADO' } : l));
            }

            await handleLocaleClick({ ...selectedLocale, status: selectedLocale.status === 'DISPONIBLE' ? 'BLOQUEADO' : selectedLocale.status });
            await fetchReservations();
            await fetchLocales();
            showAlert("Éxito", "Usuario asignado y reserva creada correctamente", 'success');
        } catch (e: any) {
            console.error(e);
            showAlert("Error", "Error asignando usuario: " + e.message, 'error');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const createAndAssignUser = async () => {
        if (!selectedLocale) return;
        if (!selectedProductId) {
            showAlert("Atención", "Por favor seleccione un producto para la reserva.", 'warning');
            return;
        }
        setSidebarOpen(false);
        setUpdatingStatus(true);
        try {
            let error;
            let newUserId = "";

            if (newUserType === 'fisica') {
                const { data, error: err } = await supabase.from('persona_fisica').insert({
                    first_name: newUserForm.firstName,
                    last_name: newUserForm.lastName,
                    identification: newUserForm.identification,
                    email: newUserForm.email,
                    // locale_id removed
                    status: 'active'
                }).select('id').single();
                error = err;
                if (data) newUserId = data.id;
            } else {
                const { data, error: err } = await supabase.from('persona_juridica').insert({
                    company_name: newUserForm.companyName,
                    rnc: newUserForm.rnc,
                    email: newUserForm.email,
                    // locale_id removed
                    status: 'active'
                }).select('id').single();
                error = err;
                if (data) newUserId = data.id;
            }

            if (error) throw error;

            // Create Product Allocation
            const { error: allocError } = await supabase.from('product_allocations').insert({
                product_id: selectedProductId,
                user_type: newUserType,
                status: 'pending', // Admin manual creation
                persona_fisica_id: newUserType === 'fisica' ? newUserId : null,
                persona_juridica_id: newUserType === 'juridica' ? newUserId : null,
                amount: 0,
                currency: 'USD',
                locales_id: selectedLocale.id
            });

            if (allocError) throw allocError;

            if (selectedLocale.status === 'DISPONIBLE') {
                await supabase.from('locales').update({ status: 'BLOQUEADO' }).eq('id', selectedLocale.id);
                setLocales(prev => prev.map(l => l.id === selectedLocale.id ? { ...l, status: 'BLOQUEADO' } : l));
            }

            // Refresh logic
            await handleLocaleClick({ ...selectedLocale, status: selectedLocale.status === 'DISPONIBLE' ? 'BLOQUEADO' : selectedLocale.status });
            await fetchReservations();
            await fetchLocales();
            showAlert("Éxito", "Usuario creado, asignado y reserva generada correctamente", 'success');
        } catch (e: any) {
            console.error(e);
            showAlert("Error", "Error creando usuario: " + e.message, 'error');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleUnassignUser = () => {
        if (!localeOwner || !selectedLocale) return;

        showConfirm(
            "Desvincular Usuario",
            "¿Estás seguro de desvincular este usuario?",
            async () => {
                // If we display localeOwner it comes from an allocation now (see handleLocaleClick)
                if (!localeOwner.allocation_id) {
                    showAlert("Error", "No se encontró la reserva asociada para desvincular.", 'error');
                    return;
                }

                // Delete the allocation
                const { error } = await supabase
                    .from('product_allocations')
                    .delete()
                    .eq('id', localeOwner.allocation_id);

                if (error) {
                    showAlert("Error", "Error desvinculando usuario: " + error.message, 'error');
                    return;
                }

                setLocaleOwner(null);

                // Update locale status to DISPONIBLE
                const { error: localeError } = await supabase.from('locales').update({ status: 'DISPONIBLE' }).eq('id', selectedLocale.id);
                if (localeError) {
                    showAlert("Advertencia", "Usuario desvinculado, pero hubo un error actualizando el estado del local: " + localeError.message, 'warning');
                }

                setLocales(prev => prev.map(l => l.id === selectedLocale.id ? { ...l, status: 'DISPONIBLE' } : l));
                await handleLocaleClick({ ...selectedLocale, status: 'DISPONIBLE' });
                await fetchReservations();
                await fetchLocales();
                showAlert("Éxito", "Usuario desvinculado correctamente.", 'success');
            }
        );
    };

    // Filter Logic
    const filteredLocales = locales.filter(locale => {
        if (levelFilter !== "all" && locale.level.toString() !== levelFilter) return false;
        if (statusFilter !== "all" && locale.status.toLowerCase() !== statusFilter.toLowerCase()) return false;
        if (minPriceFilter && locale.total_value < parseFloat(minPriceFilter)) return false;
        if (maxPriceFilter && locale.total_value > parseFloat(maxPriceFilter)) return false;
        return true;
    });

    const uniqueLevels = Array.from(new Set(locales.map(l => l.level))).sort((a, b) => a - b);
    const uniqueStatuses = Array.from(new Set(locales.map(l => l.status))).sort();

    // Filter Logic for Reservations
    const filteredReservations = reservations.filter(res => {
        const matchesSearch =
            res.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            res.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            res.identification_value.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesProduct = resFilterProduct === "all" || res.product_name === resFilterProduct;
        const matchesCurrency = resFilterCurrency === "all" || res.currency === resFilterCurrency;
        const matchesPayment = resFilterPaymentMethod === "all" || res.payment_method === resFilterPaymentMethod;
        const matchesStatus = resFilterStatus === "all" || res.status === resFilterStatus;

        return matchesSearch && matchesProduct && matchesCurrency && matchesPayment && matchesStatus;
    });

    const uniqueResProducts = Array.from(new Set(reservations.map(r => r.product_name))).filter(Boolean).sort();
    const uniqueResCurrencies = Array.from(new Set(reservations.map(r => r.currency))).filter(Boolean).sort();
    const uniqueResPaymentMethods = Array.from(new Set(reservations.map(r => r.payment_method))).filter(Boolean).sort();
    const uniqueResStatuses = Array.from(new Set(reservations.map(r => r.status))).filter(Boolean).sort();

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
                <div className="flex flex-col md:flex-row items-center justify-between p-4 mb-6">
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
                    <div className="flex items-center gap-4">
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            <button
                                onClick={() => setView('reservations')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'reservations'
                                    ? 'bg-white text-[#A9780F] shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                Reservas <span className="ml-1 text-xs bg-gray-200 px-2 py-0.5 rounded-full">{reservations.length}</span>
                            </button>
                            <button
                                onClick={() => setView('locales')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'locales'
                                    ? 'bg-white text-[#A9780F] shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                Locales <span className="ml-1 text-xs bg-gray-200 px-2 py-0.5 rounded-full">{locales.length}</span>
                            </button>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="h-6 w-6 text-[#A9780F] hover:text-[#8e650c] transition-colors"
                        >
                            <LogOut />
                        </button>
                    </div>
                </div>

                {fetchError && (
                    <div className="mb-4 rounded-md bg-red-900/50 p-4 text-red-200 border border-red-700">
                        Error fetching reservations: {fetchError}
                    </div>
                )}

                {view === 'reservations' ? (
                    <div className="space-y-6">
                        {/* Reservation Filters */}
                        <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Buscar</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Nombre, ID, Identificación..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="block w-full pl-8 py-2 text-black rounded-md border-gray-300 shadow-sm focus:border-[#A9780F] focus:ring-[#A9780F] sm:text-sm  border"
                                    />
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-4 w-4 text-gray-400" />
                                    </div>
                                </div>
                            </div>
                            <div className="md:w-48">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Producto</label>
                                <select
                                    value={resFilterProduct}
                                    onChange={(e) => setResFilterProduct(e.target.value)}
                                    className="block w-full text-black rounded-md border-gray-300 shadow-sm focus:border-[#A9780F] focus:ring-[#A9780F] sm:text-sm p-2 border"
                                >
                                    <option value="all">Todos</option>
                                    {uniqueResProducts.map(p => (
                                        <option key={p} value={p || ""}>{p}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:w-32">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Moneda</label>
                                <select
                                    value={resFilterCurrency}
                                    onChange={(e) => setResFilterCurrency(e.target.value)}
                                    className="block w-full text-black rounded-md border-gray-300 shadow-sm focus:border-[#A9780F] focus:ring-[#A9780F] sm:text-sm p-2 border"
                                >
                                    <option value="all">Todas</option>
                                    {uniqueResCurrencies.map(c => (
                                        <option key={c} value={c || ""}>{c}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:w-40">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Método Pago</label>
                                <select
                                    value={resFilterPaymentMethod}
                                    onChange={(e) => setResFilterPaymentMethod(e.target.value)}
                                    className="block w-full text-black rounded-md border-gray-300 shadow-sm focus:border-[#A9780F] focus:ring-[#A9780F] sm:text-sm p-2 border"
                                >
                                    <option value="all">Todos</option>
                                    {uniqueResPaymentMethods.map(m => (
                                        <option key={m} value={m || ""}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:w-40">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={resFilterStatus}
                                    onChange={(e) => setResFilterStatus(e.target.value)}
                                    className="block w-full text-black rounded-md border-gray-300 shadow-sm focus:border-[#A9780F] focus:ring-[#A9780F] sm:text-sm p-2 border"
                                >
                                    <option value="all">Todos</option>
                                    {uniqueResStatuses.map(s => (
                                        <option key={s} value={s || ""}>{s}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-xl bg-white shadow-2xl border-2 border-[#A9780F]">
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-black">Listado de Reservas</h3>
                                <span className="text-sm font-medium text-gray-500">Total: {filteredReservations.length}</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Fecha</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Cliente / Empresa</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">ID</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Producto</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Moneda</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Método Pago</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Precio</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {filteredReservations.map((reservation) => (
                                            <tr
                                                key={reservation.id}
                                                onClick={() => handleRowClick(reservation)}
                                                className="hover:bg-gray-50 transition-colors cursor-pointer"
                                            >
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{new Date(reservation.created_at).toLocaleDateString()}</td>
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
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{reservation.product_name || "-"}</td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{reservation.currency || "USD"}</td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{reservation.payment_method || "-"}</td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-[#A9780F]">
                                                    {reservation.amount
                                                        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: reservation.currency || 'USD' }).format(reservation.amount)
                                                        : "-"}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4">
                                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${reservation.status === "approved"
                                                        ? "bg-green-100 text-green-800"
                                                        : reservation.status === "pending"
                                                            ? "bg-yellow-100 text-yellow-800"
                                                            : "bg-red-100 text-red-800"
                                                        }`}>
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
                ) : (
                    <div className="space-y-6">
                        <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Nivel</label>
                                <select
                                    value={levelFilter}
                                    onChange={(e) => setLevelFilter(e.target.value)}
                                    className="block w-full text-black rounded-md border-gray-300 shadow-sm focus:border-[#A9780F] focus:ring-[#A9780F] sm:text-sm p-3 border"
                                >
                                    <option value="all">Todos</option>
                                    {uniqueLevels.map(level => (
                                        <option key={level} value={level.toString()}>{level}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="block w-full text-black rounded-md border-gray-300 shadow-sm focus:border-[#A9780F] focus:ring-[#A9780F] sm:text-sm p-3 border"
                                >
                                    <option value="all">Todos</option>
                                    {uniqueStatuses.map(status => (
                                        <option key={status} value={status}>{status}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Precio Min</label>
                                <input
                                    type="number"
                                    placeholder="Min"
                                    value={minPriceFilter}
                                    onChange={(e) => setMinPriceFilter(e.target.value)}
                                    className="block w-full text-black rounded-md border-gray-300 shadow-sm focus:border-[#A9780F] focus:ring-[#A9780F] sm:text-sm p-3 border"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Precio Max</label>
                                <input
                                    type="number"
                                    placeholder="Max"
                                    value={maxPriceFilter}
                                    onChange={(e) => setMaxPriceFilter(e.target.value)}
                                    className="block w-full text-black rounded-md border-gray-300 shadow-sm focus:border-[#A9780F] focus:ring-[#A9780F] sm:text-sm p-3 border"
                                />
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-xl bg-white shadow-2xl border-2 border-[#A9780F]">
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-black">Listado de Locales</h3>
                                <span className="text-sm font-medium text-gray-500">Mostrando: {filteredLocales.length} de {locales.length}</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">ID Local</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Nivel</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Área (m²)</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Precio / m²</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Valor Total</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {filteredLocales.map((locale) => (
                                            <tr
                                                key={locale.id}
                                                className="hover:bg-gray-50 transition-colors cursor-pointer"
                                                onClick={() => handleLocaleClick(locale)}
                                            >
                                                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">{locale.id}</td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{locale.level}</td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{locale.area_mt2}</td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(locale.price_per_mt2)}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-[#A9780F]">
                                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(locale.total_value)}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4">
                                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${locale.status?.toLowerCase().includes('disponible') ? "bg-green-100 text-green-800" :
                                                        locale.status?.toLowerCase().includes('vendido') ? "bg-red-100 text-red-800" :
                                                            "bg-yellow-100 text-yellow-800"
                                                        }`}>
                                                        {locale.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {filteredLocales.length === 0 && (
                                <div className="p-12 text-center">
                                    <p className="text-gray-500 text-lg">No locales found matching filters.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Sidebar */}
            <div
                className={`fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${sidebarOpen ? "translate-x-0" : "translate-x-full"} border-l-4 border-[#A9780F]`}
            >
                {/* RESERVATION DETAIL SIDEBAR */}
                {selectedReservation && (
                    <SidebarReservation
                        selectedReservation={selectedReservation}
                        closeSidebar={closeSidebar}
                        updateStatus={updateStatus}
                        updatingStatus={updatingStatus}
                        deleteReservation={deleteReservation}
                        editCurrency={editCurrency}
                        setEditCurrency={setEditCurrency}
                        editAmount={editAmount}
                        setEditAmount={setEditAmount}
                        editPaymentMethod={editPaymentMethod}
                        setEditPaymentMethod={setEditPaymentMethod}
                        editReceiptFile={editReceiptFile}
                        setEditReceiptFile={setEditReceiptFile}
                        handleUpdatePaymentInfo={handleUpdatePaymentInfo}
                    />
                )}

                {/* LOCALE DETAIL SIDEBAR */}
                {
                    selectedLocale && (
                        <SidebarLocales
                            selectedLocale={selectedLocale}
                            closeSidebar={closeSidebar}
                            localeOwner={localeOwner}
                            handleUnassignUser={handleUnassignUser}
                            assignTab={assignTab}
                            setAssignTab={setAssignTab}
                            selectedProductId={selectedProductId}
                            setSelectedProductId={setSelectedProductId}
                            products={products}
                            assignLocaleToUser={assignLocaleToUser}
                            availableUsers={availableUsers}
                            newUserType={newUserType}
                            setNewUserType={setNewUserType}
                            newUserForm={newUserForm}
                            setNewUserForm={setNewUserForm}
                            createAndAssignUser={createAndAssignUser}
                            updatingStatus={updatingStatus}

                        />
                    )
                }
            </div >

            {/* Overlay */}
            {
                sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
                        onClick={closeSidebar}
                    />
                )
            }

            <AlertModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onConfirm={modalConfig.onConfirm}
                title={modalConfig.title}
                message={modalConfig.message}
                type={modalConfig.type}
                isConfirm={modalConfig.isConfirm}
            />
        </div >
    );
}

