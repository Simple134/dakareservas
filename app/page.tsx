
"use client";
import { useEffect, useState } from "react";
import Carousels from "@/src/components/Carousels";
import Image from "next/image";
import { supabase } from "@/src/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import confetti from 'canvas-confetti';

interface SaleDetails {
  clientName: string;
  level: string;
  unitCode: string;
  area: string;
  productName: string;
  spotsRemaining: number;
}

export default function Home() {
  const [showSale, setShowSale] = useState(false);
  const [saleDetails, setSaleDetails] = useState<SaleDetails | null>(null);

  useEffect(() => {
    if (showSale) {
      const timer = setTimeout(() => {
        handleCloseSale();
      }, 5000); // Close automatically after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [showSale]);

  useEffect(() => {
    console.log("Setting up Sales Realtime Channel...");
    const channel = supabase.channel('sales_home_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'product_allocations',
          filter: 'status=eq.approved'
        },
        async (payload) => {
          console.log("Realtime Sale Event Received:", payload);
          const newStatus = payload.new.status;
          const oldStatus = payload.old.status;

          // Only trigger if status CHANGED to approved (to avoid redundant updates if updating other fields)
          if (newStatus === 'approved' && oldStatus !== 'approved') {
            await fetchAndShowSale(payload.new.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAndShowSale = async (allocationId: string) => {
    try {
      // 1. Fetch full details of the sale
      const { data, error } = await supabase
        .from('product_allocations')
        .select(`
          *,
          product:products(*),
          persona_fisica(*, locales(*)),
          persona_juridica(*, locales(*))
        `)
        .eq('id', allocationId)
        .single();

      if (error || !data) {
        console.error("Error fetching sale details:", error);
        return;
      }

      // 2. Fetch COUNT of APPROVED allocations for this specific product
      // We need to know how many "positions" are taken by approved sales
      const { count: approvedCount, error: countError } = await supabase
        .from('product_allocations')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', data.product_id)
        .eq('status', 'approved');

      if (countError) {
        console.error("Error fetching approved count:", countError);
      }

      const productLimit = data.product?.limit || 0;
      const takenSpots = approvedCount || 0;
      const spotsRemaining = Math.max(0, productLimit - takenSpots);

      let clientName = "";
      let level = "";
      let unitCode = "";
      let area = "";

      if (data.persona_fisica) {
        const pf = data.persona_fisica;
        clientName = `${pf.first_name} ${pf.last_name}`;
        if (pf.locales) {
          level = pf.locales.level.toString();
          unitCode = pf.locales.id.toString();
          area = pf.locales.area_mt2.toString();
        }
      } else if (data.persona_juridica) {
        const pj = data.persona_juridica;
        clientName = pj.company_name || "Empresa";
        if (pj.locales) {
          level = pj.locales.level.toString();
          unitCode = pj.locales.id.toString();
          area = pj.locales.area_mt2.toString();
        }
      }

      setSaleDetails({
        clientName,
        level,
        unitCode,
        area,
        productName: data.product?.name || "Producto Daka",
        spotsRemaining
      });
      setShowSale(true);
      triggerConfetti();

    } catch (err) {
      console.error("Unexpected error handling sale:", err);
    }
  };

  const triggerConfetti = () => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // since particles fall down, start a bit higher than random
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const handleCloseSale = () => {
    setShowSale(false);
    setSaleDetails(null);
  };

  return (
    <div className="h-screen overflow-hidden bg-white flex items-center justify-center p-2 md:p-6">
      {/* Outer Frame - Dark Blue */}
      <div className="relative w-full h-full max-w-[95%] xl:max-w-[1400px] bg-[#131E29] p-3 md:p-4 rounded-3xl shadow-2xl overflow-hidden">

        {/* Inner Frame - Gold Border Effect */}
        <div className="bg-white border-2 md:border-4 border-[#A9780F] rounded-2xl overflow-hidden flex flex-col justify-center shadow-inner h-full relative">

          {/* Animate Presence for transitions */}
          <AnimatePresence mode="wait">
            {showSale && saleDetails ? (
              <motion.div
                key="sale-view"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.8, type: "spring" }}
                className="absolute inset-0 z-50 bg-[#131E29] flex flex-col items-center justify-center text-white p-8 text-center"
              >
                <div className="flex flex-col md:flex-row items-center justify-center gap-12 w-full max-w-6xl mx-auto">

                  {/* Left Side - Product Image */}
                  <motion.div
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex-1 flex justify-center md:justify-end"
                  >
                    {saleDetails?.productName.includes("PLUS") ? (
                      <Image
                        src="/dakaCapitalPlus.png"
                        alt="Daka Capital Plus"
                        width={350}
                        height={250}
                        className="object-contain drop-shadow-2xl"
                      />
                    ) : (
                      <Image
                        src="/dakaCapital.png"
                        alt="Daka Capital"
                        width={350}
                        height={250}
                        className="object-contain drop-shadow-2xl"
                      />
                    )}
                  </motion.div>

                  {/* Right Side - Information */}
                  <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left space-y-6">

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <span className="inline-block px-4 py-1.5 border border-[#A9780F] text-[#A9780F] font-bold tracking-[0.2em] rounded-full uppercase text-xs bg-[#A9780F]/10 mb-4">
                        Nueva Inversión Confirmada
                      </span>

                      <h1 className="text-4xl md:text-6xl font-bold font-serif text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#F8F1D2] to-[#D4AF37] leading-tight">
                        {saleDetails?.clientName || "Josue"}
                      </h1>
                    </motion.div>
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.9 }}
                      className="flex flex-row flex-wrap gap-4 items-center justify-center md:justify-start w-full"
                    >
                      <div className="text-center px-5 py-3 border border-white/10 rounded-xl bg-white/5 backdrop-blur-sm shadow-lg hover:bg-white/10 transition-colors">
                        <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Nivel</p>
                        <p className="text-2xl font-bold text-white">{saleDetails?.level || "1"}</p>
                      </div>
                      <div className="text-center px-5 py-3 border border-[#A9780F]/30 rounded-xl bg-[#A9780F]/10 backdrop-blur-sm shadow-lg">
                        <p className="text-[#A9780F] text-xs uppercase tracking-wider mb-1">Local</p>
                        <p className="text-2xl font-bold text-white">{saleDetails?.unitCode || "1"}</p>
                      </div>
                      <div className="text-center px-5 py-3 border border-white/10 rounded-xl bg-white/5 backdrop-blur-sm shadow-lg hover:bg-white/10 transition-colors">
                        <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Area</p>
                        <p className="text-2xl font-bold text-white">{saleDetails?.area || "1"} <span className="text-sm font-normal text-gray-400">m²</span></p>
                      </div>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 }}
                      className="w-full md:w-auto"
                    >
                      {/* Remaining Spots Card */}
                      <div className="px-8 py-5 backdrop-blur-sm rounded-r-xl w-full md:min-w-[300px]">
                        <p className="text-[#A9780F] text-xs uppercase tracking-widest mb-2 font-bold flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                          Disponibilidad Actual
                        </p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-5xl font-bold text-white">{saleDetails?.spotsRemaining || "0"}</span>
                          <span className="text-xl text-gray-400">cupos restantes</span>
                        </div>
                        <p className="text-sm text-gray-400 mt-2 border-t border-white/10 pt-2">
                          en <span className="text-white font-medium">{saleDetails?.productName || "Producto Daka"}</span>
                        </p>
                      </div>
                    </motion.div>
                  </div>
                </div>

              </motion.div>
            ) : (
              <motion.div
                key="default-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full h-full"
              >
                {/* Main Content Area */}
                <div className="grid grid-cols-3 overflow-hidden h-full">

                  {/* Carousel Section (70%) */}
                  <div className="col-span-2 w-full bg-white flex items-center justify-center relative overflow-hidden h-full">
                    <Carousels />
                  </div>

                  {/* QR Section (30%) */}
                  <div className="col-span-1 w-full p-6 flex flex-col items-center justify-center text-center bg-white relative h-full">
                    <div className="relative w-full max-w-[240px] aspect-square mb-6 p-4 bg-white rounded-2xl shadow-[0_0_20px_rgba(169,120,15,0.15)] border border-gray-100 group transition-all hover:shadow-[0_0_30px_rgba(169,120,15,0.25)]">
                      <div className="relative w-full h-full">
                        <Image
                          src="/qr.png"
                          alt="Código QR"
                          fill
                          className="object-contain p-2"
                        />
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-black mb-2 font-sans">
                      Escanea el código
                    </h3>
                    <div className="w-16 h-1 bg-[#A9780F] rounded-full mb-3"></div>
                    <p className="text-gray-500 max-w-[250px] leading-relaxed text-sm">
                      Descubre más detalles y agenda tu visita a nuestros proyectos exclusivos.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

      </div>
    </div>
    </div >
  );
}
