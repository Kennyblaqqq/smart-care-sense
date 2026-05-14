import { createClient } from "@/lib/supabase/client";

function getSupabase() {
  return createClient();
}

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_id: string;
  medication: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  instructions: string | null;
  is_active: boolean;
  refills: number;
  created_at: string;
  updated_at: string;
  doctor_name?: string;
  patient_name?: string;
}

export async function getPatientPrescriptions(patientId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("prescriptions")
    .select(`*, doctor:doctor_id ( profiles!inner ( full_name ) )`)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ...r,
    doctor_name: r.doctor?.profiles?.full_name ?? "Unknown Doctor",
  })) as Prescription[];
}

export async function getDoctorPrescriptions(doctorId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("prescriptions")
    .select(`*, patient:patient_id ( profiles!inner ( full_name ) )`)
    .eq("doctor_id", doctorId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    ...r,
    patient_name: r.patient?.profiles?.full_name ?? "Unknown Patient",
  })) as Prescription[];
}

export async function getDoctorPatientPrescriptions(doctorId: string, patientId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("prescriptions")
    .select("*")
    .eq("doctor_id", doctorId)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Prescription[];
}

export async function createPrescription(payload: Omit<Prescription, "id" | "created_at" | "updated_at" | "doctor_name" | "patient_name">) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("prescriptions")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Prescription;
}

export async function updatePrescription(id: string, updates: Partial<Pick<Prescription, "is_active" | "instructions" | "end_date" | "refills">>) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("prescriptions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deactivatePrescription(id: string) {
  return updatePrescription(id, { is_active: false, end_date: new Date().toISOString().slice(0, 10) });
}
