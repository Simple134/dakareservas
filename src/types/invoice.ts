import * as z from "zod";

// Zod Schema for invoice items
export const invoiceItemSchema = z.object({
    id: z.string(),
    description: z.string().min(1, "La descripción es requerida"),
    quantity: z.number().min(0.01, "La cantidad debe ser mayor a 0"),
    unitPrice: z.number().min(0, "El precio debe ser mayor o igual a 0"),
    totalPrice: z.number(),
    category: z.enum(["materials", "labor", "equipment", "services", "other"]),
});

// Zod Schema for invoice form
export const invoiceFormSchema = z.object({
    documentType: z.enum(["quote", "order", "invoice"]),
    transactionType: z.enum(["sale", "purchase"]),
    invoiceNumber: z.string().min(1, "El número es requerido"),
    invoiceDate: z.string().min(1, "La fecha es requerida"),
    dueDate: z.string().min(1, "La fecha de vencimiento es requerida"),
    selectedProjectId: z.string().min(1, "El proyecto es requerido"),
    clientId: z.string().optional(),
    clientName: z.string().min(1, "El nombre del cliente es requerido"),
    clientPhone: z.string().optional(),
    clientEmail: z.string().email("Email inválido").optional().or(z.literal("")),
    clientAddress: z.string().optional(),
    tax: z.number().min(0).max(100),
    discount: z.number().min(0).max(100),
    paymentMethod: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(invoiceItemSchema).min(1, "Debe haber al menos un item"),
});

// Inferred TypeScript type from Zod schema
export type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

// Client interface
export interface Client {
    id: string;
    type: "fisica" | "juridica";
    name: string;
    email: string;
    phone: string;
    address: string;
}

// Invoice interface
export interface Invoice {
    documentType: string;
    transactionType: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    selectedProjectId: string;
    clientId?: string;
    clientName: string;
    clientPhone?: string;
    clientEmail?: string;
    clientAddress?: string;
    tax: number;
    discount: number;
    paymentMethod?: string;
    notes?: string;
    items: InvoiceFormData["items"];
    subtotal: number;
    totalAmount: number;
    status: string;
    // Gestiono integration fields
    gestionoId?: string;
    pdfUrl?: string;
    xmlUrl?: string;
}

// Props for CreateInvoiceDialog component
export interface CreateInvoiceDialogProps {
    isOpen: boolean;
    onClose: () => void;
    projectId?: string;
    projectName?: string;
    clientName?: string;
    documentType?: "quote" | "order" | "invoice";
    transactionType?: "sale" | "purchase";
    onCreateInvoice?: (invoice: Invoice) => void;
}
