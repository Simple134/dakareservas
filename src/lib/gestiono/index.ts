
export { gestionoRequest, validateGestionoConfig } from './client';
export {
    // Invoices
    createInvoice,
    getInvoice,
    updateInvoice,
    deleteInvoice,
    getPendingRecords,
    payPendingRecord,
    // Events
    fetchOrganizationEvents,
    getInvoiceEvents,
    // Beneficiaries
    getBeneficiaries,
    addBeneficiary,
    updateBeneficiary,
    getBeneficiaryById,
    createBeneficiary,
    // Divisions
    getDivisionById,
    getDivisions,
    postDivision,
    // Utils
    transformToGestionoFormat,
    addResource,
    v2GetResources,
} from './endpoints';

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
} from '@/src/types/gestiono';
