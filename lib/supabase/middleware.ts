import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public routes that don't require auth
  const publicRoutes = ["/auth", "/api"];
  const isPublicRoute = publicRoutes.some((r) => pathname.startsWith(r));

  // If not authenticated and trying to access protected route → redirect to auth
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  // If authenticated and on auth page → redirect to role dashboard
  if (user && pathname === "/auth") {
    // Fetch role from DB
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    const role = roleData?.role ?? "patient";
    const url = request.nextUrl.clone();

    switch (role) {
      case "admin":
        url.pathname = "/admin";
        break;
      case "doctor":
        url.pathname = "/doctor";
        break;
      default:
        url.pathname = "/patient";
    }

    return NextResponse.redirect(url);
  }

  // If authenticated, enforce role-based route access
  if (user) {
    const isRoleRoute =
      pathname.startsWith("/patient") ||
      pathname.startsWith("/doctor") ||
      pathname.startsWith("/admin");

    if (isRoleRoute) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const role = roleData?.role ?? "patient";

      // Admin can access everything
      if (role === "admin") {
        return supabaseResponse;
      }

      // Check if user is trying to access a route they shouldn't
      const routeRole = pathname.split("/")[1]; // "patient", "doctor", or "admin"
      if (routeRole !== role) {
        const url = request.nextUrl.clone();
        switch (role) {
          case "doctor":
            url.pathname = "/doctor";
            break;
          default:
            url.pathname = "/patient";
        }
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
