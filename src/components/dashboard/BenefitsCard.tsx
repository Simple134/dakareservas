import { cn } from "@/src/lib/utils";
import { money, percent } from "@/src/lib/format";

/* Hallmark · design-system: design.md · familia Workbench
 *
 * Antes: cuatro tarjetas con degradado verde / azul / morado / naranja, un
 * emoji de billete y tres cifras inventadas (crecimiento mensual 8.5 %,
 * proyección anual = ganancia × 12, objetivo de margen 25 %). El sistema
 * admite un solo acento y ninguna cifra sin origen en la base de datos.
 *
 * Ahora: una sola superficie, regla hairline como separador, cifras tabulares
 * y el color reservado al signo del resultado.
 */

interface BenefitsCardProps {
  /** Ventas netas de impuestos. */
  salesNet: number;
  /** Compras netas de impuestos. */
  purchasesNet: number;
  /** salesNet − purchasesNet. */
  grossMargin: number;
  grossMarginPct: number;
  /** ITBIS cobrado en ventas. */
  taxesCollected: number;
  /** ITBIS soportado en compras. */
  taxesPaid: number;
  invoiceCount: number;
}

function Linea({
  label,
  value,
  tone = "ink",
  strong = false,
}: {
  label: string;
  value: string;
  tone?: "ink" | "success" | "danger";
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <span
        className={cn(
          "text-[0.8125rem]",
          strong ? "font-semibold text-ink" : "text-ink-2",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "tabular shrink-0 text-[0.875rem] font-semibold",
          tone === "success" && "text-success",
          tone === "danger" && "text-danger",
          tone === "ink" && "text-ink",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function BenefitsCard({
  salesNet,
  purchasesNet,
  grossMargin,
  grossMarginPct,
  taxesCollected,
  taxesPaid,
  invoiceCount,
}: BenefitsCardProps) {
  const positivo = grossMargin >= 0;

  return (
    <section className="rounded-[12px] border border-rule bg-paper">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule px-5 py-4">
        <h2 className="font-display text-[1rem] font-semibold tracking-[-0.01em] text-ink">
          Margen bruto
        </h2>
        <p className="text-[0.75rem] text-ink-3">
          Sobre {invoiceCount} facturas registradas
        </p>
      </header>

      <div className="grid grid-cols-1 divide-y divide-rule lg:grid-cols-[1fr_1px_1fr] lg:divide-x lg:divide-y-0">
        <div className="px-5 py-5">
          <p className="eyebrow">Resultado</p>
          <p
            className={cn(
              "tabular mt-2 font-display text-[2rem] font-semibold leading-none tracking-[-0.02em]",
              positivo ? "text-ink" : "text-danger",
            )}
          >
            {money(grossMargin)}
          </p>
          <p className="mt-2 text-[0.8125rem] text-ink-2">
            <span className="tabular font-semibold text-ink">
              {percent(grossMarginPct)}
            </span>{" "}
            sobre ventas netas
          </p>

          <div
            className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-paper-3"
            role="img"
            aria-label={`Compras representan el ${percent(
              salesNet > 0 ? (purchasesNet / salesNet) * 100 : 0,
            )} de las ventas`}
          >
            <div
              className="h-full rounded-full bg-ink-2"
              style={{
                width: `${Math.min(
                  salesNet > 0 ? (purchasesNet / salesNet) * 100 : 0,
                  100,
                )}%`,
              }}
            />
          </div>
          <p className="mt-2 text-[0.75rem] text-ink-3">
            Proporción de las ventas absorbida por compras
          </p>
        </div>

        <div className="hidden bg-rule lg:block" aria-hidden />

        <div className="divide-y divide-rule px-5 py-2">
          <Linea label="Ventas netas" value={money(salesNet)} />
          <Linea
            label="Compras netas"
            value={`−${money(purchasesNet)}`}
            tone="danger"
          />
          <Linea
            label="Margen bruto"
            value={money(grossMargin)}
            tone={positivo ? "success" : "danger"}
            strong
          />
          <Linea label="ITBIS cobrado" value={money(taxesCollected)} />
          <Linea label="ITBIS soportado" value={money(taxesPaid)} />
        </div>
      </div>
    </section>
  );
}
