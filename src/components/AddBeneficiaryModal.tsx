import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { X, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { CreateBeneficiaryBody } from "@/src/types/gestiono";

interface AddBeneficiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  beneficiaryData?: CreateBeneficiaryBody & { id?: number };
  beneficiaryId?: number;
  isrTaxRetention?: string;
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
  { value: "banco", label: "Banco" },
  { value: "numero_cuenta", label: "Número de cuenta" },
  { value: "tipo_cuenta", label: "Tipo de cuenta" },
  { value: "categoria", label: "Categoría" },
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
    case "banco":
      return "Ej. Banco Popular";
    case "numero_cuenta":
      return "Ej. 123456789";
    case "tipo_cuenta":
      return "Ej. Corriente / Ahorro";
    case "categoria":
      return "Ej. Tecnología / Servicios";
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
  isrTaxRetention,
}: AddBeneficiaryModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toDisplayPercent = (decimal: string | undefined) => {
    const num = parseFloat(decimal || "0");
    return isNaN(num) || num === 0 ? "0" : String(num * 100);
  };

  const [isrTaxRetentionVar, setIsrTaxRetentionVar] = useState<string>(
    toDisplayPercent(isrTaxRetention),
  );
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

  const { fields, append, remove } = useFieldArray({
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
    setIsrTaxRetentionVar(toDisplayPercent(isrTaxRetention));
  }, [beneficiaryData, reset, isrTaxRetention]);

  // Delete individual contact - immediate API call, removes from form
  const deleteContact = async (index: number) => {
    const contactId =
      watchedContacts?.[index]?.id ||
      fields[index]?.id ||
      beneficiaryData?.contact?.[index]?.id;

    if (contactId && beneficiaryId) {
      try {
        const response = await fetch(
          `/api/gestiono/beneficiaries/contact/${contactId}`,
          { method: "DELETE" },
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `Delete failed with status ${response.status}`,
          );
        }
        onSuccess?.();
      } catch (err) {
        console.error("❌ Error deleting contact:", err);
        setError(
          err instanceof Error ? err.message : "Error al eliminar el contacto",
        );
      }
    }

    remove(index);
  };

  const onSubmit = async (data: CreateBeneficiaryBody) => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditMode) {
        // 1. Update beneficiary fields
        const beneficiaryResponse = await fetch(
          `/api/gestiono/beneficiaries/${beneficiaryId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: beneficiaryId,
              name: data.name,
              type: data.type,
              taxId: data.taxId || undefined,
              reference: data.reference || undefined,
              creditLimit: data.creditLimit
                ? Number(String(data.creditLimit).replace(/,/g, ""))
                : undefined,
              metadata: {
                isrTaxRetention: parseFloat(isrTaxRetentionVar || "0") / 100,
              },
            }),
          },
        );

        if (!beneficiaryResponse.ok) {
          const errorData = await beneficiaryResponse.json().catch(() => null);
          throw new Error(
            errorData?.msg ||
              errorData?.message ||
              `Error al actualizar el beneficiario (${beneficiaryResponse.status})`,
          );
        }

        // 2. Only touch contacts that are new or actually changed
        const originalContacts = beneficiaryData?.contact || [];

        for (const contact of data.contact || []) {
          if (!contact.data) continue;

          if (!contact.id) {
            // New contact → POST
            const res = await fetch("/api/gestiono/beneficiaries/contact", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                beneficiaryId,
                type: contact.type || "phone",
                dataType: contact.dataType || "string",
                data: contact.data,
              }),
            });
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              throw new Error(err.error || "Error al crear contacto");
            }
          } else {
            // Existing contact → PATCH only if type or data changed
            const original = originalContacts.find((o) => o.id === contact.id);
            const hasChanged =
              !original ||
              original.data !== contact.data ||
              original.type !== contact.type;

            if (hasChanged) {
              const res = await fetch("/api/gestiono/beneficiaries/contact", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: contact.id,
                  beneficiaryId,
                  type: contact.type || "phone",
                  dataType: contact.dataType || "string",
                  data: contact.data,
                }),
              });
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Error al actualizar contacto");
              }
            }
          }
        }
      } else {
        // CREATE MODE: send everything in one request
        const response = await fetch("/api/gestiono/beneficiaries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            creditLimit: data.creditLimit
              ? Number(String(data.creditLimit).replace(/,/g, ""))
              : undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.msg ||
              errorData?.message ||
              `Error al crear el beneficiario (${response.status})`,
          );
        }

        // Set ISR retention for new beneficiary if needed
        if (isrTaxRetentionVar !== "0") {
          try {
            const responseData = await response.json().catch(() => null);
            const newId = responseData?.id || responseData?.beneficiaryId;
            if (newId) {
              await fetch(`/api/gestiono/beneficiaries/${newId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id: newId,
                  name: data.name,
                  type: data.type,
                  metadata: {
                    isrTaxRetention:
                      parseFloat(isrTaxRetentionVar || "0") / 100,
                  },
                }),
              });
            }
          } catch (retentionErr) {
            console.warn(
              "⚠️ Beneficiary created but failed to set ISR retention:",
              retentionErr,
            );
          }
        }
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

          {/* ISR Tax Retention */}
          <div className="border-t border-gray-100 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Retención ISR (%)
                </label>
                <input
                  type="text"
                  value={isrTaxRetentionVar}
                  onChange={(e) => setIsrTaxRetentionVar(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent outline-none transition-all"
                  placeholder="Ej. 10 para 10%"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Información de Contacto
              </h3>
              <button
                type="button"
                onClick={() =>
                  append({ type: "phone", data: "", dataType: "string" })
                }
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
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent outline-none text-sm"
                    placeholder={getPlaceholder(
                      watchedContacts?.[index]?.type || "phone",
                    )}
                  />
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
