"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Bug,
  Calendar,
  Check,
  CheckCircle2,
  ChevronUp,
  Clock,
  ExternalLink,
  Flame,
  Hammer,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  Plus,
  Search,
  Send,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_STATUSES,
  FeedbackCategory,
  FeedbackItem,
  FeedbackStatus,
} from "@/lib/nocap/feedback";
import { cn } from "@/lib/utils/cn";

export function FeedbackBoard({ initialItems }: { initialItems: FeedbackItem[] }) {
  const [items, setItems] = useState<FeedbackItem[]>(initialItems);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<FeedbackCategory | "all">("all");
  const [activeStatus, setActiveStatus] = useState<FeedbackStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"upvotes" | "newest" | "oldest">("upvotes");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState<FeedbackCategory>("feature");
  const [modalTitle, setModalTitle] = useState("");
  const [modalDescription, setModalDescription] = useState("");
  const [modalAuthorName, setModalAuthorName] = useState("");
  const [modalAuthorEmail, setModalAuthorEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Copied share toast
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Load client votes from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("nocap_voted_feedback");
      if (stored) {
        setVotedIds(new Set(JSON.parse(stored)));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Sync client votes to localStorage
  function toggleLocalVote(id: string, isVoted: boolean) {
    setVotedIds((prev) => {
      const next = new Set(prev);
      if (isVoted) {
        next.add(id);
      } else {
        next.delete(id);
      }
      try {
        localStorage.setItem("nocap_voted_feedback", JSON.stringify(Array.from(next)));
      } catch {
        // Ignore
      }
      return next;
    });
  }

  // Handle upvote / unvote
  async function handleVote(feedbackId: string) {
    const isCurrentlyVoted = votedIds.has(feedbackId);
    const newAction = isCurrentlyVoted ? "unvote" : "upvote";

    // Optimistic UI update
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === feedbackId) {
          const delta = isCurrentlyVoted ? -1 : 1;
          return { ...item, upvotesCount: Math.max(0, item.upvotesCount + delta) };
        }
        return item;
      })
    );
    toggleLocalVote(feedbackId, !isCurrentlyVoted);

    try {
      const voterId = getOrCreateVoterId();
      const currentItem = items.find((i) => i.id === feedbackId);
      const currentCount = currentItem ? currentItem.upvotesCount : 1;

      await fetch("/api/nocap/feedback/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackId,
          action: newAction,
          voterId,
          currentCount,
        }),
      });
    } catch (err) {
      console.warn("Could not sync vote to server:", err);
    }
  }

  // Get or generate anonymous client fingerprint
  function getOrCreateVoterId() {
    let id = localStorage.getItem("nocap_voter_id");
    if (!id) {
      id = `voter_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem("nocap_voter_id", id);
    }
    return id;
  }

  // Handle new feedback submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (modalTitle.trim().length < 3) {
      setSubmitError("Please write a descriptive title (at least 3 characters).");
      return;
    }
    if (modalDescription.trim().length < 8) {
      setSubmitError("Please write at least 8 characters describing the request or bug.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    const deviceInfo = typeof navigator !== "undefined" ? getDeviceInfo() : undefined;

    try {
      const res = await fetch("/api/nocap/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: modalTitle.trim(),
          description: modalDescription.trim(),
          category: modalCategory,
          authorName: modalAuthorName.trim() || "Anonymous",
          authorEmail: modalAuthorEmail.trim() || undefined,
          deviceInfo,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit feedback.");
      }

      if (data.item) {
        setItems((prev) => [data.item, ...prev]);
        // Auto-upvote author's own submission
        toggleLocalVote(data.item.id, true);
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitSuccess(false);
        setModalTitle("");
        setModalDescription("");
        setModalAuthorName("");
        setModalAuthorEmail("");
      }, 1400);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleShare(id: string) {
    const url = `${window.location.origin}/feedback#${id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  function getDeviceInfo() {
    const ua = navigator.userAgent;
    let os = "Device";
    if (/android/i.test(ua)) os = "Android";
    else if (/iPad|iPhone|iPod/.test(ua)) os = "iOS";
    else if (/mac/i.test(ua)) os = "macOS";
    else if (/win/i.test(ua)) os = "Windows";
    else if (/linux/i.test(ua)) os = "Linux";

    let browser = "Browser";
    if (/chrome|crios/i.test(ua)) browser = "Chrome";
    else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
    else if (/safari/i.test(ua)) browser = "Safari";
    else if (/edg/i.test(ua)) browser = "Edge";

    return `${os} / ${browser}`;
  }

  // Filtered & sorted items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        if (activeCategory !== "all" && item.category !== activeCategory) {
          return false;
        }
        if (activeStatus !== "all" && item.status !== activeStatus) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchDesc = item.description.toLowerCase().includes(q);
          const matchAuthor = item.authorName.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchAuthor) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "upvotes") {
          return b.upvotesCount - a.upvotesCount;
        }
        if (sortBy === "newest") {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [items, activeCategory, activeStatus, searchQuery, sortBy]);

  // Aggregate stats
  const stats = useMemo(() => {
    const total = items.length;
    const completed = items.filter((i) => i.status === "completed").length;
    const inProgress = items.filter((i) => i.status === "in_progress" || i.status === "planned").length;
    const upvotes = items.reduce((sum, i) => sum + i.upvotesCount, 0);
    return { total, completed, inProgress, upvotes };
  }, [items]);

  return (
    <div className="w-full">
      {/* ── Metric Highlights Bar ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-zinc-500">
            <MessageSquare className="h-4 w-4" />
            <span className="text-xs font-semibold">Total Requests</span>
          </div>
          <p className="mt-2 text-2xl font-black text-zinc-950 sm:text-3xl">{stats.total}</p>
          <span className="text-[11px] text-zinc-400">Community submissions</span>
        </div>

        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-purple-600">
            <Hammer className="h-4 w-4" />
            <span className="text-xs font-semibold">In Progress / Planned</span>
          </div>
          <p className="mt-2 text-2xl font-black text-purple-950 sm:text-3xl">{stats.inProgress}</p>
          <span className="text-[11px] text-zinc-400">Active engineering roadmap</span>
        </div>

        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-xs font-semibold">Completed</span>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-950 sm:text-3xl">{stats.completed}</p>
          <span className="text-[11px] text-zinc-400">Shipped into production</span>
        </div>

        <div className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-2xs">
          <div className="flex items-center gap-2 text-amber-600">
            <Flame className="h-4 w-4" />
            <span className="text-xs font-semibold">Community Upvotes</span>
          </div>
          <p className="mt-2 text-2xl font-black text-amber-950 sm:text-3xl">{stats.upvotes}</p>
          <span className="text-[11px] text-zinc-400">Votes registered</span>
        </div>
      </div>

      {/* ── Main Actions Header: Search, Post Button & Controls ── */}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search feature requests or reported bugs..."
            className="w-full h-11 rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-xs sm:text-sm text-zinc-900 outline-none focus:border-zinc-400 shadow-2xs transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "upvotes" | "newest" | "oldest")}
            className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-800 outline-none hover:border-zinc-300 shadow-2xs cursor-pointer"
          >
            <option value="upvotes">🔥 Most Upvoted</option>
            <option value="newest">🕒 Newest First</option>
            <option value="oldest">⌛ Oldest First</option>
          </select>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-zinc-800 active:scale-[0.98] transition-all shadow-md shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Give Feedback</span>
          </button>
        </div>
      </div>

      {/* ── Category & Status Filter Tabs ── */}
      <div className="mt-6 flex flex-col gap-3 border-b border-zinc-200 pb-4">
        {/* Categories */}
        <div className="flex flex-wrap items-center gap-2">
          {FEEDBACK_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all",
                activeCategory === cat.id
                  ? "bg-zinc-950 text-white shadow-xs"
                  : "border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 hover:text-zinc-950"
              )}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Statuses */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
          <span className="font-semibold text-zinc-400 mr-1 text-[11px] uppercase tracking-wider">
            Status:
          </span>
          <button
            type="button"
            onClick={() => setActiveStatus("all")}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-bold transition-colors",
              activeStatus === "all"
                ? "bg-zinc-200 text-zinc-900"
                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
            )}
          >
            All ({items.length})
          </button>
          {(Object.keys(FEEDBACK_STATUSES) as FeedbackStatus[]).map((statusKey) => {
            const conf = FEEDBACK_STATUSES[statusKey];
            const count = items.filter((i) => i.status === statusKey).length;
            return (
              <button
                key={statusKey}
                type="button"
                onClick={() => setActiveStatus(statusKey)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                  activeStatus === statusKey
                    ? "bg-zinc-900 text-white font-bold"
                    : "text-zinc-600 hover:bg-zinc-100"
                )}
              >
                <span>{conf.label}</span>
                <span className="text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Feedback Items List ── */}
      <div className="mt-6 space-y-4">
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
            <Lightbulb className="mx-auto h-8 w-8 text-zinc-400" />
            <h3 className="mt-3 text-base font-bold text-zinc-900">No items match your filter</h3>
            <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto">
              Be the first to request this feature or report this bug to the NoCapBLR engineering team.
            </p>
            <button
              type="button"
              onClick={() => {
                setModalTitle(searchQuery);
                setIsModalOpen(true);
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Submit &ldquo;{searchQuery || "New Feedback"}&rdquo;</span>
            </button>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isVoted = votedIds.has(item.id);
            const statusConfig = FEEDBACK_STATUSES[item.status] || FEEDBACK_STATUSES.under_review;
            const categoryMeta =
              FEEDBACK_CATEGORIES.find((c) => c.id === item.category) || FEEDBACK_CATEGORIES[1];

            return (
              <article
                key={item.id}
                id={item.id}
                className="group flex flex-col sm:flex-row sm:items-start gap-4 rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-2xs hover:border-zinc-300 hover:shadow-xs transition-all"
              >
                {/* ── Upvote Button ── */}
                <button
                  type="button"
                  onClick={() => handleVote(item.id)}
                  aria-label={`Upvote ${item.title}`}
                  className={cn(
                    "flex sm:flex-col items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 sm:w-14 sm:py-2.5 transition-all active:scale-95 shrink-0",
                    isVoted
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
                      : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-400 hover:bg-white"
                  )}
                >
                  <ChevronUp
                    className={cn(
                      "h-4 w-4 transition-transform",
                      isVoted ? "stroke-[3]" : "stroke-[2.5] group-hover:-translate-y-0.5"
                    )}
                  />
                  <span className="text-xs font-black tracking-tight">{item.upvotesCount}</span>
                </button>

                {/* ── Content Body ── */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Category pill */}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
                        categoryMeta.color
                      )}
                    >
                      <span>{categoryMeta.icon}</span>
                      <span>{categoryMeta.label}</span>
                    </span>

                    {/* Status pill */}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold",
                        statusConfig.badgeClass
                      )}
                    >
                      <StatusIcon status={item.status} className="h-3 w-3" />
                      <span>{statusConfig.label}</span>
                    </span>

                    <span className="text-zinc-300">·</span>
                    <span className="text-[11px] text-zinc-400">
                      {formatRelativeDate(item.createdAt)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="mt-2 text-base font-bold text-zinc-950 leading-snug">
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="mt-1.5 text-xs sm:text-sm text-zinc-600 leading-relaxed whitespace-pre-line">
                    {item.description}
                  </p>

                  {/* Team/Admin Response Banner */}
                  {item.adminResponse && (
                    <div className="mt-3.5 rounded-xl border border-blue-200/80 bg-blue-50/50 p-3 text-xs leading-relaxed text-blue-950">
                      <div className="flex items-center gap-1.5 font-bold text-blue-900 mb-1">
                        <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                        <span>Team NoCapBLR Response</span>
                      </div>
                      <p className="text-blue-900/90">{item.adminResponse}</p>
                    </div>
                  )}

                  {/* Footer Meta */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3 text-[11px] text-zinc-400">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-600">{item.authorName}</span>
                      {item.deviceInfo && (
                        <>
                          <span>·</span>
                          <span className="text-zinc-400">{item.deviceInfo}</span>
                        </>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleShare(item.id)}
                      className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-800 transition-colors"
                      title="Copy link to feedback item"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Link copied!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="h-3 w-3" />
                          <span>Share link</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* ── Submission Modal ── */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
        >
          {/* Backdrop click to close */}
          <div onClick={() => setIsModalOpen(false)} className="absolute inset-0" />

          <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-7 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-zinc-950">Submit Feedback or Bug</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Directly reviewed by the NoCapBLR core development team.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {submitSuccess ? (
              <div className="py-10 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check className="h-6 w-6 stroke-[3]" />
                </div>
                <h3 className="mt-3 text-base font-bold text-zinc-950">Thank you for your feedback!</h3>
                <p className="mt-1 text-xs text-zinc-600">
                  Your submission is now live on the community board and queued for engineering review.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                {/* Category selector */}
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1.5">
                    What type of feedback is this?
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      { id: "feature", label: "Feature", icon: "🚀" },
                      { id: "bug", label: "Bug Report", icon: "🐛" },
                      { id: "improvement", label: "Improvement", icon: "⚡" },
                      { id: "other", label: "General", icon: "💬" },
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setModalCategory(c.id as FeedbackCategory)}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-xl border py-2.5 px-2 text-xs font-bold transition-all",
                          modalCategory === c.id
                            ? "border-zinc-950 bg-zinc-950 text-white shadow-xs"
                            : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-white"
                        )}
                      >
                        <span>{c.icon}</span>
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-zinc-700">
                      Short summary / title *
                    </label>
                    <span className="text-[10px] text-zinc-400">{modalTitle.length}/140</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={modalTitle}
                    onChange={(e) => setModalTitle(e.target.value)}
                    maxLength={140}
                    placeholder={
                      modalCategory === "bug"
                        ? "e.g. Map zoom flickers on mobile Firefox..."
                        : "e.g. Add late-night filter for food past 1 AM..."
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-500 shadow-2xs"
                  />
                </div>

                {/* Description */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-zinc-700">
                      Details &amp; context *
                    </label>
                    <span className="text-[10px] text-zinc-400">
                      {modalDescription.length}/2000
                    </span>
                  </div>
                  <textarea
                    required
                    rows={4}
                    value={modalDescription}
                    onChange={(e) => setModalDescription(e.target.value)}
                    maxLength={2000}
                    placeholder={
                      modalCategory === "bug"
                        ? "What happened? What were you doing when the bug occurred? Any steps to recreate it?"
                        : "Describe the feature in detail. How will this help you or other Bengaluru locals?"
                    }
                    className="mt-1 w-full rounded-xl border border-zinc-200 bg-white p-3 text-sm outline-none focus:border-zinc-500 shadow-2xs resize-y"
                  />
                </div>

                {/* Author Name & Email */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700">
                      Your Name / Handle
                    </label>
                    <input
                      type="text"
                      value={modalAuthorName}
                      onChange={(e) => setModalAuthorName(e.target.value)}
                      placeholder="Anonymous"
                      maxLength={50}
                      className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-500 shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-700">
                      Email (optional, for roadmap updates)
                    </label>
                    <input
                      type="email"
                      value={modalAuthorEmail}
                      onChange={(e) => setModalAuthorEmail(e.target.value)}
                      placeholder="you@email.com"
                      maxLength={120}
                      className="mt-1 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-500 shadow-2xs"
                    />
                  </div>
                </div>

                {submitError && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || modalTitle.trim().length < 3}
                    className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-5 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-50 transition-all shadow-xs"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{isSubmitting ? "Posting…" : "Post to Board"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status, className }: { status: FeedbackStatus; className?: string }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className={className} />;
    case "in_progress":
      return <Hammer className={className} />;
    case "planned":
      return <Calendar className={className} />;
    case "closed":
      return <X className={className} />;
    case "under_review":
    default:
      return <Clock className={className} />;
  }
}

function formatRelativeDate(isoDate: string) {
  try {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 30) return `${diffDays} days ago`;
    return new Date(isoDate).toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Recently";
  }
}
