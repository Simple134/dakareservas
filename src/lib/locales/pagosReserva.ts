import type { AppData } from "@/src/types/erp";

/** Estado con el que se archiva un pago de reserva: ningún cálculo lo cuenta como aprobado. */
export const ESTADO_ELIMINADO = "deleted";

export const esPagoEliminado = (pago: AppData): boolean =>
  pago.data?.status === ESTADO_ELIMINADO;

async function actualizarPago(
  pago: AppData,
  cambios: Record<string, unknown>,
): Promise<AppData> {
  const res = await fetch("/api/erp/appData", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: pago.id,
      appId: pago.appId,
      type: pago.type,
      data: { ...cambios, updated_at: new Date().toISOString() },
      strategy: "merge",
    }),
  });
  if (!res.ok) throw new Error(`appData ${res.status}`);
  return (await res.json()) as AppData;
}

export const editarPagoDeReserva = (
  pago: AppData,
  cambios: {
    amount: number;
    currency: string;
    payment_method: string;
    created_at: string;
  },
) => actualizarPago(pago, cambios);

/**
 * Borrado lógico: la fila se queda en la base con su estado anterior en
 * `previous_status`, para poder recuperarla a mano si fue un error.
 */
export const archivarPagoDeReserva = (pago: AppData) =>
  actualizarPago(pago, {
    status: ESTADO_ELIMINADO,
    previous_status: pago.data?.status ?? null,
    deleted_at: new Date().toISOString(),
  });
