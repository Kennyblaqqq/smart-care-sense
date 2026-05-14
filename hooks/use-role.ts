"use client";

import { useAuth } from "@/components/providers/auth-provider";

export function useRole() {
  const { role, loading } = useAuth();
  return { role, loading };
}
