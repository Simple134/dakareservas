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
                // Sort to put PLUS (longer name) first/left
                validProducts.sort((a, b) => b.name.length - a.name.length);
                setProducts(validProducts);
            }
            setLoading(false);
        };

        fetchEverything();
    }, [router]);



    const handleSelectProduct = async (product: any) => {
        if (submitting) return;

        try {
            setSubmitting(true);
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

                <div className="w-full flex-1 flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 px-4 max-w-6xl mx-auto">
                    {products.map((product) => (
                        <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleSelectProduct(product)}
                            className={`
                                relative w-full h-[600px]
                                rounded-3xl overflow-hidden cursor-pointer 
                                shadow-xl hover:shadow-2xl transition-all duration-300
                                group bg-white border border-[#081845]
                                ${submitting ? 'pointer-events-none opacity-50' : ''}
                            `}
                        >
                            <div className="absolute inset-0 p-6 flex flex-col items-center">
                                <div className="relative flex-1 w-full flex items-center justify-center">
                                    <Image
                                        src={PRODUCT_IMAGES[product.name] || "/dakaCapital.png"}
                                        alt={product.name}
                                        fill
                                        className="object-contain transition-all duration-300"
                                        priority
                                    />
                                </div>
                                <p className="text-sm text-gray-500 mb-6">
                                    Disponibles: <span className="font-semibold text-[#C8A31D]">
                                        {product.limit - product.count}
                                    </span>
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

            </div>
        </div>
    );
}
