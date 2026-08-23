import * as React from "react";
import { cn } from "@/src/lib/utils";

/* Hallmark · design-system: design.md */

const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & {
    /** Marca el campo como obligatorio con un indicador accesible. */
    required?: boolean;
  }
>(({ className, required, children, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "inline-flex items-center gap-1 text-[0.8125rem] font-medium leading-none text-ink",
      "peer-disabled:cursor-not-allowed peer-disabled:text-ink-3",
      className,
    )}
    {...props}
  >
    {children}
    {required && (
      <span className="text-danger" aria-hidden>
        *
      </span>
    )}
    {required && <span className="sr-only">(obligatorio)</span>}
  </label>
));
Label.displayName = "Label";

export { Label };
