"use client";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Plus, Users, DollarSign, Clock, User } from "lucide-react";
import { AddPersonnelDialog } from "./AddPersonnelDialog";

interface PersonnelModuleProps {
  projectId: string | number;
}

interface Labor {
  id: string;
  contractor_name: string;
  work_description: string;
  total_amount: number;
  payment_date: string | null;
  payment_status: string | null;
  work_date: string;
}

export function PersonnelModule({ projectId }: PersonnelModuleProps) {
  const [personnel, setPersonnel] = useState<Labor[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPersonnel = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/gestiono/pendingRecord?divisionId=${projectId}&type=PAYROLL&isSell=false`
      );

      if (response.ok) {
        const data = await response.json();
        console.log("📋 Personnel data:", data);

        // Transform the data to match Labor interface
        const transformedData = (data.data || []).map((record: any) => ({
          id: record.id,
          contractor_name: record.beneficiary?.name || "Desconocido",
          work_description: record.elements?.[0]?.description || "Sin descripción",
          total_amount: record.elements?.[0]?.price || 0,
          payment_date: record.paymentDate || null,
          payment_status: record.paymentDate ? "paid" : "pending",
          work_date: record.date,
        }));

        setPersonnel(transformedData);
      }
    } catch (error) {
      console.error("Error fetching personnel:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchPersonnel();
    }
  }, [projectId]);

  const handleDialogSuccess = () => {
    fetchPersonnel();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("es-DO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const totalGross = personnel.reduce(
    (sum, person) => sum + Number(person.total_amount),
    0,
  );
  const totalTax = totalGross * 0.02; // Asumiendo 2% de retención
  const totalNet = totalGross - totalTax;
  const paidCount = personnel.filter((p) => p.payment_status === "paid").length;
  const pendingCount = personnel.filter(
    (p) => p.payment_status === "pending",
  ).length;

  return (
    <div className="space-y-6">
      {/* Resumen de Personal */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Personal</p>
                <p className="text-2xl font-bold">{personnel.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Monto Bruto</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalGross)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Retenciones</p>
                <p className="text-2xl font-bold">{formatCurrency(totalTax)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Monto Neto</p>
                <p className="text-2xl font-bold">{formatCurrency(totalNet)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas de Pagos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estado de Pagos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Pagos Realizados
                </span>
                <Badge variant="default">{paidCount} trabajadores</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Pagos Pendientes
                </span>
                <Badge variant="destructive">{pendingCount} trabajadores</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Retención ISR (2%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Total Retenido
                </span>
                <span className="font-medium">{formatCurrency(totalTax)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  % del Total
                </span>
                <span className="font-medium">
                  {((totalTax / totalGross) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Personal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Planilla de Personal</CardTitle>
            <Button size="sm" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Trabajador
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trabajador</TableHead>
                <TableHead>Cédula</TableHead>
                <TableHead>Especialidad</TableHead>
                <TableHead>Tarea</TableHead>
                <TableHead className="text-right">Monto Bruto</TableHead>
                <TableHead className="text-right">Retención</TableHead>
                <TableHead className="text-right">Monto Neto</TableHead>
                <TableHead>Fecha Pago</TableHead>
                <TableHead className="text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {personnel.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-muted-foreground py-8"
                  >
                    No hay registros de mano de obra para este proyecto
                  </TableCell>
                </TableRow>
              ) : (
                personnel.map((person) => {
                  const grossAmount = Number(person.total_amount);
                  const taxWithholding = grossAmount * 0.02;
                  const netAmount = grossAmount - taxWithholding;

                  return (
                    <TableRow key={person.id}>
                      <TableCell className="font-medium">
                        {person.contractor_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">-</TableCell>
                      <TableCell>
                        <Badge variant="outline">Contratista</Badge>
                      </TableCell>
                      <TableCell>{person.work_description}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(grossAmount)}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {formatCurrency(taxWithholding)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(netAmount)}
                      </TableCell>
                      <TableCell>
                        {person.payment_date
                          ? formatDate(new Date(person.payment_date))
                          : "Pendiente"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            person.payment_status === "paid"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {person.payment_status === "paid"
                            ? "Pagado"
                            : "Pendiente"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Personnel Dialog */}
      <AddPersonnelDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        projectId={projectId}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
