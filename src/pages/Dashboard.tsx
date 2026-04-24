import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Wifi, Bluetooth, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { AppShell } from "@/components/dashboard/AppShell";
import { VitalCard } from "@/components/dashboard/VitalCard";
import { EcgStrip } from "@/components/dashboard/EcgStrip";
import { METRICS, MetricType, simulateValue } from "@/lib/vitals";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const HISTORY = 24;

const Dashboard = () => {
  const { user } = useAuth();
  const [profileName, setProfileName] = useState<string>("");

  useEffect(() => {
    document.title = "Dashboard — HealthPulse";
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setProfileName(data.full_name.split(" ")[0]);
      });
  }, [user]);

  // Live mock data per metric
  const metricKeys = useMemo(
    () => Object.keys(METRICS).filter((k) => k !== "ecg") as MetricType[],
    []
  );

  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(metricKeys.map((k) => [k, METRICS[k].baseline]))
  );
  const [secondary, setSecondary] = useState<number>(78); // diastolic
  const [history, setHistory] = useState<Record<string, { v: number }[]>>(() =>
    Object.fromEntries(
      metricKeys.map((k) => [
        k,
        Array.from({ length: HISTORY }, () => ({ v: METRICS[k].baseline })),
      ])
    )
  );

  const tickRef = useRef(0);
  useEffect(() => {
    const id = setInterval(() => {
      tickRef.current++;
      setValues((prev) => {
        const next: Record<string, number> = { ...prev };
        for (const k of metricKeys) {
          if (k === "steps") {
            next[k] = Math.min(10000, (prev[k] ?? 0) + Math.floor(Math.random() * 18 + 5));
          } else if (k === "calories") {
            next[k] = (prev[k] ?? 0) + Math.random() * 1.5;
          } else if (k === "sleep_hours" || k === "vo2_max") {
            // static-ish
            next[k] = METRICS[k].baseline + (Math.random() - 0.5) * 0.05;
          } else {
            next[k] = simulateValue(METRICS[k], prev[k]);
          }
        }
        return next;
      });
      setSecondary((s) => Math.round(78 + (Math.random() - 0.5) * 4));
      setHistory((prev) => {
        const next: Record<string, { v: number }[]> = {};
        for (const k of metricKeys) {
          const arr = prev[k].slice(1);
          arr.push({ v: values[k] ?? METRICS[k].baseline });
          next[k] = arr;
        }
        return next;
      });
    }, 1500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell>
      <header className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold mt-1">
            Hello{profileName ? `, ${profileName}` : ""}.{" "}
            <span className="text-gradient-primary">All vitals are normal.</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-success/15 text-success border-0 gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Streaming live
          </Badge>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/devices"><Bluetooth className="h-3.5 w-3.5" /> Connect device</Link>
          </Button>
        </div>
      </header>

      {/* AI insight strip */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <Card className="glass-card p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0 shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-widest text-primary mb-1">AI Insight</div>
            <p className="text-sm text-foreground/90">
              Your resting heart rate is trending <span className="text-success font-medium">2 bpm lower</span> than last week — a sign of improving cardiovascular fitness. Keep up the consistent activity.
            </p>
          </div>
          <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            <Link to="/assistant">Ask the assistant</Link>
          </Button>
        </Card>
      </motion.div>

      {/* Vitals grid */}
      <section aria-label="Live vitals" className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {metricKeys.map((k, i) => (
          <VitalCard
            key={k}
            meta={METRICS[k]}
            value={values[k]}
            secondary={k === "blood_pressure" ? secondary : undefined}
            history={history[k]}
            index={i}
          />
        ))}
      </section>

      {/* ECG + connectivity */}
      <section className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <EcgStrip />
        </div>
        <Card className="glass-card p-5 flex flex-col">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Connectivity</div>
          <div className="space-y-3 flex-1">
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40">
              <div className="flex items-center gap-3">
                <Bluetooth className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-sm">Web Bluetooth</div>
                  <div className="text-[11px] text-muted-foreground">GATT · BLE 5.0</div>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] border-0 bg-muted text-muted-foreground">Ready</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40">
              <div className="flex items-center gap-3">
                <Wifi className="h-4 w-4 text-accent" />
                <div>
                  <div className="text-sm">Wi-Fi Ingest</div>
                  <div className="text-[11px] text-muted-foreground">HTTPS endpoint</div>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] border-0 bg-muted text-muted-foreground">Ready</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40">
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-vital" />
                <div>
                  <div className="text-sm">Demo simulator</div>
                  <div className="text-[11px] text-muted-foreground">Streaming sample data</div>
                </div>
              </div>
              <Badge className="bg-success/15 text-success border-0 text-[10px]">Active</Badge>
            </div>
          </div>
          <Button asChild variant="outline" className="mt-4">
            <Link to="/devices">Manage devices</Link>
          </Button>
        </Card>
      </section>
    </AppShell>
  );
};

export default Dashboard;