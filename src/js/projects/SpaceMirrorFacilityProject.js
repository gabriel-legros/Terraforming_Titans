// Mirror oversight controls
var mirrorOversightSettings = globalThis.mirrorOversightSettings || {
  distribution: { tropical: 0, temperate: 0, polar: 0, focus: 0 },
  applyToLantern: false,
  useFinerControls: false,
  assignmentStep: 1,
  autoAssign: { tropical: false, temperate: false, polar: false, focus: false, any: false },
  assignments: {
    mirrors: { tropical: 0, temperate: 0, polar: 0, focus: 0, any: 0 },
    lanterns: { tropical: 0, temperate: 0, polar: 0, focus: 0, any: 0 }
  }
};

function setMirrorDistribution(zone, value) {
  const zones = ['tropical', 'temperate', 'polar', 'focus'];
  if (!zones.includes(zone)) return;
  const dist = mirrorOversightSettings.distribution;
  const v = Math.max(0, Math.min(100, Math.round(value)));
  dist[zone] = v / 100;
  let total = dist.tropical + dist.temperate + dist.polar + dist.focus;
  if (total > 1) {
    let excess = total - 1;
    zones.filter(z => z !== zone).forEach(z => {
      if (excess > 0) {
        const reduce = Math.min(dist[z], excess);
        dist[z] -= reduce;
        excess -= reduce;
      }
    });
  }
  updateMirrorOversightUI();
}

function resetMirrorOversightSettings() {
  mirrorOversightSettings.distribution.tropical = 0;
  mirrorOversightSettings.distribution.temperate = 0;
  mirrorOversightSettings.distribution.polar = 0;
  mirrorOversightSettings.distribution.focus = 0;
  mirrorOversightSettings.applyToLantern = false;
  mirrorOversightSettings.useFinerControls = false;
  mirrorOversightSettings.assignmentStep = 1;
  mirrorOversightSettings.autoAssign = { tropical: false, temperate: false, polar: false, focus: false, any: false };
  mirrorOversightSettings.assignments.mirrors = { tropical: 0, temperate: 0, polar: 0, focus: 0, any: 0 };
  mirrorOversightSettings.assignments.lanterns = { tropical: 0, temperate: 0, polar: 0, focus: 0, any: 0 };
  updateMirrorOversightUI();
}

function distributeAssignmentsFromSliders(type) {
  if (typeof buildings === 'undefined') return;
  const dist = mirrorOversightSettings.distribution || {};
  const total = type === 'mirrors'
    ? (buildings.spaceMirror?.active || 0)
    : (buildings.hyperionLantern?.active || 0);
  const zones = ['tropical', 'temperate', 'polar', 'focus'];
  const raw = zones.map(z => ({ zone: z, value: total * (dist[z] || 0) }));
  const globalPerc = 1 - ((dist.tropical || 0) + (dist.temperate || 0) + (dist.polar || 0) + (dist.focus || 0));
  raw.push({ zone: 'any', value: total * globalPerc });
  const assignments = {};
  let used = 0;
  raw.forEach(r => {
    assignments[r.zone] = Math.floor(r.value);
    used += assignments[r.zone];
  });
  let remaining = total - used;
  raw.sort((a, b) => (b.value % 1) - (a.value % 1));
  for (const r of raw) {
    if (remaining <= 0) break;
    assignments[r.zone] += 1;
    remaining--;
  }
  mirrorOversightSettings.assignments[type] = assignments;
  distributeAutoAssignments(type);
}

function distributeAutoAssignments(type) {
  if (typeof buildings === 'undefined') return;
  const zones = ['tropical', 'temperate', 'polar', 'focus', 'any'];
  const total = type === 'mirrors'
    ? (buildings.spaceMirror?.active || 0)
    : (buildings.hyperionLantern?.active || 0);
  const assignments = mirrorOversightSettings.assignments[type];
  zones.forEach(z => {
    if (mirrorOversightSettings.autoAssign[z]) assignments[z] = 0;
  });
  let used = zones.reduce((s, z) => s + (assignments[z] || 0), 0);
  let remaining = Math.max(0, total - used);
  const activeZones = zones.filter(z => mirrorOversightSettings.autoAssign[z]);
  if (activeZones.length && remaining > 0) {
    if (mirrorOversightSettings.autoAssign.any) {
      const dist = mirrorOversightSettings.distribution || {};
      const globalPerc = 1 - ((dist.tropical || 0) + (dist.temperate || 0) + (dist.polar || 0) + (dist.focus || 0));
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

function updateAssignmentDisplays() {
  const types = ['mirrors', 'lanterns'];
  const zones = ['tropical', 'temperate', 'polar', 'focus', 'any'];
  types.forEach(type => {
    zones.forEach(zone => {
      const el = document.getElementById(`${type}-assign-${zone}`);
      if (el) {
        el.textContent = mirrorOversightSettings.assignments[type][zone] || 0;
      }
    });
  });
  const stepEl = document.getElementById('assignment-step-display');
  if (stepEl) stepEl.textContent = mirrorOversightSettings.assignmentStep;
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
      <div class="control-group">
        <label for="mirror-oversight-tropical">Tropical:</label>
        <input type="range" id="mirror-oversight-tropical" min="0" max="100" step="1" value="0">
        <span id="mirror-oversight-tropical-value" class="slider-value">0%</span>
      </div>
      <div class="control-group">
        <label for="mirror-oversight-temperate">Temperate:</label>
        <input type="range" id="mirror-oversight-temperate" min="0" max="100" step="1" value="0">
        <span id="mirror-oversight-temperate-value" class="slider-value">0%</span>
      </div>
      <div class="control-group">
        <label for="mirror-oversight-polar">Polar:</label>
        <input type="range" id="mirror-oversight-polar" min="0" max="100" step="1" value="0">
        <span id="mirror-oversight-polar-value" class="slider-value">0%</span>
      </div>
      <div id="mirror-oversight-focus-group" class="control-group" style="display:none;">
        <label for="mirror-oversight-focus">Focusing:<span class="info-tooltip-icon" title="Concentrate mirror and lantern energy on a single point to melt surface ice into liquid water. Only surface ice melts and the warmest zone with ice is targeted first. Uses the heat required to warm the ice to 0°C plus the energy of fusion/melting.">&#9432;</span></label>
        <input type="range" id="mirror-oversight-focus" min="0" max="100" step="1" value="0">
        <span id="mirror-oversight-focus-value" class="slider-value">0%</span>
      </div>
      <div class="control-group">
        <label for="mirror-oversight-any">Any Zone:</label>
        <input type="range" id="mirror-oversight-any" min="0" max="100" step="1" value="100" disabled>
        <span id="mirror-oversight-any-value" class="slider-value">100%</span>
      </div>
      <div id="mirror-oversight-lantern-div" class="control-group">
        <input type="checkbox" id="mirror-oversight-lantern">
        <label for="mirror-oversight-lantern">Apply to Hyperion Lantern</label>
      </div>
    </div>
  `;

  const sliders = {
    tropical: div.querySelector('#mirror-oversight-tropical'),
    temperate: div.querySelector('#mirror-oversight-temperate'),
    polar: div.querySelector('#mirror-oversight-polar'),
    focus: div.querySelector('#mirror-oversight-focus'),
  };
  Object.keys(sliders).forEach(zone => {
    sliders[zone].addEventListener('input', () => {
      const raw = sliders[zone].value;
      const val = (typeof raw === 'number' || typeof raw === 'string') ? Number(raw) : 0;
      setMirrorDistribution(zone, val);
    });
  });

  const lanternCheckbox = div.querySelector('#mirror-oversight-lantern');
  lanternCheckbox.checked = mirrorOversightSettings.applyToLantern;
  lanternCheckbox.addEventListener('change', () => {
    mirrorOversightSettings.applyToLantern = lanternCheckbox.checked;
    updateMirrorOversightUI();
  });

  // Table showing zonal average solar flux and temperature
  const fluxTable = document.createElement('table');
  fluxTable.id = 'mirror-flux-table';
  const tempUnit = (typeof getTemperatureUnit === 'function') ? getTemperatureUnit() : 'K';
  fluxTable.innerHTML = `
    <thead>
      <tr><th>Zone</th><th>Average Solar Flux (W/m²)</th><th>Temperature (${tempUnit})</th></tr>
    </thead>
    <tbody>
      <tr><td>Tropical</td><td id="mirror-flux-tropical">0</td><td id="mirror-temp-tropical">0</td></tr>
      <tr><td>Temperate</td><td id="mirror-flux-temperate">0</td><td id="mirror-temp-temperate">0</td></tr>
      <tr><td>Polar</td><td id="mirror-flux-polar">0</td><td id="mirror-temp-polar">0</td></tr>
    </tbody>
  `;
  div.appendChild(fluxTable);

  const finerToggle = document.createElement('div');
  finerToggle.id = 'mirror-finer-toggle';
  finerToggle.classList.add('collapse-toggle');
  finerToggle.innerHTML = '<span id="mirror-finer-icon">▶</span> Finer Controls';
  finerToggle.style.cursor = 'pointer';
  const finerContent = document.createElement('div');
  finerContent.id = 'mirror-finer-content';
  finerContent.style.display = 'none';
  finerContent.innerHTML = `
    <div class="control-group">
      <input type="checkbox" id="mirror-use-finer">
      <label for="mirror-use-finer">Use Finer Controls</label>
    </div>
    <div class="control-group">
      <button id="assignment-div10">/10</button>
      <span id="assignment-step-display">1</span>
      <button id="assignment-mul10">x10</button>
    </div>
    <table id="assignment-table">
      <thead><tr><th>Zone</th><th>Mirrors</th><th>Lanterns</th><th>Auto</th></tr></thead>
      <tbody>
        <tr data-zone="tropical">
          <td>Tropical</td>
          <td class="assign-cell" data-type="mirrors" data-zone="tropical">
            <button class="assign-zero">0</button>
            <button class="assign-minus">-1</button>
            <span id="mirrors-assign-tropical"></span>
            <button class="assign-plus">+1</button>
            <button class="assign-max">Max</button>
          </td>
          <td class="assign-cell" data-type="lanterns" data-zone="tropical">
            <button class="assign-zero">0</button>
            <button class="assign-minus">-1</button>
            <span id="lanterns-assign-tropical"></span>
            <button class="assign-plus">+1</button>
            <button class="assign-max">Max</button>
          </td>
          <td><input type="checkbox" class="auto-assign" data-zone="tropical"></td>
        </tr>
        <tr data-zone="temperate">
          <td>Temperate</td>
          <td class="assign-cell" data-type="mirrors" data-zone="temperate">
            <button class="assign-zero">0</button>
            <button class="assign-minus">-1</button>
            <span id="mirrors-assign-temperate"></span>
            <button class="assign-plus">+1</button>
            <button class="assign-max">Max</button>
          </td>
          <td class="assign-cell" data-type="lanterns" data-zone="temperate">
            <button class="assign-zero">0</button>
            <button class="assign-minus">-1</button>
            <span id="lanterns-assign-temperate"></span>
            <button class="assign-plus">+1</button>
            <button class="assign-max">Max</button>
          </td>
          <td><input type="checkbox" class="auto-assign" data-zone="temperate"></td>
        </tr>
        <tr data-zone="polar">
          <td>Polar</td>
          <td class="assign-cell" data-type="mirrors" data-zone="polar">
            <button class="assign-zero">0</button>
            <button class="assign-minus">-1</button>
            <span id="mirrors-assign-polar"></span>
            <button class="assign-plus">+1</button>
            <button class="assign-max">Max</button>
          </td>
          <td class="assign-cell" data-type="lanterns" data-zone="polar">
            <button class="assign-zero">0</button>
            <button class="assign-minus">-1</button>
            <span id="lanterns-assign-polar"></span>
            <button class="assign-plus">+1</button>
            <button class="assign-max">Max</button>
          </td>
          <td><input type="checkbox" class="auto-assign" data-zone="polar"></td>
        </tr>
        <tr data-zone="any" id="assignment-any-row">
          <td>Any Zone</td>
          <td class="assign-cell" data-type="mirrors" data-zone="any">
            <button class="assign-zero">0</button>
            <button class="assign-minus">-1</button>
            <span id="mirrors-assign-any"></span>
            <button class="assign-plus">+1</button>
            <button class="assign-max">Max</button>
          </td>
          <td class="assign-cell" data-type="lanterns" data-zone="any">
            <button class="assign-zero">0</button>
            <button class="assign-minus">-1</button>
            <span id="lanterns-assign-any"></span>
            <button class="assign-plus">+1</button>
            <button class="assign-max">Max</button>
          </td>
          <td><input type="checkbox" class="auto-assign" data-zone="any"></td>
        </tr>
        <tr data-zone="focus" id="assignment-focus-row" style="display:none;">
          <td>Focusing</td>
          <td class="assign-cell" data-type="mirrors" data-zone="focus">
            <button class="assign-zero">0</button>
            <button class="assign-minus">-1</button>
            <span id="mirrors-assign-focus"></span>
            <button class="assign-plus">+1</button>
            <button class="assign-max">Max</button>
          </td>
          <td class="assign-cell" data-type="lanterns" data-zone="focus">
            <button class="assign-zero">0</button>
            <button class="assign-minus">-1</button>
            <span id="lanterns-assign-focus"></span>
            <button class="assign-plus">+1</button>
            <button class="assign-max">Max</button>
          </td>
          <td><input type="checkbox" class="auto-assign" data-zone="focus"></td>
        </tr>
      </tbody>
    </table>
  `;
  div.appendChild(finerToggle);
  div.appendChild(finerContent);

  finerToggle.addEventListener('click', () => {
    const open = finerContent.style.display !== 'none';
    finerContent.style.display = open ? 'none' : 'block';
    const icon = document.getElementById('mirror-finer-icon');
    if (icon) icon.textContent = open ? '▶' : '▼';
  });

  const useFiner = finerContent.querySelector('#mirror-use-finer');
  useFiner.addEventListener('change', () => {
    toggleFinerControls(useFiner.checked);
  });
  finerContent.querySelectorAll('.auto-assign').forEach(box => {
    box.addEventListener('change', () => {
      const zone = box.dataset.zone;
      mirrorOversightSettings.autoAssign[zone] = box.checked;
      distributeAutoAssignments('mirrors');
      distributeAutoAssignments('lanterns');
      updateAssignmentDisplays();
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
  finerContent.querySelectorAll('.assign-cell').forEach(cell => {
    const zone = cell.dataset.zone;
    const type = cell.dataset.type;
    const getTotal = () => type === 'mirrors' ? (buildings?.spaceMirror?.active || 0) : (buildings?.hyperionLantern?.active || 0);
    const zeroBtn = cell.querySelector('.assign-zero');
    const minusBtn = cell.querySelector('.assign-minus');
    const plusBtn = cell.querySelector('.assign-plus');
    const maxBtn = cell.querySelector('.assign-max');
    if (zeroBtn) {
      zeroBtn.addEventListener('click', () => {
        mirrorOversightSettings.assignments[type][zone] = 0;
        distributeAutoAssignments(type);
        updateAssignmentDisplays();
        updateZonalFluxTable();
      });
    }
    if (minusBtn) {
      minusBtn.addEventListener('click', () => {
        const step = mirrorOversightSettings.assignmentStep;
        mirrorOversightSettings.assignments[type][zone] = Math.max(0, (mirrorOversightSettings.assignments[type][zone] || 0) - step);
        distributeAutoAssignments(type);
        updateAssignmentDisplays();
        updateZonalFluxTable();
      });
    }
    if (plusBtn) {
      plusBtn.addEventListener('click', () => {
        const step = mirrorOversightSettings.assignmentStep;
        const current = mirrorOversightSettings.assignments[type][zone] || 0;
        const other = Object.keys(mirrorOversightSettings.assignments[type])
          .filter(z => z !== zone)
          .reduce((s,z)=>s+(mirrorOversightSettings.assignments[type][z]||0),0);
        const total = getTotal();
        mirrorOversightSettings.assignments[type][zone] = Math.min(current + step, total - other);
        distributeAutoAssignments(type);
        updateAssignmentDisplays();
        updateZonalFluxTable();
      });
    }
    if (maxBtn) {
      maxBtn.addEventListener('click', () => {
        const other = Object.keys(mirrorOversightSettings.assignments[type])
          .filter(z => z !== zone)
          .reduce((s,z)=>s+(mirrorOversightSettings.assignments[type][z]||0),0);
        const total = getTotal();
        mirrorOversightSettings.assignments[type][zone] = Math.max(0, total - other);
        distributeAutoAssignments(type);
        updateAssignmentDisplays();
        updateZonalFluxTable();
      });
    }
  });

  updateAssignmentDisplays();

  container.appendChild(div);

  updateZonalFluxTable();
}

function updateMirrorOversightUI() {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('mirror-oversight-container');
  if (!container) return;
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
  const dist = mirrorOversightSettings.distribution || { tropical: 0, temperate: 0, polar: 0, focus: 0 };
  const vals = {
    tropical: Math.round((dist.tropical || 0) * 100),
    temperate: Math.round((dist.temperate || 0) * 100),
    polar: Math.round((dist.polar || 0) * 100),
    focus: Math.round((dist.focus || 0) * 100)
  };
  const anyVal = 100 - vals.tropical - vals.temperate - vals.polar - vals.focus;

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

  ['tropical','temperate','polar','focus','any'].forEach(zone => {
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
  }
  const lanternHeader = document.querySelector('#assignment-table thead th:nth-child(3)');
  if (lanternHeader) lanternHeader.style.display = lanternUnlocked ? '' : 'none';
  document.querySelectorAll('#assignment-table td.assign-cell[data-type="lanterns"]').forEach(cell => {
    cell.style.display = lanternUnlocked ? '' : 'none';
  });

  const useFiner = mirrorOversightSettings.useFinerControls;
  ['tropical','temperate','polar','focus','any'].forEach(zone => {
    const slider = document.getElementById(`mirror-oversight-${zone}`);
    if (slider) slider.disabled = useFiner;
  });
  const useFinerEl = document.getElementById('mirror-use-finer');
  if (useFinerEl) useFinerEl.checked = useFiner;
  document.querySelectorAll('#assignment-table .auto-assign').forEach(box => {
    const zone = box.dataset.zone;
    box.checked = !!mirrorOversightSettings.autoAssign[zone];
  });
  const assignmentControls = document.querySelectorAll('#mirror-finer-content button, #mirror-finer-content input[type="checkbox"]:not(#mirror-use-finer)');
  assignmentControls.forEach(el => { el.disabled = !useFiner; });
  if (useFiner) {
    distributeAutoAssignments('mirrors');
    distributeAutoAssignments('lanterns');
    updateAssignmentDisplays();
  }
  const focusRow = document.getElementById('assignment-focus-row');
  if (focusRow) focusRow.style.display = focusEnabled ? '' : 'none';

  if (enabled) {
    updateZonalFluxTable();
  }
}

function updateZonalFluxTable() {
  if (typeof document === 'undefined' || typeof terraforming === 'undefined') return;
  const tempUnit = (typeof getTemperatureUnit === 'function') ? getTemperatureUnit() : 'K';
  const header = document.querySelector('#mirror-flux-table thead tr th:nth-child(3)');
  if (header) header.textContent = `Temperature (${tempUnit})`;
    const zones = ['tropical', 'temperate', 'polar'];
    zones.forEach(zone => {
      const fluxCell = document.getElementById(`mirror-flux-${zone}`);
      const tempCell = document.getElementById(`mirror-temp-${zone}`);
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
    if (mirrorOversightSettings.useFinerControls) {
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
  const baseSolar = terraforming.luminosity.solarFlux; // W/m²

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
    if (mirrorOversightSettings.useFinerControls) {
      distributeAutoAssignments('mirrors');
      distributeAutoAssignments('lanterns');
      const assignM = mirrorOversightSettings.assignments.mirrors || {};
      const assignL = mirrorOversightSettings.assignments.lanterns || {};
      distributedMirrorPower = mirrorPowerPer * (assignM.any || 0);
      distributedLanternPower = lanternPowerPer * (assignL.any || 0);
      focusedMirrorPower = mirrorPowerPer * (assignM[zone] || 0);
      focusedLanternPower = lanternPowerPer * (assignL[zone] || 0);
    } else {
      const dist = mirrorOversightSettings.distribution || {};
      const zonePerc = dist[zone] || 0;
      const globalPerc = 1 - ((dist.tropical || 0) + (dist.temperate || 0) + (dist.polar || 0) + (dist.focus || 0));

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

  const distributedMirrorFlux = totalSurfaceArea > 0 ? 4 * distributedMirrorPower / totalSurfaceArea : 0;
  const distributedLanternFlux = totalSurfaceArea > 0 ? 4 * distributedLanternPower / totalSurfaceArea : 0;

  const totalFluxForZone = (baseSolar + distributedMirrorFlux + distributedLanternFlux + focusedMirrorFlux + focusedLanternFlux) * ratio;

  return totalFluxForZone;
}

class SpaceMirrorFacilityProject extends Project {
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
}

// Expose constructor globally for browser usage
if (typeof globalThis !== 'undefined') {
  globalThis.SpaceMirrorFacilityProject = SpaceMirrorFacilityProject;
  globalThis.mirrorOversightSettings = mirrorOversightSettings;
  globalThis.setMirrorDistribution = setMirrorDistribution;
  globalThis.resetMirrorOversightSettings = resetMirrorOversightSettings;
  globalThis.initializeMirrorOversightUI = initializeMirrorOversightUI;
  globalThis.updateMirrorOversightUI = updateMirrorOversightUI;
  globalThis.updateZonalFluxTable = updateZonalFluxTable;
  globalThis.applyFocusedMelt = applyFocusedMelt;
  globalThis.calculateZoneSolarFluxWithFacility = calculateZoneSolarFluxWithFacility;
  globalThis.toggleFinerControls = toggleFinerControls;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SpaceMirrorFacilityProject,
    mirrorOversightSettings,
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
  };
}
