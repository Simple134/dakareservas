import Image from "next/image";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { SubmitHandler } from "react-hook-form";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabase/client";

type AuthInputs = {
    email: string;
    password: string;
    fullName?: string;
};

export const Login = () => {

    const [view, setView] = useState<'login' | 'register'>('login');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset
    } = useForm<AuthInputs>();

    // Reset state when switching views
    const toggleView = (newView: 'login' | 'register') => {
        setView(newView);
        setError(null);
        setSuccessMessage(null);
        reset();
    };

    const onSubmit: SubmitHandler<AuthInputs> = async (data) => {
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            if (view === 'login') {
                const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
                    email: data.email,
                    password: data.password,
                });

                if (authError) throw authError;

                // Check profile role
                if (user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single();

                    if (profile?.role === 'admin') {
                        router.push("/admin");
                    } else {
                                    router.push("/user");
                    }
                    router.refresh();
                }
            } else {
                // Registration
                const { error: signUpError, data: signUpData } = await supabase.auth.signUp({
                    email: data.email,
                    password: data.password,
                    options: {
                        data: {
                            full_name: data.fullName,
                            // Role assignment is handled by DB trigger
                        },
                    },
                });

                if (signUpError) throw signUpError;

                if (signUpData.user) {
                    setSuccessMessage("Registro exitoso. Revisa tu correo para confirmar tu cuenta.");
                }
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="flex min-h-screen items-center justify-center bg-[#131E29] p-4 font-sans">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl border-2 border-[#A9780F]">
                <div className="flex flex-col items-center">
                    <div className="relative w-[180px] h-[80px] mb-6">
                        <Image
                            src="/logoDaka.png"
                            alt="Daka Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <div className="flex gap-4 mb-8 bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => toggleView('login')}
                            className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${view === 'login'
                                ? 'bg-white text-[#A9780F] shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            Iniciar Sesión
                        </button>
                        <button
                            onClick={() => toggleView('register')}
                            className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${view === 'register'
                                ? 'bg-white text-[#A9780F] shadow-sm' // Active state
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            Registrarse
                        </button>
                    </div>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                    {view === 'register' && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Completo</label>
                            <input
                                type="text"
                                className="block w-full rounded-md border py-2 px-3 text-gray-900 shadow-sm focus:border-[#A9780F] focus:ring-[#A9780F] sm:text-sm border-gray-300"
                                placeholder="Juan Pérez"
                                {...register("fullName", { required: view === 'register' ? "El nombre es requerido" : false })}
                            />
                            {errors.fullName && (
                                <p className="mt-1 text-xs text-red-600 font-bold">{errors.fullName.message}</p>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Correo Electrónico</label>
                        <input
                            type="email"
                            className="block w-full rounded-md border py-2 px-3 text-gray-900 shadow-sm focus:border-[#A9780F] focus:ring-[#A9780F] sm:text-sm border-gray-300"
                            placeholder="usuario@ejemplo.com"
                            {...register("email", { required: "El correo es requerido" })}
                        />
                        {errors.email && (
                            <p className="mt-1 text-xs text-red-600 font-bold">{errors.email.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Contraseña</label>
                        <input
                            type="password"
                            className="block w-full rounded-md border py-2 px-3 text-gray-900 shadow-sm focus:border-[#A9780F] focus:ring-[#A9780F] sm:text-sm border-gray-300"
                            placeholder="••••••••"
                            {...register("password", {
                                required: "La contraseña es requerida",
                                minLength: { value: 6, message: "Mínimo 6 caracteres" }
                            })}
                        />
                        {errors.password && (
                            <p className="mt-1 text-xs text-red-600 font-bold">{errors.password.message}</p>
                        )}
                    </div>

                    {error && (
                        <div className="rounded-md bg-red-50 p-3 flex items-start gap-2 text-red-700">
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
                        className="w-full justify-center rounded-md bg-[#A9780F] px-4 py-3 text-sm font-bold text-white hover:bg-[#8e650c] focus:outline-none focus:ring-2 focus:ring-[#A9780F] focus:ring-offset-2 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {view === 'login' ? "Ingresar" : "Crear Cuenta"}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-gray-500">
                    &copy; {new Date().getFullYear()} Dakabana. Todos los derechos reservados.
                </div>
            </div>
        </div>
    );
};