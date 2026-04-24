import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, AlertCircle, Info, CheckCircle2, Activity, Bell, BellOff, Trash2, Loader2, Play } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Alert = {
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

type Filter = "all" | "active" | "resolved";

const severityMeta = {
  critical: { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/40", label: "Critical" },
  warning: { icon: AlertTriangle, color: "text-vital", bg: "bg-vital/10", border: "border-vital/40", label: "Warning" },
  info: { icon: Info, color: "text-primary", bg: "bg-primary/10", border: "border-primary/40", label: "Info" },
} as const;

export default function Alerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<Filter>("active");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    (async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!mounted) return;
      if (error) toast.error("Failed to load alerts");
      else setAlerts((data ?? []) as Alert[]);
      setLoading(false);
    })();

    const channel = supabase
      .channel("alerts-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setAlerts((prev) => {
            if (payload.eventType === "INSERT") {
              const a = payload.new as Alert;
              if (a.severity === "critical") toast.error(a.title, { description: a.message });
              else if (a.severity === "warning") toast.warning(a.title, { description: a.message });
              else toast.info(a.title, { description: a.message });
              return [a, ...prev];
            }
            if (payload.eventType === "UPDATE") {
              const u = payload.new as Alert;
              return prev.map((x) => (x.id === u.id ? u : x));
            }
            if (payload.eventType === "DELETE") {
              return prev.filter((x) => x.id !== (payload.old as Alert).id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filtered = useMemo(() => {
    if (filter === "active") return alerts.filter((a) => !a.resolved_at);
    if (filter === "resolved") return alerts.filter((a) => a.resolved_at);
    return alerts;
  }, [alerts, filter]);

  const counts = useMemo(() => ({
    active: alerts.filter((a) => !a.resolved_at).length,
    critical: alerts.filter((a) => !a.resolved_at && a.severity === "critical").length,
    warning: alerts.filter((a) => !a.resolved_at && a.severity === "warning").length,
  }), [alerts]);

  const resolve = async (id: string) => {
    const { error } = await supabase
      .from("alerts")
      .update({ resolved_at: new Date().toISOString(), is_read: true })
      .eq("id", id);
    if (error) toast.error("Failed to resolve");
  };

  const dismissAll = async () => {
    const ids = alerts.filter((a) => !a.resolved_at).map((a) => a.id);
    if (!ids.length) return;
    const { error } = await supabase
      .from("alerts")
      .update({ resolved_at: new Date().toISOString(), is_read: true })
      .in("id", ids);
    if (error) toast.error("Failed to dismiss"); else toast.success("All alerts resolved");
  };

  const removeOne = async (id: string) => {
    const { error } = await supabase.from("alerts").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
  };

  const runScan = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("detect-anomalies");
      if (error) throw error;
      toast.success(`Scan complete · ${data?.created ?? 0} new alert(s)`);
    } catch (e: any) {
      toast.error(e?.message ?? "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              <span className="text-gradient-primary">Alerts</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time anomaly detection across your vitals stream.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={runScan} disabled={scanning}>
              {scanning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
              Run scan now
            </Button>
            {counts.active > 0 && (
              <Button variant="outline" size="sm" onClick={dismissAll}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Resolve all
              </Button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Active" value={counts.active} icon={Activity} tone="primary" />
          <StatCard label="Warnings" value={counts.warning} icon={AlertTriangle} tone="vital" />
          <StatCard label="Critical" value={counts.critical} icon={AlertCircle} tone="destructive" />
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="bg-card/40 backdrop-blur-xl">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <Card className="p-12 text-center text-muted-foreground bg-card/40 backdrop-blur-xl">
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center bg-card/40 backdrop-blur-xl border-border/60">
            <BellOff className="h-10 w-10 mx-auto text-muted-foreground/60 mb-3" />
            <p className="font-medium">No {filter === "all" ? "" : filter} alerts</p>
            <p className="text-sm text-muted-foreground mt-1">
              You're all clear. Vitals are within healthy ranges.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {filtered.map((a) => {
                const meta = severityMeta[a.severity];
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className={cn("p-4 border bg-card/40 backdrop-blur-xl", meta.border, a.resolved_at && "opacity-60")}>
                      <div className="flex items-start gap-3">
                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", meta.bg)}>
                          <Icon className={cn("h-5 w-5", meta.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{a.title}</h3>
                            <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wide", meta.color, meta.border)}>
                              {meta.label}
                            </Badge>
                            {a.metric_type && (
                              <Badge variant="secondary" className="text-[10px]">
                                {a.metric_type.replace("_", " ")}
                              </Badge>
                            )}
                            {a.resolved_at && (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                Resolved
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{a.message}</p>
                          <p className="text-[11px] text-muted-foreground/70 mt-2">
                            {new Date(a.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          {!a.resolved_at && (
                            <Button size="sm" variant="ghost" onClick={() => resolve(a.id)} title="Resolve">
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => removeOne(a.id)} title="Delete">
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: any; tone: "primary" | "vital" | "destructive" }) {
  const toneCls =
    tone === "destructive" ? "text-destructive bg-destructive/10" :
    tone === "vital" ? "text-vital bg-vital/10" :
    "text-primary bg-primary/10";
  return (
    <Card className="p-4 bg-card/40 backdrop-blur-xl border-border/60">
      <div className="flex items-center gap-3">
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", toneCls)}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xl font-semibold leading-none">{value}</div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-1">{label}</div>
        </div>
      </div>
    </Card>
  );
}