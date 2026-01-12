"use client";

import { useParams, useRouter } from "next/navigation";
import {
  CalendarDays,
  MapPin,
  DollarSign,
  TrendingUp,
  Receipt,
  FileText,
  Calculator,
  CreditCard,
  Banknote,
  ShoppingCart,
  HardHat,
  Users,
  Briefcase,
  TrendingDown,
  ChevronDown,
  Check,
  Loader2,
} from "lucide-react";
import { BudgetModule } from "@/src/components/project/BudgetModule";
import { FinancesModule } from "@/src/components/project/FinancesModule";
import { useState, useRef, useEffect } from "react";
import { CreateInvoiceDialog } from "@/src/components/dashboard/CreateInvoice";
import { CustomSelect } from "@/src/components/project/CustomSelect";
import {
  CustomBadge,
  CustomButton,
  CustomCard,
} from "@/src/components/project/CustomCard";
import { GestionoDivisionWithBalance } from "@/src/types/gestiono";
import { MaterialsModule } from "@/src/components/project/MaterialsModule";
import { PersonnelModule } from "@/src/components/project/PersonnelModule";

const sections = [
  {
    value: "presupuesto-general",
    label: "Presupuesto General",
    icon: Calculator,
  },
  {
    value: "costos-indirectos",
    label: "Costos Indirectos",
    icon: TrendingDown,
  },
  { value: "facturacion", label: "Facturación", icon: FileText },
  { value: "ingresos-pagos", label: "Ingresos/Pagos", icon: Banknote },
  { value: "gastos", label: "Gastos", icon: CreditCard },
  { value: "materiales", label: "Materiales", icon: ShoppingCart },
  { value: "contrataciones", label: "Contrataciones", icon: Briefcase },
  { value: "mano-obra", label: "Mano de Obra", icon: HardHat },
  { value: "retiro-comercial", label: "Retiro Comercial", icon: Users },
];

export default function ProjectOverview() {
  const params = useParams();
  const projectId = params?.id as string;
  const router = useRouter();

  const [division, setDivision] = useState<GestionoDivisionWithBalance | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState("presupuesto-general");
  const selectRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);

  useEffect(() => {
    const fetchDivision = async () => {
      if (!projectId) return;
      setIsLoading(true);
      try {
        const res = await fetch(`/api/gestiono/divisions/${projectId}`);
        if (res.ok) {
          const data = await res.json();
          const divData = Array.isArray(data) ? data[0] : data;
          setDivision(divData);
        } else {
          console.error("Failed to fetch division");
        }
      } catch (error) {
        console.error("Error fetching division:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDivision();
  }, [projectId]);

  const project = division
    ? {
        id: division.id,
        name: division.name,
        client: division.metadata?.client || "Cliente Desconocido",
        location: division.metadata?.location || "Ubicación desconocida",
        status: division.metadata?.status || "planning",
        totalBudget: division.metadata?.budget || 0,
        executedBudget: division.monthlyExpenses || 0, // Using monthlyExpenses as a proxy for now
        completionPercentage: division.metadata?.completionPercentage || 0,
        profitMargin: division.metadata?.profitMargin || 0,
        startDate: division.metadata?.startDate || new Date().toISOString(),
        endDate: division.metadata?.endDate || new Date().toISOString(),
      }
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold text-gray-800">
          Proyecto no encontrado
        </h1>
        <CustomButton onClick={() => router.back()}>Volver</CustomButton>
      </div>
    );
  }

  // Status helpers...
  const getStatusColor = (status: string) => {
    switch (status) {
      case "planning":
        return "bg-yellow-500 text-white hover:bg-yellow-600";
      case "execution":
        return "bg-green-500 text-white hover:bg-green-600";
      case "completed":
        return "bg-blue-500 text-white hover:bg-blue-600";
      default:
        return "bg-gray-500 text-white hover:bg-gray-600";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "planning":
        return "Planificación";
      case "execution":
        return "Ejecución";
      case "completed":
        return "Completado";
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat("es-DO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      <main className="flex-1 p-6 space-y-6 animate-fade-in">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {project?.name}
            </h1>
            <p className="text-gray-500 mt-1">Cliente: {project?.client}</p>
            <div className="flex items-center gap-2 mt-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">{project?.location}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CustomBadge
              className={getStatusColor(project?.status || "planning")}
            >
              {getStatusText(project?.status || "planning")}
            </CustomBadge>
            <CustomButton
              onClick={() => setIsInvoiceDialogOpen(true)}
              className="bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            >
              <Receipt className="w-4 h-4 mr-2" />
              Nueva Factura
            </CustomButton>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <CustomCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Presupuesto Total
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(project?.totalBudget || 0)}
                </p>
              </div>
            </div>
          </CustomCard>

          <CustomCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-full">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Ejecutado</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(project?.executedBudget || 0)}
                </p>
              </div>
            </div>
          </CustomCard>

          <CustomCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 rounded-full">
                <CalendarDays className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Progreso</p>
                <p className="text-2xl font-bold text-gray-900">
                  {project?.completionPercentage || 0}%
                </p>
              </div>
            </div>
          </CustomCard>

          <CustomCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-50 rounded-full">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Margen</p>
                <p className="text-2xl font-bold text-gray-900">
                  {project?.profitMargin || 0}%
                </p>
              </div>
            </div>
          </CustomCard>
        </div>

        <CustomCard className="p-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">
              Cronograma del Proyecto
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Progreso General</span>
                <span className="font-medium text-gray-900">
                  {project?.completionPercentage || 0}%
                </span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-500 ease-in-out"
                  style={{ width: `${project?.completionPercentage || 0}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>
                  Inicio:{" "}
                  {formatDate(project?.startDate || new Date().toISOString())}
                </span>
                <span>
                  Fin:{" "}
                  {formatDate(project?.endDate || new Date().toISOString())}
                </span>
              </div>
            </div>
          </div>
        </CustomCard>

        <CustomCard className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              Secciones del Proyecto
            </h3>
            <CustomSelect
              value={selectedSection}
              onChange={setSelectedSection}
              options={sections}
              ref={selectRef as React.RefObject<HTMLDivElement>}
              isOpen={isOpen}
              setIsOpen={setIsOpen}
            />
          </div>
        </CustomCard>

        {/* Dynamic Content */}
        <div className="space-y-6">
          {selectedSection === "presupuesto-general" && (
            <BudgetModule projectId={project?.id ?? 0} />
          )}

          {selectedSection === "costos-indirectos" && (
            <CustomCard className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">
                  Costos Indirectos
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-sm text-gray-500">
                    Gastos Administrativos
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency((project?.totalBudget || 0) * 0.05)}
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-sm text-gray-500">Seguros y Permisos</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency((project?.totalBudget || 0) * 0.03)}
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-sm text-gray-500">Imprevistos</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency((project?.totalBudget || 0) * 0.02)}
                  </p>
                </div>
              </div>
            </CustomCard>
          )}

          {selectedSection === "facturacion" && (
            <FinancesModule projectId={project?.id ?? 0} />
          )}

          {selectedSection === "ingresos-pagos" && (
            <CustomCard className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">
                  Ingresos y Pagos
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3 text-green-600">Ingresos</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between p-2 bg-green-50 rounded">
                      <span className="text-gray-600">Pago inicial</span>
                      <span className="font-bold text-green-700">
                        +{formatCurrency((project?.totalBudget || 0) * 0.3)}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-green-50 rounded">
                      <span className="text-gray-600">Avance 50%</span>
                      <span className="font-bold text-green-700">
                        +{formatCurrency((project?.totalBudget || 0) * 0.4)}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3 text-red-600">Egresos</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between p-2 bg-red-50 rounded">
                      <span className="text-gray-600">Materiales</span>
                      <span className="font-bold text-red-700">
                        -{formatCurrency((project?.executedBudget || 0) * 0.6)}
                      </span>
                    </div>
                    <div className="flex justify-between p-2 bg-red-50 rounded">
                      <span className="text-gray-600">Mano de obra</span>
                      <span className="font-bold text-red-700">
                        -{formatCurrency((project?.executedBudget || 0) * 0.3)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CustomCard>
          )}
          {selectedSection === "gastos" && (
            <CustomCard className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Gastos</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                  <span className="text-gray-700">Total de Gastos</span>
                  <span className="font-bold text-red-600">
                    {formatCurrency(project?.executedBudget || 0)}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-gray-100 rounded-lg bg-gray-50 text-center">
                    <p className="text-sm text-gray-500 mb-1">Materiales</p>
                    <p className="font-bold text-gray-900">
                      {formatCurrency((project?.executedBudget || 0) * 0.6)}
                    </p>
                  </div>
                  <div className="p-4 border border-gray-100 rounded-lg bg-gray-50 text-center">
                    <p className="text-sm text-gray-500 mb-1">Mano de obra</p>
                    <p className="font-bold text-gray-900">
                      {formatCurrency((project?.executedBudget || 0) * 0.3)}
                    </p>
                  </div>
                  <div className="p-4 border border-gray-100 rounded-lg bg-gray-50 text-center">
                    <p className="text-sm text-gray-500 mb-1">Equipos</p>
                    <p className="font-bold text-gray-900">
                      {formatCurrency((project?.executedBudget || 0) * 0.1)}
                    </p>
                  </div>
                  <div className="p-4 border border-gray-100 rounded-lg bg-gray-50 text-center">
                    <p className="text-sm text-gray-500 mb-1">Otros</p>
                    <p className="font-bold text-gray-900">
                      {formatCurrency((project?.executedBudget || 0) * 0.05)}
                    </p>
                  </div>
                </div>
              </div>
            </CustomCard>
          )}
          {selectedSection === "materiales" && (
            <MaterialsModule projectId={projectId} />
          )}
          {selectedSection === "contrataciones" && (
            <CustomCard className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Contrataciones</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 border rounded-lg bg-white">
                  <div>
                    <p className="font-medium text-gray-900">
                      Constructora ABC
                    </p>
                    <p className="text-sm text-gray-500">
                      Estructura principal
                    </p>
                  </div>
                  <CustomBadge className="bg-green-100 text-green-700">
                    Activo
                  </CustomBadge>
                </div>
                <div className="flex justify-between items-center p-4 border rounded-lg bg-white">
                  <div>
                    <p className="font-medium text-gray-900">
                      Instalaciones XYZ
                    </p>
                    <p className="text-sm text-gray-500">
                      Electricidad y plomería
                    </p>
                  </div>
                  <CustomBadge className="bg-yellow-100 text-yellow-700">
                    Pendiente
                  </CustomBadge>
                </div>
              </div>
            </CustomCard>
          )}

          {selectedSection === "mano-obra" && (
            <PersonnelModule projectId={project?.id ?? ""} />
          )}

          {selectedSection === "retiro-comercial" && (
            <CustomCard className="p-6">
              <div className="mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">
                  Retiro Comercial
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
                  <p className="text-sm text-gray-500">Ganancia Estimada</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(
                      (project?.totalBudget || 0) *
                        ((project?.profitMargin || 0) / 100),
                    )}
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm text-gray-500">Retiros Realizados</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrency((project?.totalBudget || 0) * 0.05)}
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <p className="text-sm text-gray-500">Disponible</p>
                  <p className="text-xl font-bold text-purple-600">
                    {formatCurrency(
                      (project?.totalBudget || 0) *
                        ((project?.profitMargin || 0) / 100) -
                        (project?.totalBudget || 0) * 0.05,
                    )}
                  </p>
                </div>
              </div>
            </CustomCard>
          )}
          <CreateInvoiceDialog
            isOpen={isInvoiceDialogOpen}
            onClose={() => setIsInvoiceDialogOpen(false)}
          />
        </div>
      </main>
    </div>
  );
}
