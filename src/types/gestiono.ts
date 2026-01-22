// Core Types
export type Currency = "DOP" | "USD" | "EUR";
export type InvoiceState =
  | "PENDING"
  | "PAID"
  | "PARTIALLY_PAID"
  | "OVERDUE"
  | "DRAFT"
  | "CANCELED"; // Inferred common states
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

  // Record Type (Required by Gestiono API)
  type?:
    | "INVOICE"
    | "QUOTE"
    | "ORDER"
    | "LOAN"
    | "INCOME"
    | "OUTCOME"
    | "PAYROLL";

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
  isrTaxRetention: number;
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
  deliveryTask?: any;
  pendingToDeliver?: {
    quantity: number;
    resourceId: number;
    serialNumbers?: string[];
  }[];

  // Metadata
  labels?: string[];
  clientdata?: Record<string, any> | string;
  metadata?: Record<string, any>;

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
  receivedFrom?: number;
  metadata?: Record<string, any>;
}

export interface CommissionRecord {
  id: number;
  type: "COMMISSION";
  amount: number;
  date: AnyDate;
  currency: Currency;
  metadata?: Record<string, any>;
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

export interface Return {
  id: number;
  invoiceId: number;
  amountToClaim: number;
  returnedElementsValue: number;
  reason?: string;
  createdAt: AnyDate;

  pendingToRedeem: number;
  redeemtions: any[]; // Records of type REDEMPTION
}

export type GestionoInvoiceEvent =
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
  old?: any;
  new?: any;
  beneficiaryEmail?: string;
  emailsSent?: number;
  emailCount?: number;
  recurrencyId?: string;
}

export interface GestionoEvent {
  id: string;
  organizationId: string;
  createdAt: string;
  type: GestionoInvoiceEvent;
  payload: InvoiceEventPayload;
  bySystem?: boolean;
  byAiAgent?: boolean;
  details?: string;
}

// Beneficiarios (Clientes/Proveedores)
export interface GestionoBeneficiaryContact {
  type: "PHONE" | "EMAIL" | "ADDRESS" | "WEBSITE";
  data: string;
}

export interface GestionoBeneficiaryPayload {
  id: number;
  name: string;
  type: "CLIENT" | "PROVIDER" | "BOTH" | "EMPLOYEE" | "OTHER";
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
  contact?: GestionoBeneficiaryContact[];
}

// Contacto de Beneficiario (en la respuesta GET)
export interface BeneficiaryContactResponse {
  id: number;
  beneficiaryId: number;
  type: "phone" | "email" | "address" | "website";
  data: string;
  dataType: "string";
  createdAt: string;
  updatedAt: string | null;
}

export interface GestionoBeneficiary {
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

export type GestionoClient = GestionoBeneficiaryPayload;

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

export interface GestionoDivision {
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
      | "MONTHLY"
      | "YEARLY"
      | "QUARTERLY"
      | "WEEKLY"
      | "DAILY"
      | "LIFETIME";
    sellTarget?: number;
    sellTargetCurrency?: "DOP" | "USD" | "EUR";
    sellTargetPeriod?:
      | "MONTHLY"
      | "YEARLY"
      | "QUARTERLY"
      | "WEEKLY"
      | "DAILY"
      | "LIFETIME";
    [key: string]: any;
  };
}

export interface GestionoDivisionPayload {
  name: string;
  type: DivisionType;
  subDivisionOf?: number;
  linkedWarehouse?: number;
  lat?: number;
  lon?: number;
  metadata?: Record<string, any>;
}

export interface GestionoDivisionWithBalance extends GestionoDivision {
  balance: number;
  balanceFromLastClose: number;
  monthlyExpenses: number;
}

// Facturas
export interface GestionoRecordElement {
  description: string;
  quantity: number;
  price: number;
  unit: string;
  variation: number;
  taxes?: any[];
}

export interface GestionoRecordPayload {
  type: "INVOICE";
  isSell: boolean;
  divisionId: number;
  beneficiaryId: number;
  currency: string;
  isInstantDelivery: boolean;
  date: string;
  dueDate: string;
  elements: GestionoRecordElement[];
  notes?: string;
}

export interface GestionoInvoiceResponse {
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
  type?: GestionoInvoiceEvent | GestionoInvoiceEvent[];
  page?: number;
  itemsPerPage?: number;
  payloadFilter?: Record<string, any>;
}

export interface EventsResponse {
  data: GestionoEvent[];
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
    | "GOVERNMENT";
  taxId?: string;
  reference?: string;
  labels?: string[];
  creditLimit?: number;
  lat?: number;
  lon?: number;
  contact?: {
    type: string;
    data: string;
    dataType?: "string" | "json" | "image" | "date";
  }[];
  metadata?: {
    adquisitionChannel?: string;
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

// Tipos para facturas de Gestiono
export interface GestionoInvoiceItem {
  id: number;
  date: string;
  dueDate: string | null;
  beneficiaryId: number;
  type: string;
  isSell: number;
  state: string;
  amount: number;
  subTotal: number;
  taxes: number;
  currency: string;
  reference: string | null;
  description?: string;
  taxId?: string | null;
  divisionId: number;
  organizationId: number;
  paid: number;
  dueToPay: number;
}

export interface GestionoInvoicesResponse {
  items: GestionoInvoiceItem[];
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
  metadata?: Record<string, any>;
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
  clientdata?: Record<string, any>; // Datos personalizados
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
    clientdata?: Record<string, any> | string;
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
export interface GestionoApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: any;
}
