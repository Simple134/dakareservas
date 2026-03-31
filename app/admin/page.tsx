"use client";

import { useEffect, Suspense } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "next/navigation";
import { DashboardView } from "@/src/components/dashboard/DashboardView";

function AdminPageContent() {
  const { user: session, loading: authLoading, role, roleLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && roleLoaded) {
      if (!session || role !== "admin") {
        router.push("/login");
      }
    }
  }, [authLoading, session, role, roleLoaded, router]);

  if (authLoading || !roleLoaded || !session || role !== "admin") {
    return null;
  }

  return <DashboardView />;
}

export default function AdminPage() {
  return (
    <Suspense>
      <AdminPageContent />
    </Suspense>
  );
}
