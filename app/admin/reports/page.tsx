"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { PageHeader, PageBody } from "@/src/components/ui/page-header";
import { NativeSelect } from "@/src/components/ui/native-select";
import { Badge } from "@/src/components/ui/badge";
import { EmptyState } from "@/src/components/ui/empty-state";
import { KPICard } from "@/src/components/dashboard/KPICard";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { useErp } from "@/src/context/ErpContext";
import { PendingRecord } from "@/src/types/erp";
import { money, percent, count as fmtCount } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";

/* Hallmark · design-system: design.md · familia Workbench
 *
 * Esta página mostraba un proyecto inventado («Remodelación Oficinas Tech
 * Solutions»), seis partidas con importes fijos en el código y tres pestañas
 * que decían «en desarrollo». Llevaba incluso su propio cartel admitiendo que
 * los datos eran de demostración.
 *
 * El control de presupuesto que prometía sí se puede calcular: las partidas
 * viven en `divisions.metadata.budgetCategories` y lo consumido se obtiene de
 * las facturas del proyecto. El criterio de reparto por partida es el mismo que
 * usa BudgetModule en la ficha del proyecto —`elements[0].comment` guarda el
 * nombre de la partida—, para que las dos pantallas no se contradigan.
 */

type BudgetCategory = { id?: string; name: string; amount: number };

type Partida = {
  name: string;
  budgeted: number;
  consumed: number;
  ratio: number | null;
};

function estadoDePartida(ratio: number | null) {
  if (ratio === null)
    return { label: "Sin importe", variant: "outline" as const };
  if (ratio >= 100) return { label: "Agotada", variant: "danger" as const };
  if (ratio >= 85) return { label: "Al límite", variant: "warning" as const };
  if (ratio > 0) return { label: "En curso", variant: "info" as const };
  return { label: "Sin consumo", variant: "default" as const };
}

export default function ReportsPage() {
  const { divisions, isLoading: cargandoDivisiones } = useErp();
  const [divisionId, setDivisionId] = useState<number | null>(null);
  const [records, setRecords] = useState<PendingRecord[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const proyectos = useMemo(
    () =>
      divisions
        .filter((d) => (d.type as string) === "PROJECT")
        .sort((a, b) => a.name.localeCompare(b.name, "es")),
    [divisions],
  );

  // Primer proyecto disponible como selección inicial.
  useEffect(() => {
    if (divisionId === null && proyectos.length > 0) {
      setDivisionId(proyectos[0].id);
    }
  }, [proyectos, divisionId]);

  const proyecto = proyectos.find((p) => p.id === divisionId);

  const metadata = useMemo(() => {
    const meta = proyecto?.metadata as unknown;
    if (!meta) return {} as Record<string, unknown>;
    if (typeof meta === "string") {
      try {
        return JSON.parse(meta) as Record<string, unknown>;
      } catch {
        return {} as Record<string, unknown>;
      }
    }
    return meta as Record<string, unknown>;
  }, [proyecto]);

  useEffect(() => {
    if (!divisionId) return;
    const controller = new AbortController();
    setCargando(true);
    setError(null);

    (async () => {
      try {
        const params = new URLSearchParams({
          divisionId: String(divisionId),
          type: "INVOICE",
          elements: "200",
          page: "1",
        });
        const res = await fetch(`/api/erp/pendingRecord?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("No se pudieron cargar las facturas");
        const data = await res.json();
        setRecords(data.items ?? []);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "Error al cargar el proyecto",
        );
        setRecords([]);
      } finally {
        setCargando(false);
      }
    })();

    return () => controller.abort();
  }, [divisionId]);

  const cifras = useMemo(() => {
    let comprado = 0;
    let facturado = 0;
    let cobrado = 0;
    // Cobrado de ventas que no llevan partida: si no se muestra aparte, la
    // tabla parece decir que no se ha ejecutado nada.
    let sinPartida = 0;
    // Consumo por partida: el nombre de la partida viaja en el comentario de
    // la primera línea del documento.
    const porPartida: Record<string, number> = {};

    for (const r of records) {
      const esVenta = Number(r.isSell) === 1;
      if (esVenta) {
        facturado += r.amount || 0;
        cobrado += r.paid || 0;
        const partida = r.elements?.[0]?.comment;
        if (partida) {
          porPartida[partida] = (porPartida[partida] || 0) + (r.paid || 0);
        } else {
          sinPartida += r.paid || 0;
        }
      } else {
        comprado += r.amount || 0;
      }
    }
    return { comprado, facturado, cobrado, porPartida, sinPartida };
  }, [records]);

  const presupuesto = Number(metadata.budget) || 0;

  const partidas: Partida[] = useMemo(() => {
    const cats = Array.isArray(metadata.budgetCategories)
      ? (metadata.budgetCategories as BudgetCategory[])
      : [];
    return cats.map((cat) => {
      const budgeted = Number(cat.amount) || 0;
      const consumed = cifras.porPartida[cat.name] || 0;
      return {
        name: cat.name,
        budgeted,
        consumed,
        ratio: budgeted > 0 ? (consumed / budgeted) * 100 : null,
      };
    });
  }, [metadata, cifras.porPartida]);

  const enRiesgo = partidas.filter((p) => p.ratio !== null && p.ratio >= 85);
  const consumoGlobal =
    presupuesto > 0 ? (cifras.comprado / presupuesto) * 100 : null;

  return (
    <>
      <PageHeader
        eyebrow="Control de presupuesto"
        title="Reportes"
        description="Partidas presupuestadas frente a lo realmente ejecutado en cada proyecto."
      />

      <PageBody className="space-y-5">
        {/* Selector de proyecto */}
        <div className="flex flex-col gap-2 rounded-[12px] border border-rule bg-paper p-4 sm:flex-row sm:items-center sm:gap-4">
          <label htmlFor="proyecto" className="eyebrow shrink-0 sm:w-40">
            Proyecto a analizar
          </label>
          <NativeSelect
            id="proyecto"
            value={divisionId ?? ""}
            disabled={cargandoDivisiones || proyectos.length === 0}
            onChange={(e) => setDivisionId(Number(e.target.value))}
            className="sm:max-w-md"
          >
            {proyectos.length === 0 && <option value="">Sin proyectos</option>}
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </NativeSelect>
          {cargando && (
            <Loader2
              className="h-4 w-4 animate-spin text-ink-3"
              aria-label="Cargando facturas del proyecto"
            />
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-[8px] border border-danger/20 bg-danger-soft px-4 py-3">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-danger"
              strokeWidth={1.75}
              aria-hidden
            />
            <p className="text-[0.8125rem] text-danger">{error}</p>
          </div>
        )}

        {!proyecto && !cargandoDivisiones ? (
          <EmptyState
            title="No hay proyectos que analizar"
            description="Crea un proyecto y registra sus facturas para ver el control de presupuesto."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KPICard
                loading={cargando}
                kpi={{
                  title: "Presupuesto",
                  value: presupuesto > 0 ? money(presupuesto) : "—",
                  icon: "Wallet",
                  hint:
                    presupuesto > 0
                      ? `${fmtCount(partidas.length)} partidas definidas`
                      : "El proyecto no tiene presupuesto registrado",
                }}
              />
              <KPICard
                loading={cargando}
                kpi={{
                  title: "Ejecutado en compras",
                  value: money(cifras.comprado),
                  icon: "Package",
                  hint:
                    consumoGlobal === null
                      ? "Sin presupuesto con el que comparar"
                      : `${percent(consumoGlobal)} del presupuesto`,
                }}
              />
              <KPICard
                loading={cargando}
                kpi={{
                  title: "Facturado al cliente",
                  value: money(cifras.facturado),
                  icon: "Receipt",
                  hint: `${fmtCount(records.filter((r) => Number(r.isSell) === 1).length)} facturas de venta`,
                }}
              />
              <KPICard
                loading={cargando}
                kpi={{
                  title: "Cobrado",
                  value: money(cifras.cobrado),
                  icon: "TrendingUp",
                  hint:
                    cifras.facturado > 0
                      ? `${percent((cifras.cobrado / cifras.facturado) * 100)} de lo facturado`
                      : "Todavía sin ventas",
                }}
              />
            </div>

            {enRiesgo.length > 0 && (
              <div className="flex items-start gap-2.5 rounded-[8px] border border-warning/25 bg-warning-soft px-4 py-3">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-warning"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <p className="text-[0.8125rem] text-warning">
                  {enRiesgo.length === 1
                    ? "Una partida ha consumido el 85 % o más de su importe: "
                    : `${fmtCount(enRiesgo.length)} partidas han consumido el 85 % o más de su importe: `}
                  <span className="font-semibold">
                    {enRiesgo.map((p) => p.name).join(", ")}
                  </span>
                  .
                </p>
              </div>
            )}

            <section className="overflow-hidden rounded-[12px] border border-rule bg-paper">
              <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule px-4 py-3">
                <h2 className="font-display text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">
                  Partidas del presupuesto
                </h2>
                <p className="text-[0.75rem] text-ink-3">
                  Lo consumido sale de las facturas de venta imputadas a cada
                  partida
                </p>
              </header>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partida</TableHead>
                    <TableHead numeric>Presupuestado</TableHead>
                    <TableHead numeric>Consumido</TableHead>
                    <TableHead numeric>Disponible</TableHead>
                    <TableHead className="w-40">Avance</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partidas.length === 0 ? (
                    <TableEmpty colSpan={6}>
                      Este proyecto no tiene partidas presupuestarias definidas.
                      Se añaden desde la ficha del proyecto, en Presupuesto.
                    </TableEmpty>
                  ) : (
                    partidas.map((p) => {
                      const estado = estadoDePartida(p.ratio);
                      return (
                        <TableRow key={p.name}>
                          <TableCell className="text-[0.8125rem] font-medium text-ink">
                            {p.name}
                          </TableCell>
                          <TableCell numeric className="text-[0.8125rem]">
                            {money(p.budgeted)}
                          </TableCell>
                          <TableCell numeric className="text-[0.8125rem]">
                            {money(p.consumed)}
                          </TableCell>
                          <TableCell
                            numeric
                            className={cn(
                              "text-[0.8125rem]",
                              p.budgeted - p.consumed < 0 && "text-danger",
                            )}
                          >
                            {money(p.budgeted - p.consumed)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-paper-3">
                                <div
                                  className={cn(
                                    "h-full rounded-full",
                                    p.ratio !== null && p.ratio >= 100
                                      ? "bg-danger"
                                      : p.ratio !== null && p.ratio >= 85
                                        ? "bg-warning"
                                        : "bg-ink-2",
                                  )}
                                  style={{
                                    width: `${Math.min(p.ratio ?? 0, 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="tabular w-11 shrink-0 text-right text-[0.75rem] text-ink-2">
                                {p.ratio === null ? "—" : percent(p.ratio, 0)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={estado.variant} dot>
                              {estado.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {cifras.sinPartida > 0 && (
                <p className="border-t border-rule px-4 py-3 text-[0.75rem] text-ink-2">
                  Además hay{" "}
                  <span className="tabular font-semibold text-ink">
                    {money(cifras.sinPartida)}
                  </span>{" "}
                  cobrados en facturas sin partida asignada. Sólo se imputan a
                  una partida las facturas creadas desde el presupuesto del
                  proyecto.
                </p>
              )}
            </section>
          </>
        )}
      </PageBody>
    </>
  );
}
