// Core Types
export type Currency = "DOP" | "USD" | "EUR";
/* Los estados que `pending_records_computed.state` produce realmente. La lista
 * anterior era una conjetura heredada («Inferred common states»): incluía PAID,
 * PARTIALLY_PAID, OVERDUE, DRAFT y CANCELED, ninguno de los cuales existe, y
 * omitía COMPLETED y PAST_DUE, que son los que sí llegan. Comparar con "PAID"
 * no fallaba en compilación y siempre daba falso. */
export type InvoiceState = "PENDING" | "PAST_DUE" | "COMPLETED" | "ARCHIVED";
export type PaymentState = "PENDING" | "COMPLETED" | "CANCELED" | "FAILED";
export type PaymentMethod = "CASH" | "TRANSFER" | "CARD";
export type AnyDate = string; // APIs typically return ISO strings

export interface PendingRecord {
  // Basic Information
  id: number;
  userId: number;
  divisionId: number;
  organizationId: number;
  beneficiaryId: number;
  projectId?: string; // UUID

  // Tipo de documento
  type?:
    "INVOICE" | "QUOTE" | "ORDER" | "LOAN" | "INCOME" | "OUTCOME" | "PAYROLL";

  // Dates & Status
  date: AnyDate;
  dueDate?: AnyDate;
  state: InvoiceState;
  status?: "PENDING" | "PROCESSING" | "DONE" | "FAILED" | "DISCARDED";

  description?: string;
  notes?: string;
  note?: string;
  reference?: string;
  isSell: boolean;
  isInstantDelivery: boolean;
  currency: Currency;

  // Tax Info
  taxId?: string;
  taxExpirationDate?: AnyDate;
  salesTaxReduced?: boolean;

  amount: number;
  subTotal: number;
  taxes: number;
  paid: number;
  dueToPay: number;

  paymentsAmount: number;
  creditPayments: number;
  givenCredit: number;

  salesTaxRetention: number;
  salesTaxRate: number;
  payrollDeduction: number;

  totalReturnedValue: number;
  totalReturnedToClaim: number;
  returnsCount: number;

  resourceCost: number;
  grossProfit: number;

  subTotalWithoutDiscount: number;
  afterTaxesDiscount: number;
  preTaxesDiscount: number;
  creditDue: number;
  nextInvoiceDate?: string;

  // Relationships
  user?: {
    id: number;
    name: string;
    email: string;
  };
  organization?: {
    name: string;
    taxId: string;
    settings?: {
      accounting?: {
        taxes?: {
          taxCalculationMode?: "INCLUDED_IN_TOTAL" | "ADD_TO_TOTAL";
        };
      };
    };
  };
  division?: {
    id: number;
    name: string;
    type: string;
    lat?: number;
    lon?: number;
  };
  contact?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    type: string;
    taxId?: string;
  };

  // Items / Lines
  elements?: PendingRecordElement[];

  // Associated Records
  payments: PaymentRecord[];
  commissions: CommissionRecord[];
  credits: Credit[];
  returns?: Return[];

  // Logistics
  deliveryTask?: Record<string, unknown>;
  pendingToDeliver?: {
    quantity: number;
    resourceId: number;
    serialNumbers?: string[];
  }[];

  // Metadata
  labels?: string[];
  clientdata?: Record<string, unknown> | string;
  metadata?: Record<string, unknown>;

  // Linked Items
  invoices?: PendingRecord[];
  linkedCosts?: {
    id: number;
  }[];
}

export interface PendingRecordElement {
  id: number;
  pendingRecordId: number;
  resourceId?: number;
  description: string;

  quantity: number;
  unit: string;
  price: number;
  variation: number | string; // amount or percentage string e.g. "10%"
  salesTaxRate?: number; // ITBIS percentage applied to this element (e.g. 18)

  priceAfterVariation?: number;
  resourceCost?: number;

  serialNumbers?: string[] | null;
  comment?: string | null;

  // Extended info for UI
  resourceDescription?: string;
  resourceSku?: string;

  taxes: PendingRecordElementTax[];
}

export interface PendingRecordElementTax {
  id: number;
  pendingRecordElementId: number;
  taxRateId: number;
  isIncludedInPrice: boolean;
  // Extended info
  taxRate?: number;
}

export interface PaymentRecord {
  id: number;
  type: "PAYMENT" | "CREDIT_PAYMENT";
  amount: number;
  date: AnyDate;
  paymentMethod: PaymentMethod;
  currency: Currency;
  description?: string;
  reference?: string;
  state?: string;
  receivedFrom?: number;
  metadata?: Record<string, unknown>;
}

export interface CommissionRecord {
  id: number;
  type: "COMMISSION";
  amount: number;
  date: AnyDate;
  currency: Currency;
  metadata?: Record<string, unknown>;
}

export interface Credit {
  id: number;
  pendingRecordId: number;
  amount: number;
  interest: number;
  interestType: "SIMPLE" | "COMPOUND";

  dueAmount: number;
  numberOfDuePayments: number;
  numberOfPastDuePayments: number;
  numberOfCompletedPayments: number;

  cleanCreditPayment: {
    capital: number;
    interest: number;
    total: number;
    balance: number;
  };
}

export interface Redemption {
  id: number;
  returnId: number;
  amount: number;
  date: AnyDate;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface Return {
  id: number;
  invoiceId: number;
  amountToClaim: number;
  returnedElementsValue: number;
  reason?: string;
  createdAt: AnyDate;

  pendingToRedeem: number;
  redeemtions: Redemption[]; // Records of type REDEMPTION
}

export type InvoiceEventType =
  | "invoice:created"
  | "invoice:updated"
  | "invoice:paid"
  | "invoice:past-due"
  | "invoice:voucher-printed"
  | "invoice:shared-via-email"
  | "recurrency:invoice-created";

export interface InvoiceEventPayload {
  invoiceId: string;
  userId?: string;
  editorId?: string;
  old?: Record<string, unknown>;
  new?: Record<string, unknown>;
  beneficiaryEmail?: string;
  emailsSent?: number;
  emailCount?: number;
  recurrencyId?: string;
}

export interface ErpEvent {
  id: string;
  organizationId: string;
  createdAt: string;
  type: InvoiceEventType;
  payload: InvoiceEventPayload;
  bySystem?: boolean;
  byAiAgent?: boolean;
  details?: string;
}

// Beneficiarios (Clientes/Proveedores)
export interface BeneficiaryContactInput {
  type: "PHONE" | "EMAIL" | "ADDRESS" | "WEBSITE";
  data: string;
}

export interface BeneficiaryPayload {
  id: number;
  name: string;
  type:
    | "CLIENT"
    | "PROVIDER"
    | "BOTH"
    | "EMPLOYEE"
    | "GOVERNMENT"
    | "ORGANIZATION"
    | "OTHER";
  taxId?: string;
  email?: string;
  reference?: string;
  image?: string;
  lat?: number;
  lon?: number;
  assignedDivisionId?: number;
  creditLimit?: number;
  labels?: string[];
  metadata?: {
    salesTaxRetention?: number;
    isrTaxRetention?: number;
    enableTssCalculation?: boolean;
    adquisitionChannel?: string;
  };
  contact?: BeneficiaryContactInput[];
}

// Contacto de Beneficiario (en la respuesta GET)
export interface BeneficiaryContactResponse {
  id: number;
  beneficiaryId: number;
  type:
    | "phone"
    | "email"
    | "address"
    | "website"
    | "banco"
    | "numero_cuenta"
    | "tipo_cuenta"
    | "categoria";
  data: string;
  dataType: "string";
  createdAt: string;
  updatedAt: string | null;
}

export interface Beneficiary {
  id: number;
  name: string;
  organizationId: number;
  type:
    | "CLIENT"
    | "PROVIDER"
    | "SELLER"
    | "ORGANIZATION"
    | "BOTH"
    | "EMPLOYEE"
    | "GOVERNMENT"
    | "OTHER";
  referredBy: string | null;
  archived: number;
  assignedDivisionId: number | null;
  creditLimit: number | null;
  image: string | null;
  labels: string[] | null;
  lat: number | null;
  lon: number | null;
  reference: string | null;
  stripeCustomerId: string | null;
  taxId: string | null;
  contacts?: BeneficiaryContactResponse[]; // Array de contactos en la respuesta
  metadata?: {
    salesTaxRetention?: number;
    isrTaxRetention?: string | number;
    enableTssCalculation?: boolean;
    adquisitionChannel?: string;
  };
}

export type ClientPayload = BeneficiaryPayload;

// Divisiones
export type DivisionType =
  | "WAREHOUSE"
  | "STORE"
  | "CASHIER"
  | "TABLE"
  | "OFFICE"
  | "DEPARTMENT"
  | "LOGICAL"
  | "PROJECT"
  | "PRODUCT"
  | "ROOT"
  | "OTHER";

export interface Division {
  id: number;
  name: string;
  type: DivisionType;
  subDivisionOf?: number;
  organizationId: number;
  linkedWarehouse?: number;
  lat?: number;
  lon?: number;
  metadata?: {
    budget?: number;
    budgetCurrency?: "DOP" | "USD" | "EUR";
    budgetPeriod?:
      "MONTHLY" | "YEARLY" | "QUARTERLY" | "WEEKLY" | "DAILY" | "LIFETIME";
    sellTarget?: number;
    sellTargetCurrency?: "DOP" | "USD" | "EUR";
    sellTargetPeriod?:
      "MONTHLY" | "YEARLY" | "QUARTERLY" | "WEEKLY" | "DAILY" | "LIFETIME";
    [key: string]: string | number | boolean | undefined;
  };
}

export interface DivisionPayload {
  name: string;
  type: DivisionType;
  subDivisionOf?: number;
  linkedWarehouse?: number;
  lat?: number;
  lon?: number;
  metadata?: Record<string, unknown>;
}

export interface DivisionWithBalance extends Division {
  balance: number;
  balanceFromLastClose: number;
  monthlyExpenses: number;
}

// Facturas
export interface RecordElementInput {
  description: string;
  quantity: number;
  price: number;
  unit: string;
  variation: number;
  salesTaxRate?: number; // ITBIS percentage per element (e.g. 18)
  taxes?: PendingRecordElementTax[];
}

export interface RecordPayload {
  type: "INVOICE";
  isSell: boolean;
  divisionId: number;
  beneficiaryId: number;
  currency: string;
  isInstantDelivery: boolean;
  date: string;
  dueDate: string;
  elements: RecordElementInput[];
  notes?: string;
  salesTaxRate?: number;
}

export interface InvoiceResponse {
  id: number | string;
  uuid?: string;
  number?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  pdfUrl?: string;
  htmlUrl?: string;
}

// Query Params
export interface EventsQueryParams {
  type?: InvoiceEventType | InvoiceEventType[];
  page?: number;
  itemsPerPage?: number;
  payloadFilter?: Record<string, unknown>;
}

export interface EventsResponse {
  data: ErpEvent[];
  total: number;
  page: number;
  itemsPerPage: number;
}

export interface CreateBeneficiaryBody {
  name: string;
  type:
    | "CLIENT"
    | "PROVIDER"
    | "ORGANIZATION"
    | "EMPLOYEE"
    | "SELLER"
    | "GOVERNMENT"
    | "BOTH"
    | "OTHER";
  taxId?: string;
  reference?: string;
  labels?: string[];
  creditLimit?: number;
  lat?: number;
  lon?: number;
  contact?: {
    id?: number;
    beneficiaryId?: number;
    type: string;
    data: string;
    dataType?: "string" | "json" | "image" | "date";
  }[];
  metadata?: {
    adquisitionChannel?: string;
    salesTaxRate?: number;
  };
}

export interface BeneficiaryQueryParams {
  withContacts?: "true" | "false";
  withTaxData?: "true" | "false";
  minId?: string;
  type?: "CLIENT" | "PROVIDER" | "BOTH" | "EMPLOYEE" | "OTHER";
  search?: string;
  elementsPerPage?: string;
}

// Tipos de factura
export interface InvoiceItem {
  id: number;
  date: string;
  dueDate: string | null;
  beneficiaryId: number;
  type:
    "INVOICE" | "QUOTE" | "ORDER" | "LOAN" | "INCOME" | "OUTCOME" | "PAYROLL";
  isSell: number;
  state: string;
  amount: number;
  subTotal: number;
  taxes: number;
  currency: string;
  reference: string | null;
  description?: string;
  notes?: string;
  taxId?: string | null;
  divisionId: number;
  organizationId: number;
  paid: number;
  dueToPay: number;
  isrTaxRetention?: number;
  elements?: PendingRecordElement[];
  payments?: PaymentRecord[];
  clientdata?: Record<string, unknown> | string;
  metadata?: Record<string, unknown>;
}

export interface InvoicesResponse {
  items: InvoiceItem[];
  totalItems: number;
  page: number;
  totalPages: number;
  itemsPerPage: number;
  resume?: {
    toCharge: number;
    toChargeRecordsCount: number;
    totalCharged: number;
    toPay: number;
    toPayRecordsCount: number;
    totalPaid: number;
    taxesCollected: number;
    taxesPaid: number;
  };
}

export interface V2GetPendingRecordsResponse {
  itemsPerPage: number;
  resume: {
    toPay: number;
    toCharge: number;
    totalPaid: number;
    totalCharged: number;
    taxesCollected: number;
    taxesPaid: number;
    toPayRecordsCount: number;
    toChargeRecordsCount: number;
  };
  page: number;
  totalPages: number;
  totalItems: number;
  items: PendingRecord[];
}

export interface V2GetPendingRecordsQuery {
  month: string;
  year: string;
  query?: string;
  timeZone?: number;
  type:
    | "INVOICE"
    | "RECURRENT_INVOICE"
    | "QUOTE"
    | "ORDER"
    | "LOAN"
    | "RECURRENT_PAYROLL"
    | "PAYROLL";
  pendingRecordElements: boolean;
  pendingRecordPayments: boolean;
  elements: number;
  page: number;
  pendingRecordCredits: boolean;
  beneficiaryId: number;
  divisionId: number;
  informal: boolean;
  state: string;
  stateMethod: "!=" | "=";
  fromDate?: string;
  toDate?: string;
  dateOrder: "ASC" | "DESC";
  sort: "ASC" | "DESC";
  orderBy: PendingRecord;
  includeArchived: boolean;
  ignoreDetailedData?: boolean;
  raw: boolean;
  isSell: boolean;
  ids: number[];
  extendedClientData: boolean;
  advancedSearch: AdvancedSearchFilter[];
  daysFromCreationMin: number;
  daysFromCreationMax: number;
  daysPastDueMin: number;
  daysPastDueMax: number;
  labels?: string[];
}
// Supporting Types
export type AdvancedSearchFilter = {
  field: `$${string}` /* metadata */ | `@${string}` /* clientData */ | string;
  value: string | number | (string | number)[];
  method:
    | "="
    | ">"
    | "<"
    | "in"
    | "not in"
    | "!="
    | "like"
    | "not like"
    | "is null"
    | "is not null";
};

export interface PayPendingRecordBody {
  pendingRecordId: number; // ID de la factura
  paymentMethod: "CASH" | "TRANSFER" | "CARD";
  accountId: number; // Cuenta de banco o caja donde entra el dinero
  amount?: number; // Monto a pagar (si es parcial), por defecto paga el total pendiente
  state?: "PENDING" | "COMPLETED" | "CANCELED" | "FAILED"; // Estado del pago
  reference?: string; // Referencia del pago (ej: número de cheque)
  amountConversion?: number; // Tasa de cambio si aplica
  receivedFrom?: number; // ID del beneficiario que paga
  description?: string;
  date?: string; // Fecha del pago
  labels?: string[];
  metadata?: Record<string, unknown>;
}

export interface CreateResourceBody {
  // CAMPOS OBLIGATORIOS
  name: string; // Mínimo 2 caracteres
  type: "PRODUCT" | "SERVICE" | "ASSET" | "OTHER";
  relation:
    | "FOR_SALE"
    | "FOR_RENT"
    | "MATERIAL"
    | "ONE_TIME_USE"
    | "OPERATIONS"
    | "OTHER";
  unit: string; // Ej: "unidad", "kg", "litro"
  priceStrategy: "FIXED" | "DEFINE_ON_INVOICE" | "VARIABLE";
  variation: number | string; // Precio de venta (ej: 100 o "10%")

  // CAMPOS OPCIONALES
  description?: string;
  divisionId?: number; // División asignada
  variantOf?: number; // Si es variante de otro producto
  costStrategy?:
    | "MINIMUM_PROVIDER_COST"
    | "MAXIMUM_PROVIDER_COST"
    | "AVG_PROVIDER_COST"
    | "FIXED";
  currency?: "DOP" | "USD" | "EUR";

  // Precio por mayor
  bulkVariation?: number | string;
  bulkVariationLabel?: string;
  bulkVariationMinQuantity?: number;

  // Configuración de inventario
  canSellWithoutStock?: boolean; // Default: true
  canBeSold?: boolean; // Default: true
  followsInventory?: boolean; // Default: true
  requiresSerialNumbers?: boolean; // Default: false
  quantityDecimals?: number; // Default: 0

  // Identificadores
  sku?: string; // Código de producto
  barCode?: string; // Código de barras

  // Alertas de inventario
  minStockAlert?: number;
  maxStockAlert?: number;

  // Impuestos
  taxes?: {
    taxRateId: number;
  }[];

  // Inicialización (opcional)
  defaultCost?: number; // Costo inicial
  initialStock?: number; // Stock inicial

  // Multimedia
  multimedia?: {
    url: string;
    type: "IMAGE" | "VIDEO" | "PDF"; // Default: 'IMAGE'
    alt?: string;
  }[];

  // Metadatos
  labels?: string[]; // Etiquetas
  clientdata?: Record<string, unknown>; // Datos personalizados
}

export interface GetResourcesQuery {
  page?: string; // Número de página
  elementsPerPage?: string; // Items por página
  search?: string; // Búsqueda por nombre/SKU
  type?: string; // 'PRODUCT', 'SERVICE', etc.
  priceStrategy?: string; // 'FIXED', 'VARIABLE', etc.
  labels?: string; // Filtrar por etiquetas (separadas por coma)
  archived?: string; // 'true' o 'false'
  currency?: "DOP" | "USD" | "EUR"; // Moneda para precios
  divisionId?: number; // Filtrar por división
  advancedSearch?: AdvancedSearchFilter[]; // Búsqueda avanzada
}

// Tipo de respuesta de v2GetResources
export interface V2GetResourcesResponse {
  itemsPerPage: number;
  page: number;
  totalPages: number;
  totalItems: number;
  items: {
    id: number;
    name: string;
    description?: string;
    type: "PRODUCT" | "SERVICE" | "ASSET" | "OTHER";
    relation:
      | "FOR_SALE"
      | "FOR_RENT"
      | "MATERIAL"
      | "ONE_TIME_USE"
      | "OPERATIONS"
      | "OTHER";
    unit: string;
    priceStrategy: "FIXED" | "DEFINE_ON_INVOICE" | "VARIABLE";
    sellPrice?: number;
    sellPriceCurrency?: "DOP" | "USD" | "EUR";
    minimumCost?: number;
    calculatedCost?: number;
    defaultCost?: number;
    sku?: string;
    barCode?: string;
    divisionId?: number;
    archived?: number;
    canBeSold?: number;
    canSellWithoutStock?: number | boolean;
    followsInventory?: number | boolean;
    requiresSerialNumbers?: number | boolean;
    quantityDecimals?: number;
    costStrategy?: string;
    salesTaxRate?: number;
    organizationId?: number;
    publishInEcommerce?: number | boolean;
    doesNotDeliver?: number | boolean;
    variantOf?: number | null;
    createdAt?: string;
    updatedAt?: string | null;
    maxStockAlert?: number | null;
    minStockAlert?: number | null;
    totalAvailableQuantity?: number | null;
    totalInPlaceQuantity?: number | null;
    totalReservedQuantity?: number | null;
    clientdata?: Record<string, unknown> | string;
    division?: ResourceStorage[];
    total?: ResourceStorage;
    storage: {
      divisionId: number;
      amount: ResourceStorage[];
    }[];
  }[];
}

// Donde ResourceStorage es:
export interface ResourceStorage {
  divisionId?: number;
  available: number; // Disponible para venta
  inPlace: number; // Total en físico
  reserved: number; // Reservado en entregas pendientes
}

// Errores
export interface ErpApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

// Local Quotations
export interface LocalQuotation {
  id?: number;
  localId: number;
  beneficiaryId: number;
  quotationDate: string;
  validUntil: string;
  localInfo: {
    number: number;
    level: number;
    area: number;
    pricePerM2: number;
    totalValue: number;
  };
  paymentPlan: {
    separation10: number;
    separation45: number;
    installments: PaymentInstallment[];
  };
  terms: string;
  notes?: string;
  status: "pending" | "accepted" | "rejected" | "expired";
}

export interface PaymentInstallment {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  description: string;
}

// ========================
// Tax Rates
// ========================

export interface TaxRate {
  id: number;
  slug: string;
  name: string;
  rate: number;
  country: string;
  category: string;
  mode: string | null;
  organizationId: number | null;
}

// ========================
// App Data
// ========================

export interface AppData {
  id: number;
  appId: number;
  type: string;
  organizationId: number;
  createdAt: string;
  updatedAt?: string;
  data: Record<string, any>;
}

export interface AppDataExplorerResponse {
  appData: AppData[];
  organizations: Record<number, string>;
}

// getAppDataTypes response = string[]

// ========================
// Beneficiary Contact Data
// ========================

export interface ContactData {
  id: number;
  beneficiaryId: number;
  type: string;
  dataType?: "string" | "json" | "image" | "date";
  createdAt: string;
  updatedAt?: string;
  data: string;
}

export interface CreateContactDataBody {
  beneficiaryId: number;
  type: string;
  dataType?: "string" | "json" | "image" | "date";
  data: string;
}

export interface CreateContactDataResponse {
  contactId: number;
}

export interface UpdateContactDataBody {
  id: number;
  beneficiaryId: number;
  type: string;
  dataType?: "string" | "json" | "image" | "date";
  data: string;
}

export interface UpdateContactDataResponse {
  contactId: number;
}

// deleteContactData(id: number): Promise<void>
