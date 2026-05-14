"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/providers/auth-provider";

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  action_url: string | null;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [supabase] = useState(() => createClient());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setNotifications((data as Notification[]) ?? []);
    setLoading(false);
  }, [user, supabase]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel(`notif-rt-${Math.random().toString(36).slice(2)}`);

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markRead = useCallback(
    async (id: string) => {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    },
    [supabase]
  );

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, [user, supabase]);

  return { notifications, unreadCount, loading, markRead, markAllRead };
}
