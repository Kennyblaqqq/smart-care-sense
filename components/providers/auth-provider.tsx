"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import type { UserRole, UserProfile } from "@/types/roles";

// ── Types ─────────────────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

// ── Helpers ───────────────────────────────────────────────────
async function fetchRoleAndProfile(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{ role: UserRole | null; profile: UserProfile | null }> {
  const [roleRes, profileRes] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
  ]);

  if (roleRes.error) {
    console.error("[Auth] Failed to read role:", roleRes.error.message);
  }

  return {
    role: (roleRes.data?.role as UserRole) ?? null,
    profile: (profileRes.data as UserProfile) ?? null,
  };
}

// ── Provider ──────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(
    async (u: User | null) => {
      if (!u) {
        setRole(null);
        setProfile(null);
        return;
      }
      try {
        const { role: r, profile: p } = await fetchRoleAndProfile(supabase, u.id);
        setRole(r ?? "patient");
        setProfile(p);
      } catch (err) {
        console.error("[Auth] loadUserData error:", err);
        setRole("patient");
        setProfile(null);
      }
    },
    [supabase]
  );

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const { role: r, profile: p } = await fetchRoleAndProfile(supabase, user.id);
    setRole(r ?? "patient");
    setProfile(p);
  }, [user, supabase]);

  // ── Auth state listener ─────────────────────────────────────
  useEffect(() => {
    let resolved = false;

    const done = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        setLoading(false);
      }
    };

    // Safety timeout — never hang > 5s
    const timer = setTimeout(() => {
      console.warn("[Auth] Timed out — forcing loading=false");
      done();
    }, 5000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      await loadUserData(sess?.user ?? null);
      done();
    });

    // Also try getSession immediately
    supabase.auth
      .getSession()
      .then(async ({ data: { session: sess } }) => {
        setSession(sess);
        setUser(sess?.user ?? null);
        await loadUserData(sess?.user ?? null);
        done();
      })
      .catch((err) => {
        console.error("[Auth] getSession failed:", err);
        done();
      });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [supabase, loadUserData]);

  // ── Real-time role updates ──────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const channelId = `role-watch-${user.id}-${Date.now()}`;
    const ch = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_roles",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setRole(payload.new.role as UserRole);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, supabase]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("[Auth] signOut error (ignoring):", err);
    }
    setSession(null);
    setUser(null);
    setRole(null);
    setProfile(null);
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{ user, session, role, profile, loading, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
