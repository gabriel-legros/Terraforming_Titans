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
  div.classList.add('mirror-oversight');
  div.style.display = 'none';

  const label = document.createElement('span');
  label.textContent = 'Direct a percent of mirrors to focus on a specific zone : ';
  const tooltip = document.createElement('span');
  tooltip.classList.add('info-tooltip-icon');
  tooltip.title = 'Direct a percent of mirrors to focus on a specific zone.';
  label.appendChild(tooltip);
  div.appendChild(label);

  const select = document.createElement('select');
  select.id = 'mirror-oversight-zone';
  ['tropical', 'temperate', 'polar'].forEach(z => {
    const opt = document.createElement('option');
    opt.value = z;
    opt.textContent = z.charAt(0).toUpperCase() + z.slice(1);
    select.appendChild(opt);
  });
  select.value = mirrorOversightSettings.zone;
  select.addEventListener('change', () => setMirrorFocusZone(select.value));
  div.appendChild(select);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = 0;
  slider.max = 100;
  slider.step = 5;
  slider.id = 'mirror-oversight-slider';
  slider.value = mirrorOversightSettings.percentage * 100;
  slider.addEventListener('input', () => {
    const raw = slider.value;
    const val = (typeof raw === 'number' || typeof raw === 'string') ? Number(raw) : 0;
    setMirrorFocusPercentage(val);
  });
  div.appendChild(slider);

  const valueSpan = document.createElement('span');
  valueSpan.id = 'mirror-oversight-value';
  valueSpan.classList.add('slider-value');
  const initRaw = slider.value;
  const initVal = (typeof initRaw === 'number' || typeof initRaw === 'string') ? Number(initRaw) : 0;
  valueSpan.textContent = initVal + '%';
  div.appendChild(valueSpan);

  const lanternDiv = document.createElement('div');
  lanternDiv.id = 'mirror-oversight-lantern-div';
  const lanternCheckbox = document.createElement('input');
  lanternCheckbox.type = 'checkbox';
  lanternCheckbox.id = 'mirror-oversight-lantern';
  lanternCheckbox.checked = mirrorOversightSettings.applyToLantern;
  lanternCheckbox.addEventListener('change', () => {
    mirrorOversightSettings.applyToLantern = lanternCheckbox.checked;
    updateMirrorOversightUI();
  });
  const lanternLabel = document.createElement('label');
  lanternLabel.htmlFor = 'mirror-oversight-lantern';
  lanternLabel.textContent = 'Apply to Hyperion Lantern';
  lanternDiv.appendChild(lanternCheckbox);
  lanternDiv.appendChild(lanternLabel);
  div.appendChild(lanternDiv);

  container.appendChild(div);
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
}

class SpaceMirrorFacilityProject extends Project {
  renderUI(container) {
    const mirrorDetails = document.createElement('div');
    mirrorDetails.classList.add('mirror-details');
    mirrorDetails.innerHTML = `
      <p>Mirrors: <span id="num-mirrors">0</span></p>
      <p>Power/Mirror: <span id="power-per-mirror">0</span>W | Per m²: <span id="power-per-mirror-area">0</span>W/m²</p>
      <p>Total Power: <span id="total-power">0</span>W | Per m²: <span id="total-power-area">0</span>W/m²</p>
    `;
    container.appendChild(mirrorDetails);

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
    elements.mirrorDetails.powerPerMirrorArea.textContent = formatNumber(powerPerMirrorArea, false, 2);
    elements.mirrorDetails.totalPower.textContent = formatNumber(totalPower, false, 2);
    elements.mirrorDetails.totalPowerArea.textContent = formatNumber(totalPowerArea, false, 2);

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
  };
}
