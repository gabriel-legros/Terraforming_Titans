// Mirror oversight controls
var mirrorOversightSettings = globalThis.mirrorOversightSettings || {
  distribution: { tropical: 0, temperate: 0, polar: 0, focus: 0 },
  applyToLantern: false,
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
  if (lanternDiv) {
    const unlocked = typeof buildings !== 'undefined' && buildings.hyperionLantern && buildings.hyperionLantern.unlocked;
    lanternDiv.style.display = unlocked ? 'flex' : 'none';
  }

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
    const dist = mirrorOversightSettings?.distribution || {};
    const focusPerc = dist.focus || 0;
    if (focusPerc > 0) {
      const mirrorPowerTotal = terraforming.calculateMirrorEffect().interceptedPower * (buildings['spaceMirror']?.active || 0);
      let lanternPowerTotal = 0;
      if (mirrorOversightSettings.applyToLantern) {
        const area = terraforming.celestialParameters.crossSectionArea || terraforming.celestialParameters.surfaceArea;
        lanternPowerTotal = terraforming.calculateLanternFlux() * area;
      }
      const focusPower = (mirrorPowerTotal + lanternPowerTotal) * focusPerc;
      const C_P_ICE = 2100; // J/kg·K
      const L_F_WATER = 334000; // J/kg
      const deltaT = Math.max(0, 273.15 - (terraforming.temperature.value || 0));
      const energyPerKg = C_P_ICE * deltaT + L_F_WATER;
      if (energyPerKg > 0 && focusPower > 0) {
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

  const totalMirrorPower = terraforming.calculateMirrorEffect().interceptedPower * (buildings['spaceMirror']?.active || 0);
  const totalLanternPower = terraforming.calculateLanternFlux() * (terraforming.celestialParameters.crossSectionArea || totalSurfaceArea);

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
    const dist = mirrorOversightSettings.distribution || {};
    const zonePerc = dist[zone] || 0;
    const globalPerc = 1 - ((dist.tropical || 0) + (dist.temperate || 0) + (dist.polar || 0) + (dist.focus || 0));

    distributedMirrorPower = totalMirrorPower * globalPerc;
    focusedMirrorPower = totalMirrorPower * zonePerc;

    if (mirrorOversightSettings.applyToLantern) {
      distributedLanternPower = totalLanternPower * globalPerc;
      focusedLanternPower = totalLanternPower * zonePerc;
    }

    const zoneArea = totalSurfaceArea * getZonePercentage(zone);
    if (zoneArea > 0 && zonePerc > 0) {
      focusedMirrorFlux = 4 * focusedMirrorPower / zoneArea;
      focusedLanternFlux = 4 * focusedLanternPower / zoneArea;
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
  };
}
