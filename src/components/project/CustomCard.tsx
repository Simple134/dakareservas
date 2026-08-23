import { cn } from "@/src/lib/utils";

/* Hallmark · design-system: design.md
 *
 * Este trío es un juego de primitivas paralelo al de `src/components/ui/`:
 * nació antes y lo usan diez ficheros (la ruta de facturas y los módulos de la
 * ficha de proyecto). No se borra de golpe —serían diez migraciones— pero sí se
 * alinea con el sistema, de modo que todo lo que ya lo usa hereda el borde
 * hairline, el radio de tarjeta y la única elevación permitida.
 *
 * `CustomButton` reenvía a `Button`: mantener dos escalas de botón con alturas
 * distintas es cómo se acaba con seis tamaños de acción primaria.
 */

export const CustomCard = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "rounded-[12px] border border-rule bg-paper",
      "shadow-[0_1px_2px_rgba(7,35,75,0.04)]",
      className,
    )}
  >
    {children}
  </div>
);

export const CustomBadge = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 rounded-[6px] border border-transparent px-2 py-0.5",
      "text-[0.6875rem] font-semibold tracking-[0.02em] whitespace-nowrap",
      // Sin `className` cae en el neutro del sistema, no en transparente.
      "bg-paper-3 text-ink-2",
      className,
    )}
  >
    {children}
  </span>
);

export const CustomButton = ({
  onClick,
  children,
  className = "",
  disabled = false,
}: {
  onClick?: () => void | Promise<void>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-[8px] px-4",
      "text-[0.8125rem] font-medium",
      "transition-colors duration-[120ms]",
      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
      "disabled:pointer-events-none disabled:opacity-50",
      // Por defecto, secundaria: borde sobre papel. Quien quiera la primaria
      // pasa las clases del oro por `className`, como ya hacía.
      "border border-rule-strong bg-paper text-ink hover:bg-paper-3 hover:border-ink-3",
      className,
    )}
  >
    {children}
  </button>
);
