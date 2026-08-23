export {
  // Pending Records
  createPendingRecord,
  getPendingRecords,
  payPendingRecord,
  deletePendingRecord,
  archivePendingRecord,
  updatePendingRecord,
  createFromPendingRecord,
  createPendingRecordElement,
  updatePendingRecordElement,
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
  // Detalle de documento: no existia como endpoint antes, la ruta
  // devolvia 405 a los cinco sitios que se lo pedian.
  getPendingRecordById,
  // Archivos
  downloadFile,
  // Utils
  transformToRecordPayload,
  addResource,
  v2GetResources,
  // App Data
  getAppDataTypes,
  getAppData,
  updateAppData,
  deleteAppData,
  uploadFile,

  // Taxes
  getNextInvoiceNumeral,
  getTaxesList,
  addPendingRecordElementTaxes,
  removePendingRecordElementTaxes,
  // Antes habia que importarlos directo de ./endpoints porque el barrel no los
  // exponia; ya estan todos aqui.
  v2GetPendingRecords,
  deletePendingRecordElement,
  updateResource,
  archiveResource,
  archiveDivision,
  createContactData,
  updateContactData,
  deleteContactData,
} from "./endpoints";

export type {
  InvoiceEventType,
  InvoiceEventPayload,
  ErpEvent,
  BeneficiaryContactInput,
  BeneficiaryPayload,
  BeneficiaryContactResponse,
  Beneficiary,
  ClientPayload,
  Division,
  DivisionWithBalance,
  RecordElementInput,
  RecordPayload,
  InvoiceResponse,
  EventsQueryParams,
  EventsResponse,
  BeneficiaryQueryParams,
  ErpApiError,
  CreateBeneficiaryBody,
  PayPendingRecordBody,
  CreateResourceBody,
  GetResourcesQuery,
} from "@/src/types/erp";
