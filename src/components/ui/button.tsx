import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import { cn } from "@/src/lib/utils";

/* Hallmark · design-system: design.md · designed-as-app
 *
 * Las clases usan nombres de marca (gold / ink / rule / paper) en lugar de los
 * alias shadcn (primary / muted / border). Bootstrap 5 declara `.bg-primary`,
 * `.text-primary` y `.border` con !important, y entre declaraciones !important
 * gana la capa más baja — es decir, Bootstrap. Los nombres de marca no existen
 * en Bootstrap, así que la colisión es imposible.
 */

const base = [
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap",
  "rounded-[8px] font-medium select-none",
  "transition-[background-color,border-color,color,box-shadow,transform] duration-[120ms]",
  "ease-[cubic-bezier(0.16,1,0.3,1)]",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
  "active:translate-y-px",
  "disabled:pointer-events-none disabled:opacity-45",
  // El texto de un control nunca parte a dos líneas
  "[&>span]:truncate",
].join(" ");

const variants: Record<string, string> = {
  // Acción primaria. Uno solo por vista.
  default: [
    "bg-gold-strong text-gold-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]",
    "hover:bg-gold hover:shadow-[0_2px_6px_rgba(0,0,0,0.12)]",
    "active:bg-gold-strong active:shadow-none",
  ].join(" "),
  // Acción secundaria: borde sobre papel.
  outline: [
    "border border-rule-strong bg-paper text-ink",
    "hover:bg-paper-3 hover:border-ink-3",
    "active:bg-rule",
  ].join(" "),
  // Superficie sólida neutra, para acciones terciarias con peso.
  secondary: [
    "bg-paper-3 text-ink border border-transparent",
    "hover:bg-rule active:bg-rule-strong",
  ].join(" "),
  // Sin caja hasta que se interactúa.
  ghost: "text-ink-2 hover:bg-paper-3 hover:text-ink active:bg-rule",
  // Destructiva: tenue por defecto; sólida sólo dentro del diálogo de confirmación.
  destructive: [
    "bg-danger-soft text-danger border border-transparent",
    "hover:bg-danger hover:text-white active:bg-danger",
  ].join(" "),
  destructiveSolid:
    "bg-danger text-white hover:brightness-110 active:brightness-95",
  // Sobre el side-rail y otras superficies oscuras.
  onShell:
    "text-white/70 hover:bg-white/10 hover:text-white active:bg-white/[0.14]",
  link: "text-gold underline-offset-4 hover:underline hover:text-gold-strong px-0 h-auto",
};

const sizes: Record<string, string> = {
  xs: "h-7 px-2 text-[0.75rem]",
  sm: "h-9 px-3 text-[0.8125rem]",
  default: "h-10 px-4 text-sm",
  lg: "h-11 px-6 text-[0.9375rem]",
  icon: "h-10 w-10 p-0",
  iconSm: "h-8 w-8 p-0",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  asChild?: boolean;
  /** Bloquea el control y muestra el spinner conservando el ancho. */
  loading?: boolean;
  /** Marca visualmente el resultado sin lanzar un toast. Éxito silencioso. */
  state?: "idle" | "error" | "success";
}

const stateRing: Record<string, string> = {
  idle: "",
  error: "ring-2 ring-danger/35 ring-offset-1 ring-offset-paper",
  success: "ring-2 ring-success/35 ring-offset-1 ring-offset-paper",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      loading = false,
      state = "idle",
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const classes = cn(
      base,
      variants[variant] ?? variants.default,
      sizes[size] ?? sizes.default,
      stateRing[state],
      className,
    );

    // asChild delega el render al hijo (Link, etc.). Antes se aceptaba la prop
    // y se ignoraba en silencio, lo que rompía cualquier botón-enlace.
    if (asChild) {
      return (
        <Slot ref={ref} className={classes} {...props}>
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button };
