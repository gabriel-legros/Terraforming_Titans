const LIFTER_MODES = {
  GAS_HARVEST: 'gasHarvest',
  ATMOSPHERE_STRIP: 'stripAtmosphere',
};

const LIFTER_RECIPE_TYPES = {
  HARVEST: 'harvest',
  STRIP: 'strip',
};

const LIFTER_STRIP_RECIPE_KEY = 'stripAtmosphere';

const DEFAULT_LIFTER_HARVEST_RECIPES = {
  hydrogen: {
    label: 'Hydrogen',
    storageKey: 'hydrogen',
    outputMultiplier: 50,
    complexity: 1,
    displayOrder: 1,
  },
};

function getLiftersProjectText(path, vars, fallback = '') {
  try {
    return t(`ui.projects.lifters.${path}`, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

let dysonManagerInstance = null;
let LiftersContinuousExpansionBase = null;

if (typeof module !== 'undefined' && module.exports) {
  dysonManagerInstance = require('../dyson-manager.js');
} else if (typeof window !== 'undefined') {
  dysonManagerInstance = window.dysonManager || null;
}

try {
  LiftersContinuousExpansionBase = ContinuousExpansionProject;
} catch (error) {}
try {
  LiftersContinuousExpansionBase = require('./ContinuousExpansionProject.js');
} catch (error) {}
try {
  LiftersContinuousExpansionBase = LiftersContinuousExpansionBase || TerraformingDurationProject;
} catch (error) {}

class LiftersProject extends LiftersContinuousExpansionBase {
  constructor(config, name) {
    super(config, name);
    this.unitRatePerLifter = this.attributes.lifterUnitRate || 1_000_000;
    this.energyPerUnit = this.attributes.lifterEnergyPerUnit || 10_000_000;
    this.superchargeMultiplier = 1;
    this.harvestRecipes = this.attributes?.lifterHarvestRecipes || DEFAULT_LIFTER_HARVEST_RECIPES;
    this.lifterRecipes = this.buildLifterRecipes();

    this.harvestRecipeKey = this.getDefaultHarvestRecipeKey();
    this.pendingHarvestRecipeKey = '';
    this.mode = LIFTER_MODES.GAS_HARVEST;

    this.lifterAssignments = {};
    this.assignmentStep = 1;
    this.autoAssignFlags = {};
    this.autoAssignWeights = {};

    this.isRunning = false;
    this.lastUnitsPerSecond = 0;
    this.lastEnergyPerSecond = 0;
    this.lastHarvestPerSecond = 0;
    this.lastHarvestResourceKey = this.getHarvestRecipe().storageKey;
    this.lastHydrogenPerSecond = 0;
    this.lastAtmospherePerSecond = 0;
    this.lastDysonEnergyPerSecond = 0;
    this.lastStoredSpaceEnergyPerSecond = 0;
    this.lastOutputRatesByRecipe = {};
    this.lastDisplayedRatesByRecipe = {};
    this.lastProductivityByRecipe = {};
    this.lastEnergyLimitedProductivityByRecipe = {};

    this.statusText = getLiftersProjectText('status.idle', null, 'Idle');
    this.shortfallReason = '';
    this.shortfallLastTick = false;
    this.costShortfallLastTick = false;
    this.expansionShortfallLastTick = false;
    this.expansionProgress = 0;
    this.continuousThreshold = 1000;
    this.operationPreRunThisTick = false;
  }

  hasSuperchargeUnlocked() {
    return this.isBooleanFlagSet('starLifting');
  }

  getEffectiveSuperchargeMultiplier() {
    if (!this.hasSuperchargeUnlocked()) {
      return 1;
    }
    const parsed = Number(this.superchargeMultiplier);
    if (Number.isFinite(parsed) && parsed >= 1) {
      return Math.max(1, Math.min(10, Math.round(parsed)));
    }
    return 1;
  }

  normalizeSuperchargeForFlags() {
    const parsed = Number(this.superchargeMultiplier);
    if (Number.isFinite(parsed) && parsed >= 1) {
      this.superchargeMultiplier = Math.max(1, Math.min(10, Math.round(parsed)));
      return;
    }
    this.superchargeMultiplier = 1;
  }

  setSuperchargeMultiplier(value) {
    const next = Math.max(1, Math.min(10, Math.round(Number(value) || 1)));
    const resolved = this.hasSuperchargeUnlocked() ? next : 1;
    if (this.superchargeMultiplier === resolved) {
      return;
    }
    this.superchargeMultiplier = resolved;
    this.updateUI();
  }

  getEffectiveUnitRatePerLifter() {
    return this.unitRatePerLifter * this.getEffectiveSuperchargeMultiplier();
  }

  getEffectiveEnergyPerUnit() {
    const multiplier = this.getEffectiveSuperchargeMultiplier();
    return this.energyPerUnit * multiplier * multiplier * multiplier;
  }

  getBaseDuration() {
    return this.getDurationWithTerraformBonus(this.duration);
  }

  buildLifterRecipes() {
    const recipes = {};
    const stripSource = this.attributes?.lifterStripRecipe || {};
    const stripComplexity = Number(stripSource.complexity);
    const stripDisplayOrder = Number(stripSource.displayOrder);

    recipes[LIFTER_STRIP_RECIPE_KEY] = {
      label: stripSource.label || 'Strip Atmosphere',
      type: LIFTER_RECIPE_TYPES.STRIP,
      complexity: Number.isFinite(stripComplexity) && stripComplexity > 0 ? stripComplexity : 10,
      displayOrder: Number.isFinite(stripDisplayOrder) && stripDisplayOrder > 0 ? stripDisplayOrder : 2,
    };

    const harvestKeys = Object.keys(this.harvestRecipes || {});
    harvestKeys.forEach((key) => {
      const source = this.harvestRecipes[key] || {};
      const displayOrder = Number(source.displayOrder);
      const outputs = {};
      const outputSource = source.outputs || null;
      if (outputSource) {
        Object.keys(outputSource).forEach((resourceKey) => {
          const multiplier = Number(outputSource[resourceKey]);
          if (Number.isFinite(multiplier) && multiplier > 0) {
            outputs[resourceKey] = multiplier;
          }
        });
      }
      if (Object.keys(outputs).length === 0) {
        const outputKey = source.storageKey || key;
        const outputMultiplier = Number.isFinite(source.outputMultiplier) ? source.outputMultiplier : 1;
        outputs[outputKey] = outputMultiplier > 0 ? outputMultiplier : 1;
      }
      const outputKeys = Object.keys(outputs);
      recipes[key] = {
        label: source.label || key,
        type: LIFTER_RECIPE_TYPES.HARVEST,
        storageKey: source.storageKey || outputKeys[0] || key,
        outputMultiplier: outputs[source.storageKey || outputKeys[0] || key] || 1,
        outputs,
        complexity: Number.isFinite(source.complexity) && source.complexity > 0 ? source.complexity : 1,
        displayOrder: Number.isFinite(displayOrder) && displayOrder > 0 ? displayOrder : null,
        requiresProjectFlag: source.requiresProjectFlag || null,
      };
    });

    return recipes;
  }

  getRecipeKeys() {
    return Object.keys(this.lifterRecipes || {}).sort((leftKey, rightKey) => {
      const left = this.lifterRecipes[leftKey] || {};
      const right = this.lifterRecipes[rightKey] || {};
      const leftOrder = Number(left.displayOrder);
      const rightOrder = Number(right.displayOrder);
      const normalizedLeftOrder = Number.isFinite(leftOrder) && leftOrder > 0 ? leftOrder : 1_000_000;
      const normalizedRightOrder = Number.isFinite(rightOrder) && rightOrder > 0 ? rightOrder : 1_000_000;
      if (normalizedLeftOrder !== normalizedRightOrder) {
        return normalizedLeftOrder - normalizedRightOrder;
      }
      return leftKey.localeCompare(rightKey);
    });
  }

  getRecipe(key) {
    return this.lifterRecipes[key] || null;
  }

  getHarvestRecipeKeys() {
    return this.getRecipeKeys().filter((key) => key !== LIFTER_STRIP_RECIPE_KEY);
  }

  isAtmosphereStripDisabled() {
    return this.isBooleanFlagSet('disableAtmosphereStripMode');
  }

  isRecipeAvailable(key, recipe = null) {
    if (key === LIFTER_STRIP_RECIPE_KEY) {
      return !this.isAtmosphereStripDisabled();
    }
    const resolved = recipe || this.getRecipe(key);
    const requiredFlag = resolved?.requiresProjectFlag;
    return !requiredFlag || this.isBooleanFlagSet(requiredFlag);
  }

  isHarvestRecipeAvailable(recipe) {
    const requiredFlag = recipe?.requiresProjectFlag;
    return !requiredFlag || this.isBooleanFlagSet(requiredFlag);
  }

  getAvailableRecipeKeys() {
    return this.getRecipeKeys().filter((key) => this.isRecipeAvailable(key));
  }

  getAvailableHarvestRecipeKeys() {
    return this.getHarvestRecipeKeys().filter((key) => this.isRecipeAvailable(key));
  }

  getAssignmentKeys() {
    return this.getAvailableRecipeKeys();
  }

  getDefaultHarvestRecipeKey() {
    const available = this.getAvailableHarvestRecipeKeys();
    const fallback = this.getHarvestRecipeKeys();
    return available[0] || fallback[0] || 'hydrogen';
  }

  getHarvestRecipe() {
    this.applyPendingHarvestRecipe();
    const available = this.getAvailableHarvestRecipeKeys();
    const nextKey = available.includes(this.harvestRecipeKey)
      ? this.harvestRecipeKey
      : this.getDefaultHarvestRecipeKey();
    if (this.harvestRecipeKey !== nextKey) {
      this.harvestRecipeKey = nextKey;
    }
    return this.getRecipe(nextKey) || DEFAULT_LIFTER_HARVEST_RECIPES.hydrogen;
  }

  getHarvestOptions() {
    return this.getAvailableHarvestRecipeKeys().map((key) => {
      const recipe = this.getRecipe(key);
      return { value: key, label: recipe?.label || key };
    });
  }

  normalizeModeForFlags() {
    if (this.isAtmosphereStripDisabled() && this.mode === LIFTER_MODES.ATMOSPHERE_STRIP) {
      this.mode = LIFTER_MODES.GAS_HARVEST;
      return true;
    }
    return false;
  }

  resolveLegacyRecipeKey(mode = LIFTER_MODES.GAS_HARVEST, harvestRecipeKey = this.harvestRecipeKey) {
    if (mode === LIFTER_MODES.ATMOSPHERE_STRIP && !this.isAtmosphereStripDisabled()) {
      return LIFTER_STRIP_RECIPE_KEY;
    }
    const availableHarvest = this.getAvailableHarvestRecipeKeys();
    if (availableHarvest.includes(harvestRecipeKey)) {
      return harvestRecipeKey;
    }
    return this.getDefaultHarvestRecipeKey();
  }

  applyLegacySingleRecipeConfiguration(mode = LIFTER_MODES.GAS_HARVEST, harvestRecipeKey = this.harvestRecipeKey, useAutoAssign = false) {
    const targetKey = this.resolveLegacyRecipeKey(mode, harvestRecipeKey);
    this.getRecipeKeys().forEach((key) => {
      this.lifterAssignments[key] = 0;
      this.autoAssignFlags[key] = false;
      if (Number.isNaN(Number(this.autoAssignWeights[key]))) {
        this.autoAssignWeights[key] = 1;
      }
    });
    if (targetKey) {
      if (useAutoAssign) {
        this.autoAssignFlags[targetKey] = true;
      } else {
        this.lifterAssignments[targetKey] = this.repeatCount;
      }
    }
    this.normalizeAssignments();
  }

  setMode(value) {
    const next = value === LIFTER_MODES.ATMOSPHERE_STRIP && !this.isAtmosphereStripDisabled()
      ? LIFTER_MODES.ATMOSPHERE_STRIP
      : LIFTER_MODES.GAS_HARVEST;
    if (this.mode === next) {
      return;
    }
    this.mode = next;
    this.applyLegacySingleRecipeConfiguration(this.mode, this.harvestRecipeKey, false);
    this.updateUI();
  }

  setHarvestRecipe(value) {
    const available = this.getAvailableHarvestRecipeKeys();
    const next = available.includes(value) ? value : this.getDefaultHarvestRecipeKey();
    if (this.harvestRecipeKey === next) {
      return;
    }
    this.harvestRecipeKey = next;
    this.pendingHarvestRecipeKey = '';
    this.applyLegacySingleRecipeConfiguration(this.mode, this.harvestRecipeKey, false);
    this.updateUI();
  }

  applyPendingHarvestRecipe() {
    const pendingKey = this.pendingHarvestRecipeKey;
    if (!pendingKey) {
      return;
    }
    const available = this.getAvailableHarvestRecipeKeys();
    if (!available.includes(pendingKey)) {
      return;
    }
    this.pendingHarvestRecipeKey = '';
    this.harvestRecipeKey = pendingKey;
  }

  getRecipeComplexity(recipe) {
    const parsed = Number(recipe?.complexity);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return 1;
  }

  getRecipeOutputMultiplier(recipe) {
    if (recipe?.type !== LIFTER_RECIPE_TYPES.HARVEST) {
      return 1;
    }
    const parsed = Number(recipe.outputMultiplier);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return 1;
  }

  getRecipeOutputs(recipe) {
    if (recipe?.type !== LIFTER_RECIPE_TYPES.HARVEST) {
      return [];
    }

    const outputs = recipe.outputs || null;
    if (outputs) {
      const entries = [];
      Object.keys(outputs).forEach((resourceKey) => {
        const multiplier = Number(outputs[resourceKey]);
        if (Number.isFinite(multiplier) && multiplier > 0) {
          entries.push({ resourceKey, multiplier });
        }
      });
      if (entries.length > 0) {
        return entries;
      }
    }

    return [{
      resourceKey: recipe.storageKey,
      multiplier: this.getRecipeOutputMultiplier(recipe),
    }];
  }

  getRecipeTotalOutputMultiplier(recipe) {
    const outputs = this.getRecipeOutputs(recipe);
    if (outputs.length === 0) {
      return 1;
    }
    return outputs.reduce((sum, output) => sum + output.multiplier, 0);
  }

  getRecipeOperationProductivity(key, productivity = 1) {
    const clamp = (value) => Math.max(0, Math.min(1, value));
    if (Number.isFinite(productivity)) {
      return clamp(productivity);
    }
    const byRecipe = productivity?.[key];
    if (Number.isFinite(byRecipe)) {
      return clamp(byRecipe);
    }
    return 1;
  }

  normalizeAssignments() {
    const allKeys = this.getRecipeKeys();
    const availableKeys = this.getAssignmentKeys();
    const total = this.repeatCount;

    allKeys.forEach((key) => {
      this.lifterAssignments[key] = Math.max(0, Math.floor(this.lifterAssignments[key] || 0));
      this.autoAssignFlags[key] = this.autoAssignFlags[key] === true;
      const weight = Number(this.autoAssignWeights[key]);
      this.autoAssignWeights[key] = Number.isFinite(weight) ? Math.max(0, weight) : 1;
    });

    let usedManual = 0;
    availableKeys.forEach((key) => {
      if (!this.autoAssignFlags[key]) {
        usedManual += this.lifterAssignments[key] || 0;
      }
    });

    const autoKeys = availableKeys.filter((key) => this.autoAssignFlags[key]);
    const remaining = Math.max(0, total - usedManual);

    if (autoKeys.length > 0) {
      let totalWeight = 0;
      autoKeys.forEach((key) => {
        totalWeight += this.autoAssignWeights[key];
      });

      if (totalWeight <= 0) {
        autoKeys.forEach((key) => {
          this.lifterAssignments[key] = 0;
        });
      } else {
        const remainders = [];
        let assigned = 0;
        autoKeys.forEach((key) => {
          const exact = remaining * (this.autoAssignWeights[key] / totalWeight);
          const floorValue = Math.floor(exact);
          this.lifterAssignments[key] = floorValue;
          assigned += floorValue;
          remainders.push({ key, value: exact - floorValue });
        });
        let leftover = remaining - assigned;
        remainders.sort((left, right) => right.value - left.value);
        for (let i = 0; i < remainders.length && leftover > 0; i += 1) {
          this.lifterAssignments[remainders[i].key] += 1;
          leftover -= 1;
        }
      }
    }

    let assignedTotal = availableKeys.reduce((sum, key) => sum + (this.lifterAssignments[key] || 0), 0);
    if (assignedTotal > total) {
      let excess = assignedTotal - total;
      for (let i = availableKeys.length - 1; i >= 0 && excess > 0; i -= 1) {
        const key = availableKeys[i];
        const current = this.lifterAssignments[key] || 0;
        const reduction = Math.min(current, excess);
        this.lifterAssignments[key] = current - reduction;
        excess -= reduction;
      }
      assignedTotal = availableKeys.reduce((sum, key) => sum + (this.lifterAssignments[key] || 0), 0);
    }
  }

  getAssignedTotal() {
    this.normalizeAssignments();
    return this.getAssignmentKeys().reduce((sum, key) => sum + (this.lifterAssignments[key] || 0), 0);
  }

  getAvailableLifters() {
    return Math.max(0, this.repeatCount - this.getAssignedTotal());
  }

  setAssignmentStep(step) {
    const next = Math.min(1_000_000_000_000_000, Math.max(1, Math.round(step)));
    this.assignmentStep = next;
  }

  setAutoAssignTarget(key, enabled) {
    this.autoAssignFlags[key] = enabled === true;
    this.normalizeAssignments();
    this.updateUI();
  }

  adjustAssignment(key, delta) {
    if (this.autoAssignFlags[key]) {
      return;
    }
    this.normalizeAssignments();
    const keys = this.getAssignmentKeys();
    const total = this.repeatCount;
    const current = this.lifterAssignments[key] || 0;
    const usedOther = keys.reduce((sum, otherKey) => {
      if (otherKey === key) {
        return sum;
      }
      if (this.autoAssignFlags[otherKey]) {
        return sum;
      }
      return sum + (this.lifterAssignments[otherKey] || 0);
    }, 0);
    const maxForKey = Math.max(0, total - usedOther);
    this.lifterAssignments[key] = Math.min(maxForKey, Math.max(0, current + delta));
    this.normalizeAssignments();
    this.updateUI();
  }

  clearAssignment(key) {
    if (this.autoAssignFlags[key]) {
      return;
    }
    this.lifterAssignments[key] = 0;
    this.normalizeAssignments();
    this.updateUI();
  }

  maximizeAssignment(key) {
    if (this.autoAssignFlags[key]) {
      return;
    }
    this.normalizeAssignments();
    const keys = this.getAssignmentKeys();
    const total = this.repeatCount;
    const usedOther = keys.reduce((sum, otherKey) => {
      if (otherKey === key) {
        return sum;
      }
      if (this.autoAssignFlags[otherKey]) {
        return sum;
      }
      return sum + (this.lifterAssignments[otherKey] || 0);
    }, 0);
    this.lifterAssignments[key] = Math.max(0, total - usedOther);
    this.normalizeAssignments();
    this.updateUI();
  }

  shouldOperate() {
    if (this.isPermanentlyDisabled?.()) {
      return false;
    }
    if (!this.isRunning || this.repeatCount <= 0) {
      return false;
    }
    return this.getAssignedTotal() > 0;
  }

  setRunning(shouldRun) {
    const next = shouldRun === true;
    if (this.isRunning === next) {
      return;
    }
    this.isRunning = next;
    if (!next) {
      this.setLastTickStats({});
      this.updateStatus(getLiftersProjectText('status.runDisabled', null, 'Run disabled'));
    }
    this.updateUI();
  }

  getSpaceStorageProject() {
    return projectManager?.projects?.spaceStorage || null;
  }

  getDysonOverflowPerSecond() {
    return dysonManagerInstance?.getOverflowEnergyPerSecond?.() || 0;
  }

  getSpaceStoragePendingDelta(accumulatedChanges, resourceKey) {
    return accumulatedChanges?.spaceStorage?.[resourceKey] || 0;
  }

  getStoredResourceValueForTick(storage, resourceKey, accumulatedChanges = null) {
    const pending = this.getSpaceStoragePendingDelta(accumulatedChanges, resourceKey);
    return Math.max(0, storage.getStoredResourceValue(resourceKey) + pending);
  }

  getUsedStorageForTick(storage, accumulatedChanges = null) {
    storage.reconcileUsedStorage?.();
    const base = Math.max(0, storage.usedStorage || 0);
    if (!accumulatedChanges || !accumulatedChanges.spaceStorage) {
      return base;
    }
    let delta = 0;
    for (const resourceKey in accumulatedChanges.spaceStorage) {
      delta += accumulatedChanges.spaceStorage[resourceKey] || 0;
    }
    return Math.max(0, base + delta);
  }

  getAvailableStorageSpaceForTick(storage, accumulatedChanges = null) {
    const used = this.getUsedStorageForTick(storage, accumulatedChanges);
    return Math.max(0, (storage.maxStorage || 0) - used);
  }

  applySpaceStorageDeltaForTick(resourceKey, delta, accumulatedChanges = null) {
    if (!(delta !== 0)) {
      return;
    }
    if (accumulatedChanges) {
      accumulatedChanges.spaceStorage ||= {};
      if (accumulatedChanges.spaceStorage[resourceKey] === undefined) {
        accumulatedChanges.spaceStorage[resourceKey] = 0;
      }
      accumulatedChanges.spaceStorage[resourceKey] += delta;
      return;
    }
    resources.spaceStorage[resourceKey].value += delta;
  }

  getAtmosphericResources(accumulatedChanges = null) {
    const atmospheric = resources?.atmospheric;
    if (!atmospheric) {
      return [];
    }
    return Object.keys(atmospheric)
      .map((key) => {
        const base = atmospheric[key]?.value || 0;
        const pending = accumulatedChanges?.atmospheric?.[key] || 0;
        return {
          key,
          ref: atmospheric[key],
          value: Math.max(0, base + pending),
        };
      })
      .filter((entry) => entry.value > 0);
  }

  getAtmosphereTotal(accumulatedChanges = null) {
    const gases = this.getAtmosphericResources(accumulatedChanges);
    if (!gases.length) {
      return 0;
    }
    return gases.reduce((sum, gas) => sum + gas.value, 0);
  }

  removeAtmosphere(amount, accumulatedChanges, seconds) {
    if (!(amount > 0)) {
      return 0;
    }
    const gases = this.getAtmosphericResources(accumulatedChanges);
    const total = gases.reduce((sum, gas) => sum + gas.value, 0);
    if (!(total > 0)) {
      return 0;
    }

    const limitedAmount = Math.min(amount, total);
    let remaining = limitedAmount;

    gases.forEach((gas, index) => {
      const proportion = total > 0 ? gas.value / total : 0;
      let removed = limitedAmount * proportion;
      if (index === gases.length - 1) {
        removed = Math.min(removed, remaining);
      }
      remaining -= removed;

      if (accumulatedChanges) {
        accumulatedChanges.atmospheric ||= {};
        if (accumulatedChanges.atmospheric[gas.key] === undefined) {
          accumulatedChanges.atmospheric[gas.key] = 0;
        }
        accumulatedChanges.atmospheric[gas.key] -= removed;
      } else if (gas.ref) {
        gas.ref.value = Math.max(0, gas.ref.value - removed);
      }

      gas.ref?.modifyRate?.(
        -(removed > 0 && seconds > 0 ? removed / seconds : 0),
        'Lifting',
        'project'
      );
    });

    return limitedAmount - Math.max(remaining, 0);
  }

  getEnergyAvailabilityForTick(deltaTime = 1000, accumulatedChanges = null) {
    const seconds = deltaTime / 1000;
    const colonyAvailable = 0;
    const hasDysonPool = accumulatedChanges?.dysonSpaceEnergyInjected === true;
    const pendingSpaceEnergy = accumulatedChanges?.space?.energy || 0;
    const dysonAvailable = Math.max(this.getDysonOverflowPerSecond() * seconds, 0);
    const storedAvailable = Math.max(
      0,
      (resources?.space?.energy?.value || 0) + pendingSpaceEnergy - dysonAvailable
    );

    return {
      colonyAvailable,
      storedAvailable,
      dysonAvailable,
      totalAvailable: colonyAvailable + storedAvailable + dysonAvailable,
      hasDysonPool,
      seconds,
    };
  }

  consumeEnergy(energyRequired, deltaTime, accumulatedChanges) {
    const seconds = deltaTime / 1000;
    if (energyRequired <= 0 || seconds <= 0) {
      return {
        energyUsed: 0,
        colonyUsed: 0,
        storedSpaceEnergyUsed: 0,
        dysonEnergyUsed: 0,
        storedAvailable: Math.max(resources?.space?.energy?.value || 0, 0),
        dysonAvailable: this.getDysonOverflowPerSecond() * seconds,
      };
    }

    const availability = this.getEnergyAvailabilityForTick(deltaTime, accumulatedChanges);
    const energyUsed = Math.min(energyRequired, availability.totalAvailable);
    const dysonEnergyUsed = Math.min(energyUsed, availability.dysonAvailable);
    const storedSpaceEnergyUsed = Math.min(
      Math.max(energyUsed - dysonEnergyUsed, 0),
      availability.storedAvailable
    );
    const colonyUsed = Math.min(
      Math.max(energyUsed - dysonEnergyUsed - storedSpaceEnergyUsed, 0),
      availability.colonyAvailable
    );
    const totalSpaceEnergyUsed = dysonEnergyUsed + storedSpaceEnergyUsed;
    const totalUsed = colonyUsed + totalSpaceEnergyUsed;

    if (totalSpaceEnergyUsed > 0 && accumulatedChanges) {
      accumulatedChanges.space ||= {};
      accumulatedChanges.space.energy = (accumulatedChanges.space.energy || 0) - totalSpaceEnergyUsed;
    } else if (storedSpaceEnergyUsed > 0 && resources?.space?.energy) {
      resources.space.energy.value = Math.max(0, (resources.space.energy.value || 0) - storedSpaceEnergyUsed);
    }

    const colonyEnergy = resources?.colony?.energy;
    if (colonyUsed > 0 && colonyEnergy) {
      if (accumulatedChanges) {
        accumulatedChanges.colony ||= {};
        accumulatedChanges.colony.energy = (accumulatedChanges.colony.energy || 0) - colonyUsed;
      } else if (typeof colonyEnergy.decrease === 'function') {
        colonyEnergy.decrease(colonyUsed);
      } else {
        colonyEnergy.value = Math.max(0, (colonyEnergy.value || 0) - colonyUsed);
      }
    }

    return {
      energyUsed: totalUsed,
      colonyUsed,
      storedSpaceEnergyUsed,
      dysonEnergyUsed,
      storedAvailable: availability.storedAvailable,
      dysonAvailable: availability.dysonAvailable,
    };
  }

  refundColonyEnergy(amount, accumulatedChanges) {
    if (!amount) {
      return;
    }
    const colonyEnergy = resources?.colony?.energy;
    if (accumulatedChanges) {
      accumulatedChanges.colony ||= {};
      accumulatedChanges.colony.energy = (accumulatedChanges.colony.energy || 0) + amount;
    } else if (colonyEnergy && typeof colonyEnergy.increase === 'function') {
      colonyEnergy.increase(amount);
    } else if (colonyEnergy) {
      colonyEnergy.value = (colonyEnergy.value || 0) + amount;
    }
  }

  refundSpaceEnergy(amount, accumulatedChanges) {
    if (!amount) {
      return;
    }
    if (accumulatedChanges) {
      accumulatedChanges.space ||= {};
      accumulatedChanges.space.energy = (accumulatedChanges.space.energy || 0) + amount;
    } else if (resources?.space?.energy) {
      resources.space.energy.value = (resources.space.energy.value || 0) + amount;
    }
  }

  adjustEnergyUsage(result, refund, accumulatedChanges) {
    if (!(refund > 0)) {
      return;
    }
    let remaining = refund;
    if (result.colonyUsed > 0) {
      const colonyRefund = Math.min(remaining, result.colonyUsed);
      this.refundColonyEnergy(colonyRefund, accumulatedChanges);
      result.colonyUsed -= colonyRefund;
      remaining -= colonyRefund;
    }
    if (remaining > 0 && result.storedSpaceEnergyUsed > 0) {
      const storedRefund = Math.min(remaining, result.storedSpaceEnergyUsed);
      this.refundSpaceEnergy(storedRefund, accumulatedChanges);
      result.storedSpaceEnergyUsed -= storedRefund;
      remaining -= storedRefund;
    }
    if (remaining > 0 && result.dysonEnergyUsed > 0) {
      const dysonRefund = Math.min(remaining, result.dysonEnergyUsed);
      this.refundSpaceEnergy(dysonRefund, accumulatedChanges);
      result.dysonEnergyUsed -= dysonRefund;
      remaining -= dysonRefund;
    }
    result.energyUsed = result.colonyUsed + result.storedSpaceEnergyUsed + result.dysonEnergyUsed;
  }

  buildOperationEntries(seconds, productivity = 1) {
    this.normalizeAssignments();
    const entries = [];

    this.getAssignmentKeys().forEach((key) => {
      const recipe = this.getRecipe(key);
      const assigned = this.lifterAssignments[key] || 0;
      if (!(assigned > 0) || !recipe) {
        return;
      }
      const complexity = this.getRecipeComplexity(recipe);
      const productivityRatio = this.getRecipeOperationProductivity(key, productivity);
      const unitsPerSecond = (assigned / complexity) * this.getEffectiveUnitRatePerLifter();
      const baseUnits = unitsPerSecond * seconds;
      const desiredUnits = baseUnits * productivityRatio;

      entries.push({
        key,
        recipe,
        assigned,
        complexity,
        baseUnits,
        requestedProductivity: productivityRatio,
        outputMultiplier: this.getRecipeOutputMultiplier(recipe),
        totalOutputMultiplier: this.getRecipeTotalOutputMultiplier(recipe),
        desiredUnits,
        limitedUnits: 0,
        finalUnits: 0,
        finalOutput: 0,
        productivityRatio: 0,
      });
    });

    return entries;
  }

  planOperation(seconds, productivity = 1, accumulatedChanges = null) {
    const entries = this.buildOperationEntries(seconds, productivity);
    const storage = this.getSpaceStorageProject();
    const atmosphereAvailable = this.getAtmosphereTotal(accumulatedChanges);

    const plan = {
      entries,
      desiredTotalUnits: 0,
      limitedTotalUnits: 0,
      plannedTotalUnits: 0,
      desiredAssignedLifters: 0,
      limitedAssignedLifters: 0,
      hasHarvestAssignments: false,
      hasStripAssignments: false,
      energyNeeded: 0,
      energyRatio: 1,
      energyAvailability: {
        colonyAvailable: 0,
        dysonAvailable: 0,
        totalAvailable: 0,
      },
      reasons: {
        noStorage: false,
        storageLimited: false,
        capLimited: false,
        atmosphereLimited: false,
        energyLimited: false,
      },
    };

    if (entries.length === 0) {
      return plan;
    }

    entries.forEach((entry) => {
      plan.desiredTotalUnits += entry.desiredUnits;
      plan.desiredAssignedLifters += entry.assigned * (entry.requestedProductivity || 0);
      if (entry.recipe.type === LIFTER_RECIPE_TYPES.STRIP) {
        plan.hasStripAssignments = true;
        const limited = Math.min(entry.desiredUnits, atmosphereAvailable);
        if (limited < entry.desiredUnits) {
          plan.reasons.atmosphereLimited = true;
        }
        entry.limitedUnits = Math.max(0, limited);
        return;
      }

      plan.hasHarvestAssignments = true;
      if (!storage) {
        entry.limitedUnits = 0;
        plan.reasons.noStorage = true;
        return;
      }

      entry.limitedUnits = Math.max(0, entry.desiredUnits);
    });

    plan.limitedTotalUnits = entries.reduce((sum, entry) => sum + entry.limitedUnits, 0);
    plan.limitedAssignedLifters = entries.reduce((sum, entry) => {
      if (!(entry.desiredUnits > 0)) {
        return sum;
      }
      const utilization = Math.max(0, Math.min(1, entry.limitedUnits / entry.desiredUnits));
      const assignedAtRecipeProductivity = entry.assigned * (entry.requestedProductivity || 0);
      return sum + (assignedAtRecipeProductivity * utilization);
    }, 0);
    if (!(plan.limitedTotalUnits > 0)) {
      entries.forEach((entry) => {
        entry.productivityRatio = entry.baseUnits > 0 ? 0 : 1;
      });
      return plan;
    }

    plan.energyAvailability = this.getEnergyAvailabilityForTick(seconds * 1000, accumulatedChanges);
    plan.energyNeeded = plan.limitedAssignedLifters * this.getEffectiveEnergyPerUnit() * seconds;
    if (plan.energyNeeded > 0) {
      plan.energyRatio = Math.max(0, Math.min(1, plan.energyAvailability.totalAvailable / plan.energyNeeded));
      if (plan.energyRatio < 1) {
        plan.reasons.energyLimited = true;
      }
    }

    entries.forEach((entry) => {
      entry.finalUnits = entry.limitedUnits * plan.energyRatio;
      entry.finalOutput = entry.recipe.type === LIFTER_RECIPE_TYPES.HARVEST
        ? entry.finalUnits * entry.totalOutputMultiplier
        : entry.finalUnits;
      entry.productivityRatio = entry.baseUnits > 0
        ? Math.max(0, Math.min(1, entry.finalUnits / entry.baseUnits))
        : 1;
    });

    plan.plannedTotalUnits = entries.reduce((sum, entry) => sum + entry.finalUnits, 0);
    return plan;
  }

  getOperationProductivityForTick(defaultProductivity = 1, deltaTime = 1000) {
    const productivities = {};
    this.getRecipeKeys().forEach((key) => {
      productivities[key] = 0;
    });

    if (!this.shouldOperate()) {
      return productivities;
    }

    const seconds = deltaTime / 1000;
    if (!(seconds > 0)) {
      return productivities;
    }

    const plan = this.planOperation(seconds, defaultProductivity, null);
    plan.entries.forEach((entry) => {
      productivities[entry.key] = entry.productivityRatio;
    });
    return productivities;
  }

  storeHarvestedResourceForTick(storage, resourceKey, amount, accumulatedChanges = null) {
    if (!(amount > 0) || !storage) {
      return 0;
    }

    const availableSpace = this.getAvailableStorageSpaceForTick(storage, accumulatedChanges);
    const stored = Math.min(amount, availableSpace);
    if (!(stored > 0)) {
      return 0;
    }

    this.applySpaceStorageDeltaForTick(resourceKey, stored, accumulatedChanges);
    if (!accumulatedChanges) {
      storage.reconcileUsedStorage?.();
      if (typeof updateSpaceStorageUI === 'function') {
        updateSpaceStorageUI(storage);
      }
    }

    return stored;
  }

  storeHarvestOutputsForTick(storage, recipe, units, seconds, accumulatedChanges = null) {
    if (!storage || !(units > 0)) {
      return { totalStored: 0, storedByResource: {}, producedRatesByResource: {} };
    }

    const storedByResource = {};
    const producedRatesByResource = {};
    let totalStored = 0;
    this.getRecipeOutputs(recipe).forEach(({ resourceKey, multiplier }) => {
      const amount = units * multiplier;
      const producedRate = seconds > 0 ? amount / seconds : 0;
      producedRatesByResource[resourceKey] = producedRate;
      const stored = this.storeHarvestedResourceForTick(
        storage,
        resourceKey,
        amount,
        accumulatedChanges
      );
      storedByResource[resourceKey] = stored;
      totalStored += stored;

      if (producedRate > 0) {
        resources?.spaceStorage?.[resourceKey]?.modifyRate?.(
          producedRate,
          'Lifting',
          'project'
        );
      }
    });

    return {
      totalStored,
      storedByResource,
      producedRatesByResource,
    };
  }

  getBlockedStatusFromPlan(plan) {
    if (plan.reasons.noStorage) {
      return getLiftersProjectText('status.buildSpaceStorage', null, 'Build space storage');
    }
    if (plan.reasons.storageLimited) {
      return getLiftersProjectText('status.spaceStorageFull', null, 'Space storage is full');
    }
    if (plan.reasons.capLimited) {
      return getLiftersProjectText('status.storageCapReached', null, 'Storage cap reached');
    }
    if (plan.hasStripAssignments && this.getAtmosphereTotal() <= 0) {
      return getLiftersProjectText('status.noAtmosphereToStrip', null, 'No atmosphere to strip');
    }
    if (plan.reasons.energyLimited) {
      return getLiftersProjectText('status.insufficientEnergy', null, 'Insufficient energy');
    }
    if (plan.entries.length === 0) {
      return getLiftersProjectText('status.noAssignments', null, 'No assignments');
    }
    return getLiftersProjectText('status.idle', null, 'Idle');
  }

  setLastTickStats(stats = {}) {
    this.lastUnitsPerSecond = stats.totalUnitsPerSecond || 0;
    this.lastEnergyPerSecond = stats.energyPerSecond || 0;
    this.lastAtmospherePerSecond = stats.atmospherePerSecond || 0;
    this.lastDysonEnergyPerSecond = stats.dysonPerSecond || 0;

    this.lastHarvestPerSecond = 0;
    this.lastHydrogenPerSecond = 0;
    this.lastOutputRatesByRecipe = {};
    this.lastDisplayedRatesByRecipe = {};
    this.lastProductivityByRecipe = {};
    this.lastEnergyLimitedProductivityByRecipe = {};

    const outputRatesByRecipe = stats.outputRatesByRecipe || {};
    const outputBreakdownByRecipe = stats.outputBreakdownByRecipe || {};
    const producedOutputBreakdownByRecipe = stats.producedOutputBreakdownByRecipe || outputBreakdownByRecipe;
    const displayRatesByRecipe = stats.displayRatesByRecipe || outputRatesByRecipe;
    const productivityByRecipe = stats.productivityByRecipe || {};
    const energyLimitedProductivityByRecipe = stats.energyLimitedProductivityByRecipe || productivityByRecipe;
    let bestHarvestRate = 0;
    let bestHarvestResource = this.lastHarvestResourceKey || 'hydrogen';

    this.getRecipeKeys().forEach((key) => {
      const recipe = this.getRecipe(key);
      const rate = outputRatesByRecipe[key] || 0;
      const displayRate = displayRatesByRecipe[key] || 0;
      this.lastOutputRatesByRecipe[key] = rate;
      this.lastDisplayedRatesByRecipe[key] = displayRate;
      this.lastProductivityByRecipe[key] = this.getRecipeOperationProductivity(key, productivityByRecipe);
      this.lastEnergyLimitedProductivityByRecipe[key] = this.getRecipeOperationProductivity(key, energyLimitedProductivityByRecipe);

      if (recipe?.type !== LIFTER_RECIPE_TYPES.HARVEST) {
        return;
      }

      this.lastHarvestPerSecond += rate;
      this.lastHydrogenPerSecond += producedOutputBreakdownByRecipe[key]?.hydrogen || 0;
      if (rate > bestHarvestRate) {
        bestHarvestRate = rate;
        bestHarvestResource = recipe.storageKey || bestHarvestResource;
      }
    });

    this.lastHarvestResourceKey = bestHarvestResource;
    this.lastStoredSpaceEnergyPerSecond = stats.storedSpacePerSecond || 0;
  }

  getDisplayedRecipeProductivity(recipeKey) {
    const value = this.lastEnergyLimitedProductivityByRecipe?.[recipeKey];
    if (Number.isFinite(value)) {
      return Math.max(0, Math.min(1, value));
    }
    return 1;
  }

  updateStatus(text) {
    this.statusText = text || 'Idle';
  }

  start(resources) {
    this.expansionProgress = 0;
    this.expansionShortfallLastTick = false;
    return this.startContinuousExpansion(resources);
  }

  applyExpansionCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    this.costShortfallLastTick = false;
    if (!this.autoStart) {
      return;
    }
    this.expansionShortfallLastTick = false;
    if (!this.isExpansionContinuous() || !this.isActive) {
      return;
    }
    const tick = this.getContinuousExpansionTickState(deltaTime);
    if (!tick.ready) {
      return;
    }

    const result = this.applyRequestedExpansionProgress(
      tick.requestedProgress,
      this.getScaledCost(),
      accumulatedChanges,
      {
        applyRates: tick.seconds > 0 && this.showsInResourcesRate(),
        seconds: tick.seconds,
        rateSourceLabel: 'Lifter expansion'
      }
    );
    this.expansionShortfallLastTick = result.shortfall;
    this.costShortfallLastTick = this.expansionShortfallLastTick;
  }

  applyOperationCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (!this.shouldOperate()) {
      this.setLastTickStats({});
      if (!this.repeatCount) {
        this.updateStatus(getLiftersProjectText('status.completeAtLeastOne', null, 'Complete at least one lifter'));
      } else if (!this.isRunning) {
        this.updateStatus(getLiftersProjectText('status.runDisabled', null, 'Run disabled'));
      } else {
        this.updateStatus(getLiftersProjectText('status.noAssignments', null, 'No assignments'));
      }
      this.shortfallLastTick = false;
      return;
    }

    const seconds = deltaTime / 1000;
    if (!(seconds > 0)) {
      this.setLastTickStats({});
      this.updateStatus(getLiftersProjectText('status.idle', null, 'Idle'));
      this.shortfallLastTick = false;
      return;
    }

    const plan = this.planOperation(seconds, productivity, accumulatedChanges);
    const productivityByRecipe = {};
    const displayRatesByRecipe = {};
    const energyLimitedProductivityByRecipe = {};
    this.getRecipeKeys().forEach((key) => {
      productivityByRecipe[key] = 0;
      displayRatesByRecipe[key] = 0;
      energyLimitedProductivityByRecipe[key] = 0;
    });
    plan.entries.forEach((entry) => {
      productivityByRecipe[entry.key] = entry.productivityRatio;
    });

    if (plan.entries.length > 0) {
      const desiredAssignedLifters = plan.entries.reduce((sum, entry) => {
        return sum + (entry.assigned * (entry.requestedProductivity || 0));
      }, 0);
      const desiredEnergy = desiredAssignedLifters * this.getEffectiveEnergyPerUnit() * seconds;
      const energyAvailability = this.getEnergyAvailabilityForTick(deltaTime, accumulatedChanges);
      const energyOnlyRatio = desiredEnergy > 0
        ? Math.max(0, Math.min(1, energyAvailability.totalAvailable / desiredEnergy))
        : 0;

      plan.entries.forEach((entry) => {
        const displayUnits = (entry.desiredUnits || 0) * energyOnlyRatio;
        const displayRate = entry.recipe.type === LIFTER_RECIPE_TYPES.HARVEST
          ? (displayUnits * entry.totalOutputMultiplier) / seconds
          : (displayUnits / seconds);
        displayRatesByRecipe[entry.key] = displayRate;
        energyLimitedProductivityByRecipe[entry.key] = entry.baseUnits > 0
          ? Math.max(0, Math.min(1, displayUnits / entry.baseUnits))
          : 1;
      });
    }

    if (plan.entries.length === 0) {
      this.setLastTickStats({
        productivityByRecipe,
        displayRatesByRecipe,
        energyLimitedProductivityByRecipe,
      });
      this.updateStatus(getLiftersProjectText('status.noAssignments', null, 'No assignments'));
      this.shortfallLastTick = false;
      return;
    }

    if (!(plan.plannedTotalUnits > 0)) {
      this.setLastTickStats({
        productivityByRecipe,
        displayRatesByRecipe,
        energyLimitedProductivityByRecipe,
      });
      this.updateStatus(this.getBlockedStatusFromPlan(plan));
      this.shortfallLastTick = true;
      return;
    }

    const requestedEnergy = plan.energyNeeded;
    const energyResult = this.consumeEnergy(requestedEnergy, deltaTime, accumulatedChanges);
    if (!(energyResult.energyUsed > 0)) {
      this.setLastTickStats({
        productivityByRecipe,
        displayRatesByRecipe,
        energyLimitedProductivityByRecipe,
      });
      this.updateStatus(this.getBlockedStatusFromPlan(plan));
      this.shortfallLastTick = true;
      return;
    }

    const energyScale = requestedEnergy > 0
      ? Math.max(0, Math.min(1, energyResult.energyUsed / requestedEnergy))
      : 1;

    const storage = this.getSpaceStorageProject();
    const outputRatesByRecipe = {};
    const outputBreakdownByRecipe = {};
    const producedOutputBreakdownByRecipe = {};
    let atmosphereRemoved = 0;
    let processedUnits = 0;

    plan.entries.forEach((entry) => {
      let units = entry.finalUnits * energyScale;
      if (!(units > 0)) {
        outputRatesByRecipe[entry.key] = 0;
        outputBreakdownByRecipe[entry.key] = {};
        producedOutputBreakdownByRecipe[entry.key] = {};
        return;
      }

      if (entry.recipe.type === LIFTER_RECIPE_TYPES.STRIP) {
        const removed = this.removeAtmosphere(units, accumulatedChanges, seconds);
        atmosphereRemoved += removed;
        processedUnits += removed;
        outputRatesByRecipe[entry.key] = seconds > 0 ? removed / seconds : 0;
        outputBreakdownByRecipe[entry.key] = {};
        producedOutputBreakdownByRecipe[entry.key] = {};
        return;
      }

      if (!storage) {
        outputRatesByRecipe[entry.key] = 0;
        outputBreakdownByRecipe[entry.key] = {};
        producedOutputBreakdownByRecipe[entry.key] = {};
        return;
      }

      const storedOutputs = this.storeHarvestOutputsForTick(
        storage,
        entry.recipe,
        units,
        seconds,
        accumulatedChanges
      );
      processedUnits += units;
      outputRatesByRecipe[entry.key] = seconds > 0 ? storedOutputs.totalStored / seconds : 0;
      outputBreakdownByRecipe[entry.key] = storedOutputs.storedByResource;
      producedOutputBreakdownByRecipe[entry.key] = storedOutputs.producedRatesByResource;
    });

    const outputRealizationRatio = plan.plannedTotalUnits > 0
      ? Math.max(0, Math.min(1, processedUnits / plan.plannedTotalUnits))
      : 0;
    const actualEnergy = energyResult.energyUsed * outputRealizationRatio;
    if (actualEnergy < energyResult.energyUsed) {
      this.adjustEnergyUsage(energyResult, energyResult.energyUsed - actualEnergy, accumulatedChanges);
    }

    const energyPerSecond = energyResult.energyUsed / seconds;
    const storedSpacePerSecond = energyResult.storedSpaceEnergyUsed / seconds;
    const dysonPerSecond = energyResult.dysonEnergyUsed / seconds;
    const totalSpacePerSecond = storedSpacePerSecond + dysonPerSecond;
    if (totalSpacePerSecond > 0) {
      resources?.space?.energy?.modifyRate?.(-totalSpacePerSecond, 'Lifting', 'project');
    }

    this.setLastTickStats({
      totalUnitsPerSecond: processedUnits / seconds,
      energyPerSecond,
      storedSpacePerSecond,
      atmospherePerSecond: atmosphereRemoved / seconds,
      dysonPerSecond,
      outputRatesByRecipe,
      outputBreakdownByRecipe,
      producedOutputBreakdownByRecipe,
      productivityByRecipe,
      displayRatesByRecipe,
      energyLimitedProductivityByRecipe,
    });

    if (processedUnits > 0) {
      const wasLimited = plan.reasons.energyLimited
        || plan.reasons.atmosphereLimited;
      this.updateStatus(getLiftersProjectText('status.running', null, 'Running'));
      this.shortfallLastTick = wasLimited;
    } else {
      this.updateStatus(this.getBlockedStatusFromPlan(plan));
      this.shortfallLastTick = true;
    }
  }

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    const operationAlreadyHandled = this.operationPreRunThisTick === true;
    this.operationPreRunThisTick = false;
    if (!operationAlreadyHandled) {
      this.applyOperationCostAndGain(deltaTime, accumulatedChanges, productivity);
    }
    this.applyExpansionCostAndGain(deltaTime, accumulatedChanges, productivity);
    this.shortfallLastTick = this.shortfallLastTick || this.expansionShortfallLastTick;
  }

  mergeEstimateTotals(target, source) {
    for (const bucket of ['cost', 'gain']) {
      const sourceBucket = source?.[bucket] || {};
      for (const category in sourceBucket) {
        target[bucket][category] ||= {};
        for (const resource in sourceBucket[category]) {
          target[bucket][category][resource] =
            (target[bucket][category][resource] || 0) + sourceBucket[category][resource];
        }
      }
    }
    return target;
  }

  estimateCostAndGainByPhase(
    deltaTime = 1000,
    applyRates = true,
    productivity = 1,
    accumulatedChanges = null,
    includeExpansion = true,
    includeOperation = true
  ) {
    const totals = { cost: {}, gain: {} };
    const storageState = this.createExpansionStorageState(accumulatedChanges);

    const expansionActive = includeExpansion && this.isActive && (!this.isExpansionContinuous() || this.autoStart);
    if (expansionActive) {
      const duration = this.getEffectiveDuration();
      const limit = this.maxRepeatCount || Infinity;
      const completedExpansions = this.repeatCount + this.expansionProgress;
      const remainingRepeats = limit === Infinity ? Infinity : Math.max(0, limit - completedExpansions);
      const requestedProgress = this.isExpansionContinuous()
        ? Math.min(deltaTime / duration, remainingRepeats)
        : (deltaTime / duration);
      let progress = requestedProgress;
      const cost = this.getScaledCost();
      if (this.isExpansionContinuous()) {
        progress = this.getAffordableExpansionProgress(
          requestedProgress,
          cost,
          storageState,
          accumulatedChanges
        );
      }

      if (remainingRepeats > 0 && progress > 0) {
        const expansionTotals = this.estimateExpansionCostForProgress(
          cost,
          progress,
          deltaTime,
          accumulatedChanges,
          storageState,
          {
            applyRates,
            sourceLabel: 'Lifter expansion'
          }
        );
        this.mergeResourceTotals(totals.cost, expansionTotals);
      }
    }

    if (!includeOperation || !this.shouldOperate()) {
      return totals;
    }

    const seconds = deltaTime / 1000;
    if (!(seconds > 0)) {
      return totals;
    }

    const plan = this.planOperation(seconds, productivity, accumulatedChanges);
    if (!(plan.plannedTotalUnits > 0)) {
      return totals;
    }

    const totalEnergy = plan.energyNeeded * plan.energyRatio;
    if (!(totalEnergy > 0)) {
      return totals;
    }

    if (applyRates) {
      resources?.space?.energy?.modifyRate?.(
        -(totalEnergy / seconds),
        'Lifting',
        'project'
      );
    }

    totals.cost.space ||= {};
    totals.cost.space.energy = (totals.cost.space.energy || 0) + totalEnergy;

    plan.entries.forEach((entry) => {
      if (!(entry.finalUnits > 0)) {
        return;
      }

      if (entry.recipe.type === LIFTER_RECIPE_TYPES.STRIP) {
        const gases = this.getAtmosphericResources(accumulatedChanges);
        const totalAtmosphere = gases.reduce((sum, gas) => sum + gas.value, 0);
        if (!(totalAtmosphere > 0)) {
          return;
        }

        let remaining = entry.finalUnits;
        gases.forEach((gas, index) => {
          const proportion = totalAtmosphere > 0 ? gas.value / totalAtmosphere : 0;
          let removed = entry.finalUnits * proportion;
          if (index === gases.length - 1) {
            removed = Math.min(removed, remaining);
          }
          remaining -= removed;

          if (!(removed > 0)) {
            return;
          }

          if (applyRates) {
            gas.ref?.modifyRate?.(
              -(removed / seconds),
              'Lifting',
              'project'
            );
          }

          totals.cost.atmospheric ||= {};
          totals.cost.atmospheric[gas.key] = (totals.cost.atmospheric[gas.key] || 0) + removed;
        });
        return;
      }

      this.getRecipeOutputs(entry.recipe).forEach(({ resourceKey, multiplier }) => {
        const amount = entry.finalUnits * multiplier;
        if (!(amount > 0)) {
          return;
        }

        if (applyRates) {
          resources?.spaceStorage?.[resourceKey]?.modifyRate?.(
            amount / seconds,
            'Lifting',
            'project'
          );
        }

        totals.gain.spaceStorage ||= {};
        totals.gain.spaceStorage[resourceKey] = (totals.gain.spaceStorage[resourceKey] || 0) + amount;
      });
    });

    return totals;
  }

  estimateExpansionCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
    return this.estimateCostAndGainByPhase(
      deltaTime,
      applyRates,
      productivity,
      accumulatedChanges,
      true,
      false
    );
  }

  estimateOperationCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
    return this.estimateCostAndGainByPhase(
      deltaTime,
      applyRates,
      productivity,
      accumulatedChanges,
      false,
      true
    );
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

    const entries = this.buildOperationEntries(seconds, 1);
    if (entries.length === 0) {
      return totals;
    }

    const desiredAssignedLifters = entries.reduce((sum, entry) => {
      return sum + (entry.assigned * (entry.requestedProductivity || 0));
    }, 0);
    const desiredEnergy = desiredAssignedLifters * this.getEffectiveEnergyPerUnit() * seconds;
    if (!(desiredEnergy > 0)) {
      return totals;
    }

    totals.cost.space = {
      energy: desiredEnergy
    };
    return totals;
  }

  estimateCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
    const preRun = this.operationPreRunThisTick === true;
    const expansionApplyRates = applyRates;
    const totals = this.estimateExpansionCostAndGain(deltaTime, expansionApplyRates, productivity, accumulatedChanges);
    if (preRun) {
      return totals;
    }
    const operationTotals = this.estimateOperationCostAndGain(deltaTime, applyRates, productivity, accumulatedChanges);
    return this.mergeEstimateTotals(totals, operationTotals);
  }

  renderUI(container) {
    if (typeof renderLiftersUI === 'function') {
      renderLiftersUI(this, container);
    }
  }

  updateUI() {
    if (typeof updateLiftersUI === 'function') {
      updateLiftersUI(this);
    }
  }

  applyBooleanFlag(effect) {
    super.applyBooleanFlag(effect);
    this.normalizeModeForFlags();
    this.normalizeSuperchargeForFlags();
    this.applyPendingHarvestRecipe();
    this.normalizeAssignments();
    this.updateUI();
  }

  saveAutomationSettings() {
    return {
      ...super.saveAutomationSettings(),
      isRunning: this.isRunning === true,
      lifterAssignments: { ...this.lifterAssignments },
      assignmentStep: this.assignmentStep,
      autoAssignFlags: { ...this.autoAssignFlags },
      autoAssignWeights: { ...this.autoAssignWeights },
      superchargeMultiplier: this.superchargeMultiplier,
      mode: this.mode,
      harvestRecipeKey: this.harvestRecipeKey,
    };
  }

  loadAutomationSettings(settings = {}) {
    super.loadAutomationSettings(settings);

    if (Object.prototype.hasOwnProperty.call(settings, 'isRunning')) {
      this.isRunning = settings.isRunning === true;
    }

    const hasAssignmentState =
      Object.prototype.hasOwnProperty.call(settings, 'lifterAssignments')
      || Object.prototype.hasOwnProperty.call(settings, 'assignmentStep')
      || Object.prototype.hasOwnProperty.call(settings, 'autoAssignFlags')
      || Object.prototype.hasOwnProperty.call(settings, 'autoAssignWeights')
      || Object.prototype.hasOwnProperty.call(settings, 'superchargeMultiplier');

    if (hasAssignmentState) {
      if (Object.prototype.hasOwnProperty.call(settings, 'lifterAssignments')) {
        this.lifterAssignments = { ...(settings.lifterAssignments || {}) };
      }
      if (Object.prototype.hasOwnProperty.call(settings, 'assignmentStep')) {
        this.assignmentStep = settings.assignmentStep || 1;
      }
      if (Object.prototype.hasOwnProperty.call(settings, 'autoAssignFlags')) {
        this.autoAssignFlags = { ...(settings.autoAssignFlags || {}) };
      }
      if (Object.prototype.hasOwnProperty.call(settings, 'autoAssignWeights')) {
        this.autoAssignWeights = { ...(settings.autoAssignWeights || {}) };
      }
      if (Object.prototype.hasOwnProperty.call(settings, 'superchargeMultiplier')) {
        this.superchargeMultiplier = settings.superchargeMultiplier || 1;
      }
    } else {
      if (Object.prototype.hasOwnProperty.call(settings, 'mode')) {
        this.mode = settings.mode || LIFTER_MODES.GAS_HARVEST;
      }
      if (Object.prototype.hasOwnProperty.call(settings, 'harvestRecipeKey')) {
        this.pendingHarvestRecipeKey = settings.harvestRecipeKey || '';
        this.harvestRecipeKey = this.getDefaultHarvestRecipeKey();
        this.applyPendingHarvestRecipe();
      }
      this.applyLegacySingleRecipeConfiguration(this.mode, this.harvestRecipeKey, true);
    }

    this.normalizeModeForFlags();
    this.normalizeSuperchargeForFlags();
    this.normalizeAssignments();
  }

  saveState() {
    return {
      ...super.saveState(),
      isRunning: this.isRunning,
      expansionProgress: this.expansionProgress,
      lifterAssignments: { ...this.lifterAssignments },
      assignmentStep: this.assignmentStep,
      autoAssignFlags: { ...this.autoAssignFlags },
      autoAssignWeights: { ...this.autoAssignWeights },
      superchargeMultiplier: this.superchargeMultiplier,
      mode: this.mode,
      harvestRecipeKey: this.harvestRecipeKey,
    };
  }

  loadState(state = {}) {
    super.loadState(state);
    this.isRunning = state.isRunning === true;
    this.expansionProgress = state.expansionProgress || 0;

    const hasAssignmentState =
      Object.prototype.hasOwnProperty.call(state, 'lifterAssignments')
      || Object.prototype.hasOwnProperty.call(state, 'assignmentStep')
      || Object.prototype.hasOwnProperty.call(state, 'autoAssignFlags')
      || Object.prototype.hasOwnProperty.call(state, 'autoAssignWeights')
      || Object.prototype.hasOwnProperty.call(state, 'superchargeMultiplier');

    if (hasAssignmentState) {
      this.lifterAssignments = { ...(state.lifterAssignments || {}) };
      this.assignmentStep = state.assignmentStep || 1;
      this.autoAssignFlags = { ...(state.autoAssignFlags || {}) };
      this.autoAssignWeights = { ...(state.autoAssignWeights || {}) };
      this.superchargeMultiplier = state.superchargeMultiplier || 1;
      this.mode = state.mode || LIFTER_MODES.GAS_HARVEST;
      this.pendingHarvestRecipeKey = state.harvestRecipeKey || '';
      this.harvestRecipeKey = this.getDefaultHarvestRecipeKey();
      this.applyPendingHarvestRecipe();
    } else {
      this.superchargeMultiplier = state.superchargeMultiplier || 1;
      this.mode = state.mode || LIFTER_MODES.GAS_HARVEST;
      this.pendingHarvestRecipeKey = state.harvestRecipeKey || '';
      this.harvestRecipeKey = this.getDefaultHarvestRecipeKey();
      this.applyPendingHarvestRecipe();
      this.applyLegacySingleRecipeConfiguration(this.mode, this.harvestRecipeKey, false);
    }

    this.normalizeModeForFlags();
    this.normalizeSuperchargeForFlags();
    this.normalizeAssignments();

    if (!this.isRunning) {
      this.setLastTickStats({});
      this.updateStatus(getLiftersProjectText('status.idle', null, 'Idle'));
    }
  }

  saveTravelState() {
    const state = {
      repeatCount: this.repeatCount,
      expansionProgress: this.expansionProgress,
      lifterAssignments: { ...this.lifterAssignments },
      assignmentStep: this.assignmentStep,
      autoAssignFlags: { ...this.autoAssignFlags },
      autoAssignWeights: { ...this.autoAssignWeights },
      superchargeMultiplier: this.superchargeMultiplier,
      mode: this.mode,
      harvestRecipeKey: this.harvestRecipeKey,
    };
    if (this.isActive) {
      state.isActive = true;
      state.remainingTime = this.remainingTime;
      state.startingDuration = this.startingDuration;
    }
    return state;
  }

  loadTravelState(state = {}) {
    this.repeatCount = state.repeatCount || 0;
    this.expansionProgress = state.expansionProgress || 0;

    const hasAssignmentState =
      Object.prototype.hasOwnProperty.call(state, 'lifterAssignments')
      || Object.prototype.hasOwnProperty.call(state, 'assignmentStep')
      || Object.prototype.hasOwnProperty.call(state, 'autoAssignFlags')
      || Object.prototype.hasOwnProperty.call(state, 'autoAssignWeights')
      || Object.prototype.hasOwnProperty.call(state, 'superchargeMultiplier');

    if (hasAssignmentState) {
      this.lifterAssignments = { ...(state.lifterAssignments || {}) };
      this.assignmentStep = state.assignmentStep || 1;
      this.autoAssignFlags = { ...(state.autoAssignFlags || {}) };
      this.autoAssignWeights = { ...(state.autoAssignWeights || {}) };
      this.superchargeMultiplier = state.superchargeMultiplier || 1;
      this.mode = state.mode || LIFTER_MODES.GAS_HARVEST;
      this.pendingHarvestRecipeKey = state.harvestRecipeKey || '';
      this.harvestRecipeKey = this.getDefaultHarvestRecipeKey();
      this.applyPendingHarvestRecipe();
    } else {
      this.superchargeMultiplier = state.superchargeMultiplier || 1;
      this.mode = state.mode || LIFTER_MODES.GAS_HARVEST;
      this.pendingHarvestRecipeKey = state.harvestRecipeKey || '';
      this.harvestRecipeKey = this.getDefaultHarvestRecipeKey();
      this.applyPendingHarvestRecipe();
      this.applyLegacySingleRecipeConfiguration(this.mode, this.harvestRecipeKey, false);
    }

    this.normalizeModeForFlags();
    this.normalizeSuperchargeForFlags();
    this.normalizeAssignments();

    this.isRunning = false;
    this.isCompleted = false;
    this.setLastTickStats({});
    this.updateStatus(getLiftersProjectText('status.idle', null, 'Idle'));

    if (state.isActive) {
      this.isActive = true;
      this.startingDuration = state.startingDuration || this.getEffectiveDuration();
      this.remainingTime = state.remainingTime || this.startingDuration;
      return;
    }

    this.isActive = false;
    const duration = this.getEffectiveDuration();
    this.startingDuration = duration;
    this.remainingTime = duration;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = LiftersProject;
} else if (typeof window !== 'undefined') {
  window.LiftersProject = LiftersProject;
}
