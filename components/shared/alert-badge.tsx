"use client";

import { cn } from "@/lib/utils";
import { AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react";

type Severity = "critical" | "warning" | "info" | "resolved";

interface AlertBadgeProps {
  severity: Severity | string;
  className?: string;
  showIcon?: boolean;
}

const config: Record<Severity, { label: string; cls: string; Icon: React.ComponentType<{ className?: string }> }> = {
  critical: { label: "Critical",  cls: "bg-destructive/15 text-destructive border-destructive/30", Icon: AlertCircle },
  warning:  { label: "Warning",   cls: "bg-warning/15 text-warning border-warning/30",             Icon: AlertTriangle },
  info:     { label: "Info",      cls: "bg-primary/10 text-primary border-primary/25",             Icon: Info },
  resolved: { label: "Resolved",  cls: "bg-success/10 text-success border-success/25",             Icon: CheckCircle },
};

export function AlertBadge({ severity, className, showIcon = true }: AlertBadgeProps) {
  const key = (severity as Severity) in config ? (severity as Severity) : "info";
  const { label, cls, Icon } = config[key];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide border",
        cls,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {label}
    </span>
  );
}
