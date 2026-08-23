"use client";

import {
  BarChart,
  Users,
  Settings,
  Home,
  Package,
  Receipt,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { cn } from "@/src/lib/utils";
import { useErp } from "@/src/context/ErpContext";

/* Hallmark · genre: modern-minimal · nav: N3 side-rail · design-system: design.md
 *
 * El oro marca exclusivamente el destino activo — es el único acento del rail y
 * se mantiene muy por debajo del 5 % del viewport. Los proyectos se distinguen
 * por su inicial, no por un icono de edificio repetido veinte veces.
 */

const mainMenuItems = [
  { title: "Dashboard", url: "/admin", icon: Home, id: "dashboard" },
  { title: "Contactos", url: "/admin/contacts", icon: Users, id: "contacts" },
  { title: "Items", url: "/admin/items", icon: Package, id: "items" },
  { title: "Facturas", url: "/admin/invoice", icon: Receipt, id: "invoice" },
  { title: "Reportes", url: "/admin/reports", icon: BarChart, id: "reports" },
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
  isOpen?: boolean;
  onClose?: () => void;
}

export function DakaMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative block h-7 w-[70px] shrink-0", className)}>
      <Image src="/daka2.png" alt="Daka Dominicana" width={70} height={70} />
    </span>
  );
}

export function AppSidebar({
  currentView,
  onNavigate,
  isOpen = true,
  onClose,
}: AppSidebarProps) {
  const router = useRouter();
  const { divisions, isLoading } = useErp();

  const handleNav = (viewId: string, url: string) => {
    if (onNavigate) onNavigate(viewId);
    else router.push(url);
    onClose?.();
  };

  const itemClass = (isActive: boolean) =>
    cn(
      "group relative flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2",
      "text-[0.8125rem] font-medium text-left",
      "transition-colors duration-[120ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
      "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold",
      isActive
        ? "bg-white/[0.09] text-white"
        : "text-white/65 hover:bg-white/[0.05] hover:text-white",
    );

  // Filete de oro a la izquierda: marca el destino activo sin teñir la fila.
  const activeRail = (
    <span
      className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-gold"
      aria-hidden
    />
  );

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 flex h-dvh w-64 flex-col",
        "bg-shell text-white border-r border-shell-3",
        "transition-transform duration-[200ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
        "lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-shell-3 px-4">
        <div className="flex min-w-0 flex-col gap-1">
          <DakaMark />
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="-mr-1 rounded-[8px] p-2 text-white/70 transition-colors duration-[120ms] hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <nav className="space-y-0.5" aria-label="Menú principal">
          <h2 className="px-2.5 pb-2 text-[0.625rem] font-semibold uppercase tracking-[0.09em] text-white/40">
            Menú
          </h2>
          {mainMenuItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id, item.url)}
                aria-current={isActive ? "page" : undefined}
                className={itemClass(isActive)}
              >
                {isActive && activeRail}
                <item.icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors duration-[120ms]",
                    isActive
                      ? "text-gold"
                      : "text-white/50 group-hover:text-white/80",
                  )}
                  strokeWidth={1.75}
                />
                <span className="truncate">{item.title}</span>
              </button>
            );
          })}
        </nav>

        <nav className="space-y-0.5" aria-label="Proyectos activos">
          <h2 className="px-2.5 pb-2 text-[0.625rem] font-semibold uppercase tracking-[0.09em] text-white/40">
            Proyectos
          </h2>
          {isLoading ? (
            // Esqueleto en vez de «Cargando…»: el rail no cambia de altura.
            <div className="space-y-1.5 px-2.5 py-1" aria-busy>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-7 animate-pulse rounded-[8px] bg-white/[0.06]"
                />
              ))}
              <span className="sr-only">Cargando proyectos</span>
            </div>
          ) : divisions.length <= 1 ? (
            <p className="px-2.5 py-2 text-[0.75rem] text-white/40">
              No hay proyectos activos
            </p>
          ) : (
            divisions.slice(1).map((division) => {
              const isActive = currentView === `project-${division.id}`;
              return (
                <button
                  key={division.id}
                  onClick={() => {
                    router.push(`/admin/projects/${division.id}`);
                    onClose?.();
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className={itemClass(isActive)}
                  title={division.name}
                >
                  {isActive && activeRail}
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px]",
                      "text-[0.625rem] font-semibold transition-colors duration-[120ms]",
                      isActive
                        ? "bg-gold text-gold-ink"
                        : "bg-white/[0.08] text-white/60 group-hover:text-white/90",
                    )}
                    aria-hidden
                  >
                    {division.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate">{division.name}</span>
                </button>
              );
            })
          )}
        </nav>
      </div>

      <div className="shrink-0 border-t border-shell-3 px-4 py-3">
        <p className="text-[0.625rem] uppercase tracking-[0.08em] text-white/30">
          ERP de obra · v1.0
        </p>
      </div>
    </aside>
  );
}
