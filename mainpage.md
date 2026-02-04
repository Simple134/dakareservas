"use client";
import { useEffect, useState, useCallback } from "react";
import Carousels from "@/src/components/Carousels";
import Image from "next/image";
import { supabase } from "@/src/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

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

const handleCloseSale = useCallback(() => {
setShowSale(false);
setSaleDetails(null);
}, []);

useEffect(() => {
if (showSale) {
const timer = setTimeout(() => {
handleCloseSale();
}, 5000); // Close automatically after 5 seconds

      return () => clearTimeout(timer);
    }

}, [showSale, handleCloseSale]);

const playNotificationSound = useCallback(() => {
const audio = new Audio("/notification.mp3");
audio
.play()
.then(() => console.log("Notification sound playing successfully"))
.catch((err) => console.error("Error playing notification sound:", err));
}, []);

const triggerConfetti = useCallback(() => {
const duration = 5 \* 1000;
const animationEnd = Date.now() + duration;
const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval: NodeJS.Timeout = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // since particles fall down, start a bit higher than random
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

}, []);

const fetchAndShowSale = useCallback(
async (allocationId: string) => {
try {
// 1. Fetch full details of the sale
const { data, error } = await supabase
.from("product_allocations")
.select(
`           *,
          product:products(*),
          persona_fisica(*, locales(*)),
          persona_juridica(*, locales(*))
        `,
)
.eq("id", allocationId)
.single();

        if (error || !data) {
          console.error("Error fetching sale details:", error);
          return;
        }

        const { count: approvedCount, error: countError } = await supabase
          .from("product_allocations")
          .select("id", { count: "exact", head: true })
          .eq("product_id", data.product_id)
          .eq("status", "approved");

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
          spotsRemaining,
        });
        setShowSale(true);
        playNotificationSound();
        triggerConfetti();
      } catch (err) {
        console.error("Unexpected error handling sale:", err);
      }
    },
    [playNotificationSound, triggerConfetti],

);

useEffect(() => {
const channel = supabase
.channel("sales_home_updates")
.on(
"postgres_changes",
{
event: "UPDATE",
schema: "public",
table: "product_allocations",
filter: "status=eq.approved",
},
async (payload) => {
const newStatus = payload.new.status;
const oldStatus = payload.old.status;

          // Only trigger if status CHANGED to approved (to avoid redundant updates if updating other fields)
          if (newStatus === "approved" && oldStatus !== "approved") {
            await fetchAndShowSale(payload.new.id);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };

}, [fetchAndShowSale]);

return (
<div className="h-screen w-full overflow-hidden bg-white flex items-center justify-center p-8">
{/_ Animate Presence for transitions _/}
<AnimatePresence mode="wait">
{showSale && saleDetails ? (
<motion.div
key="sale-view"
initial={{ opacity: 0, scale: 0.9 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 1.1 }}
transition={{ duration: 0.8, type: "spring" }}
className="absolute inset-0 z-50 bg-[#131E29] flex flex-col items-center justify-center text-white p-8 text-center" >
<div className="flex flex-col items-center justify-center gap-12 w-full max-w-6xl mx-auto">
{/_ Left Side - Product Image _/}
<motion.div
initial={{ x: -50, opacity: 0 }}
animate={{ x: 0, opacity: 1 }}
transition={{ delay: 0.3 }}
className="flex-1 flex justify-center" ></motion.div>

              {/* Right Side - Information */}
              <div className="flex-1 flex flex-col items-center text-center space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex flex-col items-center"
                >
                  <span className="inline-block px-4 py-1.5 border border-[#A9780F] text-[#A9780F] font-bold tracking-[0.2em] rounded-full uppercase text-xl bg-[#A9780F]/10 mb-4">
                    Nueva Inversión Confirmada
                  </span>

                  <span className="text-6xl font-bold">
                    {saleDetails?.clientName || "Josue"}
                  </span>
                  <span className="text-2xl font-bold">con producto</span>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                  className="w-full flex flex-col items-center"
                >
                  <span className="text-6xl font-bold">
                    {saleDetails?.productName || "Producto Daka"}
                  </span>
                  <span className="text-2xl font-bold">
                    quedan {saleDetails?.spotsRemaining || "0"} cupos restantes
                  </span>
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
            <div className="grid grid-cols-3 overflow-hidden h-full items-center justify-center flex">
              {/* Carousel Section (70%) */}
              <div className="col-span-2 w-full bg-white flex items-center justify-center relative overflow-hidden">
                <Carousels />
              </div>

              {/* QR Section (30%) */}
              <div className="col-span-1 w-full p-6 flex flex-col items-center justify-center text-center bg-white relative h-full">
                <div className="relative w-full  aspect-square mb-6 p-4 bg-white rounded-2xl shadow-[0_0_20px_rgba(169,120,15,0.15)] border border-gray-100 group transition-all hover:shadow-[0_0_30px_rgba(169,120,15,0.25)]">
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
                  Descubre más detalles y agenda tu visita a nuestros proyectos
                  exclusivos.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

);
}
