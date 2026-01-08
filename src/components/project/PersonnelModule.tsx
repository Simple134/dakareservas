import { HardHat } from "lucide-react";

interface PersonnelModuleProps {
  projectId: string | number;
}

export function PersonnelModule({ projectId }: PersonnelModuleProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-100">
        <h3 className="flex items-center gap-2 font-semibold text-lg text-gray-900">
          <HardHat className="w-5 h-5 text-gray-500" />
          Mano de Obra
        </h3>
      </div>
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <HardHat className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-sm">Módulo de mano de obra en construcción</p>
        </div>
      </div>
    </div>
  );
}
