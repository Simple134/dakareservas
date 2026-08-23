"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Globe,
  Trash2,
  CreditCard,
  Users,
  Filter,
  X,
  Plus,
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { Beneficiary } from "@/src/types/erp";
import AddBeneficiaryModal from "@/src/components/AddBeneficiaryModal";
import { PageHeader, PageBody } from "@/src/components/ui/page-header";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { FilterChip, FilterGroup } from "@/src/components/ui/filter-chip";
import { SearchInput } from "@/src/components/ui/search-input";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";
import { EmptyState } from "@/src/components/ui/empty-state";
import { KPICard } from "@/src/components/dashboard/KPICard";
import { count as fmtCount } from "@/src/lib/format";

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

/* Ocho colores planos (esmeralda, azul, morado, naranja, rojo, ámbar, cian,
 * gris) en una misma rejilla de tarjetas era un arcoíris sin jerarquía: nada
 * destacaba porque todo destacaba. El rol de un contacto no es un estado de
 * dato con semántica de alerta, así que la mayoría va en neutro y sólo se
 * distinguen los dos ejes que el usuario filtra de verdad: quién nos compra
 * (cliente) y a quién le compramos (proveedor). */
const TYPE_VARIANT: Record<string, "default" | "success" | "info" | "outline"> =
  {
    CLIENT: "success",
    PROVIDER: "info",
    EMPLOYEE: "default",
    SELLER: "default",
    GOVERNMENT: "outline",
    ORGANIZATION: "outline",
    BOTH: "default",
    OTHER: "default",
  };

const ContactsPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [contacts, setContacts] = useState<Beneficiary[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Beneficiary[]>([]);
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
  const [editBeneficiary, setEditBeneficiary] = useState<Beneficiary | null>(
    null,
  );

  const fetchErpBeneficiaries = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        withContacts: "true",
        withTaxData: "false",
      });
      const response = await fetch(
        `/api/erp/beneficiaries?${params.toString()}`,
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
    fetchErpBeneficiaries();
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
      const response = await fetch("/api/erp/archiveBeneficiaries", {
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
      fetchErpBeneficiaries();
    } catch (error) {
      console.error("❌ Error archiving contact:", error);
      alert("Error al eliminar el contacto. Por favor, intenta de nuevo.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleContactClick = (contact: Beneficiary) => {
    setEditBeneficiary(contact);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditBeneficiary(null);
  };

  const CONTACT_ICON: Record<string, typeof Phone> = {
    phone: Phone,
    email: Mail,
    address: MapPin,
    website: Globe,
  };

  const METHOD_LABEL: Record<string, string> = {
    PHONE: "Tel",
    EMAIL: "Email",
    ADDRESS: "Dir",
    WEBSITE: "Web",
  };

  return (
    <>
      <PageHeader
        title="Contactos"
        description="Clientes, proveedores, empleados y organizaciones con los que opera Daka."
        actions={
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" strokeWidth={2} />
            Crear contacto
          </Button>
        }
      />

      <PageBody className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KPICard
            loading={isLoading}
            kpi={{
              title: "Total de contactos",
              value: fmtCount(stats.total),
              icon: "Users",
              hint: "Registrados sin archivar",
            }}
          />
          <KPICard
            loading={isLoading}
            kpi={{
              title: "Personas",
              value: fmtCount(stats.clients),
              icon: "Users",
              hint: "Clientes, proveedores y empleados",
            }}
          />
          <KPICard
            loading={isLoading}
            kpi={{
              title: "Organizaciones",
              value: fmtCount(stats.organizations),
              icon: "Building2",
              hint: "Empresas y entidades de gobierno",
            }}
          />
        </div>

        {/* Filtros */}
        <section className="space-y-4 rounded-[12px] border border-rule bg-paper p-4">
          <SearchInput
            value={searchQuery}
            onValueChange={setSearchQuery}
            placeholder="Buscar por nombre, correo, teléfono o RNC…"
          />

          <FilterGroup label="Rol">
            {BENEFICIARY_TYPES.map(({ value, label }) => {
              const n =
                value === "all"
                  ? contacts.length
                  : contacts.filter((c) => c.type === value).length;
              if (value !== "all" && n === 0) return null;
              return (
                <FilterChip
                  key={value}
                  active={selectedType === value}
                  count={value === "all" ? undefined : n}
                  onClick={() => setSelectedType(value)}
                >
                  {label}
                </FilterChip>
              );
            })}
          </FilterGroup>

          {uniqueCategories.length > 0 && (
            <FilterGroup label="Categoría" icon={Briefcase}>
              <FilterChip
                active={selectedCategory === "all"}
                onClick={() => setSelectedCategory("all")}
              >
                Todas
              </FilterChip>
              {uniqueCategories.map((cat) => (
                <FilterChip
                  key={cat}
                  active={selectedCategory === cat}
                  count={
                    contacts.filter((c) =>
                      c.contacts?.some(
                        (ct) =>
                          ct.type === "categoria" && ct.data?.trim() === cat,
                      ),
                    ).length
                  }
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </FilterChip>
              ))}
            </FilterGroup>
          )}

          <FilterGroup label="Tiene" icon={Filter}>
            {CONTACT_TYPES.map(({ value, label, icon: Icon }) => {
              const n =
                value === "all"
                  ? contacts.length
                  : contacts.filter((c) =>
                      c.contacts?.some((ct) => ct.type === value),
                    ).length;
              if (value !== "all" && n === 0) return null;
              return (
                <FilterChip
                  key={value}
                  icon={Icon}
                  active={selectedContactType === value}
                  count={value === "all" ? undefined : n}
                  onClick={() => setSelectedContactType(value)}
                >
                  {label}
                </FilterChip>
              );
            })}
          </FilterGroup>

          {activeFilterCount > 0 && (
            <div className="flex items-center justify-between gap-3 border-t border-rule pt-3">
              <p className="text-[0.75rem] text-ink-2">
                <span className="tabular font-semibold text-ink">
                  {fmtCount(filteredContacts.length)}
                </span>{" "}
                resultado{filteredContacts.length !== 1 ? "s" : ""}
              </p>
              <Button variant="ghost" size="xs" onClick={clearFilters}>
                <X className="mr-1 h-3 w-3" />
                Limpiar filtros ({activeFilterCount})
              </Button>
            </div>
          )}
        </section>

        {/* Rejilla */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="rounded-[12px] border border-rule bg-paper p-4"
                aria-busy
              >
                <div className="h-4 w-2/3 animate-pulse rounded bg-paper-3" />
                <div className="mt-2 h-3 w-1/4 animate-pulse rounded bg-paper-3" />
                <div className="mt-4 space-y-2">
                  <div className="h-3 w-full animate-pulse rounded bg-paper-3" />
                  <div className="h-3 w-3/5 animate-pulse rounded bg-paper-3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredContacts.length === 0 ? (
          <EmptyState
            title="No se encontraron contactos"
            description={
              activeFilterCount > 0
                ? "Ningún contacto coincide con los filtros aplicados."
                : "Todavía no hay contactos registrados."
            }
            action={
              activeFilterCount > 0 ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : (
                <Button size="sm" onClick={() => setIsModalOpen(true)}>
                  <Plus className="mr-1.5 h-4 w-4" strokeWidth={2} />
                  Crear el primer contacto
                </Button>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredContacts.map((contact, index) => {
              const isOrganization =
                contact.type === "ORGANIZATION" ||
                contact.type === "GOVERNMENT";
              const categoria = contact.contacts
                ?.find((c) => c.type === "categoria")
                ?.data?.trim();

              const metodos = (contact.contacts ?? [])
                .filter((c) => c.type !== "categoria")
                .map((c) => ({
                  type: c.type.toUpperCase(),
                  value: c.data,
                  icon: CONTACT_ICON[c.type] ?? Briefcase,
                }));

              return (
                <div
                  key={contact.id || index}
                  className="group relative flex flex-col rounded-[12px] border border-rule bg-paper shadow-[0_1px_2px_rgba(7,35,75,0.04)] transition-colors duration-[120ms] hover:border-rule-strong"
                >
                  {/* La tarjeta entera abre la ficha; el botón de archivar vive
                      fuera de ese botón para no anidar controles. */}
                  <button
                    type="button"
                    onClick={() => handleContactClick(contact)}
                    className="flex flex-1 flex-col p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold"
                  >
                    <div className="flex items-start gap-2.5 pr-8">
                      <span
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-paper-3"
                        aria-hidden
                      >
                        {isOrganization ? (
                          <Building2
                            className="h-4 w-4 text-ink-2"
                            strokeWidth={1.75}
                          />
                        ) : (
                          <User
                            className="h-4 w-4 text-ink-2"
                            strokeWidth={1.75}
                          />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.875rem] font-semibold leading-tight text-ink">
                          {contact.name || "Sin nombre"}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <Badge
                            variant={TYPE_VARIANT[contact.type] ?? "default"}
                          >
                            {TYPE_LABELS[contact.type] ?? contact.type}
                          </Badge>
                          {categoria && (
                            <Badge variant="outline">{categoria}</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3.5 space-y-1.5">
                      {contact.taxId && (
                        <div className="flex items-center gap-2 text-[0.75rem] text-ink-2">
                          <CreditCard
                            className="h-3.5 w-3.5 shrink-0 text-ink-3"
                            strokeWidth={1.75}
                            aria-hidden
                          />
                          <span className="tabular">{contact.taxId}</span>
                        </div>
                      )}
                      {metodos.slice(0, 3).map((m, idx) => {
                        const Icon = m.icon;
                        const esDireccion = m.type === "ADDRESS";
                        return (
                          <div
                            key={idx}
                            className={cn(
                              "flex gap-2 text-[0.75rem] text-ink-2",
                              esDireccion ? "items-start" : "items-center",
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-3.5 w-3.5 shrink-0 text-ink-3",
                                esDireccion && "mt-0.5",
                              )}
                              strokeWidth={1.75}
                              aria-hidden
                            />
                            <span
                              className={
                                esDireccion ? "line-clamp-2" : "truncate"
                              }
                            >
                              {m.value}
                            </span>
                          </div>
                        );
                      })}
                      {metodos.length > 3 && (
                        <p className="pl-[1.375rem] text-[0.6875rem] text-ink-3">
                          +{metodos.length - 3} más
                        </p>
                      )}
                      {metodos.length === 0 && !contact.taxId && (
                        <p className="text-[0.75rem] text-ink-3">
                          Sin datos de contacto
                        </p>
                      )}
                    </div>

                    {metodos.length > 0 && (
                      <div className="mt-3.5 flex flex-wrap gap-1 border-t border-rule pt-3">
                        {Array.from(new Set(metodos.map((m) => m.type))).map(
                          (type) => (
                            <span
                              key={type}
                              className="rounded-[4px] bg-paper-2 px-1.5 py-0.5 text-[0.625rem] font-semibold uppercase tracking-[0.06em] text-ink-3"
                            >
                              {METHOD_LABEL[type] ?? type}
                            </span>
                          ),
                        )}
                      </div>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteClick(contact.id, contact.name)}
                    title={`Archivar ${contact.name}`}
                    aria-label={`Archivar ${contact.name}`}
                    className="absolute right-2.5 top-3 rounded-[6px] p-1.5 text-ink-3 opacity-0 transition-[color,opacity] duration-[120ms] hover:bg-danger-soft hover:text-danger focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </PageBody>

      <AddBeneficiaryModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={fetchErpBeneficiaries}
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
                    "string" | "json" | "image" | "date" | undefined,
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

      <ConfirmDialog
        open={deleteModalState.isOpen}
        title="Archivar contacto"
        description={
          <>
            <span className="font-semibold text-ink">
              {deleteModalState.beneficiaryName}
            </span>{" "}
            dejará de aparecer en la lista y en los selectores de factura. Sus
            documentos anteriores no se tocan.
          </>
        }
        confirmLabel="Archivar"
        pendingLabel="Archivando…"
        pending={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() =>
          setDeleteModalState({
            isOpen: false,
            beneficiaryId: null,
            beneficiaryName: null,
          })
        }
      />
    </>
  );
};

export default ContactsPage;
