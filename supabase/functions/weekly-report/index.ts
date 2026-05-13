import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { patient_id, doctor_id } = body;

    if (!patient_id || !doctor_id) {
      return new Response(JSON.stringify({ error: "patient_id and doctor_id required" }), { status: 400, headers: corsHeaders });
    }

    // ── Get last 7 days of vitals ──────────────────────────
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const { data: vitals, error: vitalsError } = await supabase
      .from("vitals_readings")
      .select("metric_type, value, recorded_at")
      .eq("user_id", patient_id)
      .gte("recorded_at", weekStart.toISOString())
      .order("recorded_at", { ascending: true });

    if (vitalsError) throw vitalsError;

    // ── Aggregate per metric ───────────────────────────────
    const metricDefs: Record<string, { unit: string; warnHigh?: number; warnLow?: number }> = {
      heart_rate:    { unit: "bpm",  warnHigh: 100, warnLow: 50 },
      blood_oxygen:  { unit: "%",    warnLow: 94 },
      blood_pressure_systolic:  { unit: "mmHg", warnHigh: 140, warnLow: 90 },
      blood_pressure_diastolic: { unit: "mmHg", warnHigh: 90,  warnLow: 60 },
      temperature:   { unit: "°C",  warnHigh: 37.5, warnLow: 36 },
      respiratory_rate: { unit: "bpm", warnHigh: 20, warnLow: 12 },
      blood_glucose: { unit: "mg/dL", warnHigh: 180, warnLow: 70 },
      weight_kg:     { unit: "kg" },
    };

    const groups: Record<string, number[]> = {};
    (vitals ?? []).forEach((v: any) => {
      if (!groups[v.metric_type]) groups[v.metric_type] = [];
      groups[v.metric_type].push(Number(v.value));
    });

    let anomalyCount = 0;
    const reportData: Record<string, any> = {};

    for (const [metric, values] of Object.entries(groups)) {
      if (values.length === 0) continue;
      const avg  = values.reduce((a, b) => a + b, 0) / values.length;
      const min  = Math.min(...values);
      const max  = Math.max(...values);
      const def  = metricDefs[metric] ?? { unit: "" };

      let hasAnomaly = false;
      if (def.warnHigh && (avg > def.warnHigh || max > def.warnHigh)) hasAnomaly = true;
      if (def.warnLow  && (avg < def.warnLow  || min < def.warnLow))  hasAnomaly = true;
      if (hasAnomaly) anomalyCount++;

      reportData[metric] = { avg: Math.round(avg * 10) / 10, min: Math.round(min * 10) / 10, max: Math.round(max * 10) / 10, count: values.length, unit: def.unit };
    }

    reportData.__anomaly_count = anomalyCount;
    reportData.__reading_count = (vitals ?? []).length;

    // ── Generate summary ───────────────────────────────────
    const summaryParts: string[] = [];
    if ((vitals ?? []).length === 0) {
      summaryParts.push("No vitals recorded this week.");
    } else {
      summaryParts.push(`${(vitals ?? []).length} readings recorded across ${Object.keys(groups).length} metrics.`);
      if (anomalyCount === 0) summaryParts.push("All monitored vitals were within normal ranges.");
      else summaryParts.push(`${anomalyCount} metric${anomalyCount > 1 ? "s" : ""} showed values outside normal ranges — clinical review recommended.`);
    }
    const summaryText = summaryParts.join(" ");

    // ── Upsert report ──────────────────────────────────────
    const reportWeekStart = weekStart.toISOString().slice(0, 10);
    const { data: report, error: reportError } = await supabase
      .from("weekly_vital_reports")
      .upsert({
        patient_id,
        doctor_id,
        report_week_start: reportWeekStart,
        report_data: reportData,
        summary_text: summaryText,
        sent_to_doctor: false,
        generated_at: new Date().toISOString(),
      }, { onConflict: "patient_id,report_week_start" })
      .select()
      .single();

    if (reportError) throw reportError;

    // ── Notify doctor ──────────────────────────────────────
    const { data: patProfile } = await supabase.from("profiles").select("full_name").eq("id", patient_id).maybeSingle();
    const patName = patProfile?.full_name ?? "Your patient";

    await supabase.from("notifications").insert({
      user_id: doctor_id,
      type: "weekly_report",
      title: "Weekly Vital Report Ready",
      body: `${patName}'s weekly report is ready. ${anomalyCount > 0 ? `⚠️ ${anomalyCount} anomaly detected.` : "All vitals normal."}`,
      action_url: "/doctor/reports",
      metadata: { report_id: report.id, patient_id, anomaly_count: anomalyCount },
    });

    // ── Email via Resend (if API key is set) ───────────────
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      const { data: docProfile } = await supabase.from("profiles").select("full_name").eq("id", doctor_id).maybeSingle();
      const { data: docUser }    = await supabase.auth.admin.getUserById(doctor_id);
      const doctorEmail = docUser?.user?.email;

      if (doctorEmail) {
        const metricRows = Object.entries(reportData)
          .filter(([k]) => !k.startsWith("__"))
          .map(([metric, v]: [string, any]) => `<tr><td style="padding:6px 12px">${metric.replace(/_/g," ")}</td><td style="padding:6px 12px;text-align:center">${v.avg} ${v.unit}</td><td style="padding:6px 12px;text-align:center">${v.min}</td><td style="padding:6px 12px;text-align:center">${v.max}</td><td style="padding:6px 12px;text-align:center">${v.count}</td></tr>`)
          .join("");

        const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;padding:32px;color:#111;max-width:600px">
          <h2 style="color:#059669">HealthPulse — Weekly Vital Report</h2>
          <p>Dear Dr. ${docProfile?.full_name ?? ""},</p>
          <p><strong>${patName}</strong>'s weekly vital report (${reportWeekStart}) is ready.</p>
          <p>${summaryText}</p>
          <table style="width:100%;border-collapse:collapse;margin-top:16px">
            <thead><tr style="background:#f0fdf4"><th style="padding:8px 12px;text-align:left">Metric</th><th>Avg</th><th>Min</th><th>Max</th><th>Readings</th></tr></thead>
            <tbody>${metricRows}</tbody>
          </table>
          <p style="margin-top:24px;font-size:12px;color:#9ca3af">This is an automated report from HealthPulse. Log in to view full details.</p>
        </body></html>`;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "HealthPulse Reports <reports@healthpulse.app>",
            to:   [doctorEmail],
            subject: `Weekly Vital Report — ${patName}`,
            html,
          }),
        });

        await supabase.from("weekly_vital_reports").update({ sent_to_doctor: true, sent_at: new Date().toISOString() }).eq("id", report.id);
      }
    }

    return new Response(JSON.stringify({ success: true, report_id: report.id, anomaly_count: anomalyCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("weekly-report error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
