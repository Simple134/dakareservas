import { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { X, Plus, Trash2, Save, Loader2, Check } from "lucide-react";
import { CreateBeneficiaryBody } from "@/src/types/gestiono";

interface AddBeneficiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  beneficiaryData?: CreateBeneficiaryBody & { id?: number };
  beneficiaryId?: number;
}

const BENEFICIARY_TYPES = [
  { value: "CLIENT", label: "Cliente" },
  { value: "PROVIDER", label: "Proveedor" },
  { value: "ORGANIZATION", label: "Organización" },
  { value: "EMPLOYEE", label: "Empleado" },
  { value: "SELLER", label: "Vendedor" },
  { value: "GOVERNMENT", label: "Gobierno" },
] as const;

const CONTACT_TYPES = [
  { value: "phone", label: "Teléfono" },
  { value: "email", label: "Email" },
  { value: "address", label: "Dirección" },
  { value: "website", label: "Sitio Web" },
];

// Helper to get placeholder based on type
const getPlaceholder = (type: string) => {
  switch (type) {
    case "email":
      return "contacto@empresa.com";
    case "address":
      return "Av. Winston Churchill #12";
    case "website":
      return "https://www.empresa.com";
    case "phone":
    default:
      return "809-555-5555";
  }
};

export default function AddBeneficiaryModal({
  isOpen,
  onClose,
  onSuccess,
  beneficiaryData,
  beneficiaryId,
}: AddBeneficiaryModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Set<number>>(new Set());
  const [savingContactId, setSavingContactId] = useState<number | null>(null);
  const isEditMode = !!beneficiaryId;

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateBeneficiaryBody>({
    defaultValues: beneficiaryData || {
      name: "",
      type: "CLIENT",
      contact: [{ type: "phone", data: "", dataType: "string" }],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "contact",
  });

  const watchedContacts = watch("contact");

  // Reset form when beneficiaryData changes (for edit mode)
  useEffect(() => {
    if (beneficiaryData) {
      reset(beneficiaryData);
    } else {
      reset({
        name: "",
        type: "CLIENT",
        contact: [{ type: "phone", data: "", dataType: "string" }],
      });
    }
    setPendingChanges(new Set());
  }, [beneficiaryData, reset]);

  // Refresh beneficiary data after successful contact operation
  const refreshBeneficiaryData = async () => {
    if (!beneficiaryId) return;

    try {
      const response = await fetch(
        `/api/gestiono/beneficiaries/${beneficiaryId}`,
      );
      if (!response.ok) throw new Error("Failed to fetch beneficiary");

      const freshData = await response.json();

      // Update the form with fresh data
      reset({
        name: freshData.name,
        type: freshData.type,
        contact: freshData.contacts?.map((c: any) => ({
          id: c.id,
          type: c.type,
          data: c.data,
          dataType: c.dataType,
          beneficiaryId: c.beneficiaryId,
        })) || [{ type: "phone", data: "", dataType: "string" }],
        taxId: freshData.taxId || undefined,
        reference: freshData.reference || undefined,
        creditLimit: freshData.creditLimit || undefined,
      });

      console.log("✅ Beneficiary data refreshed in modal");
    } catch (err) {
      console.error("❌ Error refreshing beneficiary data:", err);
    }
  };

  // Track changes to contacts
  const handleContactChange = (index: number) => {
    setPendingChanges((prev) => new Set(prev).add(index));
  };

  // Save individual contact changes
  const saveContactChanges = async (index: number) => {
    if (!beneficiaryId) {
      // If not in edit mode, mark as pending but don't save yet
      return;
    }

    setSavingContactId(index);
    setError(null);

    try {
      const contactData = watchedContacts?.[index];
      if (!contactData) return;

      const contactId = (beneficiaryData?.contact?.[index] as any)?.id;

      console.log("💾 SAVE DEBUG:", {
        index,
        contactId,
        beneficiaryId,
        contactData,
        operation: contactId ? "UPDATE" : "CREATE",
      });

      if (contactId) {
        // Update existing contact - must include beneficiaryId
        const response = await fetch("/api/gestiono/beneficiaries/contact", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: contactId,
            beneficiaryId, // Required by Gestiono API
            type: contactData.type,
            dataType: contactData.dataType || "string",
            data: contactData.data,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Error al actualizar contacto");
        }

        console.log("✅ Contact updated successfully");
      } else {
        // Create new contact
        const response = await fetch("/api/gestiono/beneficiaries/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            beneficiaryId,
            type: contactData.type,
            dataType: contactData.dataType || "string",
            data: contactData.data,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Error al crear contacto");
        }

        const result = await response.json();
        console.log("✅ Contact created successfully:", result);

        // Update the field with the new contact ID
        if (result.contactId) {
          update(index, { ...contactData, id: result.contactId } as any);
        }
      }

      // Remove from pending changes
      setPendingChanges((prev) => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });

      // Refresh the beneficiary data to show updated contacts
      await refreshBeneficiaryData();

      onSuccess?.();
    } catch (err: unknown) {
      console.error("❌ Error saving contact:", err);
      setError(
        err instanceof Error ? err.message : "Error al guardar el contacto",
      );
    } finally {
      setSavingContactId(null);
    }
  };

  // Delete individual contact
  const deleteContact = async (index: number) => {
    // Try to get contact ID from multiple sources
    const contactIdFromBeneficiary = (beneficiaryData?.contact?.[index] as any)
      ?.id;
    const contactIdFromField = (fields[index] as any)?.id;
    const contactIdFromWatched = (watchedContacts?.[index] as any)?.id;
    const contactId =
      contactIdFromWatched || contactIdFromField || contactIdFromBeneficiary;

    console.log("🗑️ DELETE DEBUG:", {
      index,
      contactId,
      contactIdFromBeneficiary,
      contactIdFromField,
      contactIdFromWatched,
      beneficiaryId,
      beneficiaryData: beneficiaryData?.contact?.[index],
      fieldData: fields[index],
      watchedData: watchedContacts?.[index],
      hasApiCall: !!(contactId && beneficiaryId),
    });

    if (contactId && beneficiaryId) {
      // Delete from API if it exists - use path parameter not query
      try {
        console.log(`🌐 Calling DELETE API for contact ${contactId}`);
        const response = await fetch(
          `/api/gestiono/beneficiaries/contact/${contactId}`,
          {
            method: "DELETE",
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `Delete failed with status ${response.status}`,
          );
        }

        console.log("✅ Contact deleted successfully from API");
        onSuccess?.();
      } catch (err) {
        console.error("❌ Error deleting contact:", err);
        setError(
          err instanceof Error ? err.message : "Error al eliminar el contacto",
        );
        // Don't return here - still remove from form even if API fails
      }
    } else {
      console.log(
        "ℹ️ No API call - contact only deleted locally (new contact or no ID)",
      );
    }

    // Remove from form
    remove(index);
    setPendingChanges((prev) => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });

    // Refresh beneficiary data if it was an API deletion
    if (contactId && beneficiaryId) {
      await refreshBeneficiaryData();
    }
  };

  const onSubmit = async (data: CreateBeneficiaryBody) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Separate contact data from beneficiary data
      const { contact, ...beneficiaryData } = data;

      const payload = isEditMode
        ? {
            // EDIT MODE: Only send beneficiary data, NO contact data
            // Contacts are managed separately via individual save buttons
            id: beneficiaryId,
            name: beneficiaryData.name,
            type: beneficiaryData.type,
            taxId: beneficiaryData.taxId || undefined,
            reference: beneficiaryData.reference || undefined,
            creditLimit: beneficiaryData.creditLimit
              ? Number(String(beneficiaryData.creditLimit).replace(/,/g, ""))
              : undefined,
          }
        : {
            // CREATE MODE: Send everything including contacts
            ...data,
            creditLimit: data.creditLimit
              ? Number(String(data.creditLimit).replace(/,/g, ""))
              : undefined,
          };

      const url = isEditMode
        ? `/api/gestiono/beneficiaries/${beneficiaryId}`
        : "/api/gestiono/beneficiaries";
      const method = isEditMode ? "PATCH" : "POST";

      console.log("🔍 DEBUG - Sending payload:", payload);
      console.log("🔍 DEBUG - Mode:", isEditMode ? "EDIT" : "CREATE");

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // Extract the actual error message from the API response
        const errorData = await response.json().catch(() => null);
        const errorMessage =
          errorData?.msg ||
          errorData?.message ||
          `Error al ${isEditMode ? "actualizar" : "crear"} el beneficiario (${response.status})`;
        throw new Error(errorMessage);
      }

      reset();
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Ocurrió un error desconocido",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-white border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditMode ? "Editar Contacto" : "Nuevo Contacto"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {error && (
            <div className="p-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-700">
                Nombre Completo <span className="text-red-500">*</span>
              </label>
              <input
                {...register("name", { required: "El nombre es obligatorio" })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent outline-none transition-all"
                placeholder="Ej. Empresa SA o Juan Pérez"
              />
              {errors.name && (
                <span className="text-xs text-red-500">
                  {errors.name.message}
                </span>
              )}
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Tipo</label>
              <select
                {...register("type", { required: true })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent outline-none transition-all bg-white"
              >
                {BENEFICIARY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tax ID */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                RNC / Cédula / Tax ID
              </label>
              <input
                {...register("taxId")}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent outline-none transition-all"
                placeholder="Identificación fiscal"
              />
            </div>

            {/* <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Referencia
              </label>
              <input
                {...register("reference")}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent outline-none transition-all"
                placeholder="Código interno o referencia"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Límite de Crédito
              </label>
              <Controller
                control={control}
                name="creditLimit"
                render={({ field: { onChange, value, ...field } }) => (
                  <input
                    {...field}
                    type="text"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent outline-none transition-all"
                    placeholder="0.00"
                    value={(value as unknown as string) || ""}
                    onChange={(e) => {
                      let val = e.target.value.replace(/[^\d.]/g, "");
                      const parts = val.split(".");
                      if (parts.length > 2)
                        val = parts[0] + "." + parts.slice(1).join("");
                      if (val) {
                        const parts = val.split(".");
                        parts[0] = parts[0].replace(
                          /\B(?=(\d{3})+(?!\d))/g,
                          ",",
                        );
                        val = parts.join(".");
                      }
                      onChange(val);
                    }}
                  />
                )}
              />
            </div> */}
          </div>

          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Información de Contacto
              </h3>
              <button
                type="button"
                onClick={() => {
                  const newIndex = fields.length;
                  append({ type: "phone", data: "", dataType: "string" });
                  setPendingChanges((prev) => new Set(prev).add(newIndex));
                }}
                className="text-sm text-[#07234B] hover:text-[#0a2d5c] font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Agregar
              </button>
            </div>

            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-3">
                  <select
                    {...register(`contact.${index}.type` as const)}
                    onChange={(e) => {
                      const event = e;
                      register(`contact.${index}.type` as const).onChange(
                        event,
                      );
                      handleContactChange(index);
                    }}
                    className="w-1/3 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent outline-none bg-white text-sm"
                  >
                    {CONTACT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <input
                    {...register(`contact.${index}.data` as const, {
                      required: "Este campo es requerido",
                    })}
                    onChange={(e) => {
                      const event = e;
                      register(`contact.${index}.data` as const).onChange(
                        event,
                      );
                      handleContactChange(index);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent outline-none text-sm"
                    placeholder={getPlaceholder(
                      watchedContacts?.[index]?.type || "phone",
                    )}
                  />
                  {/* Checkmark button - shows when there are pending changes */}
                  {pendingChanges.has(index) && isEditMode && (
                    <button
                      type="button"
                      onClick={() => saveContactChanges(index)}
                      disabled={savingContactId === index}
                      className="p-2 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Guardar cambios"
                    >
                      {savingContactId === index ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteContact(index)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#07234B] text-white rounded-lg hover:bg-[#0a2d5c] font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Guardar Contacto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
