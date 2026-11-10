import type { NocapPersonNote } from "./community";

export const INITIAL_PERSON_NOTES: NocapPersonNote[] = [
  {
    id: "person-mtr-1",
    placeId: "mtr-lalbagh",
    profile: {
      id: "seed-user-1",
      displayName: "Deepak R.",
      avatarUrl: null,
      bio: "Born and raised in South Bangalore. Filter coffee addict.",
    },
    personName: "Kumar Swamy (Master Coffee Pourer)",
    description:
      "Pours scalding hot filter coffee between steel davarah and tumbler from an arm's length without spilling a single drop. Has been keeping regulars energized here since 1996. Always remembers who prefers less sugar.",
    photoUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-22T08:30:00.000Z",
    updatedAt: "2026-10-22T08:30:00.000Z",
  },
  {
    id: "person-ctr-1",
    placeId: "ctr-malleshwaram",
    profile: {
      id: "seed-user-2",
      displayName: "Ananya S.",
      avatarUrl: null,
      bio: "Heritage walk enthusiast & Malleshwaram local.",
    },
    personName: "Sanath Anna (Benne Dosa Specialist)",
    description:
      "Commands the roaring cast-iron stove at the back. Can monitor 14 benne dosas at once while tossing dollops of white butter with laser precision. If you politely greet him in Kannada, your dosa comes extra golden-crisp.",
    photoUrl: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-23T09:15:00.000Z",
    updatedAt: "2026-10-23T09:15:00.000Z",
  },
  {
    id: "person-vb-1",
    placeId: "vidyarthi-bhavan",
    profile: {
      id: "seed-user-3",
      displayName: "Karthik Gowda",
      avatarUrl: null,
      bio: "Basavanagudi explorer.",
    },
    personName: "Anand (Senior Waiter & Dosa Juggler)",
    description:
      "Carries 16 to 18 plates of steaming hot crispy dosas stacked up his forearm maneuvering through crowded wooden booths with superhuman balance. An iconic legend of Gandhi Bazaar.",
    photoUrl: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-24T10:00:00.000Z",
    updatedAt: "2026-10-24T10:00:00.000Z",
  },
  {
    id: "person-church-1",
    placeId: "church-street",
    profile: {
      id: "seed-user-4",
      displayName: "Sneha Menon",
      avatarUrl: null,
      bio: "Books & indie cafes.",
    },
    personName: "Mayi Gowda (Blossom Book House Founder)",
    description:
      "Started selling used books off a pavement tarp in 2001 and built Church Street's favorite 3-floor book labyrinth. You can name any rare, out-of-print Indian novel and he will pinpoint its exact stack in under a minute.",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-25T11:45:00.000Z",
    updatedAt: "2026-10-25T11:45:00.000Z",
  },
  {
    id: "person-chinita-1",
    placeId: "chinita-koramangala",
    profile: {
      id: "seed-user-5",
      displayName: "Vikram N.",
      avatarUrl: null,
      bio: "Food writer & Koramangala native.",
    },
    personName: "Candida (Chef & Owner)",
    description:
      "Still inspects every batch of slow-roasted pork carnitas and fresh corn tortillas herself. Always steps out to the dining area with a radiant smile asking how you liked the roasted habanero salsa.",
    photoUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80",
    createdAt: "2026-10-26T19:20:00.000Z",
    updatedAt: "2026-10-26T19:20:00.000Z",
  },
];

// Runtime fallback store
export const memoryPersonNotesStore: NocapPersonNote[] = [];

export function getArchivedPersonNotes(placeId: string): NocapPersonNote[] {
  const all = [...memoryPersonNotesStore, ...INITIAL_PERSON_NOTES];
  return all.filter((note) => note.placeId === placeId);
}
