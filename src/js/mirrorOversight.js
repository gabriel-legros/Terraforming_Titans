// Space mirror oversight controls

// Default settings (reuse existing global if defined)
var mirrorOversightSettings = globalThis.mirrorOversightSettings || {
  percentage: 0, // 0-1 fraction of mirrors focused
  zone: 'tropical'
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
  updateMirrorOversightUI();
}

function initializeMirrorOversightUI(container) {
  if (!container) return;
  const div = document.createElement('div');
  div.id = 'mirror-oversight-container';
  div.classList.add('mirror-oversight');
  div.style.display = 'none';

  const label = document.createElement('span');
  label.textContent = 'Mirror Oversight ';
  const tooltip = document.createElement('span');
  tooltip.classList.add('info-tooltip-icon');
  tooltip.title = 'Direct a percent of mirrors to focus on a specific zone.';
  label.appendChild(tooltip);
  div.appendChild(label);

  const select = document.createElement('select');
  select.id = 'mirror-oversight-zone';
  ['tropical','temperate','polar'].forEach(z => {
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
    valueSpan.textContent = val + '%';
  });
  slider.addEventListener('change', () => setMirrorFocusPercentage(parseInt(slider.value,10)));
  div.appendChild(slider);

  const valueSpan = document.createElement('span');
  valueSpan.id = 'mirror-oversight-value';
  valueSpan.classList.add('slider-value');
  const initRaw = slider.value;
  const initVal = (typeof initRaw === 'number' || typeof initRaw === 'string') ? Number(initRaw) : 0;
  valueSpan.textContent = initVal + '%';
  div.appendChild(valueSpan);

  container.appendChild(div);
}

function updateMirrorOversightUI() {
  if (typeof document === 'undefined') return;
  const container = document.getElementById('mirror-oversight-container');
  if (!container) return;
  if (typeof projectManager !== 'undefined' && projectManager.isBooleanFlagSet &&
      projectManager.isBooleanFlagSet('spaceMirrorFacilityOversight')) {
    container.style.display = 'block';
  } else {
    container.style.display = 'none';
  }
  const slider = document.getElementById('mirror-oversight-slider');
  const valueSpan = document.getElementById('mirror-oversight-value');
  const select = document.getElementById('mirror-oversight-zone');
  if (slider) slider.value = mirrorOversightSettings.percentage * 100;
  if (valueSpan) valueSpan.textContent = Math.round(mirrorOversightSettings.percentage*100) + '%';
  if (select) select.value = mirrorOversightSettings.zone;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    mirrorOversightSettings,
    setMirrorFocusZone,
    setMirrorFocusPercentage,
    resetMirrorOversightSettings,
    initializeMirrorOversightUI,
    updateMirrorOversightUI
  };
} else {
  globalThis.mirrorOversightSettings = mirrorOversightSettings;
  globalThis.setMirrorFocusZone = setMirrorFocusZone;
  globalThis.setMirrorFocusPercentage = setMirrorFocusPercentage;
  globalThis.resetMirrorOversightSettings = resetMirrorOversightSettings;
  globalThis.initializeMirrorOversightUI = initializeMirrorOversightUI;
  globalThis.updateMirrorOversightUI = updateMirrorOversightUI;
}
