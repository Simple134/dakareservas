import * as React from "react";
import { cn } from "@/src/lib/utils";

/* Hallmark · design-system: design.md */

const Separator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    orientation?: "horizontal" | "vertical";
    /** Sobre superficies oscuras (side-rail, kiosco). */
    onShell?: boolean;
  }
>(({ className, orientation = "horizontal", onShell, ...props }, ref) => (
  <div
    ref={ref}
    role="separator"
    aria-orientation={orientation}
    className={cn(
      "shrink-0",
      onShell ? "bg-white/12" : "bg-rule",
      orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
      className,
    )}
    {...props}
  />
));
Separator.displayName = "Separator";

export { Separator };
