/**
 * Traductores de filas de Postgres a la forma que consumía la UI antes de la migración.
 *
 * La fachada existe para que las ~27k líneas de UI no cambien, así que estos
 * mapeos son deliberadamente literales, rarezas incluidas. La más importante:
 * los semi-booleanos van como 0/1 numérico, no como boolean. La UI compara
 * `isSell === 0` y `isSell === 1` en seis sitios (FinancesModule:113,174,345,
 * 894,908,921 y app/admin/invoice/page.tsx:116,164,563); con booleanos esas
 * comparaciones pasarían a false en silencio y las compras se tratarían como
 * ventas, perdiendo la retención ISR.
 */
import type {
  PendingRecord,
  PendingRecordElement,
  PaymentRecord,
  Beneficiary,
  DivisionWithBalance,
  BeneficiaryContactResponse,
} from "@/src/types/erp";

/** Semi-booleano 0/1, como lo esperaba la UI. */
const bit = (v: unknown): number => (v ? 1 : 0);

/** Numeric de Postgres llega como string por precisión; se pasa a number. */
const n = (v: unknown): number => {
  if (v === null || v === undefined || v === "") return 0;
  const parsed = typeof v === "number" ? v : Number(v);
  return Number.isFinite(parsed) ? parsed : 0;
};

const nOrNull = (v: unknown): number | null =>
  v === null || v === undefined || v === "" ? null : n(v);

/** Las fechas van como ISO con milisegundos, que es lo que espera la UI. */
const iso = (v: unknown): string | null =>
  v ? new Date(v as string).toISOString() : null;

/**
 * Fila cruda tal como la devuelve PostgREST.
 *
 * Es la frontera sin tipar entre la base y el dominio: la funcion de este
 * modulo es precisamente convertirla en valores tipados. Usar `unknown` aqui
 * obligaria a una asercion por cada acceso sin aportar seguridad, asi que la
 * regla se desactiva solo para este alias.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

export function mapElement(row: Row): PendingRecordElement {
  return {
    id: row.id,
    pendingRecordId: row.pending_record_id,
    resourceId: row.resource_id ?? null,
    description: row.description ?? "",
    quantity: n(row.quantity),
    unit: row.unit ?? "UNIT",
    price: n(row.price),
    // Monto o porcentaje ("10%"); se conserva tal cual.
    variation: row.variation ?? "0",
    resourceCost: n(row.resource_cost),
    priceAfterVariation: nOrNull(row.price_after_variation) ?? n(row.price),
    serialNumbers: row.serial_numbers ?? [],
    comment: row.comment ?? null,
    taxes: (row.pending_record_element_taxes ?? []).map((t: Row) => ({
      id: t.id,
      pendingRecordElementId: t.pending_record_element_id ?? row.id,
      taxRateId: t.tax_rate_id,
      isIncludedInPrice: bit(t.is_included_in_price),
      taxRate: n(t.tax_rates?.rate),
      // El importe del impuesto va ya calculado, como esperaba la UI.
      taxAmount: Number(
        (n(row.quantity) * n(row.price) * n(t.tax_rates?.rate)).toFixed(2),
      ),
    })) as PendingRecordElement["taxes"],
  } as PendingRecordElement;
}

export function mapPayment(row: Row, isSell: boolean): PaymentRecord {
  return {
    id: row.id,
    type: row.type ?? "PAYMENT",
    // El ETL normalizó los importes a positivo; antes venían en
    // negativo en las compras y hay UI que los suma con signo.
    amount: isSell ? n(row.amount) : -n(row.amount),
    date: iso(row.date) as string,
    paymentMethod: row.payment_method ?? "CASH",
    currency: row.currency ?? "DOP",
    description: row.description ?? null,
    reference: row.reference ?? null,
    state: row.state ?? "COMPLETED",
    receivedFrom: row.received_from ?? null,
    accountId: row.account_id ?? null,
    divisionId: row.division_id ?? null,
    beneficiaryId: row.beneficiary_id ?? null,
    metadata: row.metadata ?? {},
  } as unknown as PaymentRecord;
}

/** Fila de `pending_records_computed` (con anidados) al PendingRecord de la API. */
export function mapRecord(row: Row): PendingRecord {
  const isSell = Boolean(row.is_sell);
  const elements = (row.pending_record_elements ?? [])
    .slice()
    .sort((a: Row, b: Row) => (a.position ?? 0) - (b.position ?? 0))
    .map(mapElement);
  const payments = (row.payment_records ?? []).map((p: Row) =>
    mapPayment(p, isSell),
  );
  const beneficiary = row.beneficiaries ?? null;

  return {
    id: row.id,
    userId: row.user_id ?? null,
    divisionId: row.division_id,
    organizationId: row.organization_id,
    beneficiaryId: row.beneficiary_id,
    projectId: null,
    type: row.type,
    date: iso(row.date) as string,
    dueDate: iso(row.due_date),
    // Derivado, no almacenado: antes se recalculaba en cada consulta.
    state: row.state,
    isSell: bit(row.is_sell),
    isInstantDelivery: bit(row.is_instant_delivery),
    isArchived: bit(row.archived_at),
    currency: row.currency ?? "DOP",
    taxId: row.tax_id ?? null,
    taxInvoiceType: row.tax_invoice_type ?? 0,
    taxExpirationDate: iso(row.tax_expiration_date),
    salesTaxReduced: Boolean(row.sales_tax_reduced),
    salesTaxRate: nOrNull(row.sales_tax_rate),
    // La retención se expone como IMPORTE, no como tasa: así la lee la UI.
    isrTaxRetention: n(row.isr_retention_amount),
    salesTaxRetention: n(row.sales_tax_retention),
    payrollDeduction: n(row.payroll_deduction),
    subTotal: n(row.subtotal),
    taxes: n(row.taxes_amount),
    amount: n(row.amount),
    paid: n(row.paid),
    dueToPay: n(row.due_to_pay),
    paymentsAmount: n(row.payments_amount),
    subTotalWithoutDiscount: n(row.subtotal),
    preTaxesDiscount: n(row.pre_taxes_discount),
    afterTaxesDiscount: n(row.after_taxes_discount),
    // Créditos, devoluciones y comisiones no se usaron nunca en esta
    // organización (0 registros en los 399 documentos migrados).
    creditPayments: 0,
    givenCredit: 0,
    creditDue: 0,
    credits: [],
    returns: [],
    returnsCount: 0,
    totalReturnedValue: 0,
    totalReturnedToClaim: 0,
    commissions: [],
    resourceCost: 0,
    grossProfit: n(row.amount) - n(row.taxes_amount),
    reference: row.reference ?? null,
    description: row.description ?? null,
    notes: row.notes ?? null,
    source: row.source ?? "dashboard",
    soldBy: row.sold_by ?? null,
    sourcePendingRecordId: row.source_pending_record_id ?? null,
    createdByRecurrentInvoice: bit(row.created_by_recurrent_invoice),
    taxEntityCurrencyRate: nOrNull(row.tax_entity_currency_rate),
    labels: row.labels ?? [],
    clientdata: row.clientdata ?? {},
    metadata: row.metadata ?? {},
    elements,
    payments,
    contact: beneficiary
      ? {
          id: beneficiary.id,
          name: beneficiary.name,
          email: beneficiary.email ?? undefined,
          phone: beneficiary.phone ?? undefined,
          type: beneficiary.type,
          taxId: beneficiary.tax_id ?? undefined,
        }
      : undefined,
    linkedCosts: [],
  } as unknown as PendingRecord;
}

export function mapContact(row: Row): BeneficiaryContactResponse {
  return {
    id: row.id,
    beneficiaryId: row.beneficiary_id,
    type: row.type,
    data: row.data,
    dataType: row.data_type ?? "string",
    createdAt: iso(row.created_at) as string,
    updatedAt: iso(row.updated_at),
  } as BeneficiaryContactResponse;
}

export function mapBeneficiary(row: Row): Beneficiary {
  const contacts: BeneficiaryContactResponse[] = (
    row.beneficiary_contacts ?? []
  ).map(mapContact);
  const primero = (tipo: string) =>
    contacts.find((c) => c.type === tipo)?.data ?? "";

  return {
    id: row.id,
    name: row.name,
    organizationId: row.organization_id,
    type: row.type,
    referredBy: row.referred_by ?? null,
    // Va 0/1, no boolean: así lo compara la UI.
    archived: bit(row.archived_at),
    assignedDivisionId: row.assigned_division_id ?? null,
    creditLimit: nOrNull(row.credit_limit),
    image: row.image ?? null,
    labels: row.labels ?? null,
    lat: nOrNull(row.lat),
    lon: nOrNull(row.lon),
    reference: row.reference ?? null,
    stripeCustomerId: row.stripe_customer_id ?? null,
    cardnetCustomerId: row.cardnet_customer_id ?? null,
    taxId: row.tax_id ?? null,
    taxData: row.tax_data ?? undefined,
    // La tasa ISR va normalizada a número. Antes llegaba unas veces como
    // número y otras como cadena ("0.02"), y PersonnelModule filtra con
    // `=== 0.02`, así que dejaba fuera a 5 de las 20 personas con esa tasa.
    metadata: row.metadata ?? {},
    contacts,
    // El detalle exponía además estos campos derivados de los contactos.
    contactData: contacts,
    phone: primero("phone"),
    email: primero("email") || (row.email ?? ""),
    address: primero("address"),
    conversations: [],
  } as unknown as Beneficiary;
}

export function mapDivision(row: Row): DivisionWithBalance {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    subDivisionOf: row.sub_division_of ?? null,
    organizationId: row.organization_id,
    linkedWarehouse: row.linked_warehouse ?? null,
    lat: nOrNull(row.lat),
    lon: nOrNull(row.lon),
    picture: row.picture ?? null,
    // Bandera de primer nivel: `metadata.disabled` obliga a cada consumidor a
    // rebuscar dentro de un JSON que además llega a veces como texto.
    isArchived: Boolean(row.archived_at),
    metadata: {
      ...(row.metadata ?? {}),
      // El borrado lógico de divisiones era metadata.disabled.
      ...(row.archived_at ? { disabled: true } : {}),
    },
  } as unknown as DivisionWithBalance;
}

export function mapResource(row: Row): Row {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description ?? null,
    type: row.type,
    relation: row.relation,
    unit: row.unit,
    priceStrategy: row.price_strategy,
    costStrategy: row.cost_strategy ?? null,
    variation: row.variation ?? "0",
    currency: row.currency ?? "DOP",
    sellPriceCurrency: row.currency ?? "DOP",
    sellPrice: nOrNull(row.sell_price),
    defaultCost: nOrNull(row.default_cost),
    minimumCost: nOrNull(row.minimum_cost),
    calculatedCost: nOrNull(row.calculated_cost),
    sku: row.sku ?? null,
    barCode: row.bar_code ?? null,
    divisionId: row.division_id ?? null,
    variantOf: row.variant_of ?? null,
    salesTaxRate: nOrNull(row.sales_tax_rate),
    archived: bit(row.archived_at),
    canBeSold: bit(row.can_be_sold),
    canSellWithoutStock: bit(row.can_sell_without_stock),
    followsInventory: bit(row.follows_inventory),
    requiresSerialNumbers: bit(row.requires_serial_numbers),
    quantityDecimals: row.quantity_decimals ?? 0,
    minStockAlert: nOrNull(row.min_stock_alert),
    maxStockAlert: nOrNull(row.max_stock_alert),
    clientdata: row.clientdata ?? {},
    labels: row.labels ?? [],
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    storage: [],
  };
}
