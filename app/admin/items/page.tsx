"use client";
import { BarChart3, List, Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { ModalItem } from "@/src/components/ModalItem";
import { CategoryChart } from "@/src/components/charts/CategoryChart";
import { CategoryPieChart } from "@/src/components/charts/CategoryPieChart";
import { V2GetResourcesResponse } from "@/src/types/erp";
import { PageHeader, PageBody } from "@/src/components/ui/page-header";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { SearchInput } from "@/src/components/ui/search-input";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Pagination } from "@/src/components/ui/pagination";
import { TabsBar } from "@/src/components/ui/tabs-bar";
import { KPICard } from "@/src/components/dashboard/KPICard";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { money, count as fmtCount, percent } from "@/src/lib/format";
import { SelectField } from "@/src/components/ui/native-select";
import { seriesColor } from "@/src/lib/chartColors";

const TABS = [
  { id: "lista", label: "Lista de items", icon: List },
  { id: "analytics", label: "Analíticas", icon: BarChart3 },
] as const;

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
      const response = await fetch("/api/erp/resource/archive", {
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

        const response = await fetch(`/api/erp/resource?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to fetch items");
        }

        const data: V2GetResourcesResponse = await response.json();

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

  const catInfo = (item: (typeof items)[number]) => {
    const cd =
      typeof item.clientdata === "object" && item.clientdata !== null
        ? (item.clientdata as Record<string, unknown>)
        : {};
    return {
      category: (cd.category as string) || item.type,
      subcategory: (cd.subcategory as string) || item.relation,
      supplier: (cd.supplier as string) || null,
    };
  };

  return (
    <>
      <PageHeader
        title="Items"
        description="Inventario de materiales y servicios que alimentan las líneas de factura."
        actions={
          <Button onClick={() => setShowNewItemModal(true)}>
            <Plus className="mr-1.5 h-4 w-4" strokeWidth={2} />
            Crear item
          </Button>
        }
      />

      <PageBody className="space-y-5">
        {error ? (
          <EmptyState
            title="No se pudieron cargar los items"
            description={error}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Reintentar
              </Button>
            }
          />
        ) : (
          <>
            <TabsBar
              tabs={TABS}
              value={currentView}
              onChange={setCurrentView}
              aria-label="Vistas de inventario"
            />

            {currentView === "lista" && (
              <>
                <section className="grid grid-cols-1 gap-4 rounded-[12px] border border-rule bg-paper p-4 md:grid-cols-3">
                  <div className="min-w-0">
                    <p className="eyebrow mb-1.5">Buscar</p>
                    <SearchInput
                      value={itemSearchQuery}
                      onValueChange={setItemSearchQuery}
                      placeholder="Nombre o descripción…"
                    />
                  </div>
                  <SelectField
                    label="Categoría"
                    value={itemCategoryFilter}
                    onChange={(e) => setItemCategoryFilter(e.target.value)}
                  >
                    <option>Todas las categorías</option>
                    {uniqueCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField
                    label="Subcategoría"
                    value={itemSubcategoryFilter}
                    onChange={(e) => setItemSubcategoryFilter(e.target.value)}
                  >
                    <option>Todas las subcategorías</option>
                    {uniqueSubcategories.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </SelectField>
                </section>

                <section className="overflow-hidden rounded-[12px] border border-rule bg-paper">
                  <header className="flex items-baseline justify-between gap-3 border-b border-rule px-4 py-3">
                    <h2 className="font-display text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">
                      Items
                    </h2>
                    <p className="tabular text-[0.75rem] text-ink-3">
                      {loading
                        ? "Cargando…"
                        : `${fmtCount(filteredItems.length)} en esta página`}
                    </p>
                  </header>

                  {/* Móvil: la tabla de ocho columnas no cabe, así que por
                      debajo de md la misma fila se lee como tarjeta. */}
                  <ul className="divide-y divide-rule md:hidden">
                    {loading && (
                      <li className="px-4 py-10 text-center text-[0.8125rem] text-ink-3">
                        Cargando items…
                      </li>
                    )}
                    {filteredItems.map((item) => {
                      const info = catInfo(item);
                      return (
                        <li key={item.id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-[0.8125rem] font-medium text-ink">
                                {item.name}
                              </p>
                              <p className="truncate text-[0.75rem] text-ink-3">
                                {item.description || "Sin descripción"}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                handleArchiveClick(item.id, item.name)
                              }
                              aria-label={`Archivar ${item.name}`}
                              className="shrink-0 rounded-[6px] p-1.5 text-ink-3 transition-colors duration-[120ms] hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                            </button>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline">{info.category}</Badge>
                            <span className="text-[0.75rem] text-ink-3">
                              {info.subcategory}
                            </span>
                          </div>
                          <div className="mt-2 flex items-baseline justify-between gap-3">
                            <span className="tabular font-mono text-[0.8125rem] font-medium text-ink">
                              {money(item.sellPrice || 0)}
                            </span>
                            <span className="tabular text-[0.75rem] text-ink-3">
                              {item.totalAvailableQuantity || 0}{" "}
                              {item.unit || "und"}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                    {!loading && filteredItems.length === 0 && (
                      <li className="px-4 py-10 text-center text-[0.8125rem] text-ink-3">
                        Ningún item coincide con estos filtros.
                      </li>
                    )}
                  </ul>

                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead>Categoría</TableHead>
                          <TableHead>Subcategoría</TableHead>
                          <TableHead>Proveedor</TableHead>
                          <TableHead numeric>Precio</TableHead>
                          <TableHead numeric>Stock</TableHead>
                          <TableHead>Unidad</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          [...Array(6)].map((_, i) => (
                            <TableRow key={`skeleton-${i}`} aria-busy>
                              {[...Array(8)].map((__, j) => (
                                <TableCell key={j}>
                                  <div className="h-3 w-full animate-pulse rounded bg-paper-3" />
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : filteredItems.length === 0 ? (
                          <TableEmpty colSpan={8}>
                            Ningún item coincide con estos filtros.
                          </TableEmpty>
                        ) : (
                          filteredItems.map((item) => {
                            const info = catInfo(item);
                            return (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <span className="block text-[0.8125rem] font-medium text-ink">
                                    {item.name}
                                  </span>
                                  <span className="block truncate text-[0.75rem] text-ink-3">
                                    {item.description || "Sin descripción"}
                                  </span>
                                </TableCell>
                                <TableCell className="text-[0.8125rem] text-ink-2">
                                  {info.category}
                                </TableCell>
                                <TableCell className="text-[0.8125rem] text-ink-2">
                                  {info.subcategory}
                                </TableCell>
                                <TableCell className="text-[0.8125rem] text-ink-2">
                                  {info.supplier ?? "—"}
                                </TableCell>
                                <TableCell numeric className="text-[0.8125rem]">
                                  {money(item.sellPrice || 0)}
                                </TableCell>
                                <TableCell numeric className="text-[0.8125rem]">
                                  {item.totalAvailableQuantity || 0}
                                </TableCell>
                                <TableCell className="text-[0.8125rem] text-ink-2">
                                  {item.unit || "—"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleArchiveClick(item.id, item.name)
                                    }
                                    aria-label={`Archivar ${item.name}`}
                                    title="Archivar item"
                                    className="rounded-[6px] p-1.5 text-ink-3 transition-colors duration-[120ms] hover:bg-danger-soft hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold"
                                  >
                                    <Trash2
                                      className="h-4 w-4"
                                      strokeWidth={1.75}
                                    />
                                  </button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <Pagination
                    page={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    perPage={itemsPerPage}
                    noun="items"
                    onPageChange={setCurrentPage}
                  />
                </section>
              </>
            )}

            {currentView === "analytics" && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <KPICard
                    loading={loading}
                    kpi={{
                      title: "Total de items",
                      value: fmtCount(totalItems),
                      icon: "Package",
                      hint: "En todas las páginas",
                    }}
                  />
                  <KPICard
                    loading={loading}
                    kpi={{
                      title: "En esta página",
                      value: fmtCount(items.length),
                      icon: "List",
                      hint: `Página ${currentPage} de ${totalPages}`,
                    }}
                  />
                  <KPICard
                    loading={loading}
                    kpi={{
                      title: "Stock disponible",
                      value: fmtCount(
                        items.reduce(
                          (sum, item) =>
                            sum + (item.totalAvailableQuantity || 0),
                          0,
                        ),
                      ),
                      icon: "Package",
                      hint: "Unidades de esta página",
                    }}
                  />
                  <KPICard
                    loading={loading}
                    kpi={{
                      title: "Suma de precios",
                      value: money(
                        items.reduce(
                          (sum, item) => sum + (item.sellPrice || 0),
                          0,
                        ),
                      ),
                      icon: "Receipt",
                      hint: "Precio base, no valor de inventario",
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <section className="rounded-[12px] border border-rule bg-paper">
                    <header className="border-b border-rule px-4 py-3">
                      <h2 className="font-display text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">
                        Items por tipo
                      </h2>
                      <p className="mt-0.5 text-[0.75rem] text-ink-2">
                        Cuántos items hay en cada categoría
                      </p>
                    </header>
                    <div className="p-4">
                      <CategoryChart categories={categoryData} />
                    </div>
                  </section>

                  <section className="rounded-[12px] border border-rule bg-paper">
                    <header className="border-b border-rule px-4 py-3">
                      <h2 className="font-display text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">
                        Distribución por tipo
                      </h2>
                      <p className="mt-0.5 text-[0.75rem] text-ink-2">
                        Porcentaje que representa cada categoría
                      </p>
                    </header>
                    <div className="flex flex-wrap items-center gap-6 p-4">
                      <CategoryPieChart
                        categories={categoryDataWithPercentage}
                        totalItems={items.length}
                      />
                      {/* La leyenda repetía tres colores fijos (morado, verde,
                          amarillo) que no coincidían con los del gráfico en
                          cuanto había más de tres categorías. */}
                      <ul className="min-w-0 flex-1 space-y-2.5">
                        {categoryDataWithPercentage.map((cat, index) => (
                          <li
                            key={cat.name}
                            className="flex items-center gap-2.5"
                          >
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: seriesColor(index) }}
                              aria-hidden
                            />
                            <div className="min-w-0">
                              <p className="truncate text-[0.8125rem] font-medium text-ink">
                                {cat.name}
                              </p>
                              <p className="tabular text-[0.75rem] text-ink-3">
                                {percent(cat.percentage)} ·{" "}
                                {fmtCount(cat.count)} items
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </section>

                  <section className="rounded-[12px] border border-rule bg-paper lg:col-span-2">
                    <header className="border-b border-rule px-4 py-3">
                      <h2 className="font-display text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">
                        Items recientes
                      </h2>
                      <p className="mt-0.5 text-[0.75rem] text-ink-2">
                        Los últimos cinco de esta página
                      </p>
                    </header>
                    <ul className="divide-y divide-rule">
                      {topUsedItems.map((item, index) => (
                        <li
                          key={item.id}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <span
                            className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-paper-3 text-[0.6875rem] font-semibold text-ink-2"
                            aria-hidden
                          >
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[0.8125rem] font-medium text-ink">
                              {item.name}
                            </p>
                            <p className="truncate text-[0.75rem] text-ink-3">
                              {item.type} · {item.relation}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="tabular font-mono text-[0.8125rem] font-semibold text-ink">
                              {money(item.sellPrice || 0)}
                            </p>
                            <p className="tabular text-[0.75rem] text-ink-3">
                              Stock {item.totalAvailableQuantity || 0}
                            </p>
                          </div>
                        </li>
                      ))}
                      {topUsedItems.length === 0 && (
                        <li className="px-4 py-10 text-center text-[0.8125rem] text-ink-3">
                          Sin items en esta página.
                        </li>
                      )}
                    </ul>
                  </section>
                </div>
              </div>
            )}
          </>
        )}
      </PageBody>

      {showNewItemModal && (
        <ModalItem
          setShowNewItemModal={setShowNewItemModal}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      )}

      <ConfirmDialog
        open={archiveModalState.isOpen}
        title="Archivar item"
        description={
          <>
            <span className="font-semibold text-ink">
              {archiveModalState.itemName}
            </span>{" "}
            dejará de aparecer en el inventario y en los selectores de línea. No
            se borra: las facturas que ya lo usan no cambian.
          </>
        }
        confirmLabel="Archivar"
        pendingLabel="Archivando…"
        pending={isArchiving}
        onConfirm={handleArchiveConfirm}
        onCancel={handleArchiveCancel}
      />
    </>
  );
};

export default ItemsPage;
