import Link from "next/link";
import { CustomButton } from "@/src/components/project/CustomCard";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-2xl font-bold text-gray-800">
        Proyecto no encontrado
      </h1>
      <p className="text-gray-600">
        El proyecto que buscas no existe o no tienes permisos para acceder.
      </p>
      <Link href="/admin">
        <CustomButton>Volver al Dashboard</CustomButton>
      </Link>
    </div>
  );
}
