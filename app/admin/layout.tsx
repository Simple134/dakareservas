"use client";

import { ReactNode, useState, useEffect } from "react";
import { AppSidebar } from "@/src/components/AppSidebar";
import { usePathname, useRouter } from "next/navigation";
import { Menu, Building2, Loader2 } from "lucide-react";
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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Navbar - Only visible on small screens */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#07234B] text-white flex items-center px-4 z-40 border-b border-[#1a3a5c]">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2 ml-3">
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
      </nav>

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
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
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
        {PAYMENT_GATED ? (
          <div className="flex items-center justify-center h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-[#A9780F]" />
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
