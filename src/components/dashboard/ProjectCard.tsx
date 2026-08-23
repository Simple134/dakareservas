import { Badge } from "@/src/components/ui/badge";
import { MapPin, FileText } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { money, percent } from "@/src/lib/format";
import { ProjectSummary } from "@/src/hooks/useDashboardMetrics";

/* Hallmark · design-system: design.md · familia Workbench
 *
 * Tres datos falsos vivían en esta tarjeta: la ubicación estaba escrita a mano
 * («La Vega, República Dominicana») aunque `metadata.location` existe, el
 * margen era la constante 20 %, y el progreso era `completionPercentage + 25`
 * sobre un valor que siempre llegaba en 0 — todos los proyectos mostraban 25 %.
 * Ahora la barra mide lo cobrado sobre el presupuesto: el mismo criterio que
 * usan BudgetModule y la barra de progreso de la ficha del proyecto.
 */

const ESTADO: Record<
  ProjectSummary["status"],
  { label: string; variant: "info" | "success" | "default" }
> = {
  planning: { label: "Planificación", variant: "info" },
  execution: { label: "Ejecución", variant: "success" },
  completed: { label: "Completado", variant: "default" },
};

interface ProjectCardProps {
  project: ProjectSummary;
  onSelect?: (project: ProjectSummary) => void;
}

export function ProjectCard({ project, onSelect }: ProjectCardProps) {
  const estado = ESTADO[project.status];
  const consumo = project.consumption;
  // El sobrecoste se avisa en la escala de estado, nunca con el oro de marca.
  const tensión = consumo !== null && consumo >= 90;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(project)}
      className={cn(
        "group flex w-full flex-col rounded-[12px] border border-rule bg-paper text-left",
        "shadow-[0_1px_2px_rgba(7,35,75,0.04)]",
        "transition-colors duration-[120ms] hover:border-rule-strong hover:bg-paper-2",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
      )}
    >
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <h3 className="truncate font-display text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">
            {project.name}
          </h3>
          <p className="mt-0.5 truncate text-[0.8125rem] text-ink-2">
            {project.client ?? "Sin cliente registrado"}
          </p>
        </div>
        <Badge variant={estado.variant} dot>
          {estado.label}
        </Badge>
      </div>

      <div className="mt-3 flex items-center gap-1.5 px-4 text-[0.75rem] text-ink-3">
        <MapPin
          className="h-3.5 w-3.5 shrink-0"
          strokeWidth={1.75}
          aria-hidden
        />
        <span className="truncate">{project.location ?? "Sin ubicación"}</span>
      </div>

      <div className="mt-4 px-4">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[0.75rem] text-ink-2">Avance cobrado</span>
          <span
            className={cn(
              "tabular text-[0.75rem] font-semibold",
              tensión ? "text-warning" : "text-ink",
            )}
          >
            {consumo === null ? "Sin presupuesto" : percent(consumo, 0)}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-paper-3">
          <div
            className={cn(
              "h-full rounded-full",
              tensión ? "bg-warning" : "bg-ink-2",
            )}
            style={{ width: `${consumo ?? 0}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-rule px-4 py-3">
        <div className="min-w-0">
          <p className="eyebrow">Presupuesto</p>
          <p className="tabular mt-0.5 truncate text-[0.8125rem] font-semibold text-ink">
            {project.budget > 0 ? money(project.budget) : "—"}
          </p>
        </div>
        <div className="min-w-0">
          <p className="eyebrow">Cobrado</p>
          <p className="tabular mt-0.5 truncate text-[0.8125rem] font-semibold text-ink">
            {money(project.collected)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 border-t border-rule px-4 py-2.5 text-[0.75rem] text-ink-3">
        <FileText
          className="h-3.5 w-3.5 shrink-0"
          strokeWidth={1.75}
          aria-hidden
        />
        <span className="tabular">
          {project.invoiceCount === 0
            ? "Sin facturas"
            : `${project.invoiceCount} factura${project.invoiceCount === 1 ? "" : "s"}`}
        </span>
        <span className="ml-auto text-ink-3 transition-colors duration-[120ms] group-hover:text-gold">
          Abrir →
        </span>
      </div>
    </button>
  );
}
