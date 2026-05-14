"use strict";

// Cached elements
let _rwgEffectsInitialized = false;
let _rwgEffectsCardEl = null;
let _rwgEffectsListEl = null;
let _rwgEffectsLastKey = '';
const RWG_EFFECTS_TOOLTIP_TEXT = 'Bonuses from terraforming random worlds of each type';

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
  geothermalGenerator: 'Geothermal Generator',
  fusionPowerPlant: 'Fusion Reactor',
  superalloyFusionReactor: 'Superalloy Fusion Reactor',
  spaceMirror: 'Space Mirror',
  hyperionLantern: 'Hyperion Lantern',
};

function _titleCaseArchetype(t) {
  try {
    return String(t)
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  } catch(_) { return String(t || ''); }
}

function resetRWGEffectsUI() {
  _rwgEffectsInitialized = false;
  _rwgEffectsCardEl = null;
  _rwgEffectsListEl = null;
  _rwgEffectsLastKey = '';
}

function _ensureRWGEffectsUI() {
  if (_rwgEffectsInitialized) {
    try {
      if (_rwgEffectsCardEl.isConnected) return true;
    } catch (_) {
      resetRWGEffectsUI();
    }
  }
  const container = typeof document !== 'undefined' ? document.getElementById('space-random') : null;
  if (!container) return false;

  const card = document.createElement('div');
  card.className = 'rwg-card';
  card.id = 'rwg-effects-card';
  card.innerHTML = `
    <div class="card-header">
      <h3 class="card-title">Random World Effects <span id="rwg-effects-info" class="info-tooltip-icon">&#9432;</span></h3>
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
  attachDynamicInfoTooltip(card.querySelector('#rwg-effects-info'), RWG_EFFECTS_TOOLTIP_TEXT);
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

  let counts = {};
  let hazardBonuses = {};
  if (sm.getRandomWorldEffectCounts instanceof Function) {
    const cached = sm.getRandomWorldEffectCounts();
    counts = cached?.counts || {};
    hazardBonuses = cached?.hazardBonuses || {};
  } else {
    const statuses = sm.randomWorldStatuses || {};
    for (const k in statuses) {
      const st = statuses[k];
      const type = getRandomWorldType(st);
      if (st && st.terraformed && type) {
        counts[type] = (counts[type] || 0) + 1;
        const hazardCount = countRandomWorldHazards(st);
        if (hazardCount) hazardBonuses[type] = (hazardBonuses[type] || 0) + hazardCount;
      }
    }
  }

  const out = [];
  const orderedTypes = [];
  const metaOrder = globalThis.RWG_WORLD_TYPES || {};
  Object.keys(metaOrder).forEach((type) => {
    if (RWG[type]) orderedTypes.push(type);
  });
  Object.keys(RWG).forEach((type) => {
    if (!orderedTypes.includes(type)) orderedTypes.push(type);
  });

  for (const type of orderedTypes) {
    const effects = RWG[type];
    if (!unlocked.has(type)) continue;
    const baseCount = counts[type] || 0;
    const bonus = hazardBonuses[type] || 0;
    const effectiveCount = baseCount + bonus;
    const effs = effects.filter((eff) => !eff.hideInSummary).map(eff => {
      const raw = typeof eff.computeValue === 'function' ? eff.computeValue(effectiveCount, eff) : eff.value;
      let display = '';
      let descr = eff.descriptionKey
        ? getRwgUiText(eff.descriptionKey, eff.description || '')
        : (eff.description || '');
      if (eff.type === 'productionMultiplier') {
        const percent = (raw - 1) * 100;
        const what = RWG_BUILDING_OUTPUT[eff.targetId] || 'Production';
        const fEach = (eff.factor ?? 0.2) * 100;
        descr = descr || `${what} production increased (+${fEach.toFixed(0)}% each)`;
        display = `${percent >= 0 ? '+' : ''}${percent.toFixed(0)}%`;
      } else if (eff.type === 'projectDurationMultiplier') {
        // Show as divided by (1 + factor * count)
        const f = eff.factor ?? 0.2;
        const divisor = 1 + f * effectiveCount;
        const name = RWG_PROJECT_NAMES[eff.targetId] || eff.targetId || 'Project';
        const fEach = (f * 100).toFixed(0);
        descr = descr || `${name} duration (${fEach}% each)`;
        display = `/${divisor.toFixed(2)}`;
      } else if (eff.type === 'globalPopulationGrowth') {
        const percent = raw * 100;
        const fEach = (eff.factor ?? 0.02) * 100;
        descr = descr || `Population growth rate increased (+${fEach.toFixed(0)}% each)`;
        display = `${percent >= 0 ? '+' : ''}${percent.toFixed(0)}%`;
      } else if (eff.type === 'lifeDesignPointBonus') {
        const fEach = eff.factor ?? 1;
        descr = descr || `Life design points (+${fEach} each)`;
        display = `${raw >= 0 ? '+' : ''}${raw}`;
      } else if (eff.type === 'globalWorkerReduction') {
        const each = eff.factor ?? 0.02;
        const divisor = 1 + each * effectiveCount;
        const eachPct = (each * 100).toFixed(0);
        descr = descr || `Worker requirements divided by (1+${eachPct}% each)`;
        display = divisor > 0 ? `/${divisor.toFixed(2)}` : '—';
      } else if (eff.type === 'extraTerraformedWorlds') {
        // Super-Earth: counts as extra worlds; display +N not xN
        descr = descr || 'Counts as an extra world';
        display = `+${(raw ?? effectiveCount)}`;
      } else if (eff.type === 'globalMaintenanceReduction') {
        const each = eff.factor ?? 0.02;
        const divisor = 1 + each * effectiveCount;
        const eachPct = (each * 100).toFixed(0);
        descr = descr || `Maintenance divided by (${eachPct}% each)`;
        display = divisor > 0 ? `/${divisor.toFixed(2)}` : '—';
      } else if (eff.type === 'globalCostReduction') {
        const each = eff.factor ?? 0.01;
        const divisor = 1 + each * Math.sqrt(Math.max(0, effectiveCount));
        const eachPct = (each * 100).toFixed(0);
        descr = descr || `Building and colony construction cost divided by (1+${eachPct}% × √N)`;
        display = divisor > 0 ? `/${divisor.toFixed(3)}` : '—';
      } else if (eff.type === 'resourceCostMultiplier') {
        const divisor = raw > 0 ? 1 / raw : 0;
        const what = RWG_BUILDING_OUTPUT[eff.targetId] || (eff.targetId || 'Cost');
        const perWorld = eff.factor ?? 0;
        descr = descr || `${what} construction cost (/(1+${perWorld.toFixed(1)}xN))`;
        display = divisor > 0 ? `/${divisor.toFixed(1)}` : '—';
      } else if (eff.type === 'importCapMultiplier') {
        const each = eff.factor ?? 0.2;
        const divisor = 1 + each * effectiveCount;
        const eachPct = (each * 100).toFixed(0);
        descr = descr || `Import cap divided by (1+${eachPct}% each)`;
        display = divisor > 0 ? `/${divisor.toFixed(2)}` : '—';
      } else if (eff.type === 'flavorText') {
        descr = descr || '';
        display = '—';
      } else if (typeof raw === 'number') {
        display = `x${raw.toFixed(3)}`;
      }
      return { effectId: eff.effectId, type: eff.type, description: descr, display };
    });
    out.push({ type, count: baseCount, hazardBonus: bonus, totalCount: effectiveCount, effects: effs });
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

  const rows = [];
  rows.push({
    kind: 'table-head',
    className: 'rwg-effects-row rwg-effects-table-head',
    type: 'Type',
    count: 'Amount',
    effect: 'Value'
  });
  let altFlip = false; // alternate background per group (header + effects)
  for (const entry of summary) {
    const nice = (globalThis.RWG_WORLD_TYPES && globalThis.RWG_WORLD_TYPES[entry.type]?.displayName)
      || entry.type;
    // Flip once per group
    altFlip = !altFlip;
    const groupAlt = altFlip ? ' alt' : '';
    const countText = entry.hazardBonus ? `${entry.count}+${entry.hazardBonus}` : `${entry.count}`;
    rows.push({
      kind: 'head',
      className: `rwg-effects-row rwg-effects-head${groupAlt}`,
      dataType: entry.type,
      type: nice,
      strongType: true,
      count: '',
      effect: ''
    });
    for (const eff of entry.effects) {
      rows.push({
        kind: 'body',
        className: `rwg-effects-row rwg-effects-body${groupAlt}`,
        dataEffect: eff.effectId,
        type: eff.description || '',
        smallType: true,
        count: countText,
        effect: eff.display || ''
      });
    }
  }

  _rwgEffectsListEl._rows ||= [];
  rows.forEach((rowData, index) => {
    let row = _rwgEffectsListEl._rows[index];
    if (!row) {
      row = document.createElement('div');
      const type = document.createElement('span');
      const count = document.createElement('span');
      const effect = document.createElement('span');
      row.append(type, count, effect);
      row._refs = { type, count, effect };
      _rwgEffectsListEl._rows[index] = row;
      _rwgEffectsListEl.appendChild(row);
    }
    row.style.display = '';
    if (row.className !== rowData.className) {
      row.className = rowData.className;
    }
    if (rowData.dataType) {
      row.dataset.type = rowData.dataType;
    } else {
      delete row.dataset.type;
    }
    if (rowData.dataEffect) {
      row.dataset.effect = rowData.dataEffect;
    } else {
      delete row.dataset.effect;
    }

    const typeClass = rowData.kind === 'body' ? 'col-desc' : 'col-type';
    if (row._refs.type.className !== typeClass) {
      row._refs.type.className = typeClass;
    }
    row._refs.count.className = 'col-count';
    row._refs.effect.className = 'col-effect';

    if (rowData.strongType) {
      if (!row._strongType) {
        row._refs.type.textContent = '';
        row._strongType = document.createElement('strong');
        row._refs.type.appendChild(row._strongType);
      }
      row._strongType.textContent = rowData.type;
      row._smallType = null;
    } else if (rowData.smallType) {
      if (!row._smallType) {
        row._refs.type.textContent = '';
        row._smallType = document.createElement('small');
        row._refs.type.appendChild(row._smallType);
      }
      row._smallType.textContent = rowData.type;
      row._strongType = null;
    } else {
      row._strongType = null;
      row._smallType = null;
      if (row._refs.type.textContent !== rowData.type) {
        row._refs.type.textContent = rowData.type;
      }
    }
    if (row._refs.count.textContent !== rowData.count) {
      row._refs.count.textContent = rowData.count;
    }
    if (row._refs.effect.textContent !== rowData.effect) {
      row._refs.effect.textContent = rowData.effect;
    }
  });

  for (let index = rows.length; index < _rwgEffectsListEl._rows.length; index += 1) {
    _rwgEffectsListEl._rows[index].style.display = 'none';
  }
}

try { module.exports = { updateRWGEffectsUI, resetRWGEffectsUI }; } catch(_) {}




