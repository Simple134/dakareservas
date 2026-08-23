/**
 * Capa de acceso a los datos del ERP, sobre Postgres.
 *
 * Conserva las firmas y la forma de respuesta que consumían los route handlers
 * y la UI desde antes de la migración, así que las pantallas no tuvieron que
 * cambiar. Donde el sistema anterior tenía un defecto que hacía inservible el
 * dato, aquí se devuelve el valor correcto en vez de reproducir el defecto; esos
 * casos están anotados uno por uno.
 */
import * as records from "@/src/lib/data/records";
import * as entities from "@/src/lib/data/entities";
import * as files from "@/src/lib/data/files";
import type {
  RecordPayload,
  InvoiceResponse,
  EventsQueryParams,
  EventsResponse,
  ErpEvent,
  BeneficiaryQueryParams,
  BeneficiaryPayload,
  DivisionWithBalance,
  Division,
  DivisionPayload,
  V2GetPendingRecordsResponse,
  V2GetPendingRecordsQuery,
  CreateBeneficiaryBody,
  BeneficiaryContactResponse,
  PayPendingRecordBody,
  CreateResourceBody,
  GetResourcesQuery,
  V2GetResourcesResponse,
  Beneficiary,
  PendingRecord,
  PendingRecordElement,
  AppDataExplorerResponse,
  AppData,
  CreateContactDataBody,
  CreateContactDataResponse,
  UpdateContactDataBody,
  UpdateContactDataResponse,
} from "@/src/types/erp";

// ------------------------------------------------------------- documentos

export const createPendingRecord = (
  invoiceData: RecordPayload,
): Promise<InvoiceResponse> =>
  records.createPendingRecord(invoiceData as never);

export const payPendingRecord = (
  data: PayPendingRecordBody,
): Promise<PayPendingRecordBody> => records.payPendingRecord(data);

export const getPendingRecords = (
  params: Record<string, unknown> = {},
): Promise<V2GetPendingRecordsResponse> => records.searchPendingRecords(params);

export const v2GetPendingRecords = (
  data: V2GetPendingRecordsQuery,
): Promise<V2GetPendingRecordsResponse> => records.searchPendingRecords(data);

export const updatePendingRecord = (
  data: Partial<PendingRecord> & { id: number },
): Promise<V2GetPendingRecordsResponse> => records.updatePendingRecord(data);

export const archivePendingRecord = (
  id: number,
): Promise<V2GetPendingRecordsResponse> => records.archivePendingRecord(id);

export const deletePendingRecord = (
  recordId: number,
): Promise<V2GetPendingRecordsResponse> =>
  records.deletePendingRecord(recordId);

export const createFromPendingRecord = (data: {
  id: number;
  type: "ORDER" | "INVOICE";
}): Promise<InvoiceResponse> => records.createFromPendingRecord(data);

/**
 * Detalle de un documento. Antes no existía como endpoint: la ruta
 * app/api/erp/pendingRecord/[id] solo exportaba PATCH y DELETE, y los
 * cinco sitios de la UI que le hacían GET recibían un 405.
 */
export const getPendingRecordById = (
  id: number,
): Promise<PendingRecord | null> => records.getPendingRecordById(id);

// ------------------------------------------------------------------ líneas

export const createPendingRecordElement = (data: {
  pendingRecordId: number;
  description: string;
  quantity: number;
  unit: string;
  price: number;
  variation: number;
}): Promise<V2GetPendingRecordsResponse> =>
  records.createPendingRecordElement(data);

export const updatePendingRecordElement = (
  data: Partial<PendingRecordElement> & { id: number },
): Promise<V2GetPendingRecordsResponse> =>
  records.updatePendingRecordElement(data);

export const deletePendingRecordElement = (data: {
  elementId: number;
  pendingRecordId: number;
}): Promise<V2GetPendingRecordsResponse> =>
  records.deletePendingRecordElement(data);

export const addPendingRecordElementTaxes = (data: {
  pendingRecordElementId: number;
  taxRateId: number;
}) => records.addPendingRecordElementTaxes(data);

export const removePendingRecordElementTaxes = (data: {
  pendingRecordElementId: number;
  taxRateId: number;
}) => records.removePendingRecordElementTaxes(data);

// ----------------------------------------------------------------- eventos

export async function fetchOrganizationEvents(
  params: EventsQueryParams = {},
): Promise<EventsResponse> {
  const invoiceId = (params.payloadFilter as { invoiceId?: string } | undefined)
    ?.invoiceId;
  const data = invoiceId
    ? await records.getRecordEvents(Number(invoiceId))
    : [];
  return {
    data: data as ErpEvent[],
    total: data.length,
    page: params.page ?? 1,
    itemsPerPage: params.itemsPerPage ?? data.length,
  };
}

export async function getInvoiceEvents(invoiceId: string): Promise<ErpEvent[]> {
  const { data } = await fetchOrganizationEvents({
    payloadFilter: { invoiceId },
  });
  return data;
}

// ----------------------------------------------------------- beneficiarios

export const getBeneficiaries = (
  params: BeneficiaryQueryParams = {},
): Promise<Beneficiary[]> => entities.getBeneficiaries(params);

export const getBeneficiaryById = (
  beneficiaryId: string | number,
): Promise<Beneficiary> => entities.getBeneficiaryById(beneficiaryId);

export const addBeneficiary = (
  params: CreateBeneficiaryBody,
): Promise<BeneficiaryContactResponse> => entities.addBeneficiary(params);

/** Duplicado funcional de addBeneficiary; venía así de la API anterior. */
export const createBeneficiary = (
  data: BeneficiaryPayload,
): Promise<BeneficiaryContactResponse> =>
  entities.addBeneficiary(data as unknown as CreateBeneficiaryBody);

export const updateBeneficiary = (
  params: CreateBeneficiaryBody & { id: number },
): Promise<Beneficiary> => entities.updateBeneficiary(params);

export const archiveBeneficiary = (
  id: number,
): Promise<BeneficiaryContactResponse> => entities.archiveBeneficiary(id);

export const createContactData = (
  data: CreateContactDataBody,
): Promise<CreateContactDataResponse> => entities.createContactData(data);

export const updateContactData = (
  data: UpdateContactDataBody,
): Promise<UpdateContactDataResponse> => entities.updateContactData(data);

export const deleteContactData = (id: number): Promise<void> =>
  entities.deleteContactData(id);

// -------------------------------------------------------------- divisiones

export const getDivisions = (opciones?: {
  includeArchived?: boolean;
}): Promise<DivisionWithBalance[]> => entities.getDivisions(opciones);

export const getDivisionById = (id: number): Promise<DivisionWithBalance[]> =>
  entities.getDivisionById(id);

export const postDivision = (data: DivisionPayload): Promise<Division> =>
  entities.postDivision(data);

export const updateDivision = (data: DivisionPayload): Promise<Division> =>
  entities.updateDivision(data);

export const archiveDivision = (id: number): Promise<Division> =>
  entities.archiveDivision(id);

// ---------------------------------------------------------------- recursos

export const addResource = (
  data: CreateResourceBody,
): Promise<CreateResourceBody> => entities.addResource(data);

export const updateResource = (
  data: CreateResourceBody,
): Promise<CreateResourceBody> => entities.updateResource(data);

export const archiveResource = (id: number): Promise<CreateResourceBody> =>
  entities.archiveResource(id);

export const v2GetResources = (
  data: GetResourcesQuery,
): Promise<V2GetResourcesResponse> => entities.v2GetResources(data);

// --------------------------------------------------------------- impuestos

export const getTaxesList = () => entities.getTaxesList();

export const getNextInvoiceNumeral = (data: {
  type:
    | "GOVERNMENT"
    | "CONSUMER"
    | "TAX_CREDIT"
    | "CREDIT_NOTE"
    | "TAX_CREDIT_ELECTRONIC"
    | "SPECIAL_REGIME";
}) => entities.getNextInvoiceNumeral(data);

// ----------------------------------------------------------------- appData

export const getAppDataTypes = (appId: number): Promise<string[]> =>
  entities.getAppDataTypes(appId);

export const getAppData = (
  appId: number,
  data: Record<string, unknown> = {},
): Promise<AppDataExplorerResponse> => entities.getAppData(appId, data);

export const updateAppData = (params: {
  id: number;
  appId: number;
  type: string;
  data: Record<string, unknown>;
  strategy?: "merge" | "replace";
}): Promise<AppData> => entities.updateAppData(params);

export const deleteAppData = (id: number): Promise<void> =>
  entities.deleteAppData(id);

// --------------------------------------------------------------- archivos

export const uploadFile = (args: {
  file: File;
  createFolder?: "true";
  convertTo?: "mp3" | "ogg";
  path?: string;
}) => files.uploadFile(args);

export const downloadFile = (clave: string) => files.downloadFile(clave);

/**
 * Transformación pura de un formulario de factura al payload del ERP.
 * No toca la base de datos, por eso vive aquí y no en la capa de datos.
 */
interface InvoiceInput {
  transactionType?: string;
  clientId?: string | number;
  currency?: string;
  invoiceDate: string;
  dueDate: string;
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
  notes?: string;
}

export function transformToRecordPayload(
  invoice: InvoiceInput,
  divisionId: number = 1,
): RecordPayload {
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

  return {
    type: "INVOICE",
    isSell: invoice.transactionType !== "purchase",
    divisionId,
    beneficiaryId: invoice.clientId ? parseInt(String(invoice.clientId)) : 0,
    currency: invoice.currency || "DOP",
    isInstantDelivery: true,
    date: formatDate(invoice.invoiceDate),
    dueDate: formatDate(invoice.dueDate),
    elements: invoice.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      price: item.unitPrice,
      unit: "UNIT" as const,
      variation: 0,
      taxes: [],
    })),
    notes: invoice.notes,
  };
}
