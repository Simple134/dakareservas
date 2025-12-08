"use client";

import { useState } from "react";
import Image from "next/image";
import { useForm, SubmitHandler } from "react-hook-form";
import { supabase } from "@/src/lib/supabase/client";

type LoginInputs = {
  email: string;
  password: string;
};

export default function Login({ onLogin }: { onLogin?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInputs>();

  const onSubmit: SubmitHandler<LoginInputs> = async (data) => {
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      if (onLogin) onLogin();
      window.location.reload();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#131E29] p-4">
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
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`mt-1 block w-full rounded-md border py-2 px-3 text-gray-900 shadow-sm focus:border-[#A9780F] focus:ring-[#A9780F] sm:text-sm ring-1 ring-inset ring-gray-300`}
                placeholder="admin@example.com"
                {...register("email", { required: "Email is required" })}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className={`mt-1 block w-full rounded-md border py-2 px-3 text-gray-900 shadow-sm focus:border-[#A9780F] focus:ring-[#A9780F] sm:text-sm ring-1 ring-inset ring-gray-300`}
                placeholder="••••••••"
                {...register("password", { required: "Password is required" })}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 text-center">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md bg-[#A9780F] px-4 py-2 text-sm font-bold text-white hover:bg-[#8e650c] focus:outline-none focus:ring-2 focus:ring-[#A9780F] focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
