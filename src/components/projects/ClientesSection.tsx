"use client";

import { useState, useEffect } from "react";
import { Users, Briefcase, Loader2 } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { SearchInput } from "@/src/components/ui/search-input";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";

interface ClientesSectionProps {
  uniqueId?: string;
}

export function ClientesSection({ uniqueId }: ClientesSectionProps) {
  const [clientsData, setClientsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const queryParams = new URLSearchParams({
          type: "User",
          appId: uniqueId || "",
        });
        const res = await fetch(`/api/erp/appData?${queryParams.toString()}`);
        if (res.ok) {
          const data = await res.json();
          // The API returns {appData: Array, organizations: Object}
          if (data.appData && Array.isArray(data.appData)) {
            setClientsData(data.appData);
          } else if (Array.isArray(data)) {
            // Fallback in case structure changes
            setClientsData(data);
          }
        } else {
          console.error("Failed to fetch clients");
        }
      } catch (error) {
        console.error("Error fetching clients:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClients();
  }, []);

  const getFilteredClients = () => {
    if (!searchTerm) return clientsData;

    return clientsData.filter((client) => {
      const firstName = client.data?.first_name?.toLowerCase() || "";
      const lastName = client.data?.last_name?.toLowerCase() || "";
      const companyName = client.data?.company_name?.toLowerCase() || "";
      const email = client.data?.email?.toLowerCase() || "";
      const identification =
        client.data?.identification?.toString().toLowerCase() || "";
      const rnc = client.data?.rnc?.toString().toLowerCase() || "";
      const search = searchTerm.toLowerCase();
      return (
        firstName.includes(search) ||
        lastName.includes(search) ||
        companyName.includes(search) ||
        email.includes(search) ||
        identification.includes(search) ||
        rnc.includes(search)
      );
    });
  };

  // Helper function to get client display name
  const getClientName = (client: any) => {
    if (client.data?.company_name) {
      return client.data.company_name;
    }
    const firstName = client.data?.first_name || "";
    const lastName = client.data?.last_name || "";
    return `${firstName} ${lastName}`.trim() || "Sin nombre";
  };

  // Helper function to check if it's a company
  const isCompany = (client: any) => {
    return !!client.data?.company_name || !!client.data?.rnc;
  };

  const clientes = getFilteredClients();

  return (
    <section className="overflow-hidden rounded-[12px] border border-rule bg-paper">
      <header className="flex flex-col gap-3 border-b border-rule px-4 py-3 sm:flex-row sm:items-center">
        <h3 className="shrink-0 font-display text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">
          Clientes
        </h3>
        <SearchInput
          className="flex-1"
          value={searchTerm}
          onValueChange={setSearchTerm}
          placeholder="Buscar por nombre, empresa, correo o identificación…"
        />
        <p className="tabular shrink-0 text-[0.75rem] text-ink-3">
          {searchTerm
            ? `${clientes.length} de ${clientsData.length}`
            : `${clientsData.length} clientes`}
        </p>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2
            className="h-5 w-5 animate-spin text-ink-3"
            aria-label="Cargando clientes"
          />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Identificación</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientsData.length === 0 ? (
              <TableEmpty colSpan={5}>
                Este proyecto todavía no tiene clientes registrados.
              </TableEmpty>
            ) : clientes.length === 0 ? (
              <TableEmpty colSpan={5}>
                Ningún cliente coincide con «{searchTerm}».
              </TableEmpty>
            ) : (
              clientes.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-paper-3"
                        aria-hidden
                      >
                        {isCompany(client) ? (
                          <Briefcase
                            className="h-4 w-4 text-ink-2"
                            strokeWidth={1.75}
                          />
                        ) : (
                          <Users
                            className="h-4 w-4 text-ink-2"
                            strokeWidth={1.75}
                          />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[0.8125rem] font-medium text-ink">
                          {getClientName(client)}
                        </span>
                        <span className="block text-[0.75rem] text-ink-3">
                          {isCompany(client) ? "Empresa" : "Persona física"}
                        </span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[0.8125rem] text-ink-2">
                    {client.data?.email || (
                      <span className="text-ink-3">Sin correo</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular text-[0.8125rem] text-ink-2">
                    {isCompany(client)
                      ? client.data?.rnc
                        ? `RNC ${client.data.rnc}`
                        : "—"
                      : client.data?.identification || "—"}
                  </TableCell>
                  <TableCell className="tabular text-[0.8125rem] text-ink-2">
                    {client.data?.phone || (
                      <span className="text-ink-3">Sin teléfono</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        client.data?.status === "active" ? "success" : "warning"
                      }
                      dot
                    >
                      {client.data?.status === "active"
                        ? "Activo"
                        : "Pendiente"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
