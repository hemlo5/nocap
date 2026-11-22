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
const SAPTHAGIRI_PLACE_ID = "user:7cb1eba7-b93c-420f-b356-5df29d41a622";

async function run() {
  console.log("Removing Crazy Tea badge (is_legit: false) from Christ & Sapthagiri reviews...");

  // Update Christ reviews
  const res1 = await fetch(
    `${url}/rest/v1/nocap_reviews?place_id=eq.${encodeURIComponent(CHRIST_PLACE_ID)}`,
    {
      method: "PATCH",
      headers: { ...adminHeaders, Prefer: "return=representation" },
      body: JSON.stringify({ is_legit: false }),
    }
  );
  const data1 = await res1.json();
  console.log(`Updated ${data1?.length || 0} reviews for Christ University.`);

  // Update Sapthagiri reviews
  const res2 = await fetch(
    `${url}/rest/v1/nocap_reviews?place_id=eq.${encodeURIComponent(SAPTHAGIRI_PLACE_ID)}`,
    {
      method: "PATCH",
      headers: { ...adminHeaders, Prefer: "return=representation" },
      body: JSON.stringify({ is_legit: false }),
    }
  );
  const data2 = await res2.json();
  console.log(`Updated ${data2?.length || 0} reviews for Sapthagiri University.`);

  // Verify
  const checkRes = await fetch(
    `${url}/rest/v1/nocap_reviews?place_id=in.(${encodeURIComponent(CHRIST_PLACE_ID)},${encodeURIComponent(SAPTHAGIRI_PLACE_ID)})&select=id,place_id,is_legit`,
    { headers: adminHeaders }
  );
  const checkData = await checkRes.json();
  const legitRemaining = checkData.filter((r) => r.is_legit);
  console.log(`Total reviews checked: ${checkData.length}. Remaining with Crazy Tea (is_legit: true): ${legitRemaining.length}`);
}

run().catch(console.error);
