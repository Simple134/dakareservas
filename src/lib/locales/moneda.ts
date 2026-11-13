export type Moneda = "USD" | "DOP";

// Tasa fija con la que el ERP lleva a pesos lo cobrado en dólares.
export const TASA_USD_DOP = 62.8;

export const esMoneda = (v: unknown): v is Moneda => v === "USD" || v === "DOP";

export const otraMoneda = (m: Moneda): Moneda => (m === "USD" ? "DOP" : "USD");

const redondear = (n: number): number => Math.round(n * 100) / 100;

/**
 * Pasa un monto de una moneda a otra con la tasa en pesos por dólar.
 * Sin tasa válida usa `TASA_USD_DOP`.
 */
export function convertir(
  monto: number,
  desde: Moneda,
  hacia: Moneda,
  tasa?: number | null,
): number {
  if (desde === hacia) return monto;
  const t = tasa && tasa > 0 ? tasa : TASA_USD_DOP;
  return redondear(desde === "DOP" ? monto / t : monto * t);
}

/** Lo que un pago manual descuenta del valor del local, en la moneda del local. */
export function aplicadoEn(
  pago: { amount: number; currency?: unknown; tasa?: number | null },
  monedaLocal: Moneda,
): number {
  const monto = Number(pago.amount) || 0;
  const moneda = esMoneda(pago.currency) ? pago.currency : monedaLocal;
  return convertir(monto, moneda, monedaLocal, pago.tasa);
}

/**
 * Revisa que un local no mezcle monedas: su moneda es USD o DOP y cada pago
 * declara la suya, con tasa cuando difiere de la del local. Devuelve el
 * problema, o `null` si todo está en orden.
 */
export function validarMonedasDeLocal(
  data: Record<string, unknown>,
): string | null {
  const { currency, payments } = data;
  if (currency !== undefined && !esMoneda(currency))
    return "La moneda del local debe ser USD o DOP.";
  if (payments === undefined) return null;
  if (!Array.isArray(payments)) return "payments debe ser una lista.";
  for (const p of payments as Record<string, unknown>[]) {
    if (!(Number(p?.amount) > 0))
      return "Cada pago necesita un monto mayor que cero.";
    if (p.currency !== undefined && !esMoneda(p.currency))
      return "La moneda de cada pago debe ser USD o DOP.";
    const difiere =
      esMoneda(currency) && esMoneda(p.currency) && p.currency !== currency;
    if (difiere && !(Number(p.tasa) > 0))
      return "Un pago en otra moneda que la del local necesita su tasa.";
  }
  return null;
}
