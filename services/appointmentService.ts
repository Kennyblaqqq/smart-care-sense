import { createClient } from "@/lib/supabase/client";
import type { Appointment, AppointmentStatus, AppointmentType } from "@/components/shared/appointment-card";

function getSupabase() {
  return createClient();
}

export async function getPatientAppointments(patientId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("appointments")
    .select(`
      *,
      doctor:doctor_id (
        id,
        profiles!inner ( full_name ),
        doctor_profiles!inner ( specialty )
      )
    `)
    .eq("patient_id", patientId)
    .order("scheduled_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row,
    doctor_name: row.doctor?.profiles?.full_name ?? "Unknown Doctor",
    doctor_specialty: row.doctor?.doctor_profiles?.specialty ?? "",
  })) as Appointment[];
}

export async function getDoctorAppointments(doctorId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("appointments")
    .select(`
      *,
      patient:patient_id (
        id,
        profiles!inner ( full_name )
      )
    `)
    .eq("doctor_id", doctorId)
    .order("scheduled_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row,
    patient_name: row.patient?.profiles?.full_name ?? "Unknown Patient",
  })) as Appointment[];
}

export async function getAllAppointments() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("appointments")
    .select(`
      *,
      patient:patient_id ( profiles!inner ( full_name ) ),
      doctor:doctor_id  ( profiles!inner ( full_name ), doctor_profiles!inner ( specialty ) )
    `)
    .order("scheduled_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    ...row,
    patient_name:    row.patient?.profiles?.full_name ?? "Unknown",
    doctor_name:     row.doctor?.profiles?.full_name ?? "Unknown",
    doctor_specialty: row.doctor?.doctor_profiles?.specialty ?? "",
  })) as Appointment[];
}

export async function createAppointment(payload: {
  patient_id: string;
  doctor_id: string;
  scheduled_at: string;
  duration_minutes?: number;
  type?: AppointmentType;
  patient_notes?: string;
}) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("appointments")
    .insert({ ...payload, status: "pending" })
    .select()
    .single();
  if (error) throw error;
  return data as Appointment;
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
  extra?: { doctor_notes?: string; meeting_url?: string; cancelled_reason?: string }
) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("appointments")
    .update({ status, ...extra, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function getDoctorAvailableSlots(doctorId: string, date: string) {
  const supabase = getSupabase();
  const dayOfWeek = new Date(date).getDay();
  const { data: avail } = await supabase
    .from("doctor_availability")
    .select("*")
    .eq("doctor_id", doctorId)
    .eq("day_of_week", dayOfWeek)
    .eq("is_available", true)
    .maybeSingle();

  if (!avail) return [];

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const { data: existing } = await supabase
    .from("appointments")
    .select("scheduled_at, duration_minutes")
    .eq("doctor_id", doctorId)
    .gte("scheduled_at", dayStart.toISOString())
    .lte("scheduled_at", dayEnd.toISOString())
    .neq("status", "cancelled");

  const booked = new Set((existing ?? []).map((a: any) => a.scheduled_at));

  const slots: string[] = [];
  const [startH, startM] = (avail.start_time as string).split(":").map(Number);
  const [endH, endM]     = (avail.end_time as string).split(":").map(Number);
  const slotMin = avail.slot_minutes as number;

  let cur = startH * 60 + startM;
  const endMin = endH * 60 + endM;

  while (cur + slotMin <= endMin) {
    const h = Math.floor(cur / 60).toString().padStart(2, "0");
    const m = (cur % 60).toString().padStart(2, "0");
    const slotISO = `${date}T${h}:${m}:00`;
    if (!booked.has(slotISO)) slots.push(slotISO);
    cur += slotMin;
  }

  return slots;
}
