"use client";

import { useCallback, useEffect, useState } from "react";
import { leerAppDataTipo } from "@/src/lib/locales/fetch";
import {
  cuentasPorCobrarDeLocales,
  type CuentaLocal,
} from "@/src/lib/locales/receivables";

type Estado = "cargando" | "listo" | "error";

/** Locales vendidos del proyecto como cuentas por cobrar. Sin `uniqueId`, vacío. */
export function useCuentasLocales(uniqueId?: string) {
  const [cuentas, setCuentas] = useState<CuentaLocal[]>([]);
  const [estado, setEstado] = useState<Estado>(uniqueId ? "cargando" : "listo");
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!uniqueId) return;
    const controller = new AbortController();
    Promise.all(
      ["locales", "reservas", "payments", "User"].map((t) =>
        leerAppDataTipo(uniqueId, t, controller.signal),
      ),
    )
      .then(([locales, reservas, pagos, clientes]) => {
        setCuentas(
          cuentasPorCobrarDeLocales(locales, reservas, pagos, clientes),
        );
        setEstado("listo");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error("Error al cargar los locales por cobrar:", error);
        setEstado("error");
      });
    return () => controller.abort();
  }, [uniqueId, intento]);

  const reintentar = useCallback(() => {
    setEstado("cargando");
    setIntento((n) => n + 1);
  }, []);

  return { cuentas, estado, reintentar };
}
