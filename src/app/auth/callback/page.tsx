"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState("Completing sign in...");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function handleAuth() {
      if (!hasSupabaseBrowserConfig()) {
        setStatus("Supabase is not configured.");
        setTimeout(() => window.location.replace("/map"), 1500);
        return;
      }

      const client = createSupabaseBrowserClient();
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const authError = params.get("error_description") || params.get("error");
      const next = params.get("next") || "/map";

      if (authError) {
        console.error("[NoCap Auth] Auth error returned from provider:", authError);
        if (alive) setError(authError);
        setTimeout(() => window.location.replace(`/map?auth_error=${encodeURIComponent(authError)}`), 2500);
        return;
      }

      if (code) {
        if (alive) setStatus("Verifying your Google account...");
        const { data, error: exchangeError } = await client.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          console.error("[NoCap Auth] Client exchange error:", exchangeError);
          // Check if session was already established
          const { data: sessionData } = await client.auth.getSession();
          if (sessionData?.session) {
            window.location.replace(next);
            return;
          }
          if (alive) setError(exchangeError.message);
          setTimeout(() => window.location.replace(`/map?auth_error=${encodeURIComponent(exchangeError.message)}`), 2500);
          return;
        }

        if (data?.session) {
          if (alive) setStatus("Signed in! Loading map...");
          window.location.replace(next);
          return;
        }
      }

      // If no code, check if session already exists
      const { data: existingSession } = await client.auth.getSession();
      if (existingSession?.session) {
        window.location.replace(next);
        return;
      }

      window.location.replace("/map");
    }

    handleAuth();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#F6F5F2] text-zinc-900 p-4">
      <div className="flex flex-col items-center max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-xl text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-zinc-200 border-t-zinc-950 mb-4" />
        <h2 className="text-base font-black tracking-tight">{error ? "Sign In Issue" : "Signing you in to NoCapBLR"}</h2>
        <p className="mt-2 text-xs font-medium text-zinc-500">{error ? error : status}</p>
      </div>
    </div>
  );
}

