export { gestionoRequest, validateGestionoConfig } from "./client";
export {
  // Pending Records
  createPendingRecord,
  getPendingRecords,
  payPendingRecord,
  deletePendingRecord,
  // Events
  fetchOrganizationEvents,
  getInvoiceEvents,
  // Beneficiaries
  getBeneficiaries,
  addBeneficiary,
  updateBeneficiary,
  getBeneficiaryById,
  createBeneficiary,
  archiveBeneficiary,
  // Divisions
  getDivisionById,
  getDivisions,
  postDivision,
  updateDivision,
  // Utils
  transformToGestionoFormat,
  addResource,
  v2GetResources,
} from "./endpoints";

export type {
  GestionoInvoiceEvent,
  InvoiceEventPayload,
  GestionoEvent,
  GestionoBeneficiaryContact,
  GestionoBeneficiaryPayload,
  BeneficiaryContactResponse,
  GestionoBeneficiary,
  GestionoClient,
  GestionoDivision,
  GestionoDivisionWithBalance,
  GestionoRecordElement,
  GestionoRecordPayload,
  GestionoInvoiceResponse,
  EventsQueryParams,
  EventsResponse,
  BeneficiaryQueryParams,
  GestionoApiError,
  CreateBeneficiaryBody,
  PayPendingRecordBody,
  CreateResourceBody,
  GetResourcesQuery,
} from "@/src/types/gestiono";
