import type { AppData } from "@/src/types/erp";

export async function leerAppDataTipo(
  uniqueId: string,
  type: string,
  signal?: AbortSignal,
): Promise<AppData[]> {
  const params = new URLSearchParams({ type, appId: uniqueId });
  const res = await fetch(`/api/erp/appData?${params}`, { signal });
  if (!res.ok) throw new Error(`appData ${type}: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : (data.appData ?? []);
}
