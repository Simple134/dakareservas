"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/src/lib/utils";

/* Hallmark · design-system: design.md
 *
 * `ui/select.tsx` es el compuesto de Radix y sólo lo usan dos sitios. El resto
 * de la aplicación —filtros de Items, Facturas, Reportes y Configuración— usa
 * `<select>` nativo, y cada uno traía su propia altura, radio y anillo de foco.
 * Esta es la versión del sistema: misma caja que `Input`, misma altura de 40 px
 * que los controles, y la flecha dibujada aparte porque `appearance-none`
 * elimina la nativa.
 */

export interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  /** Marca el control en estado de error, junto al mensaje del campo. */
  invalid?: boolean;
}

export const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  NativeSelectProps
>(({ className, invalid, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "h-10 w-full appearance-none rounded-[8px] border bg-paper",
        "pl-3 pr-9 text-[0.8125rem] text-ink",
        "transition-colors duration-[120ms]",
        "focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold",
        "disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3",
        invalid
          ? "border-danger focus:border-danger focus:outline-danger"
          : "border-rule-strong hover:border-ink-3 focus:border-gold",
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
      strokeWidth={1.75}
      aria-hidden
    />
  </div>
));
NativeSelect.displayName = "NativeSelect";

/** Campo con etiqueta: la forma en que las barras de filtro lo usan. */
export function SelectField({
  label,
  className,
  children,
  ...props
}: NativeSelectProps & { label: string }) {
  const id = React.useId();
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="eyebrow mb-1.5 block">
        {label}
      </label>
      <NativeSelect id={id} {...props}>
        {children}
      </NativeSelect>
    </div>
  );
}
