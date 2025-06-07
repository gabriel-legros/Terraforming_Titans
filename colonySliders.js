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

  // Food consumption slider
  const foodRow = document.createElement('div');
  foodRow.classList.add('colony-slider');
  const foodLabel = document.createElement('label');
  foodLabel.htmlFor = 'food-slider';
  foodLabel.textContent = 'Food Consumption: ';
  const foodValue = document.createElement('span');
  foodValue.id = 'food-slider-value';
  foodLabel.appendChild(foodValue);
  foodRow.appendChild(foodLabel);
  const foodInput = document.createElement('input');
  foodInput.type = 'range';
  foodInput.min = 1;
  foodInput.max = 6;
  foodInput.step = 0.5;
  foodInput.id = 'food-slider';
  foodInput.value = colonySliderSettings.foodConsumption;
  foodInput.setAttribute('list', 'food-slider-ticks');
  foodRow.appendChild(foodInput);
  const foodList = document.createElement('datalist');
  foodList.id = 'food-slider-ticks';
  for (let i = 1; i <= 6; i += 0.5) {
    const option = document.createElement('option');
    option.value = i;
    foodList.appendChild(option);
  }
  container.appendChild(foodList);
  box.appendChild(foodRow);

  const updateFoodValue = (val) => {
    if (foodValue) {
      foodValue.textContent = `${val.toFixed(1)}x`;
    }
  };
  let initialFood;
  try { initialFood = parseFloat(foodInput.value); } catch (e) { initialFood = NaN; }
  if (isNaN(initialFood)) initialFood = colonySliderSettings.foodConsumption;
  updateFoodValue(initialFood);
  foodInput.addEventListener('input', () => {
    let v;
    try { v = parseFloat(foodInput.value); } catch (e) { v = NaN; }
    if (isNaN(v)) v = colonySliderSettings.foodConsumption;
    updateFoodValue(v);
  });
  foodInput.addEventListener('change', () => {
    let v;
    try { v = parseFloat(foodInput.value); } catch (e) { v = NaN; }
    if (isNaN(v)) v = colonySliderSettings.foodConsumption;
    setFoodConsumptionMultiplier(v);
  });

  // Luxury water slider
  const waterRow = document.createElement('div');
  waterRow.classList.add('colony-slider');
  const waterLabel = document.createElement('label');
  waterLabel.htmlFor = 'water-slider';
  waterLabel.textContent = 'Luxury Water Use: ';
  const waterValue = document.createElement('span');
  waterValue.id = 'water-slider-value';
  waterLabel.appendChild(waterValue);
  waterRow.appendChild(waterLabel);
  const waterInput = document.createElement('input');
  waterInput.type = 'range';
  waterInput.min = 1;
  waterInput.max = 6;
  waterInput.step = 0.5;
  waterInput.id = 'water-slider';
  waterInput.value = colonySliderSettings.luxuryWater;
  waterInput.setAttribute('list', 'water-slider-ticks');
  waterRow.appendChild(waterInput);
  const waterList = document.createElement('datalist');
  waterList.id = 'water-slider-ticks';
  for (let i = 1; i <= 6; i += 0.5) {
    const option = document.createElement('option');
    option.value = i;
    waterList.appendChild(option);
  }
  container.appendChild(waterList);
  box.appendChild(waterRow);

  const updateWaterValue = (val) => {
    if (waterValue) {
      waterValue.textContent = `${val.toFixed(1)}x`;
    }
  };
  let initialWater;
  try { initialWater = parseFloat(waterInput.value); } catch (e) { initialWater = NaN; }
  if (isNaN(initialWater)) initialWater = colonySliderSettings.luxuryWater;
  updateWaterValue(initialWater);
  waterInput.addEventListener('input', () => {
    let v;
    try { v = parseFloat(waterInput.value); } catch (e) { v = NaN; }
    if (isNaN(v)) v = colonySliderSettings.luxuryWater;
    updateWaterValue(v);
  });
  waterInput.addEventListener('change', () => {
    let v;
    try { v = parseFloat(waterInput.value); } catch (e) { v = NaN; }
    if (isNaN(v)) v = colonySliderSettings.luxuryWater;
    setLuxuryWaterMultiplier(v);
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

function setFoodConsumptionMultiplier(value) {
  value = Math.min(6, Math.max(1, value));
  colonySliderSettings.foodConsumption = value;
  const growth = 1 + (value - 1) * 0.02;

  addEffect({
    target: 'population',
    type: 'growthMultiplier',
    value: growth,
    effectId: 'foodGrowth',
    sourceId: 'foodGrowth'
  });

  researchColonies.forEach(colonyId => {
    addEffect({
      target: 'colony',
      targetId: colonyId,
      type: 'resourceConsumptionMultiplier',
      resourceCategory: 'colony',
      resourceTarget: 'food',
      value: value,
      effectId: 'foodConsumption',
      sourceId: 'foodConsumption'
    });
  });
}

function setLuxuryWaterMultiplier(value) {
  value = Math.min(6, Math.max(1, value));
  colonySliderSettings.luxuryWater = value;
  const growth = 1 + (value - 1) * 0.01;

  addEffect({
    target: 'population',
    type: 'growthMultiplier',
    value: growth,
    effectId: 'waterGrowth',
    sourceId: 'waterGrowth'
  });

  researchColonies.forEach(colonyId => {
    addEffect({
      target: 'colony',
      targetId: colonyId,
      type: 'maintenanceCostMultiplier',
      resourceCategory: 'colony',
      resourceId: 'water',
      value: value,
      effectId: 'luxuryWaterMaintenance',
      sourceId: 'luxuryWaterMaintenance'
    });
  });
}

function resetColonySliders() {
  setWorkforceRatio(0.5);
  setFoodConsumptionMultiplier(1);
  setLuxuryWaterMultiplier(1);
  if (typeof document !== 'undefined') {
    const input = document.getElementById('workforce-slider');
    if (input) {
      input.value = 50;
      const valueSpan = document.getElementById('workforce-slider-value');
      if (valueSpan) valueSpan.textContent = 'Workers: 50% | Scientists: 50%';
    }
    const foodInput = document.getElementById('food-slider');
    if (foodInput) {
      foodInput.value = 1;
      const foodSpan = document.getElementById('food-slider-value');
      if (foodSpan) foodSpan.textContent = '1.0x';
    }
    const waterInput = document.getElementById('water-slider');
    if (waterInput) {
      waterInput.value = 1;
      const waterSpan = document.getElementById('water-slider-value');
      if (waterSpan) waterSpan.textContent = '1.0x';
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    setWorkforceRatio,
    setFoodConsumptionMultiplier,
    setLuxuryWaterMultiplier,
    resetColonySliders
  };
}
