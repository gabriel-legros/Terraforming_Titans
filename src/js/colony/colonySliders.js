// Colony sliders manager

function getColonySliderText(path, fallback, vars) {
  try {
    return t(path, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

const colonyIds = ['aerostat_colony', 't1_colony', 't2_colony', 't3_colony', 't4_colony', 't5_colony', 't6_colony', 't7_colony'];

function getColonySliderEffectTarget(effect) {
  if (effect.target === 'population') return populationModule;
  if (effect.target === 'global') return globalEffects;
  if (effect.target === 'building') return buildings[effect.targetId];
  if (effect.target === 'colony') return colonies[effect.targetId];
  return null;
}

function applyColonySliderEffect(effect) {
  const target = getColonySliderEffectTarget(effect);
  const existingEffect = target?.activeEffects?.find((activeEffect) => activeEffect.effectId === effect.effectId);
  if (
    existingEffect &&
    effectsAreShallowEqual(existingEffect, effect) &&
    canSkipShallowEqualReapply(effect)
  ) {
    return;
  }
  addEffect(effect);
}

class ColonySlidersManager extends EffectableEntity {
  constructor() {
    super({ description: getColonySliderText('ui.colony.sliders.managerDescription', 'Manages colony sliders') });
    this.workerRatio = 0.5;
    this.foodConsumption = 1;
    this.luxuryWater = 1;
    this.oreMineWorkers = 0;
    this.mechanicalAssistance = 0;
    this.warpnetLevel = 0;
    this.uiDirty = true;
  }

  markUIDirty() {
    this.uiDirty = true;
  }

  isMechanicalAssistanceActive() {
    return this.isBooleanFlagSet('mechanicalAssistance') && terraforming.celestialParameters.gravity > 10;
  }

  getEffectiveMechanicalAssistance() {
    return this.isMechanicalAssistanceActive() ? this.mechanicalAssistance : 0;
  }

  isWarpnetActive() {
    return this.isBooleanFlagSet('warpnet');
  }

  getEffectiveWarpnetLevel() {
    return this.isWarpnetActive() ? this.warpnetLevel : 0;
  }

  setWorkforceRatio(value) {
    value = Math.min(0.9, Math.max(0.25, value));
    this.workerRatio = value;
    this.applyWorkforceRatioEffects(value);
    this.markUIDirty();
  }

  setFoodConsumptionMultiplier(value) {
    value = Math.min(6, Math.max(1, value));
    this.foodConsumption = value;
    this.applyFoodConsumptionEffects(value);
    this.markUIDirty();
  }

  setLuxuryWaterMultiplier(value) {
    value = Math.min(6, Math.max(1, value));
    this.luxuryWater = value;
    this.applyLuxuryWaterEffects(value);
    this.markUIDirty();
  }

  setOreMineWorkerAssist(value) {
    value = Math.min(10, Math.max(0, value));
    this.oreMineWorkers = value;
    this.applyOreMineWorkerEffects(value);
    this.markUIDirty();
  }

  setMechanicalAssistance(value) {
    value = Math.min(2, Math.max(0, value));
    this.mechanicalAssistance = value;
    this.applyMechanicalAssistanceEffects();
    this.markUIDirty();
  }

  setWarpnetLevel(value) {
    value = Math.min(10, Math.max(0, Math.round(value)));
    this.warpnetLevel = value;
    this.applyWarpnetEffects();
    this.markUIDirty();
  }

  applyWorkforceRatioEffects(value = this.workerRatio) {
    const researchMultiplier = (1 - value) / 0.5;

    applyColonySliderEffect({
      target: 'population',
      type: 'workerRatio',
      value: value,
      effectId: 'workforceRatio',
      sourceId: 'workforceRatio'
    });

    colonyIds.forEach(colonyId => {
      applyColonySliderEffect({
        target: 'colony',
        targetId: colonyId,
        type: 'resourceProductionMultiplier',
        resourceCategory: 'colony',
        resourceTarget: 'research',
        value: researchMultiplier,
        effectId: 'researchSlider',
        sourceId: 'researchSlider',
        name: getColonySliderText('ui.colony.sliders.sourceName', 'Colony sliders')
      });
    });
  }

  applyFoodConsumptionEffects(value = this.foodConsumption) {
    const growth = 1 + (value - 1) * 0.02;

    applyColonySliderEffect({
      target: 'population',
      type: 'growthMultiplier',
      value: growth,
      effectId: 'foodGrowth',
      sourceId: 'foodGrowth'
    });

    colonyIds.forEach(colonyId => {
      applyColonySliderEffect({
        target: 'colony',
        targetId: colonyId,
        type: 'resourceConsumptionMultiplier',
        resourceCategory: 'colony',
        resourceTarget: 'food',
        value: value,
        effectId: 'foodConsumption',
        sourceId: 'foodConsumption',
        name: getColonySliderText('ui.colony.sliders.sourceName', 'Colony sliders')
      });
    });
  }

  applyLuxuryWaterEffects(value = this.luxuryWater) {
    const growth = 1 + (value - 1) * 0.01;

    applyColonySliderEffect({
      target: 'population',
      type: 'growthMultiplier',
      value: growth,
      effectId: 'waterGrowth',
      sourceId: 'waterGrowth'
    });

    colonyIds.forEach(colonyId => {
      applyColonySliderEffect({
        target: 'colony',
        targetId: colonyId,
        type: 'maintenanceCostMultiplier',
        resourceCategory: 'colony',
        resourceId: 'water',
        value: value,
        effectId: 'luxuryWaterMaintenance',
        sourceId: 'luxuryWaterMaintenance',
        name: getColonySliderText('ui.colony.sliders.sourceName', 'Colony sliders')
      });
    });
  }

  applyOreMineWorkerEffects(value = this.oreMineWorkers) {
    applyColonySliderEffect({
      target: 'building',
      targetId: 'oreMine',
      type: 'addedWorkerNeed',
      value: value * 10,
      effectId: 'oreMineWorkerNeed',
      sourceId: 'oreMineWorkers'
    });

    const multiplier = value === 0 ? 1 : 1 + value;

    applyColonySliderEffect({
      target: 'building',
      targetId: 'oreMine',
      type: 'productionMultiplier',
      value: multiplier,
      effectId: 'oreMineProductionBoost',
      sourceId: 'oreMineWorkers',
      name: getColonySliderText('ui.colony.sliders.sourceName', 'Colony sliders')
    });
  }

  applyMechanicalAssistanceEffects(value = this.mechanicalAssistance) {
    value = this.getEffectiveMechanicalAssistance();
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
      applyColonySliderEffect(effect);
    });
  }

  applyWarpnetEffects(value = this.warpnetLevel) {
    value = this.getEffectiveWarpnetLevel();
    const energyMultiplier = value === 0 ? 1 : Math.pow(10, value);

    applyColonySliderEffect({
      target: 'global',
      type: 'globalResearchBoost',
      value: value,
      effectId: 'warpnetResearchBoost',
      sourceId: 'warpnet'
    });

    applyColonySliderEffect({
      target: 'building',
      targetId: 'androidHousing',
      type: 'resourceConsumptionMultiplier',
      resourceCategory: 'colony',
      resourceTarget: 'energy',
      value: energyMultiplier,
      effectId: 'warpnetAndroidEnergy',
      sourceId: 'warpnet'
    });

    colonyIds.forEach(colonyId => {
      applyColonySliderEffect({
        target: 'colony',
        targetId: colonyId,
        type: 'resourceConsumptionMultiplier',
        resourceCategory: 'colony',
        resourceTarget: 'energy',
        value: energyMultiplier,
        effectId: 'warpnetEnergyConsumption',
        sourceId: 'warpnet'
      });
    });
  }

  updateColonySlidersEffect() {
    this.applyWorkforceRatioEffects();
    this.applyFoodConsumptionEffects();
    this.applyLuxuryWaterEffects();
    this.applyOreMineWorkerEffects();
    this.applyMechanicalAssistanceEffects();
    this.applyWarpnetEffects();
  }

  saveState() {
    return {
      workerRatio: this.workerRatio,
      foodConsumption: this.foodConsumption,
      luxuryWater: this.luxuryWater,
      oreMineWorkers: this.oreMineWorkers,
      mechanicalAssistance: this.mechanicalAssistance,
      warpnetLevel: this.warpnetLevel,
    };
  }

  loadState(state) {
    if (!state) return;

    this.setWorkforceRatio(state.workerRatio ?? 0.5);
    this.setFoodConsumptionMultiplier(state.foodConsumption ?? 1);
    this.setLuxuryWaterMultiplier(state.luxuryWater ?? 1);
    this.setOreMineWorkerAssist(state.oreMineWorkers ?? 0);
    this.setMechanicalAssistance(state.mechanicalAssistance ?? 0);
    this.setWarpnetLevel(state.warpnetLevel ?? 0);
  }

  applyBooleanFlag(effect) {
    super.applyBooleanFlag(effect);
  }

  reset(clearUnlocks = false) {
    if (clearUnlocks) {
      this.activeEffects = [];
      this.booleanFlags = new Set();
    }
    this.setWorkforceRatio(0.5);
    this.setFoodConsumptionMultiplier(1);
    this.setLuxuryWaterMultiplier(1);
    this.setOreMineWorkerAssist(0);
    this.setMechanicalAssistance(0);
    this.setWarpnetLevel(0);
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

function setWarpnetLevel(value) {
  colonySliderSettings.setWarpnetLevel(value);
}

function updateColonySlidersEffect() {
  colonySliderSettings.updateColonySlidersEffect();
}

function resetColonySliders(clearUnlocks = false) {
  colonySliderSettings.reset(clearUnlocks);
  colonySliderSettings.markUIDirty();
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
    setWarpnetLevel,
    updateColonySlidersEffect,
    resetColonySliders
  };
}

