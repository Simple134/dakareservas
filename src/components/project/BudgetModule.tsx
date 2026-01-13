import { Plus, Check } from "lucide-react";

interface BudgetCategory {
  id: string;
  name: string;
  amount: number;
  percentage: number;
}

interface BudgetModuleProps {
  projectId: string | number;
  categories?: BudgetCategory[];
}

export function BudgetModule({ projectId, categories = [] }: BudgetModuleProps) {
  // Map categories to budget items format
  const budgetItems = categories.map((cat, index) => ({
    id: cat.id || index,
    category: cat.name,
    budgeted: cat.amount,
    executed: 0, // Not tracked in metadata currently
    status: "pending", // Default status
  }));

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
                <th className="text-left py-3 font-medium text-gray-500 text-sm w-[30%]">
                  Categoría
                </th>
                <th className="text-left py-3 font-medium text-gray-500 text-sm w-[20%]">
                  Presupuestado
                </th>
                <th className="text-left py-3 font-medium text-gray-500 text-sm w-[30%]">
                  Progreso
                </th>
                <th className="text-left py-3 font-medium text-gray-500 text-sm w-[20%]">
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
                  <td className="py-4 text-left font-medium text-gray-900 text-sm">
                    {formatCurrency(item.budgeted)}
                  </td>
                  <td className="py-4 w-[30%]">
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
                  <td className="py-4 text-left">
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
