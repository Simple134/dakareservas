import Image from "next/image";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { AlertCircle, CheckCircle2, Loader2, Building2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

type AuthInputs = {
    email: string;
    password: string;
    fullName?: string;
};

export const Login = () => {
    const { signIn, signUp, role, user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [view, setView] = useState<'login' | 'register'>('login');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user && !authLoading) {
            try {
                if (role === 'admin') {
                    router.push('/admin');
                } else if (role === 'user') {
                    router.push(`/user/${user.id}`);
                }
            } catch (err) {
                console.error("Error redirecting:", err);
            }
        }
    }, [user, role, authLoading, router]);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm<AuthInputs>();

    const toggleView = (newView: 'login' | 'register') => {
        setView(newView);
        setError(null);
        setSuccessMessage(null);
        reset();
    };

    const onSubmit = async (data: AuthInputs) => {
        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            if (view === 'login') {
                const { error } = await signIn(data.email, data.password);
                if (error) {
                    setError("Credenciales inválidas. Por favor intenta de nuevo.");
                }
            } else {
                const { error } = await signUp(data.email, data.password, data.fullName || '');
                if (error) {
                    setError("Error al crear la cuenta. Intenta de nuevo.");
                } else {
                    setSuccessMessage("Cuenta creada exitosamente. Por favor verifica tu correo.");
                    // Optional: Switch to login view or auto-login logic if Supabase allows
                }
            }
        } catch (err) {
            setError("Ocurrió un error inesperado.");
        } finally {
            setLoading(false);
        }
    };

    // Show loading spinner while checking auth state
    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <Loader2 size={48} className="animate-spin text-[#111827]" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-white p-4 font-sans">
            <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl ">
                <div className="flex flex-col items-center">
                    <div className="relative w-[180px] h-[80px]">
                        <Image
                            src="/logoDaka.png"
                            alt="Daka Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-[#111827] mb-2">Sistema de Gestión</h1>
                    <p className="text-[#6B7280] text-sm">Ingresa a tu cuenta o crea una nueva</p>
                </div>

                <div className="flex p-1 bg-[#F3F4F6] rounded-lg">
                    <button
                        style={{ borderRadius: '10px' }}
                        onClick={() => toggleView('login')}
                        className={`flex-1 py-2 text-sm font-medium transition-all ${view === 'login'
                            ? 'bg-white text-[#111827] shadow-sm'
                            : 'text-[#6B7280] hover:text-[#111827]'
                            }`}
                    >
                        Iniciar Sesión
                    </button>
                    <button
                        style={{ borderRadius: '10px' }}
                        onClick={() => toggleView('register')}
                        className={`flex-1 py-2 text-sm font-medium transition-all ${view === 'register'
                            ? 'bg-white text-[#111827] shadow-sm'
                            : 'text-[#6B7280] hover:text-[#111827]'
                            }`}
                    >
                        Registrarse
                    </button>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
                    {view === 'register' && (
                        <div>
                            <label className="block text-sm font-medium text-[#111827] mb-1.5">Nombre Completo</label>
                            <input
                                type="text"
                                className="block w-full rounded-md border border-gray-200 py-2.5 px-3 text-gray-900 placeholder-gray-400 focus:border-[#111827] focus:ring-1 focus:ring-[#111827] sm:text-sm outline-none transition-colors"
                                placeholder="Juan Pérez"
                                {...register("fullName", { required: view === 'register' ? "El nombre es requerido" : false })}
                            />
                            {errors.fullName && (
                                <p className="mt-1 text-xs text-red-600 font-medium">{errors.fullName.message}</p>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-[#111827] mb-1.5">Email</label>
                        <input
                            type="email"
                            className="block w-full rounded-md border border-gray-200 py-2.5 px-3 text-gray-900 placeholder-gray-400 focus:border-[#111827] focus:ring-1 focus:ring-[#111827] sm:text-sm outline-none transition-colors"
                            placeholder="tu@email.com"
                            {...register("email", { required: "El correo es requerido" })}
                        />
                        {errors.email && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{errors.email.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#111827] mb-1.5">Contraseña</label>
                        <input
                            type="password"
                            className="block w-full rounded-md border border-gray-200 py-2.5 px-3 text-gray-900 placeholder-gray-400 focus:border-[#111827] focus:ring-1 focus:ring-[#111827] sm:text-sm outline-none transition-colors"
                            placeholder="••••••••"
                            {...register("password", {
                                required: "La contraseña es requerida",
                                minLength: { value: 6, message: "Mínimo 6 caracteres" }
                            })}
                        />
                        {errors.password && (
                            <p className="mt-1 text-xs text-red-600 font-medium">{errors.password.message}</p>
                        )}
                    </div>

                    {error && (
                        <div className="rounded-md bg-red-500 p-3 flex items-start gap-2 text-red-700">
                            <AlertCircle size={18} className="mt-0.5 shrink-0" />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="rounded-md bg-green-50 p-3 flex items-start gap-2 text-green-700">
                            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                            <span className="text-sm font-medium">{successMessage}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full justify-center rounded-lg bg-[#0F172A] px-4 py-3 text-sm font-medium text-white hover:bg-[#1e293b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0F172A] disabled:opacity-50 transition-all flex items-center gap-2 mt-6"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {view === 'login' ? "Iniciar Sesión" : "Registrarse"}
                    </button>
                </form>

                <div className="relative mt-2 ">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center">
                        <span className="bg-white px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">MODO DE PRUEBA</span>
                    </div>
                </div>

                <button
                    type="button"
                    className="w-full justify-center rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-[#111827] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-all"
                >
                    Acceso de Prueba
                </button>

                <div className="mt-4 text-center text-sm text-[#6B7280]">
                    Sistema ERP de Gestión de Construcción
                </div>
            </div>
        </div>
    );
};