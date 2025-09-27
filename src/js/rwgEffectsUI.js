"use strict";

// Cached elements
let _rwgEffectsInitialized = false;
let _rwgEffectsCardEl = null;
let _rwgEffectsListEl = null;
let _rwgEffectsLastKey = '';

// Friendly labels for projects and buildings
const RWG_PROJECT_NAMES = {
  nitrogenSpaceMining: 'Nitrogen Importation',
  hydrogenSpaceMining: 'Hydrogen Importation',
  carbonSpaceMining: 'Carbon Importation',
  waterSpaceMining: 'Water Importation',
};
const RWG_BUILDING_OUTPUT = {
  oreMine: 'Ore Mine',
  sandQuarry: 'Sand Harvester',
};

function _titleCaseArchetype(t) {
  try {
    return String(t)
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  } catch(_) { return String(t || ''); }
}

function _ensureRWGEffectsUI() {
  if (_rwgEffectsInitialized) return true;
  const container = typeof document !== 'undefined' ? document.getElementById('space-random') : null;
  if (!container) return false;

  const card = document.createElement('div');
  card.className = 'rwg-card';
  card.id = 'rwg-effects-card';
  card.innerHTML = `
    <div class="card-header">
      <h3 class="card-title">Random World Effects <span class="info-tooltip-icon" title="Bonuses from terraforming random worlds of each type">&#9432;</span></h3>
    </div>
    <div id="rwg-effects-list" class="card-body rwg-effects-list"></div>
  `;
  if (typeof makeCollapsibleCard === 'function') makeCollapsibleCard(card);
  const historyEl = document.getElementById('rwg-history');
  if (historyEl && historyEl.parentElement === container) {
    container.insertBefore(card, historyEl);
  } else {
    container.appendChild(card);
  }

  _rwgEffectsCardEl = card;
  _rwgEffectsListEl = card.querySelector('#rwg-effects-list');
  _rwgEffectsInitialized = true;
  return true;
}

function _computeRWGEffectsSummary() {
  // Prefer helper if present
  if (typeof getRWGEffectsSummary === 'function') {
    try { return getRWGEffectsSummary(); } catch(_) {}
  }
  // Fallback: build from globals
  const mgr = typeof rwgManager !== 'undefined' ? rwgManager : globalThis.rwgManager;
  const sm = typeof spaceManager !== 'undefined' ? spaceManager : globalThis.spaceManager;
  const RWG = typeof RWG_EFFECTS !== 'undefined' ? RWG_EFFECTS : (globalThis.RWG_EFFECTS || {});
  if (!sm || !RWG) return [];

  const unlocked = new Set();
  if (mgr && typeof mgr.isTypeLocked === 'function') {
    Object.keys(RWG).forEach(t => { if (!mgr.isTypeLocked(t)) unlocked.add(t); });
  } else {
    Object.keys(RWG).forEach(t => unlocked.add(t));
  }

  const counts = {};
  const statuses = sm.randomWorldStatuses || {};
  for (const k in statuses) {
    const st = statuses[k];
    const cls = st && st.original && st.original.override && st.original.override.classification;
    const type = (typeof cls === 'string') ? cls : (cls && cls.archetype);
    if (st && st.terraformed && type) counts[type] = (counts[type] || 0) + 1;
  }

  const out = [];
  for (const [type, effects] of Object.entries(RWG)) {
    if (!unlocked.has(type)) continue;
    const count = counts[type] || 0;
    const effs = effects.map(eff => {
      const raw = typeof eff.computeValue === 'function' ? eff.computeValue(count, eff) : eff.value;
      let display = '';
      let descr = eff.description || '';
      if (eff.type === 'productionMultiplier') {
        const percent = (raw - 1) * 100;
        const what = RWG_BUILDING_OUTPUT[eff.targetId] || 'Production';
        const fEach = (typeof eff.factor === 'number' ? eff.factor : 0.1) * 100;
        descr = descr || `${what} production increased (+${fEach.toFixed(0)}% each)`;
        display = `${percent >= 0 ? '+' : ''}${percent.toFixed(0)}%`;
      } else if (eff.type === 'projectDurationMultiplier') {
        // Show as divided by (1 + factor * count)
        const f = typeof eff.factor === 'number' ? eff.factor : 0.1;
        const divisor = 1 + f * count;
        const name = RWG_PROJECT_NAMES[eff.targetId] || eff.targetId || 'Project';
        const fEach = (f * 100).toFixed(0);
        descr = descr || `${name} duration (${fEach}% each)`;
        display = `/${divisor.toFixed(1)}`;
      } else if (eff.type === 'globalPopulationGrowth') {
        const percent = raw * 100;
        const fEach = (typeof eff.factor === 'number' ? eff.factor : 0.01) * 100;
        descr = descr || `Population growth rate increased (+${fEach.toFixed(0)}% each)`;
        display = `${percent >= 0 ? '+' : ''}${percent.toFixed(0)}%`;
      } else if (eff.type === 'extraTerraformedWorlds') {
        // Super-Earth: counts as extra worlds; display +N not xN
        descr = descr || 'Counts as an extra world';
        display = `+${(raw ?? count)}`;
      } else if (typeof raw === 'number') {
        display = `x${raw.toFixed(3)}`;
      }
      return { effectId: eff.effectId, type: eff.type, description: descr, display };
    });
    out.push({ type, count, effects: effs });
  }
  
  return out;
}

function updateRWGEffectsUI() {
  if (!_ensureRWGEffectsUI()) return;
  const summary = _computeRWGEffectsSummary();
  // Signature to detect changes
  const key = JSON.stringify(summary);
  if (key === _rwgEffectsLastKey) return;
  _rwgEffectsLastKey = key;

  // Build markup as 3-column rows: Type/Desc | Terraformed | Effect
  const parts = [];
  // Table header
  parts.push(`
    <div class="rwg-effects-row rwg-effects-table-head">
      <span class="col-type">Type</span>
      <span class="col-count">Amount</span>
      <span class="col-effect">Value</span>
    </div>
  `);
  let altFlip = false; // alternate background per group (header + effects)
  for (const entry of summary) {
    const nice = (globalThis.RWG_WORLD_TYPES && globalThis.RWG_WORLD_TYPES[entry.type]?.displayName)
      || _titleCaseArchetype(entry.type);
    // Flip once per group
    altFlip = !altFlip;
    const groupAlt = altFlip ? ' alt' : '';
    // Header row per type
    parts.push(`
      <div class="rwg-effects-row rwg-effects-head${groupAlt}" data-type="${entry.type}">
        <span class="col-type"><strong>${nice}</strong></span>
        <span class="col-count"></span>
        <span class="col-effect"></span>
      </div>
    `);
    for (const eff of entry.effects) {
      parts.push(`
        <div class="rwg-effects-row rwg-effects-body${groupAlt}" data-effect="${eff.effectId}">
          <span class="col-desc"><small>${eff.description || ''}</small></span>
          <span class="col-count">${entry.count}</span>
          <span class="col-effect">${eff.display || ''}</span>
        </div>
      `);
    }
  }
  _rwgEffectsListEl.innerHTML = parts.join('');
}

if (typeof globalThis !== 'undefined') {
  globalThis.updateRWGEffectsUI = updateRWGEffectsUI;
}

try { module.exports = { updateRWGEffectsUI }; } catch(_) {}




