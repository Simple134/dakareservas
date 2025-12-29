"use client";
import { ArrowLeft, Upload, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface BudgetCategory {
  id: string;
  name: string;
  percentage: number;
  amount: number;
}

export default function CreateProjectPage() {
  const router = useRouter();

  const [projectName, setProjectName] = useState("");
  const [client, setClient] = useState("");
  const [location, setLocation] = useState("");
  const [initialStatus, setInitialStatus] = useState("Planificación");
  const [projectType, setProjectType] = useState("Residencial");
  const [permissionCategory, setPermissionCategory] = useState("Mayor");

  const [totalBudget, setTotalBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [budgetDocument, setBudgetDocument] = useState<File | null>(null);

  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([
    { id: "1", name: "Materiales", percentage: 0, amount: 0 },
    { id: "2", name: "Mano de Obra", percentage: 0, amount: 0 },
    { id: "3", name: "Equipos", percentage: 0, amount: 0 },
    { id: "4", name: "Subcontratos", percentage: 0, amount: 0 },
    { id: "5", name: "Otros Gastos", percentage: 0, amount: 0 },
  ]);

  const [projectDescription, setProjectDescription] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBudgetDocument(e.target.files[0]);
    }
  };

  const updateCategoryPercentage = (id: string, percentage: number) => {
    const budget = parseFloat(totalBudget) || 0;
    setBudgetCategories((prev) =>
      prev.map((cat) =>
        cat.id === id
          ? { ...cat, percentage, amount: (budget * percentage) / 100 }
          : cat,
      ),
    );
  };

  const updateCategoryAmount = (id: string, amount: number) => {
    const budget = parseFloat(totalBudget) || 0;
    setBudgetCategories((prev) =>
      prev.map((cat) =>
        cat.id === id
          ? {
              ...cat,
              amount,
              percentage: budget > 0 ? (amount / budget) * 100 : 0,
            }
          : cat,
      ),
    );
  };

  const addCategory = () => {
    const newCategory: BudgetCategory = {
      id: Date.now().toString(),
      name: "Nueva Categoría",
      percentage: 0,
      amount: 0,
    };
    setBudgetCategories([...budgetCategories, newCategory]);
  };

  const removeCategory = (id: string) => {
    setBudgetCategories((prev) => prev.filter((cat) => cat.id !== id));
  };

  const totalPercentage = budgetCategories.reduce(
    (sum, cat) => sum + cat.percentage,
    0,
  );

  const handleCreateProject = () => {
    console.log("Creating project:", {
      projectName,
      client,
      location,
      initialStatus,
      projectType,
      permissionCategory,
      totalBudget,
      startDate,
      endDate,
      budgetDocument,
      budgetCategories,
      projectDescription,
    });
  };

  return (
    <div className="flex min-h-screen w-full bg-gray-50">
      <main className="flex-1 overflow-auto h-screen relative">
        <div className="min-h-screen bg-white p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm">Volver</span>
              </button>
            </div>

            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Crear Nuevo Proyecto
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Complete la información básica del proyecto
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Información del Proyecto
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Nombre del Proyecto *
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Casa Familiar Los Jardines"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Cliente *
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre del cliente"
                      value={client}
                      onChange={(e) => setClient(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Ubicación
                    </label>
                    <input
                      type="text"
                      placeholder="Santiago, República Dominicana"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Estado Inicial
                    </label>
                    <select
                      value={initialStatus}
                      onChange={(e) => setInitialStatus(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                    >
                      <option value="Planificación">Planificación</option>
                      <option value="Ejecución">Ejecución</option>
                      <option value="Completado">Completado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Tipo de Proyecto
                    </label>
                    <select
                      value={projectType}
                      onChange={(e) => setProjectType(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                    >
                      <option value="Residencial">Residencial</option>
                      <option value="Comercial">Comercial</option>
                      <option value="Industrial">Industrial</option>
                      <option value="Infraestructura">Infraestructura</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Categoría de Permisología
                    </label>
                    <select
                      value={permissionCategory}
                      onChange={(e) => setPermissionCategory(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                    >
                      <option value="Mayor">Mayor</option>
                      <option value="Menor">Menor</option>
                      <option value="Especial">Especial</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Presupuesto y Cronograma
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Presupuesto Total (RD$) *
                    </label>
                    <input
                      type="number"
                      placeholder="2500000"
                      value={totalBudget}
                      onChange={(e) => setTotalBudget(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Fecha de Inicio
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Fecha de Finalización
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Documento de Presupuesto
                </h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Subir Documento de Presupuesto
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#07234B] transition-colors cursor-pointer">
                  <input
                    type="file"
                    id="budget-file"
                    accept=".pdf,.xlsx,.xls,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label htmlFor="budget-file" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      Haga clic para subir o arrastre el archivo aquí
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, Excel, Word (máx. 10MB)
                    </p>
                    {budgetDocument && (
                      <p className="text-sm text-[#07234B] mt-2 font-medium">
                        {budgetDocument.name}
                      </p>
                    )}
                  </label>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Distribución del Presupuesto por Categorías
                </h2>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Asigne el consumo del presupuesto por categorías (Total:{" "}
                {totalPercentage.toFixed(1)}%)
              </p>

              <div className="space-y-3">
                <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-700 pb-2 border-b">
                  <div className="col-span-4">Categoría</div>
                  <div className="col-span-3 text-center">%</div>
                  <div className="col-span-4 text-center">RD$</div>
                  <div className="col-span-1"></div>
                </div>

                {budgetCategories.map((category) => (
                  <div
                    key={category.id}
                    className="grid grid-cols-12 gap-2 items-center"
                  >
                    <div className="col-span-4">
                      <input
                        type="text"
                        value={category.name}
                        onChange={(e) =>
                          setBudgetCategories((prev) =>
                            prev.map((cat) =>
                              cat.id === category.id
                                ? { ...cat, name: e.target.value }
                                : cat,
                            ),
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="number"
                        value={category.percentage || ""}
                        onChange={(e) =>
                          updateCategoryPercentage(
                            category.id,
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                      />
                    </div>
                    <div className="col-span-4">
                      <input
                        type="number"
                        value={category.amount || ""}
                        onChange={(e) =>
                          updateCategoryAmount(
                            category.id,
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        placeholder="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={() => removeCategory(category.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addCategory}
                  className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-[#07234B] hover:text-[#07234B] transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Categoría
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Descripción del Proyecto
              </h2>
              <textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="Descripción detallada del proyecto, alcance, especificaciones técnicas..."
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateProject}
                className="px-6 py-2 bg-[#07234B] text-white rounded-lg hover:bg-[#0a2d5f] transition-colors flex items-center gap-2"
              >
                <span>📋</span>
                Crear Proyecto
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
