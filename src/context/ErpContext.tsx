"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Division } from "@/src/types/erp";
import { V2GetPendingRecordsResponse } from "@/src/types/erp";
import { PAYMENT_GATED } from "@/src/config/paymentGate";

interface ErpContextProps {
  divisions: Division[];
  pendingRecords: V2GetPendingRecordsResponse | null;
  isLoading: boolean;
  error: string | null;
  refreshDivisions: () => Promise<void>;
  refreshRecords: () => Promise<void>;
}

const ErpContext = createContext<ErpContextProps | undefined>(undefined);

/* El dashboard agrega por proyecto y por estado, así que necesita el censo
 * completo de facturas, no una página. La organización tiene 97 documentos de
 * tipo INVOICE; 300 deja margen de años sin paginar. Si esto crece, la
 * agregación se baja a Postgres (search_pending_records ya devuelve `resume`).
 */
const CENSO_FACTURAS = "300";

export const ErpProvider = ({ children }: { children: ReactNode }) => {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [pendingRecords, setPendingRecords] =
    useState<V2GetPendingRecordsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDivisions = useCallback(async () => {
    const response = await fetch("/api/erp/divisions");
    if (!response.ok) throw new Error("No se pudieron cargar las divisiones");
    setDivisions(await response.json());
  }, []);

  /* Antes este estado existía en el contexto pero nadie lo poblaba: todos los
   * KPI del dashboard leían de `null` y mostraban cero. */
  const fetchRecords = useCallback(async () => {
    const params = new URLSearchParams({
      type: "INVOICE",
      elements: CENSO_FACTURAS,
      page: "1",
      ignoreDetailedData: "true",
    });
    const response = await fetch(`/api/erp/pendingRecord?${params.toString()}`);
    if (!response.ok) throw new Error("No se pudieron cargar las facturas");
    setPendingRecords(await response.json());
  }, []);

  useEffect(() => {
    if (PAYMENT_GATED) return;
    let vivo = true;
    // El estado se escribe siempre después de un await: escribirlo de forma
    // sincrónica en el cuerpo del efecto provoca un render en cascada.
    (async () => {
      // En paralelo: son dos endpoints independientes.
      const resultados = await Promise.allSettled([
        fetchDivisions(),
        fetchRecords(),
      ]);
      if (!vivo) return;
      const fallo = resultados.find((r) => r.status === "rejected");
      if (fallo && fallo.status === "rejected") {
        console.error("Error al cargar datos del ERP:", fallo.reason);
        setError(
          fallo.reason instanceof Error
            ? fallo.reason.message
            : "Error desconocido al cargar datos del ERP",
        );
      }
      setIsLoading(false);
    })();
    return () => {
      vivo = false;
    };
  }, [fetchDivisions, fetchRecords]);

  const refreshDivisions = useCallback(async () => {
    try {
      await fetchDivisions();
    } catch (err) {
      console.error("Error al recargar divisiones:", err);
    }
  }, [fetchDivisions]);

  const refreshRecords = useCallback(async () => {
    try {
      await fetchRecords();
    } catch (err) {
      console.error("Error al recargar facturas:", err);
    }
  }, [fetchRecords]);

  return (
    <ErpContext.Provider
      value={{
        divisions,
        pendingRecords,
        isLoading,
        error,
        refreshDivisions,
        refreshRecords,
      }}
    >
      {children}
    </ErpContext.Provider>
  );
};

export const useErp = () => {
  const context = useContext(ErpContext);
  if (!context) {
    throw new Error("useErp must be used within a ErpProvider");
  }
  return context;
};
