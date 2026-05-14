import {
  Heart, Activity, Droplet, Wind, Thermometer, Footprints,
  Moon, Brain, Flame, Gauge, Zap, HeartPulse,
} from "lucide-react";

export type MetricType =
  | "heart_rate" | "spo2" | "blood_pressure" | "body_temp"
  | "respiratory_rate" | "steps" | "calories" | "sleep_hours"
  | "stress" | "hrv" | "vo2_max" | "ecg";

export type MetricMeta = {
  key: MetricType;
  label: string;
  unit: string;
  icon: typeof Heart;
  color: string;       // tailwind color class fragment, used as css var name
  normalRange: [number, number];
  baseline: number;
  variance: number;
  decimals?: number;
};

export const METRICS: Record<MetricType, MetricMeta> = {
  heart_rate:       { key: "heart_rate", label: "Heart Rate", unit: "bpm", icon: HeartPulse, color: "vital", normalRange: [60, 100], baseline: 72, variance: 8 },
  spo2:             { key: "spo2", label: "Blood Oxygen", unit: "%", icon: Droplet, color: "oxygen", normalRange: [95, 100], baseline: 98, variance: 1.2 },
  blood_pressure:   { key: "blood_pressure", label: "Blood Pressure", unit: "mmHg", icon: Gauge, color: "primary", normalRange: [90, 120], baseline: 118, variance: 6 },
  body_temp:        { key: "body_temp", label: "Body Temp", unit: "°C", icon: Thermometer, color: "warning", normalRange: [36.1, 37.2], baseline: 36.7, variance: 0.2, decimals: 1 },
  respiratory_rate: { key: "respiratory_rate", label: "Respiration", unit: "rpm", icon: Wind, color: "accent", normalRange: [12, 20], baseline: 15, variance: 2 },
  steps:            { key: "steps", label: "Steps", unit: "", icon: Footprints, color: "activity", normalRange: [0, 10000], baseline: 6420, variance: 0 },
  calories:         { key: "calories", label: "Calories", unit: "kcal", icon: Flame, color: "activity", normalRange: [0, 3000], baseline: 1820, variance: 0 },
  sleep_hours:      { key: "sleep_hours", label: "Sleep", unit: "h", icon: Moon, color: "sleep", normalRange: [7, 9], baseline: 7.4, variance: 0, decimals: 1 },
  stress:           { key: "stress", label: "Stress", unit: "/100", icon: Brain, color: "stress", normalRange: [0, 60], baseline: 32, variance: 8 },
  hrv:              { key: "hrv", label: "HRV", unit: "ms", icon: Activity, color: "primary", normalRange: [40, 100], baseline: 58, variance: 6 },
  vo2_max:          { key: "vo2_max", label: "VO₂ Max", unit: "ml/kg/min", icon: Zap, color: "primary", normalRange: [35, 60], baseline: 42, variance: 0, decimals: 1 },
  ecg:              { key: "ecg", label: "ECG", unit: "mV", icon: Heart, color: "vital", normalRange: [0, 0], baseline: 0, variance: 0 },
};

export function simulateValue(meta: MetricMeta, prev?: number): number {
  if (meta.variance === 0) return meta.baseline;
  const drift = (Math.random() - 0.5) * meta.variance;
  const last = prev ?? meta.baseline;
  const next = last * 0.6 + (meta.baseline + drift) * 0.4;
  return Number(next.toFixed(meta.decimals ?? 0));
}

export function statusFor(meta: MetricMeta, value: number): "normal" | "warning" | "critical" {
  const [lo, hi] = meta.normalRange;
  if (value < lo * 0.85 || value > hi * 1.15) return "critical";
  if (value < lo || value > hi) return "warning";
  return "normal";
}