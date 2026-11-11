/** Serie B: 8 dígitos tras el prefijo. Serie E (electrónica): 10. */
export const formatNcf = (prefix: string, value: number): string =>
  `${prefix}${String(value).padStart(prefix.startsWith("E") ? 10 : 8, "0")}`;
