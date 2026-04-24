import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { User, Heart, Pill, ShieldAlert, Phone, Save, Loader2, Plus, X } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const profileSchema = z.object({
  full_name: z.string().trim().max(100, "Max 100 characters").optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
  sex: z.string().max(20).optional().or(z.literal("")),
  height_cm: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(30, "Too low").max(272, "Too high").optional()
  ),
  weight_kg: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(2, "Too low").max(635, "Too high").optional()
  ),
  blood_type: z.string().max(5).optional().or(z.literal("")),
  emergency_contact_name: z.string().trim().max(100).optional().or(z.literal("")),
  emergency_contact_phone: z.string().trim().max(30).regex(/^[+\d\s\-()]*$/, "Invalid phone").optional().or(z.literal("")),
});

type ProfileForm = {
  full_name?: string;
  date_of_birth?: string;
  sex?: string;
  height_cm?: number;
  weight_kg?: number;
  blood_type?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
};

const TAG_LIMIT = 50;

export default function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [conditions, setConditions] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema) as any,
    defaultValues: {
      full_name: "", date_of_birth: "", sex: "", blood_type: "",
      emergency_contact_name: "", emergency_contact_phone: "",
    },
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) toast.error("Failed to load profile");
      if (data) {
        form.reset({
          full_name: data.full_name ?? "",
          date_of_birth: data.date_of_birth ?? "",
          sex: data.sex ?? "",
          height_cm: data.height_cm ?? undefined,
          weight_kg: data.weight_kg ?? undefined,
          blood_type: data.blood_type ?? "",
          emergency_contact_name: data.emergency_contact_name ?? "",
          emergency_contact_phone: data.emergency_contact_phone ?? "",
        });
        setConditions(data.medical_conditions ?? []);
        setMedications(data.medications ?? []);
        setAllergies(data.allergies ?? []);
      }
      setLoading(false);
    })();
  }, [user, form]);

  const onSubmit = async (values: ProfileForm) => {
    if (!user) return;
    setSaving(true);
    const payload = {
      id: user.id,
      full_name: values.full_name || null,
      date_of_birth: values.date_of_birth || null,
      sex: values.sex || null,
      height_cm: typeof values.height_cm === "number" && !Number.isNaN(values.height_cm) ? values.height_cm : null,
      weight_kg: typeof values.weight_kg === "number" && !Number.isNaN(values.weight_kg) ? values.weight_kg : null,
      blood_type: values.blood_type || null,
      emergency_contact_name: values.emergency_contact_name || null,
      emergency_contact_phone: values.emergency_contact_phone || null,
      medical_conditions: conditions,
      medications,
      allergies,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("profiles").upsert(payload);
    setSaving(false);
    if (error) toast.error("Failed to save profile");
    else toast.success("Profile saved");
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <header>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-2">
            <User className="h-6 w-6 text-primary" />
            <span className="text-gradient-primary">Health Profile</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Powers personalised AI insights and tailored alerts.
          </p>
        </header>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <Section icon={User} title="Personal" description="Basic information about you.">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full name" error={form.formState.errors.full_name?.message}>
                <Input {...form.register("full_name")} placeholder="Jane Doe" maxLength={100} />
              </Field>
              <Field label="Date of birth" error={form.formState.errors.date_of_birth?.message}>
                <Input type="date" {...form.register("date_of_birth")} />
              </Field>
              <Field label="Sex">
                <Select
                  value={form.watch("sex") || ""}
                  onValueChange={(v) => form.setValue("sex", v, { shouldDirty: true })}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="intersex">Intersex</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Blood type">
                <Select
                  value={form.watch("blood_type") || ""}
                  onValueChange={(v) => form.setValue("blood_type", v, { shouldDirty: true })}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {["A+","A-","B+","B-","AB+","AB-","O+","O-","Unknown"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <Section icon={Heart} title="Body metrics" description="Used for BMI and dose-aware AI suggestions.">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Height (cm)" error={form.formState.errors.height_cm?.message}>
                <Input type="number" step="0.1" {...form.register("height_cm")} placeholder="170" />
              </Field>
              <Field label="Weight (kg)" error={form.formState.errors.weight_kg?.message}>
                <Input type="number" step="0.1" {...form.register("weight_kg")} placeholder="68" />
              </Field>
            </div>
          </Section>

          <Section icon={ShieldAlert} title="Medical conditions" description="Chronic or significant diagnoses.">
            <TagInput tags={conditions} setTags={setConditions} placeholder="e.g. Hypertension" />
          </Section>

          <Section icon={Pill} title="Medications" description="Active prescriptions and supplements.">
            <TagInput tags={medications} setTags={setMedications} placeholder="e.g. Lisinopril 10mg" />
          </Section>

          <Section icon={ShieldAlert} title="Allergies" description="Food, drug, or environmental allergies.">
            <TagInput tags={allergies} setTags={setAllergies} placeholder="e.g. Penicillin" />
          </Section>

          <Section icon={Phone} title="Emergency contact" description="Used in critical alerts (display only for now).">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Contact name" error={form.formState.errors.emergency_contact_name?.message}>
                <Input {...form.register("emergency_contact_name")} placeholder="John Doe" maxLength={100} />
              </Field>
              <Field label="Phone" error={form.formState.errors.emergency_contact_phone?.message}>
                <Input {...form.register("emergency_contact_phone")} placeholder="+1 555 123 4567" maxLength={30} />
              </Field>
            </div>
          </Section>

          <div className="flex justify-end sticky bottom-4">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button type="submit" size="lg" disabled={saving} className="bg-gradient-primary shadow-glow">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save profile
              </Button>
            </motion.div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

function Section({ icon: Icon, title, description, children }: { icon: any; title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 md:p-6 bg-card/40 backdrop-blur-xl border-border/60">
      <div className="flex items-start gap-3 mb-4">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function TagInput({ tags, setTags, placeholder }: { tags: string[]; setTags: (t: string[]) => void; placeholder: string }) {
  const [val, setVal] = useState("");

  const add = () => {
    const t = val.trim().slice(0, TAG_LIMIT);
    if (!t || tags.includes(t) || tags.length >= 30) { setVal(""); return; }
    setTags([...tags, t]);
    setVal("");
  };

  const remove = (t: string) => setTags(tags.filter((x) => x !== t));

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          maxLength={TAG_LIMIT}
        />
        <Button type="button" variant="outline" size="icon" onClick={add} aria-label="Add">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <Badge key={t} variant="secondary" className="pl-2.5 pr-1 py-1 text-xs gap-1">
              {t}
              <button type="button" onClick={() => remove(t)} className="hover:bg-muted rounded p-0.5" aria-label={`Remove ${t}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}