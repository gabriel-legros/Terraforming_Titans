// Mirror oversight controls
var mirrorOversightSettings = globalThis.mirrorOversightSettings || {
  percentage: 0,
  zone: 'tropical',
  applyToLantern: false,
};

function setMirrorFocusZone(zone) {
  const valid = ['tropical', 'temperate', 'polar'];
  if (valid.includes(zone)) {
    mirrorOversightSettings.zone = zone;
    updateMirrorOversightUI();
  }
}

function setMirrorFocusPercentage(value) {
  const v = Math.max(0, Math.min(100, value));
  mirrorOversightSettings.percentage = v / 100;
  updateMirrorOversightUI();
}

function resetMirrorOversightSettings() {
  mirrorOversightSettings.zone = 'tropical';
  mirrorOversightSettings.percentage = 0;
  mirrorOversightSettings.applyToLantern = false;
  updateMirrorOversightUI();
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
      <span class="info-tooltip-icon" title="Direct a percentage of mirrors to focus on a specific zone."></span>
    </div>
    <div class="card-body">
      <div class="control-group">
        <label for="mirror-oversight-zone">Target Zone:</label>
        <select id="mirror-oversight-zone">
          <option value="tropical">Tropical</option>
          <option value="temperate">Temperate</option>
          <option value="polar">Polar</option>
        </select>
      </div>
      <div class="control-group">
        <label for="mirror-oversight-slider">Focus Percentage:</label>
        <input type="range" id="mirror-oversight-slider" min="0" max="100" step="5" value="0">
        <span id="mirror-oversight-value" class="slider-value">0%</span>
      </div>
      <div id="mirror-oversight-lantern-div" class="control-group">
        <input type="checkbox" id="mirror-oversight-lantern">
        <label for="mirror-oversight-lantern">Apply to Hyperion Lantern</label>
      </div>
    </div>
  `;

  const select = div.querySelector('#mirror-oversight-zone');
  select.value = mirrorOversightSettings.zone;
  select.addEventListener('change', () => setMirrorFocusZone(select.value));

  const slider = div.querySelector('#mirror-oversight-slider');
  slider.value = mirrorOversightSettings.percentage * 100;
  slider.addEventListener('input', () => {
    const raw = slider.value;
    const val = (typeof raw === 'number' || typeof raw === 'string') ? Number(raw) : 0;
    setMirrorFocusPercentage(val);
  });

  const valueSpan = div.querySelector('#mirror-oversight-value');
  valueSpan.textContent = `${Math.round(mirrorOversightSettings.percentage * 100)}%`;

  const lanternCheckbox = div.querySelector('#mirror-oversight-lantern');
  lanternCheckbox.checked = mirrorOversightSettings.applyToLantern;
  lanternCheckbox.addEventListener('change', () => {
    mirrorOversightSettings.applyToLantern = lanternCheckbox.checked;
    updateMirrorOversightUI();
  });

  // Table showing zonal solar flux
  const fluxTable = document.createElement('table');
  fluxTable.id = 'mirror-flux-table';
  fluxTable.innerHTML = `
    <thead>
      <tr><th>Zone</th><th>Solar Flux (W/m²)</th></tr>
    </thead>
    <tbody>
      <tr><td>Tropical</td><td id="mirror-flux-tropical">0</td></tr>
      <tr><td>Temperate</td><td id="mirror-flux-temperate">0</td></tr>
      <tr><td>Polar</td><td id="mirror-flux-polar">0</td></tr>
    </tbody>
  `;
  div.appendChild(fluxTable);

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
  const slider = document.getElementById('mirror-oversight-slider');
  const valueSpan = document.getElementById('mirror-oversight-value');
  const select = document.getElementById('mirror-oversight-zone');
  const lantern = document.getElementById('mirror-oversight-lantern');
  const lanternDiv = document.getElementById('mirror-oversight-lantern-div');
  if (slider) slider.value = mirrorOversightSettings.percentage * 100;
  if (valueSpan) valueSpan.textContent = Math.round(mirrorOversightSettings.percentage * 100) + '%';
  if (select) select.value = mirrorOversightSettings.zone;
  if (lantern) lantern.checked = !!mirrorOversightSettings.applyToLantern;
  if (lanternDiv) {
    const unlocked = typeof buildings !== 'undefined' && buildings.hyperionLantern && buildings.hyperionLantern.unlocked;
    lanternDiv.style.display = unlocked ? 'block' : 'none';
  }

  if (enabled) {
    updateZonalFluxTable();
  }
}

function updateZonalFluxTable() {
  if (typeof document === 'undefined' || typeof terraforming === 'undefined') return;
  const zones = ['tropical', 'temperate', 'polar'];
  zones.forEach(zone => {
    const cell = document.getElementById(`mirror-flux-${zone}`);
    if (!cell) return;
    let flux = 0;
    if (typeof terraforming.calculateZoneSolarFlux === 'function') {
      flux = terraforming.calculateZoneSolarFlux(zone);
    }
    cell.textContent = formatNumber(flux, false, 2);
  });
}

class SpaceMirrorFacilityProject extends Project {
  renderUI(container) {
    const mirrorDetails = document.createElement('div');
    mirrorDetails.classList.add('mirror-details-card');
    mirrorDetails.innerHTML = `
      <div class="card-header">
        <span class="card-title">Mirror Status</span>
      </div>
      <div class="card-body">
        <div class="stats-grid">
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
    lanternDetails.classList.add('lantern-details-card');
    lanternDetails.style.display = 'none';
    lanternDetails.innerHTML = `
      <div class="card-header">
        <span class="card-title">Lantern Status</span>
      </div>
      <div class="card-body">
        <div class="stats-grid">
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
      initializeMirrorOversightUI(mirrorDetails);
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
  globalThis.setMirrorFocusZone = setMirrorFocusZone;
  globalThis.setMirrorFocusPercentage = setMirrorFocusPercentage;
  globalThis.resetMirrorOversightSettings = resetMirrorOversightSettings;
  globalThis.initializeMirrorOversightUI = initializeMirrorOversightUI;
  globalThis.updateMirrorOversightUI = updateMirrorOversightUI;
  globalThis.updateZonalFluxTable = updateZonalFluxTable;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SpaceMirrorFacilityProject,
    mirrorOversightSettings,
    setMirrorFocusZone,
    setMirrorFocusPercentage,
    resetMirrorOversightSettings,
    initializeMirrorOversightUI,
    updateMirrorOversightUI,
    updateZonalFluxTable,
  };
}
