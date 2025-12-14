import { useState, useEffect } from "react";
import { CheckCircle2, Clock, Save, Trash2, X, Mail, Edit } from "lucide-react";
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
    handleUpdatePaymentInfo: () => void;
}



export const SidebarReservation = ({ selectedReservation, closeSidebar, updateStatus, updatingStatus, deleteReservation, editCurrency, setEditCurrency, editAmount, setEditAmount, editPaymentMethod, setEditPaymentMethod, editReceiptFile, setEditReceiptFile, handleUpdatePaymentInfo }: SidebarReservationProps) => {
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
                        <DetailRow label="Producto" value={selectedReservation.product_name} />

                        {/* Edit Payment Info Section if not approved */}
                        {selectedReservation.status !== 'approved' ? (
                            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 mt-2 space-y-3">
                                <h4 className="text-xs font-bold text-black uppercase">Actualizar Pago</h4>

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
                                    onClick={handleUpdatePaymentInfo}
                                    disabled={updatingStatus}
                                    className="w-full flex items-center justify-center gap-2 bg-[#A9780F] hover:bg-[#966b0d] text-white text-xs font-bold py-2 rounded transition-colors disabled:opacity-50"
                                >
                                    <Save size={14} />
                                    Guardar Cambios
                                </button>
                            </div>
                        ) : (
                            <>
                                <DetailRow label="Moneda" value={selectedReservation.currency} />
                                <DetailRow
                                    label="Monto Reserva"
                                    value={new Intl.NumberFormat('en-US', { style: 'currency', currency: selectedReservation.currency || 'USD' }).format(selectedReservation.amount)}
                                    highlight
                                />
                                <DetailRow label="Método de Pago" value={selectedReservation.payment_method} />
                                {selectedReservation.bank_name && (
                                    <DetailRow label="Banco" value={selectedReservation.bank_name} />
                                )}
                            </>
                        )}
                    </div>
                </div>

                {selectedReservation.receipt_url && (
                    <div className="mt-2">
                        {selectedReservation.receipt_url.toLowerCase().endsWith('.pdf') ? (
                            // PDF Display
                            <a
                                href={selectedReservation.receipt_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full"
                            >
                                <div className="relative h-48 w-full bg-gray-100 rounded-lg overflow-hidden border-2 border-[#A9780F] hover:border-[#8e650c] transition-colors flex items-center justify-center group cursor-pointer">
                                    <div className="text-center px-6">
                                        <svg
                                            className="w-16 h-16 mx-auto mb-3 text-[#A9780F] group-hover:scale-110 transition-transform"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                            />
                                        </svg>
                                        <p className="text-sm font-bold text-gray-900 mb-1">
                                            Comprobante PDF
                                        </p>
                                        <p className="text-xs text-gray-600 group-hover:text-[#A9780F] transition-colors">
                                            Clic para ver documento
                                        </p>
                                    </div>
                                </div>
                            </a>
                        ) : (
                            // Image Display
                            <a href={selectedReservation.receipt_url} target="_blank" rel="noopener noreferrer" className="block relative group cursor-zoom-in">
                                <div className="relative h-48 w-full bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={selectedReservation.receipt_url}
                                        alt="Comprobante de pago"
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                        <div className="opacity-0 group-hover:opacity-100 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm transition-all transform translate-y-2 group-hover:translate-y-0">
                                            Clic para ampliar
                                        </div>
                                    </div>
                                </div>
                            </a>
                        )}
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                            <Clock size={12} />
                            Subido el {new Date(selectedReservation.created_at).toLocaleDateString()}
                        </p>
                    </div>
                )}
            </div>
        </div>
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

                        <div className="flex border-b border-gray-200 mb-4">
                            <button
                                className={`flex-1 py-2 text-sm font-medium ${assignTab === 'existing' ? 'text-[#A9780F] border-b-2 border-[#A9780F]' : 'text-gray-500'}`}
                                onClick={() => setAssignTab('existing')}
                            >
                                Existente
                            </button>
                            <button
                                className={`flex-1 py-2 text-sm font-medium ${assignTab === 'new' ? 'text-[#A9780F] border-b-2 border-[#A9780F]' : 'text-gray-500'}`}
                                onClick={() => setAssignTab('new')}
                            >
                                Nuevo
                            </button>
                        </div>

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

                        {assignTab === 'existing' ? (
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
                        ) : (
                            <div className="space-y-4">
                                <div className="flex gap-4 mb-2">
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="userType"
                                            checked={newUserType === 'fisica'}
                                            onChange={() => setNewUserType('fisica')}
                                            className="mr-2 text-[#A9780F] focus:ring-[#A9780F]"
                                        />
                                        <span className="text-sm text-black">Persona</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="userType"
                                            checked={newUserType === 'juridica'}
                                            onChange={() => setNewUserType('juridica')}
                                            className="mr-2 text-[#A9780F] focus:ring-[#A9780F]"
                                        />
                                        <span className="text-sm text-black">Empresa</span>
                                    </label>
                                </div>

                                {newUserType === 'fisica' ? (
                                    <>
                                        <input
                                            type="text"
                                            placeholder="Nombre"
                                            value={newUserForm.firstName}
                                            onChange={e => setNewUserForm({ ...newUserForm, firstName: e.target.value })}
                                            className="block w-full text-black rounded-md border-gray-300 shadow-sm focus:border-[#A9780F] focus:ring-[#A9780F] sm:text-sm p-2 border"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Apellido"
                                            value={newUserForm.lastName}
                                            onChange={e => setNewUserForm({ ...newUserForm, lastName: e.target.value })}
                                            className="block w-full text-black rounded-md border-gray-300 shadow-sm focus:border-[#A9780F] focus:ring-[#A9780F] sm:text-sm p-2 border"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Cédula / Pasaporte"
                                            value={newUserForm.identification}
                                            onChange={e => setNewUserForm({ ...newUserForm, identification: e.target.value })}
                                            className="block w-full text-black rounded-md border-gray-300 shadow-sm focus:border-[#A9780F] focus:ring-[#A9780F] sm:text-sm p-2 border"
                                        />
                                    </>
                                ) : (
                                    <>
                                        <input
                                            type="text"
                                            placeholder="Nombre Empresa"
                                            value={newUserForm.companyName}
                                            onChange={e => setNewUserForm({ ...newUserForm, companyName: e.target.value })}
                                            className="block w-full text-black rounded-md border-gray-300 shadow-sm focus:border-[#A9780F] focus:ring-[#A9780F] sm:text-sm p-2 border"
                                        />
                                        <input
                                            type="text"
                                            placeholder="RNC"
                                            value={newUserForm.rnc}
                                            onChange={e => setNewUserForm({ ...newUserForm, rnc: e.target.value })}
                                            className="block w-full text-black rounded-md border-gray-300 shadow-sm focus:border-[#A9780F] focus:ring-[#A9780F] sm:text-sm p-2 border"
                                        />
                                    </>
                                )}

                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={newUserForm.email}
                                    onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                                    className="block w-full text-black rounded-md border-gray-300 shadow-sm focus:border-[#A9780F] focus:ring-[#A9780F] sm:text-sm p-2 border"
                                />

                                <button
                                    onClick={createAndAssignUser}
                                    disabled={updatingStatus}
                                    className="w-full bg-[#A9780F] text-white rounded-md py-2 font-bold hover:bg-[#8e650c] transition-colors disabled:opacity-50"
                                >
                                    {updatingStatus ? "Creando..." : "Guardar y Asignar"}
                                </button>
                            </div>
                        )}
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
                        className={`flex-1 py-2 px-4 rounded-lg font-bold flex items-center justify-center gap-2 border-2 transition-colors ${isEditing
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
