import { useAuth } from "@/hooks/useAuth";
import type { user_role } from "@/types/roles";

export function useRole() {
  const { role, loading } = useAuth();

  return {
    role,
    loading,
    isPatient: role === "patient",
    isDoctor:  role === "doctor",
    isAdmin:   role === "admin",
    hasRole: (r: user_role) => role === r,
    hasAnyRole: (...roles: user_role[]) => role !== null && roles.includes(role),
  };
}
