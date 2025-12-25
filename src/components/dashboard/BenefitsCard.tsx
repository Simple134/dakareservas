import { AlertTriangle } from "lucide-react";

interface BenefitsCardProps {
  title: string;
  totalProjects: number;
  totalRevenue: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  targetMargin: number;
  monthlyGrowth: number;
  projectedAnnualProfit: number;
}

export function BenefitsCard({
  title,
  totalRevenue,
  totalCosts,
  netProfit,
  profitMargin,
  targetMargin,
  monthlyGrowth,
  projectedAnnualProfit,
  totalProjects,
}: BenefitsCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="col-span-full space-y-6">
      <h3 className="text-xl font-bold flex items-center gap-2">
        <span className="text-green-600">$</span> {title}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Net Profit - More vibrant green */}
        <div className="bg-gradient-to-br from-green-50 to-green-100/50 border-none rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm">
          <span className="text-3xl font-bold text-green-700">
            {formatCurrency(netProfit)}
          </span>
          <span className="text-sm text-green-600 font-semibold mt-2">
            Ganancia Neta
          </span>
        </div>

        {/* Total Revenue - Richer blue */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-none rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm">
          <span className="text-3xl font-bold text-blue-700">
            {formatCurrency(totalRevenue)}
          </span>
          <span className="text-sm text-blue-600 font-semibold mt-2">
            Ingresos Totales
          </span>
        </div>

        {/* Margin - More saturated purple */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-none rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm">
          <span className="text-3xl font-bold text-purple-700">
            {profitMargin.toFixed(1)}%
          </span>
          <span className="text-sm text-purple-600 font-semibold mt-2">
            Margen de Beneficio
          </span>
        </div>

        {/* Active Projects - Warmer orange */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-none rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm">
          <span className="text-3xl font-bold text-orange-700">
            {totalProjects}
          </span>
          <span className="text-sm text-orange-600 font-semibold mt-2">
            Proyectos Activos
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-white p-6 rounded-2xl border shadow-sm">
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold">Margen vs Objetivo</span>
            <span className="text-xs bg-gray-100 px-3 py-1 rounded-full font-medium">
              Cerca
            </span>
          </div>
          <div className="relative h-4 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-[#1e293b] rounded-full transition-all duration-300"
              style={{ width: `${(profitMargin / targetMargin) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>Actual: {profitMargin.toFixed(1)}%</span>
            <span>Objetivo: {targetMargin}%</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold">Crecimiento Mensual</span>
            <span className="text-xs text-green-600 font-bold">
              +{monthlyGrowth}%
            </span>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(projectedAnnualProfit)}
            </span>
            <span className="text-xs text-gray-500 mt-1">Proyección Anual</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border shadow-sm">
        <h4 className="font-bold text-sm mb-4 flex items-center gap-2">
          <span className="text-lg">💰</span> Desglose Financiero
        </h4>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span>Ingresos Totales:</span>
            <span className="font-bold text-green-600">
              {formatCurrency(totalRevenue)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Costos Totales:</span>
            <span className="font-bold text-red-500">
              -{formatCurrency(totalCosts)}
            </span>
          </div>
          <div className="border-t pt-3 mt-3 flex justify-between">
            <span className="font-bold">Ganancia Neta:</span>
            <span className="font-bold text-green-600 text-base">
              {formatCurrency(netProfit)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3">
        <AlertTriangle className="text-yellow-600 w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-yellow-800">Recomendación:</p>
          <p className="text-sm text-yellow-700">
            El margen está cerca del objetivo. Considera optimizar costos o
            renegociar precios.
          </p>
        </div>
      </div>
    </div>
  );
}
