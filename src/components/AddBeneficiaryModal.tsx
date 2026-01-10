import { useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { X, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { CreateBeneficiaryBody } from "@/src/types/gestiono";

interface AddBeneficiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
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
}: AddBeneficiaryModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateBeneficiaryBody>({
    defaultValues: {
      name: "",
      type: "CLIENT",
      contact: [{ type: "phone", data: "", dataType: "string" }],
      // metadata: { adquisitionChannel: "dashboard" }
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "contact",
  });

  const watchedContacts = watch("contact");

  const onSubmit = async (data: CreateBeneficiaryBody) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...data,
        creditLimit: data.creditLimit
          ? Number(String(data.creditLimit).replace(/,/g, ""))
          : undefined,
      };

      const response = await fetch("/api/gestiono/beneficiaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Error al crear el beneficiario");
      }

      reset();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "Ocurrió un error desconocido");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-white border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Nuevo Contacto</h2>
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

            {/* Referencia */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Referencia
              </label>
              <input
                {...register("reference")}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent outline-none transition-all"
                placeholder="Código interno o referencia"
              />
            </div>

            {/* Credit Limit */}
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
                    value={(value as any) || ""}
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
                    onClick={() => remove(index)}
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
