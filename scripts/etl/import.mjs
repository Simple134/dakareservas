// Fase 1 del ETL, paso 2: carga scripts/etl/raw/*.json en Supabase.
// Idempotente (upsert por PK): se puede re-ejecutar sin duplicar. No vuelve a
// llamar a Gestiono; solo lee los ficheros que dejo extract.mjs.
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key) {
  console.error(
    "Falta SUPABASE_SERVICE_ROLE_KEY en .env.\n" +
      "Supabase Dashboard > Project Settings > API > service_role.",
  );
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const RAW = path.join(import.meta.dirname, "raw");
const read = (n) =>
  JSON.parse(fs.readFileSync(path.join(RAW, `${n}.json`), "utf8"));

// --- helpers de normalizacion -------------------------------------------
// Gestiono devuelve semi-booleanos como 0/1 segun el endpoint, y numeros como
// strings ("0.02", "0.10") en metadata. Se normaliza todo aqui.
const bool = (v, def = false) =>
  v === undefined || v === null
    ? def
    : v === true || v === 1 || v === "1" || v === "true";
const num = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};
const txt = (v) =>
  v === undefined || v === null || v === "" ? null : String(v);
const iso = (v) => (v ? new Date(v).toISOString() : null);
const obj = (v) => {
  if (!v) return {};
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return { _raw: v };
    }
  }
  return v;
};
const arr = (v) => (Array.isArray(v) ? v : []);

async function upsert(table, rows, label = table) {
  if (!rows.length) {
    console.log(`  ${label}: 0`);
    return;
  }
  // Tandas para no exceder el limite de payload de PostgREST.
  const SIZE = 200;
  for (let i = 0; i < rows.length; i += SIZE) {
    const chunk = rows.slice(i, i + SIZE);
    const { error } = await db.from(table).upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error(`  ${label}: ERROR en filas ${i}-${i + chunk.length - 1}`);
      console.error(`    ${error.message}`);
      console.error(`    ejemplo: ${JSON.stringify(chunk[0]).slice(0, 400)}`);
      process.exit(1);
    }
  }
  console.log(`  ${label}: ${rows.length}`);
}

// --- divisiones ---------------------------------------------------------
// Se insertan en dos pasadas: primero sin sub_division_of, luego el enlace,
// porque la tabla se autorreferencia y el orden del array no garantiza que el
// padre exista antes que el hijo.
console.log("divisions");
const divisions = read("divisions");
const divRows = divisions.map((d) => ({
  id: d.id,
  organization_id: d.organizationId,
  name: d.name,
  type: d.type ?? "PROJECT",
  linked_warehouse: num(d.linkedWarehouse),
  lat: num(d.lat),
  lon: num(d.lon),
  picture: txt(d.picture),
  metadata: obj(d.metadata),
  // En Gestiono el borrado logico de divisiones era metadata.disabled.
  archived_at: obj(d.metadata).disabled ? new Date(0).toISOString() : null,
}));
await upsert("divisions", divRows);
await upsert(
  "divisions",
  divisions
    .filter((d) => d.subDivisionOf)
    .map((d) => ({
      ...divRows.find((r) => r.id === d.id),
      sub_division_of: d.subDivisionOf,
    })),
  "divisions (jerarquia)",
);

// --- beneficiarios -----------------------------------------------------
console.log("beneficiaries");
const beneficiaries = read("beneficiaries");
// La tasa ISR llega como number o como string ("0", "0.02", "0.10").
const isrRate = (b) => num(obj(b.metadata).isrTaxRetention) ?? 0;
await upsert(
  "beneficiaries",
  beneficiaries.map((b) => ({
    id: b.id,
    organization_id: b.organizationId,
    name: b.name,
    type: b.type,
    tax_id: txt(b.taxId),
    reference: txt(b.reference),
    referred_by: txt(b.referredBy),
    image: txt(b.image),
    labels: arr(b.labels),
    lat: num(b.lat),
    lon: num(b.lon),
    credit_limit: num(b.creditLimit),
    // Puede apuntar a una division que no exista; se deja nulo en ese caso.
    assigned_division_id: divRows.some((d) => d.id === b.assignedDivisionId)
      ? b.assignedDivisionId
      : null,
    stripe_customer_id: txt(b.stripeCustomerId),
    cardnet_customer_id: txt(b.cardnetCustomerId),
    tax_data: b.taxData ?? null,
    // Se normaliza la tasa a numero para que el front no reciba strings.
    metadata: { ...obj(b.metadata), isrTaxRetention: isrRate(b) },
    archived_at: bool(b.archived) ? new Date(0).toISOString() : null,
  })),
);

// Los contactos vienen en `contacts` (listado) o `contactData` (detalle).
const contacts = beneficiaries.flatMap((b) =>
  [...arr(b.contacts), ...arr(b.contactData)].map((c) => ({
    id: c.id,
    beneficiary_id: c.beneficiaryId ?? b.id,
    type: c.type,
    data: String(c.data ?? ""),
    data_type: c.dataType ?? "string",
    created_at: iso(c.createdAt) ?? new Date().toISOString(),
    updated_at: iso(c.updatedAt),
  })),
);
// Ambas fuentes se solapan; dedup por id.
await upsert("beneficiary_contacts", [
  ...new Map(contacts.map((c) => [c.id, c])).values(),
]);

// --- recursos ----------------------------------------------------------
console.log("resources");
await upsert(
  "resources",
  read("resources").map((r) => ({
    id: r.id,
    organization_id: r.organizationId,
    name: r.name,
    description: txt(r.description),
    type: r.type,
    relation: r.relation,
    unit: r.unit,
    price_strategy: r.priceStrategy,
    cost_strategy: txt(r.costStrategy),
    variation: txt(r.variation) ?? "0",
    currency: r.currency ?? r.sellPriceCurrency ?? "DOP",
    sell_price: num(r.sellPrice),
    default_cost: num(r.defaultCost),
    minimum_cost: num(r.minimumCost),
    calculated_cost: num(r.calculatedCost),
    sku: txt(r.sku),
    bar_code: txt(r.barCode),
    division_id: divRows.some((d) => d.id === r.divisionId)
      ? r.divisionId
      : null,
    sales_tax_rate: num(r.salesTaxRate),
    can_be_sold: bool(r.canBeSold, true),
    can_sell_without_stock: bool(r.canSellWithoutStock, true),
    follows_inventory: bool(r.followsInventory, true),
    requires_serial_numbers: bool(r.requiresSerialNumbers, false),
    quantity_decimals: r.quantityDecimals ?? 0,
    min_stock_alert: num(r.minStockAlert),
    max_stock_alert: num(r.maxStockAlert),
    clientdata: obj(r.clientdata),
    labels: arr(r.labels),
    archived_at: bool(r.archived) ? new Date(0).toISOString() : null,
  })),
);

// --- facturas ----------------------------------------------------------
console.log("pendingRecords");
const records = read("pendingRecords");
// Los recursos archivados solo aparecen pidiendo /v2/resource con
// archived=true. Si aun asi falta alguno referenciado, se avisa en vez de
// dejar la FK romper el import o perder el enlace en silencio.
const resourceIds = new Set(read("resources").map((x) => x.id));
let huerfanas = 0;
const resourceRef = (id) => {
  if (!id) return null;
  if (resourceIds.has(id)) return id;
  huerfanas++;
  return null;
};

await upsert(
  "pending_records",
  records.map((r) => ({
    id: r.id,
    organization_id: r.organizationId,
    division_id: r.divisionId,
    beneficiary_id: r.beneficiaryId,
    user_id: num(r.userId),
    type: r.type,
    // Solo rastro de auditoria: el estado valido se deriva en
    // pending_records_computed. Ver extract-states.mjs.
    state_snapshot: r.state,
    is_sell: bool(r.isSell),
    is_instant_delivery: bool(r.isInstantDelivery, true),
    currency: r.currency ?? "DOP",
    date: iso(r.date),
    due_date: iso(r.dueDate),
    tax_id: txt(r.taxId),
    tax_invoice_type: num(r.taxInvoiceType),
    sales_tax_reduced: bool(r.salesTaxReduced),
    sales_tax_retention: num(r.salesTaxRetention) ?? 0,
    // Tasa congelada, derivada SIEMPRE del propio documento
    // (isrTaxRetention / subTotal). No se usa la del beneficiario como respaldo:
    // la retencion solo aplica a compras (verificado: los 84 documentos con
    // retencion son isSell=0), asi que en una venta a un proveedor con tasa
    // configurada el respaldo inventaba una retencion que nunca existio. Ademas
    // la tasa del beneficiario pudo cambiar despues de emitir la factura.
    isr_retention_rate:
      r.subTotal > 0 && r.isrTaxRetention > 0
        ? Number((r.isrTaxRetention / r.subTotal).toFixed(4))
        : 0,
    payroll_deduction: num(r.payrollDeduction) ?? 0,
    // Gestiono poblaba estos dos campos con un artefacto interno que su propio
    // `amount` ignoraba (verificado: amount = subTotal + taxes en los 399).
    // Importarlos tal cual descuadraba 172 documentos. Los valores originales
    // quedan en imported_totals para poder auditarlos.
    pre_taxes_discount: 0,
    after_taxes_discount: 0,
    reference: txt(r.reference),
    description: txt(r.description),
    notes: txt(r.notes),
    sold_by: num(r.soldBy),
    source: txt(r.source),
    tax_entity_currency_rate: num(r.taxEntityCurrencyRate),
    created_by_recurrent_invoice: bool(r.createdByRecurrentInvoice),
    labels: arr(r.labels),
    clientdata: obj(r.clientdata),
    metadata: obj(r.metadata),
    // Totales tal como los dio Gestiono, para conciliar contra lo que
    // recalculamos. No los consume la app.
    imported_totals: {
      subTotal: r.subTotal,
      taxes: r.taxes,
      amount: r.amount,
      paid: r.paid,
      dueToPay: r.dueToPay,
      paymentsAmount: r.paymentsAmount,
      isrTaxRetention: r.isrTaxRetention,
      salesTaxRetention: r.salesTaxRetention,
      grossProfit: r.grossProfit,
      resourceCost: r.resourceCost,
      creditPayments: r.creditPayments,
      givenCredit: r.givenCredit,
      creditDue: r.creditDue,
      subTotalWithoutDiscount: r.subTotalWithoutDiscount,
      totalReturnedValue: r.totalReturnedValue,
      returnsCount: r.returnsCount,
    },
    archived_at: bool(r.isArchived) ? new Date(0).toISOString() : null,
  })),
);

// sourcePendingRecordId en segunda pasada: la tabla se autorreferencia.
const recIds = new Set(records.map((r) => r.id));
const links = records.filter(
  (r) => r.sourcePendingRecordId && recIds.has(r.sourcePendingRecordId),
);
if (links.length) {
  for (const r of links) {
    const { error } = await db
      .from("pending_records")
      .update({ source_pending_record_id: r.sourcePendingRecordId })
      .eq("id", r.id);
    if (error) {
      console.error(`  enlace ${r.id}: ${error.message}`);
      process.exit(1);
    }
  }
}
console.log(`  pending_records (enlaces de conversion): ${links.length}`);

await upsert(
  "pending_record_elements",
  records.flatMap((r) =>
    arr(r.elements).map((e, i) => ({
      id: e.id,
      pending_record_id: r.id,
      resource_id: resourceRef(e.resourceId),
      description: e.description ?? "",
      quantity: num(e.quantity) ?? 0,
      unit: e.unit ?? "UNIT",
      price: num(e.price) ?? 0,
      variation: txt(e.variation) ?? "0",
      resource_cost: num(e.resourceCost),
      price_after_variation: num(e.priceAfterVariation),
      price_tier_id: num(e.priceTierId),
      serial_numbers: arr(e.serialNumbers),
      // La UI guarda aqui la categoria de presupuesto del proyecto.
      comment: txt(e.comment),
      position: i,
    })),
  ),
);

if (huerfanas) {
  console.log(
    `  AVISO: ${huerfanas} lineas referencian un recurso inexistente; se importan sin enlace.`,
  );
}

await upsert(
  "pending_record_element_taxes",
  records.flatMap((r) =>
    arr(r.elements).flatMap((e) =>
      arr(e.taxes).map((t) => ({
        id: t.id,
        pending_record_element_id: t.pendingRecordElementId ?? e.id,
        tax_rate_id: t.taxRateId,
        is_included_in_price: bool(t.isIncludedInPrice),
      })),
    ),
  ),
);

await upsert(
  "payment_records",
  records.flatMap((r) =>
    arr(r.payments).map((p) => ({
      id: p.id,
      pending_record_id: p.pendingRecordId ?? r.id,
      account_id: p.accountId ?? null,
      type: p.type ?? "PAYMENT",
      // En las compras Gestiono guardaba el pago en negativo (salida de caja).
      // Se normaliza a positivo: el signo se deriva de is_sell del documento.
      amount: Math.abs(num(p.amount) ?? 0),
      currency: p.currency ?? "DOP",
      payment_method: p.paymentMethod ?? "CASH",
      state: p.state ?? "COMPLETED",
      date: iso(p.date),
      amount_conversion: num(p.amountConversion),
      received_from: p.receivedFrom ?? null,
      division_id: divRows.some((d) => d.id === p.divisionId)
        ? p.divisionId
        : null,
      beneficiary_id: beneficiaries.some((b) => b.id === p.beneficiaryId)
        ? p.beneficiaryId
        : null,
      category_id: num(p.categoryId),
      user_id: num(p.userId),
      reference: txt(p.reference),
      description: txt(p.description),
      clientdata: obj(p.clientdata),
      labels: arr(p.labels),
      metadata: obj(p.metadata),
    })),
  ),
);

// --- appData -----------------------------------------------------------
// Espejo JSON de locales/reservas/payments/User que Gestiono guardaba aparte.
// Se importa tal cual, SIN normalizar: localInfo y paymentPlan van como
// strings JSON dentro del jsonb y los PDF de locales dependen de esa forma.
console.log("appData");
const appData = read("appData");
await upsert(
  "app_data",
  Object.entries(appData).flatMap(([appId, v]) =>
    Object.entries(v.data).flatMap(([type, rows]) =>
      arr(rows).map((row) => ({
        id: row.id,
        app_id: String(appId),
        type,
        organization_id: row.organizationId ?? null,
        data: obj(row.data),
        created_at: iso(row.createdAt) ?? new Date().toISOString(),
        updated_at: iso(row.updatedAt),
      })),
    ),
  ),
);

// --- secuencias --------------------------------------------------------
const { data: seqs, error: seqErr } = await db.rpc("erp_sync_id_sequences");
if (seqErr) {
  console.error(`secuencias: ${seqErr.message}`);
  process.exit(1);
}
console.log("\nsecuencias reposicionadas:");
for (const s of seqs ?? []) console.log(`  ${s.table_name} -> ${s.new_value}`);

console.log("\nimport completo.");
