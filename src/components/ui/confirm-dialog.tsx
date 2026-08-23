"use client";

import * as React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Button } from "@/src/components/ui/button";

/* Hallmark · design-system: design.md
 *
 * Contactos, Items y Facturas llevaban cada una su propio diálogo de
 * confirmación escrito a mano, con overlay `bg-black/40`, radio `2xl` y un
 * botón rojo sólido distinto en cada archivo. design.md sólo admite la
 * destructiva sólida DENTRO del diálogo de confirmación, que es exactamente
 * aquí — de ahí `destructiveSolid`.
 */

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Qué se va a hacer y sobre qué. Concreto, no «esta acción». */
  description: React.ReactNode;
  confirmLabel: string;
  /** Etiqueta mientras la acción está en vuelo. */
  pendingLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pendingLabel,
  cancelLabel = "Cancelar",
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Escape cierra, como cualquier overlay del sistema.
  React.useEffect(() => {
    if (!open) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onCancel();
    };
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [open, pending, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="absolute inset-0 bg-[oklch(21%_0.021_250_/_0.45)] backdrop-blur-[2px]"
        onClick={() => !pending && onCancel()}
        aria-hidden
      />
      <div
        className={cn(
          "relative w-full max-w-[26rem] rounded-[12px] border border-rule bg-paper",
          "shadow-[0_16px_48px_rgba(7,35,75,0.18)]",
        )}
      >
        <div className="flex gap-3 px-5 pt-5">
          <span
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-danger-soft"
            aria-hidden
          >
            <AlertTriangle className="h-4 w-4 text-danger" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h2
              id="confirm-dialog-title"
              className="font-display text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink"
            >
              {title}
            </h2>
            <div className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-2">
              {description}
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-rule px-5 py-3.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="destructiveSolid"
            size="sm"
            onClick={onConfirm}
            disabled={pending}
          >
            {pending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {pending ? (pendingLabel ?? confirmLabel) : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
