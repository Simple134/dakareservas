"use client";

import { ReactNode } from "react";
import { AppSidebar } from "@/src/components/AppSidebar";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Determine current view based on pathname
  const getCurrentView = () => {
    if (pathname === "/admin") return "dashboard";
    if (pathname.includes("/contacts")) return "contacts";
    if (pathname.includes("/items")) return "items";
    if (pathname.includes("/invoice")) return "invoice";
    if (pathname.includes("/reports")) return "reports";
    if (pathname.includes("/settings")) return "settings";
    return "dashboard";
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AppSidebar currentView={getCurrentView()} />
      <main className="flex-1 ml-64">{children}</main>
    </div>
  );
}
