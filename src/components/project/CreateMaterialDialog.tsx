"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Calendar } from "@/src/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/src/lib/utils";

interface Material {
  id?: string;
  supplier: string;
  description: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
  purchaseDate: Date;
  invoiceNumber: string;
  category: string;
  deliveryStatus: "pending" | "delivered" | "partial";
}

interface CreateMaterialDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onCreateMaterial: (material: Material) => void;
}

const categories = [
  "Cimentación",
  "Estructura",
  "Mampostería",
  "Acabados",
  "Instalaciones",
  "Herramientas",
  "Otros",
];

const units = [
  "unidades",
  "sacos",
  "varillas",
  "metros",
  "metros cuadrados",
  "metros cúbicos",
  "kilogramos",
  "toneladas",
  "galones",
  "litros",
];

export function CreateMaterialDialog({
  isOpen,
  onClose,
  projectId,
  onCreateMaterial,
}: CreateMaterialDialogProps) {
  const [formData, setFormData] = useState<{
    supplier: string;
    description: string;
    quantity: number;
    unit: string;
    price: number;
    invoiceNumber: string;
    category: string;
    deliveryStatus: "pending" | "delivered" | "partial";
    purchaseDate: Date;
  }>(() => ({
    supplier: "",
    description: "",
    quantity: 0,
    unit: "",
    price: 0,
    invoiceNumber: "",
    category: "",
    deliveryStatus: "pending",
    purchaseDate: new Date(),
  }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const total = formData.quantity * formData.price;

    const newMaterial: Material = {
      ...formData,
      total,
      id: crypto.randomUUID(),
    };

    onCreateMaterial(newMaterial);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      supplier: "",
      description: "",
      quantity: 0,
      unit: "",
      price: 0,
      invoiceNumber: "",
      category: "",
      deliveryStatus: "pending",
      purchaseDate: new Date(),
    });
    onClose();
  };

  const total = formData.quantity * formData.price;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Compra de Material</DialogTitle>
          <DialogDescription>
            Registra una nueva compra de materiales para el proyecto
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Proveedor *</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, supplier: e.target.value }))
                }
                placeholder="Nombre del proveedor"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">No. Factura</Label>
              <Input
                id="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    invoiceNumber: e.target.value,
                  }))
                }
                placeholder="Ej: FC-001234"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción del Material *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Describe el material comprado"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Cantidad *</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                step="0.01"
                value={formData.quantity || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    quantity: Number(e.target.value),
                  }))
                }
                placeholder="0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unidad *</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, unit: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar unidad" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Precio Unitario *</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    price: Number(e.target.value),
                  }))
                }
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoría *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryStatus">Estado de Entrega</Label>
              <Select
                value={formData.deliveryStatus}
                onValueChange={(value: "pending" | "delivered" | "partial") =>
                  setFormData((prev) => ({ ...prev, deliveryStatus: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="delivered">Entregado</SelectItem>
                  <SelectItem value="partial">Parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Fecha de Compra *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.purchaseDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.purchaseDate ? (
                    format(formData.purchaseDate, "PPP", { locale: es })
                  ) : (
                    <span>Seleccionar fecha</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.purchaseDate}
                  onSelect={(date) =>
                    date &&
                    setFormData((prev) => ({ ...prev, purchaseDate: date }))
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {formData.quantity > 0 && formData.price > 0 && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total:</span>
                <span className="text-xl font-bold">
                  {new Intl.NumberFormat("es-DO", {
                    style: "currency",
                    currency: "DOP",
                    minimumFractionDigits: 0,
                  }).format(total)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit">Registrar Compra</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
