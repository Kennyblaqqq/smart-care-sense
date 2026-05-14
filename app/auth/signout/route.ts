import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Server-side sign out — clears the session cookie
export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/auth", process.env.NEXT_PUBLIC_SUPABASE_URL ? "http://localhost:3000" : "http://localhost:3000"), {
    status: 302,
  });
}
