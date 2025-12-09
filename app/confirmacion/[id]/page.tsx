"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Container } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { supabase } from "@/src/lib/supabase/client";
import { Database } from "@/src/types/supabase";

export default function ConfirmacionPage() {
    const params = useParams();
    const router = useRouter();
    const [allocation, setAllocation] = useState<Database['public']['Tables']['product_allocations']['Row']>();
    const [product, setProduct] = useState<Database['public']['Tables']['products']['Row']>();
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    // Payment inputs
    const [currency, setCurrency] = useState('USD');
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'card'>('transfer');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

    // Property Selection State
    const [levels, setLevels] = useState<number[]>([]);
    const [locales, setLocales] = useState<any[]>([]);
    const [selectedLevel, setSelectedLevel] = useState<string>("");
    const [selectedLocale, setSelectedLocale] = useState<any>(null);
    const [userId, setUserId] = useState<string>("");
    const [lockedLocales, setLockedLocales] = useState<string[]>([]);

    // Constants
    const DOLLAR_RATE = 64.44;
    const MIN_INVESTMENT_USD = 5000;
    const minInvestment = currency === 'USD' ? MIN_INVESTMENT_USD : MIN_INVESTMENT_USD * DOLLAR_RATE;

    const allocationId = params.id as string;

    const bankAccounts = [
        { bank: "Banco Popular", number: "844338509", type: "Corriente", currency: "DOP", rnc: "132139313" },
        { bank: "BHD León", number: "30588390012", type: "Ahorros", currency: "DOP", rnc: "132139313" },
        { bank: "Banco de Reservas", number: "9605943513", type: "Ahorros", currency: "DOP", rnc: "132139313" },
        { bank: "BHD León", number: "30588390021", type: "Ahorros", currency: "USD", rnc: "132139313" },
    ];

    // Initialize random anonymous user ID for presence
    useEffect(() => {
        setUserId(crypto.randomUUID());
    }, []);

    // Fetch Levels on Mount
    useEffect(() => {
        const fetchLevels = async () => {
            const { data, error } = await supabase
                .from('locales')
                .select('level')
                .order('level');

            if (data) {
                const uniqueLevels = Array.from(new Set(data.map((l: any) => l.level)));
                setLevels(uniqueLevels);
            }
        };
        fetchLevels();
    }, []);

    // Handle Locale Selection
    const handleLocaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const localeId = e.target.value;
        const locale = locales.find(l => l.id.toString() === localeId);

        if (lockedLocales.includes(localeId)) {
            alert("Este local está siendo visto por otro cliente en este momento.");
            return;
        }

        // Check for all unavailable statuses
        if (locale && locale.status !== 'DISPONIBLE') {
            alert(`Este local no está disponible (${locale.status}).`);
            return;
        }

        setSelectedLocale(locale || null);
    };

    // Realtime Locales Update, Fetch logic AND Presence
    useEffect(() => {
        const fetchLocales = async () => {
            if (!selectedLevel) {
                setLocales([]);
                return;
            }

            const { data, error } = await supabase
                .from('locales')
                .select('*')
                .eq('level', parseInt(selectedLevel))
                .order('id');

            if (data) setLocales(data);
        };

        fetchLocales();

        // Subscribe to changes in locales table & Presence
        console.log("Setting up Supabase channel...");
        const channel = supabase.channel('locales_presence_conf', {
            config: {
                presence: {
                    key: userId,
                },
            },
        });

        channel
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'locales',
                },
                (payload) => {
                    if (payload.new.level === parseInt(selectedLevel)) {
                        setLocales(prev => prev.map(l => l.id === payload.new.id ? payload.new : l));

                        if (selectedLocale && selectedLocale.id === payload.new.id && payload.new.status !== 'DISPONIBLE') {
                            alert("¡El local seleccionado acaba de ser reservado por otro usuario!");
                            setSelectedLocale(null);
                        }
                    }
                }
            )
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState();
                const locks: string[] = [];

                Object.values(newState).forEach((presences: any) => {
                    presences.forEach((p: any) => {
                        if (p.localeId) {
                            const lockId = String(p.localeId); // FORCE STRING
                            // Check against current selection (also forced to string)
                            const currentId = selectedLocale?.id ? String(selectedLocale.id) : null;

                            if (lockId !== currentId) {
                                locks.push(lockId);
                            }
                        }
                    });
                });
                setLockedLocales(locks);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    if (selectedLocale) {
                        await channel.track({
                            localeId: String(selectedLocale.id), // FORCE STRING
                            user_id: userId
                        });
                    }
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedLevel, userId]);

    // Separate effect to update tracking when selection changes
    useEffect(() => {
        if (!userId) return;

        const channel = supabase.getChannels().find(c => c.topic === 'realtime:locales_presence_conf');
        if (channel) {
            channel.track({
                localeId: selectedLocale?.id ? String(selectedLocale.id) : null,
                user_id: userId
            });
        }
    }, [selectedLocale, userId]);

    useEffect(() => {
        async function fetchAllocation() {
            try {
                // Fetch allocation
                const { data: allocData, error: allocError } = await supabase
                    .from('product_allocations')
                    .select('*')
                    .eq('id', allocationId)
                    .single();

                if (allocError) throw allocError;
                setAllocation(allocData);

                // Fetch product details
                if (allocData.product_id) {
                    const { data: prodData, error: prodError } = await supabase
                        .from('products')
                        .select('*')
                        .eq('id', allocData.product_id)
                        .single();

                    if (prodError) throw prodError;
                    setProduct(prodData);
                }

            } catch (error) {
                console.error('Error fetching data:', error);
                alert("Error cargando los datos de la reserva.");
                router.push('/');
            } finally {
                setLoading(false);
            }
        }

        if (allocationId) {
            fetchAllocation();
        }
    }, [allocationId, router]);

    // Receipt Preview Handler
    useEffect(() => {
        if (!receiptFile) {
            setReceiptPreview(null);
            return;
        }

        const objectUrl = URL.createObjectURL(receiptFile);
        setReceiptPreview(objectUrl);

        return () => URL.revokeObjectURL(objectUrl);
    }, [receiptFile]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(val);
    };

    const handleUpdatePayment = async () => {
        // Validation

        // 1. Local Validation
        if (!selectedLocale) {
            alert("Por favor seleccione un Local Comercial.");
            return;
        }

        const numAmount = Number(amount);
        if (!amount || isNaN(numAmount) || numAmount <= 0) {
            alert("Por favor ingrese un monto válido.");
            return;
        }

        if (numAmount < minInvestment) {
            alert(`El monto mínimo de inversión es ${minInvestment.toLocaleString()} ${currency}`);
            return;
        }

        if (paymentMethod === 'transfer' && !receiptFile) {
            alert("Por favor adjunte el comprobante de transferencia.");
            return;
        }

        try {
            setUpdating(true);
            let receiptUrl = null;

            // Upload Receipt if Transfer
            if (paymentMethod === 'transfer' && receiptFile) {
                const fileExt = receiptFile.name.split('.').pop();
                const fileName = `${allocationId}-${Math.random()}.${fileExt}`;
                const { error: uploadError, data: uploadData } = await supabase.storage
                    .from('receipts')
                    .upload(fileName, receiptFile);

                if (uploadError) throw uploadError;

                // Get public URL
                const { data: publicUrlData } = supabase.storage
                    .from('receipts')
                    .getPublicUrl(fileName);

                receiptUrl = publicUrlData.publicUrl;
            }

            // Update Allocation
            const { error: allocError } = await supabase
                .from('product_allocations')
                .update({
                    amount: numAmount,
                    currency: currency,
                    payment_method: paymentMethod,
                    receipt_url: receiptUrl,
                    status: 'pending',
                })
                .eq('id', allocationId);

            if (allocError) throw allocError;

            // Update Linked Persona (Fisica or Juridica) with Locale Info
            const localeData = {
                unit_code: selectedLocale.id.toString(),
                unit_level: selectedLevel,
                unit_meters: selectedLocale.area_mt2.toString(),
                unit_parking: null, // Depending on if parking logic exists, for now null
                locale_id: selectedLocale.id
            };

            if (allocation?.persona_fisica_id) {
                const { error: pfError } = await supabase
                    .from('persona_fisica')
                    .update(localeData)
                    .eq('id', allocation.persona_fisica_id);
                if (pfError) throw pfError;
            } else if (allocation?.persona_juridica_id) {
                const { error: pjError } = await supabase
                    .from('persona_juridica')
                    .update(localeData)
                    .eq('id', allocation.persona_juridica_id);
                if (pjError) throw pjError;
            }

            // Update Locale Status to RESERVADO
            const { error: localeError } = await supabase
                .from('locales')
                .update({ status: 'RESERVADO' })
                .eq('id', selectedLocale.id);

            if (localeError) {
                // Non-blocking error but should be noted
                console.error("Error updating locale status:", localeError);
            }

            router.push('/');

        } catch (error: any) {
            console.error("Error updating payment:", error);
            alert(error.message || "Error actualizando el pago.");
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: "#f8f7f5" }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="spinner-border text-warning"
                    style={{ width: "3rem", height: "3rem", color: "#A9780F" }}
                />
            </div>
        );
    }

    return (
        <div className="min-vh-100 py-5" style={{ backgroundColor: "white" }}>
            <Container>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-center"
                >
                    {/* Logo */}
                    <div className="d-flex justify-content-center mb-4">
                        <Image
                            src="/logoDaka.png"
                            alt="Daka Capital Logo"
                            width={200}
                            height={90}
                            className="img-fluid"
                            priority
                        />
                    </div>

                    {/* Success Animation */}
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className="mb-4"
                    >
                        <div
                            className="mx-auto rounded-circle d-flex align-items-center justify-content-center"
                            style={{
                                width: "120px",
                                height: "120px",
                                background: "linear-gradient(135deg, #A9780F 0%, #D4AF37 100%)",
                                boxShadow: "0 10px 40px rgba(169, 120, 15, 0.3)"
                            }}
                        >
                            <svg
                                width="60"
                                height="60"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <motion.path
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ delay: 0.5, duration: 0.6 }}
                                    d="M20 6L9 17l-5-5"
                                />
                            </svg>
                        </div>
                    </motion.div>

                    {/* Main Message */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                    >
                        <h1 className="display-4 fw-bold mb-3" style={{ color: "#131E29" }}>
                            ¡Producto Asignado!
                        </h1>
                        <p className="lead text-muted mb-4">
                            Complete los detalles de su inversión
                        </p>
                    </motion.div>

                    {/* Form Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="card border-0 shadow-lg mx-auto mb-4"
                        style={{ maxWidth: "700px", borderRadius: "1.5rem" }}
                    >
                        <div className="card-body p-5">

                            {product && (
                                <div className="mb-4 text-center border-b pb-4">
                                    <h4 className="fw-bold" style={{ color: "#131E29" }}>{product.name}</h4>
                                    <p className="text-muted text-sm">ID: {allocationId.slice(0, 8)}</p>
                                </div>
                            )}

                            {/* Payment Inputs */}
                            {!allocation?.amount ? (
                                <div className="space-y-6 text-start">

                                    {/* 0. Locale Selection */}
                                    <div className="mb-6 border-b pb-6">
                                        <h5 className="fw-bold mb-4" style={{ color: "#131E29" }}>Datos del Inmueble</h5>
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <label className="form-label fw-bold small">Nivel *</label>
                                                <select
                                                    className="form-select p-3 rounded-xl border-gray-200"
                                                    value={selectedLevel}
                                                    onChange={(e) => {
                                                        setSelectedLocale(null);
                                                        setSelectedLevel(e.target.value);
                                                    }}
                                                >
                                                    <option value="">Seleccione Nivel</option>
                                                    {levels.map(level => (
                                                        <option key={level} value={level}>Nivel {level}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="col-md-6">
                                                <label className="form-label fw-bold small">Local Comercial *</label>
                                                <select
                                                    className="form-select p-3 rounded-xl border-gray-200"
                                                    onChange={handleLocaleChange}
                                                    disabled={!selectedLevel}
                                                    value={selectedLocale?.id || ""}
                                                >
                                                    <option value="">Seleccione Local</option>
                                                    {locales.map((l: Database['public']['Tables']['locales']['Row']) => {
                                                        const isLocked = lockedLocales.includes(l.id.toString());
                                                        const isAvailable = l.status === 'DISPONIBLE';
                                                        let label = `Local ${l.id} (${l.area_mt2} m²)`;
                                                        let statusLabel = "";

                                                        // If my own selection is 'locked' in the array
                                                        const isMySelection = selectedLocale && String(selectedLocale.id) === String(l.id);

                                                        if (!isAvailable) {
                                                            statusLabel = ` - ${l.status}`;
                                                        } else if (isLocked && !isMySelection) {
                                                            statusLabel = " - EN USO";
                                                        }

                                                        const isDisabled = !isAvailable || (isLocked && !isMySelection);

                                                        return (
                                                            <option
                                                                key={l.id}
                                                                value={l.id}
                                                                disabled={isDisabled}
                                                                className={isDisabled ? "text-gray-400 bg-gray-100" : ""}
                                                            >
                                                                {label}{statusLabel}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </div>
                                        </div>

                                        {selectedLevel && (
                                            <div className="mt-4 w-full animate-fadeIn">
                                                <p className="text-sm font-semibold mb-2 text-gray-700">Plano del Nivel {selectedLevel}</p>
                                                <div className="w-full rounded-lg overflow-hidden border border-gray-200 shadow-sm relative">
                                                    <img
                                                        src={`/piso/piso${selectedLevel}.png`}
                                                        alt={`Plano Nivel ${selectedLevel}`}
                                                        className="w-full h-auto object-contain block"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {selectedLocale && (
                                            <div className="mt-4 bg-gray-50 p-4 rounded-xl border border-gray-200 animate-fadeIn">
                                                <h6 className="font-bold text-[#A9780F] mb-3">Detalles del Local {selectedLocale.id}</h6>
                                                <div className="row g-3 text-sm">
                                                    <div className="col-6">
                                                        <p className="text-gray-500 mb-0">Metros Cuadrados</p>
                                                        <p className="fw-bold">{selectedLocale.area_mt2} m²</p>
                                                    </div>
                                                    <div className="col-6">
                                                        <p className="text-gray-500 mb-0">Precio por m²</p>
                                                        <p className="fw-bold">{formatCurrency(selectedLocale.price_per_mt2)}</p>
                                                    </div>
                                                    <div className="col-12 border-t pt-2 mt-2">
                                                        <div className="d-flex justify-content-between items-center">
                                                            <span className="text-gray-500">Valor Total</span>
                                                            <span className="fw-bold fs-5 text-[#131E29]">{formatCurrency(selectedLocale.total_value)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="col-12 border-t pt-2 mt-0">
                                                        <div className="d-flex justify-content-between items-center">
                                                            <span className="text-gray-600 font-medium">Separación (10%)</span>
                                                            <span className="fw-bold text-[#A9780F]">{formatCurrency(selectedLocale.separation_10)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 1. Currency & Amount */}
                                    <div className="row g-3">
                                        <div className="col-md-4">
                                            <label className="form-label fw-bold">Moneda</label>
                                            <div className="d-flex gap-2">
                                                {['USD', 'DOP'].map((curr) => (
                                                    <button
                                                        key={curr}
                                                        onClick={() => setCurrency(curr)}
                                                        className={`btn flex-fill ${currency === curr ? 'btn-dark' : 'btn-outline-secondary'}`}
                                                    >
                                                        {curr}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="col-md-8">
                                            <label className="form-label fw-bold">
                                                Monto de Inversión
                                                <span className="text-muted fw-normal ms-2 text-xs">
                                                    (Min: {minInvestment.toLocaleString()} {currency})
                                                </span>
                                            </label>
                                            <div className="input-group">
                                                <span className="input-group-text">{currency === 'USD' ? '$' : 'RD$'}</span>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    placeholder="0.00"
                                                    value={amount}
                                                    onChange={(e) => setAmount(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 2. Payment Method */}
                                    <div className="">
                                        <label className="form-label fw-bold mb-3">Método de Pago</label>
                                        <div className="flex flex-col gap-3">
                                            <label className={`flex-1 border rounded-xl p-3 cursor-pointer transition-all ${paymentMethod === 'transfer' ? 'border-[#C8A31D] bg-[#FFF8E7]' : 'border-gray-200 hover:bg-gray-50'}`}>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="radio"
                                                        name="paymentMethod"
                                                        checked={paymentMethod === 'transfer'}
                                                        onChange={() => setPaymentMethod('transfer')}
                                                        className="accent-[#C8A31D] w-5 h-5"
                                                    />
                                                    <div>
                                                        <span className="font-semibold block">Transferencia Bancaria</span>
                                                        <span className="text-xs text-gray-500">Adjuntar comprobante</span>
                                                    </div>
                                                </div>
                                            </label>

                                            <label className={`flex-1 border rounded-xl p-3 cursor-pointer transition-all ${paymentMethod === 'card' ? 'border-[#C8A31D] bg-[#FFF8E7]' : 'border-gray-200 hover:bg-gray-50'}`}>
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="radio"
                                                        name="paymentMethod"
                                                        checked={paymentMethod === 'card'}
                                                        onChange={() => setPaymentMethod('card')}
                                                        className="accent-[#C8A31D] w-5 h-5"
                                                    />
                                                    <div>
                                                        <span className="font-semibold block">Tarjeta Crédito/Débito</span>
                                                        <span className="text-xs text-gray-500">Pago en línea</span>
                                                    </div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    {/* 3. Conditional Content */}
                                    {paymentMethod === 'transfer' && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="bg-gray-50 p-4 rounded-xl border border-gray-200"
                                        >
                                            <h6 className="font-bold text-sm text-gray-700 mb-3">Cuentas Bancarias Disponibles:</h6>
                                            <div className="space-y-2 mb-4">
                                                {bankAccounts.map((account, idx) => (
                                                    <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-gray-100 text-sm">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-[#131E29]">{account.bank}</span>
                                                            <span className="text-gray-600 font-mono">{account.number}</span>
                                                            <span className="text-gray-600 font-mono">Rnc: {account.rnc}</span>
                                                        </div>
                                                        <span className="badge bg-gray-200 text-gray-700">{account.currency}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-4">
                                                <label className="block text-sm font-semibold mb-2">Adjuntar Comprobante *</label>
                                                <input
                                                    type="file"
                                                    accept="image/*,.pdf"
                                                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#131E29] file:text-white hover:file:bg-[#2C3E50]"
                                                />
                                                {receiptPreview && (
                                                    <div className="mt-3 relative h-48 w-full rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                                                        <Image
                                                            src={receiptPreview}
                                                            alt="Vista previa del comprobante"
                                                            fill
                                                            className="object-contain"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}

                                    <button
                                        onClick={handleUpdatePayment}
                                        disabled={updating || !amount || (paymentMethod === 'transfer' && !receiptFile) || !selectedLocale}
                                        className="btn w-100 py-3 fw-bold text-white shadow-sm mt-4 rounded-xl transition-all"
                                        style={{ backgroundColor: "#A9780F", borderColor: "#A9780F" }}
                                    >
                                        {updating ? 'Procesando...' : 'Confirmar Inversión'}
                                    </button>
                                </div>
                            ) : (
                                <div className="alert alert-success">
                                    <h5 className="alert-heading fw-bold">¡Inversión Confirmada!</h5>
                                    <p>
                                        Usted ha confirmado una inversión de: <br />
                                        <strong>{allocation.amount.toLocaleString()} {allocation.currency}</strong>
                                    </p>
                                    <hr />
                                    <p className="mb-0 text-sm">
                                        En breve recibirá un correo con los detalles.
                                    </p>
                                </div>
                            )}

                        </div>
                    </motion.div>

                    {/* Action Buttons */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="d-flex flex-column flex-md-row gap-3 justify-content-center"
                    >
                        <button
                            onClick={() => router.push("/")}
                            className="btn btn-lg px-5 py-3 fw-bold rounded-pill"
                            style={{
                                background: "linear-gradient(90deg, #131E29 0%, #2C3E50 100%)",
                                color: "white",
                                border: "none",
                                boxShadow: "0 4px 15px rgba(19, 30, 41, 0.2)"
                            }}
                        >
                            Volver al Inicio
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="btn btn-lg btn-outline-secondary px-5 py-3 fw-bold rounded-pill"
                        >
                            Imprimir Comprobante
                        </button>
                    </motion.div>

                    {/* Contact Info */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2 }}
                        className="text-muted mt-5"
                        style={{ fontSize: "0.9rem" }}
                    >
                        ¿Tiene preguntas? Contáctenos al{" "}
                        <a href="tel:+1234567890" className="text-decoration-none fw-semibold" style={{ color: "#A9780F" }}>
                            (809) 123-4567
                        </a>
                    </motion.p>
                </motion.div>
            </Container>
        </div>
    );
}