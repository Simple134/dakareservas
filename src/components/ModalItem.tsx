"use client";

import { X, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { useState } from "react";
import type { CreateResourceBody } from "@/src/types/gestiono";

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

export const ModalItem = ({
  setShowNewItemModal,
  onSuccess,
}: ModalItemProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ItemFormData>({
    defaultValues: {
      unit: "Unidad",
      variation: 0,
    },
  });

  const onSubmit = async (data: ItemFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Construir el payload según el tipo CreateResourceBody
      const payload: CreateResourceBody = {
        name: data.name,
        type: "PRODUCT",
        relation: "MATERIAL",
        unit: data.unit,
        priceStrategy: "FIXED",
        variation: data.variation,
        description: data.description || "",
        barCode: data.barCode,
        canSellWithoutStock: true,
        canBeSold: true,
        followsInventory: true,
        requiresSerialNumbers: false,
        quantityDecimals: 0,
        // Agregar categoría y subcategoría como metadata personalizado
        clientdata: {
          category: data.category,
          subcategory: data.subcategory,
          supplier: data.supplier,
        },
      };

      const response = await fetch("/api/gestiono/resource", {
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

      const result = await response.json();
      console.log("✅ Item creado exitosamente:", result);

      // Resetear el formulario y cerrar el modal
      reset();
      setShowNewItemModal(false);

      // Llamar al callback de éxito si existe
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      console.error("❌ Error al crear item:", err);
      setError(err instanceof Error ? err.message : "Error desconocido al crear el item");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Crear Nuevo Item
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Agrega un nuevo ítem al inventario. Los campos marcados con * son
              obligatorios.
            </p>
          </div>
          <button
            onClick={() => setShowNewItemModal(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
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
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent ${
                    errors.name ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.name && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Código de Barras
                </label>
                <input
                  type="text"
                  placeholder="Código opcional"
                  {...register("barCode")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Categoría *
                </label>
                <select
                  {...register("category", {
                    required: "La categoría es obligatoria",
                  })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent ${
                    errors.category ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="">Seleccionar categoría</option>
                  <option value="Materiales">Materiales</option>
                  <option value="Acabados">Acabados</option>
                  <option value="Instalaciones">Instalaciones</option>
                  <option value="Herramientas">Herramientas</option>
                  <option value="Servicios">Servicios</option>
                </select>
                {errors.category && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.category.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Subcategoría *
                </label>
                <select
                  {...register("subcategory", {
                    required: "La subcategoría es obligatoria",
                  })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent ${
                    errors.subcategory ? "border-red-500" : "border-gray-300"
                  }`}
                >
                  <option value="">Seleccionar subcategoría</option>
                  <option value="Cemento">Cemento</option>
                  <option value="Acero">Acero</option>
                  <option value="Albañilería">Albañilería</option>
                  <option value="Pintura">Pintura</option>
                  <option value="Desagüe">Desagüe</option>
                  <option value="Eléctricos">Eléctricos</option>
                </select>
                {errors.subcategory && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.subcategory.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Descripción
              </label>
              <textarea
                placeholder="Descripción detallada del ítem"
                {...register("description")}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
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
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent ${
                    errors.variation ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.variation && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.variation.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Unidad *
                </label>
                <select
                  {...register("unit", {
                    required: "La unidad es obligatoria",
                  })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent ${
                    errors.unit ? "border-red-500" : "border-gray-300"
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
                  <p className="text-xs text-red-500 mt-1">
                    {errors.unit.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Proveedor
                </label>
                <input
                  type="text"
                  placeholder="Nombre del proveedor"
                  {...register("supplier")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              type="button"
              style={{ borderRadius: "10px" }}
              onClick={() => setShowNewItemModal(false)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{ borderRadius: "10px" }}
              className="px-6 py-2 bg-[#07234B] text-white rounded-lg hover:bg-[#0a2d5f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? "Creando..." : "Crear Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
