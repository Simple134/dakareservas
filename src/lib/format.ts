/* Formato de cifras del ERP.
 *
 * Toda la contabilidad de esta organización está en DOP: los 97 documentos
 * migrados lo están, y los presupuestos de `divisions.metadata` también. El
 * dashboard rotulaba estos mismos importes como «USD $», que era simplemente
 * falso.
 */

const dop = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  maximumFractionDigits: 0,
});

const dopCompacto = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** RD$1,234,568 — importes en línea, tablas y desgloses. */
export const money = (valor: number): string => dop.format(valor || 0);

/** RD$1.2 M — cifras de KPI, donde el ancho manda sobre el céntimo. */
export const moneyShort = (valor: number): string =>
  dopCompacto.format(valor || 0);

/** 39.8 % */
export const percent = (valor: number, decimales = 1): string =>
  `${(valor || 0).toFixed(decimales)} %`;

export const count = (valor: number): string =>
  new Intl.NumberFormat("es-DO").format(valor || 0);

export const shortDate = (fecha: string | null | undefined): string => {
  if (!fecha) return "—";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
};
