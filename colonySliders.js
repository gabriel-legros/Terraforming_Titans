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
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    setWorkforceRatio,
    setFoodConsumptionMultiplier,
    setLuxuryWaterMultiplier,
    resetColonySliders
  };
}
