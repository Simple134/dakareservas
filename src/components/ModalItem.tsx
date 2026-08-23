"use client";

import { Modal } from "@/src/components/ui/modal";
import { Button } from "@/src/components/ui/button";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import type { CreateResourceBody, Beneficiary } from "@/src/types/erp";

type ItemFormData = {
  name: string;
  barCode?: string;
  category: string;
  subcategory: string;
  description?: string;
  variation: number;
  unit: string;
  supplier?: string;
};

interface ModalItemProps {
  setShowNewItemModal: (value: boolean) => void;
  onSuccess?: () => void;
}

// Mapa de categoría → subcategorías
const categorySubcategories: Record<string, string[]> = {
  Materiales: [
    "Cemento",
    "Acero",
    "Albañilería",
    "Madera",
    "Arena",
    "Grava",
    "Blocks",
    "Acabados",
    "Pintura",
    "Cerámica",
    "Porcelanato",
    "Yeso",
    "Piso",
    "Eléctricos",
    "Plomería",
    "Desagüe",
    "Gas",
    "Aire Acondicionado",
  ],
  Servicios: [
    "Mano de Obra",
    "Transporte",
    "Alquiler de Equipos",
    "Consultoría",
    "Acabados",
    "Instalaciones",
  ],
};

export const ModalItem = ({
  setShowNewItemModal,
  onSuccess,
}: ModalItemProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Beneficiary[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ItemFormData>({
    defaultValues: {
      unit: "Unidad",
      variation: 0,
    },
  });

  const selectedCategory = watch("category");

  useEffect(() => {
    setValue("subcategory", "");
  }, [selectedCategory, setValue]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setLoadingSuppliers(true);
        const params = new URLSearchParams({
          withContacts: "true",
          withTaxData: "false",
        });

        const response = await fetch(
          `/api/erp/beneficiaries?${params.toString()}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch suppliers");
        }

        const data: Beneficiary[] = await response.json();
        // Filtrar solo proveedores (PROVIDER o BOTH)
        const providerList = data.filter(
          (b) => b.type === "PROVIDER" || b.type === "BOTH",
        );
        setSuppliers(providerList);
      } catch (err) {
        console.error("Error fetching suppliers:", err);
      } finally {
        setLoadingSuppliers(false);
      }
    };

    fetchSuppliers();
  }, []);

  const availableSubcategories = selectedCategory
    ? categorySubcategories[selectedCategory] || []
    : [];

  const onSubmit = async (data: ItemFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const isService = data.category === "Servicios";

      // Encontrar el proveedor seleccionado para guardar nombre e ID
      const selectedSupplier = suppliers.find(
        (s) => s.id.toString() === data.supplier,
      );

      // Construir el payload según el tipo CreateResourceBody
      const payload: CreateResourceBody = {
        name: data.name,
        type: isService ? "SERVICE" : "PRODUCT",
        relation: isService ? "OTHER" : "MATERIAL",
        unit: isService ? "Servicio" : data.unit,
        priceStrategy: "FIXED",
        variation: data.variation,
        description: data.description || "",
        barCode: isService ? undefined : data.barCode,
        canSellWithoutStock: true,
        canBeSold: true,
        followsInventory: true,
        requiresSerialNumbers: false,
        quantityDecimals: 0,
        // Agregar categoría y subcategoría como metadata personalizado
        clientdata: {
          category: data.category,
          subcategory: data.subcategory,
          supplier: selectedSupplier?.name || "",
          supplierId: selectedSupplier?.id || null,
        },
      };

      const response = await fetch("/api/erp/resource", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Error al crear el item");
      }
      await response.json();
      // Resetear el formulario y cerrar el modal
      reset();
      setShowNewItemModal(false);

      // Llamar al callback de éxito si existe
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      console.error("❌ Error al crear item:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Error desconocido al crear el item",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const FORM_ID = "crear-item";

  return (
    <Modal
      open
      onClose={() => setShowNewItemModal(false)}
      size="md"
      busy={isSubmitting}
      title="Crear item"
      description="Material o servicio que después se podrá usar como línea de factura."
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
          <Button
            variant="outline"
            onClick={() => setShowNewItemModal(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Crear item
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                Nombre *
              </label>
              <input
                type="text"
                placeholder="Ej: Cemento Portland"
                {...register("name", {
                  required: "El nombre es obligatorio",
                  minLength: {
                    value: 2,
                    message: "El nombre debe tener al menos 2 caracteres",
                  },
                })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent ${
                  errors.name ? "border-danger" : "border-rule-strong"
                }`}
              />
              {errors.name && (
                <p className="text-xs text-danger mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>
            {selectedCategory !== "Servicios" && (
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  Código de Barras
                </label>
                <input
                  type="text"
                  placeholder="Código opcional"
                  {...register("barCode")}
                  className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                Categoría *
              </label>
              <select
                {...register("category", {
                  required: "La categoría es obligatoria",
                })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent ${
                  errors.category ? "border-danger" : "border-rule-strong"
                }`}
              >
                <option value="">Seleccionar categoría</option>
                {Object.keys(categorySubcategories).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-xs text-danger mt-1">
                  {errors.category.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                Subcategoría *
              </label>
              <select
                {...register("subcategory", {
                  required: "La subcategoría es obligatoria",
                })}
                disabled={!selectedCategory}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent ${
                  errors.subcategory ? "border-danger" : "border-rule-strong"
                } ${!selectedCategory ? "bg-paper-3 cursor-not-allowed" : ""}`}
              >
                <option value="">
                  {selectedCategory
                    ? "Seleccionar subcategoría"
                    : "Selecciona una categoría primero"}
                </option>
                {availableSubcategories.map((subcat) => (
                  <option key={subcat} value={subcat}>
                    {subcat}
                  </option>
                ))}
              </select>
              {errors.subcategory && (
                <p className="text-xs text-danger mt-1">
                  {errors.subcategory.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-2">
              Descripción
            </label>
            <textarea
              placeholder="Descripción detallada del ítem"
              {...register("description")}
              rows={4}
              className="min-h-20 py-2 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                Precio Unitario *
              </label>
              <input
                type="number"
                placeholder="0.00"
                step="0.01"
                {...register("variation", {
                  required: "El precio es obligatorio",
                  min: {
                    value: 0,
                    message: "El precio debe ser mayor o igual a 0",
                  },
                  valueAsNumber: true,
                })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent ${
                  errors.variation ? "border-danger" : "border-rule-strong"
                }`}
              />
              {errors.variation && (
                <p className="text-xs text-danger mt-1">
                  {errors.variation.message}
                </p>
              )}
            </div>
            {selectedCategory !== "Servicios" && (
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  Unidad *
                </label>
                <select
                  {...register("unit", {
                    required:
                      selectedCategory !== "Servicios"
                        ? "La unidad es obligatoria"
                        : false,
                  })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ink focus:border-transparent ${
                    errors.unit ? "border-danger" : "border-rule-strong"
                  }`}
                >
                  <option value="Unidad">Unidad</option>
                  <option value="Metro">Metro</option>
                  <option value="Metro²">Metro²</option>
                  <option value="Metro³">Metro³</option>
                  <option value="Kilogramo">Kilogramo</option>
                  <option value="Saco">Saco</option>
                  <option value="Galón">Galón</option>
                  <option value="Litro">Litro</option>
                  <option value="Caja">Caja</option>
                  <option value="Rollo">Rollo</option>
                </select>
                {errors.unit && (
                  <p className="text-xs text-danger mt-1">
                    {errors.unit.message}
                  </p>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">
                Proveedor
              </label>
              <select
                {...register("supplier")}
                className="h-10 w-full rounded-[8px] border border-rule-strong bg-paper px-3 text-[0.8125rem] text-ink placeholder:text-ink-3 transition-colors duration-[120ms] hover:border-ink-3 focus:border-gold focus:outline-2 focus:outline-offset-[-1px] focus:outline-gold disabled:cursor-not-allowed disabled:bg-paper-3 disabled:text-ink-3"
                disabled={loadingSuppliers}
              >
                <option value="">
                  {loadingSuppliers
                    ? "Cargando proveedores..."
                    : "Seleccionar proveedor"}
                </option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
