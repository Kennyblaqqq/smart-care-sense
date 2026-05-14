"use client";

import { cn } from "@/lib/utils";
import { Calendar, Video, Phone, MapPin, Clock } from "lucide-react";

export type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
export type AppointmentType   = "in_person" | "video" | "phone" | "follow_up" | "emergency";

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  scheduled_at: string;
  duration_minutes: number;
  type: AppointmentType;
  status: AppointmentStatus;
  patient_notes: string | null;
  doctor_notes: string | null;
  meeting_url: string | null;
  created_at: string;
  updated_at: string;
  patient_name?: string;
  doctor_name?: string;
  doctor_specialty?: string;
}

const statusConfig: Record<AppointmentStatus, { label: string; cls: string }> = {
  pending:    { label: "Pending",    cls: "bg-warning/15 text-warning border-warning/30" },
  confirmed:  { label: "Confirmed",  cls: "bg-success/15 text-success border-success/30" },
  cancelled:  { label: "Cancelled",  cls: "bg-destructive/15 text-destructive border-destructive/30" },
  completed:  { label: "Completed",  cls: "bg-primary/15 text-primary border-primary/30" },
  no_show:    { label: "No Show",    cls: "bg-muted text-muted-foreground border-border" },
};

const typeIcon: Record<AppointmentType, React.ComponentType<{ className?: string }>> = {
  in_person: MapPin,
  video:     Video,
  phone:     Phone,
  follow_up: Calendar,
  emergency: Calendar,
};

interface AppointmentCardProps {
  appointment: Appointment;
  perspective: "patient" | "doctor" | "admin";
  onAction?: (action: string, id: string) => void;
  className?: string;
}

export function AppointmentCard({ appointment: a, perspective, className }: AppointmentCardProps) {
  const { label: statusLabel, cls: statusCls } = statusConfig[a.status] ?? statusConfig.pending;
  const TypeIcon = typeIcon[a.type] ?? Calendar;
  const scheduled = new Date(a.scheduled_at);
  const isUpcoming = scheduled > new Date();
  const name = perspective === "patient" ? a.doctor_name : a.patient_name;

  return (
    <div className={cn(
      "flex items-start gap-4 p-4 rounded-xl border bg-card/40 backdrop-blur-sm hover:bg-card/60 transition-colors",
      className
    )}>
      <div className={cn(
        "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
        isUpcoming ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
      )}>
        <TypeIcon className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0">
        {name && (
          <p className="text-sm font-medium truncate">
            {perspective === "patient" ? `Dr. ${name}` : name}
          </p>
        )}
        {a.doctor_specialty && perspective === "patient" && (
          <p className="text-[11px] text-muted-foreground">{a.doctor_specialty}</p>
        )}
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {scheduled.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {scheduled.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
            {" · "}{a.duration_minutes}min
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide border", statusCls)}>
          {statusLabel}
        </span>
      </div>
    </div>
  );
}
