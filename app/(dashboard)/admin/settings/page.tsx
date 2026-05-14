"use client";

import { useEffect, useState } from "react";
import { Settings, Save, Loader2, Bell, Shield, Database, Mail } from "lucide-react";
import { AppShell } from "@/components/dashboard/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function SystemSettings() {
  const [saved, setSaved] = useState(false);

  const [settings, setSettings] = useState({
    platform_name: "HealthPulse",
    allow_patient_signup: true,
    require_doctor_verification: true,
    auto_weekly_reports: true,
    emergency_alert_threshold_hr_high: 120,
    emergency_alert_threshold_hr_low: 45,
    emergency_alert_threshold_spo2: 92,
    resend_api_key_set: false,
    report_frequency_days: 7,
    max_patients_per_doctor: 50,
    maintenance_mode: false,
  });

  useEffect(() => { document.title = "System Settings — HealthPulse"; }, []);

  const handleSave = () => {
    // In production, persist to a system_settings table or Supabase secrets
    setSaved(true);
    toast.success("Settings saved");
    setTimeout(() => setSaved(false), 2000);
  };

  const set = (key: keyof typeof settings, value: any) =>
    setSettings(prev => ({ ...prev, [key]: value }));

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" /><span className="text-gradient-primary">System Settings</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Global platform configuration.</p>
          </div>
          <Button onClick={handleSave} className="bg-gradient-primary shadow-glow">
            <Save className="h-4 w-4 mr-2" />{saved ? "Saved ✓" : "Save Changes"}
          </Button>
        </header>

        {/* General */}
        <Card className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-primary" /><h2 className="font-semibold">General</h2>
          </div>
          <div className="space-y-1.5">
            <Label>Platform Name</Label>
            <Input value={settings.platform_name} onChange={e => set("platform_name", e.target.value)} />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Allow Patient Self-Registration</p>
              <p className="text-xs text-muted-foreground">New users can sign up as patients.</p>
            </div>
            <Switch checked={settings.allow_patient_signup} onCheckedChange={v => set("allow_patient_signup", v)} />
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Require Doctor Verification</p>
              <p className="text-xs text-muted-foreground">New doctor accounts must be approved by admin.</p>
            </div>
            <Switch checked={settings.require_doctor_verification} onCheckedChange={v => set("require_doctor_verification", v)} />
          </div>
          <div className="flex items-center justify-between py-2 border-t border-border/40 pt-4">
            <div>
              <p className="text-sm font-medium text-warning">Maintenance Mode</p>
              <p className="text-xs text-muted-foreground">Disable platform access for non-admins.</p>
            </div>
            <Switch checked={settings.maintenance_mode} onCheckedChange={v => set("maintenance_mode", v)} />
          </div>
        </Card>

        {/* Emergency Alert Thresholds */}
        <Card className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-4 w-4 text-destructive" /><h2 className="font-semibold">Emergency Alert Thresholds</h2>
          </div>
          <p className="text-xs text-muted-foreground">Vitals outside these ranges trigger emergency notifications to the assigned doctor.</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Heart Rate Max (bpm)</Label>
              <Input type="number" value={settings.emergency_alert_threshold_hr_high}
                onChange={e => set("emergency_alert_threshold_hr_high", parseInt(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Heart Rate Min (bpm)</Label>
              <Input type="number" value={settings.emergency_alert_threshold_hr_low}
                onChange={e => set("emergency_alert_threshold_hr_low", parseInt(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>SpO₂ Min (%)</Label>
              <Input type="number" value={settings.emergency_alert_threshold_spo2}
                onChange={e => set("emergency_alert_threshold_spo2", parseInt(e.target.value))} />
            </div>
          </div>
        </Card>

        {/* Reports */}
        <Card className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Database className="h-4 w-4 text-accent" /><h2 className="font-semibold">Reports &amp; Limits</h2>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Automatic Weekly Reports</p>
              <p className="text-xs text-muted-foreground">Scheduled via pg_cron every 7 days.</p>
            </div>
            <Switch checked={settings.auto_weekly_reports} onCheckedChange={v => set("auto_weekly_reports", v)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Report Frequency (days)</Label>
              <Input type="number" value={settings.report_frequency_days}
                onChange={e => set("report_frequency_days", parseInt(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Max Patients per Doctor</Label>
              <Input type="number" value={settings.max_patients_per_doctor}
                onChange={e => set("max_patients_per_doctor", parseInt(e.target.value))} />
            </div>
          </div>
        </Card>

        {/* Email (Resend) */}
        <Card className="glass-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-4 w-4 text-primary" /><h2 className="font-semibold">Email Notifications (Resend)</h2>
          </div>
          <div className="p-3 rounded-xl bg-muted/30 border border-border/40 text-xs space-y-1">
            <p className="font-medium">Setup Instructions:</p>
            <p className="text-muted-foreground">1. Sign up free at <strong>resend.com</strong> (3,000 emails/month free)</p>
            <p className="text-muted-foreground">2. Create an API key</p>
            <p className="text-muted-foreground">3. Run: <code className="bg-muted px-1 rounded">supabase secrets set RESEND_API_KEY=re_xxx</code></p>
            <p className="text-muted-foreground">4. Weekly reports and emergency alerts will automatically use it.</p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
