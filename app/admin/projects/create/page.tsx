"use client";
import { ArrowLeft, Upload, Plus, X, FileCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, DragEvent } from "react";

import { GestionoDivisionPayload } from "@/src/types/gestiono";

interface BudgetCategory {
  id: string;
  name: string;
  percentage: number;
  amount: number;
}

const CreateProject = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
  const [isDragging, setIsDragging] = useState(false);

  // Parse CSV file and populate budget categories
  const parseCSVFile = async (file: File) => {
    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());

    // Skip header line
    const dataLines = lines.slice(1);

    const categories: BudgetCategory[] = dataLines.map((line, index) => {
      const [name, percentage, amount] = line
        .split(",")
        .map((item) => item.trim());
      return {
        id: Date.now().toString() + index,
        name: name || `Categoría ${index + 1}`,
        percentage: parseFloat(percentage) || 0,
        amount: parseFloat(amount) || 0,
      };
    });

    if (categories.length > 0) {
      setBudgetCategories(categories);

      // Calculate total budget from amounts
      const total = categories.reduce((sum, cat) => sum + cat.amount, 0);
      if (total > 0) {
        setTotalBudget(total.toString());
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setBudgetDocument(file);

      // If it's a CSV file, parse it
      if (file.name.endsWith(".csv")) {
        await parseCSVFile(file);
      }
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];

      // Check file type
      const validTypes = [".pdf", ".xlsx", ".xls", ".doc", ".docx", ".csv"];
      const isValid = validTypes.some((type) =>
        file.name.toLowerCase().endsWith(type),
      );

      if (isValid) {
        setBudgetDocument(file);

        // If it's a CSV file, parse it
        if (file.name.endsWith(".csv")) {
          await parseCSVFile(file);
        }
      } else {
        alert(
          "Tipo de archivo no válido. Por favor, suba PDF, Excel, Word o CSV.",
        );
      }
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

  const handleCreateProject = async () => {
    if (!projectName || !client || !totalBudget) {
      alert("Por favor complete los campos obligatorios (*)");
      return;
    }

    setLoading(true);

    try {
      const payload: GestionoDivisionPayload = {
        name: projectName,
        type: "PROJECT",
        subDivisionOf: 183,
        metadata: {
          client,
          location,
          status: initialStatus,
          projectType,
          permissionCategory,
          budget: parseFloat(totalBudget) || 0,
          startDate,
          endDate,
          description: projectDescription,
          budgetCategories,
          budgetFileName: budgetDocument?.name,
        },
      };

      await fetch("/api/gestiono/divisions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      alert("Proyecto creado exitosamente");
      router.push("/admin");
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Error al crear el proyecto. Por favor intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
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
            <div
              className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 cursor-pointer ${
                isDragging
                  ? "border-[#07234B] bg-gradient-to-br from-blue-50 to-indigo-50 scale-[1.02] shadow-lg"
                  : budgetDocument
                    ? "border-green-500 bg-green-50 shadow-md"
                    : "border-gray-300 hover:border-[#224397] hover:bg-gray-50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="budget-file"
                accept=".pdf,.xlsx,.xls,.doc,.docx,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="budget-file" className="cursor-pointer block">
                {budgetDocument ? (
                  // File uploaded state
                  <div className="space-y-3 animate-fade-in">
                    <div className="relative inline-block">
                      <FileCheck className="w-12 h-12 text-green-600 mx-auto animate-bounce" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">✓</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-green-700 mb-1">
                        ¡Archivo cargado exitosamente!
                      </p>
                      <p className="text-sm text-gray-700 font-medium bg-white px-4 py-2 rounded-lg inline-block shadow-sm">
                        📄 {budgetDocument.name}
                      </p>
                      {budgetDocument.name.endsWith(".csv") && (
                        <p className="text-xs text-green-600 mt-2 font-medium">
                          ✨ Tabla actualizada automáticamente
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setBudgetDocument(null);
                      }}
                      className="mt-2 text-sm text-gray-600 hover:text-red-600 underline transition-colors"
                    >
                      Cambiar archivo
                    </button>
                  </div>
                ) : isDragging ? (
                  // Dragging state
                  <div className="space-y-3 animate-pulse">
                    <Upload className="w-12 h-12 text-[#07234B] mx-auto animate-bounce" />
                    <div>
                      <p className="text-lg font-bold text-[#07234B]">
                        ¡Suelta el archivo aquí! 🎯
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Archivo listo para cargar
                      </p>
                    </div>
                  </div>
                ) : (
                  // Default state
                  <div className="space-y-3">
                    <div className="relative inline-block">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto transition-transform hover:scale-110" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#07234B] rounded-full flex items-center justify-center">
                        <Plus className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-gray-700">
                        Haga clic para subir o arrastre el archivo aquí
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        PDF, Excel, Word, CSV (máx. 10MB)
                      </p>
                    </div>
                  </div>
                )}
              </label>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 text-sm">
              <span className="text-gray-600">¿No tienes un formato?</span>
              <a
                href="/templates/presupuesto_ejemplo.csv"
                download="presupuesto_ejemplo.csv"
                className="text-[#07234B] hover:text-[#0a2d5f] font-medium underline flex items-center gap-1"
              >
                📥 Descargar plantilla CSV de ejemplo
              </a>
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
            className="px-6 py-2 bg-[#07234B] text-white rounded-lg hover:bg-[#0a2d5f] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            <span>{loading ? "⏳" : "📋"}</span>
            {loading ? "Creando..." : "Crear Proyecto"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateProject;
