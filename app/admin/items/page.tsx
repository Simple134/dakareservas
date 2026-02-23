"use client";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  List,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { useState, useEffect } from "react";
import { ModalItem } from "@/src/components/ModalItem";
import { CategoryChart } from "@/src/components/charts/CategoryChart";
import { CategoryPieChart } from "@/src/components/charts/CategoryPieChart";
import { V2GetResourcesResponse } from "@/src/types/gestiono";

const ItemsPage = () => {
  const [items, setItems] = useState<V2GetResourcesResponse["items"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [itemSearchQuery, setItemSearchQuery] = useState("");
  const [itemCategoryFilter, setItemCategoryFilter] = useState(
    "Todas las categorías",
  );
  const [itemSubcategoryFilter, setItemSubcategoryFilter] = useState(
    "Todas las subcategorías",
  );
  const [currentView, setCurrentView] = useState<"lista" | "analytics">(
    "lista",
  );
  const [showNewItemModal, setShowNewItemModal] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [archiveModalState, setArchiveModalState] = useState<{
    isOpen: boolean;
    itemId: number | null;
    itemName: string | null;
  }>({
    isOpen: false,
    itemId: null,
    itemName: null,
  });
  const [isArchiving, setIsArchiving] = useState(false);

  const handleArchiveClick = (id: number, name: string) => {
    setArchiveModalState({ isOpen: true, itemId: id, itemName: name });
  };

  const handleArchiveConfirm = async () => {
    if (!archiveModalState.itemId) return;
    setIsArchiving(true);
    try {
      const response = await fetch("/api/gestiono/resource/archive", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: archiveModalState.itemId }),
      });
      if (!response.ok) throw new Error("Failed to archive resource");
      setItems((prev) =>
        prev.filter((item) => item.id !== archiveModalState.itemId),
      );
      setArchiveModalState({ isOpen: false, itemId: null, itemName: null });
    } catch (err) {
      console.error("Error archiving resource:", err);
      alert("Error al archivar el item. Intenta de nuevo.");
    } finally {
      setIsArchiving(false);
    }
  };

  const handleArchiveCancel = () => {
    setArchiveModalState({ isOpen: false, itemId: null, itemName: null });
  };

  // Fetch items from API
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: currentPage.toString(),
          elementsPerPage: itemsPerPage.toString(),
        });

        const response = await fetch(
          `/api/gestiono/resource?${params.toString()}`,
        );

        if (!response.ok) {
          throw new Error("Failed to fetch items");
        }

        const data: V2GetResourcesResponse = await response.json();
        console.log("📦 Resources fetched:", data);

        setItems(data.items || []);
        setTotalPages(data.totalPages || 1);
        setTotalItems(data.totalItems || 0);
        setError(null);
      } catch (err) {
        console.error("Error fetching items:", err);
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [currentPage, itemsPerPage]);

  // Filter items
  const filteredItems = items.filter((item) => {
    const itemCategory =
      typeof item.clientdata === "object" && item.clientdata !== null
        ? (item.clientdata.category as string) || item.type
        : item.type;
    const itemSubcategory =
      typeof item.clientdata === "object" && item.clientdata !== null
        ? (item.clientdata.subcategory as string) || item.relation
        : item.relation;

    const matchesSearch =
      (item.name || "").toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
      (item.description || "")
        .toLowerCase()
        .includes(itemSearchQuery.toLowerCase());
    const matchesCategory =
      itemCategoryFilter === "Todas las categorías" ||
      itemCategory === itemCategoryFilter;
    const matchesSubcategory =
      itemSubcategoryFilter === "Todas las subcategorías" ||
      itemSubcategory === itemSubcategoryFilter;
    return matchesSearch && matchesCategory && matchesSubcategory;
  });

  // Get unique categories from items
  const uniqueCategories = Array.from(
    new Set(
      items
        .map((item) =>
          typeof item.clientdata === "object" && item.clientdata !== null
            ? (item.clientdata.category as string) || item.type
            : item.type,
        )
        .filter(Boolean),
    ),
  ) as string[];

  // Get unique subcategories from items
  const uniqueSubcategories = Array.from(
    new Set(
      items
        .map((item) =>
          typeof item.clientdata === "object" && item.clientdata !== null
            ? (item.clientdata.subcategory as string) || item.relation
            : item.relation,
        )
        .filter(Boolean),
    ),
  ) as string[];

  const categoryData = items.reduce(
    (acc, item) => {
      const category =
        typeof item.clientdata === "object" && item.clientdata !== null
          ? (item.clientdata.category as string) || item.type
          : item.type;
      const existing = acc.find((c) => c.name === category);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ name: (category as string) || "Otros", count: 1 });
      }
      return acc;
    },
    [] as { name: string; count: number }[],
  );

  const categoryDataWithPercentage = categoryData.map((cat) => ({
    ...cat,
    percentage: (cat.count / items.length) * 100,
  }));

  const topUsedItems = items.slice(0, 5);

  return (
    <div className="flex min-h-screen w-full bg-gray-50">
      <main className="flex-1 overflow-auto h-screen relative">
        <div className="min-h-screen bg-white p-4 md:p-8">
          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#07234B] mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando items...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <p className="text-red-600 mb-2">Error al cargar los items</p>
                <p className="text-gray-600">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-4 py-2 bg-[#07234B] text-white rounded-lg hover:bg-[#0a2d5f] transition-colors"
                >
                  Reintentar
                </button>
              </div>
            </div>
          ) : (
            <div className="mx-auto space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    Items
                  </h1>
                  <p className="text-gray-600 mt-1 text-sm sm:text-base">
                    Gestiona tu inventario de materiales y servicios
                  </p>
                </div>
                <div className="flex gap-2 sm:gap-3">
                  {/* <button
                    style={{ borderRadius: "10px" }}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="hidden sm:inline">Importar</span>
                  </button>
                  <button
                    style={{ borderRadius: "10px" }}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Exportar</span>
                  </button> */}
                  <button
                    onClick={() => setShowNewItemModal(true)}
                    style={{ borderRadius: "10px" }}
                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#07234B] text-white rounded-lg hover:bg-[#0a2d5f] transition-colors flex-1 sm:flex-initial justify-center"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo Item
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 border-b border-gray-200">
                <button
                  onClick={() => setCurrentView("lista")}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                    currentView === "lista"
                      ? "border-[#07234B] text-[#07234B] font-medium"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <List className="w-4 h-4" />
                  Lista de Items
                </button>
                <button
                  onClick={() => setCurrentView("analytics")}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                    currentView === "analytics"
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
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Filtros
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Filtra los ítems por categoría, subcategoría o búsqueda
                    </p>

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
                        {uniqueCategories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <select
                        value={itemSubcategoryFilter}
                        onChange={(e) =>
                          setItemSubcategoryFilter(e.target.value)
                        }
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                      >
                        <option>Todas las subcategorías</option>
                        {uniqueSubcategories.map((subcat) => (
                          <option key={subcat} value={subcat}>
                            {subcat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">
                        Items ({filteredItems.length})
                      </h2>
                    </div>

                    {/* Mobile Card Layout */}
                    <div className="block md:hidden divide-y divide-gray-200">
                      {filteredItems.map((item) => {
                        const clientData =
                          typeof item.clientdata === "object" &&
                          item.clientdata !== null
                            ? item.clientdata
                            : {};
                        return (
                          <div
                            key={item.id}
                            className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {item.name}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {item.description || "Sin descripción"}
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleArchiveClick(item.id, item.name);
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 transition-colors ml-2 flex-shrink-0"
                                title="Archivar item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                              <span className="bg-gray-100 px-2 py-0.5 rounded">
                                {(clientData.category as string) || item.type}
                              </span>
                              <span>
                                {(clientData.subcategory as string) ||
                                  item.relation}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-sm font-medium text-gray-900">
                                {item.sellPriceCurrency || "DOP"}{" "}
                                {item.sellPrice?.toFixed(2) || "0.00"}
                              </span>
                              <span className="text-xs text-gray-500">
                                Stock: {item.canSellWithoutStock || 0} •{" "}
                                {item.unit || "N/A"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Desktop Table Layout */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Nombre
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Categoría
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Subcategoría
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Proveedor
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Precio
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Stock
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Unidad
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {filteredItems.map((item) => {
                            const clientData =
                              typeof item.clientdata === "object" &&
                              item.clientdata !== null
                                ? item.clientdata
                                : {};

                            return (
                              <tr
                                key={item.id}
                                className="hover:bg-gray-50 transition-colors cursor-pointer"
                              >
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-900">
                                      {item.name}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {item.description || "Sin descripción"}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-sm text-gray-700">
                                    {(clientData.category as string) ||
                                      item.type}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-sm text-gray-700">
                                    {(clientData.subcategory as string) ||
                                      item.relation}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-sm text-gray-700">
                                    {(clientData.supplier as string) || "N/A"}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-sm font-medium text-gray-900">
                                    {item.sellPriceCurrency || "DOP"}{" "}
                                    {item.sellPrice?.toFixed(2) || "0.00"}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-sm text-gray-700">
                                    {item.canSellWithoutStock || 0}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-sm text-gray-600">
                                    {item.unit || "N/A"}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleArchiveClick(item.id, item.name);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                                    title="Archivar item"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {filteredItems.length === 0 && (
                      <div className="p-8 sm:p-12 text-center">
                        <p className="text-gray-500 text-lg">
                          No se encontraron ítems con estos filtros.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Pagination Controls */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white px-4 sm:px-6 py-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>
                        Mostrando {(currentPage - 1) * itemsPerPage + 1} -{" "}
                        {Math.min(currentPage * itemsPerPage, totalItems)} de{" "}
                        {totalItems} items
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Anterior</span>
                      </button>
                      <div className="hidden sm:flex items-center gap-1">
                        {Array.from(
                          { length: totalPages },
                          (_, i) => i + 1,
                        ).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                              currentPage === page
                                ? "bg-[#07234B] text-white"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>
                      <span className="sm:hidden text-sm text-gray-600">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(totalPages, prev + 1),
                          )
                        }
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="hidden sm:inline">Siguiente</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {currentView === "analytics" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <h3 className="text-sm text-gray-600 mb-2">
                        Total Items
                      </h3>
                      <p className="text-3xl font-bold text-gray-900">
                        {totalItems}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        En todas las páginas
                      </p>
                    </div>

                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <h3 className="text-sm text-gray-600 mb-2">
                        Items en Esta Página
                      </h3>
                      <p className="text-3xl font-bold text-gray-900">
                        {items.length}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Página {currentPage} de {totalPages}
                      </p>
                    </div>

                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <h3 className="text-sm text-gray-600 mb-2">
                        Stock Total
                      </h3>
                      <p className="text-3xl font-bold text-gray-900">
                        {items.reduce(
                          (sum, item) =>
                            sum + (item.totalAvailableQuantity || 0),
                          0,
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Unidades disponibles
                      </p>
                    </div>

                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <h3 className="text-sm text-gray-600 mb-2">
                        Valor Total
                      </h3>
                      <p className="text-3xl font-bold text-gray-900">
                        ${" "}
                        {items
                          .reduce((sum, item) => sum + (item.sellPrice || 0), 0)
                          .toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Precio base de ítems
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Items por Tipo
                      </h3>
                      <p className="text-sm text-gray-600 mb-6">
                        Distribución de ítems según tipo
                      </p>
                      <CategoryChart categories={categoryData} />
                    </div>

                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Distribución por Tipo
                      </h3>
                      <p className="text-sm text-gray-600 mb-6">
                        Porcentaje de ítems por tipo
                      </p>
                      <div className="flex items-center justify-between">
                        <CategoryPieChart
                          categories={categoryDataWithPercentage}
                          totalItems={items.length}
                        />
                        <div className="space-y-3">
                          {categoryDataWithPercentage.map((cat, index) => {
                            const colors = [
                              "bg-purple-400",
                              "bg-green-300",
                              "bg-yellow-400",
                            ];
                            return (
                              <div
                                key={cat.name}
                                className="flex items-center gap-3"
                              >
                                <div
                                  className={`w-4 h-4 rounded-full ${colors[index % colors.length]}`}
                                ></div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {cat.name}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {cat.percentage.toFixed(1)}% • {cat.count}{" "}
                                    items
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg border border-gray-200 lg:col-span-2">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Items Recientes
                      </h3>
                      <p className="text-sm text-gray-600 mb-6">
                        Los últimos items de esta página
                      </p>
                      <div className="space-y-4">
                        {topUsedItems.map((item, index) => (
                          <div
                            key={item.id}
                            className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0"
                          >
                            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-semibold text-gray-700">
                                {index + 1}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {item.name}
                              </p>
                              <p className="text-xs text-gray-600">
                                {item.type} • {item.relation}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-gray-900">
                                {item.sellPriceCurrency || "DOP"}{" "}
                                {item.sellPrice?.toFixed(2) || "0.00"}
                              </p>
                              <p className="text-xs text-gray-600">
                                Stock: {item.totalAvailableQuantity || 0}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {showNewItemModal && (
        <ModalItem
          setShowNewItemModal={setShowNewItemModal}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}
      {/* Archive Confirmation Modal */}
      {archiveModalState.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold">Confirmar Archivado</h3>
            </div>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro que quieres archivar el item{" "}
              <span className="font-semibold">
                {archiveModalState.itemName}
              </span>
              ? El item será archivado pero no eliminado permanentemente.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleArchiveCancel}
                disabled={isArchiving}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleArchiveConfirm}
                disabled={isArchiving}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isArchiving ? "Archivando..." : "Archivar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemsPage;
