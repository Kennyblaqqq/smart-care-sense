import { createClient } from "@/lib/supabase/client";

function getSupabase() {
  return createClient();
}

export async function createNotification(payload: {
  user_id: string;
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  action_url?: string;
}) {
  const supabase = getSupabase();
  const { error } = await supabase.from("notifications").insert(payload);
  if (error) throw error;
}

export async function markNotificationRead(id: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string) {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  if (error) throw error;
}
