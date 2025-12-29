"use client";

import {
  Building2,
  BarChart,
  Users,
  Settings,
  Home,
  Package,
  Receipt,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/src/lib/utils";

const mainMenuItems = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: Home,
    id: "dashboard",
  },
  {
    title: "Contactos",
    url: "/admin/contacts",
    icon: Users,
    id: "contacts",
  },
  {
    title: "Items",
    url: "/admin/items",
    icon: Package,
    id: "items",
  },
  {
    title: "Facturas",
    url: "/admin/invoice",
    icon: Receipt,
    id: "invoice",
  },
  {
    title: "Reportes",
    url: "/admin/reports",
    icon: BarChart,
    id: "reports",
  },
  {
    title: "Configuración",
    url: "/admin/settings",
    icon: Settings,
    id: "settings",
  },
];

interface AppSidebarProps {
  currentView?: string;
  onNavigate?: (view: string) => void;
}

export function AppSidebar({ currentView, onNavigate }: AppSidebarProps) {
  const router = useRouter();

  const handleNav = (viewId: string, url: string) => {
    if (onNavigate) {
      onNavigate(viewId);
    } else {
      router.push(url);
    }
  };

  return (
    <aside className="w-64 h-screen bg-[#07234B] text-white flex flex-col border-r border-[#1a3a5c] fixed left-0 top-0 z-50">
      <div className="h-16 flex items-center px-4 border-b border-[#1a3a5c]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-[#0F2744]" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm leading-none">DAKA ERP</span>
            <span className="text-[10px] text-white/70 leading-none mt-1">
              Sistema de Construcción
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {/* Main Menu Group */}
        <div className="space-y-2">
          <h5 className="px-2 text-xs font-semibold text-white/50 tracking-wider">
            Menú Principal
          </h5>
          <nav className="space-y-1">
            {mainMenuItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  style={{
                    borderRadius: "10px",
                  }}
                  key={item.id}
                  onClick={() => handleNav(item.id, item.url)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-2 text-sm font-medium transition-colors duration-200",
                    isActive
                      ? "bg-white/10 text-white shadow-sm font-bold"
                      : "text-white/70 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-4 h-4",
                      isActive ? "text-white" : "text-white/70",
                    )}
                  />
                  <span>{item.title}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Projects Section - Commented out but refactored structure kept for reference */}
        {/* 
                <div className="space-y-2">
                    <h3 className="px-2 text-xs font-semibold text-white/50 uppercase tracking-wider">
                        Proyectos
                    </h3>
                    <div className="space-y-1">
                         <button className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-white/70 rounded-lg hover:bg-white/5 hover:text-white">
                            <div className="flex items-center gap-3">
                                <Building2 className="w-4 h-4" />
                                <span>Mis Proyectos</span>
                            </div>
                            <ChevronRight className="w-4 h-4" />
                         </button>
                    </div>
                </div> 
                */}
      </div>
      <div className="p-4 border-t border-[#1a3a5c]">
        <p className="text-xs text-white/40 text-center">
          v1.0.0 - DAKA Construction ERP
        </p>
      </div>
    </aside>
  );
}
