import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Severity = "info" | "warning" | "critical";

interface Rule {
  metric: string;
  evaluate: (value: number, secondary: number | null) => { severity: Severity; title: string; message: string } | null;
}

// --- Clinical threshold rules (general adult guidance, not medical advice) ---
const RULES: Rule[] = [
  {
    metric: "heart_rate",
    evaluate: (v) => {
      if (v >= 130) return { severity: "critical", title: "Very high heart rate", message: `Heart rate ${v} bpm is well above normal. If sustained at rest, seek medical attention.` };
      if (v >= 110) return { severity: "warning", title: "Elevated heart rate", message: `Heart rate ${v} bpm is elevated. Common causes: stress, caffeine, dehydration, fever.` };
      if (v <= 40) return { severity: "critical", title: "Very low heart rate", message: `Heart rate ${v} bpm is critically low. Seek care if symptomatic (dizziness, fainting).` };
      if (v <= 50) return { severity: "warning", title: "Low heart rate", message: `Heart rate ${v} bpm is low. May be normal for athletes; monitor for symptoms.` };
      return null;
    },
  },
  {
    metric: "blood_pressure",
    evaluate: (sys, dia) => {
      const d = dia ?? 0;
      if (sys >= 180 || d >= 120) return { severity: "critical", title: "Hypertensive crisis", message: `BP ${sys}/${d} mmHg is in crisis range. Seek emergency care if you have chest pain, vision changes, or shortness of breath.` };
      if (sys >= 140 || d >= 90) return { severity: "warning", title: "Stage 2 hypertension", message: `BP ${sys}/${d} mmHg indicates stage 2 hypertension. Consult your physician.` };
      if (sys >= 130 || d >= 80) return { severity: "info", title: "Stage 1 hypertension", message: `BP ${sys}/${d} mmHg is in stage 1 hypertension range. Lifestyle changes recommended.` };
      if (sys < 90 || d < 60) return { severity: "warning", title: "Low blood pressure", message: `BP ${sys}/${d} mmHg is low. Watch for dizziness or fainting.` };
      return null;
    },
  },
  {
    metric: "spo2",
    evaluate: (v) => {
      if (v < 90) return { severity: "critical", title: "Low oxygen saturation", message: `SpO₂ ${v}% indicates hypoxemia. Seek prompt medical care, especially with shortness of breath.` };
      if (v < 94) return { severity: "warning", title: "Mildly low SpO₂", message: `SpO₂ ${v}% is below normal. Re-check; if persistent, contact your provider.` };
      return null;
    },
  },
  {
    metric: "temperature",
    evaluate: (v) => {
      if (v >= 39.4) return { severity: "critical", title: "High fever", message: `Temperature ${v}°C is a high fever. Seek care, especially with stiff neck, confusion, or chest pain.` };
      if (v >= 38) return { severity: "warning", title: "Fever detected", message: `Temperature ${v}°C indicates a fever. Hydrate and rest; monitor symptoms.` };
      if (v < 35) return { severity: "critical", title: "Hypothermia risk", message: `Temperature ${v}°C is dangerously low.` };
      return null;
    },
  },
  {
    metric: "glucose",
    evaluate: (v) => {
      if (v >= 250) return { severity: "critical", title: "Very high glucose", message: `Glucose ${v} mg/dL is severely elevated.` };
      if (v >= 180) return { severity: "warning", title: "High glucose", message: `Glucose ${v} mg/dL is above target post-meal range.` };
      if (v < 70) return { severity: "critical", title: "Low glucose (hypoglycemia)", message: `Glucose ${v} mg/dL is low. Take fast-acting carbs immediately.` };
      return null;
    },
  },
];

function zScoreAnomaly(values: number[], current: number): number | null {
  if (values.length < 8) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const std = Math.sqrt(variance);
  if (std < 0.5) return null;
  return (current - mean) / std;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Scan vitals from the last 5 minutes (covers cron interval + buffer)
    const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: recent, error: recentErr } = await admin
      .from("vitals_readings")
      .select("id,user_id,metric_type,value,value_secondary,unit,recorded_at")
      .gte("recorded_at", since)
      .order("recorded_at", { ascending: false });

    if (recentErr) throw recentErr;

    let created = 0;
    const seen = new Set<string>(); // dedupe per user+metric+severity per scan

    for (const reading of recent ?? []) {
      const rule = RULES.find((r) => r.metric === reading.metric_type);
      let alert: { severity: Severity; title: string; message: string } | null = null;

      if (rule) {
        alert = rule.evaluate(Number(reading.value), reading.value_secondary != null ? Number(reading.value_secondary) : null);
      }

      // Statistical anomaly fallback (z-score over user's 7-day baseline)
      if (!alert) {
        const baselineSince = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
        const { data: baseline } = await admin
          .from("vitals_readings")
          .select("value")
          .eq("user_id", reading.user_id)
          .eq("metric_type", reading.metric_type)
          .gte("recorded_at", baselineSince)
          .lt("recorded_at", reading.recorded_at)
          .limit(200);
        const z = zScoreAnomaly((baseline ?? []).map((b) => Number(b.value)), Number(reading.value));
        if (z != null && Math.abs(z) >= 3) {
          alert = {
            severity: Math.abs(z) >= 4 ? "warning" : "info",
            title: `Unusual ${reading.metric_type.replace("_", " ")} reading`,
            message: `Reading ${reading.value} ${reading.unit} is ${z.toFixed(1)} standard deviations from your 7-day baseline.`,
          };
        }
      }

      if (!alert) continue;

      const dedupeKey = `${reading.user_id}|${reading.metric_type}|${alert.severity}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      // Skip if a matching unresolved alert already exists in last 30 min
      const dedupeSince = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: existing } = await admin
        .from("alerts")
        .select("id")
        .eq("user_id", reading.user_id)
        .eq("metric_type", reading.metric_type)
        .eq("severity", alert.severity)
        .is("resolved_at", null)
        .gte("created_at", dedupeSince)
        .limit(1);
      if (existing && existing.length > 0) continue;

      const { error: insErr } = await admin.from("alerts").insert({
        user_id: reading.user_id,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        metric_type: reading.metric_type,
      });
      if (!insErr) created++;
    }

    return new Response(JSON.stringify({ scanned: recent?.length ?? 0, created }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("detect-anomalies error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});