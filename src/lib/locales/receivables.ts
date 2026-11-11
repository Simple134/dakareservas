import type { AppData } from "@/src/types/erp";

export type Moneda = "USD" | "DOP";

// Solo la venta cerrada es deuda del cliente: una reserva todavía puede caerse.
const ESTADOS_CON_CUENTA = ["VENDIDO"];

// Tasa fija con la que el ERP lleva a pesos lo cobrado en dólares.
export const TASA_USD_DOP = 62.8;

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
  /** Pagos aprobados en la otra moneda: se informan, no se restan. */
  cobradoOtraMoneda: number;
}

export interface TotalMoneda {
  moneda: Moneda;
  locales: number;
  valor: number;
  cobrado: number;
  pendiente: number;
}

const esMoneda = (v: unknown): v is Moneda => v === "USD" || v === "DOP";

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
  const moneda: Moneda =
    cobradoPor.USD > 0 && cobradoPor.DOP > 0
      ? monedaReserva
      : cobradoPor.DOP > 0
        ? "DOP"
        : cobradoPor.USD > 0
          ? "USD"
          : monedaReserva;

  // Los pagos manuales del modal «Pagos» se guardan dentro del propio local.
  const manuales = (
    (local.data?.payments as { amount: number }[] | undefined) ?? []
  ).reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const valor = Number(local.data?.total_value) || 0;
  const cobrado = cobradoPor[moneda] + manuales;
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
    pendiente: Math.max(0, valor - cobrado),
    cobradoOtraMoneda: cobradoPor[moneda === "USD" ? "DOP" : "USD"],
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
    total[c.moneda] += c.cobrado;
    total[c.moneda === "USD" ? "DOP" : "USD"] += c.cobradoOtraMoneda;
  }
  return total;
}
