import "./globals.css";
import type { Metadata } from "next";
import { Archivo, Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/src/context/AuthContext";
import { ErpProvider } from "@/src/context/ErpContext";

// Display: grotesca de tracking cerrado. En mayúsculas espaciadas reproduce el
// registro de los títulos de sección de dakadominicana.com.
const archivo = Archivo({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-archivo",
});

const geist = Geist({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

// Cifras tabulares: montos, NCF y cantidades se alinean en columna.
const geistMono = Geist_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Daka ERP",
  description: "Sistema de facturación y control de obra de Daka Dominicana.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${archivo.variable} ${geist.variable} ${geistMono.variable} font-sans antialiased`}
        suppressHydrationWarning={true}
      >
        <AuthProvider>
          <ErpProvider>{children}</ErpProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
