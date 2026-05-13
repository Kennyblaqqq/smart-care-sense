import { ReactNode } from "react";
import { useRole } from "@/hooks/useRole";
import type { user_role } from "@/types/roles";

interface Props {
  roles: user_role[];
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Inline role guard for conditional rendering within a page.
 * Renders children only when the current user has one of the specified roles.
 */
export function RoleGuard({ roles, fallback = null, children }: Props) {
  const { role } = useRole();
  if (!role || !roles.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
}
