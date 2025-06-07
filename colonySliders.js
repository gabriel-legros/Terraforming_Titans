// Colony sliders management

function initializeColonySlidersUI() {
  const container = document.getElementById('colony-sliders-container');
  if (!container) return;
  container.innerHTML = '';

  const sliderRow = document.createElement('div');
  sliderRow.classList.add('colony-slider');

  const label = document.createElement('label');
  label.htmlFor = 'workforce-slider';
  label.textContent = 'Workforce Allocation: ';
  const valueSpan = document.createElement('span');
  valueSpan.id = 'workforce-slider-value';
  label.appendChild(valueSpan);
  sliderRow.appendChild(label);

  const input = document.createElement('input');
  input.type = 'range';
  input.min = 0;
  input.max = 1;
  input.step = 0.01;
  input.id = 'workforce-slider';
  input.value = colonySliderSettings.workerRatio;
  sliderRow.appendChild(input);

  container.appendChild(sliderRow);

  // Update display and apply value
  const updateValue = (val) => {
    if (valueSpan) {
      valueSpan.textContent = `${Math.round(val * 100)}%`;
    }
  };
  let startVal = 0.5;
  try {
    const raw = input.value;
    const parsed = typeof raw === 'number' || typeof raw === 'string' ? parseFloat(raw) : NaN;
    if (!isNaN(parsed)) startVal = parsed;
  } catch (e) {}
  updateValue(startVal);

  input.addEventListener('input', () => {
    let v = parseFloat(input.value);
    if (isNaN(v)) v = colonySliderSettings.workerRatio;
    updateValue(v);
  });

  input.addEventListener('change', () => {
    let v = parseFloat(input.value);
    if (isNaN(v)) v = colonySliderSettings.workerRatio;
    setWorkforceRatio(v);
  });
}

const researchColonies = ['t1_colony', 't2_colony', 't3_colony', 't4_colony', 't5_colony', 't6_colony'];

function setWorkforceRatio(value) {
  colonySliderSettings.workerRatio = value;
  const researchMultiplier = (1 - value) / 0.5;

  addEffect({
    target: 'population',
    type: 'workerRatio',
    value: value,
    effectId: 'workforceRatio',
    sourceId: 'workforceRatio'
  });

  researchColonies.forEach((colonyId) => {
    addEffect({
      target: 'building',
      targetId: colonyId,
      type: 'resourceProductionMultiplier',
      resourceCategory: 'colony',
      resourceTarget: 'research',
      value: researchMultiplier,
      effectId: 'researchSlider',
      sourceId: 'researchSlider'
    });
  });
}

function resetColonySliders() {
  setWorkforceRatio(0.5);
  if (typeof document !== 'undefined') {
    const input = document.getElementById('workforce-slider');
    if (input) {
      input.value = 0.5;
      const valueSpan = document.getElementById('workforce-slider-value');
      if (valueSpan) valueSpan.textContent = '50%';
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { setWorkforceRatio, resetColonySliders };
}
