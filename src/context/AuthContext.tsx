"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

// Define the shape of the context
type AuthContextType = {
    user: User | null;
    role: 'admin' | 'user' | null;
    loading: boolean;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<'admin' | 'user' | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const checkUser = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    setUser(user);
                    // Fetch profile to get role
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', user.id)
                        .single();

                    if (profile) {
                        // Map database role 'client' to app role 'user'
                        if (profile.role === 'client') {
                            setRole('user');
                        } else if (profile.role === 'admin') {
                            setRole('admin');
                        } else {
                            // Default fallback or other roles
                            setRole('user');
                        }
                    }
                } else {
                    setUser(null);
                    setRole(null);
                }
            } catch (error) {
                console.error("Error checking auth:", error);
            } finally {
                setLoading(false);
            }
        };

        checkUser();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                setUser(session.user);
                // We might want to re-fetch role here if it wasn't set, but usually session persistence is enough
                // reusing the checkUser logic or just setting user is fine for basic auth state
                // For stricter role checks, re-fetching profile is safer
                if (event === 'SIGNED_IN') { // Only re-fetch on explicit sign-in to avoid redundant calls
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('role')
                        .eq('id', session.user.id)
                        .single();
                    if (profile) {
                        if (profile.role === 'client') setRole('user');
                        else if (profile.role === 'admin') setRole('admin');
                        else setRole('user');
                    }
                }
            } else {
                setUser(null);
                setRole(null);
            }
            setLoading(false);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    return (
        <AuthContext.Provider value={{ user, role, loading, signOut }}>
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
