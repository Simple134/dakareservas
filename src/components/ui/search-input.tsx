"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/src/lib/utils";

/* Buscador de la barra de filtros. Cinco rutas lo reinventaban con altura,
 * radio y color de foco distintos. */

interface SearchInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> {
  value: string;
  onValueChange: (valor: string) => void;
}

export function SearchInput({
  value,
  onValueChange,
  className,
  placeholder = "Buscar…",
  ...props
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
        strokeWidth={1.75}
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-10 w-full rounded-[8px] border border-rule-strong bg-paper",
          "pl-9 pr-9 text-[0.8125rem] text-ink placeholder:text-ink-3",
          "transition-colors duration-[120ms]",
          "hover:border-ink-3",
          "focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold",
          "[&::-webkit-search-cancel-button]:appearance-none",
        )}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onValueChange("")}
          aria-label="Limpiar búsqueda"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-[4px] p-0.5 text-ink-3 transition-colors duration-[120ms] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
