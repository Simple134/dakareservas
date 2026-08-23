import * as React from "react";
import { cn } from "@/src/lib/utils";

/* Hallmark · design-system: design.md
 *
 * El estado de una factura nunca se comunica con el oro de marca: los estados
 * viven en su propia escala (success / warning / danger / info). El oro queda
 * reservado a acción primaria y marca.
 */

const variants = {
  default: "bg-paper-3 text-ink-2 border-rule",
  outline: "bg-transparent text-ink-2 border-rule-strong",
  brand: "bg-gold-soft text-gold-strong border-gold/25",
  success: "bg-success-soft text-success border-success/20",
  warning: "bg-warning-soft text-warning border-warning/25",
  danger: "bg-danger-soft text-danger border-danger/20",
  info: "bg-info-soft text-info border-info/20",
  // Sobre el side-rail y otras superficies oscuras
  onShell: "bg-white/10 text-white/80 border-white/15",
  // Alias heredados de la API shadcn, conservados para no romper llamadas
  secondary: "bg-paper-3 text-ink-2 border-rule",
  destructive: "bg-danger-soft text-danger border-danger/20",
} as const;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof variants;
  /** Punto de color a la izquierda. Útil en columnas de estado. */
  dot?: boolean;
}

const dotColor: Record<keyof typeof variants, string> = {
  default: "bg-ink-3",
  outline: "bg-ink-3",
  brand: "bg-gold",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  onShell: "bg-white/60",
  secondary: "bg-ink-3",
  destructive: "bg-danger",
};

function Badge({
  className,
  variant = "default",
  dot = false,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[6px] border px-2 py-0.5",
        "text-[0.6875rem] font-semibold tracking-[0.02em] whitespace-nowrap",
        variants[variant],
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotColor[variant])}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}

export { Badge };
