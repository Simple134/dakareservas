"use client";

import * as React from "react";
import { cn } from "@/src/lib/utils";

/* Hallmark · design-system: design.md · familia Workbench
 *
 * Contactos, Items y Facturas repetían la misma píldora de filtro con tres
 * juegos de clases distintos (`bg-ink text-white` en una, `bg-blue-600` en
 * otra). El estado activo es el mismo en toda la aplicación: relleno de oro
 * tenue con borde, porque «filtro activo» es estado de navegación, no de dato.
 */

interface FilterChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  /** Recuento a la derecha. Se omite en la opción «Todos». */
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
}

export function FilterChip({
  active = false,
  count,
  icon: Icon,
  className,
  children,
  ...props
}: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[6px] border px-2.5 py-1",
        "text-[0.75rem] font-medium whitespace-nowrap",
        "transition-colors duration-[120ms]",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold",
        active
          ? "border-gold/30 bg-gold-soft text-gold-strong"
          : "border-rule bg-paper text-ink-2 hover:border-rule-strong hover:text-ink",
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      {children}
      {typeof count === "number" && (
        <span
          className={cn(
            "tabular text-[0.6875rem]",
            active ? "text-gold-strong/70" : "text-ink-3",
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/** Grupo de chips con su etiqueta. */
export function FilterGroup({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="eyebrow mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}
