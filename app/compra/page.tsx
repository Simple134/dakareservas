"use client";
import ClientForm from "@/src/components/form";
import { Container, Row, Col } from "react-bootstrap";

export default function CompraPage() {
  return (
    <div className="min-vh-100 py-5" style={{ backgroundColor: "#f8f7f5" }}>
      <Container fluid>
        {/* Main Content */}
        <Row className="justify-content-center">
          <Col lg={8}>
            <div className="card shadow-lg border-0 rounded-4 overflow-hidden">
              {/* Body del Card */}
              <div className="card-body p-5">
                <ClientForm />
              </div>
            </div>

            {/* Trust Badges */}
            <Row className="mt-5 text-center">
              <Col>
                <p className="small" style={{ color: "#666" }}>
                  🔒 Sitio seguro con certificado SSL | 100% Confiable
                </p>
              </Col>
            </Row>
          </Col>
        </Row>
      </Container>

      <style jsx>{`
        .min-vh-100 {
          min-height: 100vh;
        }
        
        .rounded-4 {
          border-radius: 1.5rem;
        }

        .shadow-lg {
          box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.15) !important;
        }

        .card {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .card:hover {
          transform: translateY(-5px);
          box-shadow: 0 1.5rem 4rem rgba(0, 0, 0, 0.2) !important;
        }

        .display-4 {
          font-size: 3.5rem;
          letter-spacing: -0.02em;
        }

        .lead {
          font-size: 1.25rem;
          font-weight: 300;
        }
      `}</style>
    </div>
  );
}
