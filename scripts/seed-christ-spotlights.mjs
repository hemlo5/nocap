import { readFileSync } from "fs";

for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminHeaders = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

const CHRIST_PLACE_ID = "user:3ff2938e-b51b-4af7-84b9-ce2e3caa2078";

const SPOTLIGHTS = [
  {
    personName: "gate 2 security uncle",
    authorName: "shawarma guy",
    description: "saala bkl border guard jaisa act krta hai 8 29 ko gate band krke shoe polish check krra chutiya iske chakkar me 84 attendance pe detain hogya bc",
    hoursAgo: 3,
  },
  {
    personName: "chetan 2nd yr bba",
    authorName: "diddy",
    description: "bhai is bkl cr ko sabse pehle peeto bell bajne se 2 min pehle prof ko yaad dilata hai sir quiz lene wale the na aur proxy pakad ke direct hod ko snitch krta hai saala snake",
    hoursAgo: 5,
  },
  {
    personName: "rohit 3rd yr bcom",
    authorName: "bicthslay",
    description: "group project me ek slide nahi banaya chutiya presentation ke din blazer pehen ke first slide pe apna naam daal ke credit le gaya viva me bola my mic was glitching",
    hoursAgo: 8,
  },
];

async function seed() {
  console.log("Seeding Christ University person spotlights...");

  // Find profiles
  const profilesRes = await fetch(`${url}/rest/v1/nocap_profiles?select=id,display_name`, {
    headers: adminHeaders,
  });
  const profiles = await profilesRes.json();
  const profileMap = {};
  for (const p of profiles) {
    if (p.display_name && !profileMap[p.display_name]) {
      profileMap[p.display_name] = p.id;
    }
  }

  const fallbackId = profiles[0]?.id;

  for (const s of SPOTLIGHTS) {
    const profileId = profileMap[s.authorName] || fallbackId;
    const createdAt = new Date(Date.now() - s.hoursAgo * 60 * 60 * 1000).toISOString();

    const insertRes = await fetch(`${url}/rest/v1/nocap_person_notes`, {
      method: "POST",
      headers: {
        ...adminHeaders,
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        place_id: CHRIST_PLACE_ID,
        profile_id: profileId,
        person_name: s.personName,
        description: s.description,
        created_at: createdAt,
        updated_at: createdAt,
      }),
    });

    const data = await insertRes.json();
    if (!insertRes.ok) {
      console.error(`Failed to insert ${s.personName}:`, data);
    } else {
      console.log(`✓ Inserted spotlight for "${s.personName}" by "${s.authorName}" (id: ${data[0]?.id})`);
    }
  }

  console.log("\n🎉 Done seeding Christ University spotlights!");
}

seed().catch(console.error);
