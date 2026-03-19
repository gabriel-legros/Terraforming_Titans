const SUPERALLOY_GIGAFOUNDRY_RECIPE = {
  label: 'Superalloy',
  outputCategory: 'spaceStorage',
  outputKey: 'superalloys',
  baseOutput: 500_000_000,
  inputs: {
    spaceStorage: {
      metal: 500_000_000_000
    },
    space: {
      energy: 5_000_000_000_000_000_000_000
    }
  },
  wgcUpgradeId: 'superalloyEfficiency'
};

let SuperalloyGigafoundryBase = null;
try {
  SuperalloyGigafoundryBase = NuclearAlchemyFurnaceProject;
} catch (error) {}
try {
  SuperalloyGigafoundryBase = require('./NuclearAlchemyFurnaceProject.js');
} catch (error) {}

class SuperalloyGigafoundryProject extends SuperalloyGigafoundryBase {
  constructor(config, name) {
    super(config, name);
    this.lastMetalPerSecond = 0;
    this.lastSpaceEnergyPerSecond = 0;
  }

  getAssignmentKeys() {
    return ['superalloys'];
  }

  getRecipe() {
    return SUPERALLOY_GIGAFOUNDRY_RECIPE;
  }

  showsComplexityColumn() {
    return false;
  }

  getAssignmentNameHeaderText() {
    return 'Output';
  }

  getControlTitleText() {
    return 'Gigafoundry Controls';
  }

  getTotalUnitsLabelText() {
    return 'Total Gigafoundries';
  }

  getRunToggleText() {
    return 'Run gigafoundries';
  }

  getPrimaryRateLabelText() {
    return 'Input Use';
  }

  getPrimaryRateText() {
    return `${formatNumber(this.lastSpaceEnergyPerSecond, true, 3)} space energy/s, ${formatNumber(this.lastMetalPerSecond, true, 3)} space metal/s`;
  }

  getExpansionRateText(rate) {
    return `${formatNumber(rate, true, 3)} gigafoundries/s`;
  }

  getRecipeWgcMultiplier() {
    try {
      return warpGateCommand.getMultiplier(SUPERALLOY_GIGAFOUNDRY_RECIPE.wgcUpgradeId);
    } catch (error) {}
    return 1;
  }

  getOperationNoteText() {
    const parameter = formatNumber(this.getAlchemyParameter(), true, 3);
    const wgcMultiplier = this.getRecipeWgcMultiplier();
    return `Runs superalloy batches at Assigned x ${parameter}/s. Each batch consumes ${formatNumber(SUPERALLOY_GIGAFOUNDRY_RECIPE.inputs.spaceStorage.metal, true)} space metal and ${formatNumber(SUPERALLOY_GIGAFOUNDRY_RECIPE.inputs.space.energy, true)} space energy for ${formatNumber(SUPERALLOY_GIGAFOUNDRY_RECIPE.baseOutput, true)} space superalloys, multiplied by WGC superalloy output bonuses (x${formatNumber(wgcMultiplier, true, 3)}).`;
  }

  setLastRunStats(spaceEnergyRate = 0, outputRates = {}, metalRate = 0) {
    super.setLastRunStats(spaceEnergyRate, outputRates);
    this.lastSpaceEnergyPerSecond = spaceEnergyRate;
    this.lastMetalPerSecond = metalRate;
  }

  getPendingResourceDelta(accumulatedChanges, category, resourceKey) {
    return accumulatedChanges?.[category]?.[resourceKey] || 0;
  }

  getResourceValueForTick(category, resourceKey, accumulatedChanges = null) {
    const resource = resources?.[category]?.[resourceKey];
    if (!resource) {
      return 0;
    }
    return Math.max(0, (resource.value || 0) + this.getPendingResourceDelta(accumulatedChanges, category, resourceKey));
  }

  getAvailableResourceForTick(category, resourceKey, accumulatedChanges = null) {
    const resource = resources?.[category]?.[resourceKey];
    if (!resource) {
      return 0;
    }
    const pending = this.getPendingResourceDelta(accumulatedChanges, category, resourceKey);
    return Math.max(0, (resource.value || 0) - (resource.reserved || 0) + pending);
  }

  applyResourceDeltaForTick(category, resourceKey, delta, accumulatedChanges = null) {
    if (!(delta !== 0)) {
      return;
    }
    if (accumulatedChanges) {
      accumulatedChanges[category] ||= {};
      accumulatedChanges[category][resourceKey] = (accumulatedChanges[category][resourceKey] || 0) + delta;
      return;
    }
    const resource = resources?.[category]?.[resourceKey];
    if (!resource) {
      return;
    }
    resource.value = Math.max(0, (resource.value || 0) + delta);
  }

  buildOperationPlan(seconds, productivity = 1, accumulatedChanges = null) {
    const plan = {
      desiredBatches: 0,
      desiredMetal: 0,
      desiredSpaceEnergy: 0,
      desiredOutput: 0,
      finalMetal: 0,
      finalSpaceEnergy: 0,
      finalOutput: 0,
      ratio: 1,
      hasAssignments: false,
      reasons: {
        noStorage: false,
        noMetal: false,
        noSpaceEnergy: false
      }
    };

    const assigned = this.furnaceAssignments.superalloys || 0;
    if (!(assigned > 0)) {
      return plan;
    }

    const recipe = this.getRecipe();
    const batchesPerSecond = assigned * this.getAlchemyParameter();
    if (!(batchesPerSecond > 0)) {
      return plan;
    }

    const desiredBatches = batchesPerSecond * seconds * productivity;
    const wgcMultiplier = this.getRecipeWgcMultiplier();
    const desiredMetal = desiredBatches * recipe.inputs.spaceStorage.metal;
    const desiredSpaceEnergy = desiredBatches * recipe.inputs.space.energy;
    const desiredOutput = desiredBatches * recipe.baseOutput * wgcMultiplier;
    const storage = this.getSpaceStorageProject();
    if (!storage) {
      plan.hasAssignments = true;
      plan.reasons.noStorage = true;
      return plan;
    }

    plan.desiredBatches = desiredBatches;
    plan.desiredMetal = desiredMetal;
    plan.desiredSpaceEnergy = desiredSpaceEnergy;
    plan.desiredOutput = desiredOutput;
    plan.finalMetal = desiredMetal;
    plan.finalSpaceEnergy = desiredSpaceEnergy;
    plan.finalOutput = desiredOutput;
    plan.ratio = 1;
    plan.hasAssignments = true;

    return plan;
  }

  getOperationProductivityForTick(defaultProductivity = 1, deltaTime = 1000) {
    return Math.max(0, Math.min(1, defaultProductivity));
  }

  getOperationShortfallStatus(productivity = 1) {
    const metalRatio = Math.max(
      0,
      Math.min(1, Number(resources?.spaceStorage?.metal?.availabilityRatio) || 0)
    );
    const energyRatio = Math.max(
      0,
      Math.min(1, Number(resources?.space?.energy?.availabilityRatio) || 0)
    );
    if (metalRatio <= 0 && energyRatio <= 0) {
      return 'No space metal or energy';
    }
    if (metalRatio <= 0) {
      return 'No space metal';
    }
    if (energyRatio <= 0) {
      return 'No space energy';
    }
    if (metalRatio < 1 || energyRatio < 1 || productivity < 1) {
      return 'Insufficient space input';
    }
    return 'Idle';
  }

  applyOperationCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (!this.shouldOperate()) {
      this.setLastRunStats(0, {}, 0);
      if (!this.repeatCount) {
        this.updateStatus('Complete at least one gigafoundry');
      } else if (!this.isRunning) {
        this.updateStatus('Run disabled');
      }
      this.shortfallLastTick = false;
      return;
    }

    const seconds = deltaTime / 1000;
    if (!(seconds > 0)) {
      this.setLastRunStats(0, {}, 0);
      this.updateStatus('Idle');
      this.shortfallLastTick = false;
      return;
    }

    this.normalizeAssignments();
    const plan = this.buildOperationPlan(seconds, productivity, accumulatedChanges);
    if (!plan.hasAssignments) {
      this.setLastRunStats(0, {}, 0);
      this.updateStatus('No assignments');
      this.shortfallLastTick = this.expansionShortfallLastTick || true;
      return;
    }
    if (plan.reasons.noStorage) {
      this.setLastRunStats(0, {}, 0);
      this.updateStatus('Build space storage');
      this.shortfallLastTick = true;
      return;
    }
    if (!(plan.finalOutput > 0)) {
      this.setLastRunStats(0, {}, 0);
      const status = this.getOperationShortfallStatus(productivity);
      this.updateStatus(status);
      this.shortfallLastTick = status !== 'Idle';
      return;
    }

    const storage = this.getSpaceStorageProject();
    if (!storage) {
      this.setLastRunStats(0, {}, 0);
      this.updateStatus('Build space storage');
      this.shortfallLastTick = true;
      return;
    }

    this.applySpaceStorageDeltaForTick('metal', -plan.finalMetal, accumulatedChanges);
    this.applyResourceDeltaForTick('space', 'energy', -plan.finalSpaceEnergy, accumulatedChanges);
    this.applySpaceStorageDeltaForTick('superalloys', plan.finalOutput, accumulatedChanges);

    if (!accumulatedChanges) {
      storage.reconcileUsedStorage();
      updateSpaceStorageUI(storage);
    }

    const outputRate = plan.finalOutput / seconds;
    const metalRate = plan.finalMetal / seconds;
    const spaceEnergyRate = plan.finalSpaceEnergy / seconds;

    resources?.spaceStorage?.metal?.modifyRate?.(-metalRate, this.displayName, 'project');
    resources?.space?.energy?.modifyRate?.(-spaceEnergyRate, this.displayName, 'project');
    resources?.spaceStorage?.superalloys?.modifyRate?.(outputRate, this.displayName, 'project');

    this.setLastRunStats(spaceEnergyRate, { superalloys: outputRate }, metalRate);
    this.updateStatus('Running');
    this.shortfallLastTick = false;
  }

  estimateOperationCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
    const totals = { cost: {}, gain: {} };
    if (!this.shouldOperate()) {
      return totals;
    }

    const seconds = deltaTime / 1000;
    if (!(seconds > 0)) {
      return totals;
    }

    this.normalizeAssignments();
    const plan = this.buildOperationPlan(seconds, productivity, accumulatedChanges);
    if (!(plan.finalOutput > 0)) {
      return totals;
    }

    if (applyRates) {
      resources?.spaceStorage?.metal?.modifyRate?.(-(plan.finalMetal / seconds), this.displayName, 'project');
      resources?.space?.energy?.modifyRate?.(-(plan.finalSpaceEnergy / seconds), this.displayName, 'project');
      resources?.spaceStorage?.superalloys?.modifyRate?.(plan.finalOutput / seconds, this.displayName, 'project');
    }

    totals.cost.spaceStorage ||= {};
    totals.cost.spaceStorage.metal = (totals.cost.spaceStorage.metal || 0) + plan.finalMetal;

    totals.cost.space ||= {};
    totals.cost.space.energy = (totals.cost.space.energy || 0) + plan.finalSpaceEnergy;

    totals.gain.spaceStorage ||= {};
    totals.gain.spaceStorage.superalloys = (totals.gain.spaceStorage.superalloys || 0) + plan.finalOutput;

    return totals;
  }

  estimateProductivityCostAndGain(deltaTime = 1000) {
    const totals = { cost: {}, gain: {} };
    if (!this.shouldOperate()) {
      return totals;
    }

    const seconds = deltaTime / 1000;
    if (!(seconds > 0)) {
      return totals;
    }

    this.normalizeAssignments();
    const assigned = this.furnaceAssignments.superalloys || 0;
    if (!(assigned > 0)) {
      return totals;
    }

    const recipe = this.getRecipe();
    const desiredBatches = assigned * this.getAlchemyParameter() * seconds;
    if (!(desiredBatches > 0)) {
      return totals;
    }

    totals.cost.spaceStorage = {
      metal: desiredBatches * recipe.inputs.spaceStorage.metal
    };
    totals.cost.space = {
      energy: desiredBatches * recipe.inputs.space.energy
    };

    return totals;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SuperalloyGigafoundryProject;
} else if (typeof window !== 'undefined') {
  window.SuperalloyGigafoundryProject = SuperalloyGigafoundryProject;
}
