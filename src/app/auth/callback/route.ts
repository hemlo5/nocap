import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
  const origin = forwardedHost
    ? `${forwardedProto}://${forwardedHost.split(",")[0].trim()}`
    : url.origin;
  const next = url.searchParams.get("next")?.startsWith("/") ? url.searchParams.get("next")! : "/nocap";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!code || !supabaseUrl || !supabaseKey) return NextResponse.redirect(new URL("/nocap?auth=unavailable", origin));

  let response = NextResponse.redirect(new URL(next, origin));
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.headers.get("cookie")?.split("; ").map((value) => {
        const [name, ...parts] = value.split("=");
        return { name, value: parts.join("=") };
      }) ?? [],
      setAll: (cookies) => {
        response = NextResponse.redirect(new URL(next, origin));
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.exchangeCodeForSession(code);
  return response;
}
