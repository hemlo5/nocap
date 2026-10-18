import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const authError = url.searchParams.get("error_description") || url.searchParams.get("error");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost.split(",")[0].trim()}`
    : url.origin;
  const next = url.searchParams.get("next")?.startsWith("/") ? url.searchParams.get("next")! : "/map";

  if (authError) {
    console.error("[NoCap Auth] Provider error returned:", authError);
    return NextResponse.redirect(new URL(`/map?auth_error=${encodeURIComponent(authError)}`, origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!code || !supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(new URL("/map?auth=unavailable", origin));
  }

  const cookieStore = await cookies();
  const response = NextResponse.redirect(new URL(next, origin));

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[NoCap Auth] exchangeCodeForSession failed:", error.message);
    return NextResponse.redirect(new URL(`/map?auth_error=${encodeURIComponent(error.message)}`, origin));
  }

  // Pre-seed profile in nocap_profiles if needed
  if (data?.user) {
    try {
      const admin = createAdminClient();
      const meta = data.user.user_metadata ?? {};
      const displayName = String(meta.full_name || meta.name || meta.user_name || "NoCap Local").slice(0, 60);
      const avatarUrl = typeof meta.avatar_url === "string" ? meta.avatar_url : (typeof meta.picture === "string" ? meta.picture : null);
      await admin.from("nocap_profiles").upsert(
        { id: data.user.id, display_name: displayName, avatar_url: avatarUrl },
        { onConflict: "id", ignoreDuplicates: true }
      );
    } catch (e) {
      console.warn("[NoCap Auth] Profile seeding warning:", e);
    }
  }

  return response;
}
