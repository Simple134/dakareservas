import * as React from "react";
import { cn } from "@/src/lib/utils";

/* Hallmark · design-system: design.md · macrostructure: Workbench
 *
 * Barra de página compartida por toda la familia Workbench: título display,
 * descripción en ink-2, acciones a la derecha. Cada ruta admin la inventaba por
 * su cuenta, con seis tamaños de título distintos entre ellas.
 */

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  /** Etiqueta superior. Sólo cuando aporta contexto real (proyecto, período). */
  eyebrow?: React.ReactNode;
  /** Acciones a la derecha. Un solo botón primario. */
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 border-b border-rule bg-paper px-4 py-5 sm:px-6",
        "md:flex-row md:items-center md:justify-between md:gap-6",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="font-display text-[1.375rem] font-semibold leading-tight tracking-[-0.02em] text-ink">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-[65ch] text-[0.8125rem] leading-relaxed text-ink-2">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}

/** Lienzo estándar de una ruta Workbench. */
export function PageBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("min-w-0 px-4 py-5 sm:px-6 sm:py-6", className)}
      {...props}
    />
  );
}
