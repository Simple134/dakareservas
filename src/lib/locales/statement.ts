import { nombreDeLocal } from "@/src/lib/locales/nombre";
import type { AppData } from "@/src/types/erp";
import { cuentaDeLocal } from "@/src/lib/locales/receivables";
import {
  TASA_USD_DOP,
  aplicadoEn,
  esMoneda,
  type Moneda,
} from "@/src/lib/locales/moneda";

export type TipoPago = "separacion" | "inicial" | "cuota" | "capital" | "otro";
export type MetodoPago =
  "transferencia" | "deposito" | "efectivo" | "tarjeta" | "cheque";

/** Pago registrado a mano en el modal «Pagos»; se guarda en `local.data.payments`. */
export interface LocalPayment {
  id: string;
  /** En la moneda del pago (`currency`); nunca se mezcla con la del local. */
  amount: number;
  /** Moneda en la que se recibió el dinero; sin ella, la del local. */
  currency?: Moneda;
  /** Día del pago, `YYYY-MM-DD`. */
  date: string;
  type: TipoPago;
  description: string;
  cuotaNumber?: number;
  receipt_url?: string;
  beneficiario_id?: number;
  beneficiario_nombre?: string;
  /** Número de recibo, p. ej. `RIRD-0000031`. */
  documento?: string;
  metodo?: MetodoPago;
  /** Cuenta bancaria que recibió el dinero. */
  cuenta?: string;
  /** Pesos por dólar el día del pago; convierte el pago si su moneda difiere de la del local. */
  tasa?: number;
}

export const TIPOS_PAGO: { value: TipoPago; label: string }[] = [
  { value: "cuota", label: "Cuota" },
  { value: "separacion", label: "Reserva" },
  { value: "inicial", label: "Inicial" },
  { value: "capital", label: "Capital" },
  { value: "otro", label: "Otro" },
];

export const METODOS_PAGO: { value: MetodoPago; label: string }[] = [
  { value: "deposito", label: "Depósito" },
  { value: "transferencia", label: "Transferencia" },
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "cheque", label: "Cheque" },
];

export interface FilaEstado {
  /** Id del pago manual; `null` en los pagos que vienen de la reserva. */
  pagoId: string | null;
  /** Id de la fila `app_data` del pago de la reserva; `null` en los pagos manuales. */
  appDataId: number | null;
  documento: string;
  metodo: string;
  tasa: number | null;
  descripcion: string;
  /** Lo recibido, en `moneda`. */
  monto: number;
  moneda: Moneda;
  /** `YYYY-MM-DD`. */
  fecha: string;
  /** Saldo antes de este pago. */
  montoTotal: number;
  montoAplicado: number;
  /** Saldo después de este pago. */
  balance: number;
  comprobante: string | null;
}

export interface ClienteEstado {
  nombre: string;
  identificacion: string;
  email: string;
}

export interface EstadoDeCuenta {
  localId: number;
  /** Nombre que se muestra: el propio del local o "Local #id". */
  nombre: string;
  /** Como figura en los recibos: `M-203`. */
  codigo: string;
  nivel: number;
  area: number;
  precioM2: number;
  valor: number;
  moneda: Moneda;
  cliente: ClienteEstado | null;
  filas: FilaEstado[];
  totalRecibido: number;
  pendiente: number;
  /** Progreso del cobro, 0 a 100, en la moneda del local. */
  progreso: number;
  /** Efectivo recibido por moneda, sin convertir. */
  recibido: Record<Moneda, number>;
}

const PREFIJO_RECIBO = "RIRD-";
const DIGITOS_RECIBO = 7;

const METODO_RESERVA: Record<string, string> = {
  transfer: "Transferencia",
  card: "Tarjeta",
};

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const etiquetaMetodo = (p: LocalPayment): string => {
  const metodo = METODOS_PAGO.find((m) => m.value === p.metodo)?.label ?? "";
  const detalle = p.cuenta
    ? p.metodo === "efectivo"
      ? `recibido por ${p.cuenta}`
      : p.cuenta
    : "";
  return [metodo, detalle].filter(Boolean).join(" ");
};

const clienteDe = (
  local: AppData,
  reservas: AppData[],
  clientes: AppData[],
): ClienteEstado | null => {
  const delLocal = reservas.filter(
    (r) => r.data?.locales_id === local.data?.id,
  );
  const reserva =
    delLocal.find((r) => r.data?.status === "approved") ?? delLocal[0];
  const id =
    reserva?.data?.persona_fisica_id || reserva?.data?.persona_juridica_id;
  const d = clientes.find((c) => c.data?.id === id)?.data;
  if (!d) {
    return local.data?.clientName
      ? {
          nombre: String(local.data.clientName),
          identificacion: "",
          email: "",
        }
      : null;
  }
  return {
    nombre: d.company_name
      ? String(d.company_name)
      : `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim(),
    identificacion: String(d.rnc || d.identification || d.passport || ""),
    email: String(d.email ?? "").trim(),
  };
};

/**
 * Texto por defecto de la columna «Descripción» cuando el pago se registra sin
 * una. Sigue el estilo de los recibos de Daka: «Pago cuota 11 mes de
 * noviembre, local 203 Javier».
 */
export function describirPago(p: {
  type: TipoPago;
  cuotaNumber?: number;
  date: string;
  localId: number;
  cliente?: string;
}): string {
  const mes = MESES[Number(p.date.slice(5, 7)) - 1] ?? "";
  const quien = p.cliente ? ` ${p.cliente.split(" ")[0]}` : "";
  const destino = `local ${p.localId}${quien}`;
  switch (p.type) {
    case "separacion":
      return `Pago reserva ${destino}`;
    case "inicial":
      return `Pago inicial ${destino}`;
    case "capital":
      return `Abono a capital ${destino}`;
    case "cuota":
      return `Pago cuota${p.cuotaNumber ? ` ${p.cuotaNumber}` : ""} mes de ${mes}, ${destino}`;
    default:
      return `Pago ${destino}`;
  }
}

export function estadoDeCuentaDeLocal(
  local: AppData,
  reservas: AppData[],
  pagos: AppData[],
  clientes: AppData[] = [],
): EstadoDeCuenta {
  const cuenta = cuentaDeLocal(local, reservas, pagos, clientes);
  const localId = Number(local.data?.id);
  const idsReserva = new Set(
    reservas
      .filter((r) => r.data?.locales_id === local.data?.id)
      .map((r) => r.data?.id),
  );

  type Movimiento = Omit<FilaEstado, "montoTotal" | "balance">;

  const deReserva: Movimiento[] = pagos
    .filter(
      (p) =>
        p.data?.status === "approved" && idsReserva.has(p.data?.allocation_id),
    )
    .sort((a, b) =>
      String(a.data?.created_at).localeCompare(String(b.data?.created_at)),
    )
    .map((p, i) => {
      const monto = Number(p.data?.amount) || 0;
      const mismaMoneda = p.data?.currency === cuenta.moneda;
      const base = i === 0 ? "Pago reserva" : "Abono";
      return {
        pagoId: null,
        appDataId: p.id,
        documento: "",
        metodo: METODO_RESERVA[String(p.data?.payment_method)] ?? "",
        tasa: mismaMoneda ? null : TASA_USD_DOP,
        monto,
        moneda: esMoneda(p.data?.currency) ? p.data.currency : cuenta.moneda,
        descripcion: `${base} local ${localId}`,
        fecha: String(p.data?.created_at ?? "").slice(0, 10),
        montoAplicado: mismaMoneda
          ? monto
          : aplicadoEn(
              { amount: monto, currency: p.data?.currency, tasa: TASA_USD_DOP },
              cuenta.moneda,
            ),
        comprobante: p.data?.receipt_url ? String(p.data.receipt_url) : null,
      };
    });

  const manuales: Movimiento[] = (
    (local.data?.payments as LocalPayment[] | undefined) ?? []
  ).map((p) => ({
    pagoId: p.id,
    appDataId: null,
    documento: p.documento ?? "",
    metodo: etiquetaMetodo(p),
    tasa: p.tasa ?? null,
    descripcion: p.description,
    monto: Number(p.amount) || 0,
    moneda: esMoneda(p.currency) ? p.currency : cuenta.moneda,
    fecha: p.date,
    montoAplicado: aplicadoEn(p, cuenta.moneda),
    comprobante: p.receipt_url ?? null,
  }));

  let saldo = cuenta.valor;
  const filas = [...deReserva, ...manuales]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((m) => {
      const montoTotal = saldo;
      saldo = Math.round((saldo - m.montoAplicado) * 100) / 100;
      return { ...m, montoTotal, balance: saldo };
    });

  return {
    localId,
    nombre: nombreDeLocal(local.data),
    codigo: `M-${localId}`,
    nivel: cuenta.nivel,
    area: Number(local.data?.area_mt2) || 0,
    precioM2: Number(local.data?.price_per_mt2) || 0,
    valor: cuenta.valor,
    moneda: cuenta.moneda,
    cliente: clienteDe(local, reservas, clientes),
    filas,
    totalRecibido: Math.round((cuenta.valor - saldo) * 100) / 100,
    pendiente: Math.max(0, saldo),
    progreso: cuenta.progreso,
    recibido: cuenta.recibido,
  };
}

/** Siguiente número de recibo: uno más que el mayor usado en cualquier local. */
export function siguienteRecibo(locales: AppData[]): string {
  let mayor = 0;
  for (const local of locales) {
    const pagos = (local.data?.payments as LocalPayment[] | undefined) ?? [];
    for (const p of pagos) {
      const n = Number(p.documento?.match(/(\d+)\s*$/)?.[1]);
      if (n > mayor) mayor = n;
    }
  }
  return `${PREFIJO_RECIBO}${String(mayor + 1).padStart(DIGITOS_RECIBO, "0")}`;
}

/** `2026-11-02` → `02/11/2026`. */
export const fechaCorta = (iso: string): string => {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : iso;
};

export const importe = (valor: number, moneda: Moneda): string =>
  `${moneda === "USD" ? "US$" : "RD$"} ${valor.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
