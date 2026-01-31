import { gestionoRequest } from "./client";
import type {
  GestionoRecordPayload,
  GestionoInvoiceResponse,
  EventsQueryParams,
  EventsResponse,
  GestionoEvent,
  BeneficiaryQueryParams,
  GestionoBeneficiaryPayload,
  GestionoDivisionWithBalance,
  GestionoDivision,
  GestionoDivisionPayload,
  V2GetPendingRecordsResponse,
  V2GetPendingRecordsQuery,
  CreateBeneficiaryBody,
  BeneficiaryContactResponse,
  PayPendingRecordBody,
  CreateResourceBody,
  GetResourcesQuery,
  V2GetResourcesResponse,
  GestionoBeneficiary,
} from "@/src/types/gestiono";

export async function createPendingRecord(
  invoiceData: GestionoRecordPayload,
): Promise<GestionoInvoiceResponse> {
  return gestionoRequest<GestionoInvoiceResponse>("/v1/record/pending", {
    method: "POST",
    body: JSON.stringify(invoiceData),
  });
}

export async function payPendingRecord(
  data: PayPendingRecordBody,
): Promise<PayPendingRecordBody> {
  return gestionoRequest<PayPendingRecordBody>(`/v1/record/pending/pay`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function getPendingRecords(
  params: Record<string, unknown> = {},
): Promise<V2GetPendingRecordsResponse> {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      queryParams.append(key, String(value));
    }
  });

  const queryString = queryParams.toString();
  const path = queryString
    ? `/v2/record/pending?${queryString}`
    : "/v2/record/pending";

  return gestionoRequest<V2GetPendingRecordsResponse>(path, {
    method: "GET",
  });
}

export async function fetchOrganizationEvents(
  params: EventsQueryParams = {},
): Promise<EventsResponse> {
  const queryParams = new URLSearchParams();

  if (params.type) {
    const types = Array.isArray(params.type) ? params.type : [params.type];
    queryParams.append("type", JSON.stringify(types));
  }

  if (params.page) queryParams.append("page", String(params.page));
  if (params.itemsPerPage)
    queryParams.append("itemsPerPage", String(params.itemsPerPage));
  if (params.payloadFilter) {
    queryParams.append("payload", JSON.stringify(params.payloadFilter));
  }

  return gestionoRequest<EventsResponse>(
    `/organization/events?${queryParams.toString()}`,
    {
      method: "GET",
    },
  );
}

export async function getInvoiceEvents(
  invoiceId: string,
): Promise<GestionoEvent[]> {
  const response = await fetchOrganizationEvents({
    type: [
      "invoice:created",
      "invoice:updated",
      "invoice:paid",
      "invoice:past-due",
      "invoice:voucher-printed",
      "invoice:shared-via-email",
    ],
    payloadFilter: { invoiceId },
  });

  return response.data;
}

export async function getBeneficiaries(
  params: BeneficiaryQueryParams = {},
): Promise<GestionoBeneficiary[]> {
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) queryParams.append(key, value as string);
  });
  return gestionoRequest<GestionoBeneficiary[]>(
    `/v1/beneficiary?${queryParams.toString()}`,
    {
      method: "GET",
    },
  );
}
export async function addBeneficiary(
  params: CreateBeneficiaryBody,
): Promise<BeneficiaryContactResponse> {
  return gestionoRequest<BeneficiaryContactResponse>(`/v1/beneficiary`, {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function updateBeneficiary(
  params: BeneficiaryContactResponse,
): Promise<BeneficiaryContactResponse> {
  return gestionoRequest<BeneficiaryContactResponse>(`/v1/beneficiary/`, {
    method: "PATCH",
    body: JSON.stringify(params), //pasarle dentro del data el id del beneficiario y los campos que se quieren actualizar
  });
}

export async function getBeneficiaryById(
  beneficiaryId: string | number,
): Promise<GestionoBeneficiary> {
  return gestionoRequest<GestionoBeneficiary>(
    `/v1/beneficiary/${beneficiaryId}`,
    {
      method: "GET",
    },
  );
}

export async function createBeneficiary(
  data: GestionoBeneficiaryPayload,
): Promise<BeneficiaryContactResponse> {
  return gestionoRequest<BeneficiaryContactResponse>("/v1/beneficiary", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

interface InvoiceInput {
  transactionType?: string;
  clientId?: string | number;
  currency?: string;
  invoiceDate: string;
  dueDate: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  notes?: string;
}

export function transformToGestionoFormat(
  invoice: InvoiceInput,
  divisionId: number = 1,
): GestionoRecordPayload {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toISOString();
    } catch {
      return new Date().toISOString();
    }
  };

  return {
    type: "INVOICE",
    isSell: invoice.transactionType === "purchase" ? false : true,
    divisionId: divisionId,
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

export async function getDivisions(): Promise<GestionoDivisionWithBalance[]> {
  return gestionoRequest<GestionoDivisionWithBalance[]>("/v1/division", {
    method: "GET",
  });
}

export async function getDivisionById(
  id: number,
): Promise<GestionoDivisionWithBalance[]> {
  return gestionoRequest<GestionoDivisionWithBalance[]>(`/v1/division/${id}`, {
    method: "GET",
  });
}

export async function postDivision(
  data: GestionoDivisionPayload,
): Promise<GestionoDivision> {
  return gestionoRequest<GestionoDivision>("/v1/division", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateDivision(
  data: GestionoDivisionPayload,
): Promise<GestionoDivision> {
  return gestionoRequest<GestionoDivision>("/v1/division", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function addResource(
  data: CreateResourceBody,
): Promise<CreateResourceBody> {
  return gestionoRequest<CreateResourceBody>("/v1/resource", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateResource(
  data: CreateResourceBody,
): Promise<CreateResourceBody> {
  return gestionoRequest<CreateResourceBody>("/v1/resource", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// Archive functions - soft delete by setting metadata.disabled to true
export async function archiveDivision(id: number): Promise<GestionoDivision> {
  return gestionoRequest<GestionoDivision>("/v1/division", {
    method: "PATCH",
    body: JSON.stringify({
      id,
      metadata: { disabled: true },
    }),
  });
}

export async function archiveBeneficiary(
  id: number,
): Promise<BeneficiaryContactResponse> {
  return gestionoRequest<BeneficiaryContactResponse>("/v1/beneficiary", {
    method: "PATCH",
    body: JSON.stringify({
      id,
      metadata: { disabled: true },
    }),
  });
}

export async function archiveResource(id: number): Promise<CreateResourceBody> {
  return gestionoRequest<CreateResourceBody>("/v1/resource", {
    method: "PATCH",
    body: JSON.stringify({
      id,
      metadata: { disabled: true },
    }),
  });
}

export async function archivePendingRecord(
  id: number,
): Promise<V2GetPendingRecordsResponse> {
  return gestionoRequest<V2GetPendingRecordsResponse>("/v1/record/pending", {
    method: "PATCH",
    body: JSON.stringify({
      id,
      metadata: { isArchived: true },
    }),
  });
}

export async function v2GetResources(
  data: GetResourcesQuery,
): Promise<V2GetResourcesResponse> {
  return gestionoRequest<V2GetResourcesResponse>("/v2/resource", {
    method: "GET",
    query: data,
  });
}

export async function v2GetPendingRecords(
  data: V2GetPendingRecordsQuery,
): Promise<V2GetPendingRecordsResponse> {
  return gestionoRequest<V2GetPendingRecordsResponse>("/v2/record/pending", {
    method: "GET",
    query: data,
  });
}

export async function deletePendingRecord(
  recordId: number,
): Promise<V2GetPendingRecordsResponse> {
  return gestionoRequest<V2GetPendingRecordsResponse>(`/v1/record/pending`, {
    method: "DELETE",
    body: JSON.stringify({
      id: recordId,
    }),
  });
}

export async function updatePendingRecord(data: {
  id: number;
  type?: string;
  [key: string]: any;
}): Promise<V2GetPendingRecordsResponse> {
  return gestionoRequest<V2GetPendingRecordsResponse>(`/v1/record/pending`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function getAppDataTypes(appId: number): Promise<any> {
  return gestionoRequest<any>(`/v1/apps/data-types/${appId}`, {
    method: "GET",
  });
}

export async function getAppData(appId: number, data: any = {}): Promise<any> {
  return gestionoRequest<any>(`/v1/apps/data/explorer/${appId}`, {
    method: "GET",
    query: data,
  });
}

export async function createPendingRecordElement(data: {
  pendingRecordId: number;
  description: string;
  quantity: number;
  unit: string;
  price: number;
  variation: number;
}): Promise<V2GetPendingRecordsResponse> {
  return gestionoRequest<V2GetPendingRecordsResponse>(`/v1/record/pending/element`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePendingRecordElement(data: {
  id: number;
  [key: string]: any;
}): Promise<V2GetPendingRecordsResponse> {
  return gestionoRequest<V2GetPendingRecordsResponse>(`/v1/record/pending/element`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deletePendingRecordElement(data: {
  id: number;
}): Promise<V2GetPendingRecordsResponse> {
  return gestionoRequest<V2GetPendingRecordsResponse>(`/v1/record/pending/element`, {
    method: "DELETE",
    body: JSON.stringify(data),
  });
}