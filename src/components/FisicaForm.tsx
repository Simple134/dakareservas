"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/src/lib/supabase/client";
import { formatCedula } from "../lib/utils";
import { Database } from "../types/supabase";

interface FisicaFormData {
  // I. Datos generales
  sexo: string;
  nombre: string;
  apellido: string;
  cedula: string;
  pasaporte: string;
  estadoCivil: string;
  ocupacion: string;
  email: string;
  telefono: string; // NEW FIELD

  // Cónyuge
  nombreConyuge: string;
  cedulaConyuge: string;
  ocupacionConyuge: string;

  // Dirección
  calle: string;
  casa: string;
  apto: string;
  residencial: string;
  sector: string;
  municipio: string;
  provincia: string;

  // Nacionalidad
  nacionalidad: string;
  otraNacionalidad: string;

  // II. Inmueble
  localComercial: string;
  nivel: string;
  metros: string;
  parqueo: string;

  // III. Pago
  montoReserva: string;
  moneda: string;
  payment_method: string;
  banco: string;
  numTransaccion: string;
  product: string;
}

const steps = [
  { id: "personal", title: "Datos Personales" },
  { id: "direccion", title: "Dirección y Nacionalidad" },
  { id: "inmueble", title: "Datos del Inmueble" },
];

export default function FisicaForm({ onSuccess }: { onSuccess?: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const { register, handleSubmit, watch, trigger, setValue, formState: { errors } } = useForm<FisicaFormData>({
    mode: "onChange",
    defaultValues: {
      product: "DAKA CAPITAL PLUS",
      moneda: "USD",
      payment_method: "Transferencia",
    }
  });

  const estadoCivil = watch("estadoCivil");

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

  const onSubmit = async (data: FisicaFormData) => {
    try {
      if (uploading) return;
      setUploading(true);

      const dbData = {
        // Personal Info
        first_name: data.nombre,
        last_name: data.apellido,
        gender: data.sexo,
        identification: data.cedula,
        passport: data.pasaporte,
        marital_status: data.estadoCivil,
        occupation: data.ocupacion,
        email: data.email,
        phone: data.telefono,

        // Spouse Info (if applicable)
        spouse_name: data.nombreConyuge,
        spouse_identification: data.cedulaConyuge,
        spouse_occupation: data.ocupacionConyuge,

        // Address
        address_street: data.calle,
        address_house: data.casa,
        address_apto: data.apto,
        address_residential: data.residencial,
        address_sector: data.sector,
        address_municipality: data.municipio,
        address_province: data.provincia,
        nationality: data.nacionalidad,
        other_nationality: data.otraNacionalidad,

        unit_code: data.localComercial || null,
        unit_level: data.nivel || null,
        unit_meters: data.metros || null,
        unit_parking: data.parqueo || null,


        status: 'pending'
      }

      // Insert into persona_fisica
      const { data: insertedData, error } = await supabase
        .from('persona_fisica')
        .insert(dbData)
        .select()
        .single();

      if (error) {
        console.error("Supabase Error:", error);
        throw new Error(error.message);
      }

      // Save session to LocalStorage (Only if not in admin mode i.e. no onSuccess)
      if (insertedData) {
        if (onSuccess) {
          onSuccess();
          return;
        }

        localStorage.setItem('daka_user_id', insertedData.id);
        localStorage.setItem('daka_user_type', 'fisica');
        if (data.localComercial) {
          localStorage.setItem('daka_selected_locale_id', data.localComercial);
        }

        // Redirect to Product Selection
        window.location.href = `/seleccion-producto`;
      }

    } catch (error: any) {
      console.error('Error submitting form:', error)
      alert(error.message || "Hubo un error al guardar los datos. Por favor intente nuevamente.")
      setUploading(false);
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof FisicaFormData)[] = [];

    if (currentStep === 0) {
      fieldsToValidate = ["nombre", "apellido", "cedula", "sexo", "estadoCivil", "email", "telefono"];
    } else if (currentStep === 1) {
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
            <div key={step.id} className={`text - xs md: text - sm font - medium ${index <= currentStep ? "text-[#A9780F]" : "text-gray-400"} `}>
              {index + 1}. <span className="hidden md:inline">{step.title}</span>
            </div>
          ))}
        </div>
        <div className="h-2 bg-gray-200 rounded-full">
          <div
            className="h-full bg-[#A9780F] rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}% ` }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {currentStep === 0 && (
          <motion.div key="step0" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
            <h3 className="text-xl font-bold text-black mb-6 border-b pb-2">Datos Personales</h3>

            {/* Nombres y Apellidos FIRST */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Nombre *</label>
                <input {...register("nombre", { required: "El nombre es requerido" })} placeholder=" Juan" className="p-2 border rounded w-full" />
                {errors.nombre && <span className="text-red-500 text-xs block mt-1">{errors.nombre.message}</span>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Apellido *</label>
                <input {...register("apellido", { required: "El apellido es requerido" })} placeholder=" Pérez" className="p-2 border rounded w-full" />
                {errors.apellido && <span className="text-red-500 text-xs block mt-1">{errors.apellido.message}</span>}
              </div>
            </div>

            <div className="mb-4">
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
                placeholder=" juan@ejemplo.com"
                className="p-2 border rounded w-full"
              />
              {errors.email && <span className="text-red-500 text-xs block mt-1">{errors.email.message}</span>}
            </div>

            <div className="mb-4">
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

            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Sexo *</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="Femenino" {...register("sexo", { required: "Seleccione el sexo" })} className="accent-[#A9780F]" /> Femenino
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="Masculino" {...register("sexo", { required: "Seleccione el sexo" })} className="accent-[#A9780F]" /> Masculino
                </label>
              </div>
              {errors.sexo && <span className="text-red-500 text-xs block mt-1">{errors.sexo.message}</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Cédula *</label>
                <input
                  {...register("cedula", {
                    required: "La cédula es requerida",
                    onChange: (e) => {
                      const formatted = formatCedula(e.target.value);
                      setValue("cedula", formatted);
                    }
                  })}
                  placeholder=" 000-0000000-0"
                  className="p-2 border rounded w-full"
                />
                {errors.cedula && <span className="text-red-500 text-xs block mt-1">{errors.cedula.message}</span>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Pasaporte</label>
                <input {...register("pasaporte")} placeholder=" AB123456" className="p-2 border rounded w-full" />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Estado Civil *</label>
                <select {...register("estadoCivil", { required: "El estado civil es requerido" })} className="p-2 border rounded w-full">
                  <option value="">Seleccione...</option>
                  <option value="Soltero">Soltero</option>
                  <option value="Casado">Casado</option>
                </select>
                {errors.estadoCivil && <span className="text-red-500 text-xs block mt-1">{errors.estadoCivil.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Ocupación</label>
                <input {...register("ocupacion")} placeholder=" Ingeniero" className="p-2 border rounded w-full" />
              </div>
            </div>

            {estadoCivil === "Casado" && (
              <div className="mt-6 p-4 bg-gray-50 rounded border border-gray-200">
                <h4 className="font-semibold mb-3 text-sm text-gray-700">Información de la cónyuge</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Nombre y Apellido</label>
                    <input {...register("nombreConyuge")} placeholder=" María González" className="p-2 border rounded w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Cédula</label>
                    <input
                      {...register("cedulaConyuge", {
                        onChange: (e) => {
                          const formatted = formatCedula(e.target.value);
                          setValue("cedulaConyuge", formatted);
                        }
                      })}
                      placeholder=" 001-9876543-2"
                      className="p-2 border rounded w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Ocupación</label>
                    <input {...register("ocupacionConyuge")} placeholder=" Doctora" className="p-2 border rounded w-full" />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {currentStep === 1 && (
          <motion.div key="step1" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
            <h3 className="text-xl font-bold text-[#131E29] mb-6 border-b pb-2">Dirección y Nacionalidad</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold mb-1">Calle</label>
                <input {...register("calle")} placeholder=" Av. 27 de Febrero" className="p-2 border rounded w-full" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Casa No.</label>
                <input {...register("casa")} placeholder=" 123" className="p-2 border rounded w-full" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Apto.</label>
                <input {...register("apto")} placeholder=" 4B" className="p-2 border rounded w-full" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Residencial</label>
                <input {...register("residencial")} placeholder=" Los Jardines" className="p-2 border rounded w-full" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Sector</label>
                <input {...register("sector")} placeholder=" Naco" className="p-2 border rounded w-full" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Municipio</label>
                <input {...register("municipio")} placeholder=" Santo Domingo Este" className="p-2 border rounded w-full" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Provincia</label>
                <select {...register("provincia")} className="p-2 border rounded w-full">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Nacionalidad</label>
                <input {...register("nacionalidad")} placeholder=" Dominicana" className="p-2 border rounded w-full" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Otra Nacionalidad</label>
                <input {...register("otraNacionalidad")} placeholder=" Española" className="p-2 border rounded w-full" />
              </div>
            </div>
          </motion.div>
        )}

        {currentStep === 2 && (
          <motion.div key="step2" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
            <h3 className="text-xl font-bold text-[#131E29] mb-6 border-b pb-2">Datos del Inmueble</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Nivel *</label>
                <select
                  className="p-3 border rounded w-full"
                  value={selectedLevel}
                  {...register("nivel", {
                    required: "Seleccione un nivel",
                    onChange: (e) => (setSelectedLocale(null), setSelectedLevel(e.target.value))
                  })}
                >
                  <option value="">Seleccione Nivel</option>
                  {levels.map(level => (
                    <option key={level} value={level}>Nivel {level}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Local Comercial *</label>
                <select
                  {...register("localComercial", { required: "El local comercial es requerido", onChange: handleLocaleChange })}
                  className="p-3 border rounded w-full"
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div className="col-span-2 md:col-span-2">
                    <div>
                      <p className="text-gray-500">Metros Cuadrados</p>
                      <p className="font-semibold">{selectedLocale.area_mt2} m²</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Precio por m²</p>
                      <p className="font-semibold">{formatCurrency(selectedLocale.price_per_mt2)}</p>
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-2">
                    <p className="text-gray-500">Valor Total</p>
                    <p className="font-bold text-lg text-[#131E29]">{formatCurrency(selectedLocale.total_value)}</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className={`flex flex-col gap-2 ${currentStep === steps.length - 1 ? "justify-center" : "justify-between"} `}>
        <button
          type="button"
          onClick={prevStep}
          disabled={currentStep === 0}
          className={`p-2 rounded-lg font-bold text-black border border-black ${currentStep === 0 ? "hidden" : ""} `}
        >
          Anterior
        </button>

        {currentStep < steps.length - 1 ? (
          <button
            type="button"
            onClick={nextStep}
            className={`p-2 rounded-lg font-bold text-white bg-[#A9780F] ${currentStep < steps.length - 1 ? "w-full" : ""} `}
          >
            Siguiente
          </button>
        ) : (
          <button
            type="submit"
            className="p-2 rounded-lg font-bold text-white bg-gradient-to-r from-[#A9780F] to-[#131E29] hover:shadow-xl transition-all"
          >
            Registrar y Continuar {uploading && "(Guardando...)"}
          </button>
        )}
      </div>
    </form>
  );
}
