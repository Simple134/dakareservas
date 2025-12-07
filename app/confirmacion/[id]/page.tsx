"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Container } from "react-bootstrap";
import { motion } from "framer-motion";
import Image from "next/image";
import { supabase } from "@/src/lib/supabase/client";

export default function ConfirmacionPage() {
    const params = useParams();
    const router = useRouter();
    const [reservation, setReservation] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const reservationId = params.id as string;

    useEffect(() => {
        async function fetchReservation() {
            try {
                const { data, error } = await supabase
                    .from('reservations')
                    .select('*')
                    .eq('id', reservationId)
                    .single();

                if (error) throw error;
                setReservation(data);
            } catch (error) {
                console.error('Error fetching reservation:', error);
            } finally {
                setLoading(false);
            }
        }

        if (reservationId) {
            fetchReservation();
        }
    }, [reservationId]);

    if (loading) {
        return (
            <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: "#f8f7f5" }}>
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
                                boxShadow: "0 10px 40px rgba(169, 120, 15, 0.3)"
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
                            ¡Solicitud Enviada!
                        </h1>
                        <p className="lead text-muted mb-4">
                            Su solicitud ha sido recibida exitosamente
                        </p>
                    </motion.div>

                    {/* Reservation ID Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="card border-0 shadow-lg mx-auto mb-4"
                        style={{ maxWidth: "600px", borderRadius: "1.5rem" }}
                    >
                        <div className="card-body p-5">

                            <div
                                className="p-4 rounded-3 mb-4"
                                style={{ backgroundColor: "#FFF8E7" }}
                            >
                                <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                    >
                                        ⏳
                                    </motion.div>
                                    <h5 className="mb-0 fw-bold" style={{ color: "#131E29" }}>
                                        Estamos Verificando su Pago
                                    </h5>
                                </div>
                                <p className="text-muted mb-0" style={{ fontSize: "0.95rem" }}>
                                    Por favor espere mientras procesamos su información
                                </p>
                            </div>

                            {reservation && (
                                <div className="text-start">
                                    <h6 className="fw-bold mb-3" style={{ color: "#131E29" }}>
                                        Detalles de la Reservación:
                                    </h6>
                                    <div className="row g-3">
                                        <div className="col-6">
                                            <p className="text-muted mb-1" style={{ fontSize: "0.85rem" }}>
                                                Tipo de Cliente
                                            </p>
                                            <p className="fw-semibold mb-0">
                                                {reservation.client_type === "fisica" ? "Persona Física" : "Persona Jurídica"}
                                            </p>
                                        </div>
                                        <div className="col-6">
                                            <p className="text-muted mb-1" style={{ fontSize: "0.85rem" }}>
                                                Producto
                                            </p>
                                            <p className="fw-semibold mb-0 text-uppercase">
                                                {reservation.product === "dakaplus" ? "DAKA Capital Plus" : "DAKA Capital"}
                                            </p>
                                        </div>
                                        <div className="col-6">
                                            <p className="text-muted mb-1" style={{ fontSize: "0.85rem" }}>
                                                Monto de Reserva
                                            </p>
                                            <p className="fw-semibold mb-0">
                                                RD${reservation.reservation_amount?.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="col-6">
                                            <p className="text-muted mb-1" style={{ fontSize: "0.85rem" }}>
                                                Estado
                                            </p>
                                            <span
                                                className="badge px-3 py-2"
                                                style={{
                                                    backgroundColor: "#FFF8E7",
                                                    color: "#A9780F",
                                                    fontSize: "0.85rem"
                                                }}
                                            >
                                                Pendiente
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Next Steps */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="card border-0 shadow mx-auto mb-4"
                        style={{ maxWidth: "600px", borderRadius: "1.5rem", backgroundColor: "white" }}
                    >
                        <div className="card-body p-4">
                            <h5 className="fw-bold mb-3" style={{ color: "#131E29" }}>
                                📋 Próximos Pasos
                            </h5>
                            <ul className="list-unstyled text-start mb-0">
                                <li className="mb-2 d-flex align-items-start">
                                    <span className="badge bg-warning text-dark me-2 mt-1">1</span>
                                    <span>Nuestro equipo verificará su pago en las próximas 24-48 horas</span>
                                </li>
                                <li className="mb-2 d-flex align-items-start">
                                    <span className="badge bg-warning text-dark me-2 mt-1">2</span>
                                    <span>Recibirá un correo electrónico con la confirmación</span>
                                </li>
                                <li className="d-flex align-items-start">
                                    <span className="badge bg-warning text-dark me-2 mt-1">3</span>
                                    <span>Un representante se pondrá en contacto con usted</span>
                                </li>
                            </ul>
                        </div>
                    </motion.div>

                    {/* Action Buttons */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1 }}
                        className="d-flex flex-column flex-md-row gap-3 justify-content-center"
                    >
                        <button
                            onClick={() => router.push("/")}
                            className="btn btn-lg px-5 py-3 fw-bold rounded-pill"
                            style={{
                                background: "linear-gradient(90deg, #131E29 0%, #2C3E50 100%)",
                                color: "white",
                                border: "none",
                                boxShadow: "0 4px 15px rgba(19, 30, 41, 0.2)"
                            }}
                        >
                            Volver al Inicio
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="btn btn-lg btn-outline-secondary px-5 py-3 fw-bold rounded-pill"
                        >
                            Imprimir Confirmación
                        </button>
                    </motion.div>

                    {/* Contact Info */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2 }}
                        className="text-muted mt-5"
                        style={{ fontSize: "0.9rem" }}
                    >
                        ¿Tiene preguntas? Contáctenos al{" "}
                        <a href="tel:+1234567890" className="text-decoration-none fw-semibold" style={{ color: "#A9780F" }}>
                            (809) 123-4567
                        </a>
                    </motion.p>
                </motion.div>
            </Container>
        </div>
    );
}
