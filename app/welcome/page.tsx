"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, FileText, CheckCircle2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function WelcomePage() {
    const [step, setStep] = useState<"intro" | "explanation">("intro");

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">

            {/* Background Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#A9780F] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#131E29] rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

            {/* Main Content Container */}
            <div className="w-full max-w-md z-10 min-h-[400px] flex flex-col justify-center">
                <AnimatePresence mode="wait">

                    {/* STEP 1: INTRO */}
                    {step === "intro" && (
                        <motion.div
                            key="intro"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ duration: 0.5 }}
                            className="flex flex-col items-center space-y-12"
                        >
                            {/* Logo Section */}
                            <div className="relative w-48 h-24 md:w-64 md:h-32">
                                <Image
                                    src="/logoDaka.png"
                                    alt="Daka Logo"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </div>

                            {/* Action Section */}
                            <div className="w-full flex flex-col items-center space-y-6">
                                <h1 className="text-2xl font-bold text-black text-center">
                                    Bienvenido
                                </h1>

                                <button
                                    onClick={() => setStep("explanation")}
                                    className="group w-full bg-[#A9780F] hover:bg-[#8e650c] text-white font-semibold py-4 px-8 rounded-2xl transition-all duration-300 transform active:scale-95 flex items-center justify-center space-x-2 shadow-[0_8px_30px_rgb(169,120,15,0.3)]"
                                >
                                    <span>Continuar</span>
                                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: EXPLANATION */}
                    {step === "explanation" && (
                        <motion.div
                            key="explanation"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.5 }}
                            className="flex flex-col items-center space-y-8"
                        >
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-bold text-black">
                                    ¿Qué haremos?
                                </h2>
                                <p className="text-gray-500">
                                    Completa tu reserva en 2 simples pasos
                                </p>
                            </div>

                            {/* Steps Visualization */}
                            <div className="w-full space-y-4">

                                {/* Step Item 1 */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-white border border-gray-100 rounded-2xl p-4 shadow-lg flex items-center space-x-4"
                                >
                                    <div className="w-12 h-12 bg-[#131E29]/5 rounded-full flex items-center justify-center shrink-0">
                                        <FileText className="w-6 h-6 text-[#131E29]" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-black">Llenar Formulario</h3>
                                        <p className="text-sm text-gray-400">Datos básicos para tu registro</p>
                                    </div>
                                </motion.div>

                                {/* Connector */}
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: 24 }}
                                    transition={{ delay: 0.4 }}
                                    className="w-[2px] bg-gray-200 mx-auto"
                                />

                                {/* Step Item 2 */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="bg-white border border-gray-100 rounded-2xl p-4 shadow-lg flex items-center space-x-4"
                                >
                                    <div className="w-12 h-12 bg-[#A9780F]/10 rounded-full flex items-center justify-center shrink-0">
                                        <CheckCircle2 className="w-6 h-6 text-[#A9780F]" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-black">Seleccionar Producto</h3>
                                        <p className="text-sm text-gray-400">Elije entre Daka Capital y Plus</p>
                                    </div>
                                </motion.div>

                            </div>

                            {/* Action */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.8 }}
                                className="w-full pt-4"
                            >
                                <Link
                                    href="/formulario"
                                    className="group w-full bg-[#131E29] hover:bg-[#1c2b3a] text-white font-semibold py-4 px-8 rounded-2xl transition-all duration-300 transform active:scale-95 flex items-center justify-center space-x-2 shadow-[0_8px_30px_rgb(19,30,41,0.2)]"
                                >
                                    <span>Comenzar</span>
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </motion.div>

                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
}
