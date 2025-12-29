import { X } from "lucide-react";

export const ModalItem = ({
  setShowNewItemModal,
  newItemName,
  setNewItemName,
  newItemBarcode,
  setNewItemBarcode,
  newItemCategory,
  setNewItemCategory,
  newItemSubcategory,
  setNewItemSubcategory,
  newItemDescription,
  setNewItemDescription,
  newItemPrice,
  setNewItemPrice,
  newItemUnit,
  setNewItemUnit,
  newItemSupplier,
  setNewItemSupplier,
}: {
  setShowNewItemModal: (value: boolean) => void;
  newItemName: string;
  setNewItemName: (value: string) => void;
  newItemBarcode: string;
  setNewItemBarcode: (value: string) => void;
  newItemCategory: string;
  setNewItemCategory: (value: string) => void;
  newItemSubcategory: string;
  setNewItemSubcategory: (value: string) => void;
  newItemDescription: string;
  setNewItemDescription: (value: string) => void;
  newItemPrice: string;
  setNewItemPrice: (value: string) => void;
  newItemUnit: string;
  setNewItemUnit: (value: string) => void;
  newItemSupplier: string;
  setNewItemSupplier: (value: string) => void;
}) => {
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
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                placeholder="Ej: Cemento Portland"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Código de Barras
              </label>
              <input
                type="text"
                placeholder="Código opcional"
                value={newItemBarcode}
                onChange={(e) => setNewItemBarcode(e.target.value)}
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
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
              >
                <option value="">Seleccionar categoría</option>
                <option value="Materiales">Materiales</option>
                <option value="Acabados">Acabados</option>
                <option value="Instalaciones">Instalaciones</option>
                <option value="Herramientas">Herramientas</option>
                <option value="Servicios">Servicios</option>
              </select>
              <input
                type="text"
                placeholder="O escribir nueva categoría"
                className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Subcategoría *
              </label>
              <select
                value={newItemSubcategory}
                onChange={(e) => setNewItemSubcategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
              >
                <option value="">Seleccionar subcategoría</option>
                <option value="Cemento">Cemento</option>
                <option value="Acero">Acero</option>
                <option value="Albañilería">Albañilería</option>
                <option value="Pintura">Pintura</option>
                <option value="Desagüe">Desagüe</option>
                <option value="Eléctricos">Eléctricos</option>
              </select>
              <input
                type="text"
                placeholder="O escribir nueva subcategoría"
                className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Descripción
            </label>
            <textarea
              placeholder="Descripción detallada del ítem"
              value={newItemDescription}
              onChange={(e) => setNewItemDescription(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Precio Unitario
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Unidad
              </label>
              <select
                value={newItemUnit}
                onChange={(e) => setNewItemUnit(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
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
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Proveedor
              </label>
              <input
                type="text"
                placeholder="Nombre del proveedor"
                value={newItemSupplier}
                onChange={(e) => setNewItemSupplier(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            style={{ borderRadius: "10px" }}
            onClick={() => setShowNewItemModal(false)}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            style={{ borderRadius: "10px" }}
            onClick={() => {
              console.log("Creating new item:", {
                name: newItemName,
                barcode: newItemBarcode,
                category: newItemCategory,
                subcategory: newItemSubcategory,
                description: newItemDescription,
                price: newItemPrice,
                unit: newItemUnit,
                supplier: newItemSupplier,
              });
              setShowNewItemModal(false);
            }}
            className="px-6 py-2 bg-[#07234B] text-white rounded-lg hover:bg-[#0a2d5f] transition-colors"
          >
            Crear Item
          </button>
        </div>
      </div>
    </div>
  );
};
