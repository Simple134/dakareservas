/** Nombre que se muestra de un local: el que le puso el usuario o "Local #id". */
export function nombreDeLocal(
  data: { id?: unknown; name?: unknown } | null | undefined,
): string {
  const propio = typeof data?.name === "string" ? data.name.trim() : "";
  return propio || `Local #${data?.id ?? ""}`;
}
