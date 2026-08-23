"use client";

import { ReactNode, useState, useEffect } from "react";
import { AppSidebar, DakaMark } from "@/src/components/AppSidebar";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Loader2 } from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";
import { PAYMENT_GATED } from "@/src/config/paymentGate";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, role, loading, roleLoaded } = useAuth();

  useEffect(() => {
    if (!loading && roleLoaded) {
      if (!user || role !== "admin") {
        router.replace("/login");
      }
    }
  }, [user, role, loading, roleLoaded, router]);

  if (loading || !roleLoaded || !user || role !== "admin") {
    return null;
  }

  // Determine current view based on pathname
  const getCurrentView = () => {
    if (pathname === "/admin") return "dashboard";
    if (pathname.includes("/contacts")) return "contacts";
    if (pathname.includes("/items")) return "items";
    if (pathname.includes("/invoice")) return "invoice";
    if (pathname.includes("/reports")) return "reports";
    if (pathname.includes("/settings")) return "settings";
    if (pathname.includes("/projects/")) {
      const parts = pathname.split("/projects/");
      return `project-${parts[1]?.split("/")[0]}`;
    }
    return "dashboard";
  };

  return (
    <div className="min-h-dvh bg-paper-2">
      {/* Barra móvil: sólo por debajo de lg, donde el side-rail está oculto */}
      <nav className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-shell-3 bg-shell px-4 text-white lg:hidden">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="-ml-2 rounded-[8px] p-2 text-white/75 transition-colors duration-[120ms] hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 items-center">
          <DakaMark />
        </div>
      </nav>

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-[oklch(21%_0.021_250_/_0.45)] backdrop-blur-[2px] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <AppSidebar
        currentView={getCurrentView()}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <main className="min-w-0 pt-14 lg:ml-64 lg:pt-0">
        {PAYMENT_GATED ? (
          <div className="flex h-dvh items-center justify-center">
            <Loader2
              className="h-7 w-7 animate-spin text-gold"
              aria-label="Cargando"
            />
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
