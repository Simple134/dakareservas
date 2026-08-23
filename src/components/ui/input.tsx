import { cn } from "@/src/lib/utils";
import * as React from "react";

/* Hallmark · design-system: design.md */

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Marca el campo. El mensaje va junto al campo, nunca sólo en un banner. */
  state?: "idle" | "error" | "success";
  /** Alinea las cifras en columna. Obligatorio en montos, cantidades y NCF. */
  numeric?: boolean;
}

export const inputBase = [
  "flex h-10 w-full min-w-0 rounded-[8px] border bg-paper px-3 py-2 text-sm text-ink",
  "transition-[border-color,box-shadow] duration-[120ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
  "placeholder:text-ink-3",
  "hover:border-ink-3",
  "focus-visible:outline-none focus-visible:border-gold focus-visible:shadow-[0_0_0_3px_var(--color-gold-soft)]",
  "disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3 disabled:border-rule",
  "read-only:bg-paper-2",
  "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink",
].join(" ");

export const inputState: Record<string, string> = {
  idle: "border-rule-strong",
  error:
    "border-danger focus-visible:border-danger focus-visible:shadow-[0_0_0_3px_var(--color-danger-soft)]",
  success:
    "border-success focus-visible:border-success focus-visible:shadow-[0_0_0_3px_var(--color-success-soft)]",
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, state = "idle", numeric, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      aria-invalid={state === "error" || undefined}
      className={cn(
        inputBase,
        inputState[state],
        numeric && "tabular text-right font-mono",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
