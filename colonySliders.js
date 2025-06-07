// Colony sliders management

function initializeColonySlidersUI() {
  const container = document.getElementById('colony-sliders-container');
  if (!container) return;
  container.innerHTML = '';

  const box = document.createElement('div');
  box.classList.add('sliders-box');

  const title = document.createElement('div');
  title.classList.add('sliders-title');
  title.textContent = 'Colony Management';
  box.appendChild(title);

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
  input.min = 25;
  input.max = 90;
  input.step = 5;
  input.id = 'workforce-slider';
  input.value = colonySliderSettings.workerRatio * 100;
  input.setAttribute('list', 'workforce-slider-ticks');
  sliderRow.appendChild(input);

  const datalist = document.createElement('datalist');
  datalist.id = 'workforce-slider-ticks';
  for (let i = 25; i <= 90; i += 5) {
    const option = document.createElement('option');
    option.value = i;
    datalist.appendChild(option);
  }
  container.appendChild(datalist);

  box.appendChild(sliderRow);
  container.appendChild(box);

  // Update display and apply value
  const updateValue = (val) => {
    if (valueSpan) {
      const workers = Math.round(val);
      const scientists = 100 - workers;
      valueSpan.textContent = `Workers: ${workers}% | Scientists: ${scientists}%`;
    }
  };
  let startVal = 50;
  try {
    const raw = input.value;
    const parsed = typeof raw === 'number' || typeof raw === 'string' ? parseFloat(raw) : NaN;
    if (!isNaN(parsed)) startVal = parsed;
  } catch (e) {}
  updateValue(startVal);

  input.addEventListener('input', () => {
    let v = parseFloat(input.value);
    if (isNaN(v)) v = colonySliderSettings.workerRatio * 100;
    updateValue(v);
  });

  input.addEventListener('change', () => {
    let v = parseFloat(input.value);
    if (isNaN(v)) v = colonySliderSettings.workerRatio * 100;
    setWorkforceRatio(v / 100);
  });
}

const researchColonies = ['t1_colony', 't2_colony', 't3_colony', 't4_colony', 't5_colony', 't6_colony'];

function setWorkforceRatio(value) {
  value = Math.min(0.9, Math.max(0.25, value));
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
      target: 'colony',
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
      input.value = 50;
      const valueSpan = document.getElementById('workforce-slider-value');
      if (valueSpan) valueSpan.textContent = 'Workers: 50% | Scientists: 50%';
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { setWorkforceRatio, resetColonySliders };
}
