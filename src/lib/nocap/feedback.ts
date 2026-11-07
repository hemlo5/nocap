export type FeedbackCategory = "feature" | "bug" | "improvement" | "other";

export type FeedbackStatus =
  | "under_review"
  | "planned"
  | "in_progress"
  | "completed"
  | "closed";

export type FeedbackItem = {
  id: string;
  title: string;
  description: string;
  category: FeedbackCategory;
  status: FeedbackStatus;
  upvotesCount: number;
  authorName: string;
  authorAvatar?: string | null;
  adminResponse?: string | null;
  deviceInfo?: string | null;
  createdAt: string;
  updatedAt: string;
};

export const FEEDBACK_CATEGORIES: Array<{
  id: FeedbackCategory | "all";
  label: string;
  icon: string;
  color: string;
}> = [
  { id: "all", label: "All Items", icon: "✨", color: "bg-zinc-100 text-zinc-900 border-zinc-200" },
  { id: "feature", label: "Feature Requests", icon: "🚀", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  { id: "bug", label: "Bug Reports", icon: "🐛", color: "bg-rose-50 text-rose-800 border-rose-200" },
  { id: "improvement", label: "Improvements", icon: "⚡", color: "bg-amber-50 text-amber-900 border-amber-200" },
  { id: "other", label: "General Feedback", icon: "💬", color: "bg-blue-50 text-blue-800 border-blue-200" },
];

export const FEEDBACK_STATUSES: Record<
  FeedbackStatus,
  { label: string; badgeClass: string; icon: string }
> = {
  under_review: {
    label: "Under Review",
    badgeClass: "bg-amber-50 text-amber-900 border-amber-200/80",
    icon: "clock",
  },
  planned: {
    label: "Planned",
    badgeClass: "bg-sky-50 text-sky-800 border-sky-200/80",
    icon: "calendar",
  },
  in_progress: {
    label: "In Progress",
    badgeClass: "bg-purple-50 text-purple-800 border-purple-200/80",
    icon: "hammer",
  },
  completed: {
    label: "Completed",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    icon: "check",
  },
  closed: {
    label: "Closed",
    badgeClass: "bg-zinc-100 text-zinc-600 border-zinc-200/80",
    icon: "x",
  },
};

export const INITIAL_FEEDBACK_ITEMS: FeedbackItem[] = [
  {
    id: "fb-01",
    title: "Add Dark Mode for night map exploration",
    description:
      "When exploring pubs in Indiranagar or checking late-night spots from a cab, the cream/white map background is quite bright. A sleek dark mode toggle for night browsing would be amazing.",
    category: "feature",
    status: "in_progress",
    upvotesCount: 47,
    authorName: "Karthik R.",
    authorAvatar: null,
    adminResponse: "Currently testing Carto dark-matter basemap styles with high-contrast amber place dots. Rolling out soon!",
    deviceInfo: "Android / Chrome",
    createdAt: "2026-10-28T14:30:00Z",
    updatedAt: "2026-11-04T10:15:00Z",
  },
  {
    id: "fb-02",
    title: "Filter cafes by Wi-Fi speed & charging plug points",
    description:
      "A lot of remote workers and founders in HSR and Koramangala go to cafes specifically to work. Adding quick filter tags for 'Has Charging Points' and 'Work-Friendly Wi-Fi' would save so much trial and error.",
    category: "feature",
    status: "planned",
    upvotesCount: 39,
    authorName: "Divya Sharma",
    authorAvatar: null,
    adminResponse: "Great suggestion. We are adding 'Work-Friendly' and 'Plug Points' as sub-filters in the next catalog update.",
    deviceInfo: "macOS / Safari",
    createdAt: "2026-10-29T09:12:00Z",
    updatedAt: "2026-11-02T16:20:00Z",
  },
  {
    id: "fb-03",
    title: "Add Namma Metro line and station overlays on the map",
    description:
      "It would be super helpful to see Purple and Green metro lines and station icons directly on the NoCapBLR map, so you instantly know if a spot is walkable from a metro station.",
    category: "feature",
    status: "under_review",
    upvotesCount: 34,
    authorName: "Sanjay N.",
    authorAvatar: null,
    adminResponse: null,
    deviceInfo: "Windows / Chrome",
    createdAt: "2026-10-30T18:45:00Z",
    updatedAt: "2026-10-30T18:45:00Z",
  },
  {
    id: "fb-04",
    title: "Filter places by late-night timings (open past 1 AM)",
    description:
      "Finding food after midnight in Bengaluru is always a headache between Empire, midnight dhabas, and 24/7 cafes. A toggle for 'Open Right Now' or 'Late Night' would be super useful.",
    category: "improvement",
    status: "planned",
    upvotesCount: 28,
    authorName: "Rohan V.",
    authorAvatar: null,
    adminResponse: "On the roadmap! Parsing verified operating hours for late-night food hubs across Indiranagar, Koramangala & Church St.",
    deviceInfo: "iOS / Safari",
    createdAt: "2026-10-31T21:10:00Z",
    updatedAt: "2026-11-05T08:00:00Z",
  },
  {
    id: "fb-05",
    title: "Bug: Search autocomplete dropdown covers clear button on small phones",
    description:
      "On smaller screens (iPhone SE), when typing in the search bar, the suggestions dropdown sometimes overlaps the clear 'X' button making it tricky to cancel the query.",
    category: "bug",
    status: "completed",
    upvotesCount: 22,
    authorName: "Priya M.",
    authorAvatar: null,
    adminResponse: "Fixed in the latest mobile floating search bar update! Clear button now remains accessible with click-outside dismissal.",
    deviceInfo: "iOS / Chrome",
    createdAt: "2026-10-27T11:00:00Z",
    updatedAt: "2026-10-28T09:30:00Z",
  },
  {
    id: "fb-06",
    title: "Add street lighting & night safety tags for walking routes",
    description:
      "As highlighted in the street campaign poster #9, women need to know if the lane leading to a cafe or PG has working streetlights and safe pedestrian footpaths after 9 PM.",
    category: "feature",
    status: "in_progress",
    upvotesCount: 36,
    authorName: "Ananya K.",
    authorAvatar: null,
    adminResponse: "Working on dedicated neighborhood safety prompts in the review form for lighting and pedestrian walkability.",
    deviceInfo: "Android / Chrome",
    createdAt: "2026-11-01T15:20:00Z",
    updatedAt: "2026-11-06T12:00:00Z",
  },
  {
    id: "fb-07",
    title: "Add crowd noise level indicators (Quiet study vs. Loud bustling)",
    description:
      "Some cafes look aesthetic online but blast techno music at 2 PM, while others are library-quiet. A simple vibe indicator for ambient sound level would help people choose the right vibe.",
    category: "improvement",
    status: "under_review",
    upvotesCount: 19,
    authorName: "Abhishek B.",
    authorAvatar: null,
    adminResponse: null,
    deviceInfo: "macOS / Chrome",
    createdAt: "2026-11-02T13:40:00Z",
    updatedAt: "2026-11-02T13:40:00Z",
  },
  {
    id: "fb-08",
    title: "Bug: GPS locate sometimes times out on slow mobile data connections",
    description:
      "When standing inside a crowded basement cafe or narrow lane with 2G/3G connectivity, pressing the locate button sometimes spins indefinitely without showing an error message.",
    category: "bug",
    status: "under_review",
    upvotesCount: 14,
    authorName: "Nikhil T.",
    authorAvatar: null,
    adminResponse: "Investigating a 6-second timeout with friendly retry toast instead of indefinite loading.",
    deviceInfo: "Android / Firefox",
    createdAt: "2026-11-03T17:15:00Z",
    updatedAt: "2026-11-05T14:10:00Z",
  },
];
