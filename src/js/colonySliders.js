// Colony sliders logic


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

  // Update UI elements if they exist
  if (typeof document !== 'undefined') {
    const input = document.getElementById('workforce-slider');
    if (input) input.value = (value * 100).toString();
    const valueSpan = document.getElementById('workforce-slider-value');
    const effectSpan = document.getElementById('workforce-slider-effect');
    if (valueSpan && effectSpan) {
      const workers = Math.round(value * 100);
      const scientists = 100 - workers;
      valueSpan.textContent = `Workers: ${workers}%`;
      effectSpan.textContent = `Scientists: ${scientists}%`;
    }
  }
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

  // Update UI elements if they exist
  if (typeof document !== 'undefined') {
    const input = document.getElementById('food-slider');
    if (input) input.value = value.toString();
    const valueSpan = document.getElementById('food-slider-value');
    const effectSpan = document.getElementById('food-slider-effect');
    if (valueSpan && effectSpan) {
      valueSpan.textContent = `${value.toFixed(1)}x`;
      const growthVal = 1 + (value - 1) * 0.02;
      const percent = ((growthVal - 1) * 100).toFixed(1);
      effectSpan.textContent = `Growth: +${percent}%`;
    }
  }
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

  // Update UI elements if they exist
  if (typeof document !== 'undefined') {
    const input = document.getElementById('water-slider');
    if (input) input.value = value.toString();
    const valueSpan = document.getElementById('water-slider-value');
    const effectSpan = document.getElementById('water-slider-effect');
    if (valueSpan && effectSpan) {
      valueSpan.textContent = `${value.toFixed(1)}x`;
      const growthVal = 1 + (value - 1) * 0.01;
      const percent = ((growthVal - 1) * 100).toFixed(1);
      effectSpan.textContent = `Growth: +${percent}%`;
    }
  }
}

function setOreMineWorkerAssist(value) {
  value = Math.min(10, Math.max(0, value));
  colonySliderSettings.oreMineWorkers = value;

  addEffect({
    target: 'building',
    targetId: 'oreMine',
    type: 'addedWorkerNeed',
    value: value * 10,
    effectId: 'oreMineWorkerNeed',
    sourceId: 'oreMineWorkers'
  });

  const multiplier = value === 0 ? 1 : 1+value;

  addEffect({
    target: 'building',
    targetId: 'oreMine',
    type: 'productionMultiplier',
    value: multiplier,
    effectId: 'oreMineProductionBoost',
    sourceId: 'oreMineWorkers'
  });

  // Update UI elements if they exist
  if (typeof document !== 'undefined') {
    const input = document.getElementById('ore-worker-slider');
    if (input) input.value = value.toString();
    const valueSpan = document.getElementById('ore-worker-slider-value');
    const effectSpan = document.getElementById('ore-worker-slider-effect');
    if (valueSpan && effectSpan) {
      const workers = value * 10;
      valueSpan.textContent = `${workers}`;
      const mult = value === 0 ? 0 : value;
      const percent = (mult * 100).toFixed(0);
      effectSpan.textContent = `Boost: ${percent}%`;
    }
  }
}

function resetColonySliders() {
  setWorkforceRatio(0.5);
  setFoodConsumptionMultiplier(1);
  setLuxuryWaterMultiplier(1);
  setOreMineWorkerAssist(0);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    setWorkforceRatio,
    setFoodConsumptionMultiplier,
    setLuxuryWaterMultiplier,
    setOreMineWorkerAssist,
    resetColonySliders
  };
}
