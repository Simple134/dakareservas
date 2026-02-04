"use client";

import { useState, useEffect } from "react";
import { Users, Mail, Phone, Briefcase } from "lucide-react";
import { CustomCard } from "@/src/components/project/CustomCard";

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
        const res = await fetch(
          `/api/gestiono/appData?${queryParams.toString()}`,
        );
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

  return (
    <CustomCard className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Clientes</h3>
        </div>
        <div className="text-sm text-gray-600">
          Total: {clientsData.length} clientes
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por nombre, empresa, email o identificación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Filtered Results Counter */}
      {searchTerm && (
        <div className="mb-4 text-sm text-gray-600">
          Mostrando {getFilteredClients().length} de {clientsData.length}{" "}
          clientes
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12 text-gray-500">
          <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-3" />
          <p>Cargando clientes...</p>
        </div>
      )}

      {/* Clients Table */}
      {!isLoading && clientsData.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Identificación
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teléfono
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getFilteredClients().map((client) => (
                <tr
                  key={client.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div
                        className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                          isCompany(client) ? "bg-purple-100" : "bg-blue-100"
                        }`}
                      >
                        {isCompany(client) ? (
                          <Briefcase className="w-5 h-5 text-purple-600" />
                        ) : (
                          <Users className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {getClientName(client)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {isCompany(client) ? "Empresa" : "Individual"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500">
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      {client.data?.email || "Sin email"}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {isCompany(client)
                        ? `RNC: ${client.data?.rnc || "N/A"}`
                        : client.data?.identification || "N/A"}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500">
                      <Phone className="w-4 h-4 mr-2 text-gray-400" />
                      {client.data?.phone || "Sin teléfono"}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        client.data?.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {client.data?.status === "active"
                        ? "Activo"
                        : "Pendiente"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && clientsData.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>No hay clientes registrados</p>
        </div>
      )}

      {/* No Results State */}
      {!isLoading &&
        clientsData.length > 0 &&
        getFilteredClients().length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No se encontraron clientes con ese criterio de búsqueda</p>
          </div>
        )}
    </CustomCard>
  );
}
