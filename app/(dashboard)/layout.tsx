"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Middleware handles role-based redirects, so if we reach here, the user is authorized
  return <>{children}</>;
}
