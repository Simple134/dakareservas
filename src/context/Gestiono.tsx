"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { GestionoDivision } from "@/src/types/gestiono";
import { V2GetPendingRecordsResponse } from "@/src/types/gestiono";

interface GestionoContextProps {
  divisions: GestionoDivision[];
  pendingRecords: V2GetPendingRecordsResponse | null;
  isLoading: boolean;
  error: string | null;
  refreshDivisions: () => Promise<void>;
  refreshPendingRecords: () => Promise<void>;
}

const GestionoContext = createContext<GestionoContextProps | undefined>(
  undefined,
);

export const GestionoProvider = ({ children }: { children: ReactNode }) => {
  const [divisions, setDivisions] = useState<GestionoDivision[]>([]);
  const [pendingRecords, setPendingRecords] =
    useState<V2GetPendingRecordsResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDivisions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/gestiono/divisions");
      if (!response.ok) {
        throw new Error("Failed to fetch divisions");
      }
      const data = await response.json();
      setDivisions(data);
    } catch (err: any) {
      console.error("Error fetching Gestiono divisions:", err);
      setError(err.message || "Error desconocido al cargar divisiones");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingRecords = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/gestiono/pendingRecord");
      if (!response.ok) {
        throw new Error("Failed to fetch pending records");
      }
      const data = await response.json();
      setPendingRecords(data);
    } catch (err: any) {
      console.error("Error fetching Gestiono pending records:", err);
      setError(
        err.message || "Error desconocido al cargar registros pendientes",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDivisions();
    fetchPendingRecords();
  }, []);

  const refreshDivisions = async () => {
    await fetchDivisions();
  };

  const refreshPendingRecords = async () => {
    await fetchPendingRecords();
  };

  return (
    <GestionoContext.Provider
      value={{
        divisions,
        pendingRecords,
        isLoading,
        error,
        refreshDivisions,
        refreshPendingRecords,
      }}
    >
      {children}
    </GestionoContext.Provider>
  );
};

export const useGestiono = () => {
  const context = useContext(GestionoContext);
  if (!context) {
    throw new Error("useGestiono must be used within a GestionoProvider");
  }
  return context;
};
