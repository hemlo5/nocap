export const nocapPlaceCategories = ["eat", "street", "park", "culture"] as const;

export type NocapPlaceCategory = (typeof nocapPlaceCategories)[number] | "other" | (string & {});

export type NocapPlace = {
  id: string;
  name: string;
  category: NocapPlaceCategory;
  area: string;
  address: string;
  latitude: number;
  longitude: number;
  aliases: string[];
  searchQuery: string;
};

export type NocapMention = {
  id: string;
  placeId: string;
  permalink: string;
  subreddit: string;
  excerpt: string;
  score: number | null;
  createdAt: string;
  author: string | null;
  topics: string[];
};

export const nocapPlaces: NocapPlace[] = [
  ["mtr-lalbagh", "MTR", "eat", "Lalbagh", "Lalbagh Road, Bengaluru", 12.9552, 77.5855, ["Mavalli Tiffin Rooms"], "MTR Lalbagh Bengaluru"],
  ["vidyarthi-bhavan", "Vidyarthi Bhavan", "eat", "Basavanagudi", "Gandhi Bazaar, Bengaluru", 12.9471, 77.5701, [], "Vidyarthi Bhavan Bengaluru"],
  ["ctr-malleshwaram", "Central Tiffin Room", "eat", "Malleshwaram", "Margosa Road, Bengaluru", 13.0034, 77.5708, ["CTR"], "CTR Malleshwaram Bengaluru"],
  ["truffles-koramangala", "Truffles", "eat", "Koramangala", "5th Block, Koramangala, Bengaluru", 12.9347, 77.6156, [], "Truffles Koramangala Bengaluru"],
  ["rameshwaram-cafe", "The Rameshwaram Cafe", "eat", "Indiranagar", "100 Feet Road, Indiranagar, Bengaluru", 12.9788, 77.6406, ["Rameshwaram Cafe"], "The Rameshwaram Cafe Indiranagar Bengaluru"],
  ["toit", "Toit", "eat", "Indiranagar", "100 Feet Road, Indiranagar, Bengaluru", 12.9797, 77.6408, [], "Toit Indiranagar Bengaluru"],
  ["bengaluru-oda", "Bengaluru Oota Company", "eat", "Jayanagar", "Jayanagar 4th Block, Bengaluru", 12.9291, 77.5832, [], "Bengaluru Oota Company Jayanagar"],
  ["airlines-hotel", "Airlines Hotel", "eat", "Lavelle Road", "Lavelle Road, Bengaluru", 12.9711, 77.5973, [], "Airlines Hotel Bengaluru"],
  ["third-wave-koramangala", "Third Wave Coffee", "eat", "Koramangala", "5th Block, Koramangala, Bengaluru", 12.9354, 77.6144, [], "Third Wave Coffee Koramangala Bengaluru"],
  ["corner-house", "Corner House", "eat", "Koramangala", "80 Feet Road, Koramangala, Bengaluru", 12.9357, 77.6176, [], "Corner House Koramangala Bengaluru"],
  ["church-street", "Church Street", "street", "MG Road", "Church Street, Bengaluru", 12.9758, 77.6012, [], "Church Street Bengaluru"],
  ["commercial-street", "Commercial Street", "street", "Shivajinagar", "Commercial Street, Bengaluru", 12.9825, 77.6089, [], "Commercial Street Bengaluru"],
  ["indiranagar-100ft", "100 Feet Road", "street", "Indiranagar", "100 Feet Road, Indiranagar, Bengaluru", 12.9782, 77.6401, [], "100 Feet Road Indiranagar Bengaluru"],
  ["koramangala-80ft", "80 Feet Road", "street", "Koramangala", "80 Feet Road, Koramangala, Bengaluru", 12.9354, 77.6198, [], "80 Feet Road Koramangala Bengaluru"],
  ["mg-road", "MG Road", "street", "MG Road", "MG Road, Bengaluru", 12.9756, 77.6065, ["Mahatma Gandhi Road"], "MG Road Bengaluru"],
  ["vv-puram", "VV Puram Food Street", "street", "VV Puram", "Old Market Road, Bengaluru", 12.9541, 77.5748, ["Thindi Beedi"], "VV Puram Food Street Bengaluru"],
  ["cubbon-park", "Cubbon Park", "park", "Kasturba Road", "Kasturba Road, Bengaluru", 12.9766, 77.5929, [], "Cubbon Park Bengaluru"],
  ["lalbagh", "Lalbagh Botanical Garden", "park", "Lalbagh", "Lalbagh Road, Bengaluru", 12.9507, 77.5848, ["Lalbagh"], "Lalbagh Botanical Garden Bengaluru"],
  ["kaikondrahalli-lake", "Kaikondrahalli Lake", "park", "Sarjapur Road", "Sarjapur Road, Bengaluru", 12.9171, 77.6768, [], "Kaikondrahalli Lake Bengaluru"],
  ["agaram-lake", "Agaram Lake", "park", "HSR Layout", "HSR Layout, Bengaluru", 12.9351, 77.6389, [], "Agaram Lake Bengaluru"],
  ["sankey-tank", "Sankey Tank", "park", "Sadashivanagar", "Sankey Road, Bengaluru", 13.0087, 77.5744, [], "Sankey Tank Bengaluru"],
  ["jp-park", "Jayaprakash Narayan Park", "park", "Mathikere", "Mathikere, Bengaluru", 13.0403, 77.5561, ["JP Park"], "JP Park Mathikere Bengaluru"],
  ["national-gallery", "National Gallery of Modern Art", "culture", "Palace Road", "Manikyavelu Mansion, Bengaluru", 12.9895, 77.5912, ["NGMA Bengaluru"], "National Gallery of Modern Art Bengaluru"],
  ["bangalore-palace", "Bangalore Palace", "culture", "Vasanth Nagar", "Palace Grounds, Bengaluru", 12.9988, 77.5921, [], "Bangalore Palace Bengaluru"],
  ["visvesvaraya-museum", "Visvesvaraya Museum", "culture", "Kasturba Road", "Kasturba Road, Bengaluru", 12.9757, 77.5967, [], "Visvesvaraya Museum Bengaluru"],
  ["ranga-shankara", "Ranga Shankara", "culture", "JP Nagar", "JP Nagar 2nd Phase, Bengaluru", 12.9184, 77.5928, [], "Ranga Shankara Bengaluru"],
  ["chowdiah-memorial", "Chowdiah Memorial Hall", "culture", "Malleshwaram", "Gayathri Devi Park Extension, Bengaluru", 13.0101, 77.5685, [], "Chowdiah Memorial Hall Bengaluru"],
  ["nandi-hills", "Nandi Hills", "park", "Nandi Hills, Chikkaballapur", "Nandi Hills, Chikkaballapur", 13.3702, 77.6835, [], "Nandi Hills Bengaluru"],
  ["phoenix-marketcity", "Phoenix Marketcity", "culture", "Whitefield", "Mahadevapura, Bengaluru", 12.9971, 77.6964, [], "Phoenix Marketcity Bengaluru"],
  ["orion-mall", "Orion Mall", "culture", "Rajajinagar", "Dr Rajkumar Road, Bengaluru", 13.0116, 77.5553, [], "Orion Mall Bengaluru"],
  ["cubbon-reading-room", "Cubbon Park Reading Room", "culture", "Cubbon Park", "Cubbon Park, Bengaluru", 12.9771, 77.5922, ["Cubbon Reads"], "Cubbon Park Reading Room Bengaluru"],
  ["koshys", "Koshy's", "eat", "St Mark's Road", "St Mark's Road, Bengaluru", 12.9726, 77.6009, ["Koshys"], "Koshys Bengaluru"],
  ["brahmins-coffee", "Brahmin's Coffee Bar", "eat", "Basavanagudi", "Ranga Rao Road, Bengaluru", 12.9438, 77.5708, ["Brahmins Coffee Bar"], "Brahmin's Coffee Bar Bengaluru"],
  ["veena-stores", "Veena Stores", "eat", "Malleshwaram", "Margosa Road, Bengaluru", 13.0038, 77.5697, [], "Veena Stores Malleshwaram Bengaluru"],
  ["taaza-thindi", "Taaza Thindi", "eat", "Jayanagar", "Jayanagar 4th Block, Bengaluru", 12.9292, 77.5837, [], "Taaza Thindi Jayanagar Bengaluru"],
  ["slv-banashankari", "SLV Refreshments", "eat", "Banashankari", "Banashankari 2nd Stage, Bengaluru", 12.9247, 77.5653, [], "SLV Refreshments Banashankari Bengaluru"],
  ["meghana-koramangala", "Meghana Foods", "eat", "Koramangala", "5th Block, Koramangala, Bengaluru", 12.9342, 77.6141, [], "Meghana Foods Koramangala Bengaluru"],
  ["nagarjuna-residency", "Nagarjuna", "eat", "Residency Road", "Residency Road, Bengaluru", 12.9703, 77.6071, [], "Nagarjuna Residency Road Bengaluru"],
  ["dyu-art-cafe", "DYU Art Cafe", "eat", "Koramangala", "8th Main Road, Koramangala, Bengaluru", 12.9303, 77.6172, [], "DYU Art Cafe Koramangala Bengaluru"],
  ["bierre-club", "The Bier Club", "eat", "Lavelle Road", "Lavelle Road, Bengaluru", 12.9719, 77.5962, [], "The Bier Club Bengaluru"],
  ["pizzaiolo", "Pizzaiolo", "eat", "Indiranagar", "12th Main Road, Indiranagar, Bengaluru", 12.9717, 77.6411, [], "Pizzaiolo Indiranagar Bengaluru"],
  ["hallimane-malleswaram", "Hallimane", "eat", "Malleshwaram", "Sampige Road, Bengaluru", 13.0031, 77.5706, [], "Hallimane Malleshwaram Bengaluru"],
  ["maiya-lalbagh", "Maiyas", "eat", "Lalbagh", "Lalbagh Road, Bengaluru", 12.9572, 77.5853, [], "Maiyas Lalbagh Bengaluru"],
  ["brik-oven-whitefield", "Brik Oven", "eat", "Whitefield", "Whitefield Main Road, Bengaluru", 12.9684, 77.7497, [], "Brik Oven Whitefield Bengaluru"],
  ["delhi-chaat-kamanahalli", "Delhi Chaat House", "eat", "Kammanahalli", "Kammanahalli Main Road, Bengaluru", 13.0188, 77.6383, [], "Delhi Chaat House Kammanahalli Bengaluru"],
  ["samosa-party-hsr", "Samosa Party", "eat", "HSR Layout", "27th Main, HSR Layout, Bengaluru", 12.9133, 77.6387, [], "Samosa Party HSR Layout Bengaluru"],
  ["brisket-park-street", "Smoke House Deli", "eat", "Indiranagar", "100 Feet Road, Indiranagar, Bengaluru", 12.9803, 77.6418, [], "Smoke House Deli Indiranagar Bengaluru"],
  ["brigade-road", "Brigade Road", "street", "MG Road", "Brigade Road, Bengaluru", 12.9722, 77.6077, [], "Brigade Road Bengaluru"],
  ["residency-road", "Residency Road", "street", "Ashok Nagar", "Residency Road, Bengaluru", 12.9710, 77.6063, [], "Residency Road Bengaluru"],
  ["indiranagar-12th-main", "12th Main Road", "street", "Indiranagar", "12th Main Road, Indiranagar, Bengaluru", 12.9715, 77.6418, [], "12th Main Indiranagar Bengaluru"],
  ["kalyan-nagar-80ft", "80 Feet Road Kalyan Nagar", "street", "Kalyan Nagar", "80 Feet Road, Kalyan Nagar, Bengaluru", 13.0224, 77.6396, [], "80 Feet Road Kalyan Nagar Bengaluru"],
  ["kammanahalli-main-road", "Kammanahalli Main Road", "street", "Kammanahalli", "Kammanahalli Main Road, Bengaluru", 13.0182, 77.6382, [], "Kammanahalli Main Road Bengaluru"],
  ["hsr-27th-main", "27th Main Road", "street", "HSR Layout", "27th Main Road, HSR Layout, Bengaluru", 12.9123, 77.6384, [], "27th Main HSR Layout Bengaluru"],
  ["jayanagar-4th-block", "Jayanagar 4th Block", "street", "Jayanagar", "4th Block, Jayanagar, Bengaluru", 12.9289, 77.5837, [], "Jayanagar 4th Block Bengaluru"],
  ["nagarbhavi-outer-ring-road", "Nagarbhavi Outer Ring Road", "street", "Nagarbhavi", "Outer Ring Road, Nagarbhavi, Bengaluru", 12.9579, 77.5096, [], "Nagarbhavi Outer Ring Road Bengaluru"],
  ["whitefield-main-road", "Whitefield Main Road", "street", "Whitefield", "Whitefield Main Road, Bengaluru", 12.9695, 77.7490, [], "Whitefield Main Road Bengaluru"],
  ["sarjapur-road", "Sarjapur Road", "street", "Sarjapur Road", "Sarjapur Road, Bengaluru", 12.9170, 77.6783, [], "Sarjapur Road Bengaluru"],
  ["old-airport-road", "Old Airport Road", "street", "Domlur", "Old Airport Road, Bengaluru", 12.9573, 77.6381, [], "Old Airport Road Bengaluru"],
  ["madiwala-lake", "Madiwala Lake", "park", "Madiwala", "Madiwala, Bengaluru", 12.9173, 77.6178, [], "Madiwala Lake Bengaluru"],
  ["puttenahalli-lake", "Puttenahalli Lake", "park", "JP Nagar", "JP Nagar 7th Phase, Bengaluru", 12.9063, 77.5841, [], "Puttenahalli Lake Bengaluru"],
  ["hebal-lake", "Hebbal Lake", "park", "Hebbal", "Hebbal, Bengaluru", 13.0409, 77.5912, [], "Hebbal Lake Bengaluru"],
  ["yelahanka-lake", "Yelahanka Lake", "park", "Yelahanka", "Yelahanka, Bengaluru", 13.1015, 77.5922, [], "Yelahanka Lake Bengaluru"],
  ["hennur-lake", "Hennur Lake", "park", "Hennur", "Hennur, Bengaluru", 13.0401, 77.6367, [], "Hennur Lake Bengaluru"],
  ["kaggadasapura-lake", "Kaggadasapura Lake", "park", "Kaggadasapura", "Kaggadasapura, Bengaluru", 12.9752, 77.6774, [], "Kaggadasapura Lake Bengaluru"],
  ["varthur-lake", "Varthur Lake", "park", "Varthur", "Varthur, Bengaluru", 12.9414, 77.7476, [], "Varthur Lake Bengaluru"],
  ["kr-puram-lake", "KR Puram Lake", "park", "KR Puram", "KR Puram, Bengaluru", 13.0030, 77.7019, ["K R Puram Lake"], "KR Puram Lake Bengaluru"],
  ["freedom-park", "Freedom Park", "park", "Gandhi Nagar", "Seshadri Road, Bengaluru", 12.9780, 77.5819, [], "Freedom Park Bengaluru"],
  ["cariappa-memorial-park", "Cariappa Memorial Park", "park", "Indiranagar", "HAL 2nd Stage, Bengaluru", 12.9702, 77.6494, [], "Cariappa Memorial Park Bengaluru"],
  ["mahalakshmi-layout-park", "Mahalakshmi Layout Park", "park", "Mahalakshmi Layout", "Mahalakshmi Layout, Bengaluru", 13.0128, 77.5466, [], "Mahalakshmi Layout Park Bengaluru"],
  ["lalbagh-west-gate", "Lalbagh West Gate", "park", "Basavanagudi", "Lalbagh West Gate, Bengaluru", 12.9504, 77.5787, [], "Lalbagh West Gate Bengaluru"],
  ["indian-music-experience", "Indian Music Experience", "culture", "JP Nagar", "Brigade Millennium Avenue, Bengaluru", 12.8905, 77.5897, ["IME Bengaluru"], "Indian Music Experience Bengaluru"],
  ["jagriti-theatre", "Jagriti Theatre", "culture", "Whitefield", "Varthur Road, Bengaluru", 12.9322, 77.7106, [], "Jagriti Theatre Bengaluru"],
  ["lahe-lahe", "Lahe Lahe", "culture", "Indiranagar", "100 Feet Road, Indiranagar, Bengaluru", 12.9786, 77.6403, [], "Lahe Lahe Bengaluru"],
  ["atta-galatta", "Atta Galatta", "culture", "Koramangala", "Koramangala 5th Block, Bengaluru", 12.9335, 77.6151, [], "Atta Galatta Bengaluru"],
  ["go-native-jayanagar", "Go Native", "culture", "Jayanagar", "Jayanagar 3rd Block, Bengaluru", 12.9265, 77.5822, [], "Go Native Jayanagar Bengaluru"],
  ["chitrakala-parishath", "Karnataka Chitrakala Parishath", "culture", "Seshadripuram", "Kumara Krupa Road, Bengaluru", 12.9920, 77.5808, [], "Karnataka Chitrakala Parishath Bengaluru"],
  ["rangoli-metro-art-centre", "Rangoli Metro Art Center", "culture", "MG Road", "MG Road Metro Station, Bengaluru", 12.9757, 77.6071, ["Rangoli Metro Art Centre"], "Rangoli Metro Art Center Bengaluru"],
  ["bangalore-international-centre", "Bangalore International Centre", "culture", "Domlur", "Domlur, Bengaluru", 12.9617, 77.6410, ["BIC Bengaluru"], "Bangalore International Centre Domlur"],
  ["suchitra-film-society", "Suchitra Film Society", "culture", "Banashankari", "Banashankari 2nd Stage, Bengaluru", 12.9241, 77.5632, [], "Suchitra Film Society Bengaluru"],
].map(([id, name, category, area, address, latitude, longitude, aliases, searchQuery]) => ({
  id: id as string,
  name: name as string,
  category: category as NocapPlaceCategory,
  area: area as string,
  address: address as string,
  latitude: latitude as number,
  longitude: longitude as number,
  aliases: aliases as string[],
  searchQuery: searchQuery as string,
}));

export function findNocapPlace(id: string) {
  return nocapPlaces.find((place) => place.id === id) ?? null;
}

export function slugifyArea(area: string): string {
  return area
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getAllAreas(): Array<{ slug: string; name: string; count: number }> {
  const map = new Map<string, { slug: string; name: string; count: number }>();
  for (const place of nocapPlaces) {
    const slug = slugifyArea(place.area);
    const existing = map.get(slug);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(slug, { slug, name: place.area, count: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

export function findPlacesByArea(areaSlug: string): NocapPlace[] {
  return nocapPlaces.filter((place) => slugifyArea(place.area) === areaSlug);
}

export function findPlacesByCategory(category: string): NocapPlace[] {
  return nocapPlaces.filter((place) => place.category === category);
}

export const categoryDetails: Record<
  string,
  { name: string; tag: string; description: string }
> = {
  eat: {
    name: "Food & Drink",
    tag: "Iconic Eats, Filter Coffee, Craft Breweries & Street Food",
    description:
      "Unfiltered opinions on Bengaluru's legendary breakfast spots, modern bistros, microbreweries, and street eats. Real people, no paid influencer hype.",
  },
  street: {
    name: "Streets & Walks",
    tag: "High Streets, Commercial Hubs, Night Walks & Markets",
    description:
      "Firsthand reviews of Bengaluru's most vibrant streets—from Church Street's weekend buzz to Commercial Street's shopping sprawl.",
  },
  park: {
    name: "Parks & Lakes",
    tag: "Lakes, Green Corridors, Walking Tracks & Nature Escapes",
    description:
      "Real community feedback on green lungs, jogging trails, clean waters, and weekend retreats across Bengaluru.",
  },
  culture: {
    name: "Culture & Arts",
    tag: "Galleries, Theatres, Heritage Spaces & Creative Hubs",
    description:
      "Bengaluru's theatre scene, independent art galleries, heritage palaces, and reading spaces reviewed by locals.",
  },
};

