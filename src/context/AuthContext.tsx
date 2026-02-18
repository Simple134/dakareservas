"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";

// Define the shape of the context
type AuthContextType = {
  user: User | null;
  role: "admin" | "user" | null;
  roleLoaded: boolean;
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
  const [roleLoaded, setRoleLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const initCompleteRef = useRef(false);
  const roleFetchingRef = useRef(false);

  const fetchAndSetRole = async (userId: string) => {
    // Prevent concurrent role fetches
    if (roleFetchingRef.current) return;
    roleFetchingRef.current = true;

    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (error) {
        console.warn(
          "⚠️ Error fetching role, defaulting to user:",
          error.message,
        );
        setRole("user");
        setRoleLoaded(true);
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
      setRoleLoaded(true);
    } catch (error) {
      console.error("💥 Unexpected error fetching role:", error);
      setRole("user");
      setRoleLoaded(true);
    } finally {
      roleFetchingRef.current = false;
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setRoleLoaded(false);
    roleFetchingRef.current = false; // Reset so fetchAndSetRole can run
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Sign in error:", error.message);
        setLoading(false);
        return { error };
      }

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (currentUser) {
        setUser(currentUser);
        await fetchAndSetRole(currentUser.id);
      }

      setLoading(false);
      return { error: null };
    } catch (err: unknown) {
      setLoading(false);
      return {
        error:
          err instanceof Error ? err : new Error("An unknown error occurred"),
      };
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
    } catch (err: unknown) {
      setLoading(false);
      return {
        error:
          err instanceof Error ? err : new Error("An unknown error occurred"),
      };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setRoleLoaded(false);
    initCompleteRef.current = false;
    router.push("/login");
  };

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
          await fetchAndSetRole(user.id);
        } else {
          setUser(null);
          setRole(null);
          setRoleLoaded(true);
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
          initCompleteRef.current = true;
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
            // Skip if initializeAuth already handled this
            if (!initCompleteRef.current) return;
            await fetchAndSetRole(session.user.id);
            setLoading(false);
          } else if (event === "SIGNED_OUT") {
            setUser(null);
            setRole(null);
            setRoleLoaded(false);
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

  const pathname = usePathname();

  useEffect(() => {
    if (!loading && roleLoaded && pathname === "/") {
      if (user) {
        if (role === "admin") {
          router.replace("/admin");
        } else if (role === "user") {
          router.replace(`/user/${user.id}`);
        }
      } else {
        router.replace("/login");
      }
    }
  }, [user, role, loading, roleLoaded, pathname, router]);

  return (
    <AuthContext.Provider
      value={{ user, role, roleLoaded, loading, signIn, signUp, signOut }}
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
