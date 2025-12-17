"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase/client";
import { UserDashboard } from "@/src/components/UserDashboard";
import { useAuth } from "@/src/context/AuthContext";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

type DashboardData = {
    userName: string;
    localeCode?: string;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    progress: number;
    installments: any[];
};

export default function UserPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [dataLoading, setDataLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // If still loading auth or no user, don't fetch data yet
        if (authLoading || !user) {
            setDataLoading(false);
            return;
        }

        const fetchDashboardData = async () => {
            setDataLoading(true);
            try {
                // 1. Get Profile/Persona Info
                let { data: personaFisica } = await supabase
                    .from('persona_fisica')
                    .select('id, first_name, last_name')
                    .eq('user_id', user.id)
                    .single();

                let personaId = personaFisica?.id;
                let personaType = 'fisica';
                let userName = personaFisica ? `${personaFisica.first_name} ${personaFisica.last_name}` : '';

                if (!personaId) {
                    // Try persona_juridica
                    const { data: personaJuridica } = await supabase
                        .from('persona_juridica')
                        .select('id, company_name')
                        .eq('user_id', user.id)
                        .single();

                    if (personaJuridica) {
                        personaId = personaJuridica.id;
                        personaType = 'juridica';
                        userName = personaJuridica.company_name || '';
                    }
                }

                if (!personaId) {
                    // Fallback to profile
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', user.id)
                        .single();

                    setDashboardData({
                        userName: profile?.full_name || user.email || 'Usuario',
                        totalAmount: 0,
                        paidAmount: 0,
                        pendingAmount: 0,
                        progress: 0,
                        installments: []
                    });
                    setDataLoading(false);
                    return;
                }

                // 2. Get Product Allocation
                let query = supabase.from('product_allocations').select(`
                    amount,
                    locales_id,
                    locales (
                        total_value
                    )
                `) as any;

                if (personaType === 'fisica') {
                    query = query.eq('persona_fisica_id', personaId);
                } else {
                    query = query.eq('persona_juridica_id', personaId);
                }

                const { data: allocations, error: allocationError } = await query;

                if (allocationError) throw allocationError;

                const allocation = allocations && allocations.length > 0 ? allocations[0] : null;

                if (allocation && allocation.locales) {
                    const total = allocation.locales.total_value || 0;
                    const paid = allocation.amount || 0;
                    const pending = total - paid;
                    const progress = total > 0 ? (paid / total) * 100 : 0;

                    setDashboardData({
                        userName: userName || 'Usuario',
                        totalAmount: total,
                        paidAmount: paid,
                        pendingAmount: pending,
                        progress: progress,
                        installments: []
                    });
                } else {
                    setDashboardData({
                        userName: userName || 'Usuario',
                        totalAmount: 0,
                        paidAmount: 0,
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

    }, [user, authLoading]);

    if (authLoading) return (
        <div className="flex h-screen items-center justify-center bg-[#131E29]">
            <Loader2 size={48} className="animate-spin text-[#A9780F]" />
        </div>
    );

    if (!user) {
        router.push("/login");
        return null;
    }

    return (
        <UserDashboard
            data={dashboardData}
            loading={dataLoading}
            error={error}
        />
    );
}