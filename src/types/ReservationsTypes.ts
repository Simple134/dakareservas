import { Tables } from "./supabase";

export interface ReservationViewModel {
    id: string;
    created_at: string;
    status: string;

    client_name: string;
    client_type_label: string;
    identification_label: string;
    identification_value: string;

    product_name: string;
    amount: string[];
    currency: string;
    payment_method: string;
    receipt_url: string[] | null;
    cotizacion_url?: string | null;
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
    profileId?: string | null;
}