// Central role type — mirrors DB enum public.user_role
export type user_role = "patient" | "doctor" | "admin";

export interface UserProfile {
  id: string;
  full_name: string | null;
  date_of_birth: string | null;
  sex: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  blood_type: string | null;
  medical_conditions: string[] | null;
  medications: string[] | null;
  allergies: string[] | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  avatar_url: string | null;
  phone_number: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  timezone: string | null;
  notification_prefs: Record<string, boolean> | null;
  created_at: string;
  updated_at: string;
}

export interface DoctorProfile {
  id: string;
  user_id: string;
  specialty: string;
  license_number: string;
  years_experience: number;
  bio: string | null;
  hospital_affiliation: string | null;
  is_verified: boolean;
  is_accepting_patients: boolean;
}
