// Wi-Fi vitals ingest endpoint for IoT devices (ESP32 / smartwatches over HTTP).
// Auth: header `x-device-key: <full api key>` issued during device pairing.
// Body: { metric_type: string, value: number, value_secondary?: number, unit: string,
//         recorded_at?: string, metadata?: object }
//   OR  { readings: [ ...same shape... ] } for batched uploads.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_METRICS = new Set([
  "heart_rate", "spo2", "blood_pressure", "body_temp", "respiratory_rate",
  "steps", "calories", "sleep_hours", "stress", "hrv", "vo2_max", "ecg",
]);

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function bad(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type Reading = {
  metric_type: string;
  value: number;
  value_secondary?: number | null;
  unit: string;
  recorded_at?: string;
  metadata?: Record<string, unknown> | null;
};

function validateReading(r: unknown): r is Reading {
  if (!r || typeof r !== "object") return false;
  const x = r as Record<string, unknown>;
  if (typeof x.metric_type !== "string" || !ALLOWED_METRICS.has(x.metric_type)) return false;
  if (typeof x.value !== "number" || !Number.isFinite(x.value)) return false;
  if (typeof x.unit !== "string" || x.unit.length === 0 || x.unit.length > 16) return false;
  if (x.value_secondary != null && (typeof x.value_secondary !== "number" || !Number.isFinite(x.value_secondary))) return false;
  if (x.recorded_at != null && typeof x.recorded_at !== "string") return false;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return bad(405, "method not allowed");

  const deviceKey = req.headers.get("x-device-key");
  if (!deviceKey || deviceKey.length < 16 || deviceKey.length > 256) {
    return bad(401, "missing or invalid x-device-key");
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const keyHash = await sha256Hex(deviceKey);
  const { data: device, error: devErr } = await supabase
    .from("devices")
    .select("id, user_id, is_active")
    .eq("api_key_hash", keyHash)
    .maybeSingle();

  if (devErr) return bad(500, "lookup failed");
  if (!device || !device.is_active) return bad(401, "unknown or inactive device");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad(400, "invalid JSON");
  }

  const list: unknown[] = Array.isArray((body as { readings?: unknown[] })?.readings)
    ? (body as { readings: unknown[] }).readings
    : [body];

  if (list.length === 0 || list.length > 100) return bad(400, "0..100 readings per request");
  if (!list.every(validateReading)) return bad(400, "invalid reading payload");

  const rows = (list as Reading[]).map((r) => ({
    user_id: device.user_id,
    device_id: device.id,
    metric_type: r.metric_type,
    value: r.value,
    value_secondary: r.value_secondary ?? null,
    unit: r.unit,
    recorded_at: r.recorded_at ?? new Date().toISOString(),
    metadata: r.metadata ?? null,
  }));

  const { error: insErr } = await supabase.from("vitals_readings").insert(rows);
  if (insErr) return bad(500, `insert failed: ${insErr.message}`);

  await supabase
    .from("devices")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", device.id);

  return new Response(JSON.stringify({ ok: true, inserted: rows.length }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});