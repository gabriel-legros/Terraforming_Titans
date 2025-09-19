if (typeof makeCollapsibleCard === 'undefined') {
  var makeCollapsibleCard = (typeof globalThis !== 'undefined' && globalThis.makeCollapsibleCard)
    ? globalThis.makeCollapsibleCard
    : null;
  try {
    if (!makeCollapsibleCard && typeof require === 'function') {
      ({ makeCollapsibleCard } = require('../ui-utils.js'));
    }
  } catch (e) {}
}

// Mirror oversight controls
function createDefaultMirrorOversightSettings() {
  return {
    distribution: { tropical: 0, temperate: 0, polar: 0, focus: 0, unassigned: 0 },
    applyToLantern: false,
    useFinerControls: false,
    assignmentStep: { mirrors: 1, lanterns: 1 },
    advancedOversight: false,
    targets: { tropical: 0, temperate: 0, polar: 0, water: 0 },
    waterMultiplier: 1000,
    tempMode: { tropical: 'average', temperate: 'average', polar: 'average' },
    priority: { tropical: 1, temperate: 1, polar: 1, focus: 1 },
    autoAssign: { tropical: false, temperate: false, polar: false, focus: false, any: false },
      assignments: {
        mirrors: { tropical: 0, temperate: 0, polar: 0, focus: 0, unassigned: 0, any: 0 },
        lanterns: { tropical: 0, temperate: 0, polar: 0, focus: 0, unassigned: 0, any: 0 },
        reversalMode: { tropical: false, temperate: false, polar: false, focus: false, any: false }
      }
  };
}

var mirrorOversightSettings = null;

var advancedAssignmentInProgress = false;


function setMirrorDistribution(zone, value) {
  const zones = ['tropical', 'temperate', 'polar', 'focus', 'unassigned'];
  const dist = mirrorOversightSettings.distribution;
  const v = Math.max(0, Math.min(100, Math.round(value))) / 100;

  if (zone === 'any') {
    const currentAny = 1 - (dist.tropical + dist.temperate + dist.polar + dist.focus + dist.unassigned);
    let delta = v - currentAny;
    if (delta > 0) {
      const sorted = zones.map(z => ({ zone: z, val: dist[z] }))
        .sort((a, b) => b.val - a.val);
      for (const item of sorted) {
        if (delta <= 0) break;
        const take = Math.min(item.val, delta);
        dist[item.zone] = item.val - take;
        delta -= take;
      }
    } else if (delta < 0) {
      let remaining = -delta;
      const sorted = zones.map(z => ({ zone: z, val: dist[z] }))
        .sort((a, b) => b.val - a.val);
      for (const item of sorted) {
        if (remaining <= 0) break;
        const add = Math.min(1 - item.val, remaining);
        dist[item.zone] = item.val + add;
        remaining -= add;
      }
    }
  } else if (zone === 'unassigned') {
    dist.unassigned = v;
    let total = dist.tropical + dist.temperate + dist.polar + dist.focus + dist.unassigned;
    if (total > 1) {
      let excess = total - 1;
      ['tropical', 'temperate', 'polar', 'focus']
        .sort((a, b) => dist[b] - dist[a])
        .forEach(z => {
          if (excess > 0) {
            const reduce = Math.min(dist[z], excess);
            dist[z] = Math.max(0, dist[z] - reduce);
            excess -= reduce;
          }
        });
    }
  } else if (zones.includes(zone)) {
    const prev = dist[zone];
    dist[zone] = v;
    if (v < prev) {
      const add = Math.min(prev - v, 1 - dist.unassigned);
      dist.unassigned += add;
    }
    let total = dist.tropical + dist.temperate + dist.polar + dist.focus + dist.unassigned;
    if (total > 1) {
      let excess = total - 1;
      zones.filter(z => z !== zone)
        .sort((a, b) => dist[b] - dist[a])
        .forEach(z => {
          if (excess > 0) {
            const reduce = Math.min(dist[z], excess);
            dist[z] = Math.max(0, dist[z] - reduce);
            excess -= reduce;
          }
        });
    }
  } else {
    return;
  }

  zones.forEach(z => {
    dist[z] = Math.max(0, Math.min(1, dist[z]));
  });

  updateMirrorOversightUI();
}

function resetMirrorOversightSettings() {
  mirrorOversightSettings.distribution.tropical = 0;
  mirrorOversightSettings.distribution.temperate = 0;
  mirrorOversightSettings.distribution.polar = 0;
  mirrorOversightSettings.distribution.focus = 0;
  mirrorOversightSettings.distribution.unassigned = 0;
  mirrorOversightSettings.applyToLantern = false;
  mirrorOversightSettings.useFinerControls = false;
  mirrorOversightSettings.assignmentStep = { mirrors: 1, lanterns: 1 };
  mirrorOversightSettings.advancedOversight = false;
  mirrorOversightSettings.targets = { tropical: 0, temperate: 0, polar: 0, water: 0 };
  mirrorOversightSettings.waterMultiplier = 1000;
  mirrorOversightSettings.tempMode = { tropical: 'average', temperate: 'average', polar: 'average' };
  mirrorOversightSettings.priority = { tropical: 1, temperate: 1, polar: 1, focus: 1 };
  mirrorOversightSettings.autoAssign = { tropical: false, temperate: false, polar: false, focus: false, any: false };
  mirrorOversightSettings.assignments.mirrors = { tropical: 0, temperate: 0, polar: 0, focus: 0, unassigned: 0, any: 0 };
  mirrorOversightSettings.assignments.lanterns = { tropical: 0, temperate: 0, polar: 0, focus: 0, unassigned: 0, any: 0 };
  mirrorOversightSettings.assignments.reversalMode = { tropical: false, temperate: false, polar: false, focus: false, any: false };
  updateMirrorOversightUI();
}

function distributeAssignmentsFromSliders(type) {
  if (typeof buildings === 'undefined') return;
  const dist = mirrorOversightSettings.distribution || {};
  const total = type === 'mirrors'
    ? (buildings.spaceMirror?.active || 0)
    : (buildings.hyperionLantern?.active || 0);
  const zones = ['tropical', 'temperate', 'polar', 'focus', 'unassigned'];
  const raw = zones.map(z => ({ zone: z, value: total * Math.max(0, dist[z] || 0) }));
  if (!mirrorOversightSettings.advancedOversight) {
    const usedPerc = zones.reduce((s, z) => s + (dist[z] || 0), 0);
    const globalPerc = Math.max(0, 1 - usedPerc);
    raw.push({ zone: 'any', value: total * globalPerc });
  }
  const assignments = {};
  let used = 0;
  raw.forEach(r => {
    assignments[r.zone] = Math.floor(r.value);
    used += assignments[r.zone];
  });
  let remaining = Math.max(0, total - used);
  raw.sort((a, b) => (b.value % 1) - (a.value % 1));
  for (const r of raw) {
    if (remaining <= 0) break;
    assignments[r.zone] += 1;
    remaining--;
  }
  if (mirrorOversightSettings.advancedOversight) assignments.any = 0;
  mirrorOversightSettings.assignments[type] = assignments;
  distributeAutoAssignments(type);
}

function distributeAutoAssignments(type) {
  if (typeof buildings === 'undefined') return;
  const zones = ['tropical', 'temperate', 'polar', 'focus'];
  if (!mirrorOversightSettings.advancedOversight) zones.push('any');
  const total = type === 'mirrors'
    ? (buildings.spaceMirror?.active || 0)
    : (buildings.hyperionLantern?.active || 0);
  const assignments = mirrorOversightSettings.assignments[type];
  zones.forEach(z => {
    if (mirrorOversightSettings.autoAssign[z]) assignments[z] = 0;
  });
  let used = zones.reduce((s, z) => s + Math.max(0, assignments[z] || 0), 0);
  used += Math.max(0, assignments.unassigned || 0);
  let remaining = Math.max(0, total - used);
  const activeZones = zones.filter(z => mirrorOversightSettings.autoAssign[z]);
  if (activeZones.length && remaining > 0) {
    if (!mirrorOversightSettings.advancedOversight && mirrorOversightSettings.autoAssign.any) {
      const dist = mirrorOversightSettings.distribution || {};
      const globalPerc = Math.max(0, 1 - ((dist.tropical || 0) + (dist.temperate || 0) + (dist.polar || 0) + (dist.focus || 0)));
      if (activeZones.length === 1) {
        assignments.any += remaining;
        remaining = 0;
      } else {
        const target = Math.round(total * globalPerc);
        const add = Math.min(remaining, Math.max(0, target - assignments.any));
        assignments.any += add;
        remaining -= add;
      }
    }
    const otherZones = activeZones.filter(z => z !== 'any');
    if (otherZones.length && remaining > 0) {
      const base = Math.floor(remaining / otherZones.length);
      otherZones.forEach(z => {
        assignments[z] += base;
      });
      remaining -= base * otherZones.length;
      for (const z of otherZones) {
        if (remaining <= 0) break;
        assignments[z] += 1;
        remaining--;
      }
    }
  }
}

function toggleFinerControls(enabled) {
  mirrorOversightSettings.useFinerControls = enabled;
  if (enabled) {
    distributeAssignmentsFromSliders('mirrors');
    distributeAssignmentsFromSliders('lanterns');
  }
  updateMirrorOversightUI();
}

function sanitizeMirrorDistribution() {
  const dist = mirrorOversightSettings.distribution;
  const zones = ['tropical', 'temperate', 'polar', 'focus', 'unassigned'];
  let total = 0;
  let changed = false;

  zones.forEach(zone => {
    let v = dist[zone];
    if (v < 0) {
      v = 0;
      changed = true;
    } else if (v > 1) {
      v = 1;
      changed = true;
    }
    dist[zone] = v;
    total += v;
  });

  if (total > 1) {
    changed = true;
    if (total > 1) {
      let excess = total - 1;
      zones
        .slice()
        .sort((a, b) => dist[b] - dist[a])
        .forEach(zone => {
          if (excess <= 0) return;
          const reduce = Math.min(dist[zone], excess);
          dist[zone] -= reduce;
          excess -= reduce;
        });
    } else {
      let deficit = 1 - total;
      zones
        .slice()
        .sort((a, b) => dist[b] - dist[a])
        .forEach(zone => {
          if (deficit <= 0) return;
          const add = Math.min(1 - dist[zone], deficit);
          dist[zone] += add;
          deficit -= add;
        });
    }
  }

  if (changed && typeof updateMirrorOversightUI === 'function') {
    updateMirrorOversightUI();
  }
}

function updateAssignmentDisplays() {
  const types = ['mirrors', 'lanterns'];
  const zones = ['tropical', 'temperate', 'polar', 'focus'];
  if (!mirrorOversightSettings.advancedOversight) zones.push('any');
  types.forEach(type => {
    zones.forEach(zone => {
      const el = document.getElementById(`${type}-assign-${zone}`);
      if (el) {
        el.textContent = formatBuildingCount(mirrorOversightSettings.assignments[type][zone] || 0);
      }
    });

    const availableEl = document.getElementById(`available-${type}`);
    if (availableEl) {
      const total = type === 'mirrors'
        ? (buildings?.spaceMirror?.active || 0)
        : (buildings?.hyperionLantern?.active || 0);
      const assigned = zones.reduce((s, z) => s + (mirrorOversightSettings.assignments[type][z] || 0), 0);
      availableEl.textContent = formatBuildingCount(Math.max(0, total - assigned));
    }
  });
  types.forEach(type => {
    const step = mirrorOversightSettings.assignmentStep?.[type] || 1;
    const stepEl = document.querySelector(`.assignment-step-display[data-type="${type}"]`);
    if (stepEl) stepEl.textContent = `x${formatNumber(step, true)}`;
  });

  zones.forEach(zone => {
    types.forEach(type => {
      const step = mirrorOversightSettings.assignmentStep?.[type] || 1;
      const plusBtn = document.querySelector(`.assign-plus[data-type="${type}"][data-zone="${zone}"]`);
      if (plusBtn) plusBtn.textContent = `+${formatNumber(step, true)}`;
      const minusBtn = document.querySelector(`.assign-minus[data-type="${type}"][data-zone="${zone}"]`);
      if (minusBtn) minusBtn.textContent = `-${formatNumber(step, true)}`;
    });
    const checkbox = document.querySelector(`.reversal-checkbox[data-zone="${zone}"]`);
    if (checkbox) {
        if (!mirrorOversightSettings.assignments.reversalMode) mirrorOversightSettings.assignments.reversalMode = { tropical: false, temperate: false, polar: false, focus: false, any: false };
      checkbox.checked = !!mirrorOversightSettings.assignments.reversalMode[zone];
    }
  });
}


// Toggle Advanced Oversight mode: uses assignments, hides 'any', and seeds default targets
function toggleAdvancedOversight(enable) {
  const wasAdvanced = !!mirrorOversightSettings.advancedOversight;
  mirrorOversightSettings.advancedOversight = !!enable;
  if (enable) {
    mirrorOversightSettings.useFinerControls = true;
    mirrorOversightSettings.autoAssign.any = false;
    mirrorOversightSettings.autoAssign.tropical = false;
    mirrorOversightSettings.autoAssign.temperate = false;
    mirrorOversightSettings.autoAssign.polar = false;
    mirrorOversightSettings.autoAssign.focus = false;
    if (mirrorOversightSettings.assignments?.mirrors) mirrorOversightSettings.assignments.mirrors.any = 0;
    if (mirrorOversightSettings.assignments?.lanterns) mirrorOversightSettings.assignments.lanterns.any = 0;
    const defK = 293.15;
    if (!mirrorOversightSettings.targets || typeof mirrorOversightSettings.targets !== 'object') {
      mirrorOversightSettings.targets = { tropical: defK, temperate: defK, polar: defK, water: 0 };
    } else {
      if (!mirrorOversightSettings.targets.tropical) mirrorOversightSettings.targets.tropical = defK;
      if (!mirrorOversightSettings.targets.temperate) mirrorOversightSettings.targets.temperate = defK;
      if (!mirrorOversightSettings.targets.polar) mirrorOversightSettings.targets.polar = defK;
      if (!mirrorOversightSettings.targets.water) mirrorOversightSettings.targets.water = 0;
    }
    if (!mirrorOversightSettings.tempMode || typeof mirrorOversightSettings.tempMode !== 'object') {
      mirrorOversightSettings.tempMode = { tropical: 'average', temperate: 'average', polar: 'average' };
    } else {
      if (!mirrorOversightSettings.tempMode.tropical) mirrorOversightSettings.tempMode.tropical = 'average';
      if (!mirrorOversightSettings.tempMode.temperate) mirrorOversightSettings.tempMode.temperate = 'average';
      if (!mirrorOversightSettings.tempMode.polar) mirrorOversightSettings.tempMode.polar = 'average';
    }
  } else if (wasAdvanced) {
    mirrorOversightSettings.useFinerControls = true;
  }
  if (typeof updateMirrorOversightUI === 'function') updateMirrorOversightUI();
}

function initializeMirrorOversightUI(container) {
  if (!container) return;
  const div = document.createElement('div');
  div.id = 'mirror-oversight-container';
  div.classList.add('mirror-oversight-card');
  div.style.display = 'none';

  div.innerHTML = `
    <div class="card-header">
      <span class="card-title">Mirror Oversight</span>
      <span class="info-tooltip-icon" title="Distribute mirror focus among zones."></span>
    </div>
    <div class="card-body">
      <div id="mirror-oversight-sliders">
      <div class="control-group">
        <label for="mirror-oversight-tropical">Tropical:</label>
        <input type="range" id="mirror-oversight-tropical" min="0" max="100" step="1" value="0">
        <span id="mirror-oversight-tropical-value" class="slider-value">0%</span>
        <input type="checkbox" id="mirror-oversight-tropical-reverse" class="slider-reversal-checkbox" data-zone="tropical" style="display:none;">
        <label for="mirror-oversight-tropical-reverse" class="slider-reverse-label" style="display:none;">Reverse</label>
      </div>
      <div class="control-group">
        <label for="mirror-oversight-temperate">Temperate:</label>
        <input type="range" id="mirror-oversight-temperate" min="0" max="100" step="1" value="0">
        <span id="mirror-oversight-temperate-value" class="slider-value">0%</span>
        <input type="checkbox" id="mirror-oversight-temperate-reverse" class="slider-reversal-checkbox" data-zone="temperate" style="display:none;">
        <label for="mirror-oversight-temperate-reverse" class="slider-reverse-label" style="display:none;">Reverse</label>
      </div>
      <div class="control-group">
        <label for="mirror-oversight-polar">Polar:</label>
        <input type="range" id="mirror-oversight-polar" min="0" max="100" step="1" value="0">
        <span id="mirror-oversight-polar-value" class="slider-value">0%</span>
        <input type="checkbox" id="mirror-oversight-polar-reverse" class="slider-reversal-checkbox" data-zone="polar" style="display:none;">
        <label for="mirror-oversight-polar-reverse" class="slider-reverse-label" style="display:none;">Reverse</label>
      </div>
      <div class="control-group">
        <label for="mirror-oversight-any">Any Zone:</label>
        <input type="range" id="mirror-oversight-any" min="0" max="100" step="1" value="100">
        <span id="mirror-oversight-any-value" class="slider-value">100%</span>
        <input type="checkbox" id="mirror-oversight-any-reverse" class="slider-reversal-checkbox" data-zone="any" style="display:none;">
        <label for="mirror-oversight-any-reverse" class="slider-reverse-label" style="display:none;">Reverse</label>
      </div>
      <div id="mirror-oversight-focus-group" class="control-group" style="display:none;">
        <label for="mirror-oversight-focus">Focusing:<span class="info-tooltip-icon" title="Concentrate mirror and lantern energy on a single point to melt surface ice into liquid water. Only surface ice melts and the warmest zone with ice is targeted first. Uses the heat required to warm the ice to 0°C plus the energy of fusion/melting.">&#9432;</span></label>
        <input type="range" id="mirror-oversight-focus" min="0" max="100" step="1" value="0">
        <span id="mirror-oversight-focus-value" class="slider-value">0%</span>
        <input type="checkbox" id="mirror-oversight-focus-reverse" class="slider-reversal-checkbox" data-zone="focus" style="display:none; visibility:hidden;">
        <label for="mirror-oversight-focus-reverse" class="slider-reverse-label" style="display:none; visibility:hidden;">Reverse</label>
      </div>
      <div class="control-group">
        <label for="mirror-oversight-unassigned">Unassigned:</label>
        <input type="range" id="mirror-oversight-unassigned" min="0" max="100" step="1" value="0">
        <span id="mirror-oversight-unassigned-value" class="slider-value">0%</span>
        <input type="checkbox" id="mirror-oversight-unassigned-reverse" class="slider-reversal-checkbox" data-zone="unassigned" style="display:none; visibility:hidden;">
        <label for="mirror-oversight-unassigned-reverse" class="slider-reverse-label" style="display:none; visibility:hidden;">Reverse</label>
      </div>
      </div>
      <div id="mirror-oversight-lantern-div" class="control-group">
        <input type="checkbox" id="mirror-oversight-lantern">
        <label for="mirror-oversight-lantern">Apply to Hyperion Lantern</label>
      </div>
    </div>
  `;
  if (typeof makeCollapsibleCard === 'function') makeCollapsibleCard(div);

  const sliders = {
    tropical: div.querySelector('#mirror-oversight-tropical'),
    temperate: div.querySelector('#mirror-oversight-temperate'),
    polar: div.querySelector('#mirror-oversight-polar'),
    any: div.querySelector('#mirror-oversight-any'),
    focus: div.querySelector('#mirror-oversight-focus'),
    unassigned: div.querySelector('#mirror-oversight-unassigned'),
  };
  Object.keys(sliders).forEach(zone => {
    sliders[zone].addEventListener('input', () => {
      const raw = sliders[zone].value;
      const val = (typeof raw === 'number' || typeof raw === 'string') ? Number(raw) : 0;
      val < 0 ? 0 : val;
      val > 1 ? 1 : val;
      setMirrorDistribution(zone, val);
    });
  });

  const sliderReverse = {
    tropical: div.querySelector('#mirror-oversight-tropical-reverse'),
    temperate: div.querySelector('#mirror-oversight-temperate-reverse'),
    polar: div.querySelector('#mirror-oversight-polar-reverse'),
    any: div.querySelector('#mirror-oversight-any-reverse'),
  };
  Object.keys(sliderReverse).forEach(zone => {
    const box = sliderReverse[zone];
    if (!box) return;
      if (!mirrorOversightSettings.assignments.reversalMode) {
        mirrorOversightSettings.assignments.reversalMode = { tropical: false, temperate: false, polar: false, focus: false, any: false };
      }
    box.checked = !!mirrorOversightSettings.assignments.reversalMode[zone];
    box.addEventListener('change', () => {
      mirrorOversightSettings.assignments.reversalMode[zone] = box.checked;
      updateZonalFluxTable();
    });
  });

  const lanternCheckbox = div.querySelector('#mirror-oversight-lantern');
  lanternCheckbox.checked = mirrorOversightSettings.applyToLantern;
  lanternCheckbox.addEventListener('change', () => {
    mirrorOversightSettings.applyToLantern = lanternCheckbox.checked;
    updateMirrorOversightUI();
  });

  // Get the card body element
  const cardBody = div.querySelector('.card-body');

  // Advanced Oversight checkbox and controls (same line as lantern checkbox)
  const lanternDivInit = div.querySelector('#mirror-oversight-lantern-div');
  const advDiv = document.createElement('div');
  advDiv.id = 'mirror-advanced-oversight-div';
  advDiv.className = 'control-group';
  advDiv.style.display = 'none';
  advDiv.innerHTML = `
    <input type="checkbox" id="mirror-advanced-oversight">
    <label for="mirror-advanced-oversight">Advanced Oversight</label>
    <span class="info-tooltip-icon" title="Unlocks target-based control: set temperature targets per zone and a water melt target. Mirrors and lanterns auto-assign by priority when enabled; lower numbers are assigned first.">&#9432;</span>
  `;
  if (lanternDivInit) {
    lanternDivInit.style.display = 'flex';
    lanternDivInit.style.alignItems = 'center';
    lanternDivInit.style.gap = '12px';
    lanternDivInit.style.flexWrap = 'wrap';
    lanternDivInit.insertAdjacentElement('beforeend', advDiv);
  }

  const advancedControls = document.createElement('div');
  advancedControls.id = 'advanced-oversight-controls';
  advancedControls.style.display = 'none';
  advancedControls.innerHTML = `
    <div class="control-group">
      <span class="control-label" style="font-weight:600;">Targets & Priority</span>
      <span class="info-tooltip-icon" title="Set temperature targets for Tropical, Temperate, and Polar zones using the current unit, plus a water melt target when focusing. Priorities 1 to 5 decide assignment order; lower numbers are assigned first.">&#9432;</span>
    </div>
    <div class="stats-grid three-col" style="row-gap:8px;">
      <div class="stat-item" style="display:flex; gap:8px; align-items:center;">
        <label class="stat-label" for="adv-target-tropical">Tropical target</label>
        <input type="number" id="adv-target-tropical" class="stat-value" step="0.1" value="0" style="font-size:12px; width:60px;">
        <select id="adv-timing-tropical" class="stat-value" style="font-size:12px; width:80px;">
          <option value="average">Average</option>
          <option value="day">Day</option>
          <option value="night">Night</option>
        </select>
        <select id="adv-priority-tropical" class="stat-value" style="font-size:12px; width:40px;">
          <option>1</option><option>2</option><option>3</option><option>4</option><option>5</option>
        </select>
      </div>
      <div class="stat-item" style="display:flex; gap:8px; align-items:center;">
        <label class="stat-label" for="adv-target-temperate">Temperate target</label>
        <input type="number" id="adv-target-temperate" class="stat-value" step="0.1" value="0" style="font-size:12px; width:60px;">
        <select id="adv-timing-temperate" class="stat-value" style="font-size:12px; width:80px;">
          <option value="average">Average</option>
          <option value="day">Day</option>
          <option value="night">Night</option>
        </select>
        <select id="adv-priority-temperate" class="stat-value" style="font-size:12px; width:40px;">
          <option>1</option><option>2</option><option>3</option><option>4</option><option>5</option>
        </select>
      </div>
      <div class="stat-item" style="display:flex; gap:8px; align-items:center;">
        <label class="stat-label" for="adv-target-polar">Polar target</label>
        <input type="number" id="adv-target-polar" class="stat-value" step="0.1" value="0" style="font-size:12px; width:60px;">
        <select id="adv-timing-polar" class="stat-value" style="font-size:12px; width:80px;">
          <option value="average">Average</option>
          <option value="day">Day</option>
          <option value="night">Night</option>
        </select>
        <select id="adv-priority-polar" class="stat-value" style="font-size:12px; width:40px;">
          <option>1</option><option>2</option><option>3</option><option>4</option><option>5</option>
        </select>
      </div>
      <div class="stat-item" id="adv-water-row" style="display:flex; gap:8px; align-items:center;">
        <label class="stat-label" for="adv-target-water">Water melt target (t/s)</label>
        <input type="number" id="adv-target-water" class="stat-value" step="0.001" value="0" style="font-size:12px; width:75px;">
        <select id="adv-target-water-scale" class="stat-value" style="font-size:12px; width:50px;">
          <option value="1000">k</option>
          <option value="1000000">M</option>
          <option value="1000000000">B</option>
        </select>
        <select id="adv-priority-focus" class="stat-value" style="font-size:12px; width:40px;">
          <option>1</option><option>2</option><option>3</option><option>4</option><option>5</option>
        </select>
      </div>
    </div>
  `;
  // Append Targets & Priority below the checkboxes (after lantern-div)
  cardBody.appendChild(advancedControls);

  // Wire up advanced controls inputs
  const advCheckboxInit = div.querySelector('#mirror-advanced-oversight');
  if (advCheckboxInit) {
    advCheckboxInit.checked = !!mirrorOversightSettings.advancedOversight;
    advCheckboxInit.addEventListener('change', () => {
      toggleAdvancedOversight(advCheckboxInit.checked);
    });
  }
  const advInputs = {
    tropical: div.querySelector('#adv-target-tropical'),
    temperate: div.querySelector('#adv-target-temperate'),
    polar: div.querySelector('#adv-target-polar'),
    water: div.querySelector('#adv-target-water'),
  };
  const waterScaleSelect = div.querySelector('#adv-target-water-scale');
  const advPriority = {
    tropical: div.querySelector('#adv-priority-tropical'),
    temperate: div.querySelector('#adv-priority-temperate'),
    polar: div.querySelector('#adv-priority-polar'),
    focus: div.querySelector('#adv-priority-focus'),
  };
  const advTiming = {
    tropical: div.querySelector('#adv-timing-tropical'),
    temperate: div.querySelector('#adv-timing-temperate'),
    polar: div.querySelector('#adv-timing-polar'),
  };
  Object.keys(advInputs).forEach(k => {
    const el = advInputs[k];
    if (!el) return;
    const toDisp = (typeof toDisplayTemperature === 'function') ? toDisplayTemperature : (v => v);
    if (k === 'water') {
      const scale = mirrorOversightSettings.waterMultiplier || 1000;
      el.value = Number((mirrorOversightSettings.targets[k] || 0) / scale);
      el.addEventListener('change', () => {
        const raw = Number(el.value);
        const mul = mirrorOversightSettings.waterMultiplier || 1000;
        mirrorOversightSettings.targets.water = isNaN(raw) ? 0 : raw * mul;
      });
    } else {
      const base = (mirrorOversightSettings.targets[k] || 293.15);
      el.value = toDisp(base).toFixed(2);
      el.addEventListener('change', () => {
        let raw = Number(el.value);
        const useC = (typeof gameSettings !== 'undefined' && gameSettings.useCelsius);
        if (useC) raw = raw + 273.15; // convert back to Kelvin
        mirrorOversightSettings.targets[k] = isNaN(raw) ? 0 : raw;
      });
    }
  });
  if (waterScaleSelect) {
    waterScaleSelect.value = String(mirrorOversightSettings.waterMultiplier || 1000);
    waterScaleSelect.addEventListener('change', () => {
      const scale = Number(waterScaleSelect.value) || 1;
      mirrorOversightSettings.waterMultiplier = scale;
      const inputVal = Number(advInputs.water?.value) || 0;
      mirrorOversightSettings.targets.water = inputVal * scale;
    });
  }
  Object.keys(advPriority).forEach(k => {
    const el = advPriority[k];
    if (!el) return;
    const cur = mirrorOversightSettings.priority[k] || 1;
    el.value = String(cur);
    el.addEventListener('change', () => {
      const v = Math.max(1, Math.min(5, parseInt(el.value, 10) || 1));
      mirrorOversightSettings.priority[k] = v;
    });
  });
  Object.keys(advTiming).forEach(k => {
    const el = advTiming[k];
    if (!el) return;
    const cur = mirrorOversightSettings.tempMode?.[k] || 'average';
    el.value = cur;
    el.addEventListener('change', () => {
      const val = el.value === 'day' ? 'day' : (el.value === 'night' ? 'night' : 'average');
      if (!mirrorOversightSettings.tempMode) mirrorOversightSettings.tempMode = { tropical: 'average', temperate: 'average', polar: 'average' };
      mirrorOversightSettings.tempMode[k] = val;
    });
  });

  // Table showing zonal average solar flux and temperatures
  const fluxTable = document.createElement('table');
  fluxTable.id = 'mirror-flux-table';
  const tempUnit = (typeof getTemperatureUnit === 'function') ? getTemperatureUnit() : 'K';
  fluxTable.innerHTML = `
    <thead>
      <tr><th>Zone</th><th>Average Solar Flux (W/m^2)</th><th>Temperature (${tempUnit}) Current / Trend</th><th>Day Temperature (${tempUnit}) Current / Trend</th></tr>
    </thead>
    <tbody>
      <tr><td>Tropical</td><td id="mirror-flux-tropical">0</td><td id="mirror-temp-tropical">0 / 0</td><td id="mirror-day-temp-tropical">0 / 0</td></tr>
      <tr><td>Temperate</td><td id="mirror-flux-temperate">0</td><td id="mirror-temp-temperate">0 / 0</td><td id="mirror-day-temp-temperate">0 / 0</td></tr>
      <tr><td>Polar</td><td id="mirror-flux-polar">0</td><td id="mirror-temp-polar">0 / 0</td><td id="mirror-day-temp-polar">0 / 0</td></tr>
    </tbody>
  `;
  cardBody.appendChild(fluxTable);
  // Fix mis-encoded units in header
  try {
    const fluxHeader = fluxTable.querySelector('thead tr th:nth-child(2)');
    if (fluxHeader) fluxHeader.textContent = 'Average Solar Flux (W/m2)';
  } catch (e) {}

  const finerToggle = document.createElement('div');
  finerToggle.id = 'mirror-finer-toggle';
  finerToggle.classList.add('collapse-toggle');
  finerToggle.innerHTML = '<span id="mirror-finer-icon">▶</span> Finer Controls';
  finerToggle.style.cursor = 'pointer';
  const finerContent = document.createElement('div');
  finerContent.id = 'mirror-finer-content';
  finerContent.style.display = 'none';
  finerContent.innerHTML = `
    <div class="finer-controls-header">
      <div class="control-group">
        <input type="checkbox" id="mirror-use-finer">
        <label for="mirror-use-finer">Use Finer Controls</label>
      </div>
      <!-- Step controls moved next to Available counts for each type. -->
    </div>
    <div id="assignment-grid">
      <div class="grid-header">Zone</div>
      <div class="grid-header">Mirrors</div>
      <div class="grid-header">Lanterns</div>
      <div class="grid-header">Reversal</div>
      <div class="grid-header">Auto</div>

      <div class="grid-zone-label">Available</div>
      <div class="assign-cell available-mirror-cell">
        <button class="assign-zero" style="visibility: hidden;">0</button>
        <button class="assignment-div10" data-type="mirrors">/10</button>
        <span id="available-mirrors">0</span>
        <button class="assignment-mul10" data-type="mirrors">x10</button>
        <button class="assign-max" style="visibility: hidden;">Max</button>
      </div>
      <div class="assign-cell available-lantern-cell" data-type="lanterns">
        <button class="assign-zero" style="visibility: hidden;">0</button>
        <button class="assignment-div10" data-type="lanterns">/10</button>
        <span id="available-lanterns">0</span>
        <button class="assignment-mul10" data-type="lanterns">x10</button>
        <button class="assign-max" style="visibility: hidden;">Max</button>
      </div>
      <div class="grid-reversal-cell"></div>
      <div class="grid-auto-cell"></div>

      ${['tropical', 'temperate', 'polar', 'any'].map(zone => `
        <div class="grid-zone-label" data-zone="${zone}">${zone === 'any' ? 'Any Zone' : zone.charAt(0).toUpperCase() + zone.slice(1)}</div>
        <div class="assign-cell" data-type="mirrors" data-zone="${zone}">
          <button class="assign-zero" data-type="mirrors" data-zone="${zone}">0</button>
          <button class="assign-minus" data-type="mirrors" data-zone="${zone}">-1</button>
          <span id="mirrors-assign-${zone}">0</span>
          <button class="assign-plus" data-type="mirrors" data-zone="${zone}">+1</button>
          <button class="assign-max" data-type="mirrors" data-zone="${zone}">Max</button>
        </div>
        <div class="assign-cell" data-type="lanterns" data-zone="${zone}">
          <button class="assign-zero" data-type="lanterns" data-zone="${zone}">0</button>
          <button class="assign-minus" data-type="lanterns" data-zone="${zone}">-1</button>
          <span id="lanterns-assign-${zone}">0</span>
          <button class="assign-plus" data-type="lanterns" data-zone="${zone}">+1</button>
          <button class="assign-max" data-type="lanterns" data-zone="${zone}">Max</button>
        </div>
        <div class="grid-reversal-cell reversal-cell-with-checkbox">
          <input type="checkbox" class="reversal-checkbox" data-zone="${zone}">
        </div>
        <div class="grid-auto-cell">
          <input type="checkbox" class="auto-assign" data-zone="${zone}">
        </div>
      `).join('')}
      <div class="grid-zone-label" data-zone="focus" style="display:none;">Focusing</div>
      <div class="assign-cell" data-type="mirrors" data-zone="focus" style="display:none;">
        <button class="assign-zero" data-type="mirrors" data-zone="focus">0</button>
        <button class="assign-minus" data-type="mirrors" data-zone="focus">-1</button>
        <span id="mirrors-assign-focus">0</span>
        <button class="assign-plus" data-type="mirrors" data-zone="focus">+1</button>
        <button class="assign-max" data-type="mirrors" data-zone="focus">Max</button>
      </div>
      <div class="assign-cell" data-type="lanterns" data-zone="focus" style="display:none;">
        <button class="assign-zero" data-type="lanterns" data-zone="focus">0</button>
        <button class="assign-minus" data-type="lanterns" data-zone="focus">-1</button>
        <span id="lanterns-assign-focus">0</span>
        <button class="assign-plus" data-type="lanterns" data-zone="focus">+1</button>
        <button class="assign-max" data-type="lanterns" data-zone="focus">Max</button>
      </div>
      <div class="grid-reversal-cell reversal-cell-with-checkbox" data-zone="focus" style="display:none;">
        <input type="checkbox" class="reversal-checkbox" data-zone="focus" style="visibility:hidden;">
      </div>
      <div class="grid-auto-cell" data-zone="focus" style="display:none;">
        <input type="checkbox" class="auto-assign" data-zone="focus">
      </div>
    </div>
  `;
  cardBody.appendChild(finerToggle);
  cardBody.appendChild(finerContent);

  const finerIcon = finerToggle.querySelector('#mirror-finer-icon');
  finerToggle.addEventListener('click', () => {
    const open = finerContent.style.display !== 'none';
    finerContent.style.display = open ? 'none' : 'block';
    if (finerIcon) finerIcon.textContent = open ? '▶' : '▼';
  });

  const useFiner = finerContent.querySelector('#mirror-use-finer');
  useFiner.addEventListener('change', () => {
    toggleFinerControls(useFiner.checked);
  });
  finerContent.querySelectorAll('.auto-assign').forEach(box => {
    box.addEventListener('change', () => {
      const zone = box.dataset.zone;
      mirrorOversightSettings.autoAssign[zone] = box.checked;
      if (!mirrorOversightSettings.advancedOversight) {
        distributeAutoAssignments('mirrors');
        distributeAutoAssignments('lanterns');
      }
      updateAssignmentDisplays();
      updateZonalFluxTable();
    });
  });
  finerContent.querySelectorAll('.reversal-checkbox').forEach(box => {
    box.addEventListener('change', () => {
      const zone = box.dataset.zone;
        if (!mirrorOversightSettings.assignments.reversalMode) mirrorOversightSettings.assignments.reversalMode = { tropical: false, temperate: false, polar: false, focus: false, any: false };
      mirrorOversightSettings.assignments.reversalMode[zone] = box.checked;
      updateZonalFluxTable();
    });
  });
  finerContent.querySelectorAll('.assignment-mul10').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      mirrorOversightSettings.assignmentStep[type] *= 10;
      updateAssignmentDisplays();
    });
  });
  finerContent.querySelectorAll('.assignment-div10').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const cur = mirrorOversightSettings.assignmentStep[type] || 1;
      mirrorOversightSettings.assignmentStep[type] = Math.max(1, Math.floor(cur / 10));
      updateAssignmentDisplays();
    });
  });

  finerContent.querySelectorAll('.assign-zero, .assign-minus, .assign-plus, .assign-max').forEach(btn => {
    btn.addEventListener('click', () => {
      const zone = btn.dataset.zone;
      const type = btn.dataset.type;
      const getTotal = () => type === 'mirrors' ? (buildings?.spaceMirror?.active || 0) : (buildings?.hyperionLantern?.active || 0);
      const assignments = mirrorOversightSettings.assignments[type];
      const step = mirrorOversightSettings.assignmentStep?.[type] || 1;
      const current = assignments[zone] || 0;

      if (btn.classList.contains('assign-zero')) {
        assignments[zone] = 0;
      } else if (btn.classList.contains('assign-minus')) {
        assignments[zone] = Math.max(0, current - step);
      } else if (btn.classList.contains('assign-plus')) {
        const other = Object.keys(assignments).filter(z => z !== zone).reduce((s, z) => s + (assignments[z] || 0), 0);
        const total = getTotal();
        assignments[zone] = Math.min(current + step, total - other);
      } else if (btn.classList.contains('assign-max')) {
        const other = Object.keys(assignments).filter(z => z !== zone).reduce((s, z) => s + (assignments[z] || 0), 0);
        const total = getTotal();
        assignments[zone] = Math.max(0, total - other);
      }

      distributeAutoAssignments(type);
      updateAssignmentDisplays();
      updateZonalFluxTable();
    });
  });

  updateAssignmentDisplays();

  container.appendChild(div);

  updateZonalFluxTable();
  // Build cache of frequently used nodes inside the oversight UI
  rebuildMirrorOversightCache();
  updateMirrorOversightUI();
}

let mirrorOversightCache = null;

function rebuildMirrorOversightCache() {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('mirror-oversight-container');
  if (!container) { mirrorOversightCache = null; return; }
  mirrorOversightCache = {
    container,
    lanternHeader: document.querySelector('#assignment-grid .grid-header:nth-child(3)') || null,
    lanternCells: Array.from(document.querySelectorAll('#assignment-grid .assign-cell[data-type="lanterns"]')),
    availableLanternCells: Array.from(document.querySelectorAll('.available-lantern-cell')),
    reversalHeader: document.querySelector('#assignment-grid .grid-header:nth-child(4)') || null,
    reversalCells: Array.from(document.querySelectorAll('#assignment-grid .grid-reversal-cell')),
    autoAssignBoxes: Array.from(document.querySelectorAll('#assignment-grid .auto-assign')),
    assignmentControls: Array.from(document.querySelectorAll('#mirror-finer-content button, #mirror-finer-content input[type="checkbox"]:not(#mirror-use-finer)')),
    focusZoneCells: Array.from(document.querySelectorAll('#assignment-grid > div[data-zone="focus"]')),
    fluxTempHeader: document.querySelector('#mirror-flux-table thead tr th:nth-child(3)') || null,
    dayTempHeader: document.querySelector('#mirror-flux-table thead tr th:nth-child(4)') || null,
    sliderReverseBoxes: Array.from(document.querySelectorAll('#mirror-oversight-sliders .slider-reversal-checkbox')),
    sliderReverseLabels: Array.from(document.querySelectorAll('#mirror-oversight-sliders .slider-reverse-label')),
    lanternStepControls: document.querySelector('.lantern-step-controls') || null,
  };
}

function ensureMirrorOversightCache() {
  const container = typeof document !== 'undefined' ? document.getElementById('mirror-oversight-container') : null;
  if (!mirrorOversightCache || mirrorOversightCache.container !== container) {
    rebuildMirrorOversightCache();
  }
}

function updateMirrorOversightUI() {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('mirror-oversight-container');
  if (!container) return;
  ensureMirrorOversightCache();
  let enabled = false;
  if (typeof projectManager !== 'undefined') {
    if (projectManager.isBooleanFlagSet &&
        projectManager.isBooleanFlagSet('spaceMirrorFacilityOversight')) {
      enabled = true;
    } else if (projectManager.projects &&
               projectManager.projects.spaceMirrorFacility &&
               typeof projectManager.projects.spaceMirrorFacility.isBooleanFlagSet === 'function' &&
               projectManager.projects.spaceMirrorFacility.isBooleanFlagSet('spaceMirrorFacilityOversight')) {
      enabled = true;
    }
  }
  container.style.display = enabled ? 'block' : 'none';
  const dist = mirrorOversightSettings.distribution || { tropical: 0, temperate: 0, polar: 0, focus: 0, unassigned: 0 };
  const vals = {
    tropical: Math.max(0, Math.round((dist.tropical || 0) * 100)),
    temperate: Math.max(0, Math.round((dist.temperate || 0) * 100)),
    polar: Math.max(0, Math.round((dist.polar || 0) * 100)),
    focus: Math.max(0, Math.round((dist.focus || 0) * 100)),
    unassigned: Math.max(0, Math.round((dist.unassigned || 0) * 100))
  };
  const anyVal = Math.max(0, 100 - vals.tropical - vals.temperate - vals.polar - vals.focus - vals.unassigned);

  const focusGroup = document.getElementById('mirror-oversight-focus-group');
  let focusEnabled = false;
  if (typeof projectManager !== 'undefined') {
    if (projectManager.isBooleanFlagSet && projectManager.isBooleanFlagSet('spaceMirrorFocusing')) {
      focusEnabled = true;
    } else if (projectManager.projects &&
               projectManager.projects.spaceMirrorFacility &&
               typeof projectManager.projects.spaceMirrorFacility.isBooleanFlagSet === 'function' &&
               projectManager.projects.spaceMirrorFacility.isBooleanFlagSet('spaceMirrorFocusing')) {
      focusEnabled = true;
    }
  }
  if (focusGroup) focusGroup.style.display = focusEnabled ? 'flex' : 'none';

  ['tropical','temperate','polar','focus','unassigned','any'].forEach(zone => {
    const slider = document.getElementById(`mirror-oversight-${zone}`);
    const span = document.getElementById(`mirror-oversight-${zone}-value`);
    const val = zone === 'any' ? anyVal : vals[zone];
    if (slider) slider.value = val;
    if (span) span.textContent = val + '%';
  });

  const lantern = document.getElementById('mirror-oversight-lantern');
  const lanternDiv = document.getElementById('mirror-oversight-lantern-div');
  if (lantern) lantern.checked = !!mirrorOversightSettings.applyToLantern;
  const lanternUnlocked = typeof buildings !== 'undefined' && buildings.hyperionLantern && buildings.hyperionLantern.unlocked;
  if (lanternDiv) {
    lanternDiv.style.display = lanternUnlocked ? 'flex' : 'none';
    if (lanternUnlocked) {
      lanternDiv.style.display = 'flex';
      lanternDiv.style.alignItems = 'center';
      lanternDiv.style.gap = '12px';
      lanternDiv.style.flexWrap = 'wrap';
    }
  }

  const smfProject = (typeof projectManager !== 'undefined' && projectManager.projects)
    ? projectManager.projects.spaceMirrorFacility
    : null;
  const reversalAvailable = !!(smfProject && smfProject.reversalAvailable);
  const C = mirrorOversightCache || {};
  if (C.sliderReverseBoxes) {
    C.sliderReverseBoxes.forEach(box => {
      const zone = box.dataset.zone;
      box.checked = !!mirrorOversightSettings.assignments.reversalMode?.[zone];
      box.style.display = reversalAvailable ? '' : 'none';
    });
  }
  if (C.sliderReverseLabels) {
    C.sliderReverseLabels.forEach(label => {
      label.style.display = reversalAvailable ? '' : 'none';
    });
  }
  // Advanced oversight unlock check (boolean flag name: advancedOversight)
  let advancedUnlocked = false;
  if (typeof projectManager !== 'undefined') {
    if (projectManager.isBooleanFlagSet && projectManager.isBooleanFlagSet('advancedOversight')) {
      advancedUnlocked = true;
    } else if (projectManager.projects &&
               projectManager.projects.spaceMirrorFacility &&
               typeof projectManager.projects.spaceMirrorFacility.isBooleanFlagSet === 'function' &&
               projectManager.projects.spaceMirrorFacility.isBooleanFlagSet('advancedOversight')) {
      advancedUnlocked = true;
    }
  }
  const advDiv = document.getElementById('mirror-advanced-oversight-div');
  const advCheckbox = document.getElementById('mirror-advanced-oversight');
  if (advDiv) advDiv.style.display = advancedUnlocked ? 'flex' : 'none';
  if (advCheckbox) advCheckbox.checked = !!mirrorOversightSettings.advancedOversight;
  const advControls = document.getElementById('advanced-oversight-controls');
  // Show temperature targets in current unit and hide water row without focusing
  const toDisp = (typeof toDisplayTemperature === 'function') ? toDisplayTemperature : (v => v);
  ['tropical','temperate','polar'].forEach(k => {
    const input = document.getElementById(`adv-target-${k}`);
    if (input && mirrorOversightSettings.targets && document.activeElement !== input) {
      const v = mirrorOversightSettings.targets[k] || 293.15;
      input.value = (toDisp(v)).toFixed(2);
    }
    const sel = document.getElementById(`adv-priority-${k}`);
    if (sel && document.activeElement !== sel) sel.value = String(mirrorOversightSettings.priority[k] || 1);
    const timing = document.getElementById(`adv-timing-${k}`);
    if (timing && document.activeElement !== timing) timing.value = mirrorOversightSettings.tempMode?.[k] || 'average';
  });
  const waterRow = document.getElementById('adv-water-row');
  if (waterRow) waterRow.style.display = focusEnabled ? 'flex' : 'none';
  const waterInput = document.getElementById('adv-target-water');
  const waterScale = document.getElementById('adv-target-water-scale');
  if (waterScale && document.activeElement !== waterScale) {
    waterScale.value = String(mirrorOversightSettings.waterMultiplier || 1000);
  }
  if (waterInput && mirrorOversightSettings.targets && document.activeElement !== waterInput && document.activeElement !== waterScale) {
    const scale = mirrorOversightSettings.waterMultiplier || 1000;
    waterInput.value = Number((mirrorOversightSettings.targets.water || 0) / scale);
  }
  if (C.lanternHeader) C.lanternHeader.style.display = lanternUnlocked ? '' : 'none';
  if (C.lanternCells) C.lanternCells.forEach(cell => { cell.style.display = lanternUnlocked ? 'flex' : 'none'; });
  if (C.availableLanternCells) C.availableLanternCells.forEach(cell => { cell.style.display = lanternUnlocked ? 'flex' : 'none'; });
  if (C.lanternStepControls) C.lanternStepControls.style.display = lanternUnlocked ? '' : 'none';
  if (C.reversalHeader) C.reversalHeader.style.display = reversalAvailable ? '' : 'none';
  if (C.reversalCells) C.reversalCells.forEach(cell => { cell.style.display = reversalAvailable ? 'flex' : 'none'; });

  const assignmentGrid = document.getElementById('assignment-grid');
  if (assignmentGrid) {
    if (lanternUnlocked && reversalAvailable) {
      assignmentGrid.style.gridTemplateColumns = '100px 1fr 1fr 80px 50px';
    } else if (lanternUnlocked) {
      assignmentGrid.style.gridTemplateColumns = '100px 1fr 1fr 50px';
    } else if (reversalAvailable) {
      assignmentGrid.style.gridTemplateColumns = '100px 1fr 80px 50px';
    } else {
      assignmentGrid.style.gridTemplateColumns = '100px 1fr 50px';
    }
  }

  const useFiner = mirrorOversightSettings.useFinerControls;
  ['tropical','temperate','polar','focus','any','unassigned'].forEach(zone => {
    const slider = document.getElementById(`mirror-oversight-${zone}`);
    if (slider) slider.disabled = useFiner;
  });
  const useFinerEl = document.getElementById('mirror-use-finer');
  if (useFinerEl) useFinerEl.checked = useFiner;
  if (C.autoAssignBoxes) C.autoAssignBoxes.forEach(box => {
    const zone = box.dataset.zone;
    box.checked = !!mirrorOversightSettings.autoAssign[zone];
  });
  // In advanced oversight mode, show assignments but do not allow manual control
  const slidersWrapper = document.getElementById('mirror-oversight-sliders');
  const anySliderEl = document.getElementById('mirror-oversight-any');
  const anyWrapper = anySliderEl ? anySliderEl.parentElement : null;
  const advancedOn = !!mirrorOversightSettings.advancedOversight && (document.getElementById('mirror-advanced-oversight-div')?.style.display !== 'none');
  if (slidersWrapper) slidersWrapper.style.display = advancedOn ? 'none' : '';
  if (anyWrapper) anyWrapper.style.display = advancedOn ? 'none' : 'flex';
  if (advControls) advControls.style.display = advancedOn ? '' : 'none';

  const finerContent = document.getElementById('mirror-finer-content');
  const finerToggle = document.getElementById('mirror-finer-toggle');
  if (advancedOn) {
    if (finerContent) finerContent.style.display = 'block';
    if (finerToggle) finerToggle.style.display = 'none';
    const header = document.querySelector('#mirror-finer-content .finer-controls-header');
    if (header) header.style.display = 'none';
  } else {
    if (finerToggle) finerToggle.style.display = '';
    const header = document.querySelector('#mirror-finer-content .finer-controls-header');
    if (header) header.style.display = '';
  }

  // Keep assignment numbers updated in advanced mode
  if (advancedOn && typeof updateAssignmentDisplays === 'function') {
    updateAssignmentDisplays();
  }
  if (C.assignmentControls) C.assignmentControls.forEach(el => { el.disabled = advancedOn || !useFiner; });
  if (useFiner && !mirrorOversightSettings.advancedOversight) {
    distributeAutoAssignments('mirrors');
    distributeAutoAssignments('lanterns');
    updateAssignmentDisplays();
  }
  if (C.focusZoneCells) C.focusZoneCells.forEach(el => {
    if (!focusEnabled) {
      el.style.display = 'none';
    } else if (el.classList.contains('grid-reversal-cell')) {
      el.style.display = reversalAvailable ? 'flex' : 'none';
    } else if (el.classList.contains('assign-cell')) {
      el.style.display = 'flex';
    } else {
      el.style.display = '';
    }
  });


  if (enabled) {
    updateZonalFluxTable();
  }
}

function updateZonalFluxTable() {
  if (typeof document === 'undefined' || typeof terraforming === 'undefined') return;
  const tempUnit = (typeof getTemperatureUnit === 'function') ? getTemperatureUnit() : 'K';
  ensureMirrorOversightCache();
  const C = mirrorOversightCache || {};
  const header = C.fluxTempHeader || document.querySelector('#mirror-flux-table thead tr th:nth-child(3)');
  if (header) header.textContent = `Temperature (${tempUnit}) Current / Trend`;
  const dayHeader = C.dayTempHeader || document.querySelector('#mirror-flux-table thead tr th:nth-child(4)');
  if (dayHeader) dayHeader.textContent = `Day Temperature (${tempUnit}) Current / Trend`;
  const zones = ['tropical', 'temperate', 'polar'];
  zones.forEach(zone => {
    const fluxCell = document.getElementById(`mirror-flux-${zone}`);
    const tempCell = document.getElementById(`mirror-temp-${zone}`);
    const dayTempCell = document.getElementById(`mirror-day-temp-${zone}`);
    let flux = 0;
    if (typeof terraforming.calculateZoneSolarFlux === 'function') {
      flux = terraforming.calculateZoneSolarFlux(zone) / 4;
    }
    if (fluxCell) fluxCell.textContent = formatNumber(flux, false, 2);

    if (tempCell) {
      let temp = 0;
      let trend = 0;
      if (terraforming.temperature && terraforming.temperature.zones && terraforming.temperature.zones[zone]) {
        temp = Number.isFinite(terraforming.temperature.zones[zone].value)
          ? terraforming.temperature.zones[zone].value
          : 0;
        trend = Number.isFinite(terraforming.temperature.zones[zone].trendValue)
          ? terraforming.temperature.zones[zone].trendValue
          : 0;
      }
      if (typeof toDisplayTemperature === 'function') {
        temp = toDisplayTemperature(temp);
        trend = toDisplayTemperature(trend);
      }
      const tempText = formatNumber(temp, false, 2);
      const trendText = formatNumber(trend, false, 2);
      tempCell.textContent = `${tempText} / ${trendText}`;
    }

    if (dayTempCell) {
      let dayTemp = 0;
      let dayTrend = 0;
      if (terraforming.temperature && terraforming.temperature.zones && terraforming.temperature.zones[zone]) {
        const zoneTemps = terraforming.temperature.zones[zone];
        if (Number.isFinite(zoneTemps.day)) dayTemp = zoneTemps.day;
        const meanValue = Number.isFinite(zoneTemps.value) ? zoneTemps.value : 0;
        const offset = Number.isFinite(zoneTemps.day) && Number.isFinite(zoneTemps.value)
          ? zoneTemps.day - zoneTemps.value
          : 0;
        const trendMean = Number.isFinite(zoneTemps.trendValue) ? zoneTemps.trendValue : meanValue;
        dayTrend = trendMean + offset;
      }
      if (typeof toDisplayTemperature === 'function') {
        dayTemp = toDisplayTemperature(dayTemp);
        dayTrend = toDisplayTemperature(dayTrend);
      }
      const dayTempText = formatNumber(dayTemp, false, 2);
      const dayTrendText = formatNumber(dayTrend, false, 2);
      dayTempCell.textContent = `${dayTempText} / ${dayTrendText}`;
    }
  });
}

function applyFocusedMelt(terraforming, resources, durationSeconds) {
  let focusMeltAmount = 0;
  if (typeof projectManager !== 'undefined' &&
      ((projectManager.isBooleanFlagSet && projectManager.isBooleanFlagSet('spaceMirrorFocusing')) ||
       (projectManager.projects &&
        projectManager.projects.spaceMirrorFacility &&
        typeof projectManager.projects.spaceMirrorFacility.isBooleanFlagSet === 'function' &&
        projectManager.projects.spaceMirrorFacility.isBooleanFlagSet('spaceMirrorFocusing')))) {
    let focusPower = 0;
    if (mirrorOversightSettings.useFinerControls || mirrorOversightSettings.advancedOversight) {
      distributeAutoAssignments('mirrors');
      distributeAutoAssignments('lanterns');
      const assignM = mirrorOversightSettings.assignments?.mirrors || {};
      const assignL = mirrorOversightSettings.assignments?.lanterns || {};
      const mirrorPowerPer = terraforming.calculateMirrorEffect().interceptedPower;
      const lantern = typeof buildings !== 'undefined' ? buildings.hyperionLantern : null;
      const lanternPowerPer = lantern ? (lantern.powerPerBuilding || 0) * (typeof lantern.productivity === 'number' ? lantern.productivity : 1) : 0;
      focusPower = mirrorPowerPer * (assignM.focus || 0) + lanternPowerPer * (assignL.focus || 0);
    } else {
      const dist = mirrorOversightSettings?.distribution || {};
      const focusPerc = dist.focus || 0;
      if (focusPerc > 0) {
        const mirrorPowerTotal = terraforming.calculateMirrorEffect().interceptedPower * (buildings['spaceMirror']?.active || 0);
        let lanternPowerTotal = 0;
        if (mirrorOversightSettings.applyToLantern) {
          const area = terraforming.celestialParameters.crossSectionArea || terraforming.celestialParameters.surfaceArea;
          lanternPowerTotal = terraforming.calculateLanternFlux() * area;
        }
        focusPower = (mirrorPowerTotal + lanternPowerTotal) * focusPerc;
      }
    }
    if (focusPower > 0) {
      const C_P_ICE = 2100; // J/kg·K
      const L_F_WATER = 334000; // J/kg
      const deltaT = Math.max(0, 273.15 - (terraforming.temperature.value || 0));
      const energyPerKg = C_P_ICE * deltaT + L_F_WATER;
      if (energyPerKg > 0) {
        const meltKgPerSec = focusPower / energyPerKg;
        const meltTons = meltKgPerSec * durationSeconds / 1000;
        const zonesData = ['tropical','temperate','polar'].map(z => ({
          zone: z,
          temp: terraforming.temperature.zones[z].value,
          ice: terraforming.zonalWater[z].ice
        })).filter(z => z.ice > 0);
        const totalSurfaceIce = zonesData.reduce((sum, z) => sum + z.ice, 0);
        if (totalSurfaceIce > 0) {
          const desiredMelt = Math.min(meltTons, totalSurfaceIce);
          let remaining = desiredMelt;
          zonesData.sort((a, b) => b.temp - a.temp);
          for (const z of zonesData) {
            if (remaining <= 0) break;
            const meltHere = Math.min(z.ice, remaining);
            if (meltHere > 0) {
              terraforming.zonalWater[z.zone].ice -= meltHere;
              terraforming.zonalWater[z.zone].liquid += meltHere;
              remaining -= meltHere;
            }
          }
          const actualMelt = desiredMelt - remaining;
          if (actualMelt > 0) {
            focusMeltAmount = actualMelt;
            if (resources.surface?.ice) resources.surface.ice.value -= actualMelt;
            if (resources.surface?.liquidWater) resources.surface.liquidWater.value += actualMelt;
          }
        }
      }
    }
  }
  return focusMeltAmount;
}

function calculateZoneSolarFluxWithFacility(terraforming, zone, angleAdjusted = false) {
  const ratio = angleAdjusted ? getZoneRatio(zone) : (getZoneRatio(zone) / 0.25);
  const totalSurfaceArea = terraforming.celestialParameters.surfaceArea;
  const baseSolar = terraforming.luminosity.solarFlux; // W/m^²

  const mirrorPowerPer = terraforming.calculateMirrorEffect().interceptedPower;
  const lantern = typeof buildings !== 'undefined' ? buildings.hyperionLantern : null;
  const lanternPowerPer = lantern ? (lantern.powerPerBuilding || 0) * (typeof lantern.productivity === 'number' ? lantern.productivity : 1) : 0;
  const totalMirrorPower = mirrorPowerPer * (buildings?.spaceMirror?.active || 0);
  const totalLanternPower = lanternPowerPer * (lantern?.active || 0);

  let distributedMirrorPower = totalMirrorPower;
  let focusedMirrorPower = 0;
  let distributedLanternPower = totalLanternPower;
  let focusedLanternPower = 0;
  let focusedMirrorFlux = 0;
  let focusedLanternFlux = 0;

  if (
    typeof projectManager?.projects?.spaceMirrorFacility !== 'undefined' &&
    projectManager.projects.spaceMirrorFacility.isBooleanFlagSet &&
    projectManager.projects.spaceMirrorFacility.isBooleanFlagSet('spaceMirrorFacilityOversight') &&
    typeof mirrorOversightSettings !== 'undefined'
  ) {
    if (mirrorOversightSettings.advancedOversight) {
      // Advanced mode: use explicit assignments only (no auto distribution)
      const assignM = mirrorOversightSettings.assignments.mirrors || {};
      const assignL = mirrorOversightSettings.assignments.lanterns || {};
      distributedMirrorPower = 0;
      distributedLanternPower = 0;
      focusedMirrorPower = mirrorPowerPer * (assignM[zone] || 0);
      focusedLanternPower = lanternPowerPer * (assignL[zone] || 0);
    } else if (mirrorOversightSettings.useFinerControls) {
      // Finer controls (legacy): use current assignment with optional auto-assign
      distributeAutoAssignments('mirrors');
      distributeAutoAssignments('lanterns');
      const assignM = mirrorOversightSettings.assignments.mirrors || {};
      const assignL = mirrorOversightSettings.assignments.lanterns || {};
      distributedMirrorPower = mirrorPowerPer * (assignM.any || 0);
      distributedLanternPower = lanternPowerPer * (assignL.any || 0);
      focusedMirrorPower = mirrorPowerPer * (assignM[zone] || 0);
      focusedLanternPower = lanternPowerPer * (assignL[zone] || 0);
    } else {
      // Slider distribution
      const dist = mirrorOversightSettings.distribution || {};
      const zonePerc = Math.max(0, dist[zone] || 0);
      const globalPerc = Math.max(
        0,
        1 - (
          (dist.tropical || 0) +
          (dist.temperate || 0) +
          (dist.polar || 0) +
          (dist.focus || 0) +
          (dist.unassigned || 0)
        )
      );

      distributedMirrorPower = totalMirrorPower * globalPerc;
      focusedMirrorPower = totalMirrorPower * zonePerc;

      if (mirrorOversightSettings.applyToLantern) {
        distributedLanternPower = totalLanternPower * globalPerc;
        focusedLanternPower = totalLanternPower * zonePerc;
      }
    }

    const zoneArea = totalSurfaceArea * getZonePercentage(zone);
    if (zoneArea > 0) {
      if (focusedMirrorPower > 0) focusedMirrorFlux = 4 * focusedMirrorPower / zoneArea;
      if (focusedLanternPower > 0) focusedLanternFlux = 4 * focusedLanternPower / zoneArea;
    }
  }

  const anyReverse = !!mirrorOversightSettings.assignments.reversalMode?.any;
  const zoneReverse = !!mirrorOversightSettings.assignments.reversalMode?.[zone];

  const distributedMirrorFlux = totalSurfaceArea > 0
    ? ((anyReverse ? -4 : 4) * distributedMirrorPower / totalSurfaceArea)
    : 0;
  const distributedLanternFlux = totalSurfaceArea > 0 ? 4 * distributedLanternPower / totalSurfaceArea : 0;

  if (focusedMirrorFlux && zoneReverse) {
    focusedMirrorFlux = -focusedMirrorFlux;
  }

  const totalFluxForZone = (baseSolar + distributedMirrorFlux + distributedLanternFlux) * ratio + focusedMirrorFlux + focusedLanternFlux;

  return Math.max(totalFluxForZone, 2.4e-5);
}

// Priority-aware batched solver with warm start and tiny number of physics calls.
// Strategy:
//  - Warm start from last tick's assignments (or current ones if present), then adjust.
//  - For each priority pass, build a small set of candidate batched moves:
//      (+Δ mirrors to zone with/without reversal, +Δ lanterns to zone, +Δ focus)
//    where Δ is computed from a probe to estimate per-unit impact.
//  - Evaluate candidates by calling terraforming.updateSurfaceTemperature() only a handful of times,
//    pick the best improving candidate(s), commit, repeat a small, capped number of times per pass.
//  - Save the resulting assignment as lastSolution for next tick.
function runAdvancedOversightAssignments(project) {
  if (!mirrorOversightSettings.advancedOversight) return;
  if (advancedAssignmentInProgress) return;
  advancedAssignmentInProgress = true;
  let snapshot = terraforming.saveTemperatureState();

  try {
    if (typeof terraforming === 'undefined' || typeof buildings === 'undefined') return;

    // ---------------- Config knobs (tune as needed) ----------------
    const K_TOL = 0.001;         // Temperature tolerance (K) for zones
    const WATER_REL_TOL = 0.01; // Relative tol (1%) for water melt target
    const MAX_ACTIONS_PER_PASS = 100; // Commit at most this many batched moves per priority pass

    // Probe sizing for derivative estimates (NO per-mirror loops; single physics call per probe)
    const MIRROR_PROBE_MIN = 1;      // Minimum mirrors per probe (useful scale for "billions")
    const LANTERN_PROBE_MIN = 1;      // Min lanterns per probe
    const SAFETY_FRACTION = 1;        // Take only 50% of the "unitsNeeded" to reduce overshoot risk

    // If no resources left, allow reallocation from strictly lower priority zones
    const REALLOC_PROBE_FRAC = 0.1;     // Try to shift 10% of donor's assignment in one test
    const REALLOC_MIN = 1000;           // At least this many units in a reallocation probe (mirrors/lanterns)

    // ---------------- Capability / flags ----------------
    const ZONES = ['tropical', 'temperate', 'polar'];

    const FOCUS_FLAG =
      (typeof projectManager !== 'undefined') &&
      (
        (projectManager.isBooleanFlagSet && projectManager.isBooleanFlagSet('spaceMirrorFocusing')) ||
        (projectManager.projects &&
         projectManager.projects.spaceMirrorFacility &&
         typeof projectManager.projects.spaceMirrorFacility.isBooleanFlagSet === 'function' &&
         projectManager.projects.spaceMirrorFacility.isBooleanFlagSet('spaceMirrorFocusing'))
      );

    const REVERSAL_AVAILABLE = !!(project && project.reversalAvailable);

    // ---------------- Short-hands / accessors ----------------
    const assignM = mirrorOversightSettings.assignments.mirrors || (mirrorOversightSettings.assignments.mirrors = {});
    const assignL = mirrorOversightSettings.assignments.lanterns || (mirrorOversightSettings.assignments.lanterns = {});
      const reverse = (mirrorOversightSettings.assignments.reversalMode ||= { tropical: false, temperate: false, polar: false, focus: false, any: false });

    const prio = mirrorOversightSettings.priority || { tropical: 1, temperate: 1, polar: 1, focus: 1 };
    const targets = mirrorOversightSettings.targets || { tropical: 0, temperate: 0, polar: 0, water: 0 };

    const totalMirrors = Math.max(0, buildings.spaceMirror?.active || 0);
    const totalLanterns = mirrorOversightSettings.applyToLantern ? Math.max(0, buildings.hyperionLantern?.active || 0) : 0;

    const usedMirrors = () => (assignM.tropical)+(assignM.temperate)+(assignM.polar)+(assignM.focus);
    const usedLanterns = () => (assignL.tropical)+(assignL.temperate)+(assignL.polar)+(assignL.focus);
    const mirrorsLeft = () => Math.max(0, totalMirrors - usedMirrors());
    const lanternsLeft = () => Math.max(0, totalLanterns - usedLanterns());

    const getZoneTemp = (z) => {
      const mode = mirrorOversightSettings.tempMode?.[z] || 'average';
      const data = terraforming?.temperature?.zones?.[z];
      if (!data) return NaN;
      if (mode === 'day') return data.day;
      if (mode === 'night') return data.night;
      return data.value;
    };

    const updateTemps = () => {
      if (typeof terraforming.updateSurfaceTemperature === 'function') {
        terraforming.updateSurfaceTemperature(0, { ignoreHeatCapacity: true });
      }
    };

    const readTemps = () => {
      const out = {};
      for (const z of ZONES) out[z] = getZoneTemp(z);
      return out;
    };

    const weightFor = (p) => Math.pow(2, (6 - Math.max(1, Math.min(5, p)))) ; // 32,16,8,4,2

    const allPriorities = [prio.tropical, prio.temperate, prio.polar, prio.focus].filter(x => typeof x === 'number');
    const minP = Math.min(...allPriorities);
    const maxP = Math.max(...allPriorities);

    const mirrorPowerPer = terraforming.calculateMirrorEffect?.().interceptedPower || 0;
    const lantern = typeof buildings !== 'undefined' ? buildings.hyperionLantern : null;
    const lanternPowerPer = lantern
      ? (lantern.powerPerBuilding || 0) * (typeof lantern.productivity === 'number' ? lantern.productivity : 1)
      : 0;

    // ---------------- Warm start ----------------
    // If we have a saved lastSolution, restore it (clamped to current availability).
    // Otherwise, keep whatever current assignments exist (they already reflect last tick).
    const restoreFromLast = () => {
      const last = mirrorOversightSettings.lastSolution;
      if (!last) return;
      const copy = (dst, src) => { for (const k of Object.keys(dst)) dst[k] = 0; for (const k of Object.keys(src)) dst[k] = Math.max(0, src[k]); };
      copy(assignM, last.mirrors || {});
      copy(assignL, last.lanterns || {});
      Object.assign(reverse, last.reversalMode || {});
      clampTo(assignM, totalMirrors);
      clampTo(assignL, totalLanterns);
    };

    const clampTo = (obj, max) => {
      let sum = 0;
      for (const k of Object.keys(obj)) sum += Math.max(0, obj[k]);
      if (sum <= max) return;
      // Reduce lowest priority first
      const entries = Object.keys(obj)
        .map(k => ({ k, v: Math.max(0, obj[k]), p: (k === 'focus' ? (prio.focus || 5) : (prio[k] || 5)) }))
        .sort((a, b) => b.p - a.p);
      let over = sum - max;
      for (const e of entries) {
        if (over <= 0) break;
        const take = Math.min(e.v, over);
        obj[e.k] = e.v - take;
        over -= take;
      }
    };

    // Apply warm start
    //restoreFromLast();
    // Make sure reversal is only used if available
    if (!REVERSAL_AVAILABLE) {
      reverse.tropical = reverse.temperate = reverse.polar = false;
    }
    reverse.any = false;

    // Determine reversal based on baseline (no mirrors/lanterns, no reversal):
    // Evaluate temperatures with 0 assignments and all reversal off, then
    // set reversal on zones where baseline temp is above the target, off otherwise.
    (function alignReversalFromBaseline() {
      // Save current state
      const savedAssignM = { ...assignM };
      const savedAssignL = { ...assignL };
      const savedReverse = { ...reverse };

      // Zero assignments and turn off all reversal for baseline evaluation
        assignM.tropical = 0; assignM.temperate = 0; assignM.polar = 0; assignM.focus = 0;
        assignL.tropical = 0; assignL.temperate = 0; assignL.polar = 0; assignL.focus = 0;
        reverse.tropical = false; reverse.temperate = false; reverse.polar = false; reverse.any = false;
      updateTemps();

      // Read baseline temps with no facility effect
      const baseline = readTemps();

      // Restore assignments
      assignM.tropical = savedAssignM.tropical || 0; assignM.temperate = savedAssignM.temperate || 0; assignM.polar = savedAssignM.polar || 0; assignM.focus = savedAssignM.focus || 0;
      assignL.tropical = savedAssignL.tropical || 0; assignL.temperate = savedAssignL.temperate || 0; assignL.polar = savedAssignL.polar || 0; assignL.focus = savedAssignL.focus || 0;

      // Set reversal based on baseline vs targets
      if (REVERSAL_AVAILABLE) {
        for (const z of ZONES) {
          const tgt = targets[z] || 0;
          if (tgt > 0 && isFinite(baseline[z])) {
            reverse[z] = baseline[z] > tgt; // above target -> cool (reversal on); else heat (off)
          } else {
            // If no meaningful target, keep previous setting from saved state (but ensure boolean)
            reverse[z] = !!savedReverse[z];
          }
        }
      } else {
        reverse.tropical = reverse.temperate = reverse.polar = false;
      }

      // Ensure 'any' remains off in advanced mode
      reverse.any = false;
      updateTemps();
    })();

    // ---------------- Objective ----------------
    const computeFocusMeltRate = () => {
      if (!FOCUS_FLAG) return 0;
      const m = assignM.focus;
      const l = assignL.focus;
      const focusPower = m * mirrorPowerPer + l * lanternPowerPer;

      // Energy to bring ice to 0°C and melt
      const C_P_ICE = 2100;    // J/kg·K
      const L_F_WATER = 334000;// J/kg
      const deltaT = Math.max(0, 273.15 - (terraforming.temperature?.value || 0));
      const energyPerKg = C_P_ICE * deltaT + L_F_WATER; // J/kg
      if (energyPerKg <= 0) return 0;

      const meltKgPerSec = focusPower / energyPerKg;
      return Math.max(0, meltKgPerSec / 1000)*86400; // tons/sec
    };

    const objective = (passLevel) => {
      const temps = readTemps();
      let sum = 0;
      for (const z of ZONES) {
        const tgt = targets[z] || 0;
        if (!(tgt > 0)) continue;
        let w = 0;
        if ((prio[z] || 5) <= passLevel) w = weightFor(prio[z]);
        if ((prio[z] || 5) <  passLevel) w *= 32; // lock-in for higher priority
        if (w > 0) {
          const t = temps[z];
          if (!isFinite(t)) continue;
          const e = t - tgt;
          sum += w * e * e;
        }
      }
      if (FOCUS_FLAG && (targets.water || 0) > 0) {
        const melt = computeFocusMeltRate();
        const tgt = targets.water || 0;
        const relErr = (melt >= tgt) ? 0 : (tgt > 0 ? (tgt - melt) / tgt : 0);
        let w = 0;
        if ((prio.focus || 5) <= passLevel) w = weightFor(prio.focus);
        if ((prio.focus || 5) <  passLevel) w *= 32;
        sum += w * relErr * relErr;
      }
      return sum;
    };

    const tempsNeed = () => {
      const t = readTemps();
      return {
        heat: ZONES.filter(z => (targets[z]) > 0 && isFinite(t[z]) && t[z] < (targets[z]-K_TOL)),
        cool: ZONES.filter(z => (targets[z]) > 0 && isFinite(t[z]) && t[z] > (targets[z]+K_TOL))
      };
    };

    // Utility: run a temporary change, eval, then rollback
    const withTempChange = (changer, evaluator) => {
      const snapM = { ...assignM };
      const snapL = { ...assignL };
      const snapR = { ...reverse };
      const shallowEqual = (a, b) => {
        const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
        for (const k of keys) {
          if ((a[k] || 0) !== (b[k] || 0)) return false;
        }
        return true;
      };
      changer();
      const changed = !(shallowEqual(assignM, snapM) && shallowEqual(assignL, snapL) && shallowEqual(reverse, snapR));
      if (changed) {
        // Only recompute temps when something actually changed
        updateTemps();
        const out = evaluator();
        // Roll back and restore temps
        Object.assign(assignM, snapM);
        Object.assign(assignL, snapL);
        Object.assign(reverse, snapR);
        updateTemps();
        return out;
      } else {
        // No change; evaluate on current state without recomputing temps
        return evaluator();
      }
    };

    // Suggest a probe size given remaining units
    const probeSize = (remain, minAbs, frac) =>
      Math.max(1, Math.min(remain, Math.ceil(Math.max(minAbs, remain * frac))));

    // Build batched candidates for this pass
    const buildCandidates = (passLevel) => {
      const cands = [];
      updateTemps();
      const temps = readTemps();
      const baseScore = objective(passLevel);

      // Mirror/lantern add candidates (batched)
      for (const z of ZONES) {
        if ((prio[z] || 5) > passLevel) continue; // only optimize up to current pass
        const tgt = targets[z] || 0; if (!(tgt > 0)) continue;

        const needCool = temps[z] > tgt + K_TOL;
        const needHeat = temps[z] < tgt - K_TOL;

        // Mirrors (heating)
        // Only add heat when baseline-aligned reversal is OFF for this zone.
        if (mirrorsLeft() > 0 && !reverse[z]) {
          const k = MIRROR_PROBE_MIN;
          const score = withTempChange(() => { reverse[z] = false; assignM[z] = (assignM[z]) + k; }, () => objective(passLevel));
          const dPerUnit = (baseScore - score) / k;
          // Estimate units needed from zone error (local slope for this zone)
          const tAfter = withTempChange(() => { reverse[z] = false; assignM[z] = (assignM[z]) + k; },
                                        () => getZoneTemp(z));
          const dT = (isFinite(tAfter) && isFinite(temps[z])) ? (tAfter - temps[z]) : 0;
          const dtPerUnit = dT / k;
          let unitsNeeded = (dtPerUnit > 0) ? Math.ceil((targets[z] - temps[z]) / dtPerUnit) : 0;
          unitsNeeded = Math.max(0, Math.min(unitsNeeded, mirrorsLeft()));
          const step = Math.max(0, Math.min(Math.ceil(SAFETY_FRACTION * unitsNeeded), mirrorsLeft()));
          if (step > 0) cands.push({ kind:'mirror', zone:z, reverse:false, kProbe:k, kStep:step, gainPerUnit:dPerUnit });
        }

        // Mirrors (cooling) via reversal
        // Only add cooling when baseline-aligned reversal is ON for this zone.
        if (REVERSAL_AVAILABLE && mirrorsLeft() > 0 && !!reverse[z]) {
          const k = MIRROR_PROBE_MIN;
          const score = withTempChange(() => { reverse[z] = true; assignM[z] = (assignM[z]) + k; }, () => objective(passLevel));
          const dPerUnit = (baseScore - score) / k;
          const tAfter = withTempChange(() => { reverse[z] = true; assignM[z] = (assignM[z]) + k; },
                                        () => getZoneTemp(z));
          const dT = (isFinite(tAfter) && isFinite(temps[z])) ? (tAfter - temps[z]) : 0; // will be negative
          const dtPerUnit = dT / k; // < 0 expected
          let unitsNeeded = (dtPerUnit < 0) ? Math.ceil((temps[z] - targets[z]) / (-dtPerUnit)) : 0;
          unitsNeeded = Math.max(0, Math.min(unitsNeeded, mirrorsLeft()));
          const step = Math.max(0, Math.min(Math.ceil(SAFETY_FRACTION * unitsNeeded), mirrorsLeft()));
          if (step > 0) cands.push({ kind:'mirror', zone:z, kProbe:k, kStep:step, gainPerUnit:dPerUnit });
        }

        // Lanterns (heating)
        if (lanternsLeft() > 0) {
          const k = LANTERN_PROBE_MIN;
          const score = withTempChange(() => { assignL[z] = (assignL[z]) + k; }, () => objective(passLevel));
          const dPerUnit = (baseScore - score) / k;
          const tAfter = withTempChange(() => { assignL[z] = (assignL[z]) + k; }, () => getZoneTemp(z));
          const dT = (isFinite(tAfter) && isFinite(temps[z])) ? (tAfter - temps[z]) : 0;
          const dtPerUnit = dT / k;
          let unitsNeeded = (dtPerUnit > 0) ? Math.ceil((targets[z] - temps[z]) / dtPerUnit) : 0;
          unitsNeeded = Math.max(0, Math.min(unitsNeeded, lanternsLeft()));
          const step = Math.max(0, Math.min(Math.ceil(SAFETY_FRACTION * unitsNeeded), lanternsLeft()));
          if (step > 0) cands.push({ kind:'lantern', zone:z, kProbe:k, kStep:step, gainPerUnit:dPerUnit });
        }

        // Removal candidates when locked mode conflicts with need
        // - If reversal is ON (cooling) but zone needs heat, try removing cooling mirrors
        if (!!reverse[z] && (assignM[z] || 0) > 0) {
          const current = assignM[z] || 0;
          const k = MIRROR_PROBE_MIN;;
          const score = withTempChange(() => { assignM[z] = current - k; }, () => objective(passLevel));
          const dPerUnit = (baseScore - score) / k;
          const tAfter = withTempChange(() => { assignM[z] = current - k; }, () => getZoneTemp(z));
          const dT = (isFinite(tAfter) && isFinite(temps[z])) ? (tAfter - temps[z]) : 0; // expected > 0
          const dtPerUnit = dT / k;
          let unitsNeeded = (dtPerUnit > 0) ? Math.ceil((targets[z] - temps[z]) / dtPerUnit) : 0;
          unitsNeeded = Math.max(0, Math.min(unitsNeeded, current));
          const step = Math.max(0, Math.min(Math.ceil(SAFETY_FRACTION * unitsNeeded), current));
          if (step > 0) cands.push({ kind:'mirror-remove', zone:z, kProbe:k, kStep:step, gainPerUnit:dPerUnit });
        }
        // - If reversal is OFF (heating) but zone needs cool, try removing heating mirrors
        if (!reverse[z] && (assignM[z] || 0) > 0) {
          const current = assignM[z] || 0;
          const k = MIRROR_PROBE_MIN;;
          const score = withTempChange(() => { assignM[z] = current - k; }, () => objective(passLevel));
          const dPerUnit = (baseScore - score) / k;
          const tAfter = withTempChange(() => { assignM[z] = current - k; }, () => getZoneTemp(z));
          const dT = (isFinite(tAfter) && isFinite(temps[z])) ? (tAfter - temps[z]) : 0; // expected < 0
          const dtPerUnit = dT / k;
          let unitsNeeded = (dtPerUnit < 0) ? Math.ceil((temps[z] - targets[z]) / (-dtPerUnit)) : 0;
          unitsNeeded = Math.max(0, Math.min(unitsNeeded, current));
          const step = Math.max(0, Math.min(Math.ceil(SAFETY_FRACTION * unitsNeeded), current));
          if (step > 0) cands.push({ kind:'mirror-remove', zone:z, kProbe:k, kStep:step, gainPerUnit:dPerUnit });
        }
        // - Lanterns only heat; if the zone needs cooling, try removing lanterns
        if ((assignL[z] || 0) > 0) {
          const current = assignL[z] || 0;
          const k = LANTERN_PROBE_MIN;;
          const score = withTempChange(() => { assignL[z] = current - k; }, () => objective(passLevel));
          const dPerUnit = (baseScore - score) / k;
          const tAfter = withTempChange(() => { assignL[z] = current - k; }, () => getZoneTemp(z));
          const dT = (isFinite(tAfter) && isFinite(temps[z])) ? (tAfter - temps[z]) : 0; // expected < 0
          const dtPerUnit = dT / k;
          let unitsNeeded = (dtPerUnit < 0) ? Math.ceil((temps[z] - targets[z]) / (-dtPerUnit)) : 0;
          unitsNeeded = Math.max(0, Math.min(unitsNeeded, current));
          const step = Math.max(0, Math.min(Math.ceil(SAFETY_FRACTION * unitsNeeded), current));
          if (step > 0) cands.push({ kind:'lantern-remove', zone:z, kProbe:k, kStep:step, gainPerUnit:dPerUnit });
        }
      }

      // Focus water (tons/sec)
      if (FOCUS_FLAG && (targets.water || 0) > 0 && (prio.focus || 5) <= passLevel) {
        const baseMelt = computeFocusMeltRate();
        const wantMore = baseMelt < (targets.water || 0) * (1 - WATER_REL_TOL);
        if (wantMore) {
          if (mirrorsLeft() > 0) {
          const k = MIRROR_PROBE_MIN;
            const score = withTempChange(() => { assignM.focus = (assignM.focus) + k; }, () => objective(passLevel));
            const dPerUnit = (baseScore - score) / k;
            const meltAfter = withTempChange(() => { assignM.focus = (assignM.focus) + k; }, () => computeFocusMeltRate());
            const dMelt = Math.max(0, meltAfter - baseMelt);
            const dMeltPerUnit = dMelt / k;
            let unitsNeeded = (dMeltPerUnit > 0) ? Math.ceil(((targets.water) - baseMelt) / dMeltPerUnit) : 0;
            unitsNeeded = Math.max(0, Math.min(unitsNeeded, mirrorsLeft()));
            const step = Math.max(0, Math.min(Math.ceil(SAFETY_FRACTION * unitsNeeded), mirrorsLeft()));
            if (step > 0) cands.push({ kind:'mirror', zone:'focus', reverse:false, kProbe:k, kStep:step, gainPerUnit:dPerUnit });
          }
          if (lanternsLeft() > 0) {
            const k = MIRROR_PROBE_MIN;
            const score = withTempChange(() => { assignL.focus = (assignL.focus) + k; }, () => objective(passLevel));
            const dPerUnit = (baseScore - score) / k;
            const meltAfter = withTempChange(() => { assignL.focus = (assignL.focus) + k; }, () => computeFocusMeltRate());
            const dMelt = Math.max(0, meltAfter - baseMelt);
            const dMeltPerUnit = dMelt / k;
            let unitsNeeded = (dMeltPerUnit > 0) ? Math.ceil(((targets.water) - baseMelt) / dMeltPerUnit) : 0;
            unitsNeeded = Math.max(0, Math.min(unitsNeeded, lanternsLeft()));
            const step = Math.max(0, Math.min(Math.ceil(SAFETY_FRACTION * unitsNeeded), lanternsLeft()));
            if (step > 0) cands.push({ kind:'lantern', zone:'focus', kProbe:k, kStep:step, gainPerUnit:dPerUnit });
          }
        }
      }

      // Reallocation candidates if out of resources
      const addReallocs = () => {
        // Mirrors
        if (mirrorsLeft() <= 0) {
          // donors: zones with lower priority than current pass and with some mirrors
          const donors = [...ZONES, 'focus'].filter(dz => (assignM[dz]) > 0)
            .filter(dz => (dz === 'focus' ? (prio.focus||5) : (prio[dz]||5)) > passLevel);
          const receivers = [...ZONES, 'focus'].filter(rz => {
            if (rz === 'focus') return FOCUS_FLAG && (targets.water)>0 && (prio.focus||5) <= passLevel;
            return (targets[rz]) > 0 && (prio[rz]||5) <= passLevel;
          });
          const baseScoreR = objective(passLevel);

          donors.forEach(dz => receivers.forEach(rz => {
            const donorHas = assignM[dz];
            const shift = Math.max(1, Math.min(donorHas, Math.ceil(Math.max(REALLOC_MIN, donorHas * REALLOC_PROBE_FRAC))));
            const cand = withTempChange(() => {
              // Reallocate without changing reversal; baseline alignment governs reversal.
              assignM[dz] = donorHas - shift;
              assignM[rz] = (assignM[rz]) + shift;
            }, () => objective(passLevel));
            const dPerUnit = (baseScoreR - cand) / shift;
            if (dPerUnit > 0) {
              cands.push({ kind:'mirror-realloc', from:dz, to:rz, kProbe:shift, kStep:shift, gainPerUnit:dPerUnit });
            }
          }));
        }
        // Lanterns
        if (lanternsLeft() <= 0) {
          const donors = [...ZONES, 'focus'].filter(dz => (assignL[dz]) > 0)
            .filter(dz => (dz === 'focus' ? (prio.focus||5) : (prio[dz]||5)) > passLevel);
          const receivers = [...ZONES, 'focus'].filter(rz => {
            if (rz === 'focus') return FOCUS_FLAG && (targets.water)>0 && (prio.focus||5) <= passLevel;
            // lanterns heat only; only receivers that need heat
            const t = getZoneTemp(rz);
            return (targets[rz]) > 0 && (prio[rz]||5) <= passLevel && isFinite(t) && t < (targets[rz]-K_TOL);
          });
          const baseScoreR = objective(passLevel);

          donors.forEach(dz => receivers.forEach(rz => {
            const donorHas = assignL[dz];
            const shift = Math.max(1, Math.min(donorHas, Math.ceil(Math.max(REALLOC_MIN, donorHas * REALLOC_PROBE_FRAC))));
            const cand = withTempChange(() => {
              assignL[dz] = donorHas - shift;
              assignL[rz] = (assignL[rz]) + shift;
            }, () => objective(passLevel));
            const dPerUnit = (baseScoreR - cand) / shift;
            if (dPerUnit > 0) {
              cands.push({ kind:'lantern-realloc', from:dz, to:rz, kProbe:shift, kStep:shift, gainPerUnit:dPerUnit });
            }
          }));
        }
      };
      addReallocs();

      // Rank by improvement per unit (descending)
      cands.sort((a, b) => (b.gainPerUnit || 0) - (a.gainPerUnit || 0));
      return cands;
    };

    const withinPassTolerance = (passLevel) => {
      const t = readTemps();
      for (const z of ZONES) {
        const tgt = targets[z] || 0;
        if (!(tgt > 0)) continue;
        if ((prio[z] || 5) <= passLevel) {
          if (!isFinite(t[z])) return false;
          if (Math.abs(t[z] - tgt) > K_TOL) return false;
        }
      }
      if (FOCUS_FLAG && (targets.water) > 0 && (prio.focus||5) <= passLevel) {
        const melt = computeFocusMeltRate();
        if (melt < (targets.water) * (1 - WATER_REL_TOL)) return false;
      }
      return true;
    };

    // ---------------- Pass loop with batched actions ----------------
    updateTemps();

    for (let pass = minP; pass <= maxP; pass++) {
      const hasActive =
        ZONES.some(z => (targets[z]) > 0 && (prio[z]||5) <= pass) ||
        (FOCUS_FLAG && (targets.water) > 0 && (prio.focus||5) <= pass);
      if (!hasActive) continue;

      let actions = 0;

      while (actions < MAX_ACTIONS_PER_PASS) {
        if (withinPassTolerance(pass)) break;
        updateTemps();
        const cands = buildCandidates(pass);
        if (!cands.length || (cands[0].gainPerUnit || 0) <= 0) break; // no improving move

        // Commit top candidate
        const best = cands[0];
        if (best.kind === 'mirror') {
          const step = Math.min(best.kStep, mirrorsLeft());
          if (step <= 0) break;
          assignM[best.zone] = (assignM[best.zone]) + step;
        } else if (best.kind === 'lantern') {
          const step = Math.min(best.kStep, lanternsLeft());
          if (step <= 0) break;
          assignL[best.zone] = (assignL[best.zone]) + step;
        } else if (best.kind === 'mirror-realloc') {
          const step = Math.min(best.kStep, assignM[best.from]);
          if (step <= 0) break;
          assignM[best.from] = (assignM[best.from]) - step;
          assignM[best.to] = (assignM[best.to]) + step;
        } else if (best.kind === 'lantern-realloc') {
          const step = Math.min(best.kStep, assignL[best.from]);
          if (step <= 0) break;
          assignL[best.from] = (assignL[best.from]) - step;
          assignL[best.to] = (assignL[best.to]) + step;
        } else if (best.kind === 'mirror-remove') {
          const step = Math.min(best.kStep, assignM[best.zone]);
          if (step <= 0) break;
          assignM[best.zone] = (assignM[best.zone]) - step;
        } else if (best.kind === 'lantern-remove') {
          const step = Math.min(best.kStep, assignL[best.zone]);
          if (step <= 0) break;
          assignL[best.zone] = (assignL[best.zone]) - step;
        }

        actions++;
        updateTemps();
      }

      // Do not flip reversal every pass; it is fixed by baseline evaluation above.
    }

    // Final clamping (defensive)
    clampTo(assignM, totalMirrors);
    clampTo(assignL, totalLanterns);

    // Persist assignments (already in place) and save warm-start snapshot
    mirrorOversightSettings.assignments.mirrors = assignM;
    mirrorOversightSettings.assignments.lanterns = assignL;
    mirrorOversightSettings.assignments.reversalMode = reverse;

    mirrorOversightSettings.lastSolution = {
      mirrors: { ...assignM },
      lanterns: { ...assignL },
      reversalMode: { ...reverse }
    };

  } finally {
    advancedAssignmentInProgress = false;
  }
  terraforming.restoreTemperatureState(snapshot);
}

class SpaceMirrorFacilityProject extends Project {
  constructor(config, name) {
    super(config, name);
    this.reversalAvailable = false;
    this.mirrorOversightSettings = createDefaultMirrorOversightSettings();
    mirrorOversightSettings = this.mirrorOversightSettings;
  }

  enableReversal() {
    this.reversalAvailable = true;
    if (typeof updateMirrorOversightUI === 'function') {
      updateMirrorOversightUI();
    }
  }

  update(deltaTime) {
    sanitizeMirrorDistribution();
    try {
      if (mirrorOversightSettings.advancedOversight) {
        runAdvancedOversightAssignments(this);
      }
    } catch (e) { /* swallow to avoid breaking tick */ }
    super.update(deltaTime);
  }

  renderUI(container) {
    const mirrorDetails = document.createElement('div');
    mirrorDetails.classList.add('info-card', 'mirror-details-card');
    mirrorDetails.innerHTML = `
      <div class="card-header">
        <span class="card-title">Mirror Status</span>
      </div>
      <div class="card-body">
        <div class="stats-grid three-col">
          <div class="stat-item">
            <span class="stat-label">Mirrors:</span>
            <span id="num-mirrors" class="stat-value">0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Power/Mirror:</span>
            <span id="power-per-mirror" class="stat-value">0 W</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Power/m²:</span>
            <span id="power-per-mirror-area" class="stat-value">0 W/m²</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total Power:</span>
            <span id="total-power" class="stat-value">0 W</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total Power/m²:</span>
            <span id="total-power-area" class="stat-value">0 W/m²</span>
          </div>
        </div>
      </div>
    `;
    if (typeof makeCollapsibleCard === 'function') makeCollapsibleCard(mirrorDetails);
    container.appendChild(mirrorDetails);

    const mirrorQuick = document.createElement('div');
    mirrorQuick.classList.add('quick-build-row');
    mirrorQuick.style.display = 'none';
    const mirrorQuickLabel = document.createElement('span');
    mirrorQuickLabel.classList.add('quick-build-label');
    mirrorQuickLabel.textContent = 'Quick Build:';
    mirrorQuick.appendChild(mirrorQuickLabel);
    const mirrorQuickButton = document.createElement('button');
    mirrorQuickButton.classList.add('quick-build-button');
    mirrorQuick.appendChild(mirrorQuickButton);
    // Reserve space so the build button can grow without moving x10
    const mirrorSpacer = document.createElement('div');
    mirrorSpacer.classList.add('qb-spacer');
    const mirrorMul = document.createElement('button');
    mirrorMul.classList.add('increment-button', 'qb-inc');
    mirrorMul.textContent = 'x10';
    mirrorQuick.appendChild(mirrorSpacer);
    mirrorQuick.appendChild(mirrorMul);
    const mirrorDiv = document.createElement('button');
    mirrorDiv.classList.add('increment-button', 'qb-inc');
    mirrorDiv.textContent = '/10';
    mirrorQuick.appendChild(mirrorDiv);
    const mirrorFiller = document.createElement('div');
    mirrorFiller.classList.add('qb-fill');
    mirrorQuick.appendChild(mirrorFiller);
    // Place inside the Mirror Status card body for nicer layout
    const mirrorCardBody = mirrorDetails.querySelector('.card-body');
    if (mirrorCardBody) mirrorCardBody.appendChild(mirrorQuick);

    const lanternDetails = document.createElement('div');
    lanternDetails.classList.add('info-card', 'lantern-details-card');
    lanternDetails.style.display = 'none';
    lanternDetails.innerHTML = `
      <div class="card-header">
        <span class="card-title">Lantern Status</span>
      </div>
      <div class="card-body">
        <div class="stats-grid three-col">
          <div class="stat-item">
            <span class="stat-label">Lanterns:</span>
            <span id="num-lanterns" class="stat-value">0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Power/Lantern:</span>
            <span id="power-per-lantern" class="stat-value">0 W</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Power/m²:</span>
            <span id="power-per-lantern-area" class="stat-value">0 W/m²</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total Power:</span>
            <span id="total-lantern-power" class="stat-value">0 W</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total Power/m²:</span>
            <span id="total-lantern-area" class="stat-value">0 W/m²</span>
          </div>
        </div>
      </div>
    `;
    if (typeof makeCollapsibleCard === 'function') makeCollapsibleCard(lanternDetails);
    container.appendChild(lanternDetails);

    const lanternQuick = document.createElement('div');
    lanternQuick.classList.add('quick-build-row');
    lanternQuick.style.display = 'none';
    const lanternQuickLabel = document.createElement('span');
    lanternQuickLabel.classList.add('quick-build-label');
    lanternQuickLabel.textContent = 'Quick Build:';
    lanternQuick.appendChild(lanternQuickLabel);
    const lanternQuickButton = document.createElement('button');
    lanternQuickButton.classList.add('quick-build-button');
    lanternQuick.appendChild(lanternQuickButton);
    // Reserve space so the build button can grow without moving x10
    const lanternSpacer = document.createElement('div');
    lanternSpacer.classList.add('qb-spacer');
    const lanternMul = document.createElement('button');
    lanternMul.classList.add('increment-button', 'qb-inc');
    lanternMul.textContent = 'x10';
    lanternQuick.appendChild(lanternSpacer);
    lanternQuick.appendChild(lanternMul);
    const lanternDiv = document.createElement('button');
    lanternDiv.classList.add('increment-button', 'qb-inc');
    lanternDiv.textContent = '/10';
    lanternQuick.appendChild(lanternDiv);
    const lanternFiller = document.createElement('div');
    lanternFiller.classList.add('qb-fill');
    lanternQuick.appendChild(lanternFiller);
    // Place inside the Lantern Status card body
    const lanternCardBody = lanternDetails.querySelector('.card-body');
    if (lanternCardBody) lanternCardBody.appendChild(lanternQuick);

    if (typeof initializeMirrorOversightUI === 'function') {
      initializeMirrorOversightUI(container);
    }
    projectElements[this.name] = {
      ...projectElements[this.name],
      mirrorDetails: {
        numMirrors: mirrorDetails.querySelector('#num-mirrors'),
        powerPerMirror: mirrorDetails.querySelector('#power-per-mirror'),
        powerPerMirrorArea: mirrorDetails.querySelector('#power-per-mirror-area'),
        totalPower: mirrorDetails.querySelector('#total-power'),
        totalPowerArea: mirrorDetails.querySelector('#total-power-area'),
      },
      lanternDetails: {
        container: lanternDetails,
        numLanterns: lanternDetails.querySelector('#num-lanterns'),
        powerPerLantern: lanternDetails.querySelector('#power-per-lantern'),
        powerPerLanternArea: lanternDetails.querySelector('#power-per-lantern-area'),
        totalPower: lanternDetails.querySelector('#total-lantern-power'),
        totalPowerArea: lanternDetails.querySelector('#total-lantern-area'),
      },
      quickBuild: {
        mirror: { container: mirrorQuick, button: mirrorQuickButton, mul: mirrorMul, div: mirrorDiv, count: 1 },
        lantern: { container: lanternQuick, button: lanternQuickButton, mul: lanternMul, div: lanternDiv, count: 1 },
      },
    };

    const els = projectElements[this.name];
    els.quickBuild.mirror.button.addEventListener('click', () => {
      if (buildings.spaceMirror) {
        buildings.spaceMirror.buildStructure(els.quickBuild.mirror.count);
        this.updateUI();
      }
    });
    els.quickBuild.mirror.mul.addEventListener('click', () => {
      els.quickBuild.mirror.count = multiplyByTen(els.quickBuild.mirror.count);
      this.updateUI();
    });
    els.quickBuild.mirror.div.addEventListener('click', () => {
      els.quickBuild.mirror.count = divideByTen(els.quickBuild.mirror.count);
      this.updateUI();
    });
    els.quickBuild.lantern.button.addEventListener('click', () => {
      if (buildings.hyperionLantern) {
        buildings.hyperionLantern.buildStructure(els.quickBuild.lantern.count);
        this.updateUI();
      }
    });
    els.quickBuild.lantern.mul.addEventListener('click', () => {
      els.quickBuild.lantern.count = multiplyByTen(els.quickBuild.lantern.count);
      this.updateUI();
    });
    els.quickBuild.lantern.div.addEventListener('click', () => {
      els.quickBuild.lantern.count = divideByTen(els.quickBuild.lantern.count);
      this.updateUI();
    });
  }

  updateUI() {
    const elements = projectElements[this.name];
    if (!elements || !elements.mirrorDetails) return;
    const numMirrors = buildings['spaceMirror'].active;
    const mirrorEffect = terraforming.calculateMirrorEffect();
    const powerPerMirror = mirrorEffect.interceptedPower;
    const powerPerMirrorArea = mirrorEffect.powerPerUnitArea;
    const totalPower = powerPerMirror * numMirrors;
    const totalPowerArea = powerPerMirrorArea * numMirrors;
    // Ensure unit text uses ASCII-safe format
    if (elements.mirrorDetails.powerPerMirrorArea) {
      elements.mirrorDetails.powerPerMirrorArea.textContent = `${formatNumber(powerPerMirrorArea, false, 2)} W/m²`;
    }
    if (elements.mirrorDetails.totalPowerArea) {
      elements.mirrorDetails.totalPowerArea.textContent = `${formatNumber(totalPowerArea, false, 2)} W/m²`;
    }

    elements.mirrorDetails.numMirrors.textContent = formatNumber(numMirrors, false, 2);
    elements.mirrorDetails.powerPerMirror.textContent = formatNumber(powerPerMirror, false, 2);
    elements.mirrorDetails.powerPerMirrorArea.textContent = `${formatNumber(powerPerMirrorArea, false, 2)} W/m²`;
    elements.mirrorDetails.totalPower.textContent = formatNumber(totalPower, false, 2);
    elements.mirrorDetails.totalPowerArea.textContent = `${formatNumber(totalPowerArea, false, 2)} W/m²`;

    if (elements.quickBuild && elements.quickBuild.mirror) {
      const qb = elements.quickBuild.mirror;
      qb.container.style.display = this.isCompleted ? 'grid' : 'none';
      if (this.isCompleted) {
        const building = buildings.spaceMirror;
        qb.button.textContent = `Build ${formatNumber(qb.count, true)} ${building.displayName}`;
        const canAfford = typeof building.canAfford === 'function' ? building.canAfford(qb.count) : true;
        if (qb.button.classList) {
          if (!canAfford) qb.button.classList.add('cant-afford');
          else qb.button.classList.remove('cant-afford');
        } else {
          qb.button.style.color = canAfford ? '' : 'red';
        }
      }
    }

    if (elements.lanternDetails) {
      const lantern = buildings.hyperionLantern;
      const unlocked = lantern && lantern.unlocked;
      const showLantern = this.isCompleted && unlocked;
      elements.lanternDetails.container.style.display = showLantern ? 'block' : 'none';
      if (elements.quickBuild && elements.quickBuild.lantern) {
        elements.quickBuild.lantern.container.style.display = showLantern ? 'grid' : 'none';
      }
      if (showLantern) {
        const area = terraforming.celestialParameters.crossSectionArea || terraforming.celestialParameters.surfaceArea;
        const productivity = typeof lantern.productivity === 'number' ? lantern.productivity : 1;
        const numLanterns = lantern.active || 0;
        const powerPerLantern = lantern.powerPerBuilding || 0;
        const powerPerLanternArea = area > 0 ? powerPerLantern / area : 0;
        const totalLanternPower = powerPerLantern * numLanterns * productivity;
        const totalLanternArea = powerPerLanternArea * numLanterns * productivity;
        // Ensure unit text uses ASCII-safe format
        if (elements.lanternDetails.powerPerLanternArea) {
          elements.lanternDetails.powerPerLanternArea.textContent = `${formatNumber(powerPerLanternArea, false, 2)} W/²`;
        }
        if (elements.lanternDetails.totalPowerArea) {
          elements.lanternDetails.totalPowerArea.textContent = `${formatNumber(totalLanternArea, false, 2)} W/²`;
        }
        elements.lanternDetails.numLanterns.textContent = formatNumber(numLanterns, false, 2);
        elements.lanternDetails.powerPerLantern.textContent = formatNumber(powerPerLantern, false, 2);
        elements.lanternDetails.powerPerLanternArea.textContent = `${formatNumber(powerPerLanternArea, false, 2)} W/m²`;
        elements.lanternDetails.totalPower.textContent = formatNumber(totalLanternPower, false, 2);
        elements.lanternDetails.totalPowerArea.textContent = `${formatNumber(totalLanternArea, false, 2)} W/m²`;

        if (elements.quickBuild && elements.quickBuild.lantern) {
          const qb = elements.quickBuild.lantern;
          qb.button.textContent = `Build ${formatNumber(qb.count, true)} ${lantern.displayName}`;
          const canAfford = typeof lantern.canAfford === 'function' ? lantern.canAfford(qb.count) : true;
          if (qb.button.classList) {
            if (!canAfford) qb.button.classList.add('cant-afford');
            else qb.button.classList.remove('cant-afford');
          } else {
            qb.button.style.color = canAfford ? '' : 'red';
          }
        }
      }
    }

    if (typeof updateMirrorOversightUI === 'function') {
      updateMirrorOversightUI();
    }
  }

  saveState() {
    return {
      ...super.saveState(),
      mirrorOversightSettings: JSON.parse(JSON.stringify(this.mirrorOversightSettings)),
    };
  }

  loadState(state) {
    super.loadState(state);
    this.mirrorOversightSettings = createDefaultMirrorOversightSettings();
    mirrorOversightSettings = this.mirrorOversightSettings;
    const saved = state?.mirrorOversightSettings || {};
    const settings = this.mirrorOversightSettings;

    if (saved.distribution) {
      Object.assign(settings.distribution, saved.distribution);
      ['tropical','temperate','polar','focus','unassigned'].forEach(z => {
        const v = Number(settings.distribution[z]);
        settings.distribution[z] = isNaN(v) ? 0 : v;
      });
    }

    settings.applyToLantern = !!saved.applyToLantern;
    settings.useFinerControls = !!saved.useFinerControls;
    if (typeof saved.assignmentStep === 'object') {
      settings.assignmentStep.mirrors = Math.max(1, Math.floor(saved.assignmentStep.mirrors)) || 1;
      settings.assignmentStep.lanterns = Math.max(1, Math.floor(saved.assignmentStep.lanterns)) || 1;
    } else {
      const val = typeof saved.assignmentStep === 'number' && saved.assignmentStep > 0 ? saved.assignmentStep : 1;
      settings.assignmentStep.mirrors = val;
      settings.assignmentStep.lanterns = val;
    }
    settings.advancedOversight = !!saved.advancedOversight;
    settings.waterMultiplier = typeof saved.waterMultiplier === 'number' && saved.waterMultiplier > 0
      ? saved.waterMultiplier
      : 1000;

    if (saved.targets) {
      Object.assign(settings.targets, saved.targets);
      ['tropical','temperate','polar','water'].forEach(k => {
        const v = Number(settings.targets[k]);
        settings.targets[k] = isNaN(v) ? 0 : v;
      });
    }

    if (saved.tempMode) {
      Object.assign(settings.tempMode, saved.tempMode);
      ['tropical','temperate','polar'].forEach(z => {
        const val = settings.tempMode[z];
        settings.tempMode[z] = (val === 'day' || val === 'night') ? val : 'average';
      });
    }

    if (saved.priority) {
      Object.assign(settings.priority, saved.priority);
      ['tropical','temperate','polar','focus'].forEach(z => {
        const val = parseInt(settings.priority[z], 10);
        settings.priority[z] = val >= 1 && val <= 5 ? val : 1;
      });
    }

    if (saved.autoAssign) {
      Object.assign(settings.autoAssign, saved.autoAssign);
      ['tropical','temperate','polar','focus','any'].forEach(z => {
        settings.autoAssign[z] = !!settings.autoAssign[z];
      });
    }

    if (saved.assignments) {
      const sa = saved.assignments;
      if (sa.mirrors) {
        Object.assign(settings.assignments.mirrors, sa.mirrors);
        ['tropical','temperate','polar','focus','unassigned','any'].forEach(z => {
          const v = Number(settings.assignments.mirrors[z]);
          settings.assignments.mirrors[z] = isNaN(v) ? 0 : v;
        });
      }
      if (sa.lanterns) {
        Object.assign(settings.assignments.lanterns, sa.lanterns);
        ['tropical','temperate','polar','focus','unassigned','any'].forEach(z => {
          const v = Number(settings.assignments.lanterns[z]);
          settings.assignments.lanterns[z] = isNaN(v) ? 0 : v;
        });
      }
      if (sa.reversalMode) {
        Object.assign(settings.assignments.reversalMode, sa.reversalMode);
        ['tropical','temperate','polar','focus','any'].forEach(z => {
          settings.assignments.reversalMode[z] = !!settings.assignments.reversalMode[z];
        });
      }
    }

    if (typeof updateMirrorOversightUI === 'function') {
      updateMirrorOversightUI();
    }
  }
}

// Expose constructor globally for browser usage
if (typeof globalThis !== 'undefined') {
  globalThis.SpaceMirrorFacilityProject = SpaceMirrorFacilityProject;
  globalThis.setMirrorDistribution = setMirrorDistribution;
  globalThis.resetMirrorOversightSettings = resetMirrorOversightSettings;
  globalThis.initializeMirrorOversightUI = initializeMirrorOversightUI;
  globalThis.updateMirrorOversightUI = updateMirrorOversightUI;
  globalThis.updateZonalFluxTable = updateZonalFluxTable;
  globalThis.applyFocusedMelt = applyFocusedMelt;
  globalThis.calculateZoneSolarFluxWithFacility = calculateZoneSolarFluxWithFacility;
  globalThis.toggleFinerControls = toggleFinerControls;
  globalThis.updateAssignmentDisplays = updateAssignmentDisplays;
  globalThis.toggleAdvancedOversight = toggleAdvancedOversight;
  globalThis.runAdvancedOversightAssignments = runAdvancedOversightAssignments;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SpaceMirrorFacilityProject,
    setMirrorDistribution,
    resetMirrorOversightSettings,
    initializeMirrorOversightUI,
    updateMirrorOversightUI,
    updateZonalFluxTable,
    applyFocusedMelt,
    calculateZoneSolarFluxWithFacility,
    distributeAssignmentsFromSliders,
    distributeAutoAssignments,
    toggleFinerControls,
    updateAssignmentDisplays,
    toggleAdvancedOversight,
    runAdvancedOversightAssignments,
  };
}







