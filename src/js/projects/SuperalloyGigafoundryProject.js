const SUPERALLOY_GIGAFOUNDRY_RECIPE = {
  label: '',
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
    this.lastInputPerSecond = 0;
    this.lastSpaceEnergyPerSecond = 0;
  }

  getText(path, vars, fallback = '') {
    try {
      return t(`ui.projects.superalloyGigafoundry.${path}`, vars, fallback);
    } catch (error) {
      return fallback;
    }
  }

  getAssignmentKeys() {
    return [this.getOutputResourceKey()];
  }

  getInputResourceKey() {
    return 'metal';
  }

  getOutputResourceKey() {
    return 'superalloys';
  }

  getRecipe() {
    SUPERALLOY_GIGAFOUNDRY_RECIPE.label = this.getText('recipeLabel', null, 'Superalloy');
    return SUPERALLOY_GIGAFOUNDRY_RECIPE;
  }

  showsComplexityColumn() {
    return false;
  }

  getAssignmentNameHeaderText() {
    return this.getText('output', null, 'Output');
  }

  getControlTitleText() {
    return this.getText('title', null, 'Gigafoundry Controls');
  }

  getTotalUnitsLabelText() {
    return this.getText('totalGigafoundries', null, 'Total Gigafoundries');
  }

  getRunToggleText() {
    return this.getText('runGigafoundries', null, 'Run gigafoundries');
  }

  getPrimaryRateLabelText() {
    return this.getText('inputUse', null, 'Input Use');
  }

  getPrimaryRateText() {
    return `${formatNumber(this.lastSpaceEnergyPerSecond, true, 3)} space energy/s, ${formatNumber(this.lastInputPerSecond, true, 3)} space metal/s`;
  }

  getExpansionRateText(rate) {
    return this.getText(
      'expansionRate',
      { value: formatNumber(rate, true, 3) },
      `${formatNumber(rate, true, 3)} gigafoundries/s`
    );
  }

  getExpansionRateSourceLabel() {
    return registerRateSource(
      `project:${this.name}:expansion`,
      this.getText('rateSources.expansion', null, `${this.displayName} expansion`)
    );
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
    return this.getText(
      'operationNote',
      {
        parameter,
        spaceMetal: formatNumber(SUPERALLOY_GIGAFOUNDRY_RECIPE.inputs.spaceStorage.metal, true),
        spaceEnergy: formatNumber(SUPERALLOY_GIGAFOUNDRY_RECIPE.inputs.space.energy, true),
        output: formatNumber(SUPERALLOY_GIGAFOUNDRY_RECIPE.baseOutput, true),
        wgcMultiplier: formatNumber(wgcMultiplier, true, 3)
      },
      `Runs superalloy batches at Assigned x ${parameter}/s. Each batch consumes ${formatNumber(SUPERALLOY_GIGAFOUNDRY_RECIPE.inputs.spaceStorage.metal, true)} space metal and ${formatNumber(SUPERALLOY_GIGAFOUNDRY_RECIPE.inputs.space.energy, true)} space energy for ${formatNumber(SUPERALLOY_GIGAFOUNDRY_RECIPE.baseOutput, true)} space superalloys, multiplied by WGC superalloy output bonuses (x${formatNumber(wgcMultiplier, true, 3)}).`
    );
  }

  setLastRunStats(spaceEnergyRate = 0, outputRates = {}, inputRate = 0) {
    super.setLastRunStats(spaceEnergyRate, outputRates);
    this.lastSpaceEnergyPerSecond = spaceEnergyRate;
    this.lastInputPerSecond = inputRate;
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
      desiredInput: 0,
      desiredSpaceEnergy: 0,
      desiredOutput: 0,
      finalInput: 0,
      finalSpaceEnergy: 0,
      finalOutput: 0,
      ratio: 1,
      hasAssignments: false,
      reasons: {
        noStorage: false,
        noInput: false,
        noSpaceEnergy: false
      }
    };

    const inputKey = this.getInputResourceKey();
    const outputKey = this.getOutputResourceKey();
    const assigned = Number(this.furnaceAssignments[outputKey] || 0n);
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
    const desiredInput = desiredBatches * recipe.inputs.spaceStorage[inputKey];
    const desiredSpaceEnergy = desiredBatches * recipe.inputs.space.energy;
    const desiredOutput = desiredBatches * recipe.baseOutput * wgcMultiplier;
    const storage = this.getSpaceStorageProject();
    if (!storage) {
      plan.hasAssignments = true;
      plan.reasons.noStorage = true;
      return plan;
    }

    plan.desiredBatches = desiredBatches;
    plan.desiredInput = desiredInput;
    plan.desiredSpaceEnergy = desiredSpaceEnergy;
    plan.desiredOutput = desiredOutput;
    plan.finalInput = desiredInput;
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
    const inputRatio = Math.max(
      0,
      Math.min(1, Number(resources?.spaceStorage?.[this.getInputResourceKey()]?.availabilityRatio) || 0)
    );
    const energyRatio = Math.max(
      0,
      Math.min(1, Number(resources?.space?.energy?.availabilityRatio) || 0)
    );
    if (inputRatio <= 0 && energyRatio <= 0) {
      return this.getText('status.noSpaceMetalOrEnergy', null, 'No space metal or energy');
    }
    if (inputRatio <= 0) {
      return this.getText('status.noSpaceMetal', null, 'No space metal');
    }
    if (energyRatio <= 0) {
      return this.getText('status.noSpaceEnergy', null, 'No space energy');
    }
    if (inputRatio < 1 || energyRatio < 1 || productivity < 1) {
      return this.getText('status.insufficientSpaceInput', null, 'Insufficient space input');
    }
    return this.getText('status.idle', null, 'Idle');
  }

  applyOperationCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (!this.shouldOperate()) {
      this.setLastRunStats(0, {}, 0);
      if (!this.repeatCount) {
        this.updateStatus(this.getText('status.completeAtLeastOne', null, 'Complete at least one gigafoundry'));
      } else if (!this.isRunning) {
        this.updateStatus(this.getText('status.runDisabled', null, 'Run disabled'));
      }
      this.shortfallLastTick = false;
      return;
    }

    const seconds = deltaTime / 1000;
    if (!(seconds > 0)) {
      this.setLastRunStats(0, {}, 0);
      this.updateStatus(this.getText('status.idle', null, 'Idle'));
      this.shortfallLastTick = false;
      return;
    }

    this.normalizeAssignments();
    const plan = this.buildOperationPlan(seconds, productivity, accumulatedChanges);
    if (!plan.hasAssignments) {
      this.setLastRunStats(0, {}, 0);
      this.updateStatus(this.getText('status.noAssignments', null, 'No assignments'));
      this.shortfallLastTick = this.expansionShortfallLastTick || true;
      return;
    }
    if (plan.reasons.noStorage) {
      this.setLastRunStats(0, {}, 0);
      this.updateStatus(this.getText('status.buildSpaceStorage', null, 'Build space storage'));
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
      this.updateStatus(this.getText('status.buildSpaceStorage', null, 'Build space storage'));
      this.shortfallLastTick = true;
      return;
    }

    const inputKey = this.getInputResourceKey();
    const outputKey = this.getOutputResourceKey();
    this.applySpaceStorageDeltaForTick(inputKey, -plan.finalInput, accumulatedChanges);
    this.applyResourceDeltaForTick('space', 'energy', -plan.finalSpaceEnergy, accumulatedChanges);
    this.applySpaceStorageDeltaForTick(outputKey, plan.finalOutput, accumulatedChanges);

    if (!accumulatedChanges) {
      storage.reconcileUsedStorage();
    }

    const outputRate = plan.finalOutput / seconds;
    const inputRate = plan.finalInput / seconds;
    const spaceEnergyRate = plan.finalSpaceEnergy / seconds;

    resources?.spaceStorage?.[inputKey]?.modifyRate?.(-inputRate, this.getRateSource(), 'project');
    resources?.space?.energy?.modifyRate?.(-spaceEnergyRate, this.getRateSource(), 'project');
    resources?.spaceStorage?.[outputKey]?.modifyRate?.(outputRate, this.getRateSource(), 'project');

    this.setLastRunStats(spaceEnergyRate, { [outputKey]: outputRate }, inputRate);
    this.updateStatus(this.getText('status.running', null, 'Running'));
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
      const inputKey = this.getInputResourceKey();
      const outputKey = this.getOutputResourceKey();
      resources?.spaceStorage?.[inputKey]?.modifyRate?.(-(plan.finalInput / seconds), this.getRateSource(), 'project');
      resources?.space?.energy?.modifyRate?.(-(plan.finalSpaceEnergy / seconds), this.getRateSource(), 'project');
      resources?.spaceStorage?.[outputKey]?.modifyRate?.(plan.finalOutput / seconds, this.getRateSource(), 'project');
    }

    const inputKey = this.getInputResourceKey();
    const outputKey = this.getOutputResourceKey();
    totals.cost.spaceStorage ||= {};
    totals.cost.spaceStorage[inputKey] = (totals.cost.spaceStorage[inputKey] || 0) + plan.finalInput;

    totals.cost.space ||= {};
    totals.cost.space.energy = (totals.cost.space.energy || 0) + plan.finalSpaceEnergy;

    totals.gain.spaceStorage ||= {};
    totals.gain.spaceStorage[outputKey] = (totals.gain.spaceStorage[outputKey] || 0) + plan.finalOutput;

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
    const inputKey = this.getInputResourceKey();
    const assigned = Number(this.furnaceAssignments[this.getOutputResourceKey()] || 0n);
    if (!(assigned > 0)) {
      return totals;
    }

    const recipe = this.getRecipe();
    const desiredBatches = assigned * this.getAlchemyParameter() * seconds;
    if (!(desiredBatches > 0)) {
      return totals;
    }

    totals.cost.spaceStorage = {
      [inputKey]: desiredBatches * recipe.inputs.spaceStorage[inputKey]
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
