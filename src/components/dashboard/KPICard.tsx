import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import * as LucideIcons from "lucide-react";

export type KPI = {
  title: string;
  value: string | number;
  change: number;
  changeType: "positive" | "negative" | "neutral";
  icon: string;
  color: "primary" | "success" | "warning" | "info";
};

interface KPICardProps {
  kpi: KPI;
}

export function KPICard({ kpi }: KPICardProps) {
  const IconComponent = (LucideIcons as any)[kpi.icon] || LucideIcons.BarChart;

  const getChangeColor = () => {
    if (kpi.changeType === "positive") return "text-green-600";
    if (kpi.changeType === "negative") return "text-red-600";
    return "text-gray-600";
  };

  const getBorderColor = () => {
    switch (kpi.color) {
      case "success":
        return "border-l-green-500";
      case "warning":
        return "border-l-yellow-500";
      case "info":
        return "border-l-blue-500";
      default:
        return "border-l-[#0F2744]";
    }
  };

  const getIconBgColor = () => {
    switch (kpi.color) {
      case "success":
        return "bg-green-50";
      case "warning":
        return "bg-yellow-50";
      case "info":
        return "bg-blue-50";
      default:
        return "bg-slate-100";
    }
  };

  const getIconColor = () => {
    switch (kpi.color) {
      case "success":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "info":
        return "text-blue-600";
      default:
        return "text-[#0F2744]";
    }
  };

  const renderChangeIcon = () => {
    const iconClass = "w-4 h-4";
    if (kpi.changeType === "positive") return <TrendingUp className={iconClass} />;
    if (kpi.changeType === "negative") return <TrendingDown className={iconClass} />;
    return <Minus className={iconClass} />;
  };

  return (
    <div
      className={`
                bg-white rounded-xl border-l-4 ${getBorderColor()} p-3 shadow-sm hover:shadow-md transition-shadow duration-200
            `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div className={`${getIconBgColor()} p-3 rounded-lg`}>
            <IconComponent className={`w-5 h-5 ${getIconColor()}`} />
          </div>
          <div className="flex flex-col">
            <p className="text-sm font-medium text-gray-600 mb-1">
              {kpi.title}
            </p>
            <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
          </div>
        </div>

        <div className={`flex items-center gap-1 ${getChangeColor()}`}>
          {renderChangeIcon()}
          <span className="text-sm font-semibold">{Math.abs(kpi.change)}%</span>
        </div>
      </div>
    </div>
  );
}
