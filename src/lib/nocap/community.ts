export type NocapProfile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  googleAvatarUrl?: string | null;
};

export type NocapReview = {
  id: string;
  placeId: string;
  profile: NocapProfile;
  body: string;
  rating: number | null;
  latitude: number;
  longitude: number;
  isLegit: boolean;
  paymentId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NocapUserPlace = {
  id: string;
  profileId: string;
  profile: NocapProfile;
  name: string;
  category: import("./places").NocapPlaceCategory;
  address: string;
  latitude: number;
  longitude: number;
  createdAt: string;
};

export type NocapCommunityPayload = {
  places: import("./places").NocapPlace[];
  userPlaces: NocapUserPlace[];
  reviews: NocapReview[];
  supabaseConfigured: boolean;
};
