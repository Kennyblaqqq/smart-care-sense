// Auto-generated Supabase database types
// Run `npx supabase gen types typescript` to regenerate

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
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
          avatar_url: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };
      user_roles: {
        Row: {
          user_id: string;
          role: "patient" | "doctor" | "admin";
          created_at: string;
        };
        Insert: { user_id: string; role: "patient" | "doctor" | "admin" };
        Update: Partial<Database["public"]["Tables"]["user_roles"]["Row"]>;
      };
      vitals_readings: {
        Row: {
          id: string;
          user_id: string;
          metric_type: string;
          value: number;
          unit: string;
          secondary_value: number | null;
          recorded_at: string;
          source: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["vitals_readings"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["vitals_readings"]["Row"]>;
      };
      alerts: {
        Row: {
          id: string;
          user_id: string;
          severity: "info" | "warning" | "critical";
          title: string;
          message: string;
          metric_type: string | null;
          is_read: boolean;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["alerts"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["alerts"]["Row"]>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          body: string;
          action_url: string | null;
          is_read: boolean;
          metadata: Json | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["notifications"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
      };
      appointments: {
        Row: {
          id: string;
          patient_id: string;
          doctor_id: string;
          scheduled_at: string;
          duration_minutes: number;
          type: string;
          status: string;
          patient_notes: string | null;
          doctor_notes: string | null;
          meeting_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["appointments"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["appointments"]["Row"]>;
      };
      prescriptions: {
        Row: {
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
        };
        Insert: Omit<Database["public"]["Tables"]["prescriptions"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["prescriptions"]["Row"]>;
      };
      devices: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          device_type: string;
          connection_type: string;
          is_active: boolean;
          last_seen_at: string | null;
          api_key_prefix: string | null;
          api_key_hash: string | null;
          mac_address: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["devices"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["devices"]["Row"]>;
      };
      doctor_profiles: {
        Row: {
          id: string;
          user_id: string;
          specialty: string;
          license_number: string;
          years_experience: number;
          bio: string | null;
          hospital_affiliation: string | null;
          is_verified: boolean;
          is_accepting_patients: boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["doctor_profiles"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["doctor_profiles"]["Row"]>;
      };
      doctor_availability: {
        Row: {
          id: string;
          doctor_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          slot_minutes: number;
          is_available: boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["doctor_availability"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["doctor_availability"]["Row"]>;
      };
      doctor_patient_assignments: {
        Row: {
          id: string;
          doctor_id: string;
          patient_id: string;
          assigned_at: string;
          is_active: boolean;
        };
        Insert: Omit<Database["public"]["Tables"]["doctor_patient_assignments"]["Row"], "id" | "assigned_at">;
        Update: Partial<Database["public"]["Tables"]["doctor_patient_assignments"]["Row"]>;
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          content: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["messages"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["messages"]["Row"]>;
      };
    };
    Enums: {
      user_role: "patient" | "doctor" | "admin";
    };
  };
}
