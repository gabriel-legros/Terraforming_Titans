// Colony sliders management

let mechanicalAssistanceRow;

function initializeColonySlidersUI() {
  const container = document.getElementById('colony-sliders-container');
  if (!container) return;
  container.innerHTML = '';
  // Ensure sliders start hidden until unlocked via research
  container.classList.add('invisible');

  const card = document.createElement('div');
  card.classList.add('project-card');

  const header = document.createElement('div');
  header.classList.add('card-header');
  const title = document.createElement('span');
  title.classList.add('card-title');
  title.textContent = 'Colony Management';
  header.appendChild(title);
  card.appendChild(header);

  const body = document.createElement('div');
  body.classList.add('card-body');

  const sliderRow = document.createElement('div');
  sliderRow.classList.add('colony-slider');

  const label = document.createElement('label');
  label.htmlFor = 'workforce-slider';
  label.textContent = 'Workforce Allocation';
  sliderRow.appendChild(label);

  const valueSpan = document.createElement('span');
  valueSpan.id = 'workforce-slider-value';
  valueSpan.classList.add('slider-value');
  sliderRow.appendChild(valueSpan);

  const input = document.createElement('input');
  input.type = 'range';
  input.min = 25;
  input.max = 90;
  input.step = 5;
  input.id = 'workforce-slider';
  input.value = colonySliderSettings.workerRatio * 100;
  input.setAttribute('list', 'workforce-slider-ticks');
  input.classList.add('pretty-slider');

  const sliderContainer = document.createElement('div');
  sliderContainer.classList.add('slider-container');
  sliderContainer.appendChild(input);

  const tickMarks = document.createElement('div');
  tickMarks.classList.add('tick-marks');
  for (let i = 25; i <= 90; i += 5) {
    const tick = document.createElement('span');
    tickMarks.appendChild(tick);
  }
  sliderContainer.appendChild(tickMarks);
  sliderRow.appendChild(sliderContainer);

  const effectSpan = document.createElement('span');
  effectSpan.id = 'workforce-slider-effect';
  effectSpan.classList.add('slider-effect');
  sliderRow.appendChild(effectSpan);

  const datalist = document.createElement('datalist');
  datalist.id = 'workforce-slider-ticks';
  for (let i = 25; i <= 90; i += 5) {
    const option = document.createElement('option');
    option.value = i;
    datalist.appendChild(option);
  }
  container.appendChild(datalist);

  body.appendChild(sliderRow);

  // Update display and apply value
  const updateValue = (val) => {
    if (valueSpan && effectSpan) {
      const workers = Math.round(val);
      const scientists = 100 - workers;
      valueSpan.textContent = `Workers: ${workers}%`;
      effectSpan.textContent = `Scientists: ${scientists}%`;
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
  foodLabel.textContent = 'Food Consumption';
  foodRow.appendChild(foodLabel);

  const foodValue = document.createElement('span');
  foodValue.id = 'food-slider-value';
  foodValue.classList.add('slider-value');
  foodRow.appendChild(foodValue);
  const foodInput = document.createElement('input');
  foodInput.type = 'range';
  foodInput.min = 1;
  foodInput.max = 6;
  foodInput.step = 0.5;
  foodInput.id = 'food-slider';
  foodInput.value = colonySliderSettings.foodConsumption;
  foodInput.setAttribute('list', 'food-slider-ticks');
  foodInput.classList.add('pretty-slider');

  const foodSliderContainer = document.createElement('div');
  foodSliderContainer.classList.add('slider-container');
  foodSliderContainer.appendChild(foodInput);

  const foodTickMarks = document.createElement('div');
  foodTickMarks.classList.add('tick-marks');
  for (let i = 1; i <= 6; i += 0.5) {
    const tick = document.createElement('span');
    foodTickMarks.appendChild(tick);
  }
  foodSliderContainer.appendChild(foodTickMarks);
  foodRow.appendChild(foodSliderContainer);

  const foodEffect = document.createElement('span');
  foodEffect.id = 'food-slider-effect';
  foodEffect.classList.add('slider-effect');
  foodRow.appendChild(foodEffect);
  const foodList = document.createElement('datalist');
  foodList.id = 'food-slider-ticks';
  for (let i = 1; i <= 6; i += 0.5) {
    const option = document.createElement('option');
    option.value = i;
    foodList.appendChild(option);
  }
  container.appendChild(foodList);
  body.appendChild(foodRow);

  const updateFoodValue = (val) => {
    if (foodValue && foodEffect) {
      foodValue.textContent = `${val.toFixed(1)}x`;
      const growth = 1 + (val - 1) * 0.02;
      const percent = ((growth - 1) * 100).toFixed(1);
      foodEffect.textContent = `Growth: +${percent}%`;
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
  waterLabel.textContent = 'Luxury Water Use';
  waterRow.appendChild(waterLabel);

  const waterValue = document.createElement('span');
  waterValue.id = 'water-slider-value';
  waterValue.classList.add('slider-value');
  waterRow.appendChild(waterValue);
  const waterInput = document.createElement('input');
  waterInput.type = 'range';
  waterInput.min = 1;
  waterInput.max = 6;
  waterInput.step = 0.5;
  waterInput.id = 'water-slider';
  waterInput.value = colonySliderSettings.luxuryWater;
  waterInput.setAttribute('list', 'water-slider-ticks');
  waterInput.classList.add('pretty-slider');

  const waterSliderContainer = document.createElement('div');
  waterSliderContainer.classList.add('slider-container');
  waterSliderContainer.appendChild(waterInput);

  const waterTickMarks = document.createElement('div');
  waterTickMarks.classList.add('tick-marks');
  for (let i = 1; i <= 6; i += 0.5) {
    const tick = document.createElement('span');
    waterTickMarks.appendChild(tick);
  }
  waterSliderContainer.appendChild(waterTickMarks);
  waterRow.appendChild(waterSliderContainer);

  const waterEffect = document.createElement('span');
  waterEffect.id = 'water-slider-effect';
  waterEffect.classList.add('slider-effect');
  waterRow.appendChild(waterEffect);
  const waterList = document.createElement('datalist');
  waterList.id = 'water-slider-ticks';
  for (let i = 1; i <= 6; i += 0.5) {
    const option = document.createElement('option');
    option.value = i;
    waterList.appendChild(option);
  }
  container.appendChild(waterList);
  body.appendChild(waterRow);

  const updateWaterValue = (val) => {
    if (waterValue && waterEffect) {
      waterValue.textContent = `${val.toFixed(1)}x`;
      const growth = 1 + (val - 1) * 0.01;
      const percent = ((growth - 1) * 100).toFixed(1);
      waterEffect.textContent = `Growth: +${percent}%`;
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

  // Ore mine worker slider
  const oreRow = document.createElement('div');
  oreRow.classList.add('colony-slider');
  const oreLabel = document.createElement('label');
  oreLabel.htmlFor = 'ore-worker-slider';
  oreLabel.textContent = 'Ore Mine Workers';
  oreRow.appendChild(oreLabel);

  const oreValue = document.createElement('span');
  oreValue.id = 'ore-worker-slider-value';
  oreValue.classList.add('slider-value');
  oreRow.appendChild(oreValue);

  const oreInput = document.createElement('input');
  oreInput.type = 'range';
  oreInput.min = 0;
  oreInput.max = 10;
  oreInput.step = 1;
  oreInput.id = 'ore-worker-slider';
  oreInput.value = colonySliderSettings.oreMineWorkers;
  oreInput.setAttribute('list', 'ore-worker-slider-ticks');
  oreInput.classList.add('pretty-slider');

  const oreSliderContainer = document.createElement('div');
  oreSliderContainer.classList.add('slider-container');
  oreSliderContainer.appendChild(oreInput);

  const oreTickMarks = document.createElement('div');
  oreTickMarks.classList.add('tick-marks');
  for (let i = 0; i <= 10; i += 1) {
    const tick = document.createElement('span');
    oreTickMarks.appendChild(tick);
  }
  oreSliderContainer.appendChild(oreTickMarks);
  oreRow.appendChild(oreSliderContainer);

  const oreEffect = document.createElement('span');
  oreEffect.id = 'ore-worker-slider-effect';
  oreEffect.classList.add('slider-effect');
  oreRow.appendChild(oreEffect);

  const oreList = document.createElement('datalist');
  oreList.id = 'ore-worker-slider-ticks';
  for (let i = 0; i <= 10; i += 1) {
    const option = document.createElement('option');
    option.value = i;
    oreList.appendChild(option);
  }
  container.appendChild(oreList);
  body.appendChild(oreRow);

  // Mechanical assistance slider
  mechanicalAssistanceRow = document.createElement('div');
  mechanicalAssistanceRow.classList.add('colony-slider');
  mechanicalAssistanceRow.id = 'mechanical-assistance-row';
  const mechLabel = document.createElement('label');
  mechLabel.htmlFor = 'mechanical-assistance-slider';
  mechLabel.textContent = 'Mechanical Assistance ';
  const mechInfo = document.createElement('span');
  mechInfo.classList.add('info-tooltip-icon');
  mechInfo.title = 'Reduces gravity penalty for colony growth; mitigation scales with slider level and Components need fill.';
  mechInfo.innerHTML = '&#9432;';
  mechLabel.appendChild(mechInfo);
  mechanicalAssistanceRow.appendChild(mechLabel);

  const mechValue = document.createElement('span');
  mechValue.id = 'mechanical-assistance-slider-value';
  mechValue.classList.add('slider-value');
  mechanicalAssistanceRow.appendChild(mechValue);

  const mechInput = document.createElement('input');
  mechInput.type = 'range';
  mechInput.min = 0;
  mechInput.max = 2;
  mechInput.step = 0.2;
  mechInput.id = 'mechanical-assistance-slider';
  mechInput.value = colonySliderSettings.mechanicalAssistance;
  mechInput.setAttribute('list', 'mechanical-assistance-slider-ticks');
  mechInput.classList.add('pretty-slider');

  const mechSliderContainer = document.createElement('div');
  mechSliderContainer.classList.add('slider-container');
  mechSliderContainer.appendChild(mechInput);

  const mechTickMarks = document.createElement('div');
  mechTickMarks.classList.add('tick-marks');
  for (let i = 0; i <= 2; i += 0.2) {
    const tick = document.createElement('span');
    mechTickMarks.appendChild(tick);
  }
  mechSliderContainer.appendChild(mechTickMarks);
  mechanicalAssistanceRow.appendChild(mechSliderContainer);

  const mechEffect = document.createElement('span');
  mechEffect.id = 'mechanical-assistance-slider-effect';
  mechEffect.classList.add('slider-effect');
  mechanicalAssistanceRow.appendChild(mechEffect);

  const mechList = document.createElement('datalist');
  mechList.id = 'mechanical-assistance-slider-ticks';
  for (let i = 0; i <= 2; i += 0.2) {
    const option = document.createElement('option');
    option.value = i.toFixed(1);
    mechList.appendChild(option);
  }
  container.appendChild(mechList);
  mechanicalAssistanceRow.style.display = colonySliderSettings.isBooleanFlagSet('mechanicalAssistance') ? 'grid' : 'none';
  body.appendChild(mechanicalAssistanceRow);

  card.appendChild(body);
  container.appendChild(card);

  const updateOreValue = (val) => {
    if (oreValue && oreEffect) {
      const workers = val * 10;
      oreValue.textContent = `${workers}`;
      const mult = val === 0 ? 0 : val;
      const percent = (mult * 100).toFixed(0);
      oreEffect.textContent = `Boost: ${percent}%`;
    }
  };

  let initialOre;
  try { initialOre = parseFloat(oreInput.value); } catch (e) { initialOre = NaN; }
  if (isNaN(initialOre)) initialOre = colonySliderSettings.oreMineWorkers;
  updateOreValue(initialOre);
  oreInput.addEventListener('input', () => {
    let v;
    try { v = parseFloat(oreInput.value); } catch (e) { v = NaN; }
    if (isNaN(v)) v = colonySliderSettings.oreMineWorkers;
    updateOreValue(v);
  });
  oreInput.addEventListener('change', () => {
    let v;
    try { v = parseFloat(oreInput.value); } catch (e) { v = NaN; }
    if (isNaN(v)) v = colonySliderSettings.oreMineWorkers;
    setOreMineWorkerAssist(v);
  });

  const updateMechanicalValue = (val) => {
    if (mechValue && mechEffect) {
      mechValue.textContent = `${val.toFixed(1)}x`;
      const mitigation = Math.round(val * 25);
      mechEffect.textContent = `Mitigation: -${mitigation}%`;
    }
  };

  let initialMech;
  try { initialMech = parseFloat(mechInput.value); } catch (e) { initialMech = NaN; }
  if (isNaN(initialMech)) initialMech = colonySliderSettings.mechanicalAssistance;
  updateMechanicalValue(initialMech);
  mechInput.addEventListener('input', () => {
    let v;
    try { v = parseFloat(mechInput.value); } catch (e) { v = NaN; }
    if (isNaN(v)) v = colonySliderSettings.mechanicalAssistance;
    updateMechanicalValue(v);
  });
  mechInput.addEventListener('change', () => {
    let v;
    try { v = parseFloat(mechInput.value); } catch (e) { v = NaN; }
    if (isNaN(v)) v = colonySliderSettings.mechanicalAssistance;
    setMechanicalAssistance(v);
  });
}

function updateColonySlidersUI() {
  if (!mechanicalAssistanceRow) {
    mechanicalAssistanceRow = document.getElementById('mechanical-assistance-row');
  }
  if (!mechanicalAssistanceRow) return;
  const manager = colonySliderSettings;
  const unlocked = manager.isBooleanFlagSet('mechanicalAssistance');
  const gravity = terraforming.celestialParameters.gravity;
  const hasPenalty = gravity > 10;
  mechanicalAssistanceRow.style.display = unlocked && hasPenalty ? 'grid' : 'none';
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { initializeColonySlidersUI, updateColonySlidersUI };
}

