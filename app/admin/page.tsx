"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/src/lib/supabase/client";
import { Tables } from "@/src/types/supabase";
import AlertModal, { AlertType } from "@/src/components/AlertModal";
import { LogOut, X, Search, User, Building2, Check, Loader2, ExternalLinkIcon } from "lucide-react";
import { ReservationViewModel } from "@/src/types/ReservationsTypes";
import { SidebarReservation, SidebarLocales, SidebarUser } from "@/src/components/Sidebar";
import FisicaForm from "@/src/components/FisicaForm";
import JuridicaForm from "@/src/components/JuridicaForm";
import { inviteUserAction } from "@/src/actions/invite-user";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "next/navigation";
import { sendQuotationAction } from "@/src/actions/send-quotation";
import { profile } from "console";

type ProductAllocationResponse = Tables<'product_allocations'> & {
    product: { name: string } | null;
    locales: Tables<'locales'> | null;
    persona_fisica: Tables<'persona_fisica'> | null;
    persona_juridica: Tables<'persona_juridica'> | null;
    locales_id?: number | null;
    payments?: Tables<'payments'>[];
};

type UserViewModel = {
    id: string | number;
    type: 'fisica' | 'juridica';
    name: string;
    identification: string;
    identification_label: string;
    email: string;
    phone: string;
    address: string;
    status: string;
    hasProfile?: boolean;
    profileId?: string | null;
    raw: any;
};


export default function AdminPage() {
    const { user: session, loading: authLoading } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading) setLoading(false);
    }, [authLoading]);

    const [reservations, setReservations] = useState<ReservationViewModel[]>([]);
    const [locales, setLocales] = useState<Tables<'locales'>[]>([]);
    const [products, setProducts] = useState<Tables<'products'>[]>([]);
    const [view, setView] = useState<'reservations' | 'locales' | 'users'>('reservations');
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [selectedReservation, setSelectedReservation] = useState<ReservationViewModel | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    // Status Update State for Locales table
    const [pendingStatusUpdates, setPendingStatusUpdates] = useState<Record<number, string>>({});

    // Users State
    const [users, setUsers] = useState<UserViewModel[]>([]);
    const [userSearchQuery, setUserSearchQuery] = useState("");
    const [userFilterType, setUserFilterType] = useState("all");
    const [userFilterStatus, setUserFilterStatus] = useState("all");

    // Payment Edit State
    const [editAmount, setEditAmount] = useState<string>('');
    const [editCurrency, setEditCurrency] = useState<string>('USD');
    const [editPaymentMethod, setEditPaymentMethod] = useState<string>('');
    const [editReceiptFile, setEditReceiptFile] = useState<File | null>(null);
    const [editQuotationFile, setEditQuotationFile] = useState<File | null>(null);

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

    // State for User Management
    const [selectedUser, setSelectedUser] = useState<UserViewModel | null>(null);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [addUserType, setAddUserType] = useState<"fisica" | "juridica">("fisica");

    // Locale Management State
    const [selectedLocale, setSelectedLocale] = useState<Tables<'locales'> | null>(null);
    const [localeOwner, setLocaleOwner] = useState<any | null>(null);
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
        if (session) {
            fetchReservations();
            fetchLocales();
            fetchProducts();
            fetchAllUsers();
        }
    }, [session]);

    const fetchReservations = async () => {
        try {
            const { data, error } = await supabase
                .from("product_allocations")
                .select(`
                    *,
                    product:products(name),
                    locales(*),
                    persona_fisica(*),
                    persona_juridica(*),
                    payments(*)
                `)
                .order("created_at", { ascending: false })
                .returns<ProductAllocationResponse[]>();

            if (error) throw error;

            // Fetch all profiles to match with reservations
            const { data: profiles, error: errProfiles } = await supabase
                .from('profiles')
                .select('id, id_fisica, id_juridica');

            if (errProfiles) {
                console.error("Error fetching profiles for reservations:", errProfiles);
            }

            // Create a map for quick profile lookup
            const profileMap = new Map<string, string>(); // persona_id -> profile_id
            (profiles || []).forEach(profile => {
                if (profile.id_fisica) {
                    profileMap.set(profile.id_fisica, profile.id);
                }
                if (profile.id_juridica) {
                    profileMap.set(profile.id_juridica, profile.id);
                }
            });

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
                    const profileId = profileMap.get(pf.id);

                    viewModel = {
                        id: item.id,
                        created_at: item.created_at,
                        status: item.status || 'pending',
                        client_name: `${pf.first_name || ''} ${pf.last_name || ''}`.trim(),
                        client_type_label: "Cliente",
                        identification_label: pf.passport ? "Pasaporte" : "Cédula",
                        identification_value: pf.passport || pf.identification || "N/A",
                        product_name: item.product?.name || "Desconocido",
                        currency: item.currency || "USD",
                        payment_method: item.payment_method || "N/A",
                        cotizacion_url: item.cotizacion_url,
                        transaction_number: null,
                        email: pf.email,
                        address_display: addressParts,
                        unit_code: locale?.id?.toString() || "",
                        locale_id: item.locales_id ?? null,
                        locale_details: locale ? {
                            level: locale.level,
                            area_mt2: locale.area_mt2,
                            price_per_mt2: locale.price_per_mt2,
                            total_value: locale.total_value,
                            status: locale.status
                        } : undefined,
                        raw_fisica: pf,
                        profileId: profileId || null,
                        payments: item.payments || []
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
                    const profileId = profileMap.get(pj.id);

                    viewModel = {
                        id: item.id,
                        created_at: item.created_at,
                        status: item.status || 'pending',
                        client_name: pj.company_name || "Empresa Sin Nombre",
                        client_type_label: "Empresa",
                        identification_label: "RNC",
                        identification_value: pj.rnc || "N/A",
                        product_name: item.product?.name || "Desconocido",
                        currency: item.currency || "USD",
                        payment_method: item.payment_method || "N/A",
                        cotizacion_url: item.cotizacion_url,
                        transaction_number: null,
                        email: pj.email,
                        address_display: addressParts,
                        unit_code: locale?.id?.toString() || "",
                        locale_id: item.locales_id ?? null,
                        locale_details: locale ? {
                            level: locale.level,
                            area_mt2: locale.area_mt2,
                            price_per_mt2: locale.price_per_mt2,
                            total_value: locale.total_value,
                            status: locale.status
                        } : undefined,
                        raw_juridica: pj,
                        profileId: profileId || null,
                        payments: item.payments || []
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

    // fetchAvailableUsers removed - superseded by fetchAllUsers

    const fetchAllUsers = async () => {
        try {
            const { data: fisica, error: errFisica } = await supabase
                .from('persona_fisica')
                .select('*')
            if (errFisica) throw errFisica;

            const { data: juridica, error: errJuridica } = await supabase
                .from('persona_juridica')
                .select('*')
            if (errJuridica) throw errJuridica;

            const usersFisica: UserViewModel[] = (fisica).map(pf => {
                const addressParts = [
                    pf.address_street,
                    pf.address_house ? `#${pf.address_house}` : '',
                    pf.address_sector,
                    pf.address_province
                ].filter(Boolean).join(", ");

                return {
                    id: pf.id,
                    type: 'fisica',
                    name: `${pf.first_name || ''} ${pf.last_name || ''}`.trim(),
                    identification: pf.passport || pf.identification || 'N/A',
                    identification_label: pf.passport ? 'Pasaporte' : 'Cédula',
                    email: pf.email || '',
                    phone: pf.phone || '',
                    address: addressParts,
                    status: pf.status || 'unknown',
                    raw: pf
                };
            });

            const usersJuridica: UserViewModel[] = (juridica || []).map(pj => {
                const addressParts = [
                    pj.company_address_street,
                    pj.company_address_house ? `#${pj.company_address_house}` : '',
                    pj.company_address_sector,
                    pj.company_address_province
                ].filter(Boolean).join(", ");

                return {
                    id: pj.id,
                    type: 'juridica',
                    name: pj.company_name || 'Empresa Sin Nombre',
                    identification: pj.rnc || 'N/A',
                    identification_label: 'RNC',
                    email: pj.email || '',
                    phone: pj.phone || '',
                    address: addressParts,
                    status: pj.status || 'unknown',
                    raw: pj
                };
            });

            const allUsers = [...usersFisica, ...usersJuridica];
            const uniqueUsersMap = new Map<string, UserViewModel>();

            allUsers.forEach(user => {
                const key = (user.identification && user.identification !== 'N/A')
                    ? String(user.identification)
                    : String(user.id);

                if (!uniqueUsersMap.has(key)) {
                    uniqueUsersMap.set(key, user);
                }
            });

            setUsers(Array.from(uniqueUsersMap.values()).sort((a, b) => a.name.localeCompare(b.name)));

        } catch (error: any) {
            console.error("Error fetching all users:", error);
            showAlert("Error", "Error cargando usuarios: " + error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const refreshAppData = async (updatedLocale: Tables<'locales'>) => {
        await handleLocaleClick(updatedLocale);
        await fetchReservations();
        await fetchLocales();
    };

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Error during sign out:", error);
        } finally {
            router.push('/login');
        }
    };

    // Reservation Handlers
    const handleRowClick = (reservation: ReservationViewModel) => {
        setSelectedReservation(reservation);

        // Init edit state
        setEditAmount(''); // Reset to empty to allow adding new payment
        setEditCurrency(reservation.currency || 'USD');
        setEditPaymentMethod(reservation.payment_method || '');

        setEditReceiptFile(null);
        setEditQuotationFile(null);

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

    // User Handlers
    const handleUserClick = (user: UserViewModel) => {
        setSelectedUser(user);
        setSelectedReservation(null);
        setSelectedLocale(null);
        setSidebarOpen(true);
    };

    const handleUpdateUser = async (updatedData: any) => {
        if (!selectedUser) return;
        setUpdatingStatus(true);
        setSidebarOpen(false);
        try {
            const table = selectedUser.type === 'fisica' ? 'persona_fisica' : 'persona_juridica';

            // Remove fields that are not updatable or don't exist in the schema
            const { name, id, created_at, type, identification_label, address, raw, ...payload } = updatedData;


            const { error } = await supabase
                .from(table)
                .update(payload)
                .eq('id', String(selectedUser.id));

            if (error) throw error;

            // Fetch fresh users to ensure UI is in sync
            await fetchAllUsers();

            // Update selected user to reflect changes immediately in the open sidebar
            setSelectedUser((prev: any) => {
                if (!prev) return null;
                const newName = payload.first_name || payload.last_name
                    ? `${payload.first_name || prev.raw.first_name} ${payload.last_name || prev.raw.last_name}`.trim()
                    : payload.company_name || prev.name;

                return {
                    ...prev,
                    ...payload,
                    name: newName,
                    raw: { ...prev.raw, ...payload }
                };
            });

            showAlert("Éxito", "Usuario actualizado correctamente", 'success');
        } catch (error: any) {
            console.error("Error updating user:", error);
            showAlert("Error", "Error actualizando usuario: " + error.message, 'error');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleSendEmail = async () => {
        if (!selectedUser) return;
        setUpdatingStatus(true);
        try {
            const result = await inviteUserAction(selectedUser.email, selectedUser.name);

            if (result.success) {
                showAlert("Éxito", "Invitación enviada correctamente", 'success');
            } else {
                showAlert("Error", "No se pudo enviar la invitación: " + result.message, 'error');
            }
        } catch (error: any) {
            console.error("Error sending email:", error);
            showAlert("Error", "Error enviando correo: " + error.message, 'error');
        } finally {
            setUpdatingStatus(false);
        }
    };


    const handleAddUserSuccess = async () => {
        setIsAddUserModalOpen(false);
        await fetchAllUsers();
        showAlert("Éxito", "Usuario creado correctamente.", "success");
    };

    const closeSidebar = () => {
        setSidebarOpen(false);
        setTimeout(() => {
            setSelectedReservation(null);
            setSelectedLocale(null);
            setSelectedUser(null);
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
            setEditQuotationFile(null);
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

    // Locale Status Manual Update Handlers
    const handleStatusChange = (localeId: number, newStatus: string) => {
        setPendingStatusUpdates(prev => ({
            ...prev,
            [localeId]: newStatus
        }));
    };

    const saveLocaleStatus = async (localeId: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row click
        const newStatus = pendingStatusUpdates[localeId];
        if (!newStatus) return;

        setUpdatingStatus(true);
        try {
            const { error } = await supabase
                .from('locales')
                .update({ status: newStatus })
                .eq('id', localeId);

            if (error) throw error;

            // Update local state
            setLocales(prev => prev.map(l => l.id === localeId ? { ...l, status: newStatus } : l));

            // Clear pending update
            setPendingStatusUpdates(prev => {
                const newState = { ...prev };
                delete newState[localeId];
                return newState;
            });

            showAlert("Éxito", "Estado del local actualizado correctamente.", "success");
        } catch (error: any) {
            console.error("Error updating locale status:", error);
            showAlert("Error", "Error actualizando estado: " + error.message, "error");
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

    const handleUpdatePaymentInfo = async (customAmount?: number, customCurrency?: string) => {
        if (!selectedReservation) return;
        setUpdatingStatus(true);
        try {
            let receiptUrl: string | null = null;
            if (editReceiptFile) {
                const fileExt = editReceiptFile.name.split('.').pop();
                const fileName = `payment-${selectedReservation.id}-${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('receipts')
                    .upload(fileName, editReceiptFile);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage
                    .from('receipts')
                    .getPublicUrl(fileName);

                receiptUrl = publicUrlData.publicUrl;
            }

            // Insert into payments table
            const finalAmount = customAmount !== undefined ? customAmount : (editAmount ? parseFloat(editAmount) : 0);
            const finalCurrency = customCurrency || editCurrency;

            if (finalAmount > 0) {
                const { error } = await supabase
                    .from('payments')
                    .insert({
                        allocation_id: selectedReservation.id,
                        amount: finalAmount,
                        currency: finalCurrency,
                        payment_method: editPaymentMethod,
                        receipt_url: receiptUrl,
                        status: 'approved' // Admin added payments are approved by default
                    });

                if (error) throw error;
            }

            // Refresh data
            await fetchReservations();

            showAlert("Éxito", "Pago registrado correctamente.", 'success');
        } catch (error: any) {
            console.error(error);
            showAlert("Error", "Error registrando pago: " + error.message, 'error');
        } finally {
            setUpdatingStatus(false);
            setSidebarOpen(false);
        }
    };

    const handleUpdatePaymentStatus = async (paymentId: string, newStatus: string) => {
        setUpdatingStatus(true);
        try {
            const { error } = await supabase
                .from('payments')
                .update({ status: newStatus })
                .eq('id', paymentId);

            if (error) throw error;

            showAlert("Éxito", "Estado de pago actualizado.", 'success');
            await fetchReservations();

            setSelectedReservation(prev => {
                if (!prev || !prev.payments) return prev;
                return {
                    ...prev,
                    payments: prev.payments.map(p => p.id === paymentId ? { ...p, status: newStatus } : p)
                }
            });

        } catch (error: any) {
            showAlert("Error", "Error actualizando estado de pago: " + error.message, 'error');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleUpdatePaymentMethod = async (paymentId: string, newMethod: string) => {
        setUpdatingStatus(true);
        try {
            const { error } = await supabase
                .from('payments')
                .update({ payment_method: newMethod })
                .eq('id', paymentId);

            if (error) throw error;

            showAlert("Éxito", "Método de pago actualizado.", 'success');
            await fetchReservations();

            setSelectedReservation(prev => {
                if (!prev || !prev.payments) return prev;
                return {
                    ...prev,
                    payments: prev.payments.map(p => p.id === paymentId ? { ...p, payment_method: newMethod } : p)
                }
            });

        } catch (error: any) {
            console.error(error);
            showAlert("Error", "Error actualizando método de pago: " + error.message, 'error');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleUploadQuotation = async () => {
        if (!selectedReservation) return;
        if (!editQuotationFile) {
            showAlert("Atención", "Por favor seleccione un archivo PDF para la cotización.", 'warning');
            return;
        }

        setUpdatingStatus(true);
        try {
            const fileExt = editQuotationFile.name.split('.').pop();
            const fileName = `cotizacion-${selectedReservation.id}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('cotizacionperclient')
                .upload(fileName, editQuotationFile);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from('cotizacionperclient')
                .getPublicUrl(fileName);

            const cotizacionUrl = publicUrlData.publicUrl;

            const { error } = await supabase
                .from('product_allocations')
                .update({ cotizacion_url: cotizacionUrl })
                .eq('id', selectedReservation.id);

            if (error) throw error;

            // Update local reservation
            const updatedReservation = { ...selectedReservation, cotizacion_url: cotizacionUrl } as any;
            setReservations(prev => prev.map(r => r.id === selectedReservation.id ? updatedReservation : r));
            setSelectedReservation(updatedReservation);
            setEditQuotationFile(null);

            setEditQuotationFile(null);

            // Send email to client
            if (selectedReservation.email) {
                const emailResult = await sendQuotationAction(
                    selectedReservation.email,
                    selectedReservation.client_name,
                    cotizacionUrl
                );

                if (emailResult.success) {
                    showAlert("Éxito", "Cotización subida y enviada al cliente por correo.", 'success');
                } else {
                    console.error("Error sending email:", emailResult.message);
                    showAlert("Atención", "Cotización subida, pero hubo un error enviando el correo: " + emailResult.message, 'warning');
                }
            } else {
                showAlert("Éxito", "Cotización subida correctamente (Cliente sin correo registrado).", 'success');
            }
        } catch (error: any) {
            console.error(error);
            showAlert("Error", "Error subiendo cotización: " + error.message, 'error');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleDeleteQuotation = async () => {
        if (!selectedReservation) return;

        showConfirm(
            "Eliminar Cotización",
            "¿Estás seguro de eliminar la cotización actual?",
            async () => {
                setUpdatingStatus(true);
                try {
                    const { error } = await supabase
                        .from('product_allocations')
                        .update({ cotizacion_url: null })
                        .eq('id', selectedReservation.id);

                    if (error) throw error;

                    const updatedReservation = { ...selectedReservation, cotizacion_url: null };
                    setReservations(prev => prev.map(r => r.id === selectedReservation.id ? updatedReservation : r));
                    setSelectedReservation(updatedReservation);

                    showAlert("Éxito", "Cotización eliminada.", 'success');
                } catch (error: any) {
                    console.error(error);
                    showAlert("Error", "Error eliminando cotización: " + error.message, 'error');
                } finally {
                    setUpdatingStatus(false);
                }
            }
        );
    };

    const handleUpdateProduct = async (productId: string) => {
        if (!selectedReservation || !productId) return;
        setUpdatingStatus(true);
        try {
            const { error } = await supabase
                .from('product_allocations')
                .update({ product_id: productId })
                .eq('id', selectedReservation.id);

            if (error) throw error;

            // Get the product name for the updated reservation
            const product = products.find(p => p.id === productId);
            const updatedReservation = {
                ...selectedReservation,
                product_name: product?.name || selectedReservation.product_name
            };

            setReservations(prev => prev.map(r => r.id === selectedReservation.id ? updatedReservation : r));
            setSelectedReservation(updatedReservation);

            showAlert("Éxito", "Producto actualizado correctamente.", 'success');
        } catch (error: any) {
            console.error(error);
            showAlert("Error", "Error actualizando producto: " + error.message, 'error');
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
                currency: 'USD',
                locales_id: selectedLocale.id
            });

            if (allocError) throw allocError;

            let updatedStatus = selectedLocale.status;
            if (selectedLocale.status === 'DISPONIBLE') {
                updatedStatus = 'BLOQUEADO';
                await supabase.from('locales').update({ status: 'BLOQUEADO' }).eq('id', selectedLocale.id);
                setLocales(prev => prev.map(l => l.id === selectedLocale.id ? { ...l, status: 'BLOQUEADO' } : l));
            }

            await refreshAppData({ ...selectedLocale, status: updatedStatus });
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
                currency: 'USD',
                locales_id: selectedLocale.id
            });

            if (allocError) throw allocError;

            let updatedStatus = selectedLocale.status;
            if (selectedLocale.status === 'DISPONIBLE') {
                updatedStatus = 'BLOQUEADO';
                await supabase.from('locales').update({ status: 'BLOQUEADO' }).eq('id', selectedLocale.id);
                setLocales(prev => prev.map(l => l.id === selectedLocale.id ? { ...l, status: 'BLOQUEADO' } : l));
            }

            await refreshAppData({ ...selectedLocale, status: updatedStatus });
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
                await refreshAppData({ ...selectedLocale, status: 'DISPONIBLE' });
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

    useEffect(() => {
        if (!authLoading && !session) {
            router.push("/login");
        }
    }, [authLoading, session, router]);

    if (loading || authLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <Loader2 size={48} className="animate-spin text-[#A9780F]" />
            </div>
        );
    }

    if (!session) {
        return null;
    }



    return (
        <div className="min-h-screen bg-white p-8 font-sans">
            <div className="mx-auto ">
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
                                onClick={() => {
                                    setView('reservations');
                                    setSidebarOpen(false);
                                    setSelectedLocale(null);
                                    setSelectedUser(null);
                                }}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'reservations'
                                    ? 'bg-white text-[#A9780F] shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                Reservas <span className="ml-1 text-xs bg-gray-200 px-2 py-0.5 rounded-full">{reservations.length}</span>
                            </button>
                            <button
                                onClick={() => {
                                    setView('locales');
                                    setSidebarOpen(false);
                                    setSelectedReservation(null);
                                    setSelectedUser(null);
                                }}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'locales'
                                    ? 'bg-white text-[#A9780F] shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                Locales <span className="ml-1 text-xs bg-gray-200 px-2 py-0.5 rounded-full">{locales.length}</span>
                            </button>
                            <button
                                onClick={() => {
                                    setView('users');
                                    setSidebarOpen(false);
                                    setSelectedReservation(null);
                                    setSelectedLocale(null);
                                }}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'users'
                                    ? 'bg-white text-[#A9780F] shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                Usuarios <span className="ml-1 text-xs bg-gray-200 px-2 py-0.5 rounded-full">{users.length}</span>
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
                    <div key="reservations" className="space-y-6">
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
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Vista</th>
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
                                                        <span className="text-xs text-gray-400">{reservation.identification_label}</span>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{reservation.product_name || "-"}</td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{reservation.currency || "USD"}</td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{reservation.payment_method || "-"}</td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-[#A9780F]">
                                                    {reservation.payments
                                                        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: reservation.currency || 'USD' }).format(
                                                            reservation.payments
                                                                .filter(p => p.status === 'approved')
                                                                .reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
                                                        )
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
                                                <td className="whitespace-nowrap px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                                    {reservation.profileId ? (
                                                        <a
                                                            href={`/user/${reservation.profileId}`}
                                                            className="text-[#A9780F] hover:text-[#A9780F] hover:underline inline-flex items-center"
                                                            title="Ver dashboard del usuario"
                                                        >
                                                            <ExternalLinkIcon className="w-4 h-4" />
                                                        </a>
                                                    ) : (
                                                        <div className="inline-flex items-center opacity-30 cursor-not-allowed" title="Sin perfil registrado - no puede acceder al dashboard">
                                                            <ExternalLinkIcon className="w-4 h-4 text-gray-400" />
                                                        </div>
                                                    )}
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
                ) : view === 'locales' ? (
                    <div key="locales" className="space-y-6">
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
                                                <td className="whitespace-nowrap px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center gap-2">
                                                        <select
                                                            value={pendingStatusUpdates[locale.id] || locale.status}
                                                            onChange={(e) => handleStatusChange(locale.id, e.target.value)}
                                                            className={`block w-full text-xs font-bold rounded-full px-2 py-1 border-0 ring-1 ring-inset focus:ring-2 focus:ring-inset sm:text-sm sm:leading-6 ${(pendingStatusUpdates[locale.id] || locale.status)?.toLowerCase().includes('disponible') ? "bg-green-50 text-green-700 ring-green-600/20 focus:ring-green-600" :
                                                                (pendingStatusUpdates[locale.id] || locale.status)?.toLowerCase().includes('vendido') ? "bg-red-50 text-red-700 ring-red-600/20 focus:ring-red-600" :
                                                                    (pendingStatusUpdates[locale.id] || locale.status)?.toLowerCase().includes('reservado') ? "bg-orange-50 text-orange-700 ring-orange-600/20 focus:ring-orange-600" :
                                                                        "bg-yellow-50 text-yellow-700 ring-yellow-600/20 focus:ring-yellow-600"
                                                                }`}
                                                        >
                                                            <option value="DISPONIBLE">DISPONIBLE</option>
                                                            <option value="VENDIDO">VENDIDO</option>
                                                            <option value="RESERVADO">RESERVADO</option>
                                                            <option value="BLOQUEADO">BLOQUEADO</option>
                                                        </select>

                                                        {pendingStatusUpdates[locale.id] && pendingStatusUpdates[locale.id] !== locale.status && (
                                                            <button
                                                                onClick={(e) => saveLocaleStatus(locale.id, e)}
                                                                disabled={updatingStatus}
                                                                className="p-1 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                                                                title="Confirmar cambio"
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
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
                ) : (
                    <div key="users" className="space-y-6">
                        {/* Users Filters */}
                        <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Buscar</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Nombre, ID, RNC, Email..."
                                        value={userSearchQuery}
                                        onChange={(e) => setUserSearchQuery(e.target.value)}
                                        className="block w-full pl-8 py-2 text-black rounded-md border-gray-300 shadow-sm focus:border-[#A9780F] focus:ring-[#A9780F] sm:text-sm border"
                                    />
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-4 w-4 text-gray-400" />
                                    </div>
                                </div>
                            </div>
                            <div className="md:w-48">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo Usuaro</label>
                                <select
                                    value={userFilterType}
                                    onChange={(e) => setUserFilterType(e.target.value)}
                                    className="block w-full text-black rounded-md border-gray-300 shadow-sm focus:border-[#A9780F] focus:ring-[#A9780F] sm:text-sm p-2 border"
                                >
                                    <option value="all">Todos</option>
                                    <option value="fisica">Persona Física</option>
                                    <option value="juridica">Persona Jurídica</option>
                                </select>
                            </div>
                            <div className="md:w-48">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
                                <select
                                    value={userFilterStatus}
                                    onChange={(e) => setUserFilterStatus(e.target.value)}
                                    className="block w-full text-black rounded-md border-gray-300 shadow-sm focus:border-[#A9780F] focus:ring-[#A9780F] sm:text-sm p-2 border"
                                >
                                    <option value="all">Todos</option>
                                    <option value="active">Activo</option>
                                    <option value="inactive">Inactivo</option>
                                    {/* Add more statuses as discovered from DB */}
                                    {Array.from(new Set(users.map(u => u.status)))
                                        .filter(s => s !== 'active' && s !== 'inactive' && s !== 'unknown')
                                        .map(s => <option key={s} value={s}>{s}</option>)
                                    }
                                </select>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-xl bg-white shadow-2xl border-2 border-[#A9780F]">
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-black">Listado de Usuarios</h3>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setIsAddUserModalOpen(true)}
                                        className="bg-[#A9780F] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#8a620c] transition-colors flex items-center gap-2"
                                    >
                                        <User className="w-4 h-4" />
                                        Agregar Usuario
                                    </button>
                                    <span className="text-sm font-medium text-gray-500">
                                        Total: {users.filter(u => {
                                            const matchesSearch =
                                                u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                                                u.identification.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                                                u.email.toLowerCase().includes(userSearchQuery.toLowerCase());
                                            const matchesType = userFilterType === "all" || u.type === userFilterType;
                                            const matchesStatus = userFilterStatus === "all" || u.status === userFilterStatus;
                                            return matchesSearch && matchesType && matchesStatus;
                                        }).length}
                                    </span>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700 text-center w-10">Tipo</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Nombre / Empresa</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Identificación</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Email</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-gray-700">Teléfono</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {users.filter(u => {
                                            const matchesSearch =
                                                u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                                                u.identification.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                                                u.email.toLowerCase().includes(userSearchQuery.toLowerCase());
                                            const matchesType = userFilterType === "all" || u.type === userFilterType;
                                            const matchesStatus = userFilterStatus === "all" || u.status === userFilterStatus;
                                            return matchesSearch && matchesType && matchesStatus;
                                        }).map((user) => (
                                            <tr
                                                key={`${user.type}-${user.id}`}
                                                className="hover:bg-gray-50 transition-colors cursor-pointer"
                                                onClick={() => handleUserClick(user)}
                                            >
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 text-center">
                                                    {user.type === 'fisica' ? (
                                                        <div className="flex justify-center" title="Persona Física">
                                                            <User className="h-5 w-5 text-blue-600" />
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-center" title="Persona Jurídica">
                                                            <Building2 className="h-5 w-5 text-purple-600" />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 max-w-xs truncate" title={user.name}>
                                                    {user.name}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                                                    <div className="flex flex-col">
                                                        <span>{user.identification}</span>
                                                        <span className="text-xs text-gray-400">{user.identification_label}</span>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{user.email}</td>
                                                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{user.phone || '-'}</td>

                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {users.length > 0 && users.filter(u => {
                                const matchesSearch =
                                    u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                                    u.identification.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                                    u.email.toLowerCase().includes(userSearchQuery.toLowerCase());
                                const matchesType = userFilterType === "all" || u.type === userFilterType;
                                const matchesStatus = userFilterStatus === "all" || u.status === userFilterStatus;
                                return matchesSearch && matchesType && matchesStatus;
                            }).length === 0 && (
                                    <div className="p-12 text-center">
                                        <p className="text-gray-500 text-lg">No se encontraron usuarios con estos filtros.</p>
                                    </div>
                                )}
                            {users.length === 0 && (
                                <div className="p-12 text-center">
                                    <p className="text-gray-500 text-lg">No hay usuarios registrados</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Sidebar */}
                <div
                    className={`fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${sidebarOpen ? "translate-x-0" : "translate-x-full"} border-l-4 border-[#A9780F]`}
                >
                    {/* RESERVATION DETAIL SIDEBAR */}
                    {
                        selectedReservation && (
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
                                editQuotationFile={editQuotationFile}
                                setEditQuotationFile={setEditQuotationFile}
                                handleUploadQuotation={handleUploadQuotation}
                                handleDeleteQuotation={handleDeleteQuotation}
                                products={products}
                                handleUpdateProduct={handleUpdateProduct}
                                handleUpdatePaymentMethod={handleUpdatePaymentMethod}
                                handleUpdatePaymentStatus={handleUpdatePaymentStatus}
                            />
                        )
                    }

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
                                availableUsers={users.map(u => ({
                                    id: u.id,
                                    type: u.type,
                                    label: `${u.name} (${u.identification})`
                                }))}
                                newUserType={newUserType}
                                setNewUserType={setNewUserType}
                                newUserForm={newUserForm}
                                setNewUserForm={setNewUserForm}
                                createAndAssignUser={createAndAssignUser}
                                updatingStatus={updatingStatus}

                            />
                        )
                    }
                    {
                        selectedUser && (
                            <SidebarUser
                                selectedUser={selectedUser}
                                closeSidebar={closeSidebar}
                                handleUpdateUser={handleUpdateUser}
                                updatingStatus={updatingStatus}
                                handleSendEmail={handleSendEmail}
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

                {/* Add User Modal */}
                {isAddUserModalOpen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm overflow-y-auto">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
                            <button
                                onClick={() => setIsAddUserModalOpen(false)}
                                className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors z-10"
                            >
                                <X className="w-5 h-5 text-gray-600" />
                            </button>

                            <div className="p-8">
                                <h2 className="text-2xl font-bold text-[#131E29] mb-6 border-b pb-4">Agregar Nuevo Usuario</h2>

                                <div className="mb-6">
                                    <label className="block text-sm font-semibold mb-2">Tipo de Usuario</label>
                                    <div className="flex gap-4">
                                        <button
                                            onClick={() => setAddUserType('fisica')}
                                            className={`px-4 py-2 rounded-lg font-bold border-2 transition-all ${addUserType === 'fisica'
                                                ? 'border-[#A9780F] bg-[#A9780F] text-white'
                                                : 'border-gray-200 text-gray-500 hover:border-[#A9780F]'
                                                }`}
                                        >
                                            Persona Física
                                        </button>
                                        <button
                                            onClick={() => setAddUserType('juridica')}
                                            className={`px-4 py-2 rounded-lg font-bold border-2 transition-all ${addUserType === 'juridica'
                                                ? 'border-[#A9780F] bg-[#A9780F] text-white'
                                                : 'border-gray-200 text-gray-500 hover:border-[#A9780F]'
                                                }`}
                                        >
                                            Persona Jurídica
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    {addUserType === 'fisica' ? (
                                        <FisicaForm onSuccess={handleAddUserSuccess} />
                                    ) : (
                                        <JuridicaForm onSuccess={handleAddUserSuccess} />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

}

