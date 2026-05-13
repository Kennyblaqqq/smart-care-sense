import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { getRoleDefaultRoute } from "@/lib/roleRedirect";
import { Loader2 } from "lucide-react";
import type { user_role } from "@/types/roles";

interface Props {
  children: ReactNode;
  /** If omitted, any authenticated user passes. */
  allowedRoles?: user_role[];
}

export const ProtectedRoute = ({ children, allowedRoles }: Props) => {
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading } = useRole();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in → go to auth, preserving the intended destination
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Wrong role → redirect to the user's own dashboard
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to={getRoleDefaultRoute(role)} replace />;
  }

  return <>{children}</>;
};