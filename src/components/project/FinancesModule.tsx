import { FileText } from "lucide-react";

interface FinancesModuleProps {
  projectId: string | number;
}

export function FinancesModule({ projectId }: FinancesModuleProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-100">
        <h3 className="flex items-center gap-2 font-semibold text-lg text-gray-900">
          <FileText className="w-5 h-5 text-gray-500" />
          Facturación
        </h3>
      </div>
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <FileText className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-sm">Módulo de facturación en construcción</p>
        </div>
      </div>
    </div>
  );
}
