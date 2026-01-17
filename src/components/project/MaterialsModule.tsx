"use client";
import { useState, useEffect } from "react";
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
import { Plus, Package, Truck, AlertCircle, CheckCircle } from "lucide-react";
import { CreateMaterialDialog } from "./CreateMaterialDialog";

interface Material {
  id: string;
  supplier_name: string | null;
  item_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  purchase_date: string;
  category: string;
  status: string | null;
}

interface MaterialsModuleProps {
  projectId: string;
}

export function MaterialsModule({ projectId }: MaterialsModuleProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const totalSpent = materials.reduce(
    (sum, material) => sum + Number(material.total_price),
    0,
  );
  const deliveredCount = materials.filter(
    (m) => m.status === "delivered",
  ).length;
  const pendingCount = materials.filter(
    (m) => m.status === "ordered" || m.status === "pending",
  ).length;

  const getDeliveryIcon = (status: string | null) => {
    switch (status) {
      case "delivered":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "ordered":
      case "pending":
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case "in_transit":
        return <Truck className="w-4 h-4 text-blue-600" />;
      default:
        return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  const getDeliveryText = (status: string | null) => {
    switch (status) {
      case "delivered":
        return "Entregado";
      case "ordered":
        return "Ordenado";
      case "pending":
        return "Pendiente";
      case "in_transit":
        return "En tránsito";
      default:
        return "N/A";
    }
  };

  // if (isLoading) {
  //   return (
  //     <div className="flex items-center justify-center p-12">
  //       <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  //     </div>
  //   );
  // }

  return (
    <div className="space-y-6">
      {/* Resumen de Materiales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Gastado</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalSpent)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Entregados</p>
                <p className="text-2xl font-bold">{deliveredCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <Truck className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Proveedores</p>
                <p className="text-2xl font-bold">
                  {new Set(materials.map((m) => m.supplier_name)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Materiales */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Compras de Materiales</CardTitle>
            <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Compra
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead className="text-right">Precio Unit.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {materials.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground py-8"
                  >
                    No hay materiales registrados para este proyecto
                  </TableCell>
                </TableRow>
              ) : (
                materials.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell className="font-medium">
                      {material.supplier_name || "N/A"}
                    </TableCell>
                    <TableCell>{material.item_name}</TableCell>
                    <TableCell>
                      {material.quantity} {material.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(material.unit_price))}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(Number(material.total_price))}
                    </TableCell>
                    <TableCell>
                      {formatDate(new Date(material.purchase_date))}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{material.category}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {getDeliveryIcon(material.status)}
                        <span className="text-sm">
                          {getDeliveryText(material.status)}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* <CreateMaterialDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        projectId={projectId}
        onCreateMaterial={handleCreateMaterial}
      /> */}
    </div>
  );
}
