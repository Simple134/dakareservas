"use client";

import { useEffect, Suspense } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "next/navigation";
import { DashboardView } from "@/src/components/dashboard/DashboardView";

function AdminPageContent() {
  const { user: session, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !session) {
      router.push("/login");
    }
  }, [authLoading, session, router]);

  if (!session) {
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
