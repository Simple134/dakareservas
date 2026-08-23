"use client";

import * as React from "react";
import { cn } from "@/src/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";

/* Hallmark · design-system: design.md
 *
 * Los diez modales del proyecto estaban escritos a mano: cada uno con su
 * `fixed inset-0`, su propia cabecera con la X, su radio y su altura máxima.
 * Ninguno cerraba con Escape, ninguno atrapaba el foco y ninguno bloqueaba el
 * scroll del fondo — al abrir «Crear factura» y hacer rueda, la página de
 * detrás se movía.
 *
 * `Modal` es la envoltura sobre el `Dialog` de Radix que ya existía en el
 * sistema: aporta Escape, foco atrapado, bloqueo de scroll, `aria-modal` y el
 * botón de cerrar. El cuerpo hace scroll por su cuenta para que la cabecera y
 * el pie queden fijos, que es lo que un formulario largo necesita.
 */

const sizes = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
} as const;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  size?: keyof typeof sizes;
  /** Pie fijo con las acciones. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Impide cerrar con Escape o clic fuera: para operaciones en vuelo. */
  busy?: boolean;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  footer,
  children,
  busy = false,
  className,
}: ModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(abierto) => {
        if (!abierto && !busy) onClose();
      }}
    >
      <DialogContent
        className={cn(
          // El panel no hace scroll: lo hace el cuerpo, así el pie queda fijo.
          "flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-0",
          sizes[size],
          className,
        )}
        onEscapeKeyDown={(e) => busy && e.preventDefault()}
        onInteractOutside={(e) => busy && e.preventDefault()}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {children}
        </div>

        {footer && (
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-rule bg-paper-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-end">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Bloque de campos con su título, dentro del cuerpo de un modal. */
export function ModalSection({
  title,
  description,
  className,
  children,
}: {
  title?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      {title && (
        <div>
          <h3 className="eyebrow">{title}</h3>
          {description && (
            <p className="mt-0.5 text-[0.75rem] text-ink-3">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

/** Mensaje de error del formulario, junto al campo que lo causa. */
export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="mt-1 text-[0.75rem] text-danger">
      {children}
    </p>
  );
}
