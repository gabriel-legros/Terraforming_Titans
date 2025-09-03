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
    assignmentStep: 1,
    advancedOversight: false,
    targets: { tropical: 0, temperate: 0, polar: 0, water: 0 },
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
  mirrorOversightSettings.assignmentStep = 1;
  mirrorOversightSettings.advancedOversight = false;
  mirrorOversightSettings.targets = { tropical: 0, temperate: 0, polar: 0, water: 0 };
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
  const stepEl = document.getElementById('assignment-step-display');
  if (stepEl) stepEl.textContent = `x${formatNumber(mirrorOversightSettings.assignmentStep, true)}`;

  zones.forEach(zone => {
    types.forEach(type => {
      const plusBtn = document.querySelector(`.assign-plus[data-type="${type}"][data-zone="${zone}"]`);
      if (plusBtn) plusBtn.textContent = `+${formatNumber(mirrorOversightSettings.assignmentStep, true)}`;
      const minusBtn = document.querySelector(`.assign-minus[data-type="${type}"][data-zone="${zone}"]`);
      if (minusBtn) minusBtn.textContent = `-${formatNumber(mirrorOversightSettings.assignmentStep, true)}`;
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
  mirrorOversightSettings.advancedOversight = !!enable;
  mirrorOversightSettings.useFinerControls = !!enable;
  if (enable) {
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
      <div id="mirror-oversight-focus-group" class="control-group" style="display:none;">
        <label for="mirror-oversight-focus">Focusing:<span class="info-tooltip-icon" title="Concentrate mirror and lantern energy on a single point to melt surface ice into liquid water. Only surface ice melts and the warmest zone with ice is targeted first. Uses the heat required to warm the ice to 0°C plus the energy of fusion/melting.">&#9432;</span></label>
        <input type="range" id="mirror-oversight-focus" min="0" max="100" step="1" value="0">
        <span id="mirror-oversight-focus-value" class="slider-value">0%</span>
        <input type="checkbox" id="mirror-oversight-focus-reverse" class="slider-reversal-checkbox" data-zone="focus" style="display:none;">
        <label for="mirror-oversight-focus-reverse" class="slider-reverse-label" style="display:none;">Reverse</label>
      </div>
      <div class="control-group">
        <label for="mirror-oversight-any">Any Zone:</label>
        <input type="range" id="mirror-oversight-any" min="0" max="100" step="1" value="100">
        <span id="mirror-oversight-any-value" class="slider-value">100%</span>
        <input type="checkbox" id="mirror-oversight-any-reverse" class="slider-reversal-checkbox" data-zone="any" style="display:none;">
        <label for="mirror-oversight-any-reverse" class="slider-reverse-label" style="display:none;">Reverse</label>
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
    focus: div.querySelector('#mirror-oversight-focus'),
    any: div.querySelector('#mirror-oversight-any'),
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
    focus: div.querySelector('#mirror-oversight-focus-reverse'),
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
        <input type="number" id="adv-target-water" class="stat-value" step="0.001" value="0" style="font-size:12px; width:50px;">
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
      el.value = Number(mirrorOversightSettings.targets[k] || 0);
    } else {
      const base = (mirrorOversightSettings.targets[k] || 293.15);
      el.value = toDisp(base).toFixed(2);
    }
    el.addEventListener('change', () => {
      let raw = Number(el.value);
      if (k !== 'water') {
        const useC = (typeof gameSettings !== 'undefined' && gameSettings.useCelsius);
        if (useC) raw = raw + 273.15; // convert back to Kelvin
      }
      mirrorOversightSettings.targets[k] = isNaN(raw) ? 0 : raw;
    });
  });
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
      <tr><th>Zone</th><th>Average Solar Flux (W/m^2)</th><th>Temperature (${tempUnit})</th><th>Day Temperature (${tempUnit})</th></tr>
    </thead>
    <tbody>
      <tr><td>Tropical</td><td id="mirror-flux-tropical">0</td><td id="mirror-temp-tropical">0</td><td id="mirror-day-temp-tropical">0</td></tr>
      <tr><td>Temperate</td><td id="mirror-flux-temperate">0</td><td id="mirror-temp-temperate">0</td><td id="mirror-day-temp-temperate">0</td></tr>
      <tr><td>Polar</td><td id="mirror-flux-polar">0</td><td id="mirror-temp-polar">0</td><td id="mirror-day-temp-polar">0</td></tr>
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
      <div class="control-group step-controls">
        <button id="assignment-div10">/10</button>
        <span id="assignment-step-display">x1</span>
        <button id="assignment-mul10">x10</button>
      </div>
    </div>
    <div id="assignment-grid">
      <div class="grid-header">Zone</div>
      <div class="grid-header">Mirrors</div>
      <div class="grid-header">Lanterns</div>
      <div class="grid-header">Reversal</div>
      <div class="grid-header">Auto</div>

      <div class="grid-zone-label">Available</div>
      <div class="assign-cell">
        <button class="assign-zero" style="visibility: hidden;">0</button>
        <button class="assign-minus" style="visibility: hidden;">-1</button>
        <span id="available-mirrors">0</span>
        <button class="assign-plus" style="visibility: hidden;">+1</button>
        <button class="assign-max" style="visibility: hidden;">Max</button>
      </div>
      <div class="assign-cell available-lantern-cell" data-type="lanterns">
        <button class="assign-zero" style="visibility: hidden;">0</button>
        <button class="assign-minus" style="visibility: hidden;">-1</button>
        <span id="available-lanterns">0</span>
        <button class="assign-plus" style="visibility: hidden;">+1</button>
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
        <div class="grid-${zone === 'any' ? 'reversal-cell' : 'reversal-cell reversal-cell-with-checkbox'}">
          ${zone === 'any' ? '' : `<input type="checkbox" class="reversal-checkbox" data-zone="${zone}">`}
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
      <div class="grid-reversal-cell" data-zone="focus" style="display:none;">
        <input type="checkbox" class="reversal-checkbox" data-zone="focus">
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
  finerContent.querySelector('#assignment-mul10').addEventListener('click', () => {
    mirrorOversightSettings.assignmentStep *= 10;
    updateAssignmentDisplays();
  });
  finerContent.querySelector('#assignment-div10').addEventListener('click', () => {
    mirrorOversightSettings.assignmentStep = Math.max(1, Math.floor(mirrorOversightSettings.assignmentStep / 10));
    updateAssignmentDisplays();
  });

  finerContent.querySelectorAll('.assign-zero, .assign-minus, .assign-plus, .assign-max').forEach(btn => {
    btn.addEventListener('click', () => {
      const zone = btn.dataset.zone;
      const type = btn.dataset.type;
      const getTotal = () => type === 'mirrors' ? (buildings?.spaceMirror?.active || 0) : (buildings?.hyperionLantern?.active || 0);
      const assignments = mirrorOversightSettings.assignments[type];
      const step = mirrorOversightSettings.assignmentStep;
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
  if (waterInput && mirrorOversightSettings.targets && document.activeElement !== waterInput) {
    waterInput.value = Number(mirrorOversightSettings.targets.water || 0);
  }
  if (C.lanternHeader) C.lanternHeader.style.display = lanternUnlocked ? '' : 'none';
  if (C.lanternCells) C.lanternCells.forEach(cell => { cell.style.display = lanternUnlocked ? 'flex' : 'none'; });
  if (C.availableLanternCells) C.availableLanternCells.forEach(cell => { cell.style.display = lanternUnlocked ? 'flex' : 'none'; });
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
  if (C.focusZoneCells) C.focusZoneCells.forEach(el => { el.style.display = focusEnabled ? '' : 'none'; });
  const focusCell = document.querySelector('.assign-cell[data-zone="focus"]');
  if (focusCell) focusCell.style.display = focusEnabled ? 'flex' : 'none';


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
  if (header) header.textContent = `Temperature (${tempUnit})`;
  const dayHeader = C.dayTempHeader || document.querySelector('#mirror-flux-table thead tr th:nth-child(4)');
  if (dayHeader) dayHeader.textContent = `Day Temperature (${tempUnit})`;
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
      if (terraforming.temperature && terraforming.temperature.zones && terraforming.temperature.zones[zone]) {
        temp = terraforming.temperature.zones[zone].value;
      }
      if (typeof toDisplayTemperature === 'function') {
        temp = toDisplayTemperature(temp);
      }
      tempCell.textContent = formatNumber(temp, false, 2);
    }

    if (dayTempCell) {
      let dayTemp = 0;
      if (terraforming.temperature && terraforming.temperature.zones && terraforming.temperature.zones[zone]) {
        const d = terraforming.temperature.zones[zone].day;
        dayTemp = typeof d === 'number' ? d : 0;
      }
      if (typeof toDisplayTemperature === 'function') {
        dayTemp = toDisplayTemperature(dayTemp);
      }
      dayTempCell.textContent = formatNumber(dayTemp, false, 2);
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

  // Advanced oversight auto-assignment using bisection on zone temperature
  function runAdvancedOversightAssignments(project) {
    if (!mirrorOversightSettings.advancedOversight) return;
    if (advancedAssignmentInProgress) return;
    advancedAssignmentInProgress = true;
    try {
      if (typeof terraforming === 'undefined' || typeof buildings === 'undefined') return;

      const getZoneTemp = z => {
        const mode = mirrorOversightSettings.tempMode?.[z] || 'average';
        const data = terraforming?.temperature?.zones?.[z];
        if (!data) return NaN;
        if (mode === 'day') return data.day;
        if (mode === 'night') return data.night;
        return data.value;
      };

      const assignM = mirrorOversightSettings.assignments.mirrors;
      const assignL = mirrorOversightSettings.assignments.lanterns;
      const reverse = (mirrorOversightSettings.assignments.reversalMode ||= { tropical: false, temperate: false, polar: false, focus: false, any: false });

      // Reset all assignments and compute baseline temperature
      ['tropical', 'temperate', 'polar', 'focus'].forEach(z => {
        assignM[z] = 0;
        assignL[z] = 0;
        reverse[z] = false;
      });
      if (typeof terraforming.updateSurfaceTemperature === 'function') {
        terraforming.updateSurfaceTemperature();
      }

      let mirrorsLeft = Math.max(0, buildings.spaceMirror?.active || 0);
      let lanternsLeft = mirrorOversightSettings.applyToLantern ? Math.max(0, buildings.hyperionLantern?.active || 0) : 0;

      const priority = mirrorOversightSettings.priority || {};
      const zoneOrder = ['tropical', 'temperate', 'polar', 'focus'];
      const zones = zoneOrder
        .filter(z => typeof mirrorOversightSettings.targets?.[z] === 'number')
        .sort((a, b) => {
          const pa = priority[a] ?? 1;
          const pb = priority[b] ?? 1;
          if (pa !== pb) return pa - pb;
          return zoneOrder.indexOf(a) - zoneOrder.indexOf(b);
        });

      const tol = 0.001; // Kelvin tolerance

      for (const zone of zones) {
        if (mirrorsLeft <= 0 && lanternsLeft <= 0) break;

        const target = mirrorOversightSettings.targets[zone];
        if (!isFinite(target)) continue;

        if (typeof terraforming.updateSurfaceTemperature === 'function') {
          terraforming.updateSurfaceTemperature();
        }
        const current = getZoneTemp(zone);
        if (!isFinite(current)) continue;

        const needCooling = current > target;
        reverse[zone] = needCooling;

        // Bisection for mirrors
        let low = 0;
        let high = mirrorsLeft;
        assignL[zone] = 0;
        while (low < high) {
          const mid = Math.floor((low + high) / 2);
          assignM[zone] = mid;
          if (typeof terraforming.updateSurfaceTemperature === 'function') {
            terraforming.updateSurfaceTemperature();
          }
          const temp = getZoneTemp(zone);
          if (!needCooling) {
            if (temp < target - tol) low = mid + 1; else high = mid;
          } else {
            if (temp > target + tol) low = mid + 1; else high = mid;
          }
        }
        assignM[zone] = Math.min(low, mirrorsLeft);
        if (typeof terraforming.updateSurfaceTemperature === 'function') {
          terraforming.updateSurfaceTemperature();
        }
        const afterMirrors = getZoneTemp(zone);
        mirrorsLeft -= assignM[zone];

        // If still short on heating, assign lanterns last
        if (!needCooling && afterMirrors < target - tol && lanternsLeft > 0) {
          let lLow = 0;
          let lHigh = lanternsLeft;
          while (lLow < lHigh) {
            const mid = Math.floor((lLow + lHigh) / 2);
            assignL[zone] = mid;
            if (typeof terraforming.updateSurfaceTemperature === 'function') {
              terraforming.updateSurfaceTemperature();
            }
            const temp = getZoneTemp(zone);
            if (temp < target - tol) lLow = mid + 1; else lHigh = mid;
          }
          assignL[zone] = Math.min(lLow, lanternsLeft);
          if (typeof terraforming.updateSurfaceTemperature === 'function') {
            terraforming.updateSurfaceTemperature();
          }
          lanternsLeft -= assignL[zone];
        }
      }

      mirrorOversightSettings.assignments.mirrors = assignM;
      mirrorOversightSettings.assignments.lanterns = assignL;
      mirrorOversightSettings.assignments.reversalMode = reverse;
    } finally {
      advancedAssignmentInProgress = false;
    }
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
    };
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

    if (elements.lanternDetails) {
      const lantern = buildings.hyperionLantern;
      const unlocked = lantern && lantern.unlocked;
      elements.lanternDetails.container.style.display = unlocked ? 'block' : 'none';
      if (unlocked) {
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
    settings.assignmentStep = typeof saved.assignmentStep === 'number' && saved.assignmentStep > 0
      ? saved.assignmentStep
      : 1;
    settings.advancedOversight = !!saved.advancedOversight;

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







