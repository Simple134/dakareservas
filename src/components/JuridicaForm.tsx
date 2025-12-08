"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/src/lib/supabase/client";

interface JuridicaFormData {
    // I. Datos generales
    tipoEmpresa: string;
    razonSocial: string;
    rnc: string;
    registroMercantil: string;
    calleEmpresa: string;
    casaEmpresa: string;
    aptoEmpresa: string;
    residencialEmpresa: string;
    sectorEmpresa: string;
    municipioEmpresa: string;
    provinciaEmpresa: string;

    // II. Representante
    nombreRepresentante: string;
    cedulaRepresentante: string;
    pasaporteRepresentante: string;
    estadoCivil: string;
    ocupacion: string;
    calleRepresentante: string;
    casaRepresentante: string;
    aptoRepresentante: string;
    residencialRepresentante: string;
    sectorRepresentante: string;
    municipioRepresentante: string;
    provinciaRepresentante: string;
    nacionalidad: string;
    otraNacionalidad: string;

    // III. Inmueble
    localComercial: string;
    nivel: string;
    metros: string;
    parqueo: string;

    // IV. Pago
    montoReserva: string;
    banco: string;
    numTransaccion: string;
    modalidadPago: string;

    // V. Declaraciones
    conozcoInmueble: string;
    origenLicito: string;
}

const steps = [
    { id: "empresa", title: "Datos de la Empresa" },
    { id: "representante", title: "Representante" },
    { id: "inmueble", title: "Datos del Inmueble" },
    { id: "pago", title: "Formas de Pago" },
    { id: "declaraciones", title: "Declaraciones" },
];

export default function JuridicaForm({ producto }: { producto: string }) {
    const [currentStep, setCurrentStep] = useState(2);
    const { register, handleSubmit, trigger, setValue, watch, formState: { errors } } = useForm<JuridicaFormData>({
        defaultValues: {
            modalidadPago: producto === "dakaplus" ? "DAKA CAPITAL PLUS" : "DAKA CAPITAL",
        }
    });

    // Property Selection State
    const [levels, setLevels] = useState<number[]>([]);
    const [locales, setLocales] = useState<any[]>([]);
    const [selectedLevel, setSelectedLevel] = useState<string>("");
    const [selectedLocale, setSelectedLocale] = useState<any>(null);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);

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

    // Realtime Locales Update and Fetch logic
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
                .in('status', ['DISPONIBLE']) // Only show available
                .order('id');

            if (data) setLocales(data);
        };

        fetchLocales();

        // Subscribe to changes in locales table
        const channel = supabase
            .channel('locales_changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'locales',
                },
                (payload) => {
                    console.log('Realtime update received:', payload);
                    // If a locale status changes to something other than DISPONIBLE, remove it from the list if it matches current level
                    if (payload.new.status !== 'DISPONIBLE' && payload.new.level === parseInt(selectedLevel)) {
                        setLocales((prev) => prev.filter((l) => l.id !== payload.new.id));
                        // If the removed locale was selected, alerting user could be nice, currently we just let form validation handle it on submit if they try.
                        // Or better: deselect it if it was selected.
                        if (selectedLocale && selectedLocale.id === payload.new.id) {
                            alert("¡El local seleccionado acaba de ser reservado por otro usuario!");
                            setSelectedLocale(null);
                            setValue("localComercial", "");
                        }
                    }
                    // If a locale becomes DISPONIBLE (e.g. cancelled reservation), add it?
                    // For now, let's keep it simple: just remove taken ones. To add new availables, we'd need to re-fetch or construct the object.
                    // Simple re-fetch is safer for consistency.
                    fetchLocales();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [selectedLevel, selectedLocale, setValue]);

    // Handle Locale Selection
    const handleLocaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const localeId = e.target.value;
        const locale = locales.find(l => l.id.toString() === localeId);

        setSelectedLocale(locale || null);
        setValue("localComercial", localeId);
        if (locale) {
            setValue("metros", locale.area_mt2.toString());
            // Clear or recalculate payment info if needed, though mostly handled in logic
        }
    };

    const onSubmit = async (data: JuridicaFormData) => {
        try {
            if (uploading) return;

            let receiptUrl = null;
            if (receiptFile) {
                setUploading(true);
                const fileExt = receiptFile.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('receipts')
                    .upload(filePath, receiptFile);

                if (uploadError) {
                    throw uploadError;
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('receipts')
                    .getPublicUrl(filePath);

                receiptUrl = publicUrl;
                setUploading(false);
            }

            // Map form data to database schema
            const dbData = {
                client_type: 'juridica',
                company_type: data.tipoEmpresa,
                company_name: data.razonSocial,
                rnc: data.rnc,
                mercantil_registry: data.registroMercantil,

                // Company Address
                company_address_street: data.calleEmpresa,
                company_address_house: data.casaEmpresa,
                company_address_apto: data.aptoEmpresa,
                company_address_residential: data.residencialEmpresa,
                company_address_sector: data.sectorEmpresa,
                company_address_municipality: data.municipioEmpresa,
                company_address_province: data.provinciaEmpresa,

                // Representative
                rep_name: data.nombreRepresentante,
                rep_identification: data.cedulaRepresentante,
                rep_passport: data.pasaporteRepresentante,
                rep_marital_status: data.estadoCivil,
                rep_occupation: data.ocupacion,
                rep_nationality: data.nacionalidad,

                // Representative Address
                address_street: data.calleRepresentante,
                address_house: data.casaRepresentante,
                address_apto: data.aptoRepresentante,
                address_residential: data.residencialRepresentante,
                address_sector: data.sectorRepresentante,
                address_municipality: data.municipioRepresentante,
                address_province: data.provinciaRepresentante,

                // Property Info
                unit_code: data.localComercial || null,
                unit_level: data.nivel || null,
                unit_meters: data.metros || null,
                unit_parking: data.parqueo || null,

                // Payment Info
                reservation_amount: data.montoReserva ? parseFloat(data.montoReserva.replace(/[^0-9.]/g, '')) : 0,
                bank_name: data.banco || "Banco Popular",
                transaction_number: data.numTransaccion || null,
                receipt_url: receiptUrl,
                product: producto, // Add product key from props

                // Declarations
                knows_property: data.conozcoInmueble === "SI",
                licit_funds: data.origenLicito === "SI",

                status: 'pending'
            }

            // Call the RPC function
            const { data: insertedData, error } = await supabase
                .rpc('create_reservation', { payload: dbData });

            if (error) {
                console.error("RPC Error:", error);
                throw new Error(error.message);
            }

            // Redirect to confirmation page with reservation ID
            const reservation = insertedData as any;
            window.location.href = `/confirmacion/${reservation.id}`
        } catch (error: any) {
            console.error('Error submitting form:', error)
            alert(error.message || "Hubo un error al enviar la solicitud. Por favor intente nuevamente.")
        }
    };

    const nextStep = async () => {
        let fieldsToValidate: (keyof JuridicaFormData)[] = [];

        if (currentStep === 0) {
            fieldsToValidate = ["tipoEmpresa", "razonSocial", "rnc"];
        } else if (currentStep === 1) {
            fieldsToValidate = ["nombreRepresentante", "cedulaRepresentante"];
        } else if (currentStep === 2) {
            fieldsToValidate = ["nivel", "localComercial"];
        } else if (currentStep === 3) {
            fieldsToValidate = ["montoReserva"];
        }

        const isValid = await trigger(fieldsToValidate);
        if (isValid) {
            setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
            window.scrollTo(0, 0);
        }
    };

    const prevStep = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 0));
        window.scrollTo(0, 0);
    };

    const stepVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
        exit: { opacity: 0, x: -20, transition: { duration: 0.3 } }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(val);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* Progress Bar */}
            <div className="mb-8">
                <div className="flex justify-between mb-2">
                    {steps.map((step, index) => (
                        <div key={step.id} className={`text-xs md:text-sm font-medium ${index <= currentStep ? "text-[#A9780F]" : "text-gray-400"}`}>
                            {index + 1}. <span className="hidden md:inline">{step.title}</span>
                        </div>
                    ))}
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                    <div
                        className="h-full bg-[#A9780F] rounded-full transition-all duration-300"
                        style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                    />
                </div>
            </div>

            <AnimatePresence mode="wait">
                {currentStep === 0 && (
                    <motion.div key="step0" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
                        <h3 className="text-xl font-bold text-[#131E29] mb-6 border-b pb-2">Datos de la Empresa</h3>

                        <div className="mb-4">
                            <label className="block text-sm font-semibold mb-2">Tipo de empresa *</label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {["Sociedad Anónima", "Sociedad Anónima Simplificada", "Sociedad sin fines de lucro", "Sociedad de Responsabilidad Limitada", "Empresa individual de responsabilidad limitada", "Sociedad en comandita por acciones", "Sociedad en nombre colectivo", "Sociedad en comandita simple"].map((tipo) => (
                                    <label key={tipo} className="flex items-center gap-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                                        <input type="radio" value={tipo} {...register("tipoEmpresa", { required: "Seleccione el tipo de empresa" })} className="accent-[#A9780F]" />
                                        <span className="text-sm ml-2">{tipo}</span>
                                    </label>
                                ))}
                            </div>
                            {errors.tipoEmpresa && <span className="text-red-500 text-xs block mt-1">{errors.tipoEmpresa.message}</span>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1">Razón Social *</label>
                                <input {...register("razonSocial", { required: "La razón social es requerida" })} placeholder=" Comercial XYZ SRL" className="p-2 border rounded w-full" />
                                {errors.razonSocial && <span className="text-red-500 text-xs block mt-1">{errors.razonSocial.message}</span>}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">RNC *</label>
                                <input {...register("rnc", { required: "El RNC es requerido" })} placeholder=" 123-45678-9" className="p-2 border rounded w-full" />
                                {errors.rnc && <span className="text-red-500 text-xs block mt-1">{errors.rnc.message}</span>}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Registro Mercantil No.</label>
                                <input {...register("registroMercantil")} placeholder=" 45678" className="p-2 border rounded w-full" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1">Calle</label>
                                <input {...register("calleEmpresa")} placeholder=" Av. Pedro Rivera" className="p-2 border rounded w-full" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Casa No.</label>
                                <input {...register("casaEmpresa")} placeholder=" 456" className="p-2 border rounded w-full" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Apto.</label>
                                <input {...register("aptoEmpresa")} placeholder=" 2C" className="p-2 border rounded w-full" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Residencial</label>
                                <input {...register("residencialEmpresa")} placeholder=" Plaza Central" className="p-2 border rounded w-full" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Sector</label>
                                <input {...register("sectorEmpresa")} placeholder="Rio Verde" className="p-2 border rounded w-full" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Municipio</label>
                                <input {...register("municipioEmpresa")} placeholder="Jarabacoa" className="p-2 border rounded w-full" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Provincia</label>
                                <select {...register("provinciaEmpresa")} className="p-2 border rounded w-full">
                                    <option value="">Seleccione Provincia</option>
                                    <option value="Azua">Azua</option>
                                    <option value="Baoruco">Baoruco</option>
                                    <option value="Barahona">Barahona</option>
                                    <option value="Dajabón">Dajabón</option>
                                    <option value="Distrito Nacional">Distrito Nacional</option>
                                    <option value="Duarte">Duarte</option>
                                    <option value="Elías Piña">Elías Piña</option>
                                    <option value="El Seibo">El Seibo</option>
                                    <option value="Espaillat">Espaillat</option>
                                    <option value="Hato Mayor">Hato Mayor</option>
                                    <option value="Hermanas Mirabal">Hermanas Mirabal</option>
                                    <option value="Independencia">Independencia</option>
                                    <option value="La Altagracia">La Altagracia</option>
                                    <option value="La Romana">La Romana</option>
                                    <option value="La Vega">La Vega</option>
                                    <option value="María Trinidad Sánchez">María Trinidad Sánchez</option>
                                    <option value="Monseñor Nouel">Monseñor Nouel</option>
                                    <option value="Monte Cristi">Monte Cristi</option>
                                    <option value="Monte Plata">Monte Plata</option>
                                    <option value="Pedernales">Pedernales</option>
                                    <option value="Peravia">Peravia</option>
                                    <option value="Puerto Plata">Puerto Plata</option>
                                    <option value="Samaná">Samaná</option>
                                    <option value="San Cristóbal">San Cristóbal</option>
                                    <option value="San José de Ocoa">San José de Ocoa</option>
                                    <option value="San Juan">San Juan</option>
                                    <option value="San Pedro de Macorís">San Pedro de Macorís</option>
                                    <option value="Sánchez Ramírez">Sánchez Ramírez</option>
                                    <option value="Santiago">Santiago</option>
                                    <option value="Santiago Rodríguez">Santiago Rodríguez</option>
                                    <option value="Santo Domingo">Santo Domingo</option>
                                    <option value="Valverde">Valverde</option>
                                </select>
                            </div>
                        </div>
                    </motion.div>
                )}

                {currentStep === 1 && (
                    <motion.div key="step1" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
                        <h3 className="text-xl font-bold text-[#131E29] mb-6 border-b pb-2">Informaciones del representante</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1">Nombres y  Apellidos *</label>
                                <input {...register("nombreRepresentante", { required: "El nombre del representante es requerido" })} placeholder=" Carlos Mejía" className="p-2 border rounded w-full" />
                                {errors.nombreRepresentante && <span className="text-red-500 text-xs block mt-1">{errors.nombreRepresentante.message}</span>}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Cédula de Identidad *</label>
                                <input {...register("cedulaRepresentante", { required: "La cédula del representante es requerida" })} placeholder=" 001-2345678-9" className="p-2 border rounded w-full" />
                                {errors.cedulaRepresentante && <span className="text-red-500 text-xs block mt-1">{errors.cedulaRepresentante.message}</span>}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Pasaporte</label>
                                <input {...register("pasaporteRepresentante")} placeholder=" CD987654" className="p-2 border rounded w-full" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Estado Civil</label>
                                <select {...register("estadoCivil")} className="p-2 border rounded w-full">
                                    <option value="">Estado Civil</option>
                                    <option value="Soltero">Soltero</option>
                                    <option value="Casado">Casado</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Ocupación</label>
                                <input {...register("ocupacion")} placeholder=" Administrador" className="p-2 border rounded w-full" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Nacionalidad</label>
                                <input {...register("nacionalidad")} placeholder=" Dominicana" className="p-2 border rounded w-full" />
                            </div>
                        </div>

                        <div className="mt-4">
                            <p className="text-sm font-semibold mb-2">Dirección Personal</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <input {...register("calleRepresentante")} placeholder="Calle" className="p-3 border rounded w-full" />
                                <input {...register("casaRepresentante")} placeholder="Casa No." className="p-3 border rounded w-full" />
                                <input {...register("aptoRepresentante")} placeholder="Apto." className="p-3 border rounded w-full" />
                                <input {...register("residencialRepresentante")} placeholder="Residencial" className="p-3 border rounded w-full" />
                                <input {...register("sectorRepresentante")} placeholder="Sector" className="p-3 border rounded w-full" />
                                <input {...register("municipioRepresentante")} placeholder="Municipio" className="p-3 border rounded w-full" />
                                <select {...register("provinciaRepresentante")} className="p-2 border rounded w-full">
                                    <option value="">Seleccione Provincia</option>
                                    <option value="Azua">Azua</option>
                                    <option value="Baoruco">Baoruco</option>
                                    <option value="Barahona">Barahona</option>
                                    <option value="Dajabón">Dajabón</option>
                                    <option value="Distrito Nacional">Distrito Nacional</option>
                                    <option value="Duarte">Duarte</option>
                                    <option value="Elías Piña">Elías Piña</option>
                                    <option value="El Seibo">El Seibo</option>
                                    <option value="Espaillat">Espaillat</option>
                                    <option value="Hato Mayor">Hato Mayor</option>
                                    <option value="Hermanas Mirabal">Hermanas Mirabal</option>
                                    <option value="Independencia">Independencia</option>
                                    <option value="La Altagracia">La Altagracia</option>
                                    <option value="La Romana">La Romana</option>
                                    <option value="La Vega">La Vega</option>
                                    <option value="María Trinidad Sánchez">María Trinidad Sánchez</option>
                                    <option value="Monseñor Nouel">Monseñor Nouel</option>
                                    <option value="Monte Cristi">Monte Cristi</option>
                                    <option value="Monte Plata">Monte Plata</option>
                                    <option value="Pedernales">Pedernales</option>
                                    <option value="Peravia">Peravia</option>
                                    <option value="Puerto Plata">Puerto Plata</option>
                                    <option value="Samaná">Samaná</option>
                                    <option value="San Cristóbal">San Cristóbal</option>
                                    <option value="San José de Ocoa">San José de Ocoa</option>
                                    <option value="San Juan">San Juan</option>
                                    <option value="San Pedro de Macorís">San Pedro de Macorís</option>
                                    <option value="Sánchez Ramírez">Sánchez Ramírez</option>
                                    <option value="Santiago">Santiago</option>
                                    <option value="Santiago Rodríguez">Santiago Rodríguez</option>
                                    <option value="Santo Domingo">Santo Domingo</option>
                                    <option value="Valverde">Valverde</option>
                                </select>
                            </div>
                        </div>
                    </motion.div>
                )}

                {currentStep === 2 && (
                    <motion.div key="step2" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
                        <h3 className="text-xl font-bold text-[#131E29] mb-6 border-b pb-2">Datos del inmueble</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1">Nivel *</label>
                                <select
                                    className="p-3 border rounded w-full"
                                    value={selectedLevel}
                                    {...register("nivel", {
                                        required: "Seleccione un nivel",
                                        onChange: (e) => setSelectedLevel(e.target.value)
                                    })}
                                >
                                    <option value="">Seleccione Nivel</option>
                                    {levels.map(level => (
                                        <option key={level} value={level}>Nivel {level}</option>
                                    ))}
                                </select>
                                {errors.nivel && <span className="text-red-500 text-xs block mt-1">{errors.nivel.message}</span>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-1">Local Comercial *</label>
                                <select
                                    className="p-3 border rounded w-full"
                                    disabled={!selectedLevel}
                                    {...register("localComercial", {
                                        required: "Seleccione un local",
                                        onChange: handleLocaleChange
                                    })}
                                >
                                    <option value="">Seleccione Local</option>
                                    {locales.map((locale: any) => (
                                        <option key={locale.id} value={locale.id}>
                                            Local {locale.id} ({locale.area_mt2} m²)
                                        </option>
                                    ))}
                                </select>
                                {errors.localComercial && <span className="text-red-500 text-xs block mt-1">{errors.localComercial.message}</span>}
                            </div>
                        </div>

                        {selectedLocale && (
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 animate-fadeIn">
                                <h4 className="font-bold text-[#A9780F] mb-3">Detalles del Local {selectedLocale.id}</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <p className="text-gray-500">Metros Cuadrados</p>
                                        <p className="font-semibold">{selectedLocale.area_mt2} m²</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Precio por m²</p>
                                        <p className="font-semibold">{formatCurrency(selectedLocale.price_per_mt2)}</p>
                                    </div>
                                    <div className="col-span-2 md:col-span-2">
                                        <p className="text-gray-500">Valor Total</p>
                                        <p className="font-bold text-lg text-[#131E29]">{formatCurrency(selectedLocale.total_value)}</p>
                                    </div>
                                    <div className="col-span-2 md:col-span-2 mt-2 pt-2 border-t border-gray-200">
                                        <p className="text-gray-600 font-medium">Separación (10%)</p>
                                        <p className="font-bold text-[#A9780F]">{formatCurrency(selectedLocale.separation_10)}</p>
                                    </div>
                                    <div className="col-span-2 md:col-span-2 mt-2 pt-2 border-t border-gray-200">
                                        <p className="text-gray-600 font-medium">Separación (45%)</p>
                                        <p className="font-bold text-[#A9780F]">{formatCurrency(selectedLocale.separation_45)}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {currentStep === 3 && (
                    <motion.div key="step3" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
                        <h3 className="text-xl font-bold text-[#131E29] mb-6 border-b pb-2">Formas de pago</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-semibold mb-1">Reserva (NO REEMBOLSABLE) *</label>
                                <input {...register("montoReserva", { required: "El monto de reserva es requerido" })} placeholder=" RD$400,000" className="p-2 border rounded w-full" />
                                {errors.montoReserva && <span className="text-red-500 text-xs block mt-1">{errors.montoReserva.message}</span>}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Tipo de Banco</label>
                                <select
                                    {...register("banco")}
                                    className="p-2 border rounded w-full"
                                    defaultValue=""
                                >
                                    <option value="">Seleccione Banco</option>
                                    <option value="Banco Popular">Banco Popular</option>
                                </select>
                            </div>
                        </div>

                        {watch("banco") === "Banco Popular" && (
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6 animate-fadeIn">
                                <h4 className="font-bold text-[#131E29] mb-2">Datos Bancarios para Transferencia</h4>
                                <p className="text-sm text-gray-700"><strong>Banco:</strong> Banco Popular</p>
                                <p className="text-sm text-gray-700"><strong>Cuenta (Pesos):</strong> 844338509 - Daka Dominicana</p>
                                <p className="text-sm text-gray-700"><strong>RNC:</strong> 132139313</p>
                            </div>
                        )}

                        <div className="mb-6">
                            <label className="block text-sm font-semibold mb-2">Subir Comprobante de Pago</label>
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        setReceiptFile(e.target.files[0]);
                                    }
                                }}
                                className="block w-full text-sm text-gray-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-[#A9780F] file:text-white
                                    hover:file:bg-[#8e650c]
                                "
                            />
                            {receiptFile && <p className="text-xs text-green-600 mt-1">Archivo seleccionado: {receiptFile.name}</p>}
                        </div>

                        <div className="mb-4">
                            <div className="space-y-3 flex flex-col lg:flex-row justify-between">
                                <label className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors`}>
                                    <input type="radio" value="DAKA CAPITAL" {...register("modalidadPago")} className="mt-1 accent-[#A9780F]" />
                                    <div>
                                        <span className="font-bold block">DAKA CAPITAL (Estándar)</span>
                                        <ul className="text-sm text-gray-600 list-disc list-inside">
                                            <li>10% separación (no reembolsable)</li>
                                            <li>40% durante construcción</li>
                                            <li>50% contra entrega</li>
                                        </ul>
                                    </div>
                                </label>
                                <label className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors bg-yellow-50 border-[#A9780F]`}>
                                    <input type="radio" value="DAKA CAPITAL PLUS" {...register("modalidadPago")} className="mt-1 accent-[#A9780F]" />
                                    <div>
                                        <span className="font-bold block">DAKA CAPITAL PLUS (Premium)</span>
                                        <ul className="text-sm text-gray-600 list-disc list-inside">
                                            <li>45% inicial</li>
                                            <li>55% contra entrega</li>
                                            <li>Retorno de beneficio: 20% del inicial entregado al final</li>
                                        </ul>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </motion.div>
                )}

                {currentStep === 4 && (
                    <motion.div key="step4" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
                        <h3 className="text-xl font-bold text-[#131E29] mb-6 border-b pb-2">Declaraciones</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 border rounded">
                                <span>Conozco el estado del inmueble</span>
                                <div className="flex gap-4">
                                    <label><input type="radio" value="SI" {...register("conozcoInmueble", { required: true })} className="mr-1 accent-[#A9780F]" /> SI</label>
                                    <label><input type="radio" value="NO" {...register("conozcoInmueble", { required: true })} className="mr-1 accent-[#A9780F]" /> NO</label>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 border rounded">
                                <span>Declaro que los fondos provienen de origen lícito (Ley 155-17)</span>
                                <div className="flex gap-4">
                                    <label><input type="radio" value="SI" {...register("origenLicito", { required: true })} className="mr-1 accent-[#A9780F]" /> SI</label>
                                    <label><input type="radio" value="NO" {...register("origenLicito", { required: true })} className="mr-1 accent-[#A9780F]" /> NO</label>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className={`flex flex-col gap-2  ${currentStep === steps.length - 1 ? "justify-center" : "justify-between"}`}>
                <button
                    type="button"
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className={`p-2 rounded-lg font-semibold border ${currentStep === 0 ? "hidden" : ""}`}
                >
                    Anterior
                </button>

                {currentStep < steps.length - 1 ? (
                    <button
                        type="button"
                        onClick={nextStep}
                        className={`p-2 rounded-lg font-bold text-white bg-[#A9780F]  ${currentStep < steps.length - 1 ? "w-full" : ""}`}
                    >
                        Siguiente
                    </button>
                ) : (
                    <button
                        type="submit"
                        className="p-2 rounded-lg font-bold text-white bg-gradient-to-r from-[#A9780F] to-[#131E29] hover:shadow-xl transition-all"
                    >
                        Enviar Solicitud {uploading && "(Subiendo...)"}
                    </button>
                )}
            </div>
        </form>
    );
}
