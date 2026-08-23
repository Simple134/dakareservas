"use client";

import * as React from "react";
import { cn } from "@/src/lib/utils";

/* Pestañas de sección del Workbench: subrayado, no cápsula. El estado activo
 * lleva el oro porque es navegación, no dato. */

export interface TabDef<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  /** Contador a la derecha de la etiqueta. */
  count?: number;
}

interface TabsBarProps<T extends string> {
  tabs: readonly TabDef<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
  "aria-label"?: string;
}

export function TabsBar<T extends string>({
  tabs,
  value,
  onChange,
  className,
  ...props
}: TabsBarProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={props["aria-label"] ?? "Secciones"}
      className={cn(
        "table-scroll flex items-center gap-1 border-b border-rule",
        className,
      )}
    >
      {tabs.map((tab) => {
        const activo = tab.id === value;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activo}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative flex shrink-0 items-center gap-1.5 px-3 py-2.5",
              "text-[0.8125rem] font-medium whitespace-nowrap",
              "transition-colors duration-[120ms]",
              "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold",
              activo ? "text-ink" : "text-ink-2 hover:text-ink",
            )}
          >
            {tab.icon && <tab.icon className="h-4 w-4 shrink-0" />}
            {tab.label}
            {typeof tab.count === "number" && (
              <span
                className={cn(
                  "tabular text-[0.6875rem]",
                  activo ? "text-ink-2" : "text-ink-3",
                )}
              >
                {tab.count}
              </span>
            )}
            {activo && (
              <span
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-gold"
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
