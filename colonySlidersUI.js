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
  input.style.width = '200px';
  input.setAttribute('list', 'workforce-slider-ticks');
  sliderRow.appendChild(input);

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

  box.appendChild(sliderRow);
  container.appendChild(box);

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
  foodInput.style.width = '200px';
  foodInput.setAttribute('list', 'food-slider-ticks');
  foodRow.appendChild(foodInput);

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
  box.appendChild(foodRow);

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
  waterInput.style.width = '200px';
  waterInput.setAttribute('list', 'water-slider-ticks');
  waterRow.appendChild(waterInput);

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
  box.appendChild(waterRow);

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
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { initializeColonySlidersUI };
}

