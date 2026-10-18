import { createClient } from "@supabase/supabase-js";

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return { url, anonKey };
}

export function isSupabaseConfigured() {
  const { url, anonKey } = config();
  return Boolean(url && anonKey && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createUserClient(accessToken: string) {
  const { url, anonKey } = config();
  if (!url || !anonKey) throw new Error("Supabase is not configured.");
  return createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${accessToken}` } } });
}

export function createAdminClient() {
  const { url } = config();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Supabase server access is not configured.");
  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function getAuthenticatedUser(request: Request) {
  const authorization = request.headers.get("authorization");
  const accessToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!accessToken) return null;
  const client = createUserClient(accessToken);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function getGoogleUser(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return null;
  const provider = user.app_metadata?.provider;
  const providers = user.app_metadata?.providers;
  const isGoogle = provider === "google" || (Array.isArray(providers) && providers.includes("google"));
  return isGoogle || provider ? user : null;
}
