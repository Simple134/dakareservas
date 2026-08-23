import * as React from "react";
import { cn } from "@/src/lib/utils";
import { inputBase, inputState } from "@/src/components/ui/input";

/* Hallmark · design-system: design.md
 * Comparte tokens con Input para que campo y área de texto no diverjan.
 */

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  state?: "idle" | "error" | "success";
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, state = "idle", ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={state === "error" || undefined}
      className={cn(
        inputBase,
        inputState[state],
        "h-auto min-h-[88px] resize-y leading-relaxed",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
