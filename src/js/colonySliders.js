// Colony sliders manager

const colonyIds = ['aerostat_colony', 't1_colony', 't2_colony', 't3_colony', 't4_colony', 't5_colony', 't6_colony', 't7_colony'];

class ColonySlidersManager extends EffectableEntity {
  constructor() {
    super({ description: 'Manages colony sliders' });
    this.workerRatio = 0.5;
    this.foodConsumption = 1;
    this.luxuryWater = 1;
    this.oreMineWorkers = 0;
    this.mechanicalAssistance = 0;
  }

  setWorkforceRatio(value) {
    value = Math.min(0.9, Math.max(0.25, value));
    this.workerRatio = value;
    this.applyWorkforceRatioEffects(value);

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

  setFoodConsumptionMultiplier(value) {
    value = Math.min(6, Math.max(1, value));
    this.foodConsumption = value;
    this.applyFoodConsumptionEffects(value);

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

  setLuxuryWaterMultiplier(value) {
    value = Math.min(6, Math.max(1, value));
    this.luxuryWater = value;
    this.applyLuxuryWaterEffects(value);

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

  setOreMineWorkerAssist(value) {
    value = Math.min(10, Math.max(0, value));
    this.oreMineWorkers = value;
    this.applyOreMineWorkerEffects(value);

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

  setMechanicalAssistance(value) {
    value = Math.min(2, Math.max(0, value));
    this.mechanicalAssistance = value;
    this.applyMechanicalAssistanceEffects(value);

    if (typeof document !== 'undefined') {
      const input = document.getElementById('mechanical-assistance-slider');
      if (input) input.value = value.toString();
      const valueSpan = document.getElementById('mechanical-assistance-slider-value');
      const effectSpan = document.getElementById('mechanical-assistance-slider-effect');
      if (valueSpan && effectSpan) {
        valueSpan.textContent = `${value.toFixed(1)}x`;
        const mitigation = Math.round(value * 25);
        effectSpan.textContent = `Mitigation: -${mitigation}%`;
      }
    }
  }

  applyWorkforceRatioEffects(value = this.workerRatio) {
    const researchMultiplier = (1 - value) / 0.5;

    addEffect({
      target: 'population',
      type: 'workerRatio',
      value: value,
      effectId: 'workforceRatio',
      sourceId: 'workforceRatio'
    });

    colonyIds.forEach(colonyId => {
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

  applyFoodConsumptionEffects(value = this.foodConsumption) {
    const growth = 1 + (value - 1) * 0.02;

    addEffect({
      target: 'population',
      type: 'growthMultiplier',
      value: growth,
      effectId: 'foodGrowth',
      sourceId: 'foodGrowth'
    });

    colonyIds.forEach(colonyId => {
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

  applyLuxuryWaterEffects(value = this.luxuryWater) {
    const growth = 1 + (value - 1) * 0.01;

    addEffect({
      target: 'population',
      type: 'growthMultiplier',
      value: growth,
      effectId: 'waterGrowth',
      sourceId: 'waterGrowth'
    });

    colonyIds.forEach(colonyId => {
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

  applyOreMineWorkerEffects(value = this.oreMineWorkers) {
    addEffect({
      target: 'building',
      targetId: 'oreMine',
      type: 'addedWorkerNeed',
      value: value * 10,
      effectId: 'oreMineWorkerNeed',
      sourceId: 'oreMineWorkers'
    });

    const multiplier = value === 0 ? 1 : 1 + value;

    addEffect({
      target: 'building',
      targetId: 'oreMine',
      type: 'productionMultiplier',
      value: multiplier,
      effectId: 'oreMineProductionBoost',
      sourceId: 'oreMineWorkers'
    });
  }

  applyMechanicalAssistanceEffects(value = this.mechanicalAssistance) {
    colonyIds.forEach(colonyId => {
      const tierMatch = colonyId.match(/^t(\d)_colony$/);
      const tier = tierMatch ? parseInt(tierMatch[1], 10) : 2;
      const scaledAmount = value * Math.pow(10, tier - 3);
      const effect = {
        target: 'colony',
        targetId: colonyId,
        type: 'addResourceConsumption',
        resourceCategory: 'colony',
        resourceId: 'components',
        amount: scaledAmount,
        effectId: 'mechanicalAssistanceComponents',
        sourceId: 'mechanicalAssistance'
      };
      if (value > 0) {
        addEffect(effect);
      } else {
        removeEffect(effect);
      }
    });
  }

  updateColonySlidersEffect() {
    this.applyWorkforceRatioEffects();
    this.applyFoodConsumptionEffects();
    this.applyLuxuryWaterEffects();
    this.applyOreMineWorkerEffects();
    this.applyMechanicalAssistanceEffects();
  }

  saveState() {
    return {
      workerRatio: this.workerRatio,
      foodConsumption: this.foodConsumption,
      luxuryWater: this.luxuryWater,
      oreMineWorkers: this.oreMineWorkers,
      mechanicalAssistance: this.mechanicalAssistance,
    };
  }

  loadState(state) {
    if (!state) return;
    this.setWorkforceRatio(state.workerRatio ?? 0.5);
    this.setFoodConsumptionMultiplier(state.foodConsumption ?? 1);
    this.setLuxuryWaterMultiplier(state.luxuryWater ?? 1);
    this.setOreMineWorkerAssist(state.oreMineWorkers ?? 0);
    this.setMechanicalAssistance(state.mechanicalAssistance ?? 0);
  }

  applyBooleanFlag(effect) {
    super.applyBooleanFlag(effect);
  }

  reset() {
    this.setWorkforceRatio(0.5);
    this.setFoodConsumptionMultiplier(1);
    this.setLuxuryWaterMultiplier(1);
    this.setOreMineWorkerAssist(0);
    this.setMechanicalAssistance(0);
  }
}

// Create global instance
var colonySliderSettings = new ColonySlidersManager();

// Wrapper functions for compatibility
function setWorkforceRatio(value) {
  colonySliderSettings.setWorkforceRatio(value);
}

function setFoodConsumptionMultiplier(value) {
  colonySliderSettings.setFoodConsumptionMultiplier(value);
}

function setLuxuryWaterMultiplier(value) {
  colonySliderSettings.setLuxuryWaterMultiplier(value);
}

function setOreMineWorkerAssist(value) {
  colonySliderSettings.setOreMineWorkerAssist(value);
}

function setMechanicalAssistance(value) {
  colonySliderSettings.setMechanicalAssistance(value);
}

function updateColonySlidersEffect() {
  colonySliderSettings.updateColonySlidersEffect();
}

function resetColonySliders() {
  colonySliderSettings.reset();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ColonySlidersManager,
    colonySliderSettings,
    setWorkforceRatio,
    setFoodConsumptionMultiplier,
    setLuxuryWaterMultiplier,
    setOreMineWorkerAssist,
    setMechanicalAssistance,
    updateColonySlidersEffect,
    resetColonySliders
  };
}

