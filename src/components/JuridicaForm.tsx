"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/src/lib/supabase/client";
import { formatCedula } from "@/src/lib/utils";
import { Database } from "../types/supabase";

interface JuridicaFormData {
    // I. Datos generales
    tipoEmpresa: string;
    razonSocial: string;
    rnc: string;
    registroMercantil: string;
    email: string;
    telefono: string;
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
    moneda: string;
    payment_method: string;
    banco: string;
    numTransaccion: string;
    product: string;
}

const steps = [
    { id: "empresa", title: "Datos de la Empresa" },
    { id: "representante", title: "Representante Legal" },
    { id: "inmueble", title: "Datos del Inmueble" }
];

export default function JuridicaForm({ onSuccess }: { onSuccess?: () => void }) {
    const [currentStep, setCurrentStep] = useState(0);
    const { register, handleSubmit, watch, trigger, setValue, formState: { errors } } = useForm<JuridicaFormData>({
        mode: "onChange",
        defaultValues: {
            tipoEmpresa: "SRL"
        }
    });

    // Property Selection State
    const [levels, setLevels] = useState<number[]>([]);
    const [locales, setLocales] = useState<any[]>([]);
    const [selectedLevel, setSelectedLevel] = useState<string>("");
    const [selectedLocale, setSelectedLocale] = useState<any>(null);
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

    // Handle Locale Selection
    const handleLocaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const localeId = e.target.value;
        const locale = locales.find(l => l.id.toString() === localeId);

        // Check for all unavailable statuses
        if (locale && locale.status !== 'DISPONIBLE') {
            alert(`Este local no está disponible (${locale.status}).`);
            return;
        }

        setSelectedLocale(locale || null);
        setValue("localComercial", localeId);
        if (locale) {
            setValue("metros", locale.area_mt2.toString());
        }
    };

    // Fetch locales when level changes
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
    }, [selectedLevel]);

    const onSubmit = async (data: JuridicaFormData) => {
        try {
            if (uploading) return;
            setUploading(true);

            const dbData = {
                // Company Info
                company_type: data.tipoEmpresa,
                company_name: data.razonSocial,
                rnc: data.rnc,

                mercantil_registry: data.registroMercantil,
                email: data.email,
                phone: data.telefono,

                // Company Address
                company_address_street: data.calleEmpresa,
                company_address_house: data.casaEmpresa,
                company_address_apto: data.aptoEmpresa,
                company_address_residential: data.residencialEmpresa,
                company_address_sector: data.sectorEmpresa,
                company_address_municipality: data.municipioEmpresa,
                company_address_province: data.provinciaEmpresa,

                // Representative Info
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
                // locale_id removed from person table


                status: 'pending'
            };

            // Insert into persona_juridica
            const { data: insertedData, error } = await supabase
                .from('persona_juridica')
                .insert(dbData)
                .select()
                .single();

            if (error) {
                console.error("Supabase Error:", error);
                throw new Error(error.message);
            }

            // Update locale status to 'RESERVADO'
            if (data.localComercial) {
                const { error: updateError } = await supabase
                    .from('locales')
                    .update({ status: 'RESERVADO' })
                    .eq('id', parseInt(data.localComercial));

                if (updateError) {
                    console.error("Error updating locale status:", updateError);
                }
            }

            // Save session to LocalStorage
            if (insertedData) {
                if (onSuccess) {
                    onSuccess();
                    return;
                }
                localStorage.setItem('daka_user_id', insertedData.id);
                localStorage.setItem('daka_user_type', 'juridica');
                if (data.localComercial) {
                    localStorage.setItem('daka_selected_locale_id', data.localComercial);
                }

                // Redirect to Product Selection
                window.location.href = `/seleccion-producto`;
            }

        } catch (error: any) {
            console.error('Error submitting form:', error)
            alert(error.message || "Hubo un error al guardar los datos.")
            setUploading(false);
        }
    };

    const nextStep = async () => {
        let fieldsToValidate: (keyof JuridicaFormData)[] = [];

        if (currentStep === 0) {
            fieldsToValidate = ["tipoEmpresa", "razonSocial", "rnc", "email"];
        } else if (currentStep === 1) {
            fieldsToValidate = ["nombreRepresentante", "cedulaRepresentante", "estadoCivil"];
        } else if (currentStep === 2) {
            fieldsToValidate = ["nivel", "localComercial"];
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
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
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
                            <div>
                                <label className="block text-sm font-semibold mb-1">Correo Electrónico *</label>
                                <input
                                    type="email"
                                    {...register("email", {
                                        required: "El correo es requerido",
                                        pattern: {
                                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                            message: "Dirección de correo inválida"
                                        }
                                    })}
                                    placeholder=" empresa@ejemplo.com"
                                    className="p-2 border rounded w-full"
                                />
                                {errors.email && <span className="text-red-500 text-xs block mt-1">{errors.email.message}</span>}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1">Teléfono *</label>
                                <input
                                    type="tel"
                                    {...register("telefono", {
                                        required: "El teléfono es requerido",
                                    })}
                                    placeholder=" 809-000-0000"
                                    className="p-2 border rounded w-full"
                                />
                                {errors.telefono && <span className="text-red-500 text-xs block mt-1">{errors.telefono.message}</span>}
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
                                <input
                                    {...register("cedulaRepresentante", {
                                        required: "La cédula del representante es requerida",
                                        onChange: (e) => {
                                            const formatted = formatCedula(e.target.value);
                                            setValue("cedulaRepresentante", formatted);
                                        }
                                    })}
                                    placeholder=" 001-2345678-9"
                                    className="p-2 border rounded w-full"
                                />
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
                                    className="p-2 border rounded w-full"
                                    value={selectedLevel}
                                    onChange={(e) => {
                                        const newLevel = e.target.value;
                                        setSelectedLevel(newLevel);
                                        setValue("nivel", newLevel);
                                        setSelectedLocale(null);
                                    }}
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
                                    {...register("localComercial", { required: "El local comercial es requerido", onChange: handleLocaleChange })}
                                    className="p-2 border rounded w-full"
                                    disabled={!selectedLevel}
                                >
                                    <option value="">Seleccione Local</option>
                                    {locales.map((l: Database['public']['Tables']['locales']['Row']) => {
                                        const isAvailable = l.status === 'DISPONIBLE';
                                        let label = `Local ${l.id} (${l.area_mt2} m²)`;
                                        let statusLabel = "";

                                        if (!isAvailable) {
                                            statusLabel = ` - ${l.status}`;
                                        }

                                        return (
                                            <option
                                                key={l.id}
                                                value={l.id}
                                                disabled={!isAvailable}
                                                className={!isAvailable ? "text-gray-400 bg-gray-100" : ""}
                                            >
                                                {label}{statusLabel}
                                            </option>
                                        );
                                    })}
                                </select>
                                {errors.localComercial && <span className="text-red-500 text-xs block mt-1">{errors.localComercial.message}</span>}
                            </div>
                        </div>

                        {selectedLevel && (
                            <div className="mb-6 w-full animate-fadeIn">
                                <p className="text-sm font-semibold mb-2 text-gray-700">Plano del Nivel {selectedLevel}</p>
                                <div className="w-full rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                                    <img
                                        src={`/piso/piso${selectedLevel}.png`}
                                        alt={`Plano Nivel ${selectedLevel}`}
                                        className="w-full h-auto object-contain block"
                                    />
                                </div>
                            </div>
                        )}

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
                                        <p className="text-gray-600 font-medium">Separación</p>
                                        <p className="font-bold text-[#A9780F]">{formatCurrency(selectedLocale.separation_45)}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Navigation Buttons for previous steps */}
            {currentStep < 3 && (
                <div className="flex justify-between mt-6">
                    <button
                        type="button"
                        onClick={prevStep}
                        disabled={currentStep === 0}
                        className={`p-2 rounded-lg font-semibold border px-4 hover:bg-gray-50 ${currentStep === 0 ? "invisible" : ""}`}
                    >
                        Anterior
                    </button>

                    <button
                        type="button"
                        onClick={nextStep}
                        className="p-2 rounded-lg font-bold text-white bg-[#A9780F] px-6 hover:bg-[#8a620c]"
                    >
                        Siguiente
                    </button>
                </div>
            )}

            {/* Back button for Step 3 is handled differently or unnecessary if we just have the submit button. 
                But let's add a "Anterior" button for Step 3 just in case they want to review. */}
            {currentStep === 3 && (
                <div className="flex justify-start mt-4">
                    <button
                        type="button"
                        onClick={prevStep}
                        className="p-2 rounded-lg font-semibold border px-4 hover:bg-gray-50 text-sm text-gray-500"
                    >
                        ← Volver a revisar
                    </button>
                </div>
            )}
        </form>
    );
}
