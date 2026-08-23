import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2, Save } from "lucide-react";
import { Modal } from "@/src/components/ui/modal";
import { Button } from "@/src/components/ui/button";
import { CreateBeneficiaryBody } from "@/src/types/erp";

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
          `/api/erp/beneficiaries/contact/${contactId}`,
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
          `/api/erp/beneficiaries/${beneficiaryId}`,
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
            const res = await fetch("/api/erp/beneficiaries/contact", {
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
              const res = await fetch("/api/erp/beneficiaries/contact", {
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
        const response = await fetch("/api/erp/beneficiaries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            creditLimit: data.creditLimit
              ? Number(String(data.creditLimit).replace(/,/g, ""))
              : undefined,
            // La retención viaja en el alta. Antes se mandaba en un PATCH
            // posterior cuyo fallo sólo llegaba a `console.warn`: el alta se
            // daba por buena y el trabajador nacía con retención 0, que es
            // justo el filtro con el que la planilla de personal lo lista —
            // se creaba y no aparecía en ninguna parte.
            metadata: {
              isrTaxRetention: parseFloat(isrTaxRetentionVar || "0") / 100,
            },
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

  const FORM_ID = "contacto";

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="md"
      busy={isSubmitting}
      title={isEditMode ? "Editar contacto" : "Crear contacto"}
      description="Clientes, proveedores, empleados y organizaciones."
      footer={
        <>
          {error && (
            <p
              role="alert"
              className="mr-auto text-[0.75rem] text-danger sm:max-w-xs"
            >
              {error}
            </p>
          )}
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            <Save className="mr-1.5 h-4 w-4" strokeWidth={2} />
            {isEditMode ? "Guardar cambios" : "Crear contacto"}
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nombre */}
          <div className="space-y-2 md:col-span-2">
            <label className="eyebrow">
              Nombre Completo <span className="text-danger">*</span>
            </label>
            <input
              {...register("name", { required: "El nombre es obligatorio" })}
              className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3 transition-all"
              placeholder="Ej. Empresa SA o Juan Pérez"
            />
            {errors.name && (
              <span className="text-[0.75rem] text-danger">
                {errors.name.message}
              </span>
            )}
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <label className="eyebrow">Tipo</label>
            <select
              {...register("type", { required: true })}
              className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3 transition-all bg-paper"
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
            <label className="eyebrow">RNC / Cédula / Tax ID</label>
            <input
              {...register("taxId")}
              className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3 transition-all"
              placeholder="Identificación fiscal"
            />
          </div>

          {/* <div className="space-y-2">
              <label className="eyebrow">
                Referencia
              </label>
              <input
                {...register("reference")}
                className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3 transition-all"
                placeholder="Código interno o referencia"
              />
            </div>

            <div className="space-y-2">
              <label className="eyebrow">
                Límite de Crédito
              </label>
              <Controller
                control={control}
                name="creditLimit"
                render={({ field: { onChange, value, ...field } }) => (
                  <input
                    {...field}
                    type="text"
                    className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3 transition-all"
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
        <div className="border-t border-rule pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="eyebrow">Retención ISR (%)</label>
              <input
                type="text"
                value={isrTaxRetentionVar}
                onChange={(e) => setIsrTaxRetentionVar(e.target.value)}
                className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3 transition-all"
                placeholder="Ej. 10 para 10%"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-rule pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-ink">
              Información de Contacto
            </h3>
            <button
              type="button"
              onClick={() =>
                append({ type: "phone", data: "", dataType: "string" })
              }
              className="text-sm text-ink hover:text-ink font-medium flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Agregar
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-3">
                <select
                  {...register(`contact.${index}.type` as const)}
                  className="h-10 w-1/3 rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
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
                  className="h-10 flex-1 rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                  placeholder={getPlaceholder(
                    watchedContacts?.[index]?.type || "phone",
                  )}
                />
                <button
                  type="button"
                  onClick={() => deleteContact(index)}
                  className="p-2 text-danger hover:text-danger hover:bg-danger-soft rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
