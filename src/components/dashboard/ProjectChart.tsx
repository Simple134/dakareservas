"use client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { BudgetChart } from "@/src/components/charts/BudgetChart";
import { ProjectStatusChart } from "@/src/components/charts/ProjectStatusChart";
import { useGestiono } from "@/src/context/Gestiono";

export function ProjectChart() {
  const { pendingRecords, divisions } = useGestiono();

  // Transform pendingRecords for BudgetChart
  // Map items to: Name (Reference/Desc), Budget (Amount), Executed (Paid)
  const castedPendingRecords = pendingRecords as unknown;
  const data: any = (Array.isArray(castedPendingRecords) && castedPendingRecords.length === 0)
    ? null
    : castedPendingRecords;

  const items = data?.items || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Facturado vs Cobrado (Últimos Registros)</CardTitle>
        </CardHeader>
        <CardContent>
          <BudgetChart records={items} divisions={divisions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Estado de Facturas</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectStatusChart records={items} />
        </CardContent>
      </Card>
    </div>
  );
}
