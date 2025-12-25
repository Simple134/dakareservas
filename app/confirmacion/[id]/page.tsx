"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Container } from "react-bootstrap";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { supabase } from "@/src/lib/supabase/client";
import { Database } from "@/src/types/supabase";

export default function ConfirmacionPage() {
  const params = useParams();
  const router = useRouter();
  type AllocationWithPayments =
    Database["public"]["Tables"]["product_allocations"]["Row"] & {
      payments: Database["public"]["Tables"]["payments"]["Row"][];
    };

  const [allocation, setAllocation] = useState<AllocationWithPayments>();
  const [product, setProduct] =
    useState<Database["public"]["Tables"]["products"]["Row"]>();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Payment inputs
  const [currency, setCurrency] = useState("USD");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "transfer" | "card" | "check" | "cash"
  >("transfer");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [lockedLocales, setLockedLocales] = useState<string[]>([]);

  // Constants
  const DOLLAR_RATE = 64.44;
  const MIN_INVESTMENT_USD = 5000;
  const minInvestment =
    currency === "USD" ? MIN_INVESTMENT_USD : MIN_INVESTMENT_USD * DOLLAR_RATE;

  const allocationId = params.id as string;

  const bankAccounts = [
    {
      bank: "Banco Popular",
      number: "844338509",
      type: "Corriente",
      currency: "DOP",
      rnc: "132139313",
    },
    {
      bank: "BHD León",
      number: "30588390012",
      type: "Ahorros",
      currency: "DOP",
      rnc: "132139313",
    },
    {
      bank: "Banco de Reservas",
      number: "9605943513",
      type: "Ahorros",
      currency: "DOP",
      rnc: "132139313",
    },
    {
      bank: "BHD León",
      number: "30588390021",
      type: "Ahorros",
      currency: "USD",
      rnc: "132139313",
    },
  ];

  // Initialize random anonymous user ID for presence
  useEffect(() => {
    setUserId(crypto.randomUUID());
  }, []);

  useEffect(() => {
    async function fetchAllocation() {
      try {
        // Fetch allocation
        const { data: allocData, error: allocError } = await supabase
          .from("product_allocations")
          .select("*, payments(*)")
          .eq("id", allocationId)
          .single();

        if (allocError) throw allocError;
        setAllocation(allocData);

        // Fetch product details
        if (allocData.product_id) {
          const { data: prodData, error: prodError } = await supabase
            .from("products")
            .select("*")
            .eq("id", allocData.product_id)
            .single();

          if (prodError) throw prodError;
          setProduct(prodData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        alert("Error cargando los datos de la reserva.");
        router.push("/");
      } finally {
        setLoading(false);
      }
    }

    if (allocationId) {
      fetchAllocation();
    }
  }, [allocationId, router]);

  // Receipt Preview Handler
  useEffect(() => {
    if (!receiptFile) {
      setReceiptPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(receiptFile);
    setReceiptPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [receiptFile]);

  const handleUpdatePayment = async () => {
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      alert("Por favor ingrese un monto válido.");
      return;
    }

    if (numAmount < minInvestment) {
      alert(
        `El monto mínimo de inversión es ${minInvestment.toLocaleString()} ${currency}`,
      );
      return;
    }

    if (!receiptFile) {
      alert("Por favor adjunte el comprobante de pago.");
      return;
    }

    try {
      setUpdating(true);
      let receiptUrl = null;

      // Get user data from localStorage
      const userId = localStorage.getItem("daka_user_id");
      const userType = localStorage.getItem("daka_user_type");

      if (!userId || !userType) {
        throw new Error(
          "Sesión no válida. Por favor vuelva a iniciar el proceso.",
        );
      }

      // Upload Receipt (required for all payment methods)
      if (receiptFile) {
        const fileExt = receiptFile.name.split(".").pop();
        const fileName = `${allocationId}-${Math.random()}.${fileExt}`;
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from("receipts")
          .upload(fileName, receiptFile);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from("receipts")
          .getPublicUrl(fileName);

        receiptUrl = publicUrlData.publicUrl;
      }

      // Verify locale_id is present on the allocation
      // Casting allocation to any because Typescript definitions might be outdated
      const allocationData = allocation as any;
      if (!allocationData?.locales_id) {
        throw new Error("No se encontró un local asignado a esta reserva.");
      }

      // Update Allocation
      // Insert into payments
      const { error: paymentError } = await supabase.from("payments").insert({
        allocation_id: allocationId,
        amount: numAmount,
        currency: currency,
        payment_method: paymentMethod,
        receipt_url: receiptUrl,
        status: "pending",
      });

      if (paymentError) throw paymentError;

      // Update Allocation Status
      const { error: allocError } = await supabase
        .from("product_allocations")
        .update({
          status: "pending",
        })
        .eq("id", allocationId);

      if (allocError) throw allocError;

      // Update Locale status to BLOQUEADO using the locale_id from the user
      const { error: localesError } = await supabase
        .from("locales")
        .update({
          status: "BLOQUEADO",
        })
        .eq("id", allocationData.locales_id);

      if (localesError) throw localesError;

      // Update local allocation state to show confirmation
      setAllocation({
        ...allocation!,
        currency: currency,
        payment_method: paymentMethod,
        status: "pending",
      });
    } catch (error: any) {
      console.error("Error updating payment:", error);
      alert(error.message || "Error actualizando el pago.");
    } finally {
      setUpdating(false);
      localStorage.removeItem("daka_user_id");
      localStorage.removeItem("daka_user_type");
      localStorage.removeItem("daka_selected_locale_id");
    }
  };

  if (loading) {
    return (
      <div
        className="min-vh-100 d-flex align-items-center justify-content-center"
        style={{ backgroundColor: "#f8f7f5" }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="spinner-border text-warning"
          style={{ width: "3rem", height: "3rem", color: "#A9780F" }}
        />
      </div>
    );
  }

  return (
    <div className="min-vh-100 py-5" style={{ backgroundColor: "white" }}>
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Logo */}
          <div className="d-flex justify-content-center mb-4">
            <Image
              src="/logoDaka.png"
              alt="Daka Capital Logo"
              width={200}
              height={90}
              className="img-fluid"
              priority
            />
          </div>

          {/* Success Animation */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mb-4"
          >
            <div
              className="mx-auto rounded-circle d-flex align-items-center justify-content-center"
              style={{
                width: "120px",
                height: "120px",
                background: "linear-gradient(135deg, #A9780F 0%, #D4AF37 100%)",
                boxShadow: "0 10px 40px rgba(169, 120, 15, 0.3)",
              }}
            >
              <svg
                width="60"
                height="60"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  d="M20 6L9 17l-5-5"
                />
              </svg>
            </div>
          </motion.div>

          {/* Main Message */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h1 className="display-4 fw-bold mb-3" style={{ color: "#131E29" }}>
              ¡Producto Asignado!
            </h1>
            <p className="lead text-muted mb-4">
              Complete los detalles de su inversión
            </p>
          </motion.div>

          {/* Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="card border-0 shadow-lg mx-auto mb-4"
            style={{ maxWidth: "700px", borderRadius: "1.5rem" }}
          >
            <div className="card-body p-5">
              {product && (
                <div className="mb-4 text-center border-b pb-4">
                  <h4 className="fw-bold" style={{ color: "#131E29" }}>
                    {product.name}
                  </h4>
                </div>
              )}

              {/* Payment Inputs */}
              {!allocation?.payments || allocation.payments.length === 0 ? (
                <div className="space-y-6 text-start">
                  {/* 1. Currency & Amount */}
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label fw-bold">Moneda</label>
                      <div className="flex gap-2">
                        {["USD", "DOP"].map((curr) => (
                          <button
                            key={curr}
                            onClick={() => setCurrency(curr)}
                            className={`btn flex-fill ${currency === curr ? "btn-dark" : "btn-outline-secondary"}`}
                          >
                            {curr}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="col-md-8">
                      <label className="form-label fw-bold">
                        Monto de Inversión
                        <span className="text-muted fw-normal ms-2 text-xs">
                          (Min: {minInvestment.toLocaleString()} {currency})
                        </span>
                      </label>
                      <div className="input-group">
                        <span className="input-group-text">
                          {currency === "USD" ? "$" : "RD$"}
                        </span>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                      </div>
                      {amount !== "" && Number(amount) < minInvestment && (
                        <div className="text-danger text-xs mt-1">
                          El monto debe ser mínimo{" "}
                          {minInvestment.toLocaleString()} {currency}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. Payment Method */}
                  <div className="">
                    <label className="form-label fw-bold mb-3">
                      Método de Pago
                    </label>
                    <div className="flex flex-col gap-3">
                      <label
                        className={`flex-1 border rounded-xl p-3 cursor-pointer transition-all ${paymentMethod === "transfer" ? "border-[#C8A31D] bg-[#FFF8E7]" : "border-gray-200 hover:bg-gray-50"}`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === "transfer"}
                            onChange={() => setPaymentMethod("transfer")}
                            className="accent-[#C8A31D] w-5 h-5"
                          />
                          <div>
                            <span className="font-semibold block">
                              Transferencia Bancaria
                            </span>
                            <span className="text-xs text-gray-500">
                              Adjuntar comprobante
                            </span>
                          </div>
                        </div>
                      </label>

                      <label
                        className={`flex-1 border rounded-xl p-3 cursor-pointer transition-all ${paymentMethod === "card" ? "border-[#C8A31D] bg-[#FFF8E7]" : "border-gray-200 hover:bg-gray-50"}`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === "card"}
                            onChange={() => setPaymentMethod("card")}
                            className="accent-[#C8A31D] w-5 h-5"
                          />
                          <div>
                            <span className="font-semibold block">
                              Tarjeta Crédito/Débito
                            </span>
                            <span className="text-xs text-gray-500">
                              Pago en línea
                            </span>
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* 3. Bank Accounts (only for transfer) */}
                  {paymentMethod === "transfer" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="bg-gray-50 p-4 rounded-xl border border-gray-200"
                    >
                      <h6 className="font-bold text-sm text-gray-700 mb-3">
                        Cuentas Bancarias Disponibles:
                      </h6>
                      <div className="space-y-2">
                        {bankAccounts.map((account, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between bg-white p-2 rounded border border-gray-100 text-sm"
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold text-[#131E29]">
                                {account.bank}
                              </span>
                              <span className="text-gray-600 font-mono">
                                {account.number}
                              </span>
                              <span className="text-gray-600 font-mono">
                                Rnc: {account.rnc}
                              </span>
                            </div>
                            <span className="badge bg-gray-200 text-gray-700">
                              {account.currency}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* 4. Receipt Upload (always required) */}
                  <div className="">
                    <label className="block text-sm font-semibold mb-2">
                      Adjuntar Comprobante de Pago *
                    </label>
                    <p className="text-xs text-gray-500 mb-3">
                      {paymentMethod === "transfer"
                        ? "Sube una captura de pantalla o foto del comprobante de transferencia bancaria."
                        : "Sube una captura de pantalla o foto del comprobante de pago con tarjeta."}
                    </p>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) =>
                        setReceiptFile(e.target.files?.[0] || null)
                      }
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#131E29] file:text-white hover:file:bg-[#2C3E50]"
                    />
                    {receiptPreview && (
                      <div className="mt-3 relative h-48 w-full rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                        <Image
                          src={receiptPreview}
                          alt="Vista previa del comprobante"
                          fill
                          className="object-contain"
                        />
                      </div>
                    )}
                  </div>

                  <div className="d-flex gap-3 mt-4">
                    <button
                      onClick={() => router.push("/")}
                      className="btn flex-fill py-3 fw-bold text-white shadow-sm rounded-xl transition-all"
                      style={{
                        background: "#131E29",
                        border: "none",
                      }}
                    >
                      Volver Inicio
                    </button>
                    <button
                      onClick={handleUpdatePayment}
                      disabled={
                        updating ||
                        !amount ||
                        Number(amount) < minInvestment ||
                        !receiptFile
                      }
                      className="btn flex-fill py-3 fw-bold text-white shadow-sm rounded-xl transition-all"
                      style={{
                        backgroundColor: "#A9780F",
                        borderColor: "#A9780F",
                      }}
                    >
                      {updating ? "Procesando..." : "Confirmar Inversión"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="alert alert-success">
                  <h5 className="alert-heading fw-bold">
                    ¡Inversión Confirmada!
                  </h5>
                  <p>
                    Usted ha confirmado una inversión de: <br />
                    <strong>
                      {allocation?.payments && allocation.payments.length > 0
                        ? allocation.payments[0].amount.toLocaleString()
                        : "0"}{" "}
                      {allocation?.currency || "USD"}
                    </strong>
                  </p>
                  <hr />
                  <div className="mt-4">
                    <button
                      onClick={() => router.push("/welcome")}
                      className="btn btn-primary px-5 py-2 fw-bold"
                      style={{
                        backgroundColor: "#A9780F",
                        borderColor: "#A9780F",
                      }}
                    >
                      Regresar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </Container>
    </div>
  );
}
