import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// This route handles the auth callback from Supabase (email confirmation, OAuth, etc.)
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get the user's role to redirect properly
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        const role = roleData?.role ?? "patient";

        switch (role) {
          case "admin":
            return NextResponse.redirect(`${origin}/admin`);
          case "doctor":
            return NextResponse.redirect(`${origin}/doctor`);
          default:
            return NextResponse.redirect(`${origin}/patient`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth code exchange failed — redirect to auth with error
  return NextResponse.redirect(`${origin}/auth?error=auth_callback_failed`);
}
