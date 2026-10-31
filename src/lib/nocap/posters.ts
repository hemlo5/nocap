export type PosterItem = {
  id: number;
  filename: string;
  src: string;
  headline: string;
  tagline: string;
  theme: "all" | "civic" | "work" | "campus" | "nightlife" | "safety";
  themeLabel: string;
  targetLocations: string[];
  description: string;
};

export const POSTERS_DATA: PosterItem[] = [
  {
    id: 1,
    filename: "1.png",
    src: "/posters/1.png",
    headline: "POTHOLES DEEPER THAN UR EX?",
    tagline: "Expose it on NoCapBLR.com",
    theme: "civic",
    themeLabel: "Civic & Infrastructure",
    targetLocations: ["Outer Ring Road", "Bellandur", "Sarjapur Road", "Marathahalli"],
    description:
      "Targeted Bengaluru's notorious bottleneck stretches and pothole-ridden junctions where daily commuters lose hours. Encouraged locals to drop uncensored civic notes on road conditions.",
  },
  {
    id: 2,
    filename: "2.png",
    src: "/posters/2.png",
    headline: "BOSS CHUTIYA HAI?",
    tagline: "Expose em on NoCapBLR.com",
    theme: "work",
    themeLabel: "Workplace & Startups",
    targetLocations: ["Manyata Tech Park", "Ecospace", "Bagmane Tech Park", "Indiranagar"],
    description:
      "Pasted across major IT corridors and tech park exits. Addressed corporate burnout, toxic managers, and the workplace culture silence in India's Silicon Valley.",
  },
  {
    id: 3,
    filename: "3.png",
    src: "/posters/3.png",
    headline: "MESS ROTI HARDER THAN DIH?",
    tagline: "Expose it on NoCapBLR.com",
    theme: "campus",
    themeLabel: "Hostel & Campus Life",
    targetLocations: ["Kothanur", "Mathikere", "Christ Campus", "KJC Campus"],
    description:
      "Spotted outside university hostels and student PG clusters where mess food quality is a daily struggle for thousands of outstation college students.",
  },
  {
    id: 4,
    filename: "4.png",
    src: "/posters/4.png",
    headline: "CAFE WAS SHIT AF?",
    tagline: "Expose it on NoCapBLR.com",
    theme: "campus",
    themeLabel: "Cafes & Dining",
    targetLocations: ["Indiranagar 100ft Rd", "Koramangala 4th Block", "Church Street", "Jayanagar"],
    description:
      "Called out overhyped social media aesthetic traps where trendy cafes charge steep prices for mediocre coffee and long queues, encouraging honest reviews before spending money.",
  },
  {
    id: 5,
    filename: "5.png",
    src: "/posters/5.png",
    headline: "TOXIC STARTUP OIL EM UP !",
    tagline: "Expose it on NoCapBLR.com",
    theme: "work",
    themeLabel: "Workplace & Startups",
    targetLocations: ["HSR Layout", "Koramangala", "Indiranagar Coworking Hubs"],
    description:
      "Targeted Bengaluru's hustle-porn culture and toxic startup environments. Pasted right near co-working spaces and founder hangouts to spark candid office takes.",
  },
  {
    id: 6,
    filename: "6.png",
    src: "/posters/6.png",
    headline: "WHICH PUB GOT HOT BADDIES ?",
    tagline: "Find it on NoCapBLR.com",
    theme: "nightlife",
    themeLabel: "Nightlife & Pubs",
    targetLocations: ["Church Street", "Brigade Road", "Indiranagar 12th Main", "Koramangala 80ft Rd"],
    description:
      "Tapped into weekend nightlife curiosity. Invited partygoers to check honest crowd vibes, actual playlists, and real atmospheres before paying hefty entry fees.",
  },
  {
    id: 7,
    filename: "7.png",
    src: "/posters/7.png",
    headline: "CLUB OR EPSTIEN ISLAND?",
    tagline: "Expose it on NoCapBLR.com",
    theme: "nightlife",
    themeLabel: "Nightlife & Club Safety",
    targetLocations: ["MG Road", "Residency Road", "Central Bengaluru Clubs"],
    description:
      "Provocative poster calling out shady restobars, aggressive bouncers, bill inflation, and predatory nightclub settings across central commercial districts.",
  },
  {
    id: 8,
    filename: "8.png",
    src: "/posters/8.png",
    headline: "MESS KA KHANA LAWDE NA BHOJYAM?",
    tagline: "Expose it on NoCapBLR.com",
    theme: "campus",
    themeLabel: "Hostel & PG Realities",
    targetLocations: ["Electronic City PGs", "BTM Layout", "Marathahalli Hostels"],
    description:
      "Unfiltered Hindi slang poster that college hostelites and PG residents in tech corridors circulated virally, giving voice to students dealing with substandard meals.",
  },
  {
    id: 9,
    filename: "9.png",
    src: "/posters/9.png",
    headline: "IS THIS AREA SAFE FOR WOMEN ?",
    tagline: "Find out on NoCapBLR.com",
    theme: "safety",
    themeLabel: "Neighborhood Safety",
    targetLocations: ["Koramangala", "Bellandur By-lanes", "Hennur Road", "Whitefield"],
    description:
      "Focused on late-night street lighting, poorly monitored alleys, and pedestrian walkability for women returning from late shifts or commutes across Bengaluru.",
  },
];
