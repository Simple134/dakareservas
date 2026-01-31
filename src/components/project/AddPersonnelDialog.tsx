"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";

interface AddPersonnelDialogProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string | number;
    onSuccess: () => void;
}

interface PersonnelFormData {
    name: string;
    taxId: string;
    specialty: string;
    workDescription: string;
    grossAmount: number;
    workDate: string;
    paymentDueDate: string;
    notes: string;
}

export function AddPersonnelDialog({
    isOpen,
    onClose,
    projectId,
    onSuccess,
}: AddPersonnelDialogProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<PersonnelFormData>({
        defaultValues: {
            workDate: new Date().toISOString().split("T")[0],
            paymentDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0], // 30 days from now
            specialty: "Contratista",
            notes: "",
        },
    });

    const onSubmit = async (data: PersonnelFormData) => {
        setIsSubmitting(true);
        setError(null);

        try {
            console.log("📤 Creating personnel record...");

            // Step 1: Check if beneficiary exists or create new one
            let beneficiaryId: number;

            // Search for existing beneficiary by tax ID
            const searchResponse = await fetch(
                `/api/gestiono/beneficiaries?search=${encodeURIComponent(data.taxId)}`
            );

            if (searchResponse.ok) {
                const beneficiaries = await searchResponse.json();
                const existingBeneficiary = beneficiaries.find(
                    (b: any) => b.taxId === data.taxId
                );

                if (existingBeneficiary) {
                    beneficiaryId = existingBeneficiary.id;
                    console.log("✅ Using existing beneficiary:", beneficiaryId);
                } else {
                    // Create new beneficiary
                    const createBeneficiaryResponse = await fetch(
                        "/api/gestiono/beneficiary",
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                name: data.name,
                                type: "EMPLOYEE",
                                taxId: data.taxId,
                                metadata: {
                                    specialty: data.specialty,
                                    isrTaxRetention: 0.02,
                                },
                            }),
                        }
                    );

                    if (!createBeneficiaryResponse.ok) {
                        throw new Error("Error al crear el beneficiario");
                    }

                    const newBeneficiary = await createBeneficiaryResponse.json();
                    beneficiaryId = newBeneficiary.id;
                    console.log("✅ Created new beneficiary:", beneficiaryId);
                }
            } else {
                throw new Error("Error al buscar beneficiarios");
            }

            // Step 2: Create payroll record
            const payrollPayload = {
                type: "PAYROLL",
                isSell: false,
                divisionId: Number(projectId),
                beneficiaryId: beneficiaryId,
                currency: "DOP",
                isInstantDelivery: true,
                date: new Date(data.workDate).toISOString(),
                dueDate: new Date(data.paymentDueDate).toISOString(),
                isrTaxRetention: 0.02,
                elements: [
                    {
                        description: data.workDescription,
                        quantity: 1,
                        price: data.grossAmount,
                        unit: "pago",
                        variation: 0,
                        taxes: [],
                    },
                ],
                notes: data.notes || `Especialidad: ${data.specialty}`,
            };

            console.log("📦 Creating payroll record:", payrollPayload);

            const payrollResponse = await fetch("/api/gestiono/pendingRecord/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payrollPayload),
            });

            if (!payrollResponse.ok) {
                const errorData = await payrollResponse.json().catch(() => ({}));
                throw new Error(errorData.details || "Error al crear el registro de nómina");
            }

            console.log("✅ Payroll record created successfully");

            // Success
            reset();
            onSuccess();
            onClose();
        } catch (err) {
            console.error("❌ Error creating personnel:", err);
            setError(err instanceof Error ? err.message : "Error al crear trabajador");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            reset();
            setError(null);
            onClose();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Nuevo Trabajador</DialogTitle>
                    <DialogDescription>
                        Registra un nuevo trabajador y su pago en el proyecto
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {/* Worker Information */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-sm text-gray-700">
                            Información del Trabajador
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label htmlFor="name">Nombre Completo *</Label>
                                <Input
                                    id="name"
                                    {...register("name", { required: "El nombre es requerido" })}
                                    placeholder="Ej: Juan Pérez"
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="taxId">Cédula *</Label>
                                <Input
                                    id="taxId"
                                    {...register("taxId", { required: "La cédula es requerida" })}
                                    placeholder="001-1234567-8"
                                />
                                {errors.taxId && (
                                    <p className="text-sm text-red-600 mt-1">{errors.taxId.message}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="specialty">Especialidad</Label>
                                <Input
                                    id="specialty"
                                    {...register("specialty")}
                                    placeholder="Ej: Carpintero, Albañil"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Work Details */}
                    <div className="space-y-4">
                        <h3 className="font-medium text-sm text-gray-700">
                            Detalles del Trabajo
                        </h3>

                        <div>
                            <Label htmlFor="workDescription">Descripción del Trabajo *</Label>
                            <Textarea
                                id="workDescription"
                                {...register("workDescription", {
                                    required: "La descripción es requerida",
                                })}
                                placeholder="Ej: Instalación de puertas y ventanas"
                                rows={3}
                            />
                            {errors.workDescription && (
                                <p className="text-sm text-red-600 mt-1">
                                    {errors.workDescription.message}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="workDate">Fecha de Trabajo *</Label>
                                <Input
                                    id="workDate"
                                    type="date"
                                    {...register("workDate", {
                                        required: "La fecha es requerida",
                                    })}
                                />
                                {errors.workDate && (
                                    <p className="text-sm text-red-600 mt-1">
                                        {errors.workDate.message}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="paymentDueDate">Fecha de Pago Programada *</Label>
                                <Input
                                    id="paymentDueDate"
                                    type="date"
                                    {...register("paymentDueDate", {
                                        required: "La fecha de pago es requerida",
                                    })}
                                />
                                {errors.paymentDueDate && (
                                    <p className="text-sm text-red-600 mt-1">
                                        {errors.paymentDueDate.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="grossAmount">Monto Bruto (DOP) *</Label>
                            <Input
                                id="grossAmount"
                                type="number"
                                step="0.01"
                                {...register("grossAmount", {
                                    required: "El monto es requerido",
                                    min: { value: 0.01, message: "El monto debe ser mayor a 0" },
                                    valueAsNumber: true,
                                })}
                                placeholder="15000.00"
                            />
                            {errors.grossAmount && (
                                <p className="text-sm text-red-600 mt-1">
                                    {errors.grossAmount.message}
                                </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                                Se aplicará retención ISR del 2% automáticamente
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="notes">Notas Adicionales</Label>
                            <Textarea
                                id="notes"
                                {...register("notes")}
                                placeholder="Notas o comentarios adicionales..."
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Creando..." : "Crear Trabajador"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
