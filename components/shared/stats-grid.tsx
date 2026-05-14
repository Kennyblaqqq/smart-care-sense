"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: { value: number; label?: string };
  tone?: "primary" | "vital" | "success" | "warning" | "destructive" | "accent";
  description?: string;
  index?: number;
}

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, { icon: string; ring: string }> = {
  primary:     { icon: "bg-primary/15 text-primary",     ring: "border-primary/20" },
  vital:       { icon: "bg-vital/15 text-vital",         ring: "border-vital/20" },
  success:     { icon: "bg-success/15 text-success",     ring: "border-success/20" },
  warning:     { icon: "bg-warning/15 text-warning",     ring: "border-warning/20" },
  destructive: { icon: "bg-destructive/15 text-destructive", ring: "border-destructive/20" },
  accent:      { icon: "bg-accent/15 text-accent",       ring: "border-accent/20" },
};

export function StatCard({ label, value, icon: Icon, trend, tone = "primary", description, index = 0 }: StatCardProps) {
  const { icon: iconCls, ring } = toneClasses[tone];
  const isPositive = trend && trend.value > 0;
  const isNegative = trend && trend.value < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className={cn("glass-card p-5 border", ring)}>
        <div className="flex items-start justify-between">
          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", iconCls)}>
            <Icon className="h-5 w-5" />
          </div>
          {trend && (
            <span className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full",
              isPositive && "bg-success/10 text-success",
              isNegative && "bg-destructive/10 text-destructive",
              !isPositive && !isNegative && "bg-muted text-muted-foreground"
            )}>
              {isPositive ? "+" : ""}{trend.value}{trend.label ?? "%"}
            </span>
          )}
        </div>
        <div className="mt-4">
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{label}</p>
          {description && (
            <p className="text-xs text-muted-foreground/70 mt-1">{description}</p>
          )}
        </div>
      </Card>
    </motion.div>
  );
}

interface StatsGridProps {
  stats: StatCardProps[];
  cols?: 2 | 3 | 4;
}

export function StatsGrid({ stats, cols = 4 }: StatsGridProps) {
  const gridCls = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 lg:grid-cols-4",
  }[cols];

  return (
    <div className={cn("grid gap-4", gridCls)}>
      {stats.map((s, i) => (
        <StatCard key={s.label} {...s} index={i} />
      ))}
    </div>
  );
}
