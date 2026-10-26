"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, CircleUserRound, LogIn, LogOut, MapPin, Pencil, Star, ArrowUpRight } from "lucide-react";
import type { NocapProfile } from "@/lib/nocap/community";
import { createSupabaseBrowserClient, hasSupabaseBrowserConfig } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

type UserReviewItem = {
  id: string;
  placeId: string;
  placeName: string;
  placeAddress: string;
  placeCategory: string;
  body: string;
  rating: number | null;
  latitude: number;
  longitude: number;
  isLegit: boolean;
  createdAt: string;
  updatedAt: string;
};

function timeLabel(value: string, id?: string) {
  const diffMinutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));

  const isArchive = id?.startsWith("archive-") || false;
  if (isArchive || diffMinutes >= 2880) {
    let hash = 0;
    const seed = id || value;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    const hours = 2 + (hash % 44);
    return `${hours}h ago`;
  }

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  return `${Math.floor(diffMinutes / 60)}h ago`;
}

export function NocapProfilePage() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<NocapProfile | null>(null);
  const [showAvatar, setShowAvatar] = useState(false);
  const [reviews, setReviews] = useState<UserReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!hasSupabaseBrowserConfig()) { setLoading(false); return; }
    const supabase = createSupabaseBrowserClient();
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setAccessToken(data.session?.access_token ?? null);
      setLoading(false);
    });
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => setAccessToken(session?.access_token ?? null));
    return () => { alive = false; subscription.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/nocap/profile", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.profile) {
          setProfile(data.profile);
          setShowAvatar(Boolean(data.profile.avatarUrl));
        }
        if (data?.reviews) setReviews(data.reviews);
      });
  }, [accessToken]);

  async function signIn() {
    if (!hasSupabaseBrowserConfig()) return;
    await createSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/nocap/profile` }
    });
  }

  async function signOut() {
    if (!hasSupabaseBrowserConfig()) return;
    await createSupabaseBrowserClient().auth.signOut();
    setProfile(null);
    setAccessToken(null);
    setReviews([]);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/nocap/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        displayName: form.get("displayName") || "Anonymous",
        bio: form.get("bio"),
        showAvatar
      })
    });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error ?? "Could not save your profile."); return; }
    setProfile(data.profile);
    setShowAvatar(Boolean(data.profile.avatarUrl));
    setMessage("Profile updated.");
  }

  if (!hasSupabaseBrowserConfig()) return <ProfileShell><SetupCard /></ProfileShell>;
  if (loading) return <ProfileShell><div className="h-64 animate-pulse rounded-lg bg-zinc-100" /></ProfileShell>;
  if (!accessToken) return <ProfileShell><section className="max-w-lg rounded-lg border border-zinc-200 bg-white p-7 shadow-sm"><CircleUserRound className="h-8 w-8 text-zinc-400" /><h1 className="mt-5 text-2xl font-black tracking-tight">Build your local identity</h1><p className="mt-2 text-sm leading-6 text-zinc-600">Your name appears with reviews and notes you write from places you visit. No phone number is needed.</p><button type="button" onClick={signIn} className="mt-6 inline-flex h-10 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-bold text-white"><LogIn className="h-4 w-4" />Continue with Google</button></section></ProfileShell>;
  if (!profile) return <ProfileShell><div className="h-64 animate-pulse rounded-lg bg-zinc-100" /></ProfileShell>;

  const currentAvatar = showAvatar ? (profile.googleAvatarUrl || profile.avatarUrl) : null;

  return (
    <ProfileShell>
      <div className="space-y-6">
        {/* Profile Details Card */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-zinc-950 text-lg font-black text-white">
                {currentAvatar ? (
                  <span aria-hidden className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${currentAvatar})` }} />
                ) : (
                  <CircleUserRound className="h-8 w-8 text-zinc-300" />
                )}
              </span>
              <div>
                <h1 className="text-xl font-black tracking-tight">{profile.displayName || "Anonymous"}</h1>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
                  <MapPin className="h-3.5 w-3.5" />NoCap local · {currentAvatar ? "Photo visible" : "Anonymous photo"}
                </p>
              </div>
            </div>
            <Link href="/nocap" className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-zinc-950">
              View map <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <form onSubmit={save} className="mt-6 grid gap-4">
            <label className="text-xs font-bold text-zinc-700">
              Name
              <span className="ml-1.5 font-normal text-zinc-400">(defaults to Anonymous on reviews unless changed)</span>
              <input
                name="displayName"
                defaultValue={profile.displayName}
                placeholder="Anonymous"
                maxLength={60}
                className="mt-1.5 h-10 w-full rounded-md border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-500"
              />
            </label>

            {/* Profile picture toggle */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-zinc-900">Show Google profile picture</div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {showAvatar
                      ? "Your Google photo is visible on your reviews and profile."
                      : "Your photo is hidden by default. Reviews show a default anonymous icon."}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showAvatar}
                  onClick={() => setShowAvatar(!showAvatar)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    showAvatar ? "bg-zinc-950" : "bg-zinc-300"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                      showAvatar ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>

            <label className="text-xs font-bold text-zinc-700">
              About you
              <textarea
                name="bio"
                defaultValue={profile.bio ?? ""}
                maxLength={240}
                placeholder="A line about what you know around Bengaluru"
                className="mt-1.5 min-h-24 w-full rounded-md border border-zinc-200 p-3 text-sm outline-none focus:border-zinc-500"
              />
            </label>
            {message && (
              <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <Check className="h-3.5 w-3.5" />{message}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button className="inline-flex h-9 items-center gap-2 rounded-md bg-zinc-950 px-4 text-xs font-bold text-white hover:bg-zinc-800">
                <Pencil className="h-3.5 w-3.5" />Save profile
              </button>
              <button type="button" onClick={signOut} className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-950">
                <LogOut className="h-3.5 w-3.5" />Sign out
              </button>
            </div>
          </form>
        </section>

        {/* User's Reviews Section */}
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
            <div>
              <h2 className="text-base font-black tracking-tight">Your NoCap Drops</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Click any review to jump to that place on the map</p>
            </div>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-bold text-zinc-700">
              {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
            </span>
          </div>

          {reviews.length === 0 ? (
            <div className="py-10 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-zinc-100 text-zinc-400">
                <MapPin className="h-5 w-5" />
              </div>
              <p className="mt-3 text-sm font-bold text-zinc-800">No reviews dropped yet</p>
              <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
                Visit any spot in Bengaluru, verify your location, and write a review or note to see it here.
              </p>
              <Link
                href="/nocap"
                className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md bg-zinc-950 px-4 text-xs font-bold text-white hover:bg-zinc-800"
              >
                Explore map
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {reviews.map((r) => (
                <Link
                  key={r.id}
                  href={`/nocap?place=${encodeURIComponent(r.placeId)}`}
                  className={cn(
                    "group block rounded-xl border p-4 transition-all hover:scale-[1.008] hover:shadow-md",
                    r.isLegit
                      ? "border-purple-300/80 bg-gradient-to-br from-purple-50/60 via-white to-violet-50/40"
                      : "border-zinc-200 bg-white hover:border-zinc-300"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-zinc-900 group-hover:text-zinc-950 transition-colors">
                          {r.placeName}
                        </span>
                        {r.isLegit && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-violet-950 via-purple-900 to-indigo-950 px-2.5 py-0.5 text-[10px] font-black tracking-wide text-purple-100 border border-purple-400/40 shadow-xs">
                            <span className="text-amber-300">★</span> Legit
                          </span>
                        )}
                      </div>
                      {r.placeAddress && (
                        <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{r.placeAddress}</span>
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      {r.rating ? (
                        <div className="text-amber-500 text-xs font-black">
                          {"★".repeat(r.rating)}
                        </div>
                      ) : (
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600">
                          Note
                        </span>
                      )}
                      <p className="text-[10px] text-zinc-400 mt-1">{timeLabel(r.createdAt, r.id)}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-700">
                    {r.body}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-zinc-900 group-hover:text-purple-900 transition-colors">
                    <span>View place on map</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </ProfileShell>
  );
}

function ProfileShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[calc(100dvh-3.5rem)] bg-[#F6F5F2] px-4 py-8 text-zinc-950 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/map" className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-950">
          <ArrowLeft className="h-3.5 w-3.5" />Back to Map
        </Link>
        {children}
        <div className="mt-12 text-center text-[11px] text-zinc-400">
          <Link href="/privacy" className="hover:text-zinc-600 transition-colors underline underline-offset-2">
            Privacy Policy
          </Link>
        </div>
      </div>
    </main>
  );
}

function SetupCard() {
  return (
    <section className="max-w-lg rounded-lg border border-amber-200 bg-amber-50 p-7">
      <h1 className="text-xl font-black tracking-tight">Profile setup is waiting on Supabase</h1>
      <p className="mt-2 text-sm leading-6 text-amber-900">
        Add the NoCap Supabase environment values, then this page will offer Google sign-in and editable local profiles.
      </p>
    </section>
  );
}
