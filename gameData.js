// ============================================
// STATIC GAME DATA
// Cursed technique / clan / trait pools live in Supabase (see sql/seed.sql).
// This file holds constants that don't need a database round trip.
// ============================================

const GRADES = [
  "Grade 4",
  "Grade 3",
  "Grade 2",
  "Grade 1",
  "Special Grade"
];

const RARITY_ORDER = ["Grade 4", "Grade 3", "Grade 2", "Grade 1", "Special Grade", "Limitless"];

function rarityClass(rarity) {
  return "r-" + rarity.replace(/\s+/g, "");
}

// EXP required to reach the next level, given current level
function expForLevel(level) {
  return Math.floor(100 * Math.pow(1.12, level - 1));
}

// Grade thresholds by level (every 20 levels, roughly)
function gradeForLevel(level) {
  if (level >= 80) return "Special Grade";
  if (level >= 60) return "Grade 1";
  if (level >= 40) return "Grade 2";
  if (level >= 20) return "Grade 3";
  return "Grade 4";
}

const TRAIN_COOLDOWN_MS = 30 * 1000;      // 30s
const WORK_COOLDOWN_MS = 45 * 1000;       // 45s

const TRAIN_CE_MIN = 8, TRAIN_CE_MAX = 18;
const TRAIN_EXP_MIN = 5, TRAIN_EXP_MAX = 12;

const WORK_COINS_MIN = 15, WORK_COINS_MAX = 35;

const GACHA_SINGLE_COST = 100;   // cursed_shards
const GACHA_MULTI_COST = 900;    // 10-pull discount
const PITY_LIMIT = 90;           // guaranteed Special Grade+ within this many pulls
