import type { UserRole } from "@/types/roles";

export function getRoleDefaultRoute(role: UserRole | null): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "doctor":
      return "/doctor";
    case "patient":
    default:
      return "/patient";
  }
}

export function getRoleLabel(role: UserRole | null): string {
  switch (role) {
    case "admin":
      return "Administrator";
    case "doctor":
      return "Doctor";
    case "patient":
    default:
      return "Patient";
  }
}

export const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-violet-500",
  doctor: "bg-blue-500",
  patient: "bg-emerald-500",
};
