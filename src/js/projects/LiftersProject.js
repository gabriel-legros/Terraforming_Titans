const LIFTER_MODES = {
  GAS_HARVEST: 'gasHarvest',
  ATMOSPHERE_STRIP: 'stripAtmosphere',
};

const LIFTER_RECIPE_TYPES = {
  HARVEST: 'harvest',
  STRIP: 'strip',
};

const LIFTER_STRIP_RECIPE_KEY = 'stripAtmosphere';
const LIFTERS_UNASSIGNED_KEY = 'idleUnassigned';
const LIFTER_EMPTY_OUTPUTS = [];
const LIFTER_ASSIGNMENT_STEP_MAX = 1_000_000_000_000_000_000_000_000_000_000n;
const LIFTER_GAS_GIANT_CAP_WARP_GATE_LEVEL = 1_000_000;
const LIFTER_GAS_GIANT_CAP_RATE_DIVISOR = 10000 * 365;
const LIFTER_GAS_GIANT_RESOURCE_POOLS = {
  hydrogen: 5e34,
  methane: 3e33,
  ammonia: 8e32,
};

const DEFAULT_LIFTER_HARVEST_RECIPES = {
  hydrogen: {
    label: t('ui.projects.lifters.recipeLabels.hydrogen', {}, 'Hydrogen'),
    storageKey: 'hydrogen',
    outputMultiplier: 50,
    complexity: 1,
    displayOrder: 1,
  },
};

let LiftersAssignmentTools = {};
try {
  LiftersAssignmentTools = {
    createProjectAssignmentBase,
    normalizeProjectAssignmentInteger,
    serializeProjectAssignmentInteger,
    serializeProjectAssignments
  };
} catch (error) {}
try {
  LiftersAssignmentTools = require('./ProjectAssignmentBase.js');
} catch (error) {}

function normalizeLifterInteger(value) {
  return LiftersAssignmentTools.normalizeProjectAssignmentInteger(value);
}

function serializeLifterInteger(value) {
  return LiftersAssignmentTools.serializeProjectAssignmentInteger(value);
}

function serializeLifterAssignments(assignments = {}) {
  return LiftersAssignmentTools.serializeProjectAssignments(assignments);
}

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

class LiftersProject extends LiftersAssignmentTools.createProjectAssignmentBase(LiftersContinuousExpansionBase) {
  constructor(config, name) {
    super(config, name);
    this.unitRatePerLifter = this.attributes.lifterUnitRate || 1_000_000;
    this.energyPerUnit = this.attributes.lifterEnergyPerUnit || 10_000_000;
    this.superchargeMultiplier = 1;
    this.harvestRecipes = this.attributes?.lifterHarvestRecipes || DEFAULT_LIFTER_HARVEST_RECIPES;
    this.lifterRecipes = this.buildLifterRecipes();
    this.recipeKeys = this.buildRecipeKeys();
    this.harvestRecipeKeys = this.recipeKeys.filter((key) => key !== LIFTER_STRIP_RECIPE_KEY);

    this.harvestRecipeKey = this.getDefaultHarvestRecipeKey();
    this.pendingHarvestRecipeKey = '';
    this.mode = LIFTER_MODES.GAS_HARVEST;

    this.lifterAssignments = {};
    this.assignmentStep = 1n;
    this.autoAssignFlags = {};
    this.autoAssignWeights = {};

    this.isRunning = false;
    this.disableStripBelowPressure = false;
    this.stripPressureThreshold = 0;
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
    this.stripPressureAutomationElements = null;
    this.deferAssignmentCapClamp = false;
    this.assignmentsDirty = true;
    this.assignmentsLastTotal = null;
    this.assignmentsLastClamp = null;
    this.assignmentsLastLand = null;
    this.assignmentsLastWarpAverage = null;
    this.cachedAssignedTotal = 0n;
    this.initializeAssignmentState({
      assignmentStateKey: 'lifterAssignments',
      assignmentStepMax: LIFTER_ASSIGNMENT_STEP_MAX
    });
    this.syncStarLifterSuperchargeUpgrades();
  }

  syncStarLifterSuperchargeUpgrades() {
    buildings.starLifter.syncLifterSuperchargeUpgrades(this);
  }

  getLifterTextPath() {
    return 'ui.projects.lifters';
  }

  getProjectText(path, vars, fallback = '') {
    return t(`${this.getLifterTextPath()}.${path}`, vars, fallback);
  }

  hasSuperchargeUnlocked() {
    return this.isBooleanFlagSet('starLifting');
  }

  getEffectiveSuperchargeMaxMultiplier() {
    let bonus = 0;
    this.activeEffects.forEach((effect) => {
      if (effect?.type !== 'superchargeMaxBonus') {
        return;
      }
      const value = Number(effect.value);
      if (Number.isFinite(value) && value > 0) {
        bonus += value;
      }
    });
    return Math.max(10, Math.round(10 + bonus));
  }

  getEffectiveSuperchargeExponent() {
    let reduction = 0;
    this.activeEffects.forEach((effect) => {
      if (effect?.type !== 'superchargeExponentReduction') {
        return;
      }
      const value = Number(effect.value);
      if (Number.isFinite(value) && value > 0) {
        reduction += value;
      }
    });
    return Math.max(2, Math.min(3, 3 - reduction));
  }

  getEffectiveSuperchargeMultiplier() {
    if (!this.hasSuperchargeUnlocked()) {
      return 1;
    }
    const maxMultiplier = this.getEffectiveSuperchargeMaxMultiplier();
    const parsed = Number(this.superchargeMultiplier);
    if (Number.isFinite(parsed) && parsed >= 1) {
      return Math.max(1, Math.min(maxMultiplier, Math.round(parsed)));
    }
    return 1;
  }

  normalizeSuperchargeForFlags(options = {}) {
    const skipMaxClamp = options.skipMaxClamp === true;
    const maxMultiplier = this.getEffectiveSuperchargeMaxMultiplier();
    const parsed = Number(this.superchargeMultiplier);
    if (Number.isFinite(parsed) && parsed >= 1) {
      if (skipMaxClamp) {
        this.superchargeMultiplier = Math.max(1, Math.round(parsed));
      } else {
        this.superchargeMultiplier = Math.max(1, Math.min(maxMultiplier, Math.round(parsed)));
      }
      return;
    }
    this.superchargeMultiplier = 1;
  }

  setSuperchargeMultiplier(value) {
    const maxMultiplier = this.getEffectiveSuperchargeMaxMultiplier();
    const next = Math.max(1, Math.min(maxMultiplier, Math.round(Number(value) || 1)));
    const resolved = this.hasSuperchargeUnlocked() ? next : 1;
    if (this.superchargeMultiplier === resolved) {
      return;
    }
    this.superchargeMultiplier = resolved;
    this.updateUI();
  }

  getEffectiveUnitRatePerLifter() {
    return this.unitRatePerLifter
      * this.getEffectiveSuperchargeMultiplier()
      * this.getEffectiveThroughputMultiplier();
  }

  getEffectiveEnergyPerUnit() {
    const multiplier = this.getEffectiveSuperchargeMultiplier();
    return this.energyPerUnit
      * Math.pow(multiplier, this.getEffectiveSuperchargeExponent())
      * this.getEffectiveThroughputMultiplier();
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
      const outputEntries = [];
      outputKeys.forEach((resourceKey) => {
        const multiplier = Number(outputs[resourceKey]);
        if (Number.isFinite(multiplier) && multiplier > 0) {
          outputEntries.push({ resourceKey, multiplier });
        }
      });
      recipes[key] = {
        label: source.label || key,
        type: LIFTER_RECIPE_TYPES.HARVEST,
        storageKey: source.storageKey || outputKeys[0] || key,
        outputMultiplier: outputs[source.storageKey || outputKeys[0] || key] || 1,
        outputs,
        outputEntries,
        complexity: Number.isFinite(source.complexity) && source.complexity > 0 ? source.complexity : 1,
        displayOrder: Number.isFinite(displayOrder) && displayOrder > 0 ? displayOrder : null,
        requiresProjectFlag: source.requiresProjectFlag || null,
      };
    });

    return recipes;
  }

  buildRecipeKeys() {
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

  getRecipeKeys() {
    return this.recipeKeys;
  }

  getRecipe(key) {
    return this.lifterRecipes[key] || null;
  }

  getHarvestRecipeKeys() {
    return this.harvestRecipeKeys;
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

  getUnassignedAssignmentKey() {
    return LIFTERS_UNASSIGNED_KEY;
  }

  getManagedAssignmentKeys() {
    return [this.getUnassignedAssignmentKey()].concat(this.getAssignmentKeys());
  }

  isUnassignedAssignmentKey(key) {
    return key === this.getUnassignedAssignmentKey();
  }

  getUnassignedAssignmentLabelText() {
    return t('ui.projects.common.idleUnassigned', null, 'Idle/Unassigned');
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
        this.lifterAssignments[targetKey] = normalizeLifterInteger(this.repeatCount);
      }
    }
    this.markAssignmentsDirty();
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
      return LIFTER_EMPTY_OUTPUTS;
    }

    if (recipe.outputEntries && recipe.outputEntries.length > 0) {
      return recipe.outputEntries;
    }

    return [{
      resourceKey: recipe.storageKey,
      multiplier: this.getRecipeOutputMultiplier(recipe),
    }];
  }

  getGasGiantCapResourceKey(recipeKey, recipe = null) {
    const resolved = recipe || this.getRecipe(recipeKey);
    if (recipeKey === 'hydrogen' || resolved?.storageKey === 'hydrogen') {
      return recipeKey === 'starLifting' ? null : 'hydrogen';
    }
    if (recipeKey === 'methane' || resolved?.storageKey === 'atmosphericMethane') {
      return 'methane';
    }
    if (recipeKey === 'ammonia' || resolved?.storageKey === 'atmosphericAmmonia') {
      return 'ammonia';
    }
    return null;
  }

  getGasGiantCapMultiplier() {
    const averageLevel = warpGateNetworkManager.getAverageWarpGateLevelAllSectors();
    return Math.max(1, averageLevel) / LIFTER_GAS_GIANT_CAP_WARP_GATE_LEVEL;
  }

  getGasGiantCapRateForRecipe(recipeKey, recipe = null) {
    const resourceKey = this.getGasGiantCapResourceKey(recipeKey, recipe);
    if (!resourceKey) {
      return Infinity;
    }
    return (LIFTER_GAS_GIANT_RESOURCE_POOLS[resourceKey] / LIFTER_GAS_GIANT_CAP_RATE_DIVISOR)
      * this.getGasGiantCapMultiplier();
  }

  getGasGiantMaxAssignmentForRecipe(recipeKey, recipe = null) {
    const resolved = recipe || this.getRecipe(recipeKey);
    if (!resolved) {
      return 0n;
    }
    const capRate = this.getGasGiantCapRateForRecipe(recipeKey, resolved);
    if (capRate === Infinity) {
      return null;
    }
    const unitRate = this.getEffectiveUnitRatePerLifter();
    if (!(unitRate > 0)) {
      return 0n;
    }
    const complexity = this.getRecipeComplexity(resolved);
    const outputMultiplier = Math.max(1, this.getRecipeTotalOutputMultiplier(resolved));
    const maxAssigned = Math.floor((capRate * complexity) / (unitRate * outputMultiplier));
    return normalizeLifterInteger(maxAssigned);
  }

  getAtmosphericStrippingMaxAssignmentForRecipe(recipeKey, recipe = null) {
    const resolved = recipe || this.getRecipe(recipeKey);
    if (!gameSettings.liftersStrippingCap || recipeKey !== LIFTER_STRIP_RECIPE_KEY || !resolved) {
      return null;
    }
    return normalizeLifterInteger(resources.surface.land.value);
  }

  getMaxAssignmentForRecipe(recipeKey, recipe = null) {
    const resolved = recipe || this.getRecipe(recipeKey);
    const caps = [
      this.getGasGiantMaxAssignmentForRecipe(recipeKey, resolved),
      this.getAtmosphericStrippingMaxAssignmentForRecipe(recipeKey, resolved),
    ].filter((cap) => cap !== null);
    if (caps.length === 0) {
      return null;
    }
    return caps.reduce((lowest, cap) => cap < lowest ? cap : lowest);
  }

  getMaxAssignmentTooltipText(recipeKey, recipe = null) {
    const stripCap = this.getAtmosphericStrippingMaxAssignmentForRecipe(recipeKey, recipe);
    if (stripCap !== null) {
      return getLiftersProjectText(
        'strippingMaxAssignmentTooltip',
        { max: formatNumber(stripCap, true, 2) },
        `Limited to ${formatNumber(stripCap, true, 2)} lifters by the current world geometric land value.`
      );
    }
    return this.getGasGiantMaxAssignmentTooltipText(recipeKey, recipe);
  }

  getGasGiantMaxAssignmentTooltipText(recipeKey, recipe = null) {
    const resolved = recipe || this.getRecipe(recipeKey);
    const resourceKey = this.getGasGiantCapResourceKey(recipeKey, resolved);
    if (!resourceKey || !resolved) {
      return '';
    }
    const pool = LIFTER_GAS_GIANT_RESOURCE_POOLS[resourceKey];
    const averageLevel = warpGateNetworkManager.getAverageWarpGateLevelAllSectors();
    const networkScale = Math.max(1, averageLevel) / LIFTER_GAS_GIANT_CAP_WARP_GATE_LEVEL;
    const capRate = this.getGasGiantCapRateForRecipe(recipeKey, resolved);
    const unitRate = this.getEffectiveUnitRatePerLifter();
    const complexity = this.getRecipeComplexity(resolved);
    const outputMultiplier = Math.max(1, this.getRecipeTotalOutputMultiplier(resolved));
    const maxAssigned = this.getGasGiantMaxAssignmentForRecipe(recipeKey, resolved);
    return getLiftersProjectText(
      'maxAssignmentTooltip',
      {
        pool: formatNumber(pool, true, 3),
        divisor: formatNumber(LIFTER_GAS_GIANT_CAP_RATE_DIVISOR, true),
        averageLevel: formatNumber(averageLevel, true, 3),
        levelCap: formatNumber(LIFTER_GAS_GIANT_CAP_WARP_GATE_LEVEL, true),
        networkScale: formatNumber(networkScale, true, 6),
        capRate: formatNumber(capRate, true, 3),
        unitRate: formatNumber(unitRate, true, 3),
        complexity: formatNumber(complexity, true, 3),
        outputMultiplier: formatNumber(outputMultiplier, true, 3),
        max: formatNumber(maxAssigned, true, 2),
      },
      `Pool: ${formatNumber(pool, true, 3)}
Time divisor: ${formatNumber(LIFTER_GAS_GIANT_CAP_RATE_DIVISOR, true)} (10000 years)
Warp Gate Network scale: max(1, ${formatNumber(averageLevel, true, 3)}) / ${formatNumber(LIFTER_GAS_GIANT_CAP_WARP_GATE_LEVEL, true)} = ${formatNumber(networkScale, true, 6)}
Max harvest rate: ${formatNumber(pool, true, 3)} / ${formatNumber(LIFTER_GAS_GIANT_CAP_RATE_DIVISOR, true)} x ${formatNumber(networkScale, true, 6)} = ${formatNumber(capRate, true, 3)}/s
Per-lifter harvest rate: ${formatNumber(unitRate, true, 3)} x ${formatNumber(outputMultiplier, true, 3)} / ${formatNumber(complexity, true, 3)}
Max assignment: floor(${formatNumber(capRate, true, 3)} x ${formatNumber(complexity, true, 3)} / (${formatNumber(unitRate, true, 3)} x ${formatNumber(outputMultiplier, true, 3)})) = ${formatNumber(maxAssigned, true, 2)}`
    );
  }

  getAssignmentCapForKey(key, total = this.getAssignmentTotalCapacityForBatch()) {
    if (this.isUnassignedAssignmentKey(key)) {
      return total;
    }
    const recipe = this.getRecipe(key);
    const cap = this.getMaxAssignmentForRecipe(key, recipe);
    if (cap === null) {
      return total;
    }
    return cap < total ? cap : total;
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

  shouldClampAssignmentCaps() {
    return this.deferAssignmentCapClamp !== true;
  }

  applyDeferredAssignmentCapClamp() {
    if (this.deferAssignmentCapClamp !== true) {
      return;
    }
    this.deferAssignmentCapClamp = false;
    this.markAssignmentsDirty();
    this.normalizeAssignments();
  }

  deferLoadedAssignmentCapClamp() {
    this.deferAssignmentCapClamp = true;
  }

  getAssignmentTotalCapacity() {
    return normalizeLifterInteger(this.repeatCount);
  }

  getPersistentAssignmentKeys() {
    return [this.getUnassignedAssignmentKey()].concat(this.getRecipeKeys());
  }

  getAssignmentNormalizationSignature() {
    const total = this.getAssignmentTotalCapacityForBatch();
    const clampAssignmentCaps = this.shouldClampAssignmentCaps();
    const landValue = resources.surface.land.value;
    const warpAverage = warpGateNetworkManager.getAverageWarpGateLevelAllSectors();
    const unitRate = this.getEffectiveUnitRatePerLifter();
    const managedKeys = this.getManagedAssignmentKeys();
    const recipeCapInputs = managedKeys.map((key) => {
      const recipe = this.getRecipe(key);
      if (!recipe) {
        return `${key}:none`;
      }
      const capResourceKey = this.getGasGiantCapResourceKey(key, recipe);
      const complexity = this.getRecipeComplexity(recipe);
      const outputMultiplier = this.getRecipeTotalOutputMultiplier(recipe);
      return `${key}:${capResourceKey}:${complexity}:${outputMultiplier}`;
    }).join('|');
    return [
      `total:${total.toString()}`,
      `clamp:${clampAssignmentCaps}`,
      `stripCap:${gameSettings.liftersStrippingCap}`,
      `land:${landValue}`,
      `warp:${warpAverage}`,
      `unitRate:${unitRate}`,
      `recipes:${recipeCapInputs}`
    ].join('|');
  }

  getDisplayedAssignmentAmount(key) {
    return this.getStoredAssignmentAmount(key);
  }

  shouldOperate() {
    if (this.isPermanentlyDisabled?.()) {
      return false;
    }
    const total = this.getAssignmentTotalCapacityForBatch();
    if (!this.isRunning || total <= 0n) {
      return false;
    }
    return this.getAssignedTotal() > 0n;
  }

  getAvailableLifters(skipNormalization = false, assignedTotal = null) {
    return this.getAvailableAssignments(skipNormalization, assignedTotal);
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

  getStripPressureFloorAmount() {
    const gravity = terraforming.celestialParameters.gravity;
    const radius = terraforming.celestialParameters.radius;
    const pressurePerUnitPa = calculateAtmosphericPressure(1, gravity, radius, terraforming.celestialParameters.surfaceArea);
    if (pressurePerUnitPa <= 0) {
      return 0;
    }
    return this.stripPressureThreshold / pressurePerUnitPa;
  }

  getStripAvailableAtmosphere(accumulatedChanges = null) {
    const total = this.getAtmosphereTotal(accumulatedChanges);
    if (!(total > 0)) {
      return 0;
    }
    if (!this.disableStripBelowPressure) {
      return total;
    }
    const floorAmount = this.getStripPressureFloorAmount();
    return Math.max(0, total - floorAmount);
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
        this.getOperationRateSourceLabel(),
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

  buildOperationEntries(seconds, productivity = 1, options = {}) {
    if (options.skipAssignmentNormalization !== true) {
      this.normalizeAssignments();
    }
    const entries = [];

    this.getAssignmentKeys().forEach((key) => {
      const recipe = this.getRecipe(key);
      const assigned = this.lifterAssignments[key] || 0n;
      if (!(assigned > 0n) || !recipe) {
        return;
      }
      const complexity = this.getRecipeComplexity(recipe);
      const productivityRatio = this.getRecipeOperationProductivity(key, productivity);
      const assignedNumber = Number(assigned);
      const unitsPerSecond = (assignedNumber / complexity) * this.getEffectiveUnitRatePerLifter();
      const baseUnits = unitsPerSecond * seconds;
      const desiredUnits = baseUnits * productivityRatio;

      entries.push({
        key,
        recipe,
        assigned,
        assignedNumber,
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

  planOperation(seconds, productivity = 1, accumulatedChanges = null, options = {}) {
    const entries = this.buildOperationEntries(seconds, productivity, options);
    const storage = this.getSpaceStorageProject();
    let stripAvailableAtmosphere = this.getStripAvailableAtmosphere(accumulatedChanges);
    const skipEnergyLimit = options.skipEnergyLimit === true;

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
        pressureLimited: false,
        energyLimited: false,
      },
    };

    if (entries.length === 0) {
      return plan;
    }

    entries.forEach((entry) => {
      plan.desiredTotalUnits += entry.desiredUnits;
      plan.desiredAssignedLifters += entry.assignedNumber * (entry.requestedProductivity || 0);
      if (entry.recipe.type === LIFTER_RECIPE_TYPES.STRIP) {
        plan.hasStripAssignments = true;
        const limited = Math.min(entry.desiredUnits, stripAvailableAtmosphere);
        if (limited < entry.desiredUnits) {
          plan.reasons.atmosphereLimited = true;
          if (this.disableStripBelowPressure && stripAvailableAtmosphere <= 0) {
            plan.reasons.pressureLimited = true;
          }
        }
        stripAvailableAtmosphere = Math.max(0, stripAvailableAtmosphere - limited);
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
      const assignedAtRecipeProductivity = entry.assignedNumber * (entry.requestedProductivity || 0);
      return sum + (assignedAtRecipeProductivity * utilization);
    }, 0);
    if (!(plan.limitedTotalUnits > 0)) {
      entries.forEach((entry) => {
        entry.productivityRatio = entry.baseUnits > 0 ? 0 : 1;
      });
      return plan;
    }

    plan.energyNeeded = plan.limitedAssignedLifters * this.getEffectiveEnergyPerUnit() * seconds;
    if (skipEnergyLimit) {
      plan.energyAvailability = this.getEnergyAvailabilityForTick(seconds * 1000, accumulatedChanges);
      plan.energyRatio = 1;
    } else if (plan.energyNeeded > 0) {
      plan.energyAvailability = this.getEnergyAvailabilityForTick(seconds * 1000, accumulatedChanges);
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
    this.applyDeferredAssignmentCapClamp();
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

    const plan = this.planOperation(seconds, defaultProductivity, null, {
      skipEnergyLimit: true,
      skipAssignmentNormalization: true
    });
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
          this.getOperationRateSourceLabel(),
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
    if (plan.reasons.pressureLimited) {
      return getLiftersProjectText('status.pressureLimitReached', null, 'Pressure limiter reached');
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

  syncExpansionContinuousState() {
    if (!this.isActive) {
      return;
    }
    const nowContinuous = this.isExpansionContinuous();
    const wasContinuous = this.startingDuration === Infinity || this.remainingTime === Infinity;

    if (nowContinuous && !wasContinuous) {
      this.carryDiscreteExpansionProgress();
      return;
    }

    const duration = this.getEffectiveDuration();
    if (!nowContinuous && wasContinuous) {
      this.isActive = false;
      this.isPaused = false;
      this.isCompleted = false;
      this.startingDuration = duration;
      this.remainingTime = duration;
      return;
    }

    if (!nowContinuous) {
      const ratio = this.startingDuration > 0
        ? (this.startingDuration - this.remainingTime) / this.startingDuration
        : 0;
      this.startingDuration = duration;
      this.remainingTime = duration * (1 - ratio);
    }
  }

  start(resources) {
    this.expansionProgress = 0;
    this.expansionShortfallLastTick = false;
    return this.startContinuousExpansion(resources);
  }

  update(deltaTime) {
    this.syncExpansionContinuousState();
    super.update(deltaTime);
  }

  applyExpansionCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    this.costShortfallLastTick = false;
    if (!this.autoStart && !this.manualContinuousRun) {
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
        rateSourceLabel: this.getExpansionRateSourceLabel()
      }
    );
    this.expansionShortfallLastTick = result.shortfall;
    this.costShortfallLastTick = this.expansionShortfallLastTick;
  }

  getExpansionRateSourceLabel() {
    return registerRateSource(
      'project:lifters:expansion',
      getLiftersProjectText('rateSources.expansion', null, 'Lifter expansion')
    );
  }

  getOperationRateSourceLabel() {
    return registerRateSource(
      'project:lifters:operation',
      getLiftersProjectText('rateSources.operation', null, 'Lifting')
    );
  }

  shouldKeepRunningOnTravel() {
    return false;
  }

  applyOperationCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (!this.shouldOperate()) {
      this.setLastTickStats({});
      if (!this.repeatCount) {
        this.updateStatus(this.getProjectText('status.completeAtLeastOne', null, 'Complete at least one lifter'));
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

    const hasSharedOperationProductivity = productivity && typeof productivity === 'object';
    const plan = this.planOperation(seconds, productivity, accumulatedChanges, {
      skipEnergyLimit: hasSharedOperationProductivity,
      skipAssignmentNormalization: true
    });
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
        return sum + (entry.assignedNumber * (entry.requestedProductivity || 0));
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
      resources?.space?.energy?.modifyRate?.(-totalSpacePerSecond, this.getOperationRateSourceLabel(), 'project');
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
    this.applyDeferredAssignmentCapClamp();
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

    const expansionActive = includeExpansion
      && this.isActive
      && (!this.isExpansionContinuous() || this.autoStart || this.manualContinuousRun);
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
            sourceLabel: this.getExpansionRateSourceLabel()
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

    const hasSharedOperationProductivity = productivity && typeof productivity === 'object';
    const plan = this.planOperation(seconds, productivity, accumulatedChanges, {
      skipEnergyLimit: hasSharedOperationProductivity,
      skipAssignmentNormalization: true
    });
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
        this.getOperationRateSourceLabel(),
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
              this.getOperationRateSourceLabel(),
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
            this.getOperationRateSourceLabel(),
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

    const entries = this.buildOperationEntries(seconds, 1, {
      skipAssignmentNormalization: true
    });
    if (entries.length === 0) {
      return totals;
    }

    const desiredAssignedLifters = entries.reduce((sum, entry) => {
      return sum + (entry.assignedNumber * (entry.requestedProductivity || 0));
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

  createStripPressureControl() {
    const control = document.createElement('div');
    control.classList.add('checkbox-container', 'lifters-strip-pressure-control');
    control.id = `${this.name}-strip-pressure-control`;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `${this.name}-strip-pressure-checkbox`;
    checkbox.addEventListener('change', () => {
      this.disableStripBelowPressure = checkbox.checked;
      this.updateUI();
    });

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = getLiftersProjectText(
      'disableStripBelowPressure',
      null,
      'Disable atmospheric stripping below:'
    );

    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'decimal';
    input.classList.add('lifters-strip-pressure-input');
    wireStringNumberInput(input, {
      parseValue: (value) => {
        const parsed = parseFlexibleNumber(value);
        return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
      },
      formatValue: (value) => formatNumber(Math.max(0, value), true, 2),
      onValue: (value) => {
        this.stripPressureThreshold = Math.max(0, value);
      },
      datasetKey: 'pressurePa',
    });

    const unit = document.createElement('span');
    unit.classList.add('lifters-strip-pressure-unit');
    unit.textContent = getLiftersProjectText('pa', null, 'Pa');

    checkbox.checked = this.disableStripBelowPressure === true;
    input.value = formatNumber(this.stripPressureThreshold || 0, true, 2);

    control.append(checkbox, label, input, unit);

    this.stripPressureAutomationElements = {
      control,
      checkbox,
      input,
      unit,
    };

    return control;
  }

  syncStripPressureAutomationUI() {
    const elements = this.stripPressureAutomationElements;
    if (!elements) {
      return;
    }

    if (elements.checkbox) {
      elements.checkbox.checked = this.disableStripBelowPressure === true;
    }
    if (elements.input && document.activeElement !== elements.input) {
      elements.input.value = formatNumber(this.stripPressureThreshold || 0, true, 2);
    }
    if (elements.unit) {
      elements.unit.textContent = getLiftersProjectText('pa', null, 'Pa');
    }
  }

  renderAutomationUI(container) {
    const elements = this.stripPressureAutomationElements || {};
    const control = elements.control || this.createStripPressureControl();
    this.syncStripPressureAutomationUI();
    if (control.parentNode !== container) {
      container.appendChild(control);
      window.invalidateAutomationSettingsCache?.(this.name);
    }
  }

  renderUI(container) {
    if (typeof renderLiftersUI === 'function') {
      renderLiftersUI(this, container);
    }
  }

  updateUI() {
    this.syncStripPressureAutomationUI();
    if (typeof updateLiftersUI === 'function') {
      updateLiftersUI(this);
    }
  }

  applyBooleanFlag(effect) {
    super.applyBooleanFlag(effect);
    this.normalizeModeForFlags();
    this.normalizeSuperchargeForFlags({ skipMaxClamp: true });
    this.applyPendingHarvestRecipe();
    this.markAssignmentsDirty();
    this.normalizeAssignments();
    this.syncStarLifterSuperchargeUpgrades();
    this.updateUI();
  }

  applyEffect(effect) {
    super.applyEffect(effect);
    if (
      effect?.type === 'superchargeMaxBonus'
      || effect?.type === 'superchargeExponentReduction'
    ) {
      this.syncStarLifterSuperchargeUpgrades();
    }
  }

  removeEffect(effect) {
    const result = super.removeEffect(effect);
    this.syncStarLifterSuperchargeUpgrades();
    return result;
  }

  reconcileConditionalEffects() {
    super.reconcileConditionalEffects();
    this.syncStarLifterSuperchargeUpgrades();
  }

  clearEffectsOnTravel() {
    super.clearEffectsOnTravel();
    this.syncStarLifterSuperchargeUpgrades();
  }

  saveAutomationSettings() {
    return {
      ...super.saveAutomationSettings(),
      isRunning: this.isRunning === true,
      ...this.saveAssignmentSettings(),
      superchargeMultiplier: this.superchargeMultiplier,
      disableStripBelowPressure: this.disableStripBelowPressure === true,
      stripPressureThreshold: this.stripPressureThreshold,
      mode: this.mode,
      harvestRecipeKey: this.harvestRecipeKey,
    };
  }

  loadAutomationSettings(settings = {}, options = {}) {
    super.loadAutomationSettings(settings);
    const isPresetApplication = options.isPresetApplication === true;
    const shouldApplyPresetAssignments = !isPresetApplication
      || Object.keys(settings.lifterAssignments || {}).length > 0;
    const shouldApplyPresetAutoFlags = !isPresetApplication
      || Object.keys(settings.autoAssignFlags || {}).length > 0;
    const shouldApplyPresetAutoWeights = !isPresetApplication
      || Object.keys(settings.autoAssignWeights || {}).length > 0;

    if (Object.prototype.hasOwnProperty.call(settings, 'isRunning')) {
      this.isRunning = settings.isRunning === true;
    }

    const hasAssignmentState =
      (Object.prototype.hasOwnProperty.call(settings, 'lifterAssignments') && shouldApplyPresetAssignments)
      || Object.prototype.hasOwnProperty.call(settings, 'assignmentStep')
      || (Object.prototype.hasOwnProperty.call(settings, 'autoAssignFlags') && shouldApplyPresetAutoFlags)
      || (Object.prototype.hasOwnProperty.call(settings, 'autoAssignWeights') && shouldApplyPresetAutoWeights)
      || Object.prototype.hasOwnProperty.call(settings, 'superchargeMultiplier')
      || Object.prototype.hasOwnProperty.call(settings, 'disableStripBelowPressure')
      || Object.prototype.hasOwnProperty.call(settings, 'stripPressureThreshold');
    const hasLegacyRecipeConfiguration =
      Object.prototype.hasOwnProperty.call(settings, 'mode')
      || Object.prototype.hasOwnProperty.call(settings, 'harvestRecipeKey');

    if (hasAssignmentState) {
      if (!isPresetApplication) {
        this.deferLoadedAssignmentCapClamp();
      }
      this.loadAssignmentSettings(settings, options);
      if (Object.prototype.hasOwnProperty.call(settings, 'superchargeMultiplier')) {
        this.superchargeMultiplier = settings.superchargeMultiplier || 1;
      }
      if (Object.prototype.hasOwnProperty.call(settings, 'disableStripBelowPressure')) {
        this.disableStripBelowPressure = settings.disableStripBelowPressure === true;
      }
      if (Object.prototype.hasOwnProperty.call(settings, 'stripPressureThreshold')) {
        this.stripPressureThreshold = Math.max(0, Number(settings.stripPressureThreshold) || 0);
      }
    } else if (hasLegacyRecipeConfiguration) {
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

    if (hasAssignmentState || hasLegacyRecipeConfiguration) {
      this.normalizeModeForFlags();
      this.normalizeSuperchargeForFlags({ skipMaxClamp: true });
      this.markAssignmentsDirty();
      this.normalizeAssignments();
      this.normalizeAssignmentStep();
      this.syncStripPressureAutomationUI();
    }
  }

  saveState() {
    return {
      ...super.saveState(),
      isRunning: this.isRunning,
      expansionProgress: this.expansionProgress,
      ...this.saveAssignmentSettings(),
      superchargeMultiplier: this.superchargeMultiplier,
      disableStripBelowPressure: this.disableStripBelowPressure === true,
      stripPressureThreshold: this.stripPressureThreshold,
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
      || Object.prototype.hasOwnProperty.call(state, 'superchargeMultiplier')
      || Object.prototype.hasOwnProperty.call(state, 'disableStripBelowPressure')
      || Object.prototype.hasOwnProperty.call(state, 'stripPressureThreshold');

    if (hasAssignmentState) {
      this.deferLoadedAssignmentCapClamp();
      this.loadAssignmentSettings(state);
      this.superchargeMultiplier = state.superchargeMultiplier || 1;
      this.disableStripBelowPressure = state.disableStripBelowPressure === true;
      this.stripPressureThreshold = Math.max(0, Number(state.stripPressureThreshold) || 0);
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
    this.normalizeSuperchargeForFlags({ skipMaxClamp: true });
    this.markAssignmentsDirty();
    this.normalizeAssignments();
    this.normalizeAssignmentStep();

    if (!this.isRunning) {
      this.setLastTickStats({});
      this.updateStatus(getLiftersProjectText('status.idle', null, 'Idle'));
    }
    this.syncExpansionContinuousState();
  }

  saveTravelState() {
    const state = {
      repeatCount: this.repeatCount,
      isRunning: this.isRunning === true,
      expansionProgress: this.expansionProgress,
      ...this.saveAssignmentSettings(),
      superchargeMultiplier: this.superchargeMultiplier,
      disableStripBelowPressure: this.disableStripBelowPressure === true,
      stripPressureThreshold: this.stripPressureThreshold,
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
      || Object.prototype.hasOwnProperty.call(state, 'superchargeMultiplier')
      || Object.prototype.hasOwnProperty.call(state, 'disableStripBelowPressure')
      || Object.prototype.hasOwnProperty.call(state, 'stripPressureThreshold');

    if (hasAssignmentState) {
      this.deferLoadedAssignmentCapClamp();
      this.loadAssignmentSettings(state);
      this.superchargeMultiplier = state.superchargeMultiplier || 1;
      this.disableStripBelowPressure = state.disableStripBelowPressure === true;
      this.stripPressureThreshold = Math.max(0, Number(state.stripPressureThreshold) || 0);
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
    this.normalizeSuperchargeForFlags({ skipMaxClamp: true });
    this.markAssignmentsDirty();
    this.normalizeAssignments();
    this.normalizeAssignmentStep();

    this.isRunning = this.shouldKeepRunningOnTravel() && state.isRunning === true;
    this.isCompleted = false;
    this.setLastTickStats({});
    this.updateStatus(this.getProjectText('status.idle', null, 'Idle'));

    if (state.isActive) {
      this.isActive = true;
      this.startingDuration = state.startingDuration || this.getEffectiveDuration();
      this.remainingTime = state.remainingTime || this.startingDuration;
      this.syncExpansionContinuousState();
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
