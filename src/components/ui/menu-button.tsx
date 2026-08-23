"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Button, type ButtonProps } from "@/src/components/ui/button";

/* Hallmark · design-system: design.md
 *
 * El mismo menú desplegable estaba escrito tres veces: `SaleDropdown`,
 * `PurchaseDropdown` y el botón «Crear documento» de la ruta de facturas. Dos
 * de ellos cerraban al hacer clic fuera y el tercero no; ninguno cerraba con
 * Escape ni devolvía el foco al botón.
 */

export interface MenuOption {
  label: string;
  /** Segunda línea, opcional: qué hace exactamente la opción. */
  hint?: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Color del icono. Por defecto, cromo tenue. */
  tone?: "neutral" | "success" | "info" | "danger";
  onSelect: () => void;
}

interface MenuButtonProps {
  label: React.ReactNode;
  options: MenuOption[];
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Ancho del panel. */
  width?: string;
  className?: string;
}

const toneClass = {
  neutral: "text-ink-3",
  success: "text-success",
  info: "text-info",
  danger: "text-danger",
} as const;

export function MenuButton({
  label,
  options,
  variant = "outline",
  size = "default",
  icon: Icon,
  width = "w-60",
  className,
}: MenuButtonProps) {
  const [open, setOpen] = React.useState(false);
  const contenedor = React.useRef<HTMLDivElement>(null);
  const disparador = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const fuera = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        disparador.current?.focus();
      }
    };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div className={cn("relative", className)} ref={contenedor}>
      <Button
        ref={disparador}
        variant={variant}
        size={size}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {Icon && <Icon className="mr-1.5 h-4 w-4" strokeWidth={1.75} />}
        {label}
        <ChevronDown
          className={cn(
            "ml-1.5 h-4 w-4 transition-transform duration-[120ms]",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </Button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute right-0 z-50 mt-1.5 overflow-hidden rounded-[8px]",
            "border border-rule bg-paper py-1",
            "shadow-[0_16px_48px_rgba(7,35,75,0.18)]",
            width,
          )}
        >
          {options.map((opcion) => {
            const OpIcon = opcion.icon;
            return (
              <button
                key={opcion.label}
                role="menuitem"
                onClick={() => {
                  opcion.onSelect();
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left",
                  "transition-colors duration-[120ms]",
                  "hover:bg-paper-3 focus-visible:bg-paper-3 focus-visible:outline-none",
                )}
              >
                {OpIcon && (
                  <OpIcon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      toneClass[opcion.tone ?? "neutral"],
                    )}
                    strokeWidth={1.75}
                  />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-[0.8125rem] text-ink">
                    {opcion.label}
                  </span>
                  {opcion.hint && (
                    <span className="block truncate text-[0.75rem] text-ink-3">
                      {opcion.hint}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
