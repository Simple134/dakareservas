"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase/client";
import { UserDashboard } from "@/src/components/UserDashboard";
import { useAuth } from "@/src/context/AuthContext";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { SidebarPayment } from "@/src/components/Sidebar";

type DashboardData = {
    userName: string;
    localeCode?: string;
    totalAmount: number;
    paidAmount: number;
    paidCurrency: string; // 'USD' or 'DOP'
    pendingAmount: number;
    progress: number;
    installments: any[];
    cotizacion_url?: string | null;
};

export default function UserPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Payment Sidebar State
    const [isPaymentSidebarOpen, setPaymentSidebarOpen] = useState(false);
    const [isSubmittingPayment, setSubmittingPayment] = useState(false);


    useEffect(() => {
        if (!user) {
            setDataLoading(false);
            return;
        }

        console.log(user, "desde el user page");

        const fetchDashboardData = async () => {
            setDataLoading(true);
            try {
                // 1. Get Profile Info (IDs and Name)
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('full_name, id_fisica, id_juridica')
                    .eq('id', user.id)
                    .single();
                console.log(profile, "profile");

                if (profileError || !profile) {
                    console.error("Profile fetch error:", profileError);
                    setDashboardData({
                        userName: user.email || 'Usuario',
                        totalAmount: 0,
                        paidAmount: 0,
                        paidCurrency: 'USD',
                        pendingAmount: 0,
                        progress: 0,
                        installments: []
                    });
                    setDataLoading(false);
                    return;
                }

                const userName = profile.full_name || user.email || 'Usuario';
                const personaId = profile.id_fisica || profile.id_juridica;
                const personaType = profile.id_fisica ? 'fisica' : 'juridica';

                console.log(personaType)

                if (!personaId) {
                    console.log("No linked persona ID found in profile.");
                    setDashboardData({
                        userName: userName,
                        totalAmount: 0,
                        paidAmount: 0,
                        paidCurrency: 'USD',
                        pendingAmount: 0,
                        progress: 0,
                        installments: []
                    });
                    setDataLoading(false);
                    return;
                }

                // 2. Get Product Allocation
                console.log(personaId)
                const { data: allocations, error: allocationError } = await supabase
                    .from('product_allocations')
                    .select('*')
                    .eq('persona_fisica_id', personaId)

                console.log("📦 product_allocations:", allocations, "Error:", allocationError);

                if (allocationError) throw allocationError;

                const allocation = allocations && allocations.length > 0 ? allocations[0] : null;

                if (allocation && allocation.locales_id) {
                    // 3. Manually fetch Locale details since we are decoupling the join
                    const { data: localeData, error: localeError } = await supabase
                        .from('locales')
                        .select('total_value, id')
                        .eq('id', allocation.locales_id)
                        .single();

                    if (localeError) {
                        console.error("Error fetching locale:", localeError);
                    }

                    const total = localeData?.total_value || 0;
                    // Handle amount as string[]
                    const paid = (allocation.amount || []).reduce((acc: number, val: string) => acc + parseFloat(val), 0);
                    const pending = Math.max(0, total - paid);
                    const progress = total > 0 ? (paid / total) * 100 : 0;
                    const localeCode = `Local ${allocation.locales_id}`;

                    // Build installments array from allocation
                    const amounts = allocation.amount || [];
                    const receipts = allocation.receipt_url || [];

                    const installments = amounts.map((amt: string, index: number) => ({
                        number: index + 1,
                        amount: parseFloat(amt),
                        currency: allocation.currency || 'USD',
                        date: allocation.created_at, // Using created_at as base, ideally we'd have dates per payment
                        status: allocation.status || 'pending',
                        paymentMethod: allocation.payment_method || 'N/A',
                        receiptUrl: receipts[index] || ''
                    }));

                    setDashboardData({
                        userName: userName,
                        localeCode: localeCode,
                        totalAmount: total,
                        paidAmount: paid,
                        paidCurrency: allocation.currency || 'USD',
                        pendingAmount: pending,
                        progress: progress,
                        installments: installments,
                        cotizacion_url: allocation.cotizacion_url
                    });
                } else {
                    setDashboardData({
                        userName: userName,
                        totalAmount: 0,
                        paidAmount: 0,
                        paidCurrency: 'USD',
                        pendingAmount: 0,
                        progress: 0,
                        installments: []
                    });
                }

            } catch (err: any) {
                console.error("Dashboard fetch error:", err);
                setError(err.message);
            } finally {
                setDataLoading(false);
            }
        };

        fetchDashboardData();

    }, [user]);

    const handlePaymentSubmit = async (amount: string, file: File) => {
        if (!user) return;
        setSubmittingPayment(true);
        try {
            // 1. Fetch current allocation to get latest arrays
            const { data: profile } = await supabase
                .from('profiles')
                .select('id_fisica, id_juridica')
                .eq('id', user.id)
                .single();

            const personaId = profile?.id_fisica || profile?.id_juridica;
            if (!personaId) throw new Error("No user profile found");

            const { data: allocations } = await supabase
                .from('product_allocations')
                .select('*')
                .eq('persona_fisica_id', personaId)
                .maybeSingle(); // Assuming 1 active allocation per user for now

            if (!allocations) throw new Error("No allocation found");

            const currentAmounts = allocations.amount || [];
            const currentReceipts = allocations.receipt_url || [];

            // 2. Upload Receipt
            const fileExt = file.name.split('.').pop();
            const fileName = `payment-${allocations.id}-${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('receipts')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from('receipts')
                .getPublicUrl(fileName);

            const newReceiptUrl = publicUrlData.publicUrl;

            // 3. Append to arrays
            const updatedAmounts = [...currentAmounts, amount];
            const updatedReceipts = [...currentReceipts, newReceiptUrl];

            // 4. Update DB
            const { error: updateError } = await supabase
                .from('product_allocations')
                .update({
                    amount: updatedAmounts,
                    receipt_url: updatedReceipts
                })
                .eq('id', allocations.id);

            if (updateError) throw updateError;

            // 5. Success
            setPaymentSidebarOpen(false);
            window.location.reload(); // Simple reload to refresh data
        } catch (error: any) {
            console.error("Payment error:", error);
            setError("Error procesando pago: " + error.message);
        } finally {
            setSubmittingPayment(false);
        }
    };

    if (dataLoading) return (
        <div className="flex h-screen items-center justify-center bg-[#131E29]">
            <Loader2 size={48} className="animate-spin text-[#A9780F]" />
        </div>
    );

    if (!user) {
        router.push("/login");
        return null;
    }

    return (
        <div>
            <UserDashboard
                data={dashboardData}
                loading={dataLoading}
                error={error}
                onOpenPaymentSidebar={() => setPaymentSidebarOpen(true)}
            />

            {/* Payment Sidebar */}
            <div
                className={`fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${isPaymentSidebarOpen ? "translate-x-0" : "translate-x-full"} border-l-4 border-[#A9780F]`}
            >
                {isPaymentSidebarOpen && (
                    <SidebarPayment
                        closeSidebar={() => setPaymentSidebarOpen(false)}
                        onSubmit={handlePaymentSubmit}
                        isSubmitting={isSubmittingPayment}
                        currency={dashboardData?.paidCurrency || 'USD'}
                    />
                )}
            </div>

            {/* Overlay */}
            {isPaymentSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
                    onClick={() => setPaymentSidebarOpen(false)}
                />
            )}
        </div>
    );
}