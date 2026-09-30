import type {
  Coordinates,
  LocationSearchResult,
  NormalizedJob,
} from "@/lib/types";
import { normalizeLocation } from "@/lib/location/normalize";
import { verifiedOfficeOverride } from "@/lib/services/office-overrides";
import { haversineKm } from "@/lib/utils/distance";
import { compact, normalizeKey } from "@/lib/utils/strings";

type CacheEntry = LocationSearchResult & {
  expiresAt: number;
};

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const DEFAULT_MAX_JOB_GEOCODES_PER_REQUEST = 20;

const geocodeCache = new Map<string, CacheEntry>();

const knownLocations: Record<string, LocationSearchResult> = {
  bengaluru: {
    label: "Bengaluru, Karnataka, India",
    lat: 12.9716,
    lng: 77.5946,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  bangalore: {
    label: "Bengaluru, Karnataka, India",
    lat: 12.9716,
    lng: 77.5946,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  koramangala: {
    label: "Koramangala, Bengaluru, Karnataka, India",
    lat: 12.9352,
    lng: 77.6245,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "hsr layout": {
    label: "HSR Layout, Bengaluru, Karnataka, India",
    lat: 12.9121,
    lng: 77.6446,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  indiranagar: {
    label: "Indiranagar, Bengaluru, Karnataka, India",
    lat: 12.9784,
    lng: 77.6408,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  whitefield: {
    label: "Whitefield, Bengaluru, Karnataka, India",
    lat: 12.9698,
    lng: 77.75,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "electronic city": {
    label: "Electronic City, Bengaluru, Karnataka, India",
    lat: 12.8452,
    lng: 77.6602,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  bellandur: {
    label: "Bellandur, Bengaluru, Karnataka, India",
    lat: 12.9304,
    lng: 77.6784,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  marathahalli: {
    label: "Marathahalli, Bengaluru, Karnataka, India",
    lat: 12.9569,
    lng: 77.7011,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  
  manyata: {
    label: "Manyata Embassy Business Park, Nagavara, Bengaluru, Karnataka, India",
    lat: 13.0498,
    lng: 77.6205,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "manyata embassy business park": {
    label: "Manyata Embassy Business Park, Nagavara, Bengaluru, Karnataka, India",
    lat: 13.0498,
    lng: 77.6205,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  nagavara: {
    label: "Nagavara, Manyata Tech Park Entrance, Bengaluru, Karnataka 560045, India",
    lat: 13.041,
    lng: 77.618,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  thanisandra: {
    label: "Thanisandra, Bengaluru, Karnataka 560077, India",
    lat: 13.054,
    lng: 77.632,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "thanisandra main road": {
    label: "Thanisandra Main Road, Manyata Tech Park Corridor, Bengaluru, Karnataka 560077, India",
    lat: 13.058,
    lng: 77.631,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  yelahanka: {
    label: "Yelahanka, Bengaluru, Karnataka 560064, India",
    lat: 13.1007,
    lng: 77.5963,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  jakkur: {
    label: "Jakkur, Bengaluru, Karnataka 560064, India",
    lat: 13.078,
    lng: 77.608,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "sahakar nagar": {
    label: "Sahakar Nagar, Bengaluru, Karnataka 560092, India",
    lat: 13.062,
    lng: 77.592,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  hennur: {
    label: "Hennur, Bengaluru, Karnataka 560043, India",
    lat: 13.038,
    lng: 77.644,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  devanahalli: {
    label: "Devanahalli, North Bengaluru, Karnataka, India",
    lat: 13.2484,
    lng: 77.7126,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  bagalur: {
    label: "Bagalur, North Bengaluru, Karnataka, India",
    lat: 13.1360,
    lng: 77.6680,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "aerospace park": {
    label: "KIADB Aerospace Park, Bagalur, North Bengaluru, Karnataka, India",
    lat: 13.1986,
    lng: 77.6845,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "kiadb aerospace park": {
    label: "KIADB Aerospace Park, Bagalur, North Bengaluru, Karnataka, India",
    lat: 13.1986,
    lng: 77.6845,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "bangalore north": {
    label: "Bangalore North Tech Corridor, Bengaluru, Karnataka, India",
    lat: 13.0498,
    lng: 77.6205,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "bengaluru north": {
    label: "Bengaluru North Tech Corridor, Bengaluru, Karnataka, India",
    lat: 13.0498,
    lng: 77.6205,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "manyata tech park": {
    label: "Manyata Tech Park, Bengaluru, Karnataka, India",
    lat: 13.0498,
    lng: 77.6205,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  hebbal: {
    label: "Hebbal, Bengaluru, Karnataka, India",
    lat: 13.0358,
    lng: 77.597,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  bannerghatta: {
    label: "Bannerghatta Road, Bengaluru, Karnataka, India",
    lat: 12.8984,
    lng: 77.5996,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "bannerghatta road": {
    label: "Bannerghatta Road, Bengaluru, Karnataka, India",
    lat: 12.8984,
    lng: 77.5996,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "ub city": {
    label: "UB City, Vittal Mallya Road, Bengaluru, Karnataka, India",
    lat: 12.9716,
    lng: 77.5956,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "lavelle road": {
    label: "Lavelle Road, Bengaluru, Karnataka, India",
    lat: 12.9719,
    lng: 77.5975,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "outer ring road": {
    label: "Outer Ring Road, Kadubeesanahalli, Bengaluru, Karnataka, India",
    lat: 12.9284,
    lng: 77.6845,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "ring road": {
    label: "Outer Ring Road, Kadubeesanahalli, Bengaluru, Karnataka, India",
    lat: 12.9284,
    lng: 77.6845,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  kadubeesanahalli: {
    label: "Kadubeesanahalli, Outer Ring Road, Bengaluru, Karnataka, India",
    lat: 12.9348,
    lng: 77.6917,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  devarabeesanahalli: {
    label: "Devarabeesanahalli, Outer Ring Road, Bengaluru, Karnataka, India",
    lat: 12.9268,
    lng: 77.6896,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  adugodi: {
    label: "Adugodi, Hosur Road, Bengaluru, Karnataka, India",
    lat: 12.9388,
    lng: 77.608,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "hosur road": {
    label: "Hosur Road, Bengaluru, Karnataka, India",
    lat: 12.9388,
    lng: 77.608,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  domlur: {
    label: "Domlur, Bengaluru, Karnataka, India",
    lat: 12.9567,
    lng: 77.6492,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  mumbai: {
    label: "Mumbai, Maharashtra, India",
    lat: 19.076,
    lng: 72.8777,
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
  },
  delhi: {
    label: "Delhi, India",
    lat: 28.6139,
    lng: 77.209,
    city: "Delhi",
    country: "India",
  },
  gurugram: {
    label: "Gurugram, Haryana, India",
    lat: 28.4595,
    lng: 77.0266,
    city: "Gurugram",
    state: "Haryana",
    country: "India",
  },
  gurgaon: {
    label: "Gurugram, Haryana, India",
    lat: 28.4595,
    lng: 77.0266,
    city: "Gurugram",
    state: "Haryana",
    country: "India",
  },
  hyderabad: {
    label: "Hyderabad, Telangana, India",
    lat: 17.385,
    lng: 78.4867,
    city: "Hyderabad",
    state: "Telangana",
    country: "India",
  },
  pune: {
    label: "Pune, Maharashtra, India",
    lat: 18.5204,
    lng: 73.8567,
    city: "Pune",
    state: "Maharashtra",
    country: "India",
  },
  chennai: {
    label: "Chennai, Tamil Nadu, India",
    lat: 13.0827,
    lng: 80.2707,
    city: "Chennai",
    state: "Tamil Nadu",
    country: "India",
  },
  // North & East Bengaluru
  kothanur: {
    label: "Kothanur, Hennur Main Road, Bengaluru, Karnataka 560077, India",
    lat: 13.0612,
    lng: 77.6521,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "kothanur hennur": {
    label: "Kothanur, Hennur Main Road, Bengaluru, Karnataka 560077, India",
    lat: 13.0612,
    lng: 77.6521,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "kothanur dinne": {
    label: "Kothanur Dinne, JP Nagar 8th Phase, Bengaluru, Karnataka 560078, India",
    lat: 12.8765,
    lng: 77.5855,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "hennur road": {
    label: "Hennur Main Road, Bengaluru, Karnataka 560077, India",
    lat: 13.048,
    lng: 77.648,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "yelahanka new town": {
    label: "Yelahanka New Town, Bengaluru, Karnataka 560064, India",
    lat: 13.104,
    lng: 77.575,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "kalyan nagar": {
    label: "Kalyan Nagar, HRBR Layout, Bengaluru, Karnataka 560043, India",
    lat: 13.022,
    lng: 77.648,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "hrbr layout": {
    label: "HRBR Layout, Kalyan Nagar, Bengaluru, Karnataka 560043, India",
    lat: 13.019,
    lng: 77.647,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  kammanahalli: {
    label: "Kammanahalli, Bengaluru, Karnataka 560084, India",
    lat: 13.009,
    lng: 77.637,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  banaswadi: {
    label: "Banaswadi, Bengaluru, Karnataka 560043, India",
    lat: 13.001,
    lng: 77.652,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "ramamurthy nagar": {
    label: "Ramamurthy Nagar, Bengaluru, Karnataka 560016, India",
    lat: 13.016,
    lng: 77.678,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  vidyaranyapura: {
    label: "Vidyaranyapura, Bengaluru, Karnataka 560097, India",
    lat: 13.081,
    lng: 77.558,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "rt nagar": {
    label: "RT Nagar (Rabindranath Tagore Nagar), Bengaluru, Karnataka 560032, India",
    lat: 13.018,
    lng: 77.593,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },

  // South Bengaluru & BTM / Sarjapur
  "btm layout": {
    label: "BTM Layout, Bengaluru, Karnataka 560068, India",
    lat: 12.9166,
    lng: 77.6101,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "btm 1st stage": {
    label: "BTM Layout 1st Stage, Bengaluru, Karnataka 560068, India",
    lat: 12.919,
    lng: 77.615,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "btm 2nd stage": {
    label: "BTM Layout 2nd Stage, Bengaluru, Karnataka 560076, India",
    lat: 12.914,
    lng: 77.608,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  madiwala: {
    label: "Madiwala, Bengaluru, Karnataka 560068, India",
    lat: 12.9226,
    lng: 77.6174,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "silk board": {
    label: "Central Silk Board Junction, Bengaluru, Karnataka 560068, India",
    lat: 12.9172,
    lng: 77.6228,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  tavarekere: {
    label: "Tavarekere, BTM Layout, Bengaluru, Karnataka 560029, India",
    lat: 12.926,
    lng: 77.612,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "sarjapur road": {
    label: "Sarjapur Road, Bengaluru, Karnataka 560035, India",
    lat: 12.908,
    lng: 77.674,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  sarjapur: {
    label: "Sarjapur, Bengaluru, Karnataka 562125, India",
    lat: 12.86,
    lng: 77.786,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  carmelaram: {
    label: "Carmelaram, Sarjapur Road, Bengaluru, Karnataka 560035, India",
    lat: 12.9085,
    lng: 77.705,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  kasavanahalli: {
    label: "Kasavanahalli, Sarjapur Road, Bengaluru, Karnataka 560035, India",
    lat: 12.901,
    lng: 77.679,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  kaikondrahalli: {
    label: "Kaikondrahalli, Sarjapur Road, Bengaluru, Karnataka 560035, India",
    lat: 12.912,
    lng: 77.675,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  haralur: {
    label: "Haralur Road, Bengaluru, Karnataka 560102, India",
    lat: 12.904,
    lng: 77.662,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  doddakannelli: {
    label: "Doddakannelli, Sarjapur Road, Bengaluru, Karnataka 560035, India",
    lat: 12.915,
    lng: 77.688,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },

  // Outer Ring Road & Tech Parks
  ecospace: {
    label: "RMZ Ecospace Business Park, Bellandur, Bengaluru, Karnataka 560103, India",
    lat: 12.926,
    lng: 77.684,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "rmz ecospace": {
    label: "RMZ Ecospace, Outer Ring Road, Bellandur, Bengaluru, Karnataka 560103, India",
    lat: 12.926,
    lng: 77.684,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "rmz ecoworld": {
    label: "RMZ Ecoworld, Outer Ring Road, Bellandur, Bengaluru, Karnataka 560103, India",
    lat: 12.923,
    lng: 77.687,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  ecoworld: {
    label: "RMZ Ecoworld, Bellandur, Bengaluru, Karnataka 560103, India",
    lat: 12.923,
    lng: 77.687,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "embassy tech village": {
    label: "Embassy TechVillage, Outer Ring Road, Devarabisanahalli, Bengaluru, Karnataka 560103, India",
    lat: 12.928,
    lng: 77.692,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "embassy techvillage": {
    label: "Embassy TechVillage, Outer Ring Road, Bengaluru, Karnataka 560103, India",
    lat: 12.928,
    lng: 77.692,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "prestige tech park": {
    label: "Prestige Tech Park, Marathahalli-Sarjapur ORR, Kadubeesanahalli, Bengaluru, Karnataka 560103, India",
    lat: 12.939,
    lng: 77.696,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "cessna business park": {
    label: "Cessna Business Park, Kadubeesanahalli, Bengaluru, Karnataka 560087, India",
    lat: 12.936,
    lng: 77.693,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  cessna: {
    label: "Cessna Business Park, Outer Ring Road, Bengaluru, Karnataka 560087, India",
    lat: 12.936,
    lng: 77.693,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  panathur: {
    label: "Panathur, Outer Ring Road, Bengaluru, Karnataka 560087, India",
    lat: 12.933,
    lng: 77.705,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "green glen layout": {
    label: "Green Glen Layout, Bellandur, Bengaluru, Karnataka 560103, India",
    lat: 12.929,
    lng: 77.674,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },

  // Whitefield & East Corridor
  itpl: {
    label: "ITPL (International Tech Park Bangalore), Whitefield, Bengaluru, Karnataka 560066, India",
    lat: 12.986,
    lng: 77.738,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "international tech park": {
    label: "ITPL, Whitefield, Bengaluru, Karnataka 560066, India",
    lat: 12.986,
    lng: 77.738,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  hoodi: {
    label: "Hoodi, Whitefield, Bengaluru, Karnataka 560048, India",
    lat: 12.9918,
    lng: 77.716,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  brookefield: {
    label: "Brookefield, Bengaluru, Karnataka 560037, India",
    lat: 12.965,
    lng: 77.718,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  kundalahalli: {
    label: "Kundalahalli, Whitefield, Bengaluru, Karnataka 560037, India",
    lat: 12.966,
    lng: 77.712,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  mahadevapura: {
    label: "Mahadevapura, Outer Ring Road, Bengaluru, Karnataka 560048, India",
    lat: 12.993,
    lng: 77.697,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "kr puram": {
    label: "KR Puram (Krishnarajapuram), Bengaluru, Karnataka 560036, India",
    lat: 13.007,
    lng: 77.696,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  kadugodi: {
    label: "Kadugodi, Whitefield, Bengaluru, Karnataka 560067, India",
    lat: 12.998,
    lng: 77.761,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "hope farm": {
    label: "Hope Farm Junction, Whitefield, Bengaluru, Karnataka 560066, India",
    lat: 12.984,
    lng: 77.752,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  varthur: {
    label: "Varthur, Whitefield, Bengaluru, Karnataka 560087, India",
    lat: 12.94,
    lng: 77.747,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "bagmane tech park": {
    label: "Bagmane Tech Park, CV Raman Nagar, Bengaluru, Karnataka 560093, India",
    lat: 12.979,
    lng: 77.658,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "bagmane constellation": {
    label: "Bagmane Constellation Business Park, Mahadevapura, Bengaluru, Karnataka 560048, India",
    lat: 12.99,
    lng: 77.699,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "cv raman nagar": {
    label: "CV Raman Nagar, Bengaluru, Karnataka 560093, India",
    lat: 12.985,
    lng: 77.663,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "kasturi nagar": {
    label: "Kasturi Nagar, Outer Ring Road, Bengaluru, Karnataka 560043, India",
    lat: 13.001,
    lng: 77.662,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  baiyappanahalli: {
    label: "Baiyappanahalli, Bengaluru, Karnataka 560038, India",
    lat: 12.991,
    lng: 77.652,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },

  // JP Nagar & Jayanagar & South-West
  "jp nagar": {
    label: "JP Nagar, Bengaluru, Karnataka 560078, India",
    lat: 12.9063,
    lng: 77.5857,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "jp nagar 1st phase": {
    label: "JP Nagar 1st Phase, Bengaluru, Karnataka 560078, India",
    lat: 12.913,
    lng: 77.589,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "jp nagar 2nd phase": {
    label: "JP Nagar 2nd Phase, Bengaluru, Karnataka 560078, India",
    lat: 12.909,
    lng: 77.588,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "jp nagar 3rd phase": {
    label: "JP Nagar 3rd Phase, Bengaluru, Karnataka 560078, India",
    lat: 12.907,
    lng: 77.594,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "jp nagar 4th phase": {
    label: "JP Nagar 4th Phase, Bengaluru, Karnataka 560078, India",
    lat: 12.903,
    lng: 77.599,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "jp nagar 5th phase": {
    label: "JP Nagar 5th Phase, Bengaluru, Karnataka 560078, India",
    lat: 12.9,
    lng: 77.592,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "jp nagar 6th phase": {
    label: "JP Nagar 6th Phase, Bengaluru, Karnataka 560078, India",
    lat: 12.898,
    lng: 77.583,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "jp nagar 7th phase": {
    label: "JP Nagar 7th Phase, Bengaluru, Karnataka 560078, India",
    lat: 12.889,
    lng: 77.58,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "jp nagar 8th phase": {
    label: "JP Nagar 8th Phase (Kothanur Dinne), Bengaluru, Karnataka 560078, India",
    lat: 12.8765,
    lng: 77.5855,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  jayanagar: {
    label: "Jayanagar, Bengaluru, Karnataka 560011, India",
    lat: 12.9308,
    lng: 77.5838,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "jayanagar 4th block": {
    label: "Jayanagar 4th Block, Bengaluru, Karnataka 560011, India",
    lat: 12.928,
    lng: 77.582,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  banashankari: {
    label: "Banashankari, Bengaluru, Karnataka 560070, India",
    lat: 12.9255,
    lng: 77.5468,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  padmanabhanagar: {
    label: "Padmanabhanagar, Bengaluru, Karnataka 560070, India",
    lat: 12.918,
    lng: 77.558,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "kumaraswamy layout": {
    label: "Kumaraswamy Layout, Bengaluru, Karnataka 560078, India",
    lat: 12.907,
    lng: 77.561,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  uttarahalli: {
    label: "Uttarahalli, Bengaluru, Karnataka 560061, India",
    lat: 12.905,
    lng: 77.538,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  basavanagudi: {
    label: "Basavanagudi, Bengaluru, Karnataka 560004, India",
    lat: 12.9416,
    lng: 77.5753,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  girinagar: {
    label: "Girinagar, Bengaluru, Karnataka 560085, India",
    lat: 12.939,
    lng: 77.539,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  arekere: {
    label: "Arekere, Bannerghatta Road, Bengaluru, Karnataka 560076, India",
    lat: 12.889,
    lng: 77.597,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  hulimavu: {
    label: "Hulimavu, Bannerghatta Road, Bengaluru, Karnataka 560076, India",
    lat: 12.879,
    lng: 77.598,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  gottigere: {
    label: "Gottigere, Bannerghatta Road, Bengaluru, Karnataka 560083, India",
    lat: 12.858,
    lng: 77.586,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  begur: {
    label: "Begur, Bengaluru, Karnataka 560068, India",
    lat: 12.878,
    lng: 77.625,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "kudlu gate": {
    label: "Kudlu Gate, Hosur Road, Bengaluru, Karnataka 560068, India",
    lat: 12.889,
    lng: 77.644,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  singasandra: {
    label: "Singasandra, Hosur Road, Bengaluru, Karnataka 560068, India",
    lat: 12.88,
    lng: 77.648,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "hosa road": {
    label: "Hosa Road, Electronic City, Bengaluru, Karnataka 560100, India",
    lat: 12.871,
    lng: 77.652,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "electronic city phase 1": {
    label: "Electronic City Phase 1, Bengaluru, Karnataka 560100, India",
    lat: 12.8452,
    lng: 77.6602,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "electronic city phase 2": {
    label: "Electronic City Phase 2, Bengaluru, Karnataka 560100, India",
    lat: 12.848,
    lng: 77.682,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  bommasandra: {
    label: "Bommasandra Industrial Area, Bengaluru, Karnataka 560099, India",
    lat: 12.818,
    lng: 77.687,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "global village": {
    label: "Global Village Tech Park, Rajarajeshwari Nagar, Bengaluru, Karnataka 560059, India",
    lat: 12.924,
    lng: 77.502,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "global village tech park": {
    label: "Global Village Tech Park, RR Nagar, Bengaluru, Karnataka 560059, India",
    lat: 12.924,
    lng: 77.502,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "rajarajeshwari nagar": {
    label: "Rajarajeshwari Nagar (RR Nagar), Bengaluru, Karnataka 560098, India",
    lat: 12.926,
    lng: 77.518,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "rr nagar": {
    label: "Rajarajeshwari Nagar, Bengaluru, Karnataka 560098, India",
    lat: 12.926,
    lng: 77.518,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },

  // West & North-West
  rajajinagar: {
    label: "Rajajinagar, Bengaluru, Karnataka 560010, India",
    lat: 12.9982,
    lng: 77.553,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  malleshwaram: {
    label: "Malleshwaram, Bengaluru, Karnataka 560003, India",
    lat: 13.0031,
    lng: 77.5703,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  malleswaram: {
    label: "Malleshwaram, Bengaluru, Karnataka 560003, India",
    lat: 13.0031,
    lng: 77.5703,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  yeshwanthpur: {
    label: "Yeshwanthpur, Bengaluru, Karnataka 560022, India",
    lat: 13.028,
    lng: 77.541,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  peenya: {
    label: "Peenya Industrial Area, Bengaluru, Karnataka 560058, India",
    lat: 13.0285,
    lng: 77.5195,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "peenya industrial area": {
    label: "Peenya Industrial Area, Bengaluru, Karnataka 560058, India",
    lat: 13.0285,
    lng: 77.5195,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  mathikere: {
    label: "Mathikere, Bengaluru, Karnataka 560054, India",
    lat: 13.0334,
    lng: 77.5594,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  vijayanagar: {
    label: "Vijayanagar, Bengaluru, Karnataka 560040, India",
    lat: 12.9715,
    lng: 77.5312,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  basaveshwaranagar: {
    label: "Basaveshwaranagar, Bengaluru, Karnataka 560079, India",
    lat: 12.988,
    lng: 77.538,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },

  // Central & CBD
  "mg road": {
    label: "MG Road, Bengaluru, Karnataka 560001, India",
    lat: 12.975,
    lng: 77.608,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "brigade road": {
    label: "Brigade Road, Bengaluru, Karnataka 560001, India",
    lat: 12.973,
    lng: 77.607,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "church street": {
    label: "Church Street, Bengaluru, Karnataka 560001, India",
    lat: 12.9745,
    lng: 77.606,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "richmond town": {
    label: "Richmond Town, Bengaluru, Karnataka 560025, India",
    lat: 12.963,
    lng: 77.601,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "shanthi nagar": {
    label: "Shanthi Nagar, Bengaluru, Karnataka 560027, India",
    lat: 12.956,
    lng: 77.595,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  ulsoor: {
    label: "Ulsoor (Halasuru), Bengaluru, Karnataka 560008, India",
    lat: 12.9817,
    lng: 77.6285,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  halasuru: {
    label: "Halasuru, Bengaluru, Karnataka 560008, India",
    lat: 12.9817,
    lng: 77.6285,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "frazer town": {
    label: "Frazer Town, Bengaluru, Karnataka 560005, India",
    lat: 12.998,
    lng: 77.614,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "cox town": {
    label: "Cox Town, Bengaluru, Karnataka 560005, India",
    lat: 12.994,
    lng: 77.622,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "benson town": {
    label: "Benson Town, Bengaluru, Karnataka 560046, India",
    lat: 13.003,
    lng: 77.602,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "old airport road": {
    label: "Old Airport Road, Kodihalli, Bengaluru, Karnataka 560008, India",
    lat: 12.961,
    lng: 77.655,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  hal: {
    label: "HAL Old Airport Road, Bengaluru, Karnataka 560017, India",
    lat: 12.958,
    lng: 77.666,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  egl: {
    label: "Embassy Golf Links (EGL), Domlur, Bengaluru, Karnataka 560071, India",
    lat: 12.955,
    lng: 77.648,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  "embassy golf links": {
    label: "Embassy Golf Links Business Park, Domlur, Bengaluru, Karnataka 560071, India",
    lat: 12.955,
    lng: 77.648,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
  majestic: {
    label: "Majestic (Kempegowda Bus Station), Bengaluru, Karnataka 560009, India",
    lat: 12.9767,
    lng: 77.5713,
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
  },
};

export function isRemoteLocation(text: string): boolean {
  return /\b(remote|work from home|wfh|distributed)\b/i.test(text);
}

type SearchLocationOptions = {
  useKnownLocations?: boolean;
};

type GeocodeTarget = {
  location: string;
  companyName?: string;
};

export function matchKnownLocations(
  query: string,
  maxResults = 7,
): LocationSearchResult[] {
  const q = normalizeLocationQuery(query).toLowerCase().trim();
  if (!q) return [];

  const pinMatch = q.match(/\b56\d{4}\b/);
  const targetPin = pinMatch ? pinMatch[0] : null;

  type Scored = { item: LocationSearchResult; score: number };
  const matches: Scored[] = [];
  const seen = new Set<string>();

  for (const [key, loc] of Object.entries(knownLocations)) {
    const locKey = key.toLowerCase();
    const locLabel = loc.label.toLowerCase();
    let score = -1;

    if (targetPin && locLabel.includes(targetPin)) {
      score = 100;
    } else if (locKey === q) {
      score = 90;
    } else if (locKey.startsWith(q)) {
      score = 80;
    } else if (locKey.split(/\s+/).some((word) => word.startsWith(q))) {
      score = 70;
    } else if (locKey.includes(q)) {
      score = 60;
    } else if (locLabel.includes(q)) {
      score = 50;
    }

    if (score > 0) {
      const coordKey = `${loc.lat.toFixed(3)},${loc.lng.toFixed(3)}`;
      if (!seen.has(coordKey)) {
        seen.add(coordKey);
        matches.push({ item: loc, score });
      }
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, maxResults).map((m) => m.item);
}

export async function searchLocations(
  query: string,
  options: SearchLocationOptions = {},
): Promise<LocationSearchResult[]> {
  const normalized = normalizeLocationQuery(query);
  if (!normalized) {
    return [];
  }

  const useKnownLocations = options.useKnownLocations ?? true;
  if (useKnownLocations) {
    const matched = matchKnownLocations(normalized, 7);
    if (matched.length > 0) {
      return matched;
    }
  }

  const cached = getCached(normalized);
  if (cached) {
    return [cached];
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  const searchQuery =
    normalized.includes("bengaluru") ||
    normalized.includes("bangalore") ||
    normalized.includes("india")
      ? normalized
      : `${normalized}, Bengaluru, Karnataka, India`;

  url.searchParams.set("q", searchQuery);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "in");
  url.searchParams.set("viewbox", "77.30,13.25,77.85,12.75");
  url.searchParams.set("bounded", "0");
  url.searchParams.set("limit", "5");

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": nominatimUserAgent(),
      },
      next: { revalidate: 60 * 60 * 24 },
    });

    if (!response.ok) {
      throw new Error(`Nominatim returned ${response.status}`);
    }

    const payload = (await response.json()) as Array<{
      display_name: string;
      lat: string;
      lon: string;
      address?: {
        city?: string;
        town?: string;
        village?: string;
        suburb?: string;
        state?: string;
        country?: string;
      };
    }>;

    const results = payload
      .map((item) => ({
        label: item.display_name,
        lat: Number.parseFloat(item.lat),
        lng: Number.parseFloat(item.lon),
        city:
          item.address?.city ??
          item.address?.town ??
          item.address?.village ??
          item.address?.suburb ??
          null,
        state: item.address?.state ?? null,
        country: item.address?.country ?? null,
      }))
      .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));

    const first = results[0];
    if (first) {
      setCached(normalized, first);
    }

    return results;
  } catch {
    return [];
  }
}

export async function attachBestCoordinates(
  jobs: NormalizedJob[],
  userLocation: Coordinates,
): Promise<NormalizedJob[]> {
  const geocodeTargets = new Map<string, GeocodeTarget>();
  for (const job of jobs) {
    if (hasCoordinates(job)) {
      continue;
    }
    for (const candidate of officeLocationCandidates(job)) {
      if (isPinLocationCandidate(candidate)) {
        geocodeTargets.set(candidate, { location: candidate });
      }
    }
    for (const candidate of companyOfficeLocationCandidates(job)) {
      geocodeTargets.set(candidate, {
        location: candidate,
        companyName: job.companyName,
      });
    }
  }

  const geocoded = new Map<string, LocationSearchResult>();
  const geocodeRequests: GeocodeTarget[] = [];

  for (const target of geocodeTargets.values()) {
    if (!target.companyName) {
      const known = lookupKnownLocation(
        normalizeLocationQuery(target.location),
      );
      if (known) {
        geocoded.set(target.location, known);
        continue;
      }
    }

    if (geocodeRequests.length < maxJobGeocodesPerRequest()) {
      geocodeRequests.push(target);
    }
  }

  const geocodeResults = await mapWithConcurrency(
    geocodeRequests,
    maxConcurrentGeocodes(),
    async (target) => {
      try {
        const [result] = await searchLocations(target.location, {
          useKnownLocations: !target.companyName,
        });
        if (!result) {
          return null;
        }
        if (
          target.companyName &&
          !isCompanySpecificResult(result, target.companyName)
        ) {
          return null;
        }
        return { location: target.location, result };
      } catch {
        return null;
      }
    },
  );

  for (const match of geocodeResults) {
    if (match) {
      geocoded.set(match.location, match.result);
    }
  }

  return jobs.flatMap((job): NormalizedJob[] => {
    if (hasCoordinates(job)) {
      // Even if the job already has ATS-supplied coordinates, check for a verified office
      // override first. ATS coords for the same company can differ by meters between jobs,
      // creating multiple near-duplicate dots that "move apart" on zoom.
      // Verified override → one canonical pin per company, forever stable.
      const officeOverride = verifiedOfficeOverride(job);
      if (officeOverride) {
        return [
          {
            ...job,
            latitude: officeOverride.lat,
            longitude: officeOverride.lng,
            distanceKm: haversineKm(userLocation, officeOverride),
            locationType: job.locationType ?? locationTypeForJob(job),
            locationConfidence: "exact_office",
            remoteEligible: job.remoteEligible ?? job.workMode === "remote",
            city: job.city ?? officeOverride.city ?? null,
            state: job.state ?? officeOverride.state ?? null,
            country: job.country ?? officeOverride.country ?? null,
          },
        ];
      }
      // No verified override → use ATS coords but stamp city_level so it won't appear as a map dot.
      return [
        {
          ...job,
          distanceKm: haversineKm(userLocation, {
            lat: job.latitude,
            lng: job.longitude,
          }),
          locationType: job.locationType ?? locationTypeForJob(job),
          locationConfidence: "city_level",
          remoteEligible: job.remoteEligible ?? job.workMode === "remote",
        },
      ];
    }

    if (job.workMode === "remote" || isRemoteLocation(job.locationText)) {
      const bestRemoteOffice = bestPinLocationMatch(
        job,
        geocoded,
        userLocation,
      );
      if (bestRemoteOffice) {
        // Only use exact_office if this job's company has a verified override.
        // Nominatim/knownLocation results are city_level → won't appear as map dots.
        const isVerifiedOverride = Boolean(verifiedOfficeOverride(job));
        return [
          {
            ...job,
            workMode: "remote" as const,
            latitude: bestRemoteOffice.lat,
            longitude: bestRemoteOffice.lng,
            distanceKm: bestRemoteOffice.distanceKm,
            locationType: "remote",
            locationConfidence: isVerifiedOverride
              ? "exact_office"
              : "city_level",
            remoteEligible: true,
            city: job.city ?? bestRemoteOffice.city ?? null,
            state: job.state ?? bestRemoteOffice.state ?? null,
            country: job.country ?? bestRemoteOffice.country ?? null,
          },
        ];
      }

      if (!remoteMatchesUserRegion(job.locationText, userLocation)) {
        return [];
      }

      return [
        {
          ...job,
          workMode: "remote" as const,
          latitude: undefined,
          longitude: undefined,
          distanceKm: null,
          locationType: "remote",
          locationConfidence: "remote",
          remoteEligible: true,
        },
      ];
    }

    const best = bestPinLocationMatch(job, geocoded, userLocation);
    if (!best) {
      const approximate = bestApproximateLocationMatch(job, userLocation);
      if (!approximate) {
        return [];
      }

      return [
        {
          ...job,
          latitude: undefined,
          longitude: undefined,
          distanceKm: approximate.distanceKm,
          locationType: locationTypeForJob(job),
          locationConfidence: "city_level",
          remoteEligible: job.remoteEligible ?? false,
          city: job.city ?? approximate.city ?? null,
          state: job.state ?? approximate.state ?? null,
          country: job.country ?? approximate.country ?? null,
        },
      ];
    }

    // If verified office override exists, or if the job specifies a concrete Bengaluru area/neighborhood
    // (e.g. Koramangala, HSR Layout, Whitefield, Bannerghatta, UB City, Bellandur, Ring Road)
    // mark as exact_office so it is pinned stably to that tech hub on the map.
    const isVerified = Boolean(verifiedOfficeOverride(job));
    const locLower = normalizeKey(job.locationText);
    const hasSpecificArea = /\b(koramangala|hsr|indiranagar|whitefield|bellandur|electronic city|bannerghatta|ub city|lavelle|marathahalli|manyata|hebbal|ring road|outer ring road|kadubeesanahalli|adugodi|hosur road)\b/.test(locLower);

    const confidence = isVerified || hasSpecificArea ? "exact_office" : "city_level";

    return [
      {
        ...job,
        latitude: best.lat,
        longitude: best.lng,
        distanceKm: best.distanceKm,
        locationType: locationTypeForJob(job),
        locationConfidence: confidence,
        remoteEligible: job.remoteEligible ?? false,
        city: job.city ?? best.city ?? null,
        state: job.state ?? best.state ?? null,
        country: job.country ?? best.country ?? null,
      },
    ];
  });
}

function locationTypeForJob(
  job: NormalizedJob,
): NonNullable<NormalizedJob["locationType"]> {
  if (job.workMode === "remote" || isRemoteLocation(job.locationText)) {
    return "remote";
  }
  if (job.workMode === "hybrid") {
    return "hybrid";
  }
  if (job.workMode === "onsite") {
    return "physical";
  }
  return "unknown";
}

function hasCoordinates(
  job: NormalizedJob,
): job is NormalizedJob & { latitude: number; longitude: number } {
  return typeof job.latitude === "number" && typeof job.longitude === "number";
}

function officeLocationCandidates(job: NormalizedJob): string[] {
  return job.locationCandidates
    .map(cleanOfficeLocation)
    .filter((candidate) => candidate && !isRemoteOnlyLocation(candidate))
    .filter((candidate): candidate is string => Boolean(candidate));
}

function companyOfficeLocationCandidates(job: NormalizedJob): string[] {
  const company = compact(job.companyName);
  if (!company) {
    return [];
  }

  return officeLocationCandidates(job)
    .filter(isCityLevelLocationCandidate)
    .map((candidate) => `${company} ${candidate}`);
}

function cleanOfficeLocation(location: string): string {
  return compact(location)
    .replace(/^remote\s*[-,:]?\s*/i, "")
    .replace(/^hybrid\s*[-,:]?\s*/i, "")
    .replace(/^on[-\s]?site\s*[-,:]?\s*/i, "")
    .replace(/^office\s*[-,:]?\s*/i, "")
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isCityLevelLocationCandidate(location: string): boolean {
  const normalized = normalizeLocationQuery(location);
  if (
    !normalized ||
    /^(india|united states|usa|us|canada|europe|apac|asia|emea|uk|gb)$/.test(
      normalized,
    )
  ) {
    return false;
  }
  return Boolean(lookupKnownLocation(normalized));
}

function isRemoteOnlyLocation(location: string): boolean {
  const normalized = normalizeLocationQuery(location);
  return (
    !normalized ||
    normalized === "remote" ||
    normalized === "global" ||
    normalized === "globally" ||
    normalized === "worldwide" ||
    normalized === "anywhere" ||
    normalized === "distributed"
  );
}

function isPinLocationCandidate(location: string): boolean {
  const normalized = normalizeLocationQuery(location);
  if (!normalized) {
    return false;
  }

  if (
    /^(india|united states|usa|us|canada|europe|apac|asia|emea|uk|gb)$/.test(
      normalized,
    )
  ) {
    return false;
  }

  if (knownLocations[normalized]) {
    return isOfficeLikeLocation(normalized);
  }

  const cityOnly = Object.entries(knownLocations).some(
    ([key, location]) =>
      normalized === `${key} india` ||
      normalized === `${key} ${normalizeKey(location.state ?? "")} india` ||
      normalized ===
        `${normalizeKey(location.city ?? key)} ${normalizeKey(location.state ?? "")} india`,
  );
  if (cityOnly) {
    return false;
  }

  return isOfficeLikeLocation(normalized);
}

function isOfficeLikeLocation(normalized: string): boolean {
  return /\b(\d+|road|rd|street|st|avenue|ave|lane|floor|flr|tower|building|block|wing|sez|tech park|business park|campus|plaza|centre|center|sector|phase|layout|industrial area|estate|park)\b/.test(
    normalized,
  );
}

function bestPinLocationMatch(
  job: NormalizedJob,
  geocoded: Map<string, LocationSearchResult>,
  userLocation: Coordinates,
): (LocationSearchResult & { distanceKm: number }) | null {
  const officeOverride = verifiedOfficeOverride(job);
  if (officeOverride) {
    return {
      ...officeOverride,
      distanceKm: haversineKm(userLocation, officeOverride),
    };
  }

  const candidates = officeLocationCandidates(job)
    .filter(isPinLocationCandidate)
    .map((candidate) => {
      const direct = geocoded.get(candidate);
      const known = lookupKnownLocation(normalizeLocationQuery(candidate));
      return direct ?? known ?? null;
    })
    .filter((candidate): candidate is LocationSearchResult =>
      Boolean(candidate),
    );

  for (const candidate of companyOfficeLocationCandidates(job)) {
    const result = geocoded.get(candidate);
    if (result) {
      candidates.push(result);
    }
  }

  return (
    candidates
      .map((candidate) => ({
        ...candidate,
        distanceKm: haversineKm(userLocation, candidate),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)[0] ?? null
  );
}

function isCompanySpecificResult(
  result: LocationSearchResult,
  companyName: string,
): boolean {
  const label = normalizeKey(result.label);
  const companyTokens = normalizeKey(companyName)
    .split(" ")
    .filter((token) => token.length >= 3)
    .filter(
      (token) =>
        ![
          "inc",
          "ltd",
          "llc",
          "technologies",
          "technology",
          "solutions",
          "labs",
          "india",
          "global",
        ].includes(token),
    );

  return companyTokens.some((token) => label.includes(token));
}

function bestApproximateLocationMatch(
  job: NormalizedJob,
  userLocation: Coordinates,
): (LocationSearchResult & { distanceKm: number }) | null {
  const candidates = officeLocationCandidates(job)
    .map((candidate) => lookupKnownLocation(normalizeLocationQuery(candidate)))
    .filter((candidate): candidate is LocationSearchResult =>
      Boolean(candidate),
    );

  return (
    candidates
      .map((candidate) => ({
        ...candidate,
        distanceKm: haversineKm(userLocation, candidate),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)[0] ?? null
  );
}

function lookupKnownLocation(query: string): LocationSearchResult | null {
  if (!query) {
    return null;
  }

  const direct = knownLocations[query];
  if (direct) {
    return direct;
  }

  const normalized = normalizeLocation(query);
  if (normalized.area) {
    const area = knownLocations[normalizeKey(normalized.area)];
    if (area) {
      return area;
    }
  }

  for (const [key, location] of Object.entries(knownLocations)) {
    if (query.includes(key)) {
      return location;
    }
  }

  return null;
}

function remoteMatchesUserRegion(
  text: string,
  userLocation: Coordinates,
): boolean {
  const normalized = normalizeLocationQuery(text);

  if (
    /\b(global|globally|worldwide|anywhere|distributed|apac|asia)\b/.test(
      normalized,
    )
  ) {
    return true;
  }

  if (isWithinIndia(userLocation)) {
    return /\b(india|bharat|in)\b/.test(normalized);
  }

  if (isWithinUnitedStates(userLocation)) {
    return /\b(us|usa|united states|america|north america|amer)\b/.test(
      normalized,
    );
  }

  return false;
}

function isWithinIndia({ lat, lng }: Coordinates): boolean {
  return lat >= 6 && lat <= 38 && lng >= 68 && lng <= 98;
}

function isWithinUnitedStates({ lat, lng }: Coordinates): boolean {
  return lat >= 18 && lat <= 72 && lng >= -172 && lng <= -66;
}

function normalizeLocationQuery(query: string): string {
  return normalizeKey(
    compact(query)
      .replace(/^hybrid in /i, "")
      .replace(/^office,\s*/i, "")
      .replace(/^in-/i, "")
      .replace(/^remote[-,\s]*/i, "remote "),
  );
}

function getCached(key: string): LocationSearchResult | null {
  const cached = geocodeCache.get(key);
  if (!cached || cached.expiresAt < Date.now()) {
    geocodeCache.delete(key);
    return null;
  }
  return cached;
}

function setCached(key: string, value: LocationSearchResult): void {
  geocodeCache.set(key, { ...value, expiresAt: Date.now() + CACHE_TTL_MS });
}

function maxJobGeocodesPerRequest(): number {
  const parsed = Number.parseInt(
    process.env.NEARHIRE_MAX_JOB_GEOCODES_PER_REQUEST ?? "",
    10,
  );

  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : DEFAULT_MAX_JOB_GEOCODES_PER_REQUEST;
}

function maxConcurrentGeocodes(): number {
  const parsed = Number.parseInt(
    process.env.NEARHIRE_MAX_CONCURRENT_GEOCODES ?? "",
    10,
  );

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );

  return results;
}

function nominatimUserAgent(): string {
  const email = process.env.NEARHIRE_NOMINATIM_EMAIL;
  return email
    ? `Hemlo (${email})`
    : "Hemlo local development; contact via NEARHIRE_NOMINATIM_EMAIL";
}
