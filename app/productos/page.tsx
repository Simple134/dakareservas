"use client";

import Image from "next/image";
import Link from "next/link";
import { Container, Row, Col } from "react-bootstrap";
import { motion } from "framer-motion";

export default function ProductosPage() {
    return (
        <div className="min-vh-100 py-5" style={{ backgroundColor: "white" }}>
            <Container>
                {/* Header */}
                <div className="text-center mb-5">
                    <div className="d-flex justify-content-center mb-4">
                        <Image
                            src="/logoDaka.png"
                            alt="Daka Capital Logo"
                            width={220}
                            height={100}
                            className="img-fluid object-fit-contain"
                            priority
                        />
                    </div>
                    <h1 className="display-4 fw-bold mb-3" style={{ color: "#131E29" }}>
                        Nuestros Productos
                    </h1>
                    <p className="lead text-muted">
                        Elija el plan de inversión que mejor se adapte a sus metas
                    </p>
                </div>

                {/* Products Grid */}
                <Row className="justify-content-center g-4">
                    {/* Producto 1: DAKA CAPITAL */}
                    <Col md={6} lg={5} className="order-2 order-md-1">
                        <motion.div
                            whileHover={{ y: -5 }}
                            transition={{ duration: 0.3 }}
                            className="card h-100 border-0 shadow-lg overflow-hidden rounded-4"
                        >
                            <div className="card-body p-0 d-flex flex-column">
                                <div className="position-relative w-100" style={{ height: "400px" }}>
                                    <Image
                                        src="/DAKA.png"
                                        alt="DAKA Capital - Plan Estándar"
                                        fill
                                        className="object-fit-cover"
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                        priority
                                    />
                                </div>
                                <div className="p-4 flex-grow-1 d-flex flex-column text-center bg-white">
                                    <h3 className="fw-bold mb-3" style={{ color: "#131E29" }}>
                                        DAKA Capital
                                    </h3>
                                    <div className="mb-4">
                                        <div className="bg-gray-100 rounded-lg p-2 mb-3 inline-block">
                                            <p className="text-[#131E29] font-bold m-0" style={{ fontSize: "1.1rem" }}>
                                                Gana 35% de Plusvalía
                                            </p>
                                        </div>
                                        <ul className="list-unstyled text-start mx-auto" style={{ maxWidth: "280px", fontSize: "0.95rem" }}>
                                            <li className="mb-2">✓ Reserva con 5,000 USD</li>
                                            <li className="mb-2">✓ 10% A la firma del Contrato</li>
                                            <li className="mb-2">✓ 40% Durante La Construcción</li>
                                            <li>✓ 50% Contra Entrega</li>
                                        </ul>
                                    </div>
                                    <div className="mt-auto">
                                        <Link
                                            href="/compra?producto=daka"
                                            className="btn w-100 py-3 fw-bold rounded-pill text-white transition-all hover-transform"
                                            style={{
                                                background: "linear-gradient(90deg, #131E29 0%, #2C3E50 100%)",
                                                boxShadow: "0 4px 15px rgba(19, 30, 41, 0.2)"
                                            }}
                                        >
                                            Seleccionar Plan
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </Col>

                    {/* Producto 2: DAKA CAPITAL PLUS */}
                    <Col md={6} lg={5} className="order-1 order-md-2">
                        <motion.div
                            whileHover={{ scale: 1.03 }}
                            animate={{
                                boxShadow: ["0 .5rem 1rem rgba(0,0,0,0.15)", "0 1rem 3rem rgba(169, 120, 15, 0.4)", "0 .5rem 1rem rgba(0,0,0,0.15)"],
                                scale: [1, 1.02, 1]
                            }}
                            transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
                            className="card h-100 border-0 shadow-lg overflow-hidden rounded-4 position-relative"
                            style={{ border: "2px solid #A9780F" }}
                        >
                            <div className="position-absolute top-0 end-0 bg-[#A9780F] text-white px-3 py-1 rounded-bl-lg fw-bold z-3 shadow-sm">
                                🌟 ¡Mas Popular!
                            </div>
                            <div className="card-body p-0 d-flex flex-column">
                                <div className="position-relative w-100" style={{ height: "400px" }}>
                                    <Image
                                        src="/DAKAPLUS.png"
                                        alt="DAKA Capital Plus - Plan Premium"
                                        fill
                                        className="object-fit-cover"
                                        sizes="(max-width: 768px) 100vw, 50vw"
                                        priority
                                    />
                                </div>
                                <div className="p-4 flex-grow-1 d-flex flex-column text-center bg-white">
                                    <h3 className="fw-bold mb-3" style={{ color: "#A9780F" }}>
                                        DAKA Capital Plus
                                    </h3>
                                    <div className="mb-4">
                                        <div className="bg-[#A9780F] rounded-lg p-3 mb-3 inline-block shadow-sm">
                                            <p className="text-white font-bold m-0" style={{ fontSize: "1.1rem" }}>
                                                Gana 35% de plusvalía más el 20% del ROI
                                            </p>
                                        </div>
                                        <ul className="list-unstyled text-start mx-auto" style={{ maxWidth: "280px", fontSize: "0.95rem" }}>
                                            <li className="mb-2">✓ Reserva con 5,000 USD</li>
                                            <li className="mb-2">✓ 45% a la firma del Contrato</li>
                                            <li className="mb-2">✓ 0% Durante la Construcción</li>
                                            <li>✓ 55% Contra entrega</li>
                                        </ul>
                                    </div>
                                    <div className="mt-auto">
                                        <motion.div
                                            animate={{ scale: [1, 1.05, 1] }}
                                            transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
                                        >
                                            <Link
                                                href="/compra?producto=dakaplus"
                                                className="btn w-100 py-3 fw-bold rounded-pill text-white"
                                                style={{
                                                    background: "linear-gradient(90deg, #A9780F 0%, #D4AF37 100%)",
                                                    boxShadow: "0 4px 15px rgba(169, 120, 15, 0.3)"
                                                }}
                                            >
                                                Seleccionar Plan Plus
                                            </Link>
                                        </motion.div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </Col>
                </Row>
            </Container>

            <style jsx global>{`
        .hover-transform:hover {
          transform: translateY(-2px);
          filter: brightness(110%);
        }
      `}</style>
        </div>
    );
}
