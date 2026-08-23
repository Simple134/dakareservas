import * as React from "react";
import { cn } from "@/src/lib/utils";

/* Estado vacío del sistema. Antes cada ruta pintaba un círculo gris de 64 px
 * con un icono al 30 % de opacidad; el sistema no lleva ilustración: un título,
 * una frase y, como mucho, una acción. */

interface EmptyStateProps {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-[12px] border border-rule bg-paper px-6 py-14 text-center",
        className,
      )}
    >
      <p className="text-[0.875rem] font-semibold text-ink">{title}</p>
      {description && (
        <p className="mx-auto mt-1.5 max-w-[42ch] text-[0.8125rem] leading-relaxed text-ink-2">
          {description}
        </p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
