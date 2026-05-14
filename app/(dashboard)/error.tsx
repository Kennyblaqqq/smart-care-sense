"use client";

import { useEffect } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DashboardError]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-6 h-14 w-14 rounded-full bg-destructive/15 flex items-center justify-center">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Dashboard Error</h2>
        <p className="text-muted-foreground text-sm mb-6">
          {error.message || "Failed to load this page. Please try again."}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    </div>
  );
}
