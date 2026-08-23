"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

/* Hallmark · design-system: design.md
 *
 * Puerta de entrada al ERP. Dos mitades: la izquierda sostiene la marca sobre
 * el mismo `shell` del side-rail para que el salto a /admin no cambie de mundo;
 * la derecha es el único sitio donde el ojo tiene que trabajar. En móvil la
 * mitad de marca desaparece y sólo queda el formulario.
 */

type AuthInputs = {
  email: string;
  password: string;
  fullName?: string;
};

export const Login = () => {
  const {
    signIn,
    signUp,
    role,
    roleLoaded,
    user,
    loading: authLoading,
  } = useAuth();
  const router = useRouter();

  const [view, setView] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user && !authLoading && roleLoaded) {
      if (role === "admin") {
        router.push("/admin");
      } else if (role === "user") {
        router.push(`/user/${user.id}`);
      }
    }
  }, [user, role, roleLoaded, authLoading, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AuthInputs>();

  const toggleView = (newView: "login" | "register") => {
    if (newView === view) return;
    setView(newView);
    setError(null);
    setSuccessMessage(null);
    setShowPassword(false);
    reset();
  };

  const onSubmit = async (data: AuthInputs) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      if (view === "login") {
        const { error } = await signIn(data.email, data.password);
        if (error) {
          setError("Credenciales inválidas. Por favor intenta de nuevo.");
        }
      } else {
        const { error } = await signUp(
          data.email,
          data.password,
          data.fullName || "",
        );
        if (error) {
          setError("Error al crear la cuenta. Intenta de nuevo.");
        } else {
          setSuccessMessage(
            "Cuenta creada exitosamente. Revisa tu correo para verificarla.",
          );
        }
      }
    } catch {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-2">
        <Loader2 size={32} className="animate-spin text-ink-3" />
      </div>
    );
  }

  const isRegister = view === "register";

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Mitad de marca — sólo desde lg */}
      <aside className="relative hidden overflow-hidden bg-shell px-14 py-16 lg:flex lg:flex-col lg:justify-between">
        {/* Halo dorado muy tenue: da profundidad sin introducir una imagen. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-gold/12 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -right-16 h-[24rem] w-[24rem] rounded-full bg-gold/8 blur-3xl"
        />

        <div className="relative">
          {/* Versión blanca del logo: el PNG ya viene con alfa, sin filtros. */}
          <Image
            src="/daka2.png"
            alt="Daka Dominicana"
            width={160}
            height={64}
            className="h-16 w-auto"
            priority
          />
        </div>

        <div className="relative max-w-md">
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.18em] text-gold">
            Sistema de gestión
          </p>
          <h1 className="mt-4 text-[2.125rem] font-semibold leading-[1.15] text-white">
            Toda la operación de tus proyectos en un solo lugar.
          </h1>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-white/60">
            Facturación, cuentas por cobrar y pagar, presupuestos y ventas —
            centralizados y siempre al día.
          </p>
        </div>

        <div className="relative flex items-center gap-2 text-[0.8125rem] text-white/45">
          <ShieldCheck size={15} className="shrink-0" />
          <span>Acceso restringido a personal autorizado</span>
        </div>
      </aside>

      {/* Mitad del formulario */}
      <main className="flex items-center justify-center bg-paper-2 px-5 py-12 sm:px-8">
        <div className="w-full max-w-[26rem]">
          {/* El logo se repite en móvil, donde la mitad de marca no existe. */}
          {/* Sobre papel toca la versión azul; la blanca desaparecería. */}
          <Image
            src="/daka2azul.png"
            alt="Daka Dominicana"
            width={180}
            height={72}
            className="mx-auto mb-8 h-14 w-auto lg:hidden"
            priority
          />

          <div className="rounded-[14px] border border-rule bg-paper p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(7,35,75,0.18)] sm:p-8">
            <h2 className="text-[1.375rem] font-semibold leading-tight text-ink">
              {isRegister ? "Crear una cuenta" : "Bienvenido de vuelta"}
            </h2>
            <p className="mt-1.5 text-sm text-ink-2">
              {isRegister
                ? "Completa tus datos para solicitar acceso."
                : "Ingresa tus credenciales para continuar."}
            </p>

            {/* Segmentado: el indicador es la superficie clara sobre el surco. */}
            <div
              role="tablist"
              className="mt-6 flex gap-1 rounded-[10px] bg-paper-3 p-1"
            >
              {(["login", "register"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => toggleView(v)}
                  className={`flex-1 rounded-[7px] py-2 text-[0.8125rem] font-medium transition-[background-color,color,box-shadow] duration-[120ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
                    view === v
                      ? "bg-paper text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                      : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {v === "login" ? "Iniciar sesión" : "Registrarse"}
                </button>
              ))}
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
              {isRegister && (
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" required>
                    Nombre completo
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    placeholder="Juan Pérez"
                    state={errors.fullName ? "error" : "idle"}
                    {...register("fullName", {
                      required: isRegister ? "El nombre es requerido" : false,
                    })}
                  />
                  {errors.fullName && (
                    <p className="text-xs font-medium text-danger">
                      {errors.fullName.message}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" required>
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@email.com"
                  state={errors.email ? "error" : "idle"}
                  {...register("email", { required: "El correo es requerido" })}
                />
                {errors.email && (
                  <p className="text-xs font-medium text-danger">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" required>
                  Contraseña
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      isRegister ? "new-password" : "current-password"
                    }
                    placeholder="••••••••"
                    className="pr-10"
                    state={errors.password ? "error" : "idle"}
                    {...register("password", {
                      required: "La contraseña es requerida",
                      minLength: { value: 6, message: "Mínimo 6 caracteres" },
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-[8px] text-ink-3 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs font-medium text-danger">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-[8px] bg-danger-soft px-3 py-2.5 text-danger"
                >
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span className="text-[0.8125rem] font-medium">{error}</span>
                </div>
              )}

              {successMessage && (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-[8px] bg-success-soft px-3 py-2.5 text-success"
                >
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                  <span className="text-[0.8125rem] font-medium">
                    {successMessage}
                  </span>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                loading={loading}
                className="w-full"
              >
                {isRegister ? "Crear cuenta" : "Iniciar sesión"}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-ink-3">
            Daka Dominicana · Sistema ERP de gestión de construcción
          </p>
        </div>
      </main>
    </div>
  );
};
