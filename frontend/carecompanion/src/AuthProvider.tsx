'use client';

import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./db/supabaseClient";

interface AuthContextValue {
  session: Session | null; 
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadSession() 
        {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setSession(session);
            }
            catch (error) {
                console.error("Failed to load session:", error);
            }
            finally {
                setLoading(false); 
            }
            // const { data: { session } } =
            //     await supabase.auth.getSession();
            // setSession(session);
            // setLoading(false);
        }
        loadSession();

        // 2. Set up a listener for real-time auth changes (Login, Logout, Token Refresh)
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        // 3. Cleanup the subscription when the provider unmounts
        return () => {
            subscription.unsubscribe();
        };

    }, []);

    // 4. Global 401 / token_expired guard.
    //    If any API call returns token_expired, sign the user out immediately
    //    so they land back on the login page instead of a broken state.
    useEffect(() => {
        const originalFetch = window.fetch;

        window.fetch = async (...args) => {
            const response = await originalFetch(...args);

            // Clone so the original response body can still be consumed by the caller
            if (response.status === 401) {
                const clone = response.clone();
                try {
                    const body = await clone.json();
                    if (body?.error === 'token_expired') {
                        console.warn('[AuthProvider] token_expired detected — signing out user.');
                        await supabase.auth.signOut();
                    }
                } catch {
                    // Body wasn't JSON — ignore
                }
            }
            return response;
        };

        return () => {
            // Restore original fetch on unmount
            window.fetch = originalFetch;
        };
    }, []);

    return (
        <AuthContext.Provider value={{ session, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}