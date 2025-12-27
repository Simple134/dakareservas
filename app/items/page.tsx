"use client";
import { Item } from "@/src/types/ItemTypes";
import { BarChart3, Download, List, Plus, Search, Upload, X } from "lucide-react";
import { AppSidebar } from "@/src/components/AppSidebar";
import { useState } from "react";
import { ModalItem } from "@/src/components/ModalItem";
import { CategoryChart } from "@/src/components/charts/CategoryChart";
import { UsageChart } from "@/src/components/charts/UsageChart";
import { CategoryPieChart } from "@/src/components/charts/CategoryPieChart";

const items: Item[] = [
    {
        id: "1",
        name: "Cemento Portland",
        description: "Cemento Portland tipo I 42.5kg",
        category: "Materiales",
        subcategory: "Cemento",
        unitPrice: 8.50,
        currency: "S/",
        unit: "saco",
        supplier: "Holcim",
        usageCount: 14,
        lastUsed: "8/9/2024",
    },
    {
        id: "2",
        name: "Varilla de Acero 12mm",
        description: "Varilla corrugada de 12mm x 12m",
        category: "Materiales",
        subcategory: "Acero",
        unitPrice: 24.80,
        currency: "S/",
        unit: "unidad",
        supplier: "Siderperú",
        usageCount: 8,
        lastUsed: "8/4/2024",
    },
    {
        id: "3",
        name: "Ladrillos King Kong 18 huecos",
        description: "Ladrillos King Kong 18 huecos",
        category: "Materiales",
        subcategory: "Albañilería",
        unitPrice: 0.65,
        currency: "S/",
        unit: "unidad",
        supplier: "Ladrillos del Norte",
        usageCount: 25,
        lastUsed: "8/11/2024",
    },
    {
        id: "4",
        name: "Pintura Látex Blanco",
        description: "Pintura látex blanco mate 4 galones",
        category: "Acabados",
        subcategory: "Pintura",
        unitPrice: 85.00,
        currency: "S/",
        unit: "galón",
        supplier: "Sherwin Williams",
        usageCount: 12,
        lastUsed: "8/7/2024",
    },
    {
        id: "5",
        name: "Tubo PVC 4\"",
        description: "Tubo PVC desagüe 4\" x 3m",
        category: "Instalaciones",
        subcategory: "Desagüe",
        unitPrice: 28.50,
        currency: "S/",
        unit: "unidad",
        supplier: "Pavco",
        usageCount: 6,
        lastUsed: "7/29/2024",
    },
];

const ItemsPage = () => {
    const [itemSearchQuery, setItemSearchQuery] = useState("");
    const [itemCategoryFilter, setItemCategoryFilter] = useState("Todas las categorías");
    const [itemSubcategoryFilter, setItemSubcategoryFilter] = useState("Todas las subcategorías");
    const [currentView, setCurrentView] = useState<"lista" | "analytics">("lista");
    const [showNewItemModal, setShowNewItemModal] = useState(false);
    const [newItemName, setNewItemName] = useState("");
    const [newItemBarcode, setNewItemBarcode] = useState("");
    const [newItemCategory, setNewItemCategory] = useState("");
    const [newItemSubcategory, setNewItemSubcategory] = useState("");
    const [newItemDescription, setNewItemDescription] = useState("");
    const [newItemPrice, setNewItemPrice] = useState("");
    const [newItemUnit, setNewItemUnit] = useState("Unidad");
    const [newItemSupplier, setNewItemSupplier] = useState("");

    const categoryData = items.reduce((acc, item) => {
        const existing = acc.find(c => c.name === item.category);
        if (existing) {
            existing.count++;
        } else {
            acc.push({ name: item.category, count: 1 });
        }
        return acc;
    }, [] as { name: string; count: number }[]);

    const categoryDataWithPercentage = categoryData.map(cat => ({
        ...cat,
        percentage: (cat.count / items.length) * 100
    }));

    const topUsedItems = [...items]
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, 5);

    return (
        <div className="flex min-h-screen w-full bg-gray-50">
            <AppSidebar currentView="items" />
            <main className="flex-1 overflow-auto h-screen relative ml-64">
                <div className="min-h-screen bg-white p-8">
                    <div className="mx-auto space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Items</h1>
                                <p className="text-gray-600 mt-1">Gestiona tu inventario de materiales y servicios</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    style={{ borderRadius: "10px" }}
                                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                                    <Upload className="w-4 h-4" />
                                    Importar
                                </button>
                                <button
                                    style={{ borderRadius: "10px" }}
                                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                                    <Download className="w-4 h-4" />
                                    Exportar
                                </button>
                                <button
                                    onClick={() => setShowNewItemModal(true)}
                                    style={{ borderRadius: "10px" }}
                                    className="flex items-center gap-2 px-4 py-2 bg-[#07234B] text-white rounded-lg hover:bg-[#0a2d5f] transition-colors">
                                    <Plus className="w-4 h-4" />
                                    Nuevo Item
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 border-b border-gray-200">
                            <button
                                onClick={() => setCurrentView("lista")}
                                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${currentView === "lista"
                                    ? "border-[#07234B] text-[#07234B] font-medium"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                <List className="w-4 h-4" />
                                Lista de Items
                            </button>
                            <button
                                onClick={() => setCurrentView("analytics")}
                                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${currentView === "analytics"
                                    ? "border-[#07234B] text-[#07234B] font-medium"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                                    }`}
                            >
                                <BarChart3 className="w-4 h-4" />
                                Analíticas
                            </button>
                        </div>


                        {currentView === "lista" && (
                            <>
                                <div className="bg-white p-6 rounded-lg border border-gray-200">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Filtros</h3>
                                    <p className="text-sm text-gray-600 mb-4">Filtra los ítems por categoría, subcategoría o búsqueda</p>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Buscar ítems..."
                                                value={itemSearchQuery}
                                                onChange={(e) => setItemSearchQuery(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                                            />
                                        </div>
                                        <select
                                            value={itemCategoryFilter}
                                            onChange={(e) => setItemCategoryFilter(e.target.value)}
                                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                                        >
                                            <option>Todas las categorías</option>
                                            <option>Materiales</option>
                                            <option>Instalaciones</option>
                                            <option>Acabados</option>
                                            <option>Albañilería</option>
                                        </select>
                                        <select
                                            value={itemSubcategoryFilter}
                                            onChange={(e) => setItemSubcategoryFilter(e.target.value)}
                                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                                        >
                                            <option>Todas las subcategorías</option>
                                            <option>Cemento</option>
                                            <option>Acero</option>
                                            <option>Pintura</option>
                                            <option>Desagüe</option>
                                            <option>Albañilería</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-200">
                                        <h2 className="text-lg font-semibold text-gray-900">
                                            Items ({items.filter((item) => {
                                                const matchesSearch = item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
                                                    item.description.toLowerCase().includes(itemSearchQuery.toLowerCase());
                                                const matchesCategory = itemCategoryFilter === "Todas las categorías" || item.category === itemCategoryFilter;
                                                const matchesSubcategory = itemSubcategoryFilter === "Todas las subcategorías" || item.subcategory === itemSubcategoryFilter;
                                                return matchesSearch && matchesCategory && matchesSubcategory;
                                            }).length})
                                        </h2>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b border-gray-200">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nombre</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Categoría</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Subcategoría</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Precio Unitario</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Proveedor</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Uso</th>
                                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Último Uso</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {items
                                                    .filter((item) => {
                                                        const matchesSearch = item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
                                                            item.description.toLowerCase().includes(itemSearchQuery.toLowerCase());
                                                        const matchesCategory = itemCategoryFilter === "Todas las categorías" || item.category === itemCategoryFilter;
                                                        const matchesSubcategory = itemSubcategoryFilter === "Todas las subcategorías" || item.subcategory === itemSubcategoryFilter;
                                                        return matchesSearch && matchesCategory && matchesSubcategory;
                                                    })
                                                    .map((item) => (
                                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors cursor-pointer">
                                                            <td className="px-6 py-4">
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-medium text-gray-900">{item.name}</span>
                                                                    <span className="text-xs text-gray-500">{item.description}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="text-sm text-gray-700">{item.category}</span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="text-sm text-gray-700">{item.subcategory}</span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="text-sm font-medium text-gray-900">
                                                                    {item.currency} {item.unitPrice.toFixed(2)} /{item.unit}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="text-sm text-gray-700">{item.supplier}</span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                    {item.usageCount} veces
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className="text-sm text-gray-600">{item.lastUsed}</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {items.filter((item) => {
                                        const matchesSearch = item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
                                            item.description.toLowerCase().includes(itemSearchQuery.toLowerCase());
                                        const matchesCategory = itemCategoryFilter === "Todas las categorías" || item.category === itemCategoryFilter;
                                        const matchesSubcategory = itemSubcategoryFilter === "Todas las subcategorías" || item.subcategory === itemSubcategoryFilter;
                                        return matchesSearch && matchesCategory && matchesSubcategory;
                                    }).length === 0 && (
                                            <div className="p-12 text-center">
                                                <p className="text-gray-500 text-lg">No se encontraron ítems con estos filtros.</p>
                                            </div>
                                        )}
                                </div>
                            </>
                        )}

                        {currentView === "analytics" && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                                        <h3 className="text-sm text-gray-600 mb-2">Total Items</h3>
                                        <p className="text-3xl font-bold text-gray-900">{items.length}</p>
                                        <p className="text-xs text-gray-500 mt-1">+0 este mes</p>
                                    </div>

                                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                                        <h3 className="text-sm text-gray-600 mb-2">Uso Total</h3>
                                        <p className="text-3xl font-bold text-gray-900">{items.reduce((sum, item) => sum + item.usageCount, 0)}</p>
                                        <p className="text-xs text-gray-500 mt-1">Promedio 13.2 por ítem</p>
                                    </div>

                                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                                        <h3 className="text-sm text-gray-600 mb-2">Items con Precio</h3>
                                        <p className="text-3xl font-bold text-gray-900">{items.length}</p>
                                        <p className="text-xs text-gray-500 mt-1">100.0% del total</p>
                                    </div>

                                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                                        <h3 className="text-sm text-gray-600 mb-2">Valor Total</h3>
                                        <p className="text-3xl font-bold text-gray-900">S/ 147.65</p>
                                        <p className="text-xs text-gray-500 mt-1">Precio base de ítems</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Items por Categoría</h3>
                                        <p className="text-sm text-gray-600 mb-6">Distribución de ítems según categoría</p>
                                        <CategoryChart categories={categoryData} />
                                    </div>

                                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Items Más Usados</h3>
                                        <p className="text-sm text-gray-600 mb-6">Top 5 ítems por frecuencia de uso</p>
                                        <UsageChart items={topUsedItems} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Distribución por Categorías</h3>
                                        <p className="text-sm text-gray-600 mb-6">Porcentaje de ítems por categoría</p>
                                        <div className="flex items-center justify-between">
                                            <CategoryPieChart categories={categoryDataWithPercentage} totalItems={items.length} />
                                            <div className="space-y-3">
                                                {categoryDataWithPercentage.map((cat, index) => {
                                                    const colors = ['bg-purple-400', 'bg-green-300', 'bg-yellow-400'];
                                                    return (
                                                        <div key={cat.name} className="flex items-center gap-3">
                                                            <div className={`w-4 h-4 rounded-full ${colors[index % colors.length]}`}></div>
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900">{cat.name}</p>
                                                                <p className="text-xs text-gray-600">{cat.percentage.toFixed(1)}% • {cat.count} items</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Items Más Utilizados</h3>
                                        <p className="text-sm text-gray-600 mb-6">Los ítems que más se han usado en proyectos</p>
                                        <div className="space-y-4">
                                            {items
                                                .sort((a, b) => b.usageCount - a.usageCount)
                                                .slice(0, 3)
                                                .map((item, index) => (
                                                    <div key={item.id} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0">
                                                        <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                                            <span className="text-sm font-semibold text-gray-700">{index + 1}</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-gray-900">{item.name}</p>
                                                            <p className="text-xs text-gray-600">{item.category} • {item.subcategory}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-bold text-gray-900">{item.usageCount} usos</p>
                                                            <p className="text-xs text-gray-600">{item.lastUsed}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {showNewItemModal && (
                <ModalItem
                    setShowNewItemModal={setShowNewItemModal}
                    newItemName={newItemName}
                    setNewItemName={setNewItemName}
                    newItemBarcode={newItemBarcode}
                    setNewItemBarcode={setNewItemBarcode}
                    newItemCategory={newItemCategory}
                    setNewItemCategory={setNewItemCategory}
                    newItemSubcategory={newItemSubcategory}
                    setNewItemSubcategory={setNewItemSubcategory}
                    newItemDescription={newItemDescription}
                    setNewItemDescription={setNewItemDescription}
                    newItemPrice={newItemPrice}
                    setNewItemPrice={setNewItemPrice}
                    newItemUnit={newItemUnit}
                    setNewItemUnit={setNewItemUnit}
                    newItemSupplier={newItemSupplier}
                    setNewItemSupplier={setNewItemSupplier}
                />
            )}
        </div>
    );
};

export default ItemsPage;
