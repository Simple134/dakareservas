"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase/client";
import { UserDashboard, InvestmentData } from "@/src/components/UserDashboard";
import { useAuth } from "@/src/context/AuthContext";
import { Loader2 } from "lucide-react";
import { SidebarPayment } from "@/src/components/Sidebar";
import { sendPaymentNotificationAction } from "@/src/actions/send-payment-notification";
import { useParams } from "next/navigation";

type DashboardData = {
    userName: string;
    investments: InvestmentData[];
};

export default function UserPage() {
    const params = useParams();
    const profileId = params.id as string;
    const { user } = useAuth();
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Payment Sidebar State
    const [isPaymentSidebarOpen, setPaymentSidebarOpen] = useState(false);
    const [isSubmittingPayment, setSubmittingPayment] = useState(false);
    const [selectedInvestmentForPayment, setSelectedInvestmentForPayment] = useState<string | null>(null);


    useEffect(() => {
        if (!user || !profileId) {
            setDataLoading(false);
            return;
        }

        const fetchDashboardData = async () => {
            setDataLoading(true);
            try {
                // 1. Get Profile Info (IDs and Name)
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('full_name, id_fisica, id_juridica')
                    .eq('id', profileId || user.id)
                    .single();

                if (profileError || !profile) {
                    console.error("Profile fetch error:", profileError);
                    setDashboardData({
                        userName: user.email || 'Usuario',
                        investments: []
                    });
                    setDataLoading(false);
                    return;
                }

                const userName = profile.full_name || user.email || 'Usuario';
                const personaId = profile.id_fisica || profile.id_juridica;

                if (!personaId) {
                    setDashboardData({
                        userName: userName,
                        investments: []
                    });
                    setDataLoading(false);
                    return;
                }

                // 2. Get Product Allocations based on Persona Type
                let query = supabase.from('product_allocations').select('*, payments(*)');

                if (profile.id_fisica) {
                    query = query.eq('persona_fisica_id', profile.id_fisica);
                } else if (profile.id_juridica) {
                    query = query.eq('persona_juridica_id', profile.id_juridica);
                } else {
                    // Fallback/Error case if neither exists (though checked above)
                    setDashboardData({
                        userName: userName,
                        investments: []
                    });
                    setDataLoading(false);
                    return;
                }

                const { data: allocations, error: allocationError } = await query;



                if (allocationError) throw allocationError;

                if (!allocations || allocations.length === 0) {
                    setDashboardData({
                        userName: userName,
                        investments: []
                    });
                    setDataLoading(false);
                    return;
                }

                const investments: InvestmentData[] = [];

                for (const allocation of allocations) {
                    if (allocation.locales_id) {
                        // 3. Manually fetch Locale details for each allocation
                        const { data: localeData, error: localeError } = await supabase
                            .from('locales')
                            .select('total_value, id')
                            .eq('id', allocation.locales_id)
                            .single();

                        if (localeError) {
                            console.error(`Error fetching locale ${allocation.locales_id}: `, localeError);
                            continue;
                        }

                        const total = localeData?.total_value || 0;
                        const payments = allocation.payments || [];

                        // Calculate paid amount from approved payments
                        const paid = payments
                            .filter((p: any) => p.status === 'approved')
                            .reduce((acc: number, p: any) => acc + Number(p.amount), 0);

                        const pending = Math.max(0, total - paid);
                        const progress = total > 0 ? (paid / total) * 100 : 0;
                        const localeCode = `Local ${allocation.locales_id} `;

                        // Build installments array from payments table
                        const installments = payments.map((p: any, index: number) => ({
                            number: index + 1,
                            id: p.id,
                            amount: Number(p.amount),
                            currency: p.currency || allocation.currency || 'USD',
                            date: p.created_at,
                            status: p.status || 'pending',
                            paymentMethod: p.payment_method || allocation.payment_method || 'N/A',
                            receiptUrl: p.receipt_url || ''
                        }));

                        investments.push({
                            id: allocation.id,
                            localeId: allocation.locales_id,
                            localeCode: localeCode,
                            totalAmount: total,
                            paidAmount: paid,
                            paidCurrency: allocation.currency || 'USD',
                            pendingAmount: pending,
                            progress: progress,
                            installments: installments, // Updated to use mapped payments
                            cotizacion_url: allocation.cotizacion_url
                        });
                    }
                }

                setDashboardData({
                    userName: userName,
                    investments: investments
                });

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
        if (!user || !selectedInvestmentForPayment) return;
        setSubmittingPayment(true);
        try {
            // 1. Get the specific allocation
            const { data: allocation, error: fetchError } = await supabase
                .from('product_allocations')
                .select('*')
                .eq('id', selectedInvestmentForPayment)
                .single();

            if (fetchError || !allocation) throw new Error("Allocation not found");



            // 2. Upload Receipt
            const fileExt = file.name.split('.').pop();
            const fileName = `payment - ${allocation.id} -${Date.now()}.${fileExt} `;
            const { error: uploadError } = await supabase.storage
                .from('receipts')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage
                .from('receipts')
                .getPublicUrl(fileName);

            const newReceiptUrl = publicUrlData.publicUrl;

            // 3. Insert into payments table
            const { error: insertError } = await supabase
                .from('payments')
                .insert({
                    allocation_id: allocation.id,
                    amount: parseFloat(amount),
                    currency: allocation.currency || 'USD',
                    status: 'pending',
                    receipt_url: newReceiptUrl,
                    payment_method: allocation.payment_method || 'manual'
                });

            if (insertError) throw insertError;

            // 4. Update Allocation status if needed (optional, logically if adding payment usually stays pending until confirmed)
            const { error: updateError } = await supabase
                .from('product_allocations')
                .update({
                    status: 'pending' // Revert to pending if new payment is added? Or keep as is? User logic usually implies pending review.
                })
                .eq('id', allocation.id);

            if (updateError) throw updateError;

            if (updateError) throw updateError;

            // 5. Send Notification Email to Admin
            const userName = dashboardData?.userName || user.email || "Usuario";
            // Use currency from the allocation
            await sendPaymentNotificationAction(userName, amount, allocation.currency || 'USD');

            // 6. Success
            setPaymentSidebarOpen(false);
            window.location.reload(); // Simple reload to refresh data
        } catch (error: any) {
            console.error("Payment error:", error);
            setError("Error procesando pago: " + error.message);
        } finally {
            setSubmittingPayment(false);
        }
    };

    const handleOpenPaymentSidebar = (investmentId: string) => {
        setSelectedInvestmentForPayment(investmentId);
        setPaymentSidebarOpen(true);
    }


    if (dataLoading) return (
        <div className="flex h-screen items-center justify-center bg-[#131E29]">
            <Loader2 size={48} className="animate-spin text-[#A9780F]" />
        </div>
    );

    if (!user) return null;

    return (
        <div>
            <UserDashboard
                data={dashboardData}
                loading={dataLoading}
                error={error}
                onOpenPaymentSidebar={handleOpenPaymentSidebar}
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
                        currency={dashboardData?.investments.find(inv => inv.id === selectedInvestmentForPayment)?.paidCurrency || 'USD'}
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