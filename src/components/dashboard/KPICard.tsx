import {
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  Percent,
  Wallet,
  BarChart,
  Receipt,
  Users,
  Package,
  List,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/src/lib/utils";

/* Hallmark · design-system: design.md
 *
 * La cifra es el objeto de la tarjeta: display, tabular, sin competencia. El
 * icono es cromo tenue, no un bloque de color. El filete lateral de cuatro
 * colores que tenía antes ponía cuatro acentos distintos en una misma fila —
 * el sistema admite uno solo.
 */

export type KPI = {
  title: string;
  value: string | number;
  /* Variación real contra el período anterior. `null` u omitido cuando no hay
   * serie temporal con la que comparar: la versión anterior partía la página
   * actual en dos mitades y llamaba «tendencia» al resultado, que no lo era. */
  change?: number | null;
  changeType?: "positive" | "negative" | "neutral";
  /** Contexto de la cifra cuando no hay variación que mostrar. */
  hint?: string;
  icon: string;
  color?: "primary" | "success" | "warning" | "info";
};

// Mapa explícito: `import * as LucideIcons` arrastraba la librería completa al
// bundle del cliente para resolver cuatro nombres.
const icons: Record<string, LucideIcon> = {
  Building2,
  TrendingUp,
  Percent,
  Wallet,
  BarChart,
  Receipt,
  Users,
  Package,
  List,
};

const changeTone = {
  positive: "text-success",
  negative: "text-danger",
  neutral: "text-ink-3",
} as const;

const ChangeIcon = {
  positive: TrendingUp,
  negative: TrendingDown,
  neutral: Minus,
} as const;

interface KPICardProps {
  kpi: KPI;
  /** Muestra el esqueleto mientras el resumen aún no ha resuelto. */
  loading?: boolean;
}

export function KPICard({ kpi, loading = false }: KPICardProps) {
  const Icon = icons[kpi.icon] ?? BarChart;
  const tieneDelta = typeof kpi.change === "number";
  const tono = kpi.changeType ?? "neutral";
  const Delta = ChangeIcon[tono];

  if (loading) {
    return (
      <div className="rounded-[12px] border border-rule bg-paper p-4" aria-busy>
        <div className="h-3 w-24 animate-pulse rounded bg-paper-3" />
        <div className="mt-3 h-8 w-32 animate-pulse rounded bg-paper-3" />
        <span className="sr-only">Cargando {kpi.title}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group rounded-[12px] border border-rule bg-paper p-4",
        "shadow-[0_1px_2px_rgba(7,35,75,0.04)]",
        "transition-colors duration-[120ms] hover:border-rule-strong",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow min-w-0 truncate">{kpi.title}</p>
        <Icon
          className="h-4 w-4 shrink-0 text-ink-3 transition-colors duration-[120ms] group-hover:text-gold"
          strokeWidth={1.75}
          aria-hidden
        />
      </div>

      <p className="tabular mt-2.5 font-display text-[1.75rem] font-semibold leading-none tracking-[-0.02em] text-ink">
        {kpi.value}
      </p>

      {tieneDelta ? (
        <div className="mt-2.5 flex items-center gap-1.5">
          <Delta
            className={cn("h-3.5 w-3.5 shrink-0", changeTone[tono])}
            strokeWidth={2}
            aria-hidden
          />
          <span
            className={cn(
              "tabular text-[0.75rem] font-semibold",
              changeTone[tono],
            )}
          >
            {Math.abs(kpi.change as number).toFixed(1)}%
          </span>
          <span className="text-[0.75rem] text-ink-3">
            vs. período anterior
          </span>
        </div>
      ) : (
        <p className="mt-2.5 truncate text-[0.75rem] text-ink-3">
          {kpi.hint ?? "\u00a0"}
        </p>
      )}
    </div>
  );
}
