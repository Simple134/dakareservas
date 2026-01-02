"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase/client";
import {
  Search,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  X,
} from "lucide-react";
import FisicaForm from "@/src/components/FisicaForm";
import JuridicaForm from "@/src/components/JuridicaForm";

interface Contact {
  id: string;
  type: "fisica" | "juridica";
  name: string;
  email: string | null;
  phone: string | null;
  address: string;
  status: string;
  identification?: string | null;
  rnc?: string | null;
  occupation?: string | null;
  companyType?: string | null;
}

const ContactsPage = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"todos" | "fisica" | "juridica">(
    "todos",
  );
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formType, setFormType] = useState<"fisica" | "juridica" | null>(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    filterContacts();
  }, [searchQuery, activeTab, contacts]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const { data: fisicaData, error: fisicaError } = await supabase
        .from("persona_fisica")
        .select("*")
        .order("created_at", { ascending: false });
      const { data: juridicaData, error: juridicaError } = await supabase
        .from("persona_juridica")
        .select("*")
        .order("created_at", { ascending: false });
      if (fisicaError) console.error("Error fetching fisica:", fisicaError);
      if (juridicaError)
        console.error("Error fetching juridica:", juridicaError);
      const allContacts: Contact[] = [];

      if (fisicaData) {
        fisicaData.forEach((persona) => {
          const address = [
            persona.address_street,
            persona.address_sector,
            persona.address_municipality,
          ]
            .filter(Boolean)
            .join(", ");

          allContacts.push({
            id: persona.id,
            type: "fisica",
            name:
              `${persona.first_name || ""} ${persona.last_name || ""}`.trim() ||
              "Sin nombre",
            email: persona.email,
            phone: persona.phone,
            address: address || "Sin dirección",
            status: persona.status || "pending",
            identification: persona.identification,
            occupation: persona.occupation,
          });
        });
      }
      if (juridicaData) {
        juridicaData.forEach((persona) => {
          const address = [
            persona.company_address_street,
            persona.company_address_sector,
            persona.company_address_municipality,
          ]
            .filter(Boolean)
            .join(", ");

          allContacts.push({
            id: persona.id,
            type: "juridica",
            name: persona.company_name || "Sin nombre",
            email: persona.email,
            phone: persona.phone,
            address: address || "Sin dirección",
            status: persona.status || "pending",
            rnc: persona.rnc,
            companyType: persona.company_type,
          });
        });
      }

      setContacts(allContacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterContacts = () => {
    let filtered = [...contacts];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (contact) =>
          contact.name.toLowerCase().includes(query) ||
          contact.email?.toLowerCase().includes(query) ||
          contact.phone?.toLowerCase().includes(query),
      );
    }

    if (activeTab !== "todos") {
      filtered = filtered.filter((contact) => contact.type === activeTab);
    }

    setFilteredContacts(filtered);
  };

  const getStats = () => {
    const total = contacts.length;
    const fisica = contacts.filter((c) => c.type === "fisica").length;
    const juridica = contacts.filter((c) => c.type === "juridica").length;

    return { total, fisica, juridica };
  };

  const stats = getStats();

  const getTabCount = (tab: string) => {
    if (tab === "todos") return contacts.length;
    return contacts.filter((c) => c.type === tab).length;
  };

  const handleNewContact = () => {
    setShowModal(true);
    setFormType(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormType(null);
  };

  const handleFormSuccess = () => {
    handleCloseModal();
    fetchContacts();
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
              onClick={handleNewContact}
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
                  <p className="text-3xl font-bold text-[#131E29]">
                    {stats.total}
                  </p>
                </div>
                <div className="w-12 h-12 bg-[#4F80FF]/10 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-[#4F80FF]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Persona Física</p>
                  <p className="text-3xl font-bold text-[#131E29]">
                    {stats.fisica}
                  </p>
                </div>
                <div className="w-12 h-12 bg-[#4F80FF]/10 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-[#4F80FF]" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Persona Jurídica</p>
                  <p className="text-3xl font-bold text-[#131E29]">
                    {stats.juridica}
                  </p>
                </div>
                <div className="w-12 h-12 bg-[#A855F7]/10 rounded-full flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-[#A855F7]" />
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

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm mb-6 border border-gray-200">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveTab("todos")}
                className={`px-6 py-3.5 font-medium transition-colors relative ${
                  activeTab === "todos"
                    ? "text-[#07234B] border-b-2 border-[#07234B]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Todos ({getTabCount("todos")})
              </button>
              <button
                onClick={() => setActiveTab("fisica")}
                className={`px-6 py-3.5 font-medium transition-colors relative ${
                  activeTab === "fisica"
                    ? "text-[#07234B] border-b-2 border-[#07234B]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Persona Física ({getTabCount("fisica")})
              </button>
              <button
                onClick={() => setActiveTab("juridica")}
                className={`px-6 py-3.5 font-medium transition-colors relative ${
                  activeTab === "juridica"
                    ? "text-[#07234B] border-b-2 border-[#07234B]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Persona Jurídica ({getTabCount("juridica")})
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#07234B]"></div>
              <p className="mt-4 text-gray-600">Cargando contactos...</p>
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
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="bg-white rounded-xl shadow-sm p-5 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-lg flex items-center justify-center ${
                          contact.type === "juridica"
                            ? "bg-[#A855F7]/10"
                            : "bg-[#4F80FF]/10"
                        }`}
                      >
                        {contact.type === "juridica" ? (
                          <Building2 className="w-5 h-5 text-[#A855F7]" />
                        ) : (
                          <User className="w-5 h-5 text-[#4F80FF]" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-[#131E29] text-base leading-tight">
                          {contact.name}
                        </p>
                        <span
                          className={`text-xs text-gray-500 mt-0.5 block ${contact.type === "juridica" ? "bg-[#A855F7]/10 text-purple-500 w-fit p-1 rounded-full" : "bg-green-500/10 text-green-500 w-fit p-1 rounded-full"}`}
                        >
                          {contact.type === "juridica"
                            ? "Empresas"
                            : "Persona Física"}
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-[#22C55E]/10 text-[#22C55E] text-xs font-medium rounded-full">
                      Activo
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                    {contact.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{contact.email}</span>
                      </div>
                    )}
                    {contact.type === "juridica" && contact.rnc && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>RNC: {contact.rnc}</span>
                      </div>
                    )}
                    {contact.type === "fisica" && contact.identification && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span>Cédula: {contact.identification}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{contact.address}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <h2 className="text-xl font-bold text-[#131E29]">
                {formType
                  ? formType === "fisica"
                    ? "Nuevo Contacto - Persona Física"
                    : "Nuevo Contacto - Persona Jurídica"
                  : "Selecciona el Tipo de Contacto"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {!formType ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setFormType("fisica")}
                    className="p-8 border-2 border-gray-200 rounded-xl hover:border-[#4F80FF] hover:bg-[#4F80FF]/5 transition-all group"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-[#4F80FF]/10 rounded-full flex items-center justify-center group-hover:bg-[#4F80FF]/20 transition-colors">
                        <User className="w-8 h-8 text-[#4F80FF]" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-lg font-bold text-[#131E29] mb-2">
                          Persona Física
                        </h3>
                        <p className="text-sm text-gray-500">
                          Cliente individual con cédula
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setFormType("juridica")}
                    className="p-8 border-2 border-gray-200 rounded-xl hover:border-[#A855F7] hover:bg-[#A855F7]/5 transition-all group"
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-[#A855F7]/10 rounded-full flex items-center justify-center group-hover:bg-[#A855F7]/20 transition-colors">
                        <Building2 className="w-8 h-8 text-[#A855F7]" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-lg font-bold text-[#131E29] mb-2">
                          Persona Jurídica
                        </h3>
                        <p className="text-sm text-gray-500">Empresa con RNC</p>
                      </div>
                    </div>
                  </button>
                </div>
              ) : formType === "fisica" ? (
                <FisicaForm onSuccess={handleFormSuccess} />
              ) : (
                <JuridicaForm onSuccess={handleFormSuccess} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsPage;
