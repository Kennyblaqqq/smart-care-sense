import type { user_role } from "@/types/roles";

export type Role = user_role;

export function getRoleDefaultRoute(role: Role | null): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "doctor":
      return "/doctor";
    case "patient":
    default:
      return "/";
  }
}

export function getRoleLabel(role: Role | null): string {
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
