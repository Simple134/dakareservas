import { useState, useEffect } from "react";
import { CheckCircle2, Clock, Save, Trash2, X, Mail, Edit, ExternalLink as ExternalLinkIcon } from "lucide-react";
import { ReservationViewModel } from "../types/ReservationsTypes";
import DetailRow from "../lib/DetailRow";
import { Tables } from "../types/supabase";

interface SidebarReservationProps {
    selectedReservation: ReservationViewModel;
    closeSidebar: () => void;
    updateStatus: (status: string) => void;
    updatingStatus: boolean;
    deleteReservation: () => void;
    editCurrency: string;
    setEditCurrency: (currency: string) => void;
    editAmount: string;
    setEditAmount: (amount: string) => void;
    editPaymentMethod: string;
    setEditPaymentMethod: (paymentMethod: string) => void;
    editReceiptFile: File | null;
    setEditReceiptFile: (receiptFile: File | null) => void;
    handleUpdatePaymentInfo: (amount?: number, currency?: string) => void;
    editQuotationFile: File | null;
    setEditQuotationFile: (file: File | null) => void;
    handleUploadQuotation: () => void;
    handleDeleteQuotation: () => void;
    products: Tables<'products'>[];
    handleUpdateProduct: (productId: string) => void;
    handleUpdatePaymentMethod: (paymentId: string, method: string) => Promise<void>;
    handleUpdatePaymentStatus: (paymentId: string, newStatus: string) => Promise<void>;
    handleDeletePayment: (paymentId: string) => Promise<void>;
}



export const SidebarReservation = ({ selectedReservation, closeSidebar, updateStatus, updatingStatus, deleteReservation, editCurrency, setEditCurrency, editAmount, setEditAmount, editPaymentMethod, setEditPaymentMethod, editReceiptFile, setEditReceiptFile, handleUpdatePaymentInfo, editQuotationFile, setEditQuotationFile, handleUploadQuotation, handleDeleteQuotation, products, handleUpdateProduct, handleUpdatePaymentMethod, handleUpdatePaymentStatus, handleDeletePayment }: SidebarReservationProps) => {
    const [expandedImage, setExpandedImage] = useState<string | null>(null);
    const [selectedProductId, setSelectedProductId] = useState<string>("");
    const [exchangeRate, setExchangeRate] = useState<number | null>(null);
    const [loadingRate, setLoadingRate] = useState(false);

    useEffect(() => {
        setLoadingRate(true);
        fetch('https://v6.exchangerate-api.com/v6/8d1451c8aaa667219c66291d/latest/USD')
            .then(res => res.json())
            .then(data => {
                if (data.result === 'success' && data.conversion_rates?.DOP) {
                    setExchangeRate(data.conversion_rates.DOP);
                }
            })
            .catch(err => {
                console.error('Error fetching exchange rate:', err);
            })
            .finally(() => setLoadingRate(false));
    }, []);

    const calculateUSDAmount = (): number => {
        if (editCurrency === 'USD') {
            return parseFloat(editAmount) || 0;
        } else if (editCurrency === 'DOP' && exchangeRate && editAmount) {
            return parseFloat(editAmount) / exchangeRate;
        }
        return 0;
    };

    const usdAmount = calculateUSDAmount();

    const handleManualPaymentSubmit = () => {
        // If currency is DOP, send as is. If USD, send as usual.
        if (editCurrency === 'DOP') {
            // Send original DOP amount
            const amountToSubmit = parseFloat(editAmount) || 0;
            handleUpdatePaymentInfo(amountToSubmit, 'DOP');
        } else {
            const amountToSubmit = parseFloat(usdAmount.toFixed(2));
            handleUpdatePaymentInfo(amountToSubmit, 'USD');
        }
    };

    const payments = selectedReservation.payments || [];
    const totalPaid = payments
        .filter(p => p.status === 'approved')
        .reduce((sum, p) => {
            let amountInUsd = Number(p.amount) || 0;

            // Convert DOP to USD if needed for the total
            if (p.currency === 'DOP' && exchangeRate) {
                amountInUsd = amountInUsd / exchangeRate;
            }

            return sum + amountInUsd;
        }, 0);

    useEffect(() => {
        // Find the product ID based on the reservation's product name
        const matchingProduct = products.find(p => p.name === selectedReservation.product_name);
        if (matchingProduct) {
            setSelectedProductId(matchingProduct.id);
        }
    }, [selectedReservation, products]);
    return (
        <div className="h-full flex flex-col">
            <div className="bg-[#131E29] p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Detalles de Reserva</h2>
                <button
                    onClick={closeSidebar}
                    className="text-white hover:text-[#A9780F] transition-colors"
                >
                    <X size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className={`bg-gray-50 rounded-lg p-4 border-2 border-[#A9780F] ${selectedReservation.status === "approved" ? "hidden" : ""}`}>
                    <h3 className="text-sm font-bold text-black mb-3 uppercase">Confirmar</h3>
                    <div className="flex gap-3">
                        <button
                            onClick={() => {
                                updateStatus("approved")
                                closeSidebar()
                            }}
                            disabled={updatingStatus}
                            className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${selectedReservation.status === "approved"
                                ? "bg-green-500 text-white shadow-lg"
                                : "bg-white border-2 border-green-300 text-green-700 hover:bg-green-50"
                                } disabled:opacity-50`}
                        >
                            <CheckCircle2 size={18} />
                            Aprobar
                        </button>
                    </div>
                </div>

                {/* Actions Logic */}
                <div className="bg-red-50 rounded-lg p-4 border border-red-100 mt-4">
                    <h3 className="text-sm font-bold text-black mb-3 uppercase">Acciones de Peligro</h3>
                    <button
                        onClick={deleteReservation}
                        className="w-full py-2 px-4 rounded border border-red-300 text-red-600 hover:bg-red-100 flex items-center justify-center gap-2 text-sm font-medium transition-colors"
                    >
                        <Trash2 size={16} />
                        Eliminar Reserva
                    </button>
                </div>

                <div>
                    <h3 className="text-sm font-bold text-black mb-3 uppercase border-b-2 border-[#A9780F] pb-2">
                        {selectedReservation.client_type_label}
                    </h3>
                    <div className="space-y-2">
                        <DetailRow label="Nombre / Razón Social" value={selectedReservation.client_name} />
                        <DetailRow label={selectedReservation.identification_label} value={selectedReservation.identification_value} />
                        {selectedReservation.email && <DetailRow label="Email" value={selectedReservation.email} />}

                        {selectedReservation.raw_fisica && (
                            <>
                                <DetailRow label="Género" value={selectedReservation.raw_fisica.gender || '-'} />
                                <DetailRow label="Nacionalidad" value={selectedReservation.raw_fisica.nationality || '-'} />
                                <DetailRow label="Estado Civil" value={selectedReservation.raw_fisica.marital_status || '-'} />
                                <DetailRow label="Ocupación" value={selectedReservation.raw_fisica.occupation || '-'} />
                            </>
                        )}

                        {selectedReservation.raw_juridica && (
                            <>
                                <DetailRow label="Tipo Empresa" value={selectedReservation.raw_juridica.company_type || '-'} />
                                <DetailRow label="Rep. Legal" value={selectedReservation.raw_juridica.rep_name || '-'} />
                            </>
                        )}
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-bold text-black mb-3 uppercase border-b-2 border-[#A9780F] pb-2">
                        Dirección
                    </h3>
                    <div className="space-y-2">
                        <p className="text-sm text-gray-900">{selectedReservation.address_display}</p>
                    </div>
                </div>

                {selectedReservation.unit_code && (
                    <div>
                        <h3 className="text-sm font-bold text-black mb-3 uppercase border-b-2 border-[#A9780F] pb-2">
                            Información de Unidad
                        </h3>
                        <div className="space-y-2">
                            <DetailRow label="Código" value={selectedReservation.unit_code} />
                            {selectedReservation.locale_details ? (
                                <>
                                    <DetailRow label="Nivel" value={selectedReservation.locale_details.level.toString()} />
                                    <DetailRow label="Área" value={`${selectedReservation.locale_details.area_mt2} mt²`} />
                                    <DetailRow
                                        label="Precio / mt²"
                                        value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedReservation.locale_details.price_per_mt2)}
                                    />
                                    <DetailRow
                                        label="Valor Total"
                                        value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedReservation.locale_details.total_value)}
                                        highlight
                                    />
                                    <DetailRow label="Estado Actual" value={selectedReservation.locale_details.status} />
                                </>
                            ) : (
                                <p className="text-sm text-yellow-600 italic">Detalles adicionales del local no disponibles en la base de datos.</p>
                            )}
                        </div>
                    </div>
                )}

                <div>
                    <h3 className="text-sm font-bold text-black mb-3 uppercase border-b-2 border-[#A9780F] pb-2">
                        Producto & Pago
                    </h3>
                    <div className="space-y-2">
                        {/* Product Update Section */}
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-sm font-medium text-gray-500">Producto</span>
                            <select
                                value={selectedProductId}
                                onChange={(e) => {
                                    const newId = e.target.value;
                                    setSelectedProductId(newId);
                                    if (newId) handleUpdateProduct(newId);
                                }}
                                disabled={updatingStatus}
                                className="text-sm font-medium text-right text-gray-900 border-none focus:ring-0 cursor-pointer bg-transparent pr-8 py-0"
                                style={{ width: 'auto', maxWidth: '200px' }}
                            >
                                <option value="" disabled>Seleccionar...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Add Payment Manual Section */}
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 mt-2 space-y-3">
                            <h4 className="text-xs font-bold text-black uppercase">Agregar Pago Manual</h4>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Monto de Reserva</label>
                                <div className="flex gap-2">
                                    <select
                                        value={editCurrency}
                                        onChange={(e) => setEditCurrency(e.target.value)}
                                        className="w-20 text-xs border-gray-300 rounded focus:border-[#A9780F] focus:ring-[#A9780F] text-black"
                                    >
                                        <option value="USD">USD</option>
                                        <option value="DOP">DOP</option>
                                    </select>
                                    <input
                                        type="number"
                                        value={editAmount}
                                        onChange={(e) => setEditAmount(e.target.value)}
                                        placeholder="Monto"
                                        className="flex-1 text-xs border-gray-300 rounded focus:border-[#A9780F] focus:ring-[#A9780F] text-black"
                                    />
                                </div>
                            </div>

                            {/* Exchange Rate Display for DOP */}
                            {editCurrency === 'DOP' && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                                    {loadingRate ? (
                                        <div className="flex items-center gap-2 text-blue-700">
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-700"></div>
                                            <span className="text-xs">Obteniendo tasa...</span>
                                        </div>
                                    ) : exchangeRate ? (
                                        <>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-medium text-gray-700">Tasa:</span>
                                                <span className="text-xs font-bold text-gray-900">1 USD = {exchangeRate.toFixed(4)} DOP</span>
                                            </div>
                                            {editAmount && parseFloat(editAmount) > 0 && (
                                                <div className="pt-2 border-t border-blue-300">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs font-medium text-gray-700">Equivalente USD:</span>
                                                        <span className="text-sm font-bold text-[#A9780F]">
                                                            ${usdAmount.toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-[10px] text-red-600">Error tasa de cambio.</p>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Método de Pago</label>
                                <select
                                    value={editPaymentMethod}
                                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                                    className="w-full text-xs border-gray-300 rounded focus:border-[#A9780F] focus:ring-[#A9780F] text-black"
                                >
                                    <option value="">Seleccione...</option>
                                    <option value="transfer">Transferencia</option>
                                    <option value="card">Tarjeta Crédito/Débito</option>
                                    <option value="check">Cheque</option>
                                    <option value="cash">Efectivo</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Subir Comprobante</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        onChange={(e) => setEditReceiptFile(e.target.files?.[0] || null)}
                                        className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#131E29] file:text-white hover:file:bg-gray-700"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleManualPaymentSubmit}
                                disabled={updatingStatus || !editAmount || (editCurrency === 'DOP' && !exchangeRate)}
                                className="w-full flex items-center justify-center gap-2 bg-[#A9780F] hover:bg-[#966b0d] text-white text-xs font-bold py-2 rounded transition-colors disabled:opacity-50"
                            >
                                <Save size={14} />
                                Agregar Pago {editCurrency === 'DOP' && usdAmount > 0 && `(USD ${usdAmount.toFixed(2)})`}
                            </button>
                        </div>

                        {/* Payments List */}
                        <div className="mt-4">
                            <h4 className="text-sm font-bold text-black mb-2 uppercase border-b border-gray-200 pb-1">Historial de Pagos</h4>
                            {payments.length === 0 ? (
                                <p className="text-xs text-gray-500 italic">No hay pagos registrados.</p>
                            ) : (
                                <div className="space-y-2">
                                    {payments
                                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                        .map(p => (
                                            <div key={p.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-2">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900 border-b border-dashed border-gray-300 inline-block mb-1">
                                                            {new Intl.NumberFormat('en-US', { style: 'currency', currency: p.currency || 'USD' }).format(p.amount)}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500">{new Date(p.created_at).toLocaleDateString()} {new Date(p.created_at).toLocaleTimeString()}</p>
                                                        <select
                                                            value={p.payment_method || 'manual'}
                                                            onChange={(e) => handleUpdatePaymentMethod(p.id, e.target.value)}
                                                            className="text-[10px] text-gray-500 font-medium border-0 bg-transparent p-0 cursor-pointer focus:ring-0 hover:text-gray-700"
                                                            disabled={updatingStatus}
                                                        >
                                                            <option value="transfer">Transferencia</option>
                                                            <option value="card">Tarjeta</option>
                                                            <option value="check">Cheque</option>
                                                            <option value="cash">Efectivo</option>
                                                            <option value="manual">Manual</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="flex items-center gap-1">
                                                        <select
                                                            value={p.status || 'pending'}
                                                            onChange={(e) => handleUpdatePaymentStatus(p.id, e.target.value)}
                                                            className={`text-[10px] font-bold px-2 py-1 rounded border-0 cursor-pointer focus:ring-1 focus:ring-offset-1 ${p.status === 'approved' ? 'bg-green-100 text-green-800 focus:ring-green-500' :
                                                                p.status === 'rejected' ? 'bg-red-100 text-red-800 focus:ring-red-500' :
                                                                    'bg-yellow-100 text-yellow-800 focus:ring-yellow-500'
                                                                }`}
                                                            disabled={updatingStatus}
                                                        >
                                                            <option value="pending">Pendiente</option>
                                                            <option value="approved">Aprobado</option>
                                                            <option value="rejected">Rechazado</option>
                                                        </select>
                                                        <button
                                                            onClick={() => {
                                                                if (confirm('¿Estás seguro de eliminar este pago?')) {
                                                                    handleDeletePayment(p.id);
                                                                }
                                                            }}
                                                            disabled={updatingStatus}
                                                            className="text-gray-400 hover:text-red-500 p-1"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                    {p.receipt_url && (
                                                        <a
                                                            href={p.receipt_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                                        >
                                                            <span>Ver Recibo</span>
                                                            <ExternalLinkIcon size={10} />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>

                        {/* Summary */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <DetailRow label="Moneda" value={selectedReservation.currency} />
                            <DetailRow
                                label="Total Pagado (Aprobado)"
                                value={new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedReservation.currency || 'USD' }).format(totalPaid)}
                                highlight
                            />
                        </div>
                    </div>
                </div>

                {/* Quotation Section */}
                <div className="mt-6">
                    <h3 className="text-sm font-bold text-black mb-3 uppercase border-b-2 border-[#A9780F] pb-2">
                        Cotización del Cliente
                    </h3>

                    {selectedReservation.cotizacion_url ? (
                        <div className="relative group">
                            <a
                                href={selectedReservation.cotizacion_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full"
                            >
                                <div className="relative h-24 w-full bg-gray-100 rounded-lg border-2 border-[#A9780F] hover:border-[#8e650c] transition-colors flex items-center justify-center cursor-pointer">
                                    <div className="text-center">
                                        <svg className="w-8 h-8 mx-auto mb-1 text-[#A9780F]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                        <p className="text-xs font-bold text-[#A9780F]">PDF Cotización</p>
                                        <p className="text-[10px] text-gray-500">Clic para ver</p>
                                    </div>
                                </div>
                            </a>
                            <button
                                onClick={handleDeleteQuotation}
                                disabled={updatingStatus}
                                className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full transition-opacity hover:bg-red-700 disabled:opacity-50"
                                title="Eliminar Cotización"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ) : (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 space-y-3">
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Subir Cotización (PDF)</label>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={(e) => setEditQuotationFile(e.target.files?.[0] || null)}
                                className="w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#131E29] file:text-white hover:file:bg-gray-700"
                            />
                            <button
                                onClick={handleUploadQuotation}
                                disabled={!editQuotationFile || updatingStatus}
                                className="w-full bg-[#131E29] hover:bg-[#2a425a] text-white text-xs font-bold py-2 rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Save size={14} />
                                Subir Cotización
                            </button>
                        </div>
                    )}
                </div>

                {/* Receipt Gallery Section */}
                {/* Receipt Gallery Section */}
                {selectedReservation.payments && selectedReservation.payments.length > 0 && (
                    <div className="mt-4">
                        <h4 className="text-sm font-bold text-black mb-3 uppercase border-b-2 border-[#A9780F] pb-2">
                            Comprobantes ({selectedReservation.payments.filter(p => p.receipt_url).length})
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            {selectedReservation.payments
                                .filter(p => p.receipt_url)
                                .map((payment, index) => (
                                    <div key={payment.id} className="relative group">
                                        {payment.receipt_url!.toLowerCase().endsWith('.pdf') ? (
                                            <a
                                                href={payment.receipt_url!}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block w-full h-24"
                                            >
                                                <div className="h-full w-full bg-gray-100 rounded-lg border-2 border-[#A9780F] flex flex-col items-center justify-center hover:bg-gray-200 transition-colors">
                                                    <span className="text-xs font-bold text-[#A9780F]">PDF</span>
                                                    <span className="text-[10px] text-gray-500">Ver documento</span>
                                                </div>
                                            </a>
                                        ) : (
                                            <div
                                                onClick={() => setExpandedImage(payment.receipt_url!)}
                                                className="h-24 w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200 cursor-zoom-in relative"
                                            >
                                                <img
                                                    src={payment.receipt_url!}
                                                    alt={`Comprobante ${index + 1}`}
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                                                    <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-bold bg-black/50 px-2 py-1 rounded">Ver</span>
                                                </div>
                                            </div>
                                        )}
                                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">
                                            {payment.status}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Expanded Image Modal */}
            {
                expandedImage && (
                    <div
                        className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setExpandedImage(null)}
                    >
                        <button
                            onClick={() => setExpandedImage(null)}
                            className="absolute top-4 right-4 text-white hover:text-red-400 p-2 bg-black/50 rounded-full transition-colors"
                        >
                            <X size={32} />
                        </button>
                        <img
                            src={expandedImage}
                            alt="Vista ampliada"
                            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                )
            }
        </div >
    );
};

interface SidebarLocaleProps {
    selectedLocale: Tables<'locales'>;
    closeSidebar: () => void;
    localeOwner: any;
    handleUnassignUser: () => void;
    assignTab: "existing" | "new";
    setAssignTab: (tab: "existing" | "new") => void;
    selectedProductId: string;
    setSelectedProductId: (productId: string) => void;
    products: Tables<'products'>[]
    assignLocaleToUser: (id: string, type: 'fisica' | 'juridica') => void;
    availableUsers: any[]
    newUserType: 'fisica' | 'juridica'
    setNewUserType: (type: 'fisica' | 'juridica') => void
    newUserForm: any
    setNewUserForm: (form: any) => void
    createAndAssignUser: () => void
    updatingStatus: boolean
}


export const SidebarLocales = ({ selectedLocale, closeSidebar, localeOwner, handleUnassignUser, assignTab, setAssignTab, selectedProductId, setSelectedProductId, products, assignLocaleToUser, availableUsers, newUserType, setNewUserType, newUserForm, setNewUserForm, createAndAssignUser, updatingStatus }: SidebarLocaleProps) => {
    const [selectedUserValue, setSelectedUserValue] = useState("");

    useEffect(() => {
        setSelectedUserValue("");
    }, [selectedLocale.id]);

    return (
        <div className="h-full flex flex-col">
            <div className="bg-[#131E29] p-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Local {selectedLocale.id}</h2>
                    <p className="text-[#A9780F]">Nivel {selectedLocale.level}</p>
                </div>
                <button onClick={closeSidebar} className="text-white hover:text-[#A9780F] transition-colors"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Locale Info */}
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <div>
                        <p className="text-xs text-gray-500">Área</p>
                        <p className="font-bold text-gray-900">{selectedLocale.area_mt2} m²</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Precio / m²</p>
                        <p className="font-bold text-gray-900">${selectedLocale.price_per_mt2?.toLocaleString()}</p>
                    </div>
                    <div className="col-span-2">
                        <p className="text-xs text-gray-500">Valor Total</p>
                        <p className="font-bold text-[#A9780F] text-lg">${selectedLocale.total_value?.toLocaleString()}</p>
                    </div>
                    <div className="col-span-2">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${selectedLocale.status?.toLowerCase().includes('disponible') ? "bg-green-100 text-green-800" :
                            selectedLocale.status?.toLowerCase().includes('vendido') ? "bg-red-100 text-red-800" :
                                selectedLocale.status?.toLowerCase().includes('reservado') ? "bg-orange-100 text-orange-800" :
                                    "bg-yellow-100 text-yellow-800"
                            }`}>
                            {selectedLocale.status}
                        </span>
                    </div>
                </div>

                {/* Owner Info or Assignment */}
                {localeOwner ? (
                    <div>
                        <h3 className="text-sm font-bold text-black mb-3 uppercase border-b-2 border-[#A9780F] pb-2">
                            Asignado a
                        </h3>
                        <div className="space-y-3 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            {localeOwner.type === 'fisica' ? (
                                <>
                                    <DetailRow label="Nombre" value={`${localeOwner.first_name} ${localeOwner.last_name}`} />
                                    <DetailRow label="Identificación" value={localeOwner.identification || localeOwner.passport} />
                                </>
                            ) : (
                                <>
                                    <DetailRow label="Empresa" value={localeOwner.company_name} />
                                    <DetailRow label="RNC" value={localeOwner.rnc} />
                                </>
                            )}
                            <DetailRow label="Email" value={localeOwner.email} />

                            <div className="pt-4 mt-2 border-t border-gray-100">
                                <button
                                    onClick={handleUnassignUser}
                                    className="text-xs text-red-600 hover:text-red-800 underline"
                                >
                                    Desvincular Usuario
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div>
                        <h3 className="text-sm font-bold text-black mb-3 uppercase border-b-2 border-[#A9780F] pb-2">
                            Asignar Cliente
                        </h3>
                        {/* Product Selection for ALL tabs */}
                        <div className="mb-4">
                            <label className="block text-xs font-medium text-gray-700 mb-1">Seleccionar Producto *</label>
                            <select
                                className="block w-full text-black rounded-md border-gray-300 shadow-sm focus:border-[#A9780F] focus:ring-[#A9780F] sm:text-sm p-2 border"
                                value={selectedProductId}
                                onChange={(e) => setSelectedProductId(e.target.value)}
                            >
                                <option value="">Seleccionar Producto...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Buscar Cliente</label>
                                <select
                                    className="block w-full text-black rounded-md border-gray-300 shadow-sm focus:border-[#A9780F] focus:ring-[#A9780F] sm:text-sm p-2 border"
                                    onChange={(e) => setSelectedUserValue(e.target.value)}
                                    value={selectedUserValue}
                                >
                                    <option value="">Seleccionar...</option>
                                    {availableUsers.map(u => (
                                        <option key={u.id} value={`${u.id}:${u.type}`}>
                                            {u.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => {
                                    const [id, type] = selectedUserValue.split(':');
                                    if (id) assignLocaleToUser(id, type as 'fisica' | 'juridica');
                                }}
                                disabled={!selectedUserValue || updatingStatus}
                                className="w-full bg-[#A9780F] text-white rounded-md py-2 font-bold hover:bg-[#8e650c] transition-colors disabled:opacity-50"
                            >
                                {updatingStatus ? "Asignando..." : "Asignar Usuario"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

interface SidebarUserProps {
    selectedUser: any;
    closeSidebar: () => void;
    handleUpdateUser: (updatedData: any) => void;
    updatingStatus: boolean;
    handleSendEmail: () => void;
}

export const SidebarUser = ({ selectedUser, closeSidebar, handleUpdateUser, updatingStatus, handleSendEmail }: SidebarUserProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>({});

    useEffect(() => {
        if (selectedUser) {
            setFormData({
                name: selectedUser.name,
                email: selectedUser.email,
                phone: selectedUser.phone,
                ...selectedUser.raw
            });
        }
    }, [selectedUser]);

    const handleSave = () => {
        handleUpdateUser(formData);
        setIsEditing(false);
    }

    return (
        <div className="h-full flex flex-col">
            <div className="bg-[#131E29] p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Detalles de Usuario</h2>
                <button
                    onClick={closeSidebar}
                    className="text-white hover:text-[#A9780F] transition-colors"
                >
                    <X size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={handleSendEmail}
                        className="flex-1 py-2 px-4 rounded-lg bg-[#A9780F] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#8e650c] transition-colors"
                    >
                        <Mail size={18} />
                        Enviar Correo
                    </button>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`flex-1 py-2 px-4 rounded-lg font-bold flex items-center justify-2 border-2 transition-colors ${isEditing
                            ? "bg-white border-red-500 text-red-500"
                            : "bg-white border-[#A9780F] text-[#A9780F]"
                            }`}
                    >
                        {isEditing ? <><X size={18} /> Cancelar</> : <><Edit size={18} /> Editar</>}
                    </button>
                </div>

                {isEditing ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={formData.email || ''}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full p-2 border rounded text-black"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono</label>
                            <input
                                type="text"
                                value={formData.phone || ''}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full p-2 border rounded text-black"
                            />
                        </div>
                        {selectedUser.type === 'fisica' && (
                            <>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre</label>
                                    <input
                                        type="text"
                                        value={formData.first_name || ''}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        className="w-full p-2 border rounded text-black"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Apellido</label>
                                    <input
                                        type="text"
                                        value={formData.last_name || ''}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        className="w-full p-2 border rounded text-black"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Identificación</label>
                                    <input
                                        type="text"
                                        value={formData.identification || formData.passport || ''}
                                        onChange={(e) => setFormData({ ...formData, identification: e.target.value })}
                                        className="w-full p-2 border rounded text-black"
                                    />
                                </div>
                            </>
                        )}
                        {selectedUser.type === 'juridica' && (
                            <>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre Empresa</label>
                                    <input
                                        type="text"
                                        value={formData.company_name || ''}
                                        onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                        className="w-full p-2 border rounded text-black"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">RNC</label>
                                    <input
                                        type="text"
                                        value={formData.rnc || ''}
                                        onChange={(e) => setFormData({ ...formData, rnc: e.target.value })}
                                        className="w-full p-2 border rounded text-black"
                                    />
                                </div>
                            </>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={updatingStatus}
                            className="w-full py-3 bg-green-600 text-white rounded font-bold hover:bg-green-700 transition-colors disabled:opacity-50 mt-4"
                        >
                            {updatingStatus ? "Guardando..." : "Guardar Cambios"}
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <DetailRow label="ID de Usuario" value={selectedUser.id} />
                        <DetailRow label="Tipo" value={selectedUser.type === 'fisica' ? 'Persona Física' : 'Persona Jurídica'} />
                        <DetailRow label="Nombre" value={selectedUser.name} />
                        <DetailRow label={selectedUser.identification_label} value={selectedUser.identification} />
                        <DetailRow label="Email" value={selectedUser.email} />
                        <DetailRow label="Teléfono" value={selectedUser.phone} />

                        <div className="pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-bold text-black mb-2">Dirección</h4>
                            <p className="text-sm text-gray-600">{selectedUser.address || 'No registrada'}</p>
                        </div>
                    </div>
                )}


            </div>
        </div>
    );
};

interface SidebarPaymentProps {
    closeSidebar: () => void;
    onSubmit: (amount: string, file: File) => Promise<void>;
    isSubmitting: boolean;
    currency: string;
}

export const SidebarPayment = ({ closeSidebar, onSubmit, isSubmitting, currency }: SidebarPaymentProps) => {
    const [amount, setAmount] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'DOP'>('USD');
    const [exchangeRate, setExchangeRate] = useState<number | null>(null);
    const [loadingRate, setLoadingRate] = useState(false);

    // Fetch exchange rate on mount
    useEffect(() => {
        setLoadingRate(true);
        fetch('https://v6.exchangerate-api.com/v6/8d1451c8aaa667219c66291d/latest/USD')
            .then(res => res.json())
            .then(data => {
                if (data.result === 'success' && data.conversion_rates?.DOP) {
                    setExchangeRate(data.conversion_rates.DOP);
                }
            })
            .catch(err => {
                console.error('Error fetching exchange rate:', err);
            })
            .finally(() => setLoadingRate(false));
    }, []);

    // Calculate USD equivalent
    const calculateUSDAmount = (): number => {
        if (selectedCurrency === 'USD') {
            return parseFloat(amount) || 0;
        } else if (selectedCurrency === 'DOP' && exchangeRate && amount) {
            return parseFloat(amount) / exchangeRate;
        }
        return 0;
    };

    const usdAmount = calculateUSDAmount();

    const handleSubmit = async () => {
        if (!amount || !file) return;

        const amountToSubmit = usdAmount.toFixed(2);
        await onSubmit(amountToSubmit, file);
    };

    return (
        <div className="h-full flex flex-col">
            <div className="bg-[#131E29] p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Abonar a Capital</h2>
                <button
                    onClick={closeSidebar}
                    className="text-white hover:text-[#A9780F] transition-colors"
                >
                    <X size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
                    <p className="text-sm text-gray-600 mb-4">
                        Ingrese el monto que desea abonar y suba el comprobante de la transacción.
                    </p>

                    {/* Currency Selector */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Moneda de Pago</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                key={'USD'}
                                type="button"
                                onClick={() => setSelectedCurrency('USD')}
                                className={`py-3 px-4 rounded-lg font-bold text-sm transition-all border-2 ${selectedCurrency === 'USD'
                                    ? 'bg-[#A9780F] text-white border-[#A9780F]'
                                    : 'bg-white text-gray-700 border-gray-300 hover:border-[#A9780F]'
                                    }`}
                            >
                                USD (Dólares)
                            </button>
                            <button
                                key={'DOP'}
                                type="button"
                                onClick={() => setSelectedCurrency('DOP')}
                                className={`py-3 px-4 rounded-lg font-bold text-sm transition-all border-2 ${selectedCurrency === 'DOP'
                                    ? 'bg-[#A9780F] text-white border-[#A9780F]'
                                    : 'bg-white text-gray-700 border-gray-300 hover:border-[#A9780F]'
                                    }`}
                            >
                                DOP (Pesos)
                            </button>
                        </div>
                    </div>

                    {/* Amount Input */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">
                            Monto a Abonar ({selectedCurrency})
                        </label>
                        <input
                            type="text"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder={selectedCurrency === 'USD' ? "USD 5000.00" : "DOP 325000.00"}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-[#A9780F] focus:border-[#A9780F] text-black"
                        />
                    </div>

                    {/* Exchange Rate Display for DOP */}
                    {selectedCurrency === 'DOP' && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                            {loadingRate ? (
                                <div className="flex items-center gap-2 text-blue-700">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                                    <span className="text-sm">Obteniendo tasa de cambio...</span>
                                </div>
                            ) : exchangeRate ? (
                                <>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700">Tasa de Cambio:</span>
                                        <span className="text-sm font-bold text-gray-900">1 USD = {exchangeRate.toFixed(4)} DOP</span>
                                    </div>
                                    {amount && parseFloat(amount) > 0 && (
                                        <div className="pt-2 border-t border-blue-300">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-gray-700">Equivalente en USD:</span>
                                                <span className="text-lg font-bold text-[#A9780F]">
                                                    ${usdAmount.toFixed(2)} USD
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-600 mt-1">
                                                {parseFloat(amount).toLocaleString('es-DO')} DOP = ${usdAmount.toFixed(2)} USD
                                            </p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-red-600">Error al obtener la tasa de cambio. Intente nuevamente.</p>
                            )}
                        </div>
                    )}
                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Comprobante de Pago</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center bg-white hover:bg-gray-50 transition-colors">
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="hidden"
                                id="receipt-upload"
                            />
                            <label htmlFor="receipt-upload" className="cursor-pointer flex flex-col items-center">
                                {file ? (
                                    <>
                                        <CheckCircle2 className="w-10 h-10 text-green-500 mb-2" />
                                        <span className="text-sm font-medium text-gray-900 text-center break-all">{file.name}</span>
                                        <span className="text-xs text-blue-500 mt-1">Clic para cambiar</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-gray-900">Subir Comprobante</span>
                                        <span className="text-xs text-gray-500 mt-1">PDF o Imagen</span>
                                    </>
                                )}
                            </label>
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!amount || !file || isSubmitting || (selectedCurrency === 'DOP' && !exchangeRate)}
                        className="w-full py-3 bg-[#A9780F] hover:bg-[#8e650c] text-white font-bold rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Procesando...
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                Confirmar Abono {selectedCurrency === 'DOP' && usdAmount > 0 && `($${usdAmount.toFixed(2)} USD)`}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
