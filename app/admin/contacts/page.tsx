"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  X,
  Globe,
  Loader2,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { GestionoBeneficiary } from "@/src/types/gestiono";
import AddBeneficiaryModal from "@/src/components/AddBeneficiaryModal";

const ContactsPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [contacts, setContacts] = useState<GestionoBeneficiary[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<
    GestionoBeneficiary[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    beneficiaryId: number | null;
    beneficiaryName: string | null;
  }>({
    isOpen: false,
    beneficiaryId: null,
    beneficiaryName: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchGestionoBeneficiaries = async () => {
    setIsLoading(true);
    try {
      console.log("🔄 Obteniendo beneficiarios de Gestiono...");
      const params = new URLSearchParams({
        withContacts: "true",
        withTaxData: "false",
      });

      const response = await fetch(
        `/api/gestiono/beneficiaries?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      console.log("✅ Beneficiarios de Gestiono:", data);
      setContacts(data || []);
    } catch (error) {
      console.error("❌ Error obteniendo beneficiarios:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGestionoBeneficiaries();
  }, []);

  useEffect(() => {
    filterContacts();
  }, [searchQuery, contacts]);

  const filterContacts = () => {
    let filtered = [...contacts];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (contact) =>
          contact.name.toLowerCase().includes(query) ||
          contact.contacts
            ?.find((c) => c.type === "phone" || c.type === "email")
            ?.data?.toLowerCase()
            .includes(query) ||
          (contact.taxId && contact.taxId.includes(query)),
      );
    }

    setFilteredContacts(filtered);
  };

  const getStats = () => {
    const total = contacts.length;
    const clients = contacts.filter(
      (c) => c.type === "CLIENT" || c.type === "BOTH",
    ).length;
    const providers = contacts.filter(
      (c) => c.type === "PROVIDER" || c.type === "BOTH",
    ).length;

    return { total, clients, providers };
  };

  const stats = getStats();

  const handleDeleteClick = (
    beneficiaryId: number,
    beneficiaryName: string,
  ) => {
    setDeleteModalState({
      isOpen: true,
      beneficiaryId,
      beneficiaryName,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalState.beneficiaryId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/gestiono/beneficiaries?beneficiaryId=${deleteModalState.beneficiaryId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Error al archivar el contacto");
      }

      // Cerrar modal y refrescar lista
      setDeleteModalState({
        isOpen: false,
        beneficiaryId: null,
        beneficiaryName: null,
      });
      fetchGestionoBeneficiaries();
    } catch (error) {
      console.error("❌ Error archiving contact:", error);
      alert("Error al eliminar el contacto. Por favor, intenta de nuevo.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalState({
      isOpen: false,
      beneficiaryId: null,
      beneficiaryName: null,
    });
  };

  return (
    <div className="flex min-h-screen bg-white">
      <div className="flex-1">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#131E29] mb-1">
                Contactos
              </h1>
              <p className="text-sm text-gray-500">
                Gestiona clientes, proveedores, contratistas y más
              </p>
            </div>
            <button
              style={{ borderRadius: "10px" }}
              onClick={() => setIsModalOpen(true)}
              className="bg-[#07234B] text-white px-5 py-2.5 rounded-lg hover:bg-[#0a2d5c] transition-colors font-medium flex items-center gap-2"
            >
              <span className="text-lg">+</span>
              Nuevo Contacto
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total</p>
                  <div className="text-3xl font-bold text-[#131E29]">
                    {isLoading ? (
                      <div className="h-9 w-16 bg-gray-200 rounded animate-pulse" />
                    ) : (
                      stats.total
                    )}
                  </div>
                </div>
                <div className="w-12 h-12 bg-[#4F80FF]/10 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-[#4F80FF]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Clientes</p>
                  <div className="text-3xl font-bold text-[#131E29]">
                    {isLoading ? (
                      <div className="h-9 w-16 bg-gray-200 rounded animate-pulse" />
                    ) : (
                      stats.clients
                    )}
                  </div>
                </div>
                <div className="w-12 h-12 bg-[#10B981]/10 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-[#10B981]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Proveedores</p>
                  <div className="text-3xl font-bold text-[#131E29]">
                    {isLoading ? (
                      <div className="h-9 w-16 bg-gray-200 rounded animate-pulse" />
                    ) : (
                      stats.providers
                    )}
                  </div>
                </div>
                <div className="w-12 h-12 bg-[#F59E0B]/10 rounded-full flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-[#F59E0B]" />
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4F80FF] focus:border-transparent"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl shadow-sm p-5 border border-gray-200 animate-pulse"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-gray-200 rounded-lg" />
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-gray-200 rounded" />
                        <div className="h-3 w-20 bg-gray-200 rounded" />
                      </div>
                    </div>
                    <div className="h-6 w-16 bg-gray-200 rounded-full" />
                  </div>
                  <div className="space-y-2.5">
                    <div className="h-4 w-full bg-gray-200 rounded" />
                    <div className="h-4 w-3/4 bg-gray-200 rounded" />
                    <div className="h-4 w-1/2 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
              <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">
                No se encontraron contactos
              </p>
              <p className="text-gray-500 text-sm mt-2">
                {searchQuery
                  ? "Intenta con otra búsqueda"
                  : "Agrega tu primer contacto"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredContacts.map((contact, index) => {
                const isProvider = contact.type === "PROVIDER";

                // Collect distinct contact methods to display based on available data
                const contactMethods: {
                  type: string;
                  value: string;
                  icon: any;
                }[] = [];

                if (contact.contacts) {
                  contact.contacts.forEach((c) => {
                    let Icon = Briefcase;
                    // Map API lowercase types to Icons
                    if (c.type === "phone") Icon = Phone;
                    else if (c.type === "email") Icon = Mail;
                    else if (c.type === "address") Icon = MapPin;
                    else if (c.type === "website") Icon = Globe;

                    contactMethods.push({
                      type: c.type.toUpperCase(),
                      value: c.data,
                      icon: Icon,
                    });
                  });
                }

                return (
                  <div
                    key={contact.id || index}
                    className="bg-white rounded-xl shadow-sm p-5 border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-lg flex items-center justify-center ${
                            isProvider ? "bg-[#F59E0B]/10" : "bg-[#10B981]/10"
                          }`}
                        >
                          {isProvider ? (
                            <Building2 className="w-5 h-5 text-[#F59E0B]" />
                          ) : (
                            <User className="w-5 h-5 text-[#10B981]" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-[#131E29] text-base leading-tight">
                            {contact.name || "Sin Nombre"}
                          </p>
                          <span
                            className={`text-xs text-gray-500 mt-0.5 block ${isProvider ? "bg-[#F59E0B]/10 text-[#F59E0B] w-fit p-1 rounded-full" : "bg-[#10B981]/10 text-[#10B981] w-fit p-1 rounded-full"}`}
                          >
                            {contact.type === "CLIENT"
                              ? "Cliente"
                              : contact.type === "PROVIDER"
                                ? "Proveedor"
                                : contact.type === "EMPLOYEE"
                                  ? "Empleado"
                                  : contact.type}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 bg-[#22C55E]/10 text-[#22C55E] text-xs font-medium rounded-full">
                          Activo
                        </span>
                        <button
                          onClick={() =>
                            handleDeleteClick(contact.id, contact.name)
                          }
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar contacto"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {contact.reference && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-xs bg-gray-100 px-2 py-0.5 rounded">
                            Ref: {contact.reference}
                          </span>
                        </div>
                      )}

                      {contact.taxId && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span>ID: {contact.taxId}</span>
                        </div>
                      )}

                      {contactMethods.map((method, idx) => {
                        const Icon = method.icon;
                        const isAddress = method.type === "ADDRESS";
                        return (
                          <div
                            key={idx}
                            className={`flex ${isAddress ? "items-start" : "items-center"} gap-2 text-sm text-gray-600`}
                          >
                            <Icon
                              className={`w-4 h-4 text-gray-400 flex-shrink-0 ${isAddress ? "mt-0.5" : ""}`}
                            />
                            <span
                              className={
                                isAddress ? "line-clamp-2" : "truncate"
                              }
                            >
                              {method.value}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <AddBeneficiaryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={fetchGestionoBeneficiaries}
        />

        {/* Delete Confirmation Modal */}
        {deleteModalState.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold">Confirmar Eliminación</h3>
              </div>
              <p className="text-gray-600 mb-6">
                ¿Estás seguro que quieres eliminar el contacto{" "}
                <span className="font-semibold">
                  {deleteModalState.beneficiaryName}
                </span>
                ? Este contacto será archivado y no aparecerá en la lista.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleDeleteCancel}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? "Eliminando..." : "Eliminar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactsPage;
