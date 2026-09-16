import assert from "node:assert";
import fs from "node:fs";

// 1. agg.json March check
const agg = JSON.parse(fs.readFileSync("data/agg.json", "utf8"));
const m3 = agg.byMonth.find(m => m.key === "2026-03");
assert.strictEqual(m3.rows, 11, "March rows must be 11");
assert.strictEqual(m3.views, 47589, "March views must be 47589");
assert.strictEqual(m3.likes, 1061, "March likes must be 1061");

// 2. seed.sql duplicate check
const seed = fs.readFileSync("supabase/seed.sql", "utf8");
const m3Seed = seed.split("\n").filter(l => l.trim().startsWith("('") && l.includes("2026-03"));
assert.strictEqual(m3Seed.length, 11, "March rows in seed.sql must be 11");

// 3. Card partitioning
const V2_ORDERED_LOCATIONS = ["명동점", "이태원점", "남포점", "신사점", "성수점", "북촌점", "강남점", "종각점"];
const marchSample = [{ location: "이태원점", views: 47589, influencer_name: "A", upload_url: "http" }];
const cards = V2_ORDERED_LOCATIONS.map(loc => {
  const rows = marchSample.filter(c => c.location === loc);
  return { name: loc, viewsRaw: rows.reduce((s, r) => s + r.views, 0), influencers: rows.length, uploaded: rows.length };
});

const activeCards = cards.filter(c => c.influencers > 0 || c.uploaded > 0 || c.viewsRaw > 0);
const zeroCards = cards.filter(c => c.influencers === 0 && c.uploaded === 0 && c.viewsRaw === 0);
assert.strictEqual(activeCards.length, 1, "Only Itaewon should be active in March");
assert.strictEqual(zeroCards.length, 7, "Remaining 7 must be zeroCards");

console.log("✓ Monthly aggregation check passed");
