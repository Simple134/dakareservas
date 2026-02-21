"use client";

import { X, Loader2, Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { GestionoBeneficiary } from "@/src/types/gestiono";
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
  const [clients, setClients] = useState<GestionoBeneficiary[]>([]);
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
        "/api/gestiono/beneficiaries?withContacts=true&withTaxData=false",
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

      const response = await fetch("/api/gestiono/divisions", {
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
      const response = await fetch("/api/gestiono/divisions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: divisionId,
          metadata: { disabled: true },
        }),
      });

      if (!response.ok) {
        throw new Error("Error al eliminar el proyecto");
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
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4 animate-fade-in">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
            <h2 className="text-xl font-bold text-gray-900">Editar Proyecto</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Información del Proyecto */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Información del Proyecto
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Nombre del Proyecto *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Casa Familiar Los Jardines"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#131E29] focus:border-transparent"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-gray-900">
                      Cliente
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsClientModalOpen(true)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Nuevo
                    </button>
                  </div>
                  <select
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#131E29] focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Ubicación
                  </label>
                  <input
                    type="text"
                    placeholder="Santiago, República Dominicana"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#131E29] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Estado
                  </label>
                  <select
                    value={statusDisplay}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#131E29] focus:border-transparent"
                  >
                    <option value="Planificación">Planificación</option>
                    <option value="Ejecución">Ejecución</option>
                    <option value="Completado">Completado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Tipo de Proyecto
                  </label>
                  <select
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#131E29] focus:border-transparent"
                  >
                    <option value="Residencial">Residencial</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Industrial">Industrial</option>
                    <option value="Infraestructura">Infraestructura</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Categoría de Permisología
                  </label>
                  <select
                    value={permissionCategory}
                    onChange={(e) => setPermissionCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#131E29] focus:border-transparent"
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
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Presupuesto y Cronograma
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#131E29] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#131E29] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Fecha de Finalización
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#131E29] focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Descripción */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Descripción
              </h3>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción detallada del proyecto, alcance, especificaciones técnicas..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#131E29] focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center rounded-b-xl">
            <button
              onClick={handleDelete}
              disabled={saving || deleting}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 ${
                confirmDelete
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "text-red-600 hover:bg-red-50 border border-red-200"
              }`}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Eliminando...
                </>
              ) : confirmDelete ? (
                "¿Estás seguro?"
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </>
              )}
            </button>
            <div className="flex-1" />
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !projectName}
                style={{ borderRadius: "1rem" }}
                className="px-5 py-2 bg-[#131E29] text-white hover:bg-[#1a2b3c] transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Cambios"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

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
