import Carousels from "@/src/components/Carousels";
import Image from "next/image";

export default function Home() {
  return (
    <div className="h-screen overflow-hidden bg-white flex items-center justify-center p-2 md:p-6">
      {/* Outer Frame - Dark Blue */}
      <div className="relative w-full h-full max-w-[95%] xl:max-w-[1400px] bg-[#131E29] p-3 md:p-4 rounded-3xl shadow-2xl overflow-hidden">

        {/* Inner Frame - Gold Border Effect */}
        <div className="bg-white border-2 md:border-4 border-[#A9780F] rounded-2xl overflow-hidden flex flex-col shadow-inner h-full">

          {/* Header / Logo Area */}
          <div className="w-full bg-white flex justify-center py-4 border-b border-gray-100 shrink-0">
            <div className="relative bg-white w-[160px] h-[70px] md:w-[200px] md:h-[90px]">
              <Image
                src="/logoDaka.png"
                alt="Daka Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="grid grid-cols-3 overflow-hidden">

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

              <h3 className="text-xl font-bold text-[#131E29] mb-2 font-sans">
                Escanea el código
              </h3>
              <div className="w-16 h-1 bg-[#A9780F] rounded-full mb-3"></div>
              <p className="text-gray-500 max-w-[250px] leading-relaxed text-sm">
                Descubre más detalles y agenda tu visita a nuestros proyectos exclusivos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
