"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

// Define the shape of the context
type AuthContextType = {
  user: User | null;
  role: "admin" | "user" | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"admin" | "user" | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchAndSetRole = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (error) {
        setRole("user");
        return;
      }

      if (profile) {
        if (profile.role === "admin") {
          setRole("admin");
        } else {
          setRole("user");
        }
      } else {
        setRole("user");
      }
    } catch (error) {
      console.error("💥 Unexpected error fetching role:", error);
      setRole("user");
    }
  };

  const signIn = async (email: string, password: string) => {
    // Start loading for the sign‑in process
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Sign in error:", error.message);
        setLoading(false);
        return { error };
      }

      if (data.user) {
        setUser(data.user);
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();

        if (profile) {
          if (profile.role === "admin") {
            setRole("admin");
          } else {
            setRole("user");
          }
        } else {
          setRole("user");
        }
      }

      setLoading(false);
      return { error: null };
    } catch (err: any) {
      setLoading(false);
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        setLoading(false);
        return { error };
      }
      // Optionally, you could auto-login or redirect to login page here
      setLoading(false);
      return { error: null };
    } catch (err: any) {
      setLoading(false);
      return { error: err };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    router.push("/login");
  };

  // Initialize auth state on mount - this reads from localStorage automatically
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // getUser() automatically reads the token from localStorage
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (user && !error) {
          setUser(user);
          // Fetch role with timeout to prevent hanging
          try {
            await Promise.race([
              fetchAndSetRole(user.id),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout")), 5000),
              ),
            ]);
          } catch (roleError) {
            console.error(
              "⚠️ Role fetch timeout or error, defaulting to user:",
              roleError,
            );
            setRole("user");
          }
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error("❌ Error initializing auth:", error);
        if (mounted) {
          setUser(null);
          setRole(null);
        }
      } finally {
        // CRITICAL: Always set loading to false
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (!mounted) return;

          if (event === "SIGNED_IN" && session?.user) {
            setUser(session.user);
            try {
              await Promise.race([
                fetchAndSetRole(session.user.id),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error("Timeout")), 5000),
                ),
              ]);
            } catch (roleError) {
              setRole("user");
            }
            setLoading(false);
          } else if (event === "SIGNED_OUT") {
            setUser(null);
            setRole(null);
            setLoading(false);
          } else if (event === "TOKEN_REFRESHED" && session?.user) {
            setUser(session.user);
          } else if (event === "INITIAL_SESSION") {
          }
        } catch (error) {
          console.error("Error in onAuthStateChange listener:", error);
        }
      },
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, role, loading, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
