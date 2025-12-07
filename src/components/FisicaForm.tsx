"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/src/lib/supabase/client";

interface FisicaFormData {
  // I. Datos generales
  sexo: string;
  nombre: string;
  apellido: string;
  cedula: string;
  pasaporte: string;
  estadoCivil: string;
  ocupacion: string;

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
  banco: string;
  numTransaccion: string;
  modalidadPago: string;

  // IV. Declaraciones
  conozcoInmueble: string;
  origenLicito: string;
  residenciaEEUU: string;
  ciudadanoEEUU: string;
  permanenciaEEUU: string;
  politicoEEUU: string;
}

const steps = [
  { id: "personal", title: "Datos Personales" },
  { id: "direccion", title: "Dirección y Nacionalidad" },
  { id: "inmueble", title: "Datos del Inmueble" },
  { id: "pago", title: "Formas de Pago" },
  { id: "declaraciones", title: "Declaraciones" },
];

export default function FisicaForm({ producto }: { producto: string }) {
  const [currentStep, setCurrentStep] = useState(0);
  const { register, handleSubmit, watch, trigger, formState: { errors } } = useForm<FisicaFormData>({
    defaultValues: {
      modalidadPago: producto === "dakaplus" ? "DAKA CAPITAL PLUS" : "DAKA CAPITAL",
    }
  });

  const estadoCivil = watch("estadoCivil");

  const onSubmit = async (data: FisicaFormData) => {
    try {
      const dbData = {
        client_type: 'fisica',

        // Personal Info
        first_name: data.nombre,
        last_name: data.apellido,
        gender: data.sexo,
        identification: data.cedula,
        passport: data.pasaporte,
        marital_status: data.estadoCivil,
        occupation: data.ocupacion,

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

        // Property Info
        unit_code: data.localComercial || null,
        unit_level: data.nivel || null,
        unit_meters: data.metros || null,
        unit_parking: data.parqueo || null,

        // Payment Info
        reservation_amount: data.montoReserva ? parseFloat(data.montoReserva.replace(/[^0-9.]/g, '')) : 0,
        bank_name: data.banco || null,
        transaction_number: data.numTransaccion || null,
        product: producto, // Add product key from props

        // Declarations
        knows_property: data.conozcoInmueble === "SI",
        licit_funds: data.origenLicito === "SI",
        us_residency: data.residenciaEEUU === "SI",
        us_citizen: data.ciudadanoEEUU === "SI",
        us_permanence: data.permanenciaEEUU === "SI",
        us_political: data.politicoEEUU === "SI",

        status: 'pending'
      }

      const { data: insertedData, error } = await supabase
        .from('reservations')
        .insert(dbData)
        .select()
        .single()

      if (error) throw error

      // Redirect to confirmation page with reservation ID
      window.location.href = `/confirmacion/${insertedData.id}`
    } catch (error) {
      console.error('Error submitting form:', error)
      alert("Hubo un error al enviar la solicitud. Por favor intente nuevamente.")
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof FisicaFormData)[] = [];

    // Define fields to validate per step
    if (currentStep === 0) {
      fieldsToValidate = ["nombre", "apellido", "cedula", "sexo", "estadoCivil"];
    } else if (currentStep === 1) {
      // Add address fields if they become required
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {steps.map((step, index) => (
            <div key={step.id} className={`text-xs md:text-sm font-medium ${index <= currentStep ? "text-[#A9780F]" : "text-gray-400"} `}>
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
            <h3 className="text-xl font-bold text-[#131E29] mb-6 border-b pb-2">Datos Personales</h3>

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
                <input {...register("cedula", { required: "La cédula es requerida" })} placeholder=" 001-1234567-8" className="p-2 border rounded w-full" />
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
                    <input {...register("cedulaConyuge")} placeholder=" 001-9876543-2" className="p-2 border rounded w-full" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Identificación del Local Comercial</label>
                <input {...register("localComercial")} placeholder=" Local 101" className="p-2 border rounded w-full" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Nivel</label>
                <input {...register("nivel")} placeholder=" Planta Baja" className="p-2 border rounded w-full" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Metros de Construcción</label>
                <input {...register("metros")} placeholder=" 50 m²" className="p-2 border rounded w-full" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Cantidad de Parqueo</label>
                <input {...register("parqueo")} placeholder=" 2" className="p-2 border rounded w-full" />
              </div>
            </div>
          </motion.div>
        )}

        {currentStep === 3 && (
          <motion.div key="step3" variants={stepVariants} initial="hidden" animate="visible" exit="exit">
            <h3 className="text-xl font-bold text-[#131E29] mb-6 border-b pb-2">Formas de Pago</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-semibold mb-1">Reserva (NO REEMBOLSABLE) *</label>
                <input {...register("montoReserva", { required: "El monto de reserva es requerido" })} placeholder=" RD$50,000" className="p-2 border rounded w-full" />
                {errors.montoReserva && <span className="text-red-500 text-xs block mt-1">{errors.montoReserva.message}</span>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Tipo de Banco</label>
                <input {...register("banco")} placeholder=" Banco Popular" className="p-2 border rounded w-full" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Número de Transacción</label>
                <input {...register("numTransaccion")} placeholder=" 123456789" className="p-2 border rounded w-full" />
              </div>
            </div>

            <div className="mb-4">
              <div className="flex gap-4">
                <label className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors `}>
                  <input type="radio" value="DAKA CAPITAL" {...register("modalidadPago")} className="mt-1 accent-[#A9780F]" />
                  <div>
                    <span className="font-bold block">DAKA CAPITAL (Estándar)</span>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      <li>10% separación</li>
                      <li>40% en construcción</li>
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
                      <li>20% de retorno del inicial al final del proyecto</li>
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
            <div className="space-y-4 mb-8">
              {[
                { label: "Conozco el estado del inmueble", name: "conozcoInmueble" },
                { label: "Los fondos tienen origen lícito (Ley 155-17)", name: "origenLicito" },
                { label: "¿Ha residido o nació en EE. UU.?", name: "residenciaEEUU" },
                { label: "¿Es ciudadano o ha sido ciudadano de EE. UU.?", name: "ciudadanoEEUU" },
                { label: "¿Tiene permanencia significativa en EE. UU.?", name: "permanenciaEEUU" },
                { label: "¿Ha ocupado un puesto político o algún familiar lo ha ocupado en los últimos 3 años?", name: "politicoEEUU" },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                  <span className="text-sm md:text-base pr-4">{item.label}</span>
                  <div className="flex gap-4 shrink-0">
                    <label className="cursor-pointer"><input type="radio" value="SI" {...register(item.name as keyof FisicaFormData, { required: true })} className="mr-1 accent-[#A9780F]" /> SI</label>
                    <label className="cursor-pointer"><input type="radio" value="NO" {...register(item.name as keyof FisicaFormData, { required: true })} className="mr-1 accent-[#A9780F]" /> NO</label>
                  </div>
                </div>
              ))}
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
            Enviar Solicitud
          </button>
        )}
      </div>
    </form>
  );
}
