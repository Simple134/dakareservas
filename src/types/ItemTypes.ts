export interface Item {
    id: string;
    name: string;
    description: string;
    category: string;
    subcategory: string;
    unitPrice: number;
    currency: string;
    unit: string;
    supplier: string;
    usageCount: number;
    lastUsed: string;
}

export type ItemCategory =
    | "Materiales"
    | "Instalaciones"
    | "Acabados"
    | "Albañilería"
    | "Todos las categorías";

export type ItemSubcategory =
    | "Cemento"
    | "Acero"
    | "Pintura"
    | "Desagüe"
    | "Todos las subcategorías";
