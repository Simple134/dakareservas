"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/src/lib/supabase/client";
import { useRouter } from "next/navigation";

// Mapping product names to images
const PRODUCT_IMAGES: Record<string, string> = {
    "DAKA CAPITAL": "/dakaCapital.png",
    "DAKA CAPITAL PLUS": "/dakaCapitalPlus.png"
};

export default function ProductSelectionPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchEverything = async () => {
            const userId = localStorage.getItem('daka_user_id');
            if (!userId) {
                router.push('/welcome');
                return;
            }

            const { data, error } = await supabase
                .from('products')
                .select('*')
                .order('name', { ascending: true });

            if (data) {
                const validProducts = data.filter(p => PRODUCT_IMAGES[p.name]);
                setProducts(validProducts);
            }
            setLoading(false);
        };

        fetchEverything();
    }, [router]);

    const handleDragEnd = (event: any, info: any) => {
        const swipeThreshold = 50;

        if (info.offset.x > swipeThreshold) {
            setCurrentIndex((prev) => (prev - 1 + products.length) % products.length);
        } else if (info.offset.x < -swipeThreshold) {
            setCurrentIndex((prev) => (prev + 1) % products.length);
        }
    };

    const handleSelectProduct = async () => {
        if (submitting || products.length === 0) return;

        try {
            setSubmitting(true);
            const product = products[currentIndex];
            const userId = localStorage.getItem('daka_user_id');
            const userType = localStorage.getItem('daka_user_type');

            if (!userId || !userType) throw new Error("Sesión no válida");

            const { data, error } = await supabase.rpc('allocate_product', {
                p_user_id: userId,
                p_user_type: userType,
                p_product_id: product.id
            });

            if (error) throw error;
            const responseData = data as any;
            if (responseData && responseData.allocation_id) {
                router.push(`/confirmacion/${responseData.allocation_id}`);
            } else {
                throw new Error("No se recibió ID de asignación");
            }

        } catch (error: any) {
            console.error("Error allocating product:", error);
            alert(error.message || "Error al seleccionar producto.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#081845]"></div>
            </div>
        );
    }

    const currentProduct = products[currentIndex];

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center relative overflow-hidden">
            <motion.div
                initial={{ height: "100%", borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
                animate={{
                    height: "50%",
                    borderBottomLeftRadius: "20px",
                    borderBottomRightRadius: "20px"
                }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="absolute top-0 left-0 w-full bg-[#081845] z-0"
            />

            <div className="w-full max-w-4xl z-10 flex flex-col items-center justify-between h-full py-12 px-4 space-y-8">

                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="text-center space-y-2 text-white"
                >
                    <h2 className="text-2xl md:text-3xl font-light">
                        Selecciona el <span className="font-bold">Producto</span>
                    </h2>
                </motion.div>

                <div className="relative w-full flex items-center justify-center">
                    <div className="relative w-full h-[500px] md:h-[600px] flex items-center justify-center perspective-1000 touch-pan-y select-none">
                        <AnimatePresence mode="wait">
                            {currentProduct && (
                                <motion.div
                                    key={currentProduct.id}
                                    initial={{ opacity: 0, x: 50, scale: 0.9 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: -50, scale: 0.9 }}
                                    transition={{ duration: 0.4 }}
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 0 }}
                                    dragElastic={0.3}
                                    onDragEnd={handleDragEnd}
                                    className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing"
                                >
                                    <div className="relative w-full h-full  pointer-events-none">
                                        <Image
                                            src={PRODUCT_IMAGES[currentProduct.name] || "/dakaCapital.png"}
                                            alt={currentProduct.name}
                                            fill
                                            className="object-contain drop-shadow-2xl"
                                            priority
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="flex flex-col items-center space-y-4 pt-4 w-full"
                >
                    <div className="text-center">
                        <h3 className="text-2xl font-bold text-black">{currentProduct?.name}</h3>
                        <p className="text-gray-500 text-sm mt-1">Disponibles: <span className="font-semibold text-[#C8A31D]">{currentProduct?.limit - currentProduct?.count}</span></p>
                    </div>

                    <button
                        onClick={handleSelectProduct}
                        disabled={submitting}
                        className="group w-full rounded-xl bg-[#C8A31D] text-white font-semibold p-3 "
                    >
                        <span>{submitting ? 'Procesando...' : 'Seleccionar'}</span>
                    </button>
                </motion.div>

            </div>
        </div>
    );
}
