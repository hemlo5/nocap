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
const CHRIST_LAT = 12.9337799;
const CHRIST_LNG = 77.6051605;

const SAPTHAGIRI_PLACE_ID = "user:7cb1eba7-b93c-420f-b356-5df29d41a622";
const SAPTHAGIRI_LAT = 13.06697;
const SAPTHAGIRI_LNG = 77.5032713888889;

// Student persona profiles to create or reuse
const PERSONAS = [
  { username: "shawarma guy", email: "kabir_bba@nocapblr.internal" },
  { username: "diddy", email: "dhruvv_eco@nocapblr.internal" },
  { username: "bicthslay", email: "sneha_psy@nocapblr.internal" },
  { username: "Anonymous", email: "ananya_psych@nocapblr.internal" },
  { username: "certified yapper", email: "nikhil_mca@nocapblr.internal" },
  { username: "momos over men", email: "riya_bcom@nocapblr.internal" },
  { username: "diddy", email: "tanmay_law@nocapblr.internal" },
  { username: "Anonymous", email: "arjun_soc@nocapblr.internal" },
  { username: "skibidi rizzler", email: "kunal_bca@nocapblr.internal" },
  { username: "bunk master", email: "sam_bba99@nocapblr.internal" },
  { username: "shawarma guy", email: "darshan_mech@nocapblr.internal" },
  { username: "diddy", email: "kiran_ise@nocapblr.internal" },
  { username: "Anonymous", email: "rakesh_ece@nocapblr.internal" },
  { username: "sleep deprived", email: "pavan_civil@nocapblr.internal" },
  { username: "bicthslay", email: "varun_cse@nocapblr.internal" },
  { username: "chai addict", email: "rohit_aiml@nocapblr.internal" },
  { username: "Anonymous", email: "pranav_it@nocapblr.internal" },
  { username: "vtu survivor", email: "vinay_ds@nocapblr.internal" },
  { username: "diddy", email: "siddharth_mech@nocapblr.internal" },
  { username: "Anonymous", email: "anon_student_blr@nocapblr.internal" },
];

async function getOrCreateUser(email, displayName) {
  // Check if user already exists
  const listRes = await fetch(`${url}/auth/v1/admin/users`, { headers: adminHeaders });
  const listData = await listRes.json();
  const existing = (listData.users || []).find((u) => u.email === email);
  if (existing) {
    // Update profile display_name
    await fetch(`${url}/rest/v1/nocap_profiles?on_conflict=id`, {
      method: "POST",
      headers: { ...adminHeaders, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ id: existing.id, display_name: displayName }),
    });
    return existing.id;
  }

  // Create new user
  const createRes = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({
      email,
      password: "NocapPassword123!@#",
      email_confirm: true,
      user_metadata: { display_name: displayName },
    }),
  });
  const newUser = await createRes.json();
  if (!newUser?.id) {
    throw new Error(`Failed to create user ${email}: ${JSON.stringify(newUser)}`);
  }

  // Create matching profile
  await fetch(`${url}/rest/v1/nocap_profiles?on_conflict=id`, {
    method: "POST",
    headers: { ...adminHeaders, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({ id: newUser.id, display_name: displayName }),
  });

  return newUser.id;
}

// ── CHRIST UNIVERSITY REVIEWS & CONVOS ──────────────────────────────────────
const CHRIST_THREADS = [
  {
    authorKey: "kabir_bba",
    rating: 2,
    body: "resort jaisa dikhta hai andar se but corporate jail fr 8 28 ko gate pe securtiy uncle stopped me cz shoes polished nahi the attandance 84 percent pe detain kardiya aur fine mangre dont let the green campus fool u",
    hoursAgo: 6,
    replies: [
      {
        authorKey: "dhruvv",
        body: "no cap gate 2 wale alag raw agent bante hai id card ka rope thoda tedha hua toh entry band",
        hoursAgo: 5,
      },
      {
        authorKey: "sneha_p",
        body: "hod made me write 10 page letter for 1 day sick leave 85 attandance rule is modern slavery fr",
        hoursAgo: 4,
      },
      {
        authorKey: "kabir_bba",
        body: "wahi toh bhai sg palya backdoor pe momos khane bhi nahi jaane dete outpass ke bina",
        hoursAgo: 3,
      },
    ],
  },
  {
    // Solo rant — zero replies
    authorKey: "ananyaa",
    rating: 1,
    body: "2 assignment 3 midsem viva aur 4 research draft ek hafte me sleep schedule cooked mental health in minus bhai drop out karlu kya",
    hoursAgo: 14,
    replies: [],
  },
  {
    authorKey: "nikhil_mca",
    rating: 4,
    body: "food theek hai gourmet ka paneer roll carries my degree but real saviour is sg palya backdoor bas guard ko mat dekhna sneak krte time",
    hoursAgo: 22,
    replies: [
      {
        authorKey: "riyaa",
        body: "gourmet cold cofee after failing cia by 0 5 marks hits diff ngl",
        hoursAgo: 20,
      },
      {
        authorKey: "tanmay_l",
        body: "the way everyone walks at 830am in formal blazers in heavy rain looking like freshers on shark tank is so funny 😭",
        hoursAgo: 18,
      },
    ],
  },
  {
    // Solo rant — zero replies
    authorKey: "arjun_soc",
    rating: 3,
    body: "campus sundar hai but freshers log itna attitude kyu dete hai bhai first sem me hi linkedin bio me future ceo likh lia sabne lmao",
    hoursAgo: 30,
    replies: [],
  },
  {
    authorKey: "kunal_bca",
    rating: 2,
    body: "wifi sirf libary me chalta hai classroom me zero tower presentations ke time hotspot bhik mangna padta hai",
    hoursAgo: 40,
    replies: [
      {
        authorKey: "sam_99",
        body: "hotspot mangne pe prof bolta phone submit karo desk pe 🤡",
        hoursAgo: 38,
      },
    ],
  },
];

// ── SAPTHAGIRI UNIVERSITY REVIEWS & CONVOS ──────────────────────────────────
const SAPTHAGIRI_THREADS = [
  {
    authorKey: "darshan_r",
    rating: 2,
    body: "whoever wrote nowadays jatre fr was so right macha university board laga diya but clg abhi bhi 2010 me atka hai parking me daily new bike revving fight",
    hoursAgo: 8,
    replies: [
      {
        authorKey: "kiran_k",
        body: "macha bmtc 250 bus hesarghatta road pe 2 ghanta trap karti hai subah subah pura mood off",
        hoursAgo: 7,
      },
      {
        authorKey: "rakesh_g",
        body: "dasrahalli metro to clg share auto anna 50rs mangta jaise bmw me baitha ra ho",
        hoursAgo: 6,
      },
    ],
  },
  {
    // Solo rant — zero replies
    authorKey: "pavan_k",
    rating: 1,
    body: "garmi me fan bhi nahi chalta class me aur bahar hesaraghatta road ka dust muh pe ata hai sidha clg he ya construction site",
    hoursAgo: 16,
    replies: [],
  },
  {
    authorKey: "varun_v",
    rating: 3,
    body: "canteen egg puff aur 10rs chai is literally reason why batch hasnt dropped out yet campus bada hai but canteen me 10 chair hai 3000 logo ke lie",
    hoursAgo: 24,
    replies: [
      {
        authorKey: "rohit_m",
        body: "ground shed ke piche bunk marte the tab tak theek tha ab hod waha bhi round marta hai bhaago bc",
        hoursAgo: 21,
      },
      {
        authorKey: "pranav_s",
        body: "placement me bolenge 15lpa highest reality me 3lpa mass recruiter bhi reject kardia lol",
        hoursAgo: 19,
      },
    ],
  },
  {
    // Solo rant — zero replies
    authorKey: "vinay_d",
    rating: 2,
    body: "autonomous paper checkin scam hai bhai ek sem me 8 sgpa agle sem me direct fail reval ka 1500 per subject mangte hai naya building humare supply fees se banra",
    hoursAgo: 32,
    replies: [],
  },
  {
    authorKey: "siddhu_m",
    rating: 2,
    body: "mech block aur cs block ka lafda chalta rehta hai har fest me management bas gate band krke beth jata hai",
    hoursAgo: 45,
    replies: [
      {
        authorKey: "darshan_r",
        body: "fest me securtiy itna darte hai sound system bhi 5 baje off kardia tha last time 💀",
        hoursAgo: 42,
      },
    ],
  },
];

async function seedCampus(placeId, lat, lng, threads, campusName) {
  console.log(`\n========================================`);
  console.log(`Seeding ${campusName} (${placeId})`);
  console.log(`========================================`);

  for (const thread of threads) {
    const authorId = userMap[thread.authorKey];
    if (!authorId) {
      console.error(`Missing authorId for ${thread.authorKey}`);
      continue;
    }

    const reviewDate = new Date(Date.now() - thread.hoursAgo * 60 * 60 * 1000).toISOString();

    // Insert or update root review
    const reviewRes = await fetch(`${url}/rest/v1/nocap_reviews?on_conflict=profile_id,place_id`, {
      method: "POST",
      headers: {
        ...adminHeaders,
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        profile_id: authorId,
        place_id: placeId,
        body: thread.body,
        rating: thread.rating,
        latitude: lat,
        longitude: lng,
        accuracy_meters: 20,
        is_legit: true,
        created_at: reviewDate,
        updated_at: reviewDate,
      }),
    });

    const reviewData = await reviewRes.json();
    if (!reviewRes.ok || !Array.isArray(reviewData) || reviewData.length === 0) {
      console.error(`Error inserting review for ${thread.authorKey}:`, reviewData);
      continue;
    }

    const reviewId = reviewData[0].id;
    console.log(`✓ Review by ${thread.authorKey} (id: ${reviewId.slice(0, 8)}): "${thread.body.slice(0, 45)}..."`);

    // If there are replies, insert them into nocap_review_replies
    if (thread.replies && thread.replies.length > 0) {
      for (const reply of thread.replies) {
        const replyAuthorId = userMap[reply.authorKey];
        if (!replyAuthorId) {
          console.error(`Missing reply author for ${reply.authorKey}`);
          continue;
        }

        const replyDate = new Date(Date.now() - reply.hoursAgo * 60 * 60 * 1000).toISOString();

        const replyRes = await fetch(`${url}/rest/v1/nocap_review_replies`, {
          method: "POST",
          headers: {
            ...adminHeaders,
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            review_id: reviewId,
            profile_id: replyAuthorId,
            body: reply.body,
            created_at: replyDate,
          }),
        });

        const replyData = await replyRes.json();
        if (replyRes.ok) {
          console.log(`   ↳ Reply by ${reply.authorKey}: "${reply.body.slice(0, 40)}..."`);
        } else {
          console.error(`   ✗ Reply failed:`, replyData);
        }
      }
    } else {
      console.log(`   (Solo review — 0 replies)`);
    }
  }
}

const userMap = {};

async function main() {
  console.log("Setting up student personas...");
  for (const p of PERSONAS) {
    const uid = await getOrCreateUser(p.email, p.username);
    userMap[p.username] = uid;
  }
  console.log(`Configured ${Object.keys(userMap).length} student accounts.`);

  await seedCampus(CHRIST_PLACE_ID, CHRIST_LAT, CHRIST_LNG, CHRIST_THREADS, "Christ University");
  await seedCampus(SAPTHAGIRI_PLACE_ID, SAPTHAGIRI_LAT, SAPTHAGIRI_LNG, SAPTHAGIRI_THREADS, "Sapthagiri University");

  console.log("\n🎉 Done seeding campus convos successfully!");
}

main().catch(console.error);
