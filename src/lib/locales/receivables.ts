import type { AppData } from "@/src/types/erp";
import {
  TASA_USD_DOP,
  aplicadoEn,
  convertir,
  esMoneda,
  type Moneda,
} from "@/src/lib/locales/moneda";

export { TASA_USD_DOP };
export type { Moneda };

// Solo la venta cerrada es deuda del cliente: una reserva todavía puede caerse.
const ESTADOS_CON_CUENTA = ["VENDIDO"];

export interface CuentaLocal {
  localId: number;
  nivel: number;
  estado: string;
  cliente: string | null;
  /** Fecha de la reserva que originó la venta; `null` si no tiene reserva. */
  fecha: string | null;
  moneda: Moneda;
  valor: number;
  cobrado: number;
  pendiente: number;
  /** Progreso del cobro, 0 a 100, en la moneda del local. */
  progreso: number;
  /**
   * Efectivo recibido en cada moneda, sin convertir.
   */
  recibido: Record<Moneda, number>;
}

export interface TotalMoneda {
  moneda: Moneda;
  locales: number;
  valor: number;
  cobrado: number;
  pendiente: number;
}

const nombreCliente = (cliente: AppData | undefined): string | null => {
  if (!cliente) return null;
  const d = cliente.data ?? {};
  if (d.company_name) return String(d.company_name);
  return `${d.first_name ?? ""} ${d.last_name ?? ""}`.trim() || null;
};

export function cuentaDeLocal(
  local: AppData,
  reservas: AppData[],
  pagos: AppData[],
  clientes: AppData[] = [],
): CuentaLocal {
  const delLocal = reservas.filter(
    (r) => r.data?.locales_id === local.data?.id,
  );
  const reserva =
    delLocal.find((r) => r.data?.status === "approved") ?? delLocal[0];
  const idsReserva = new Set(delLocal.map((r) => r.data?.id));

  const cobradoPor: Record<Moneda, number> = { USD: 0, DOP: 0 };
  for (const p of pagos) {
    if (p.data?.status !== "approved") continue;
    if (!idsReserva.has(p.data?.allocation_id)) continue;
    if (!esMoneda(p.data?.currency)) continue;
    cobradoPor[p.data.currency] += Number(p.data?.amount) || 0;
  }

  // La reserva dice USD incluso en locales que se cobran en pesos (el 107),
  // así que manda la moneda en la que el cliente está pagando de verdad.
  const monedaReserva: Moneda = esMoneda(reserva?.data?.currency)
    ? reserva.data.currency
    : "USD";
  const inferida: Moneda =
    cobradoPor.USD > 0 && cobradoPor.DOP > 0
      ? monedaReserva
      : cobradoPor.DOP > 0
        ? "DOP"
        : cobradoPor.USD > 0
          ? "USD"
          : monedaReserva;
  // Si el local declara su moneda, esa manda sobre lo que se deduce de los pagos.
  const moneda: Moneda = esMoneda(local.data?.currency)
    ? local.data.currency
    : inferida;

  // Los pagos manuales del modal «Pagos» se guardan dentro del propio local,
  // cada uno en su moneda; aquí se llevan a la moneda del local con su tasa.
  const manuales = (
    (local.data?.payments as
      { amount: number; currency?: unknown; tasa?: number }[] | undefined) ?? []
  ).filter((p) => Number(p.amount) > 0);
  const aplicadoManual = manuales.reduce(
    (s, p) => s + aplicadoEn(p, moneda),
    0,
  );
  const recibido: Record<Moneda, number> = { ...cobradoPor };
  for (const p of manuales) {
    recibido[esMoneda(p.currency) ? p.currency : moneda] += Number(p.amount);
  }

  const valor = Number(local.data?.total_value) || 0;
  // Los pagos de la reserva en la otra moneda no traen tasa: van a la fija.
  const otra: Moneda = moneda === "USD" ? "DOP" : "USD";
  const cobrado =
    Math.round(
      (cobradoPor[moneda] +
        convertir(cobradoPor[otra], otra, moneda) +
        aplicadoManual) *
        100,
    ) / 100;
  const clienteId =
    reserva?.data?.persona_fisica_id || reserva?.data?.persona_juridica_id;

  return {
    localId: Number(local.data?.id),
    nivel: Number(local.data?.level),
    estado: String(local.data?.status ?? ""),
    cliente:
      nombreCliente(clientes.find((c) => c.data?.id === clienteId)) ??
      (local.data?.clientName ? String(local.data.clientName) : null),
    fecha: reserva?.data?.created_at ? String(reserva.data.created_at) : null,
    moneda,
    valor,
    cobrado,
    pendiente: Math.max(0, Math.round((valor - cobrado) * 100) / 100),
    progreso: valor > 0 ? Math.min(100, (cobrado / valor) * 100) : 0,
    recibido,
  };
}

export function cuentasPorCobrarDeLocales(
  locales: AppData[],
  reservas: AppData[],
  pagos: AppData[],
  clientes: AppData[] = [],
): CuentaLocal[] {
  return locales
    .filter((l) => ESTADOS_CON_CUENTA.includes(l.data?.status))
    .map((l) => cuentaDeLocal(l, reservas, pagos, clientes))
    .sort((a, b) => a.localId - b.localId);
}

export function totalesPorMoneda(cuentas: CuentaLocal[]): TotalMoneda[] {
  return (["USD", "DOP"] as const)
    .map((moneda) => {
      const filas = cuentas.filter((c) => c.moneda === moneda);
      return {
        moneda,
        locales: filas.length,
        valor: filas.reduce((s, c) => s + c.valor, 0),
        cobrado: filas.reduce((s, c) => s + c.cobrado, 0),
        pendiente: filas.reduce((s, c) => s + c.pendiente, 0),
      };
    })
    .filter((t) => t.locales > 0);
}

/** Todo lo ya recibido por locales, vendidos o reservados, sin convertir. */
export function cobradoEnLocales(
  locales: AppData[],
  reservas: AppData[],
  pagos: AppData[],
): Record<Moneda, number> {
  const total: Record<Moneda, number> = { USD: 0, DOP: 0 };
  for (const local of locales) {
    const c = cuentaDeLocal(local, reservas, pagos);
    total.USD += c.recibido.USD;
    total.DOP += c.recibido.DOP;
  }
  return total;
}
