import * as React from "react";
import { cn } from "@/src/lib/utils";

/* Hallmark · design-system: design.md
 * Avance de obra y ejecución de presupuesto. El oro marca avance normal; el
 * sobrecosto (> 100 %) cambia a la escala de estado, no a un oro más intenso.
 */

const Progress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: number | null;
    tone?: "brand" | "success" | "warning" | "danger";
  }
>(({ className, value, tone = "brand", ...props }, ref) => {
  const pct = Math.min(100, Math.max(0, value ?? 0));
  const fill = {
    brand: "bg-gold",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
  }[tone];

  return (
    <div
      ref={ref}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "relative h-1.5 w-full overflow-hidden rounded-full bg-paper-3",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "h-full rounded-full transition-transform duration-[200ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
          fill,
        )}
        style={{ width: "100%", transform: `translateX(-${100 - pct}%)` }}
      />
    </div>
  );
});
Progress.displayName = "Progress";

export { Progress };
