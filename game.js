// ============================================
// GAME DASHBOARD LOGIC (game.html)
// ============================================

let currentUser = null;
let profile = null;

// ---------- boot ----------
(async () => {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    window.location.href = "index.html";
    return;
  }
  currentUser = data.session.user;
  await loadProfile();
  renderStats();
  updateCooldownLabels();
  setInterval(updateCooldownLabels, 1000);
})();

document.getElementById("signOutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
});

async function loadProfile() {
  const { data, error } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", currentUser.id)
    .single();
  if (error) {
    console.error(error);
    showToast("Could not load profile: " + error.message);
    return;
  }
  profile = data;
}

async function saveProfile(patch) {
  Object.assign(profile, patch);
  const { error } = await supabaseClient
    .from("profiles")
    .update(patch)
    .eq("id", currentUser.id);
  if (error) showToast("Save failed: " + error.message);
}

// ---------- nav ----------
const navItems = document.querySelectorAll(".nav-item");
navItems.forEach(item => {
  item.addEventListener("click", () => {
    navItems.forEach(n => n.classList.remove("active"));
    item.classList.add("active");
    document.querySelectorAll(".page").forEach(p => p.style.display = "none");
    document.getElementById("page-" + item.dataset.page).style.display = "block";

    if (item.dataset.page === "gacha") refreshGachaStats();
    if (item.dataset.page === "inventory") loadInventory();
  });
});

// ---------- stat rail rendering ----------
function renderStats() {
  document.getElementById("usernameDisplay").textContent = profile.username;
  document.getElementById("gradeBadge").textContent = profile.grade;
  document.getElementById("levelDisplay").textContent = profile.level;
  document.getElementById("coinsDisplay").textContent = fmt(profile.coins);
  document.getElementById("shardsSideDisplay").textContent = fmt(profile.cursed_shards);
  document.getElementById("rebirthsDisplay").textContent = profile.rebirths;
  document.getElementById("reincarnationsDisplay").textContent = profile.reincarnations;

  const needed = expForLevel(profile.level);
  document.getElementById("expText").textContent = `${fmt(profile.exp)} / ${fmt(needed)}`;
  document.getElementById("expBarFill").style.width = Math.min(100, (profile.exp / needed) * 100) + "%";

  document.getElementById("ceDisplay").textContent = fmt(profile.cursed_energy);
  const gaugeMax = 1000; // visual cap just for the ring fill, not a hard game cap
  const pct = Math.min(1, profile.cursed_energy / gaugeMax);
  const circumference = 465;
  document.getElementById("gaugeFill").style.strokeDashoffset = circumference - pct * circumference;
}

function fmt(n) {
  if (n === undefined || n === null) return "0";
  return Math.floor(n).toLocaleString();
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2600);
}

// ---------- leveling ----------
function grantExp(amount) {
  profile.exp += amount;
  let leveled = false;
  while (profile.exp >= expForLevel(profile.level)) {
    profile.exp -= expForLevel(profile.level);
    profile.level += 1;
    leveled = true;
  }
  const newGrade = gradeForLevel(profile.level);
  if (newGrade !== profile.grade) {
    profile.grade = newGrade;
    showToast(`Promoted to ${newGrade}!`);
  }
  if (leveled) showToast(`Level up! Now level ${profile.level}`);
}

// ---------- TRAIN ----------
const trainBtn = document.getElementById("trainBtn");
trainBtn.addEventListener("click", async () => {
  trainBtn.disabled = true;
  const ce = randInt(TRAIN_CE_MIN, TRAIN_CE_MAX);
  const exp = randInt(TRAIN_EXP_MIN, TRAIN_EXP_MAX);
  profile.cursed_energy += ce;
  grantExp(exp);
  const now = new Date().toISOString();
  await saveProfile({
    cursed_energy: profile.cursed_energy,
    exp: profile.exp,
    level: profile.level,
    grade: profile.grade,
    last_train_at: now
  });
  renderStats();
  showToast(`+${ce} Cursed Energy, +${exp} EXP`);
});

// ---------- WORK ----------
const workBtn = document.getElementById("workBtn");
workBtn.addEventListener("click", async () => {
  workBtn.disabled = true;
  const coins = randInt(WORK_COINS_MIN, WORK_COINS_MAX);
  profile.coins += coins;
  const now = new Date().toISOString();
  await saveProfile({ coins: profile.coins, last_work_at: now });
  renderStats();
  showToast(`+${coins} Coins`);
});

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function updateCooldownLabels() {
  updateCooldown(profile?.last_train_at, TRAIN_COOLDOWN_MS, "trainCooldown", trainBtn);
  updateCooldown(profile?.last_work_at, WORK_COOLDOWN_MS, "workCooldown", workBtn);
}

function updateCooldown(lastAt, cooldownMs, labelId, btn) {
  const label = document.getElementById(labelId);
  if (!lastAt) { label.textContent = "Ready"; if (btn) btn.disabled = false; return; }
  const elapsed = Date.now() - new Date(lastAt).getTime();
  const remaining = cooldownMs - elapsed;
  if (remaining <= 0) {
    label.textContent = "Ready";
    if (btn) btn.disabled = false;
  } else {
    label.textContent = `Ready in ${Math.ceil(remaining / 1000)}s`;
    if (btn) btn.disabled = true;
  }
}

// ============================================
// GACHA
// ============================================
let poolsCache = null;

async function loadPools() {
  if (poolsCache) return poolsCache;
  const [t, c, tr] = await Promise.all([
    supabaseClient.from("techniques").select("*"),
    supabaseClient.from("clans").select("*"),
    supabaseClient.from("traits").select("*")
  ]);
  if (t.error || c.error || tr.error) {
    showToast("Failed to load cursed roll pools — check Supabase seed data.");
    return null;
  }
  poolsCache = { techniques: t.data, clans: c.data, traits: tr.data };
  return poolsCache;
}

function weightedPick(list) {
  const total = list.reduce((sum, i) => sum + Number(i.rate_weight), 0);
  let roll = Math.random() * total;
  for (const item of list) {
    roll -= Number(item.rate_weight);
    if (roll <= 0) return item;
  }
  return list[list.length - 1];
}

function isHighRarity(item) {
  return item.rarity === "Special Grade" || item.rarity === "Limitless";
}

async function refreshGachaStats() {
  document.getElementById("shardCount").textContent = fmt(profile.cursed_shards);
  document.getElementById("pityCount").textContent = `${profile.pity_technique} / ${PITY_LIMIT}`;
}

document.getElementById("rollOneBtn").addEventListener("click", () => doRoll(1, GACHA_SINGLE_COST));
document.getElementById("rollTenBtn").addEventListener("click", () => doRoll(10, GACHA_MULTI_COST));

async function doRoll(count, cost) {
  if (profile.cursed_shards < cost) {
    showToast("Not enough Cursed Shards.");
    return;
  }
  const pools = await loadPools();
  if (!pools) return;

  profile.cursed_shards -= cost;
  const resultsContainer = document.getElementById("gachaResults");
  resultsContainer.innerHTML = "";

  const allPulledItems = []; // for high-rarity pity tracking

  for (let i = 0; i < count; i++) {
    profile.pity_technique += 1;
    const forcedHigh = profile.pity_technique >= PITY_LIMIT;

    const techniquePool = forcedHigh
      ? pools.techniques.filter(isHighRarity)
      : pools.techniques;
    const technique = weightedPick(techniquePool.length ? techniquePool : pools.techniques);
    const clan = weightedPick(pools.clans);
    const trait = weightedPick(pools.traits);

    if (isHighRarity(technique) || isHighRarity(clan) || isHighRarity(trait)) {
      profile.pity_technique = 0;
    }

    await grantTechnique(technique);
    await grantClan(clan);
    await grantTrait(trait);

    allPulledItems.push(technique, clan, trait);
    [technique, clan, trait].forEach(item => renderResultCard(item, resultsContainer));
  }

  await saveProfile({ cursed_shards: profile.cursed_shards, pity_technique: profile.pity_technique });
  renderStats();
  refreshGachaStats();
}

async function grantTechnique(technique) {
  await supabaseClient.from("player_techniques").insert({
    player_id: currentUser.id,
    technique_id: technique.id
  });
}
async function grantClan(clan) {
  await supabaseClient.from("player_clans").insert({
    player_id: currentUser.id,
    clan_id: clan.id
  });
}
async function grantTrait(trait) {
  await supabaseClient.from("player_traits").insert({
    player_id: currentUser.id,
    trait_id: trait.id
  });
}

function renderResultCard(item, container) {
  const div = document.createElement("div");
  div.className = "panel result-card";
  div.innerHTML = `
    <span class="rarity-tag ${rarityClass(item.rarity)}">${item.rarity}</span>
    <h4>${item.name}</h4>
    <p>${item.description}</p>
  `;
  container.appendChild(div);
}

// ============================================
// INVENTORY
// ============================================
async function loadInventory() {
  const container = document.getElementById("inventoryContent");
  container.innerHTML = `<div class="panel empty-state"><div class="glyph">◌</div>Loading...</div>`;

  const [pt, pc, ptr] = await Promise.all([
    supabaseClient.from("player_techniques").select("id, level, equipped, techniques(*)").eq("player_id", currentUser.id).order("obtained_at", { ascending: false }),
    supabaseClient.from("player_clans").select("id, active, clans(*)").eq("player_id", currentUser.id).order("obtained_at", { ascending: false }),
    supabaseClient.from("player_traits").select("id, active, traits(*)").eq("player_id", currentUser.id).order("obtained_at", { ascending: false })
  ]);

  if (pt.error || pc.error || ptr.error) {
    container.innerHTML = `<div class="panel empty-state">Failed to load inventory.</div>`;
    return;
  }

  if (!pt.data.length && !pc.data.length && !ptr.data.length) {
    container.innerHTML = `<div class="panel empty-state"><div class="glyph">◌</div>No cursed techniques, clans, or traits yet. Head to Cursed Roll.</div>`;
    return;
  }

  let html = "";

  if (pt.data.length) {
    html += `<div class="eyebrow" style="margin-bottom:10px;">CURSED TECHNIQUES</div><div class="inventory-grid" style="margin-bottom:28px;">`;
    pt.data.forEach(row => {
      const t = row.techniques;
      html += `<div class="panel inv-card">
        <span class="rarity-tag ${rarityClass(t.rarity)}">${t.rarity}</span>
        <h4>${t.name}</h4>
        <p>${t.passive}</p>
        <p>${t.active_skill}</p>
        <p style="color:var(--text-dim); font-family:var(--font-mono); font-size:11px;">Lv. ${row.level}${row.equipped ? " · Equipped" : ""}</p>
      </div>`;
    });
    html += `</div>`;
  }

  if (pc.data.length) {
    html += `<div class="eyebrow" style="margin-bottom:10px;">CLANS</div><div class="inventory-grid" style="margin-bottom:28px;">`;
    pc.data.forEach(row => {
      const c = row.clans;
      html += `<div class="panel inv-card">
        <span class="rarity-tag ${rarityClass(c.rarity)}">${c.rarity}</span>
        <h4>${c.name}</h4>
        <p>${c.bonus}</p>
      </div>`;
    });
    html += `</div>`;
  }

  if (ptr.data.length) {
    html += `<div class="eyebrow" style="margin-bottom:10px;">CURSED ENERGY TRAITS</div><div class="inventory-grid">`;
    ptr.data.forEach(row => {
      const tr = row.traits;
      html += `<div class="panel inv-card">
        <span class="rarity-tag ${rarityClass(tr.rarity)}">${tr.rarity}</span>
        <h4>${tr.name}</h4>
        <p>${tr.bonus}</p>
      </div>`;
    });
    html += `</div>`;
  }

  container.innerHTML = html;
}
