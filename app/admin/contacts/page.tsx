"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Globe,
  Trash2,
  AlertCircle,
  CreditCard,
  Users,
  Filter,
  X,
} from "lucide-react";
import { GestionoBeneficiary } from "@/src/types/gestiono";
import AddBeneficiaryModal from "@/src/components/AddBeneficiaryModal";

const BENEFICIARY_TYPES = [
  { value: "all", label: "Todos" },
  { value: "CLIENT", label: "Cliente" },
  { value: "PROVIDER", label: "Proveedor" },
  { value: "EMPLOYEE", label: "Empleado" },
  { value: "SELLER", label: "Vendedor" },
  { value: "ORGANIZATION", label: "Organización" },
  { value: "GOVERNMENT", label: "Gobierno" },
  { value: "BOTH", label: "Ambos" },
  { value: "OTHER", label: "Otro" },
];

const CONTACT_TYPES = [
  { value: "all", label: "Todos", icon: Users },
  { value: "phone", label: "Teléfono", icon: Phone },
  { value: "email", label: "Email", icon: Mail },
  { value: "address", label: "Dirección", icon: MapPin },
  { value: "website", label: "Sitio web", icon: Globe },
];

const TYPE_LABELS: Record<string, string> = {
  CLIENT: "Cliente",
  PROVIDER: "Proveedor",
  EMPLOYEE: "Empleado",
  SELLER: "Vendedor",
  GOVERNMENT: "Gobierno",
  ORGANIZATION: "Organización",
  BOTH: "Ambos",
  OTHER: "Otro",
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  CLIENT: { bg: "bg-emerald-100", text: "text-emerald-700" },
  PROVIDER: { bg: "bg-blue-100", text: "text-blue-700" },
  EMPLOYEE: { bg: "bg-purple-100", text: "text-purple-700" },
  SELLER: { bg: "bg-orange-100", text: "text-orange-700" },
  GOVERNMENT: { bg: "bg-red-100", text: "text-red-700" },
  ORGANIZATION: { bg: "bg-amber-100", text: "text-amber-700" },
  BOTH: { bg: "bg-cyan-100", text: "text-cyan-700" },
  OTHER: { bg: "bg-gray-100", text: "text-gray-600" },
};

const ContactsPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [contacts, setContacts] = useState<GestionoBeneficiary[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<
    GestionoBeneficiary[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedContactType, setSelectedContactType] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    beneficiaryId: number | null;
    beneficiaryName: string | null;
  }>({ isOpen: false, beneficiaryId: null, beneficiaryName: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [editBeneficiary, setEditBeneficiary] =
    useState<GestionoBeneficiary | null>(null);

  const fetchGestionoBeneficiaries = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        withContacts: "true",
        withTaxData: "false",
      });
      const response = await fetch(
        `/api/gestiono/beneficiaries?${params.toString()}`,
      );
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
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

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    contacts.forEach((c) =>
      c.contacts
        ?.filter((ct) => ct.type === "categoria" && ct.data?.trim())
        .forEach((ct) => cats.add(ct.data.trim())),
    );
    return Array.from(cats).sort();
  }, [contacts]);

  useEffect(() => {
    let filtered = [...contacts];

    if (selectedType !== "all") {
      filtered = filtered.filter((c) => c.type === selectedType);
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((c) =>
        c.contacts?.some(
          (ct) =>
            ct.type === "categoria" && ct.data?.trim() === selectedCategory,
        ),
      );
    }

    if (selectedContactType !== "all") {
      filtered = filtered.filter((c) =>
        c.contacts?.some((contact) => contact.type === selectedContactType),
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.contacts?.some((contact) =>
            contact.data?.toLowerCase().includes(query),
          ) ||
          (c.taxId && c.taxId.includes(query)),
      );
    }

    setFilteredContacts(filtered);
  }, [
    searchQuery,
    selectedType,
    selectedCategory,
    selectedContactType,
    contacts,
  ]);

  const stats = {
    total: contacts.length,
    clients: contacts.filter(
      (c) => c.type !== "ORGANIZATION" && c.type !== "GOVERNMENT",
    ).length,
    organizations: contacts.filter(
      (c) => c.type === "ORGANIZATION" || c.type === "GOVERNMENT",
    ).length,
  };

  const activeFilterCount =
    (selectedType !== "all" ? 1 : 0) +
    (selectedCategory !== "all" ? 1 : 0) +
    (selectedContactType !== "all" ? 1 : 0) +
    (searchQuery ? 1 : 0);

  const clearFilters = () => {
    setSelectedType("all");
    setSelectedCategory("all");
    setSelectedContactType("all");
    setSearchQuery("");
  };

  const handleDeleteClick = (
    beneficiaryId: number,
    beneficiaryName: string,
  ) => {
    setDeleteModalState({ isOpen: true, beneficiaryId, beneficiaryName });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModalState.beneficiaryId) return;
    setIsDeleting(true);
    try {
      const response = await fetch("/api/gestiono/archiveBeneficiaries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteModalState.beneficiaryId }),
      });
      if (!response.ok) throw new Error("Error al archivar el contacto");
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

  const handleContactClick = (contact: GestionoBeneficiary) => {
    setEditBeneficiary(contact);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditBeneficiary(null);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="flex-1">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-[#131E29]">Contactos</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {isLoading
                  ? "Cargando..."
                  : `${stats.total} contactos registrados`}
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-[#07234B] text-white px-5 py-2.5 rounded-xl hover:bg-[#0a2d5c] transition-colors font-medium flex items-center gap-2 justify-center sm:w-auto shadow-sm"
            >
              <span className="text-lg leading-none">+</span>
              Nuevo Contacto
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                    Total
                  </p>
                  <div className="text-3xl font-bold text-[#131E29]">
                    {isLoading ? (
                      <div className="h-9 w-12 bg-gray-100 rounded animate-pulse" />
                    ) : (
                      stats.total
                    )}
                  </div>
                </div>
                <div className="w-11 h-11 bg-[#07234B]/8 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#07234B]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                    Clientes
                  </p>
                  <div className="text-3xl font-bold text-[#131E29]">
                    {isLoading ? (
                      <div className="h-9 w-12 bg-gray-100 rounded animate-pulse" />
                    ) : (
                      stats.clients
                    )}
                  </div>
                </div>
                <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                    Organizaciones
                  </p>
                  <div className="text-3xl font-bold text-[#131E29]">
                    {isLoading ? (
                      <div className="h-9 w-12 bg-gray-100 rounded animate-pulse" />
                    ) : (
                      stats.organizations
                    )}
                  </div>
                </div>
                <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, email, teléfono o RNC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#07234B]/20 focus:border-[#07234B] transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Beneficiary type filter */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                Rol
              </p>
              <div className="flex flex-wrap gap-1.5">
                {BENEFICIARY_TYPES.map(({ value, label }) => {
                  const count =
                    value === "all"
                      ? contacts.length
                      : contacts.filter((c) => c.type === value).length;
                  if (value !== "all" && count === 0) return null;
                  return (
                    <button
                      key={value}
                      onClick={() => setSelectedType(value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        selectedType === value
                          ? "bg-[#07234B] text-white shadow-sm"
                          : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
                      }`}
                    >
                      {label}
                      {value !== "all" && (
                        <span
                          className={`ml-1.5 ${selectedType === value ? "opacity-60" : "opacity-50"}`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category filter — derived dynamically from contact entries with type="categoria" */}
            {uniqueCategories.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Briefcase className="w-3 h-3" />
                  Categoría
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedCategory === "all"
                        ? "bg-[#07234B] text-white shadow-sm"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
                    }`}
                  >
                    Todas
                  </button>
                  {uniqueCategories.map((cat) => {
                    const count = contacts.filter((c) =>
                      c.contacts?.some(
                        (ct) =>
                          ct.type === "categoria" && ct.data?.trim() === cat,
                      ),
                    ).length;
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          selectedCategory === cat
                            ? "bg-[#07234B] text-white shadow-sm"
                            : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
                        }`}
                      >
                        {cat}
                        <span
                          className={`ml-1.5 ${selectedCategory === cat ? "opacity-60" : "opacity-50"}`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Contact method type filter */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Filter className="w-3 h-3" />
                Tiene
              </p>
              <div className="flex flex-wrap gap-1.5">
                {CONTACT_TYPES.map(({ value, label, icon: Icon }) => {
                  const count =
                    value === "all"
                      ? contacts.length
                      : contacts.filter((c) =>
                          c.contacts?.some((ct) => ct.type === value),
                        ).length;
                  if (value !== "all" && count === 0) return null;
                  return (
                    <button
                      key={value}
                      onClick={() => setSelectedContactType(value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                        selectedContactType === value
                          ? "bg-[#07234B] text-white shadow-sm"
                          : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                      {value !== "all" && (
                        <span
                          className={`${selectedContactType === value ? "opacity-60" : "opacity-50"}`}
                        >
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active filters bar */}
            {activeFilterCount > 0 && (
              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  <span className="font-semibold text-[#07234B]">
                    {filteredContacts.length}
                  </span>{" "}
                  resultado{filteredContacts.length !== 1 ? "s" : ""} encontrado
                  {filteredContacts.length !== 1 ? "s" : ""}
                </p>
                <button
                  onClick={clearFilters}
                  className="text-xs text-gray-500 hover:text-[#07234B] flex items-center gap-1 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Limpiar filtros ({activeFilterCount})
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-11 h-11 bg-gray-100 rounded-xl flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-gray-100 rounded" />
                      <div className="h-3 w-1/3 bg-gray-100 rounded" />
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <div className="h-3 w-full bg-gray-100 rounded" />
                    <div className="h-3 w-2/3 bg-gray-100 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-700 font-medium">
                No se encontraron contactos
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {activeFilterCount > 0
                  ? "Intenta con otra búsqueda o limpia los filtros"
                  : "Agrega tu primer contacto"}
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="mt-4 text-sm text-[#07234B] hover:underline font-medium"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContacts.map((contact, index) => {
                const isOrganization =
                  contact.type === "ORGANIZATION" ||
                  contact.type === "GOVERNMENT";
                const colors = TYPE_COLORS[contact.type] ?? TYPE_COLORS.OTHER;

                const categoria = contact.contacts
                  ?.find((c) => c.type === "categoria")
                  ?.data?.trim();

                const contactMethods: {
                  type: string;
                  value: string;
                  icon: typeof Phone;
                }[] = [];
                if (contact.contacts) {
                  contact.contacts.forEach((c) => {
                    if (c.type === "categoria") return; // shown separately
                    let Icon: typeof Phone = Briefcase as typeof Phone;
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
                    onClick={() => handleContactClick(contact)}
                    className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all cursor-pointer group"
                  >
                    {/* Card header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isOrganization ? "bg-amber-50" : "bg-emerald-50"
                          }`}
                        >
                          {isOrganization ? (
                            <Building2 className="w-5 h-5 text-amber-600" />
                          ) : (
                            <User className="w-5 h-5 text-emerald-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[#131E29] text-sm leading-tight truncate">
                            {contact.name || "Sin Nombre"}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span
                              className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md ${colors.bg} ${colors.text}`}
                            >
                              {TYPE_LABELS[contact.type] ?? contact.type}
                            </span>
                            {categoria && (
                              <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#07234B]/8 text-[#07234B]">
                                {categoria}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(contact.id, contact.name);
                          }}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Eliminar contacto"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </div>
                    </div>

                    {/* Contact details */}
                    <div className="space-y-2">
                      {contact.taxId && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <CreditCard className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                          <span className="font-mono">{contact.taxId}</span>
                        </div>
                      )}

                      {contactMethods.slice(0, 3).map((method, idx) => {
                        const Icon = method.icon;
                        const isAddress = method.type === "ADDRESS";
                        return (
                          <div
                            key={idx}
                            className={`flex ${isAddress ? "items-start" : "items-center"} gap-2 text-xs text-gray-600`}
                          >
                            <Icon
                              className={`w-3.5 h-3.5 text-gray-300 flex-shrink-0 ${isAddress ? "mt-0.5" : ""}`}
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

                      {contactMethods.length > 3 && (
                        <p className="text-[10px] text-gray-400 pl-5.5">
                          +{contactMethods.length - 3} más
                        </p>
                      )}
                    </div>

                    {/* Contact type pills at bottom */}
                    {contactMethods.length > 0 && (
                      <div className="flex gap-1 mt-3 pt-3 border-t border-gray-50 flex-wrap">
                        {Array.from(
                          new Set(contactMethods.map((m) => m.type)),
                        ).map((type) => (
                          <span
                            key={type}
                            className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-gray-50 text-gray-400 uppercase tracking-wide"
                          >
                            {type === "PHONE"
                              ? "Tel"
                              : type === "EMAIL"
                                ? "Email"
                                : type === "ADDRESS"
                                  ? "Dir"
                                  : type === "WEBSITE"
                                    ? "Web"
                                    : type}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <AddBeneficiaryModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSuccess={fetchGestionoBeneficiaries}
          beneficiaryData={
            editBeneficiary
              ? {
                  name: editBeneficiary.name,
                  type: editBeneficiary.type,
                  contact: editBeneficiary.contacts?.map((c) => ({
                    id: c.id,
                    type: c.type,
                    data: c.data,
                    dataType: c.dataType as
                      | "string"
                      | "json"
                      | "image"
                      | "date"
                      | undefined,
                    beneficiaryId: c.beneficiaryId,
                  })) || [{ type: "phone", data: "", dataType: "string" }],
                  taxId: editBeneficiary.taxId || undefined,
                  reference: editBeneficiary.reference || undefined,
                  creditLimit: editBeneficiary.creditLimit || undefined,
                }
              : undefined
          }
          beneficiaryId={editBeneficiary?.id}
          isrTaxRetention={
            editBeneficiary?.metadata?.isrTaxRetention
              ? String(editBeneficiary.metadata.isrTaxRetention)
              : "0"
          }
        />

        {/* Delete Confirmation Modal */}
        {deleteModalState.isOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-base font-semibold text-[#131E29]">
                  Confirmar eliminación
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-6">
                ¿Seguro que quieres archivar a{" "}
                <span className="font-semibold text-[#131E29]">
                  {deleteModalState.beneficiaryName}
                </span>
                ? No aparecerá más en la lista.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() =>
                    setDeleteModalState({
                      isOpen: false,
                      beneficiaryId: null,
                      beneficiaryName: null,
                    })
                  }
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm bg-red-500 text-white hover:bg-red-600 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isDeleting ? "Archivando..." : "Archivar"}
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
