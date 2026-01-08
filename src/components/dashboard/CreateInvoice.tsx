"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Trash2,
  Calculator,
  Building2,
  TrendingUp,
  X,
} from "lucide-react";
import {
  invoiceFormSchema,
  type InvoiceFormData,
  type Invoice,
  type CreateInvoiceDialogProps,
} from "@/src/types/invoice";
import { useGestiono } from "@/src/context/Gestiono";
import { GestionoBeneficiary } from "@/src/types/gestiono";

export function CreateInvoiceDialog({
  isOpen,
  onClose,
  projectId = "",
  clientName = "",
  documentType = "invoice",
  transactionType = "sale",
  onCreateInvoice,
}: CreateInvoiceDialogProps) {
  // Gestiono integration states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [gestionoBeneficiaries, setGestionoBeneficiaries] = useState<GestionoBeneficiary[]>([]);
  // Usar el contexto global para las divisiones
  const { divisions: gestionoDivisions } = useGestiono();
  const [selectedDivisionId, setSelectedDivisionId] = useState<number>(183); // División por defecto

  // Initialize useForm with default values
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      documentType: documentType,
      transactionType: transactionType,
      invoiceNumber: `FAC-V-${Date.now()}`,
      invoiceDate: new Date().toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      selectedProjectId: projectId || "daka-consumption",
      clientId: "",
      clientName: clientName || "",
      clientPhone: "",
      clientEmail: "",
      clientAddress: "",
      tax: 18,
      discount: 0,
      paymentMethod: "",
      notes: "",
      items: [
        {
          id: "1",
          description: "",
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
          category: "materials",
        },
      ],
    },
  });

  // useFieldArray for dynamic items
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchItems = watch("items");
  const watchTax = watch("tax");
  const watchDiscount = watch("discount");

  // Fetch Gestiono Beneficiaries
  useEffect(() => {
    const fetchGestionoBeneficiaries = async () => {
      if (!isOpen) return;

      try {
        console.log('🔄 Obteniendo beneficiarios de Gestiono...');
        const params = new URLSearchParams({
          withContacts: 'true',
          withTaxData: 'false',
        });

        const response = await fetch(`/api/gestiono/beneficiaries?${params.toString()}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        console.log('✅ Beneficiarios de Gestiono:', data);
        setGestionoBeneficiaries(data || []);
      } catch (error) {
        console.error('❌ Error obteniendo beneficiarios:', error);
      }
    };

    fetchGestionoBeneficiaries();
  }, [isOpen]);

  console.log('Gestiono Beneficiaries:', gestionoBeneficiaries);

  useEffect(() => {
    if (isOpen && gestionoDivisions.length > 0) {
      setSelectedDivisionId(gestionoDivisions[0].id);
      console.log(`🏢 División seleccionada desde contexto: ${gestionoDivisions[0].name} (ID: ${gestionoDivisions[0].id})`);
    }
  }, [isOpen, gestionoDivisions]);

  const subtotal = watchItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const taxAmount = (subtotal * watchTax) / 100;
  const discountAmount = (subtotal * watchDiscount) / 100;
  const total = subtotal + taxAmount - discountAmount;

  useEffect(() => {
    watchItems.forEach((item, index) => {
      const totalPrice = item.quantity * item.unitPrice;
      if (item.totalPrice !== totalPrice) {
        setValue(`items.${index}.totalPrice`, totalPrice);
      }
    });
  }, [watchItems, setValue]);

  const addItem = () => {
    append({
      id: Date.now().toString(),
      description: "",
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      category: "materials",
    });
  };

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const handleClientSelect = (clientId: string) => {
    const selectedBeneficiary = gestionoBeneficiaries.find(
      (b) => String(b.id) === clientId
    );
    if (selectedBeneficiary) {
      const phone = selectedBeneficiary.contacts?.find((c) => c.type === 'phone')?.data || '';
      const email = selectedBeneficiary.contacts?.find((c) => c.type === 'email')?.data || '';
      const address = selectedBeneficiary.contacts?.find((c) => c.type === 'address')?.data || '';

      setValue("clientId", clientId);
      setValue("clientName", selectedBeneficiary.name);
      setValue("clientPhone", phone);
      setValue("clientEmail", email);
      setValue("clientAddress", address);
    }
  };

  const onSubmit = async (data: InvoiceFormData) => {
    // Reset states
    setSubmitError(null);
    setSubmitSuccess(false);
    setIsSubmitting(true);

    // Create local invoice object
    const invoice: Invoice = {
      ...data,
      subtotal,
      tax: taxAmount,
      discount: discountAmount,
      totalAmount: total,
      status: "draft",
    };

    try {
      console.log('📤 Enviando factura a Gestiono...');

      // Preparar datos para enviar al API route
      const invoiceData = {
        documentType: data.documentType,
        transactionType: data.transactionType,
        invoiceNumber: data.invoiceNumber,
        invoiceDate: data.invoiceDate,
        dueDate: data.dueDate,
        clientId: data.clientId,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        clientAddress: data.clientAddress,
        divisionId: selectedDivisionId, // División seleccionada
        items: data.items,
        tax: taxAmount,
        discount: discountAmount,
        subtotal,
        totalAmount: total,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        selectedProjectId: data.selectedProjectId,
        currency: "DOP" as const,
      };

      // Llamar a la API Route (servidor)
      const response = await fetch('/api/gestiono/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      const result = await response.json();

      // Si Gestiono no está configurado, continuar sin integración
      if (!result.configured) {
        console.warn('⚠️ Gestiono no está configurado:', result.details);
        onCreateInvoice?.(invoice);
        onClose();
        return;
      }

      // Si hubo error en la API
      if (!result.success) {
        throw new Error(result.error || 'Error al crear factura');
      }

      console.log('✅ Factura creada en Gestiono:', {
        id: result.invoice.id,
        number: result.invoice.invoiceNumber,
        pdfUrl: result.invoice.pdfUrl,
      });

      // Add Gestiono data to invoice
      const enhancedInvoice = {
        ...invoice,
        gestionoId: result.invoice.id,
        pdfUrl: result.invoice.pdfUrl,
        xmlUrl: result.invoice.xmlUrl,
      };

      // Show success
      setSubmitSuccess(true);

      // Call callback with enhanced invoice
      onCreateInvoice?.(enhancedInvoice);

      // Close dialog after brief delay to show success message
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error: any) {
      console.error('❌ Error creando factura:', error);
      console.error('📋 Error completo:', JSON.stringify(error, null, 2));

      // Handle specific errors
      let errorMessage = 'Error al crear factura';

      if (error.message) {
        errorMessage = error.message;
      }

      // If it's a response error, try to get more details
      if (error.response) {
        console.error('📡 Response error:', error.response);
      }

      setSubmitError(errorMessage);

      // Still save locally even if Gestiono fails
      onCreateInvoice?.(invoice);

    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-gray-900">
              Crear Factura de Venta
            </h2>
            <div className="flex items-center gap-1.5 text-green-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">Venta</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Message */}
        {submitError && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-red-600 text-xl">❌</span>
              <div>
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-600 mt-1">{submitError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {submitSuccess && (
          <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start gap-2">
              <span className="text-green-600 text-xl">✅</span>
              <div>
                <p className="text-sm font-medium text-green-800">
                  ¡Factura creada exitosamente!
                </p>
                <p className="text-sm text-green-600 mt-1">
                  La factura se ha registrado en Gestiono correctamente.
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Configuración del Documento */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Configuración del Documento
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tipo de Documento
                </label>
                <select
                  {...register("documentType")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="quote">Cotización</option>
                  <option value="order">Orden</option>
                  <option value="invoice">Factura</option>
                </select>
                {errors.documentType && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.documentType.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Tipo de Transacción
                </label>
                <select
                  {...register("transactionType")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="sale">Venta</option>
                  <option value="purchase">Compra</option>
                </select>
                {errors.transactionType && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.transactionType.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Número de Documento
                </label>
                <input
                  type="text"
                  {...register("invoiceNumber")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.invoiceNumber && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.invoiceNumber.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Fecha del Documento
                </label>
                <input
                  type="date"
                  {...register("invoiceDate")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.invoiceDate && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.invoiceDate.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Fecha de Vencimiento
                </label>
                <input
                  type="date"
                  {...register("dueDate")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.dueDate && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.dueDate.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Asignación de Proyecto */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-gray-700" />
              <h3 className="text-lg font-semibold text-gray-900">
                Asignación de Proyecto
              </h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Proyecto
              </label>
              <select
                {...register("selectedProjectId")}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedDivisionId(Number(val));
                  setValue("selectedProjectId", val);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {gestionoDivisions.length === 0 && (
                  <option value="">Cargando proyectos...</option>
                )}
                {gestionoDivisions.map((division) => (
                  <option key={division.id} value={division.id}>
                    {division.name}
                  </option>
                ))}
              </select>
              {errors.selectedProjectId && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.selectedProjectId.message}
                </p>
              )}
            </div>

            <div className="bg-blue-50 text-center mt-2 rounded-lg pt-1">
              <p className="text-sm font-bold text-blue-900">
                Proyecto Seleccionado: {gestionoDivisions.find(d => d.id === selectedDivisionId)?.name || 'N/A'}
              </p>
            </div>
          </div>

          {/* Información del Cliente */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Información del Cliente
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Cliente
                </label>
                <select
                  {...register("clientId")}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >

                  {/* Beneficiarios de Gestiono (TODOS los tipos) */}
                  {gestionoBeneficiaries.map((beneficiary) => {
                    // Icono según tipo
                    const iconMap: Record<string, string> = {
                      'CLIENT': '🌐',
                      'PROVIDER': '📦',
                      'SELLER': '💼',
                      'ORGANIZATION': '🏢',
                      'BOTH': '🔄',
                      'EMPLOYEE': '👨‍💼',
                      'OTHER': '📋'
                    };
                    const icon = iconMap[beneficiary.type] || '📋';

                    return (
                      <option
                        key={`gestiono-${beneficiary.id}`}
                        value={String(beneficiary.id)}
                      >
                        {icon} {beneficiary.name} {beneficiary.taxId ? `(${beneficiary.taxId})` : ''} - {beneficiary.type}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nombre del Cliente
                  </label>
                  <input
                    type="text"
                    {...register("clientName")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.clientName && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.clientName.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    {...register("clientPhone")}
                    placeholder="(809) 000-0000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.clientPhone && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.clientPhone.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    {...register("clientEmail")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.clientEmail && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.clientEmail.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Dirección
                  </label>
                  <textarea
                    {...register("clientAddress")}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  {errors.clientAddress && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.clientAddress.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Items de la Factura */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Items de la Factura
              </h3>
              <button
                type="button"
                onClick={addItem}
                style={{ borderRadius: "50px" }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                <span className="font-bold">Agregar Item</span>
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-700 pb-2 border-b">
                <div className="col-span-4">Descripción</div>
                <div className="col-span-2">Categoría</div>
                <div className="col-span-1">Cant.</div>
                <div className="col-span-2">Precio Unit.</div>
                <div className="col-span-2">Total</div>
                <div className="col-span-1"></div>
              </div>

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-12 gap-2 items-center"
                >
                  <div className="col-span-4">
                    <input
                      type="text"
                      {...register(`items.${index}.description`)}
                      placeholder="Descripción del item"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    {errors.items?.[index]?.description && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.items[index]?.description?.message}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <select
                      {...register(`items.${index}.category`)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="materials">Materiales</option>
                      <option value="labor">Mano de Obra</option>
                      <option value="equipment">Equipos</option>
                      <option value="services">Servicios</option>
                      <option value="other">Otros</option>
                    </select>
                  </div>

                  <div className="col-span-1">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      {...register(`items.${index}.quantity`, {
                        valueAsNumber: true,
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    {errors.items?.[index]?.quantity && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.items[index]?.quantity?.message}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      {...register(`items.${index}.unitPrice`, {
                        valueAsNumber: true,
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    {errors.items?.[index]?.unitPrice && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.items[index]?.unitPrice?.message}
                      </p>
                    )}
                  </div>

                  <div className="col-span-2">
                    <input
                      type="text"
                      value={(
                        (watchItems[index]?.quantity || 0) *
                        (watchItems[index]?.unitPrice || 0)
                      ).toFixed(2)}
                      disabled
                      className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-600"
                    />
                  </div>

                  <div className="col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      disabled={fields.length === 1}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {errors.items && (
              <p className="text-red-500 text-xs mt-2">
                {errors.items.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Configuración */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Configuración
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      ITBIS (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      {...register("tax", { valueAsNumber: true })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.tax && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.tax.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Descuento (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      {...register("discount", { valueAsNumber: true })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {errors.discount && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.discount.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Método de Pago
                  </label>
                  <select
                    {...register("paymentMethod")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar método de pago</option>
                    <option value="cash">Efectivo</option>
                    <option value="transfer">Transferencia</option>
                    <option value="check">Cheque</option>
                    <option value="card">Tarjeta</option>
                    <option value="credit">Crédito</option>
                  </select>
                  {errors.paymentMethod && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.paymentMethod.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Notas
                  </label>
                  <textarea
                    {...register("notes")}
                    rows={3}
                    placeholder="Notas adicionales..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                  {errors.notes && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.notes.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Resumen de Totales */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calculator className="w-5 h-5 text-gray-700" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Resumen de Totales
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium text-gray-900">
                    RD${" "}
                    {subtotal.toLocaleString("es-DO", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-green-600">
                    ITBIS ({watchTax}%):
                  </span>
                  <span className="font-medium text-green-600">
                    RD${" "}
                    {taxAmount.toLocaleString("es-DO", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>

                {watchDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600">
                      Descuento ({watchDiscount}%):
                    </span>
                    <span className="font-medium text-red-600">
                      -RD${" "}
                      {discountAmount.toLocaleString("es-DO", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-gray-900">
                      Total:
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      RD${" "}
                      {total.toLocaleString("es-DO", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-sm font-medium text-green-900">
                    💰 Ingreso
                  </p>
                  <p className="text-xs text-green-700 mt-0.5">
                    Este documento generará un ingreso al proyecto
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              style={{ borderRadius: "50px" }}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ borderRadius: "50px" }}
              className="px-6 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Creando factura...
                </>
              ) : (
                'Crear Factura de Venta'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
