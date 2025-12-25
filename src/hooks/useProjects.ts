import { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase/client";

export type Project = {
    id: string | number;
    name: string;
    client: string;
    startDate: string;
    endDate: string;
    totalBudget: number;
    executedBudget: number;
    status: "planning" | "execution" | "completed";
    location: string;
    profitMargin: number;
    completionPercentage: number;
    project_type?: string;
    permitting_category?: string;
    ownerProfileId?: string;
};

export function useProjects() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from("product_allocations")
                .select(
                    `
                    id,
                    created_at,
                    status,
                    product:products(name),
                    locales(id, total_value, level, area_mt2),
                    persona_fisica(id, first_name, last_name),
                    persona_juridica(id, company_name),
                    payments(amount, currency, status)
                `,
                )
                .order("created_at", { ascending: false });

            if (error) throw error;

            // Fetch profiles to link personas to users (Reference: app/admin/page.tsx)
            const { data: profiles, error: profilesError } = await supabase
                .from("profiles")
                .select("id, id_fisica, id_juridica");

            if (profilesError)
                console.error("Error fetching profiles:", profilesError);

            // Create a map for quick profile lookup
            const profileMap = new Map<string, string>();
            (profiles || []).forEach((p) => {
                if (p.id_fisica) profileMap.set(p.id_fisica, p.id);
                if (p.id_juridica) profileMap.set(p.id_juridica, p.id);
            });

            const transformed: Project[] = (data || []).map((item) => {
                const totalValue = item.locales?.total_value || 0;

                // Calculate executed budget from approved payments
                const payments = item.payments || [];
                const executedBudget = payments
                    .filter((p) => p.status === "approved")
                    .reduce((sum, p) => {
                        return sum + (Number(p.amount) || 0);
                    }, 0);

                const completionPercentage =
                    totalValue > 0
                        ? Math.min(100, Math.round((executedBudget / totalValue) * 100))
                        : 0;

                // Map status
                let status: Project["status"] = "planning";
                if (item.status === "approved") status = "execution";
                if (completionPercentage >= 100) status = "completed";

                // Client name
                const client = item.persona_fisica
                    ? `${item.persona_fisica.first_name} ${item.persona_fisica.last_name}`
                    : item.persona_juridica?.company_name || "Cliente Desconocido";

                // Identify Owner Profile ID using the map
                let ownerProfileId: string | undefined;
                if (item.persona_fisica?.id) {
                    ownerProfileId = profileMap.get(item.persona_fisica.id);
                } else if (item.persona_juridica?.id) {
                    ownerProfileId = profileMap.get(item.persona_juridica.id);
                }

                // Dates
                const startDate = item.created_at;
                const endDate = new Date(
                    new Date(startDate).setFullYear(
                        new Date(startDate).getFullYear() + 1,
                    ),
                ).toISOString(); // Mock 1 year duration

                return {
                    id: item.id,
                    name: item.product?.name || `Proyecto #${item.id}`,
                    client,
                    startDate,
                    endDate,
                    totalBudget: totalValue,
                    executedBudget,
                    status,
                    location: item.locales
                        ? `Nivel ${item.locales.level}`
                        : "Sin ubicación",
                    profitMargin: 20, // Mock fixed margin for now
                    completionPercentage,
                    project_type: "Residential",
                    permitting_category: "Category A",
                    ownerProfileId,
                };
            });

            setProjects(transformed);
        } catch (err) {
            console.error("Error fetching projects:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return { projects, isLoading, refetch: fetchProjects };
}
