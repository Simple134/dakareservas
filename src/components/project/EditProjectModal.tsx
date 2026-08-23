"use client";

import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/src/components/ui/modal";
import { Button } from "@/src/components/ui/button";
import { useState, useEffect } from "react";
import { Beneficiary } from "@/src/types/erp";
import AddBeneficiaryModal from "@/src/components/AddBeneficiaryModal";

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete?: () => void;
  divisionId: number;
  currentData: {
    name: string;
    client: string;
    location: string;
    status: string;
    projectType?: string;
    permissionCategory?: string;
    totalBudget: number;
    startDate: string;
    endDate: string;
    description?: string;
  };
  metadata?: Record<string, unknown>;
}

export function EditProjectModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  divisionId,
  currentData,
  metadata,
}: EditProjectModalProps) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Beneficiary[]>([]);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  // Form fields
  const [projectName, setProjectName] = useState(currentData.name);
  const [client, setClient] = useState(currentData.client);
  const [location, setLocation] = useState(currentData.location);
  const [status, setStatus] = useState(currentData.status);
  const [projectType, setProjectType] = useState(
    currentData.projectType || "Residencial",
  );
  const [permissionCategory, setPermissionCategory] = useState(
    currentData.permissionCategory || "Mayor",
  );
  const [totalBudget, setTotalBudget] = useState(
    currentData.totalBudget
      ? currentData.totalBudget.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
      : "",
  );
  const [startDate, setStartDate] = useState(
    currentData.startDate ? currentData.startDate.substring(0, 10) : "",
  );
  const [endDate, setEndDate] = useState(
    currentData.endDate ? currentData.endDate.substring(0, 10) : "",
  );
  const [description, setDescription] = useState(currentData.description || "");

  const fetchClients = async () => {
    try {
      const response = await fetch(
        "/api/erp/beneficiaries?withContacts=true&withTaxData=false",
      );
      if (response.ok) {
        const data = await response.json();
        setClients(Array.isArray(data) ? data : data.items || []);
      }
    } catch (err) {
      console.error("Error loading clients:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      // Reset form with current data when modal opens
      setProjectName(currentData.name);
      setClient(currentData.client);
      setLocation(currentData.location);
      setStatus(currentData.status);
      setProjectType(currentData.projectType || "Residencial");
      setPermissionCategory(currentData.permissionCategory || "Mayor");
      setTotalBudget(
        currentData.totalBudget
          ? currentData.totalBudget
              .toString()
              .replace(/\B(?=(\d{3})+(?!\d))/g, ",")
          : "",
      );
      setStartDate(
        currentData.startDate ? currentData.startDate.substring(0, 10) : "",
      );
      setEndDate(
        currentData.endDate ? currentData.endDate.substring(0, 10) : "",
      );
      setDescription(currentData.description || "");
      setError(null);
      setConfirmDelete(false);
    }
  }, [isOpen, currentData]);

  const handleSave = async () => {
    if (!projectName) {
      setError("El nombre del proyecto es obligatorio");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const budgetNumber = parseFloat(totalBudget.replace(/,/g, "")) || 0;

      const response = await fetch("/api/erp/divisions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: divisionId,
          name: projectName,
          type: "PROJECT",
          metadata: {
            ...metadata,
            client,
            location,
            status,
            projectType,
            permissionCategory,
            budget: budgetNumber,
            startDate,
            endDate,
            description,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Error al actualizar el proyecto");
      }

      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      // Antes: PATCH con `metadata: { disabled: true }`, que sustituía la
      // metadata entera y borraba presupuesto, cliente y partidas.
      const response = await fetch(`/api/erp/divisions/${divisionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const detalle = await response.json().catch(() => null);
        throw new Error(
          detalle?.details || detalle?.error || "Error al eliminar el proyecto",
        );
      }

      onClose();
      onDelete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (!isOpen) return null;

  // Map status values between internal and display
  const getStatusValue = (s: string) => {
    switch (s) {
      case "planning":
        return "Planificación";
      case "execution":
        return "Ejecución";
      case "completed":
        return "Completado";
      default:
        return s;
    }
  };

  const statusDisplay = getStatusValue(status);

  return (
    <>
      <Modal
        open={isOpen}
        onClose={onClose}
        size="lg"
        busy={saving || deleting}
        title="Editar proyecto"
        description="Los cambios afectan a la ficha, al presupuesto y a los selectores de factura."
        footer={
          <>
            {/* La destructiva a la izquierda y en tenue: sólida sólo cuando
                ya está pidiendo confirmación. */}
            <Button
              variant={confirmDelete ? "destructiveSolid" : "destructive"}
              onClick={handleDelete}
              disabled={saving || deleting}
              loading={deleting}
              className="sm:mr-auto"
            >
              {!deleting && !confirmDelete && (
                <Trash2 className="mr-1.5 h-4 w-4" strokeWidth={1.75} />
              )}
              {deleting
                ? "Eliminando…"
                : confirmDelete
                  ? "Confirmar: eliminar proyecto"
                  : "Eliminar proyecto"}
            </Button>
            {error && (
              <p role="alert" className="text-[0.75rem] text-danger">
                {error}
              </p>
            )}
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !projectName}
              loading={saving}
            >
              Guardar cambios
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Información del Proyecto */}
          <div>
            <h3 className="text-sm font-semibold text-ink-3 uppercase tracking-wider mb-4">
              Información del Proyecto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-ink mb-1">
                  Nombre del Proyecto *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Casa Familiar Los Jardines"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-ink">
                    Cliente
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsClientModalOpen(true)}
                    className="text-xs text-info hover:text-info font-medium flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    Nuevo
                  </button>
                </div>
                <select
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                >
                  <option value="">Seleccione un cliente</option>
                  {/* Include current client value if not in list */}
                  {client && !clients.some((c) => c.name === client) && (
                    <option value={client}>{client}</option>
                  )}
                  {clients.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Ubicación
                </label>
                <input
                  type="text"
                  placeholder="Santiago, República Dominicana"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Estado
                </label>
                <select
                  value={statusDisplay}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                >
                  <option value="Planificación">Planificación</option>
                  <option value="Ejecución">Ejecución</option>
                  <option value="Completado">Completado</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Tipo de Proyecto
                </label>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                >
                  <option value="Residencial">Residencial</option>
                  <option value="Comercial">Comercial</option>
                  <option value="Industrial">Industrial</option>
                  <option value="Infraestructura">Infraestructura</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Categoría de Permisología
                </label>
                <select
                  value={permissionCategory}
                  onChange={(e) => setPermissionCategory(e.target.value)}
                  className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                >
                  <option value="Mayor">Mayor</option>
                  <option value="Menor">Menor</option>
                  <option value="Especial">Especial</option>
                </select>
              </div>
            </div>
          </div>

          {/* Presupuesto y Cronograma */}
          <div>
            <h3 className="text-sm font-semibold text-ink-3 uppercase tracking-wider mb-4">
              Presupuesto y Cronograma
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Presupuesto Total (RD$)
                </label>
                <input
                  type="text"
                  placeholder="2,500,000"
                  value={totalBudget}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^\d.]/g, "");
                    const parts = val.split(".");
                    if (parts.length > 2)
                      val = parts[0] + "." + parts.slice(1).join("");
                    if (val) {
                      const fparts = val.split(".");
                      fparts[0] = fparts[0].replace(
                        /\B(?=(\d{3})+(?!\d))/g,
                        ",",
                      );
                      val = fparts.join(".");
                    }
                    setTotalBudget(val);
                  }}
                  className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Fecha de Inicio
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">
                  Fecha de Finalización
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                />
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <h3 className="text-sm font-semibold text-ink-3 uppercase tracking-wider mb-4">
              Descripción
            </h3>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción detallada del proyecto, alcance, especificaciones técnicas..."
              rows={4}
              className="min-h-20 w-full rounded-[8px] border border-rule-strong bg-paper px-3 py-2 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Add beneficiary sub-modal */}
      {isClientModalOpen && (
        <AddBeneficiaryModal
          isOpen={isClientModalOpen}
          onClose={() => setIsClientModalOpen(false)}
          onSuccess={fetchClients}
        />
      )}
    </>
  );
}
