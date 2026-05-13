import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import type { user_role, UserProfile } from "@/types/roles";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  role: user_role | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  role: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

async function fetchRoleAndProfile(userId: string): Promise<{
  role: user_role | null;
  profile: UserProfile | null;
}> {
  const [roleRes, profileRes] = await Promise.all([
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  return {
    role: (roleRes.data?.role as user_role) ?? "patient",
    profile: (profileRes.data as UserProfile) ?? null,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<user_role | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (u: User | null) => {
    if (!u) {
      setRole(null);
      setProfile(null);
      return;
    }
    const { role: r, profile: p } = await fetchRoleAndProfile(u.id);
    setRole(r);
    setProfile(p);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const { role: r, profile: p } = await fetchRoleAndProfile(user.id);
    setRole(r);
    setProfile(p);
  }, [user]);

  useEffect(() => {
    // Set up listener BEFORE getSession (per Supabase best practices)
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      await loadUserData(sess?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      await loadUserData(sess?.user ?? null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [loadUserData]);

  // Real-time role updates (e.g. admin promotes a user)
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("role-watch")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_roles",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setRole(payload.new.role as user_role);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setProfile(null);
  };

  return (
    <Ctx.Provider value={{ user, session, role, profile, loading, signOut, refreshProfile }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);