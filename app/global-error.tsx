"use client";

import { useEffect } from "react";
import { HeartPulse, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-6 h-16 w-16 rounded-full bg-destructive/15 flex items-center justify-center">
            <HeartPulse className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-muted-foreground text-sm mb-6">
            {error.message || "An unexpected error occurred. Please try again."}
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
