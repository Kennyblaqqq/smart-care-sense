import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Root page — redirect to the correct dashboard based on role
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  // Get role
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = roleData?.role ?? "patient";

  switch (role) {
    case "admin":
      redirect("/admin");
    case "doctor":
      redirect("/doctor");
    default:
      redirect("/patient");
  }
}
