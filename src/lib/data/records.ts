/**
 * Documentos (facturas, cotizaciones, órdenes) sobre Postgres.
 *
 * El filtrado, la paginación y los agregados los resuelve la función
 * `search_pending_records`, que reproduce la semántica de
 * el endpoint de documentos del sistema anterior. Aquí solo se ensambla el JSON anidado.
 */
import { supabaseAdmin } from "@/src/lib/supabase/admin";
import { mapRecord, type Row } from "./mappers";
import type {
  PendingRecord,
  V2GetPendingRecordsResponse,
  V2GetPendingRecordsQuery,
  RecordPayload,
  InvoiceResponse,
  PayPendingRecordBody,
  PendingRecordElement,
} from "@/src/types/erp";

/**
 * Los anidados se piden sobre la TABLA, no sobre la vista: PostgREST solo
 * infiere relaciones a partir de claves ajenas reales.
 */
const EMBED = `
  *,
  beneficiaries ( id, name, type, tax_id ),
  pending_record_elements (
    *,
    pending_record_element_taxes ( *, tax_rates ( rate ) )
  ),
  payment_records ( * )
`;

/** Columnas que solo existen en la vista de totales. */
const CALCULADAS =
  "id,subtotal,taxes_amount,amount,payments_amount,isr_retention_amount," +
  "paid,due_to_pay,net_payable,shows_itbis,state,display_state";

const fallar = (contexto: string, error: { message: string }): never => {
  throw Object.assign(new Error(`${contexto}: ${error.message}`), {
    statusCode: 500,
    error: "Database error",
    message: error.message,
  });
};

/** Trae los documentos indicados, ya con totales y estado derivado. */
async function cargarPorIds(ids: number[]): Promise<PendingRecord[]> {
  if (!ids.length) return [];

  const [base, calc] = await Promise.all([
    supabaseAdmin.from("pending_records").select(EMBED).in("id", ids),
    supabaseAdmin
      .from("pending_records_computed")
      .select(CALCULADAS)
      .in("id", ids),
  ]);
  if (base.error) fallar("cargar documentos", base.error);
  if (calc.error) fallar("cargar totales", calc.error);

  type Fila = Row & { id: number };
  const totales = new Map(
    ((calc.data ?? []) as unknown as Fila[]).map((r) => [r.id, r]),
  );
  const porId = new Map(
    // El select anidado hace que el cliente infiera una union con su tipo de
    // error; el error ya se comprobo arriba, asi que se estrecha aqui.
    ((base.data ?? []) as unknown as Fila[]).map((r) => [
      r.id,
      mapRecord({ ...r, ...(totales.get(r.id) ?? {}) }),
    ]),
  );
  // Se respeta el orden que devolvió el motor de búsqueda.
  return ids.map((id) => porId.get(id)).filter(Boolean) as PendingRecord[];
}

export async function searchPendingRecords(
  query: Record<string, unknown> | V2GetPendingRecordsQuery = {},
): Promise<V2GetPendingRecordsResponse> {
  const { data, error } = await supabaseAdmin.rpc("search_pending_records", {
    p: query,
  });
  if (error) fallar("buscar documentos", error);

  // La función ya devuelve las filas anidadas: un solo viaje en vez de dos.
  const items = ((data?.items ?? []) as unknown as Row[]).map(mapRecord);
  return {
    items,
    totalItems: data.totalItems,
    totalPages: data.totalPages,
    page: data.page,
    itemsPerPage: data.itemsPerPage,
    resume: data.resume,
  } as V2GetPendingRecordsResponse;
}

export async function getPendingRecordById(
  id: number,
): Promise<PendingRecord | null> {
  const [record] = await cargarPorIds([id]);
  return record ?? null;
}

/** Alta de documento con sus líneas e impuestos, en una sola transacción. */
export async function createPendingRecord(
  payload: RecordPayload & Record<string, unknown>,
): Promise<InvoiceResponse> {
  const { data, error } = await supabaseAdmin.rpc("create_pending_record", {
    p: payload,
  });
  if (error) fallar("crear documento", error);
  return {
    id: data.id,
    status: data.state,
    number: data.taxId ?? undefined,
    createdAt: data.createdAt,
  } as InvoiceResponse;
}

/** Campos de la API -> columnas. Lo que no esté aquí se ignora. */
const COLUMNAS: Record<string, string> = {
  date: "date",
  dueDate: "due_date",
  reference: "reference",
  notes: "notes",
  description: "description",
  beneficiaryId: "beneficiary_id",
  divisionId: "division_id",
  currency: "currency",
  taxId: "tax_id",
  taxInvoiceType: "tax_invoice_type",
  isSell: "is_sell",
  type: "type",
  labels: "labels",
  clientdata: "clientdata",
  metadata: "metadata",
};

export async function updatePendingRecord(
  data: Partial<PendingRecord> & { id: number },
): Promise<V2GetPendingRecordsResponse> {
  const { id, ...resto } = data as Record<string, unknown> & { id: number };
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  for (const [clave, valor] of Object.entries(resto)) {
    const columna = COLUMNAS[clave];
    if (!columna || valor === undefined) continue;
    patch[columna] =
      columna === "is_sell" ? Boolean(valor) : (valor as unknown);
  }

  // El sistema anterior archivaba con metadata.isArchived; aquí es una columna.
  const metadata = resto.metadata as Record<string, unknown> | undefined;
  if (metadata && "isArchived" in metadata) {
    patch.archived_at = metadata.isArchived ? new Date().toISOString() : null;
  }

  const { error } = await supabaseAdmin
    .from("pending_records")
    .update(patch)
    .eq("id", id);
  if (error) fallar("actualizar documento", error);

  await registrarEvento(id, "invoice:updated", { new: patch });
  return searchPendingRecords({ ids: [id], includeArchived: "true" });
}

export async function archivePendingRecord(
  id: number,
): Promise<V2GetPendingRecordsResponse> {
  const { error } = await supabaseAdmin
    .from("pending_records")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) fallar("archivar documento", error);
  return searchPendingRecords({ ids: [id], includeArchived: "true" });
}

export async function deletePendingRecord(
  id: number,
): Promise<V2GetPendingRecordsResponse> {
  const { error } = await supabaseAdmin
    .from("pending_records")
    .delete()
    .eq("id", id);
  if (error) fallar("eliminar documento", error);
  return {
    items: [],
    totalItems: 0,
    totalPages: 0,
    page: 1,
    itemsPerPage: 25,
    resume: {},
  } as unknown as V2GetPendingRecordsResponse;
}

// ------------------------------------------------------------------- líneas

export async function createPendingRecordElement(data: {
  pendingRecordId: number;
  description: string;
  quantity: number;
  unit: string;
  price: number;
  variation: number | string;
  comment?: string | null;
}): Promise<V2GetPendingRecordsResponse> {
  const { count } = await supabaseAdmin
    .from("pending_record_elements")
    .select("*", { count: "exact", head: true })
    .eq("pending_record_id", data.pendingRecordId);

  const { error } = await supabaseAdmin.from("pending_record_elements").insert({
    pending_record_id: data.pendingRecordId,
    description: data.description,
    quantity: data.quantity,
    unit: data.unit || "UNIT",
    price: data.price,
    variation: String(data.variation ?? 0),
    price_after_variation: data.price,
    comment: data.comment ?? null,
    position: count ?? 0,
  });
  if (error) fallar("crear línea", error);
  return searchPendingRecords({
    ids: [data.pendingRecordId],
    includeArchived: "true",
  });
}

const COLUMNAS_LINEA: Record<string, string> = {
  description: "description",
  quantity: "quantity",
  unit: "unit",
  price: "price",
  variation: "variation",
  comment: "comment",
  resourceId: "resource_id",
};

export async function updatePendingRecordElement(
  data: Partial<PendingRecordElement> & { id: number },
): Promise<V2GetPendingRecordsResponse> {
  const { id, pendingRecordId, ...resto } = data as Record<string, unknown> & {
    id: number;
    pendingRecordId?: number;
  };
  const patch: Record<string, unknown> = {};
  for (const [clave, valor] of Object.entries(resto)) {
    const columna = COLUMNAS_LINEA[clave];
    if (!columna || valor === undefined) continue;
    patch[columna] = columna === "variation" ? String(valor) : valor;
  }
  if (patch.price !== undefined) patch.price_after_variation = patch.price;

  const { data: fila, error } = await supabaseAdmin
    .from("pending_record_elements")
    .update(patch)
    .eq("id", id)
    .select("pending_record_id")
    .single();
  if (error) fallar("actualizar línea", error);

  return searchPendingRecords({
    ids: [pendingRecordId ?? fila!.pending_record_id],
    includeArchived: "true",
  });
}

export async function deletePendingRecordElement(data: {
  elementId: number;
  pendingRecordId: number;
}): Promise<V2GetPendingRecordsResponse> {
  const { error } = await supabaseAdmin
    .from("pending_record_elements")
    .delete()
    .eq("id", data.elementId);
  if (error) fallar("eliminar línea", error);
  return searchPendingRecords({
    ids: [data.pendingRecordId],
    includeArchived: "true",
  });
}

export async function addPendingRecordElementTaxes(data: {
  pendingRecordElementId: number;
  taxRateId: number;
}) {
  const { error } = await supabaseAdmin
    .from("pending_record_element_taxes")
    .upsert(
      {
        pending_record_element_id: data.pendingRecordElementId,
        tax_rate_id: data.taxRateId,
        is_included_in_price: false,
      },
      { onConflict: "pending_record_element_id,tax_rate_id" },
    );
  if (error) fallar("añadir impuesto a la línea", error);
  return { success: true };
}

export async function removePendingRecordElementTaxes(data: {
  pendingRecordElementId: number;
  taxRateId: number;
}) {
  const { error } = await supabaseAdmin
    .from("pending_record_element_taxes")
    .delete()
    .eq("pending_record_element_id", data.pendingRecordElementId)
    .eq("tax_rate_id", data.taxRateId);
  if (error) fallar("quitar impuesto de la línea", error);
  return { success: true };
}

// -------------------------------------------------------------------- pagos

export async function payPendingRecord(
  data: PayPendingRecordBody,
): Promise<PayPendingRecordBody> {
  const { error } = await supabaseAdmin.rpc("pay_pending_record", { p: data });
  if (error) fallar("registrar pago", error);
  await registrarEvento(data.pendingRecordId, "invoice:paid", {
    amount: data.amount,
  });
  return data;
}

/** Conversión cotización -> orden -> factura, clonando líneas e impuestos. */
export async function createFromPendingRecord(data: {
  id: number;
  type: "ORDER" | "INVOICE";
}): Promise<InvoiceResponse> {
  const { data: nuevo, error } = await supabaseAdmin.rpc(
    "create_from_pending_record",
    { p_source_id: data.id, p_type: data.type },
  );
  if (error) fallar("convertir documento", error);
  return {
    id: nuevo.id,
    status: nuevo.state,
    createdAt: nuevo.createdAt,
  } as InvoiceResponse;
}

// ----------------------------------------------------------------- eventos

async function registrarEvento(
  pendingRecordId: number,
  type: string,
  payload: Record<string, unknown>,
) {
  // La auditoría no debe tumbar la operación que la origina.
  const { error } = await supabaseAdmin
    .from("record_events")
    .insert({ pending_record_id: pendingRecordId, type, payload });
  if (error) console.error(`auditoría (${type}): ${error.message}`);
}

export async function getRecordEvents(pendingRecordId: number) {
  const { data, error } = await supabaseAdmin
    .from("record_events")
    .select("*")
    .eq("pending_record_id", pendingRecordId)
    .order("created_at", { ascending: false });
  if (error) fallar("leer auditoría", error);
  return (data ?? []).map((e: Row) => ({
    id: String(e.id),
    organizationId: "",
    createdAt: e.created_at,
    type: e.type,
    payload: { invoiceId: String(pendingRecordId), ...(e.payload ?? {}) },
    bySystem: e.by_system,
    details: e.details ?? undefined,
  }));
}
