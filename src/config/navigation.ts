import {
  LayoutDashboard, MessageSquare, Bell, Watch, User,
  Users, Stethoscope, Calendar, FileText, Activity,
  BarChart3, Settings, ShieldAlert, ClipboardList,
  Clock, MessageCircle, UserCheck, AlertTriangle, HeartPulse,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  badge?: string;
}

export const PATIENT_NAV: NavItem[] = [
  { to: "/",              label: "Dashboard",    icon: LayoutDashboard, end: true },
  { to: "/appointments",  label: "Appointments", icon: Calendar },
  { to: "/prescriptions", label: "Prescriptions",icon: FileText },
  { to: "/messages",      label: "Messages",     icon: MessageCircle },
  { to: "/assistant",     label: "AI Assistant", icon: MessageSquare },
  { to: "/alerts",        label: "Alerts",       icon: Bell },
  { to: "/devices",       label: "Devices",      icon: Watch },
  { to: "/profile",       label: "Profile",      icon: User },
];

export const DOCTOR_NAV: NavItem[] = [
  { to: "/doctor",              label: "Dashboard",     icon: LayoutDashboard, end: true },
  { to: "/doctor/patients",     label: "My Patients",   icon: Users },
  { to: "/doctor/alerts",       label: "Patient Alerts",icon: AlertTriangle },
  { to: "/doctor/appointments", label: "Appointments",  icon: Calendar },
  { to: "/doctor/reports",      label: "Weekly Reports",icon: BarChart3 },
  { to: "/doctor/availability", label: "Availability",  icon: Clock },
  { to: "/doctor/profile",      label: "My Profile",    icon: Stethoscope },
];

export const ADMIN_NAV: NavItem[] = [
  { to: "/admin",              label: "Dashboard",    icon: LayoutDashboard, end: true },
  { to: "/admin/users",        label: "Users",        icon: Users },
  { to: "/admin/verify",       label: "Verify Doctors",icon: UserCheck },
  { to: "/admin/assignments",  label: "Assignments",  icon: ClipboardList },
  { to: "/admin/alerts",       label: "All Alerts",   icon: ShieldAlert },
  { to: "/admin/analytics",    label: "Analytics",    icon: Activity },
  { to: "/admin/settings",     label: "Settings",     icon: Settings },
];
