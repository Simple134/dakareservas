"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import JuridicaForm from "./JuridicaForm";
import FisicaForm from "./FisicaForm";

type PersonType = "fisica" | "juridica";

export default function ClientForm() {
  const searchParams = useSearchParams();
  const producto = searchParams.get("producto") || "estandar";
  const [personType, setPersonType] = useState<PersonType>("juridica");

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header / Product Info */}
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-6">
          <Image
            src="/daka2azul.png"
            alt="Daka Capital Logo"
            width={180}
            height={80}
            className="h-auto object-contain"
            priority
          />
        </div>
        <h2 className="text-2xl font-bold text-[#131E29] mb-2">Formulario de Solicitud</h2>
      </div>

      {/* Type Selector */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 p-1 rounded-lg inline-flex">
          <button
            onClick={() => setPersonType("juridica")}
            className={`px-6 py-2 rounded-md font-medium transition-all ${personType === "juridica"
              ? "bg-white text-[#131E29] shadow-sm"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Persona Jurídica
          </button>
          <button
            onClick={() => setPersonType("fisica")}
            className={`px-6 py-2 rounded-md font-medium transition-all ${personType === "fisica"
              ? "bg-white text-[#131E29] shadow-sm"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Persona Física
          </button>
        </div>
      </div>

      {/* Form Container */}
      <motion.div
        key={personType}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="bg-white p-6 md:p-8 rounded-xl shadow-lg border border-gray-100"
      >
        {personType === "juridica" ? (
          <JuridicaForm />
        ) : (
          <FisicaForm />
        )}
      </motion.div>
    </div>
  );
}
