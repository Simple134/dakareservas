"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Calculator, Building2, ShoppingCart, TrendingUp, X, User } from "lucide-react";
import { supabase } from "@/src/lib/supabase/client";

interface InvoiceItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    category: 'materials' | 'labor' | 'equipment' | 'services' | 'other';
}

interface CreateInvoiceDialogProps {
    isOpen: boolean;
    onClose: () => void;
    projectId?: string;
    projectName?: string;
    clientName?: string;
    documentType?: 'quote' | 'order' | 'invoice';
    transactionType?: 'sale' | 'purchase';
    onCreateInvoice?: (invoice: any) => void;
}

export function CreateInvoiceDialog({
    isOpen,
    onClose,
    projectId = '',
    projectName = '',
    clientName = '',
    documentType = 'invoice',
    transactionType = 'sale',
    onCreateInvoice
}: CreateInvoiceDialogProps) {

    // Form State
    const [formData, setFormData] = useState({
        documentType: documentType,
        transactionType: transactionType,
        invoiceNumber: `FAC-V-${Date.now()}`,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        selectedProjectId: projectId || 'daka-consumption',
        clientId: '',
        clientName: clientName || '',
        clientPhone: '',
        clientEmail: '',
        clientAddress: '',
        tax: 18,
        discount: 0,
        paymentMethod: '',
        notes: ''
    });

    const [items, setItems] = useState<InvoiceItem[]>([
        {
            id: '1',
            description: '',
            quantity: 1,
            unitPrice: 0,
            totalPrice: 0,
            category: 'materials'
        }
    ]);

    // Estado para clientes
    const [clients, setClients] = useState<any[]>([]);
    const [clientFilter, setClientFilter] = useState<'all' | 'fisica' | 'juridica'>('all');
    const [isLoadingClients, setIsLoadingClients] = useState(false);

    // Cargar clientes de la base de datos
    useEffect(() => {
        const fetchClients = async () => {
            setIsLoadingClients(true);
            try {
                // Obtener personas físicas
                const { data: personasFisicas, error: errorFisicas } = await supabase
                    .from('persona_fisica')
                    .select('id, first_name, last_name, email, phone, address_street, address_sector, address_province');

                // Obtener personas jurídicas
                const { data: personasJuridicas, error: errorJuridicas } = await supabase
                    .from('persona_juridica')
                    .select('id, company_name, email, phone, company_address_street, company_address_sector, company_address_province');

                if (errorFisicas) console.error('Error fetching personas físicas:', errorFisicas);
                if (errorJuridicas) console.error('Error fetching personas jurídicas:', errorJuridicas);

                // Formatear personas físicas
                const formattedFisicas = (personasFisicas || []).map(pf => ({
                    id: pf.id,
                    type: 'fisica' as const,
                    name: `${pf.first_name || ''} ${pf.last_name || ''}`.trim(),
                    email: pf.email || '',
                    phone: pf.phone || '',
                    address: [pf.address_street, pf.address_sector, pf.address_province].filter(Boolean).join(', ')
                }));

                // Formatear personas jurídicas
                const formattedJuridicas = (personasJuridicas || []).map(pj => ({
                    id: pj.id,
                    type: 'juridica' as const,
                    name: pj.company_name || '',
                    email: pj.email || '',
                    phone: pj.phone || '',
                    address: [pj.company_address_street, pj.company_address_sector, pj.company_address_province].filter(Boolean).join(', ')
                }));

                setClients([...formattedFisicas, ...formattedJuridicas]);
            } catch (error) {
                console.error('Error loading clients:', error);
            } finally {
                setIsLoadingClients(false);
            }
        };

        if (isOpen) {
            fetchClients();
        }
    }, [isOpen]);

    // Calculations
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = (subtotal * formData.tax) / 100;
    const discountAmount = (subtotal * formData.discount) / 100;
    const total = subtotal + taxAmount - discountAmount;

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
        const updatedItems = [...items];
        updatedItems[index] = { ...updatedItems[index], [field]: value };

        if (field === 'quantity' || field === 'unitPrice') {
            updatedItems[index].totalPrice = updatedItems[index].quantity * updatedItems[index].unitPrice;
        }

        setItems(updatedItems);
    };

    const addItem = () => {
        setItems([...items, {
            id: Date.now().toString(),
            description: '',
            quantity: 1,
            unitPrice: 0,
            totalPrice: 0,
            category: 'materials'
        }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const handleClientSelect = (clientId: string) => {
        const selectedClient = clients.find(c => c.id === clientId);
        if (selectedClient) {
            setFormData(prev => ({
                ...prev,
                clientId,
                clientName: selectedClient.name,
                clientPhone: selectedClient.phone,
                clientEmail: selectedClient.email,
                clientAddress: selectedClient.address
            }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const invoice = {
            ...formData,
            items,
            subtotal,
            tax: taxAmount,
            discount: discountAmount,
            totalAmount: total,
            status: 'draft'
        };

        onCreateInvoice?.(invoice);
        onClose();
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

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Configuración del Documento */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuración del Documento</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Tipo de Documento
                                </label>
                                <select
                                    value={formData.documentType}
                                    onChange={(e) => handleInputChange('documentType', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="quote">Cotización</option>
                                    <option value="order">Orden</option>
                                    <option value="invoice">Factura</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Tipo de Transacción
                                </label>
                                <select
                                    value={formData.transactionType}
                                    onChange={(e) => handleInputChange('transactionType', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="sale">Venta</option>
                                    <option value="purchase">Compra</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Número de Documento
                                </label>
                                <input
                                    type="text"
                                    value={formData.invoiceNumber}
                                    onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Fecha del Documento
                                </label>
                                <input
                                    type="date"
                                    value={formData.invoiceDate}
                                    onChange={(e) => handleInputChange('invoiceDate', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Fecha de Vencimiento
                                </label>
                                <input
                                    type="date"
                                    value={formData.dueDate}
                                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Asignación de Proyecto */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Building2 className="w-5 h-5 text-gray-700" />
                            <h3 className="text-lg font-semibold text-gray-900">Asignación de Proyecto</h3>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Proyecto
                            </label>
                            <select
                                value={formData.selectedProjectId}
                                onChange={(e) => handleInputChange('selectedProjectId', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="daka-consumption">Consumo de DAKA (Gastos Generales)</option>
                                <option value="project-1">Proyecto Daka 2</option>
                            </select>
                        </div>

                        {formData.selectedProjectId === 'daka-consumption' && (
                            <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                <p className="text-sm font-medium text-orange-900">Consumo DAKA</p>
                                <p className="text-xs text-orange-700 mt-0.5">
                                    Esta factura será asignada a gastos generales de la empresa
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Información del Cliente */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Información del Cliente</h3>

                        <div className="space-y-4">
                            {/* Filtro de tipo de cliente */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Tipo de Cliente
                                </label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setClientFilter('all')}
                                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${clientFilter === 'all'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        Todos
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setClientFilter('fisica')}
                                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${clientFilter === 'fisica'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        <User className="w-4 h-4" />
                                        Persona Física
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setClientFilter('juridica')}
                                        className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${clientFilter === 'juridica'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        <Building2 className="w-4 h-4" />
                                        Persona Jurídica
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Cliente
                                </label>
                                <select
                                    value={formData.clientId}
                                    onChange={(e) => handleClientSelect(e.target.value)}
                                    disabled={isLoadingClients}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                >
                                    <option value="">
                                        {isLoadingClients ? 'Cargando clientes...' : 'Seleccionar cliente'}
                                    </option>
                                    {clients
                                        .filter(client => clientFilter === 'all' || client.type === clientFilter)
                                        .map((client) => (
                                            <option key={`${client.type}-${client.id}`} value={client.id}>
                                                {client.type === 'fisica' ? '👤' : '🏢'} {client.name}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Nombre del Cliente
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.clientName}
                                        onChange={(e) => handleInputChange('clientName', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Teléfono
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.clientPhone}
                                        onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                                        placeholder="(809) 000-0000"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.clientEmail}
                                        onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Dirección
                                    </label>
                                    <textarea
                                        value={formData.clientAddress}
                                        onChange={(e) => handleInputChange('clientAddress', e.target.value)}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Items de la Factura */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Items de la Factura</h3>
                            <button
                                type="button"
                                onClick={addItem}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 transition-colors text-sm font-medium"
                            >
                                <Plus className="w-4 h-4" />
                                Agregar Item
                            </button>
                        </div>

                        <div className="space-y-3">
                            {/* Header */}
                            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-700 pb-2 border-b">
                                <div className="col-span-4">Descripción</div>
                                <div className="col-span-2">Categoría</div>
                                <div className="col-span-1">Cant.</div>
                                <div className="col-span-2">Precio Unit.</div>
                                <div className="col-span-2">Total</div>
                                <div className="col-span-1"></div>
                            </div>

                            {/* Items */}
                            {items.map((item, index) => (
                                <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                                    <div className="col-span-4">
                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                            placeholder="Descripción del item"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <select
                                            value={item.category}
                                            onChange={(e) => handleItemChange(index, 'category', e.target.value)}
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
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.unitPrice}
                                            onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <input
                                            type="text"
                                            value={(item.quantity * item.unitPrice).toFixed(2)}
                                            disabled
                                            className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm text-gray-600"
                                        />
                                    </div>

                                    <div className="col-span-1 flex justify-center">
                                        <button
                                            type="button"
                                            onClick={() => removeItem(index)}
                                            disabled={items.length === 1}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Configuración y Totales */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Configuración */}
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuración</h3>

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
                                            value={formData.tax}
                                            onChange={(e) => handleInputChange('tax', parseFloat(e.target.value) || 0)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
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
                                            value={formData.discount}
                                            onChange={(e) => handleInputChange('discount', parseFloat(e.target.value) || 0)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Método de Pago
                                    </label>
                                    <select
                                        value={formData.paymentMethod}
                                        onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Seleccionar método de pago</option>
                                        <option value="cash">Efectivo</option>
                                        <option value="transfer">Transferencia</option>
                                        <option value="check">Cheque</option>
                                        <option value="card">Tarjeta</option>
                                        <option value="credit">Crédito</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Notas
                                    </label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => handleInputChange('notes', e.target.value)}
                                        rows={3}
                                        placeholder="Notas adicionales..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Resumen de Totales */}
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Calculator className="w-5 h-5 text-gray-700" />
                                <h3 className="text-lg font-semibold text-gray-900">Resumen de Totales</h3>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Subtotal:</span>
                                    <span className="font-medium text-gray-900">
                                        RD$ {subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>

                                <div className="flex justify-between text-sm">
                                    <span className="text-green-600">ITBIS ({formData.tax}%):</span>
                                    <span className="font-medium text-green-600">
                                        RD$ {taxAmount.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                </div>

                                {formData.discount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-red-600">Descuento ({formData.discount}%):</span>
                                        <span className="font-medium text-red-600">
                                            -RD$ {discountAmount.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}

                                <div className="border-t border-gray-200 pt-3">
                                    <div className="flex justify-between">
                                        <span className="text-lg font-bold text-gray-900">Total:</span>
                                        <span className="text-lg font-bold text-gray-900">
                                            RD$ {total.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                                    <p className="text-sm font-medium text-green-900">💰 Ingreso</p>
                                    <p className="text-xs text-green-700 mt-0.5">
                                        Este documento generará un ingreso al proyecto
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                        >
                            Crear Factura de Venta
                        </button>
                    </div>
                </form >
            </div >
        </div >
    );
}
