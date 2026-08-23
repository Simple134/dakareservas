/**
 * Beneficiarios, divisiones, recursos, impuestos y appData sobre Postgres.
 * Las firmas y la forma de respuesta replican las que consumía la UI antes de la migración.
 */
import { supabaseAdmin } from "@/src/lib/supabase/admin";
import { mapBeneficiary, mapDivision, mapResource, type Row } from "./mappers";
import type {
  Beneficiary,
  BeneficiaryQueryParams,
  CreateBeneficiaryBody,
  BeneficiaryContactResponse,
  DivisionWithBalance,
  Division,
  DivisionPayload,
  CreateResourceBody,
  GetResourcesQuery,
  V2GetResourcesResponse,
  AppData,
  AppDataExplorerResponse,
  CreateContactDataBody,
  CreateContactDataResponse,
  UpdateContactDataBody,
  UpdateContactDataResponse,
  TaxRate,
} from "@/src/types/erp";

const fallar = (contexto: string, error: { message: string }): never => {
  throw Object.assign(new Error(`${contexto}: ${error.message}`), {
    statusCode: 500,
    error: "Database error",
    message: error.message,
  });
};

/** La organización es única en esta instalación; se toma de la división raíz. */
async function organizacion(): Promise<number> {
  const { data } = await supabaseAdmin
    .from("divisions")
    .select("organization_id")
    .limit(1)
    .single();
  return data?.organization_id ?? 0;
}

// ------------------------------------------------------------ beneficiarios

const EMBED_BENEFICIARIO = "*, beneficiary_contacts ( * )";

export async function getBeneficiaries(
  params: BeneficiaryQueryParams = {},
): Promise<Beneficiary[]> {
  // withContacts se ignoraba: el embed iba siempre y devolvia 68KB a quien
  // solo necesitaba nombres. El coste esta en los bytes, no en la consulta.
  const conContactos = params.withContacts !== "false";
  let q = supabaseAdmin
    .from("beneficiaries")
    .select(conContactos ? EMBED_BENEFICIARIO : "*");

  if (params.type) q = q.eq("type", params.type);
  if (params.search) q = q.ilike("name", `%${params.search}%`);
  if (params.minId) q = q.gte("id", Number(params.minId));
  // El sistema anterior ocultaba los archivados salvo petición explícita.
  q = q.is("archived_at", null);
  q = q.order("name", { ascending: true });
  if (params.elementsPerPage) q = q.limit(Number(params.elementsPerPage));
  else q = q.limit(1000);

  const { data, error } = await q;
  if (error) fallar("listar beneficiarios", error);
  return (data ?? []).map(mapBeneficiary);
}

export async function getBeneficiaryById(
  id: string | number,
): Promise<Beneficiary> {
  const { data, error } = await supabaseAdmin
    .from("beneficiaries")
    .select(EMBED_BENEFICIARIO)
    .eq("id", Number(id))
    .single();
  if (error) fallar("leer beneficiario", error);
  return mapBeneficiary(data);
}

/** Normaliza la tasa ISR: llegaba como number o como string ("0.10"). */
function tasaIsr(metadata: Record<string, unknown> | undefined): number {
  const bruto = metadata?.isrTaxRetention;
  if (bruto === undefined || bruto === null || bruto === "") return 0;
  const valor = Number(bruto);
  if (!Number.isFinite(valor)) return 0;
  // Un valor mayor que 1 viene de guardar un porcentaje sin normalizar.
  return valor > 1 ? valor / 100 : valor;
}

export async function addBeneficiary(
  params: CreateBeneficiaryBody,
): Promise<BeneficiaryContactResponse> {
  const metadata = (params.metadata ?? {}) as Record<string, unknown>;
  const { data, error } = await supabaseAdmin
    .from("beneficiaries")
    .insert({
      organization_id: await organizacion(),
      name: params.name,
      type: params.type,
      tax_id: params.taxId ?? null,
      reference: params.reference ?? null,
      labels: params.labels ?? [],
      credit_limit: params.creditLimit ?? null,
      lat: params.lat ?? null,
      lon: params.lon ?? null,
      metadata: { ...metadata, isrTaxRetention: tasaIsr(metadata) },
    })
    .select("id")
    .single();
  if (error) fallar("crear beneficiario", error);

  const contactos = params.contact ?? [];
  if (contactos.length) {
    const { error: e } = await supabaseAdmin
      .from("beneficiary_contacts")
      .insert(
        contactos.map((c) => ({
          beneficiary_id: data!.id,
          type: c.type,
          data: c.data,
          data_type: c.dataType ?? "string",
        })),
      );
    if (e) fallar("crear contactos del beneficiario", e);
  }
  return {
    id: data!.id,
    beneficiaryId: data!.id,
  } as BeneficiaryContactResponse;
}

export async function updateBeneficiary(
  params: CreateBeneficiaryBody & { id: number; archived?: boolean },
): Promise<Beneficiary> {
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (params.name !== undefined) patch.name = params.name;
  if (params.type !== undefined) patch.type = params.type;
  if (params.taxId !== undefined) patch.tax_id = params.taxId;
  if (params.reference !== undefined) patch.reference = params.reference;
  if (params.labels !== undefined) patch.labels = params.labels;
  if (params.creditLimit !== undefined) patch.credit_limit = params.creditLimit;
  if (params.lat !== undefined) patch.lat = params.lat;
  if (params.lon !== undefined) patch.lon = params.lon;
  if (params.metadata !== undefined) {
    const m = params.metadata as Record<string, unknown>;
    patch.metadata = { ...m, isrTaxRetention: tasaIsr(m) };
  }
  // El sistema anterior archivaba con `archived: true` en el mismo PATCH.
  if (params.archived !== undefined) {
    patch.archived_at = params.archived ? new Date().toISOString() : null;
  }

  const { error } = await supabaseAdmin
    .from("beneficiaries")
    .update(patch)
    .eq("id", params.id);
  if (error) fallar("actualizar beneficiario", error);
  return getBeneficiaryById(params.id);
}

export async function archiveBeneficiary(
  id: number,
): Promise<BeneficiaryContactResponse> {
  const { error } = await supabaseAdmin
    .from("beneficiaries")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) fallar("archivar beneficiario", error);
  return { id, beneficiaryId: id } as BeneficiaryContactResponse;
}

export async function createContactData(
  data: CreateContactDataBody,
): Promise<CreateContactDataResponse> {
  const { data: fila, error } = await supabaseAdmin
    .from("beneficiary_contacts")
    .insert({
      beneficiary_id: data.beneficiaryId,
      type: data.type,
      data: data.data,
      data_type: data.dataType ?? "string",
    })
    .select("id")
    .single();
  if (error) fallar("crear contacto", error);
  return { contactId: fila!.id };
}

export async function updateContactData(
  data: UpdateContactDataBody,
): Promise<UpdateContactDataResponse> {
  const { error } = await supabaseAdmin
    .from("beneficiary_contacts")
    .update({
      type: data.type,
      data: data.data,
      data_type: data.dataType ?? "string",
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.id);
  if (error) fallar("actualizar contacto", error);
  return { contactId: data.id };
}

export async function deleteContactData(id: number): Promise<void> {
  const { error } = await supabaseAdmin
    .from("beneficiary_contacts")
    .delete()
    .eq("id", id);
  if (error) fallar("eliminar contacto", error);
}

// --------------------------------------------------------------- divisiones

export async function getDivisions(
  opciones: { includeArchived?: boolean } = {},
): Promise<DivisionWithBalance[]> {
  /* El sistema anterior devolvía también las deshabilitadas confiando en que
   * «la UI las filtra por su cuenta». No lo hacía ninguna: ni el side-rail ni
   * el dashboard, así que un proyecto eliminado seguía apareciendo en las dos
   * listas y el borrado parecía no funcionar. Se filtra en el origen. */
  let consulta = supabaseAdmin
    .from("divisions")
    .select("*")
    .order("id", { ascending: true });
  if (!opciones.includeArchived) consulta = consulta.is("archived_at", null);

  const { data, error } = await consulta;
  if (error) fallar("listar divisiones", error);
  return (data ?? []).map(mapDivision);
}

export async function getDivisionById(
  id: number,
): Promise<DivisionWithBalance[]> {
  const { data, error } = await supabaseAdmin
    .from("divisions")
    .select("*")
    .eq("id", id);
  if (error) fallar("leer división", error);
  // El endpoint anterior devolvía un array incluso para un solo id.
  return (data ?? []).map(mapDivision);
}

export async function postDivision(
  payload: DivisionPayload,
): Promise<Division> {
  const { data, error } = await supabaseAdmin
    .from("divisions")
    .insert({
      organization_id: await organizacion(),
      name: payload.name,
      type: payload.type ?? "PROJECT",
      sub_division_of: payload.subDivisionOf ?? null,
      linked_warehouse: payload.linkedWarehouse ?? null,
      lat: payload.lat ?? null,
      lon: payload.lon ?? null,
      metadata: payload.metadata ?? {},
    })
    .select("*")
    .single();
  if (error) fallar("crear división", error);
  return mapDivision(data);
}

export async function updateDivision(
  payload: DivisionPayload & { id?: number },
): Promise<Division> {
  const id = (payload as { id?: number }).id;
  if (!id) throw new Error("updateDivision requiere id");

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (payload.name !== undefined) patch.name = payload.name;
  if (payload.type !== undefined) patch.type = payload.type;
  if (payload.subDivisionOf !== undefined)
    patch.sub_division_of = payload.subDivisionOf;
  if (payload.lat !== undefined) patch.lat = payload.lat;
  if (payload.lon !== undefined) patch.lon = payload.lon;

  if (payload.metadata !== undefined) {
    const meta = payload.metadata as Record<string, unknown>;
    // La UI manda el metadata completo, pero usa metadata.disabled como
    // borrado lógico; eso se traduce a la columna.
    if ("disabled" in meta) {
      patch.archived_at = meta.disabled ? new Date().toISOString() : null;
    }
    patch.metadata = meta;
  }

  const { data, error } = await supabaseAdmin
    .from("divisions")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) fallar("actualizar división", error);
  return mapDivision(data);
}

export async function archiveDivision(id: number): Promise<Division> {
  const { data, error } = await supabaseAdmin
    .from("divisions")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) fallar("archivar división", error);
  return mapDivision(data);
}

// ----------------------------------------------------------------- recursos

export async function v2GetResources(
  query: GetResourcesQuery = {},
): Promise<V2GetResourcesResponse> {
  const porPagina = Math.min(Number(query.elementsPerPage ?? 50), 500);
  const pagina = Math.max(Number(query.page ?? 1), 1);
  const desde = (pagina - 1) * porPagina;

  let q = supabaseAdmin
    .from("resources")
    .select("*, resource_storage ( * )", { count: "exact" });
  if (query.type) q = q.eq("type", query.type);
  if (query.priceStrategy) q = q.eq("price_strategy", query.priceStrategy);
  if (query.currency) q = q.eq("currency", query.currency);
  if (query.divisionId) q = q.eq("division_id", query.divisionId);
  if (query.search) q = q.ilike("name", `%${query.search}%`);
  // `archived` llegaba como cadena y en el sistema anterior "true" significaba
  // "incluir también los archivados", no "solo los archivados".
  if (String(query.archived) !== "true") q = q.is("archived_at", null);

  const { data, error, count } = await q
    .order("name", { ascending: true })
    .range(desde, desde + porPagina - 1);
  if (error) fallar("listar recursos", error);

  return {
    items: (data ?? []).map(mapResource),
    totalItems: count ?? 0,
    totalPages: Math.ceil((count ?? 0) / porPagina),
    page: pagina,
    itemsPerPage: porPagina,
  } as unknown as V2GetResourcesResponse;
}

export async function addResource(
  payload: CreateResourceBody,
): Promise<CreateResourceBody> {
  const { data, error } = await supabaseAdmin
    .from("resources")
    .insert({
      organization_id: await organizacion(),
      name: payload.name,
      description: payload.description ?? null,
      type: payload.type,
      relation: payload.relation,
      unit: payload.unit,
      price_strategy: payload.priceStrategy,
      cost_strategy: payload.costStrategy ?? null,
      variation: String(payload.variation ?? 0),
      currency: payload.currency ?? "DOP",
      default_cost: payload.defaultCost ?? null,
      sku: payload.sku ?? null,
      bar_code: payload.barCode ?? null,
      division_id: payload.divisionId ?? null,
      can_be_sold: payload.canBeSold ?? true,
      can_sell_without_stock: payload.canSellWithoutStock ?? true,
      follows_inventory: payload.followsInventory ?? true,
      requires_serial_numbers: payload.requiresSerialNumbers ?? false,
      quantity_decimals: payload.quantityDecimals ?? 0,
      min_stock_alert: payload.minStockAlert ?? null,
      max_stock_alert: payload.maxStockAlert ?? null,
      clientdata: payload.clientdata ?? {},
      labels: payload.labels ?? [],
    })
    .select("*")
    .single();
  if (error) fallar("crear recurso", error);
  return mapResource(data) as unknown as CreateResourceBody;
}

export async function updateResource(
  payload: CreateResourceBody & { id?: number },
): Promise<CreateResourceBody> {
  const id = (payload as { id?: number }).id;
  if (!id) throw new Error("updateResource requiere id");
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (payload.name !== undefined) patch.name = payload.name;
  if (payload.description !== undefined)
    patch.description = payload.description;
  if (payload.unit !== undefined) patch.unit = payload.unit;
  if (payload.variation !== undefined)
    patch.variation = String(payload.variation);
  if (payload.defaultCost !== undefined)
    patch.default_cost = payload.defaultCost;
  if (payload.sku !== undefined) patch.sku = payload.sku;
  if (payload.clientdata !== undefined) patch.clientdata = payload.clientdata;

  const { data, error } = await supabaseAdmin
    .from("resources")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error) fallar("actualizar recurso", error);
  return mapResource(data) as unknown as CreateResourceBody;
}

export async function archiveResource(id: number): Promise<CreateResourceBody> {
  const { data, error } = await supabaseAdmin
    .from("resources")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();
  if (error) fallar("archivar recurso", error);
  return mapResource(data) as unknown as CreateResourceBody;
}

// --------------------------------------------------------------- impuestos

export async function getTaxesList(): Promise<TaxRate[]> {
  const { data, error } = await supabaseAdmin
    .from("tax_rates")
    .select("*")
    .order("id", { ascending: true });
  if (error) fallar("listar impuestos", error);
  return (data ?? []).map((t: Row) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    rate: Number(t.rate),
    country: t.country,
    category: t.category,
    mode: t.mode,
    organizationId: t.organization_id,
  }));
}

export async function getNextInvoiceNumeral(data: {
  type: string;
}): Promise<string> {
  const { data: numeral, error } = await supabaseAdmin.rpc(
    "next_fiscal_numeral",
    { p_type: data.type },
  );
  if (error) fallar("asignar comprobante fiscal", error);
  return numeral as string;
}

// ----------------------------------------------------------------- appData

export async function getAppDataTypes(
  appId: number | string,
): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("app_data")
    .select("type")
    .eq("app_id", String(appId));
  if (error) fallar("listar tipos de appData", error);
  return [...new Set((data ?? []).map((r: { type: string }) => r.type))];
}

const mapAppData = (r: Row): AppData => ({
  id: r.id,
  appId: Number(r.app_id),
  type: r.type,
  organizationId: r.organization_id,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  data: r.data ?? {},
});

export async function getAppData(
  appId: number | string,
  query: Record<string, unknown> = {},
): Promise<AppDataExplorerResponse> {
  let q = supabaseAdmin
    .from("app_data")
    .select("*")
    .eq("app_id", String(appId));
  if (query.type) q = q.eq("type", String(query.type));
  const { data, error } = await q.order("id", { ascending: true });
  if (error) fallar("leer appData", error);
  return {
    appData: (data ?? []).map(mapAppData),
    organizations: {},
  } as AppDataExplorerResponse;
}

export async function updateAppData(params: {
  id: number;
  appId: number;
  type: string;
  data: Record<string, unknown>;
  strategy?: "merge" | "replace";
}): Promise<AppData> {
  // "merge" combina en el primer nivel, como antes; "replace"
  // sustituye el objeto entero. Varias pantallas de locales dependen de la
  // diferencia (LocalPaymentsModal usa merge sobre el array de pagos).
  let payload = params.data;
  if ((params.strategy ?? "merge") === "merge") {
    const { data: actual } = await supabaseAdmin
      .from("app_data")
      .select("data")
      .eq("id", params.id)
      .single();
    payload = { ...((actual?.data as object) ?? {}), ...params.data };
  }

  const { data, error } = await supabaseAdmin
    .from("app_data")
    .upsert(
      {
        id: params.id,
        app_id: String(params.appId),
        type: params.type,
        data: payload,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("*")
    .single();
  if (error) fallar("actualizar appData", error);
  return mapAppData(data);
}

export async function deleteAppData(id: number): Promise<void> {
  const { error } = await supabaseAdmin.from("app_data").delete().eq("id", id);
  if (error) fallar("eliminar appData", error);
}
