import { Plus, Check } from "lucide-react";

interface BudgetModuleProps {
  projectId: string | number;
}

export function BudgetModule({ projectId }: BudgetModuleProps) {
  // Mock data
  const budgetItems = [
    {
      id: 1,
      category: "Preparación",
      description: "Demolición y Preparación",
      budgeted: 5000,
      executed: 5000,
      status: "completed",
    },
    {
      id: 2,
      category: "Construcción",
      description: "Divisiones y Drywall",
      budgeted: 8000,
      executed: 8000,
      status: "completed",
    },
    {
      id: 3,
      category: "Electricidad",
      description: "Sistema Eléctrico",
      budgeted: 10000,
      executed: 10000,
      status: "completed",
    },
    {
      id: 4,
      category: "HVAC",
      description: "Aire Acondicionado",
      budgeted: 12000,
      executed: 8750,
      status: "in-progress",
    },
    {
      id: 5,
      category: "Acabados",
      description: "Pintura y Acabados",
      budgeted: 6000,
      executed: 2000,
      status: "in-progress",
    },
    {
      id: 6,
      category: "Mobiliario",
      description: "Mobiliario",
      budgeted: 4000,
      executed: 0,
      status: "pending",
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#131E29] text-white">
            Ejecutado
          </span>
        );
      case "in-progress":
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#131E29] text-white">
            Ejecutado
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
            Presupuestado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const getProgress = (budgeted: number, executed: number) => {
    if (budgeted === 0) return 0;
    return Math.min(100, Math.round((executed / budgeted) * 100));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-6 flex flex-row items-center justify-between border-b border-gray-100">
        <h3 className="font-semibold text-lg text-gray-900">
          Desglose por Partidas
        </h3>
        <button
          style={{ borderRadius: "1rem" }}
          className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2 bg-[#131E29] text-white hover:bg-[#1a2b3c]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Partida
        </button>
      </div>
      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 font-medium text-gray-500 text-sm">
                  Categoría
                </th>
                <th className="text-left py-3 font-medium text-gray-500 text-sm">
                  Descripción
                </th>
                <th className="text-right py-3 font-medium text-gray-500 text-sm">
                  Presupuestado
                </th>
                <th className="text-right py-3 font-medium text-gray-500 text-sm">
                  Ejecutado
                </th>
                <th className="text-left py-3 font-medium text-gray-500 text-sm pl-6">
                  Progreso
                </th>
                <th className="text-right py-3 font-medium text-gray-500 text-sm">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody>
              {budgetItems.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="py-4 font-medium text-gray-900 text-sm">
                    {item.category}
                  </td>
                  <td className="py-4 text-gray-500 text-sm">
                    {item.description}
                  </td>
                  <td className="py-4 text-right font-medium text-gray-900 text-sm">
                    {formatCurrency(item.budgeted)}
                  </td>
                  <td className="py-4 text-right text-gray-900 text-sm">
                    {formatCurrency(item.executed)}
                  </td>
                  <td className="py-4 pl-6 w-32">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#131E29] rounded-full"
                          style={{
                            width: `${getProgress(item.budgeted, item.executed)}%`,
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 min-w-[2rem]">
                        {getProgress(item.budgeted, item.executed)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    {getStatusBadge(item.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
