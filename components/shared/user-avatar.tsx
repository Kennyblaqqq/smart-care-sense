"use client";

import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const roleColors: Record<string, string> = {
  admin:   "bg-gradient-to-br from-violet-500 to-purple-600",
  doctor:  "bg-gradient-to-br from-blue-500 to-cyan-500",
  patient: "bg-gradient-to-br from-emerald-500 to-teal-500",
};

const roleBadge: Record<string, string> = {
  admin:   "bg-violet-500",
  doctor:  "bg-blue-500",
  patient: "bg-emerald-500",
};

const sizes = {
  sm:  { avatar: "h-7 w-7",   text: "text-xs",  badge: "h-2.5 w-2.5 -bottom-0.5 -right-0.5" },
  md:  { avatar: "h-9 w-9",   text: "text-sm",  badge: "h-3 w-3 -bottom-0.5 -right-0.5" },
  lg:  { avatar: "h-12 w-12", text: "text-base", badge: "h-3.5 w-3.5 bottom-0 right-0" },
  xl:  { avatar: "h-16 w-16", text: "text-xl",   badge: "h-4 w-4 bottom-0 right-0" },
};

export function UserAvatar({ name, email, role, size = "md", className }: UserAvatarProps) {
  const label = name || email || "?";
  const initials = label
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const { avatar, text, badge } = sizes[size];
  const gradient = roleColors[role ?? "patient"] ?? roleColors.patient;
  const dot = roleBadge[role ?? "patient"] ?? roleBadge.patient;

  return (
    <div className={cn("relative shrink-0", className)}>
      <div className={cn("rounded-full flex items-center justify-center font-semibold text-white", gradient, avatar, text)}>
        {initials}
      </div>
      {role && (
        <span className={cn("absolute rounded-full border-2 border-background", dot, badge)} />
      )}
    </div>
  );
}
