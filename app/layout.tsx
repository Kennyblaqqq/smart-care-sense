import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "HealthPulse — Smart Care Sense",
  description:
    "AI-powered healthcare monitoring platform. Track vitals, manage appointments, and communicate with your care team.",
  keywords: ["health", "vitals", "monitoring", "healthcare", "AI", "telemedicine"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <ThemeProvider defaultTheme="dark">
          <QueryProvider>
            <AuthProvider>
              {children}
              <Toaster
                position="top-right"
                richColors
                toastOptions={{
                  className: "glass-card",
                }}
              />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

