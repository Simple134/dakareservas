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
      {/* Background Animation Layer - Blue Top */}
      <motion.div
        initial={{
          height: "100%",
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        }}
        animate={{
          height: step === "explanation" ? "50%" : "100%",
          borderBottomLeftRadius: step === "explanation" ? "20px" : "0px",
          borderBottomRightRadius: step === "explanation" ? "20px" : "0px",
        }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        className="absolute top-0 left-0 w-full bg-[#081845] z-0"
      />

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
                  src="/daka2.png"
                  alt="Daka Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>

              {/* Action Section */}
              <div className="w-full flex flex-col items-center space-y-6">
                <button
                  onClick={() => setStep("explanation")}
                  className="bg-[#C8A31D] w-full text-white font-semibold py-4 px-8 rounded-2xl"
                  style={{ borderRadius: "20px" }}
                >
                  <span>Ir al Sistema</span>
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
              <div className="text-center space-y-2 text-white">
                <h2 className="text-2xl text-white">
                  Sistema de <br />{" "}
                  <span className="font-bold text-3xl">
                    Compra y Reserva
                  </span>{" "}
                </h2>
              </div>

              {/* Steps Visualization */}
              <div className="relative w-full h-64 md:h-80">
                <Image
                  src="/daka2House.png"
                  alt="Daka House"
                  fill
                  className="object-contain drop-shadow-xl"
                  priority
                />
              </div>
              <Image
                src="/daka2azul.png"
                alt="Daka House"
                width={500}
                height={500}
                className="object-contain drop-shadow-xl"
              />

              {/* Action */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="w-full pt-4"
              >
                <Link
                  href="/formulario"
                  className="group w-full bg-[#C8A31D] text-white font-semibold py-4 px-8 rounded-2xl transition-all duration-300 transform active:scale-95 flex items-center justify-center space-x-2 shadow-[0_8px_30px_rgb(169,120,15,0.3)]"
                >
                  <span>Continuar</span>
                </Link>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
