const NUCLEAR_ALCHEMY_RECIPES = {
  graphite: {
    label: t('ui.projects.nuclearAlchemy.recipeLabels.graphite', {}, 'Carbon (Graphite)'),
    storageKey: 'graphite',
    complexity: 2
  },
  oxygen: {
    label: t('ui.projects.nuclearAlchemy.recipeLabels.oxygen', {}, 'Oxygen'),
    storageKey: 'oxygen',
    complexity: 3
  },
  inertGas: {
    label: t('ui.projects.nuclearAlchemy.recipeLabels.inertGas', {}, 'Nitrogen'),
    storageKey: 'inertGas',
    complexity: 4
  },
  silicon: {
    label: t('ui.projects.nuclearAlchemy.recipeLabels.silicon', {}, 'Silica'),
    storageKey: 'silicon',
    complexity: 6
  },
  metal: {
    label: t('ui.projects.nuclearAlchemy.recipeLabels.metal', {}, 'Metal'),
    storageKey: 'metal',
    complexity: 10
  }
};

const NUCLEAR_ALCHEMY_RECIPE_KEYS = [
  'graphite',
  'oxygen',
  'inertGas',
  'silicon',
  'metal'
];
const NUCLEAR_ALCHEMY_UNASSIGNED_KEY = 'idleUnassigned';
const NUCLEAR_ALCHEMY_ASSIGNMENT_STEP_MAX = 1_000_000_000_000_000_000_000_000_000_000n;

let NuclearAlchemyAssignmentTools = {};
try {
  NuclearAlchemyAssignmentTools = {
    createProjectAssignmentBase,
    normalizeProjectAssignmentInteger,
    serializeProjectAssignmentInteger,
    serializeProjectAssignments
  };
} catch (error) {}
try {
  NuclearAlchemyAssignmentTools = require('./ProjectAssignmentBase.js');
} catch (error) {}

function normalizeNuclearAlchemyInteger(value) {
  return NuclearAlchemyAssignmentTools.normalizeProjectAssignmentInteger(value);
}

function serializeNuclearAlchemyInteger(value) {
  return NuclearAlchemyAssignmentTools.serializeProjectAssignmentInteger(value);
}

function serializeNuclearAlchemyAssignments(assignments = {}) {
  return NuclearAlchemyAssignmentTools.serializeProjectAssignments(assignments);
}

function getNuclearAlchemyText(path, fallback, vars) {
  try {
    return t(path, vars, fallback);
  } catch (error) {
    return fallback;
  }
}

let NuclearAlchemyContinuousExpansionBase = null;
try {
  NuclearAlchemyContinuousExpansionBase = ContinuousExpansionProject;
} catch (error) {}
try {
  NuclearAlchemyContinuousExpansionBase = require('./ContinuousExpansionProject.js');
} catch (error) {}
try {
  NuclearAlchemyContinuousExpansionBase = NuclearAlchemyContinuousExpansionBase || TerraformingDurationProject;
} catch (error) {}

class NuclearAlchemyFurnaceProject extends NuclearAlchemyAssignmentTools.createProjectAssignmentBase(NuclearAlchemyContinuousExpansionBase) {
  constructor(config, name) {
    super(config, name);
    this.continuousThreshold = 1000;
    this.expansionProgress = 0;
    this.furnaceAssignments = {};
    this.assignmentStep = 1n;
    this.autoAssignFlags = {};
    this.autoAssignWeights = {};
    this.isRunning = false;
    this.statusText = 'Idle';
    this.shortfallReason = '';
    this.shortfallLastTick = false;
    this.costShortfallLastTick = false;
    this.expansionShortfallLastTick = false;
    this.lastExpansionRatePerSecond = 0;
    this.expansionRateLimitedLastTick = false;
    this.lastHydrogenPerSecond = 0;
    this.lastTotalOutputPerSecond = 0;
    this.lastOutputRatesByResource = {};
    this.operationPreRunThisTick = false;
    this.uiElements = null;
    this.managedAssignmentKeys = null;
    this.assignmentsDirty = true;
    this.assignmentsLastTotal = null;
    this.cachedAssignedTotal = 0n;
    this.initializeAssignmentState({
      assignmentStateKey: 'furnaceAssignments',
      assignmentStepMax: NUCLEAR_ALCHEMY_ASSIGNMENT_STEP_MAX
    });
  }

  resolveUIElements() {
    if (this.uiElements?.runCheckbox?.isConnected) {
      return this.uiElements;
    }
    const card = projectElements?.[this.name]?.projectItem;
    if (!card || !card.isConnected) {
      this.uiElements = null;
      return null;
    }
    const runCheckbox = card.querySelector('[data-nuclear-ui="runCheckbox"]');
    if (!runCheckbox) {
      this.uiElements = null;
      return null;
    }
    const rowElements = {};
    const rowNodes = card.querySelectorAll('[data-nuclear-assignment-key]');
    rowNodes.forEach((rowNode) => {
      const key = rowNode.dataset.nuclearAssignmentKey;
      rowElements[key] = {
        value: rowNode.querySelector('[data-nuclear-role="value"]'),
        zeroButton: rowNode.querySelector('[data-nuclear-role="zeroButton"]'),
        minusButton: rowNode.querySelector('[data-nuclear-role="minusButton"]'),
        plusButton: rowNode.querySelector('[data-nuclear-role="plusButton"]'),
        maxButton: rowNode.querySelector('[data-nuclear-role="maxButton"]'),
        autoAssign: rowNode.querySelector('[data-nuclear-role="autoAssign"]'),
        weightInput: rowNode.querySelector('[data-nuclear-role="weightInput"]'),
        rate: rowNode.querySelector('[data-nuclear-role="rate"]')
      };
    });
    this.uiElements = {
      totalValue: card.querySelector('[data-nuclear-ui="totalValue"]'),
      freeValue: card.querySelector('[data-nuclear-ui="freeValue"]'),
      hydrogenRateValue: card.querySelector('[data-nuclear-ui="hydrogenRateValue"]'),
      expansionRateValue: card.querySelector('[data-nuclear-ui="expansionRateValue"]'),
      statusValue: card.querySelector('[data-nuclear-ui="statusValue"]'),
      runCheckbox,
      note: card.querySelector('[data-nuclear-ui="note"]'),
      rowElements,
      stepDownButton: card.querySelector('[data-nuclear-ui="stepDownButton"]'),
      stepUpButton: card.querySelector('[data-nuclear-ui="stepUpButton"]')
    };
    return this.uiElements;
  }

  getBaseDuration() {
    return this.getDurationWithTerraformBonus(this.duration);
  }

  getEffectiveThroughputMultiplier() {
    let multiplier = 1;
    this.activeEffects.forEach((effect) => {
      if (effect?.type !== 'throughputMultiplier') {
        return;
      }
      const value = Number(effect.value);
      if (Number.isFinite(value) && value > 0) {
        multiplier += value;
      }
    });
    return multiplier > 0 ? multiplier : 1;
  }

  getAlchemyParameter() {
    const parsed = Number(this.attributes?.alchemyParameter);
    const baseParameter = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    return baseParameter * this.getEffectiveThroughputMultiplier();
  }

  getTotalFurnaces() {
    return normalizeNuclearAlchemyInteger(this.repeatCount);
  }

  getAssignmentKeys() {
    return NUCLEAR_ALCHEMY_RECIPE_KEYS;
  }

  getUnassignedAssignmentKey() {
    return NUCLEAR_ALCHEMY_UNASSIGNED_KEY;
  }

  getManagedAssignmentKeys() {
    if (!this.managedAssignmentKeys) {
      this.managedAssignmentKeys = [this.getUnassignedAssignmentKey()].concat(this.getAssignmentKeys());
    }
    return this.managedAssignmentKeys;
  }

  isUnassignedAssignmentKey(key) {
    return key === this.getUnassignedAssignmentKey();
  }

  getUnassignedAssignmentLabelText() {
    return getNuclearAlchemyText('ui.projects.common.idleUnassigned', 'Idle/Unassigned');
  }

  getRecipe(key) {
    const recipe = NUCLEAR_ALCHEMY_RECIPES[key];
    if (!recipe) {
      return recipe;
    }
    const localizedLabel = getNuclearAlchemyText(
      `ui.projects.nuclearAlchemy.recipeLabels.${key}`,
      recipe.label
    );
    return localizedLabel === recipe.label ? recipe : { ...recipe, label: localizedLabel };
  }

  showsComplexityColumn() {
    return true;
  }

  getAssignmentNameHeaderText() {
    return getNuclearAlchemyText('ui.projects.nuclearAlchemy.resource', 'Resource');
  }

  getComplexityHeaderText() {
    return getNuclearAlchemyText('ui.projects.common.complexity', 'Complexity');
  }

  getComplexityValueText(key) {
    if (this.isUnassignedAssignmentKey(key)) {
      return '';
    }
    return formatNumber(this.getRecipe(key).complexity, true);
  }

  getControlTitleText() {
    return getNuclearAlchemyText('ui.projects.nuclearAlchemy.title', 'Furnace Controls');
  }

  getTotalUnitsLabelText() {
    return getNuclearAlchemyText('ui.projects.nuclearAlchemy.totalFurnaces', 'Total Furnaces');
  }

  getRunToggleText() {
    return getNuclearAlchemyText('ui.projects.nuclearAlchemy.runFurnaces', 'Run furnaces');
  }

  getPrimaryRateLabelText() {
    return getNuclearAlchemyText('ui.projects.nuclearAlchemy.hydrogenUse', 'Hydrogen Use');
  }

  getPrimaryRateText() {
    return `${formatNumber(this.lastHydrogenPerSecond, true, 3)}/s`;
  }

  getExpansionRateText(rate) {
    return getNuclearAlchemyText(
      'ui.projects.nuclearAlchemy.expansionRate',
      `${formatNumber(rate, true, 3)} furnaces/s`,
      { value: formatNumber(rate, true, 3) }
    );
  }

  getExpansionRateSourceLabel() {
    return `${this.displayName} expansion`;
  }

  getOperationNoteText() {
    const parameter = formatNumber(this.getAlchemyParameter(), true, 3);
    return getNuclearAlchemyText(
      'ui.projects.nuclearAlchemy.operationNote',
      `Converts space-storage hydrogen into selected resources at (Assigned / Complexity) x ${parameter}/s.`,
      { value: parameter }
    );
  }

  getRecipeTooltipText(key) {
    return '';
  }

  getAssignmentTotalCapacity() {
    return this.getTotalFurnaces();
  }

  getAvailableFurnaces(skipNormalization = false, assignedTotal = null) {
    return this.getAvailableAssignments(skipNormalization, assignedTotal);
  }

  getSpaceStorageProject() {
    return projectManager?.projects?.spaceStorage || null;
  }

  getSpaceStoragePendingDelta(accumulatedChanges, resourceKey) {
    return accumulatedChanges?.spaceStorage?.[resourceKey] || 0;
  }

  getStoredResourceValueForTick(storage, resourceKey, accumulatedChanges = null) {
    const pending = this.getSpaceStoragePendingDelta(accumulatedChanges, resourceKey);
    return Math.max(0, storage.getStoredResourceValue(resourceKey) + pending);
  }

  getAvailableStoredResourceForTick(storage, resourceKey, accumulatedChanges = null) {
    const pending = this.getSpaceStoragePendingDelta(accumulatedChanges, resourceKey);
    return Math.max(0, storage.getAvailableStoredResource(resourceKey) + pending);
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

  setRunning(enabled) {
    const next = enabled === true;
    if (this.isRunning === next) {
      return;
    }
    this.isRunning = next;
    if (!next) {
      this.setLastRunStats(0, {});
      this.updateStatus(getNuclearAlchemyText('ui.projects.nuclearAlchemy.status.runDisabled', 'Run disabled'));
    }
    this.updateUI();
  }

  setLastRunStats(hydrogenRate = 0, outputRates = {}) {
    this.lastHydrogenPerSecond = hydrogenRate;
    this.lastOutputRatesByResource = {};
    this.lastTotalOutputPerSecond = 0;
    this.getAssignmentKeys().forEach((key) => {
      const value = outputRates[key] || 0;
      this.lastOutputRatesByResource[key] = value;
      this.lastTotalOutputPerSecond += value;
    });
  }

  updateStatus(text) {
    this.statusText = text || getNuclearAlchemyText('ui.projects.nuclearAlchemy.status.idle', 'Idle');
  }

  shouldOperate() {
    if (this.isPermanentlyDisabled()) {
      return false;
    }
    return this.isRunning && this.repeatCount > 0;
  }

  getOperationProductivityForTick(defaultProductivity = 1, deltaTime = 1000) {
    return Math.max(0, Math.min(1, defaultProductivity));
  }

  getOperationShortfallStatus(productivity = 1) {
    const hydrogenRatio = Math.max(
      0,
      Math.min(1, Number(resources?.spaceStorage?.hydrogen?.availabilityRatio) || 0)
    );
    if (hydrogenRatio <= 0) {
      return getNuclearAlchemyText('ui.projects.nuclearAlchemy.status.noHydrogen', 'No hydrogen in space storage');
    }
    if (hydrogenRatio < 1 || productivity < 1) {
      return getNuclearAlchemyText('ui.projects.nuclearAlchemy.status.insufficientHydrogen', 'Insufficient hydrogen in space storage');
    }
    return getNuclearAlchemyText('ui.projects.nuclearAlchemy.status.idle', 'Idle');
  }

  buildConversionEntries(seconds, productivity = 1) {
    const storage = this.getSpaceStorageProject();
    if (!storage) {
      this.shortfallReason = getNuclearAlchemyText('ui.projects.nuclearAlchemy.status.buildSpaceStorage', 'Build space storage');
      return [];
    }
    const parameter = this.getAlchemyParameter();
    const entries = [];
    this.getAssignmentKeys().forEach((key) => {
      const recipe = this.getRecipe(key);
      const assigned = Number(this.furnaceAssignments[key] || 0n);
      if (!(assigned > 0) || !recipe) {
        return;
      }
      const rate = (assigned / recipe.complexity) * parameter;
      if (!(rate > 0)) {
        return;
      }
      const desired = rate * seconds * productivity;
      entries.push({
        key,
        storageKey: recipe.storageKey,
        desired
      });
    });
    return entries;
  }

  applyExpansionCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    this.costShortfallLastTick = false;
    this.expansionShortfallLastTick = false;
    this.lastExpansionRatePerSecond = 0;
    this.expansionRateLimitedLastTick = false;
    if (this.isPermanentlyDisabled()) {
      this.isActive = false;
      return;
    }
    if (!this.autoStart) {
      return;
    }
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
    this.lastExpansionRatePerSecond = tick.seconds > 0 ? result.progress / tick.seconds : 0;
    this.expansionRateLimitedLastTick = result.resourceShortfall;
    this.expansionShortfallLastTick = result.shortfall;
    this.costShortfallLastTick = this.expansionShortfallLastTick;
  }

  applyOperationCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (!this.shouldOperate()) {
      this.setLastRunStats(0, {});
      if (!this.repeatCount) {
        this.updateStatus(getNuclearAlchemyText('ui.projects.nuclearAlchemy.status.completeAtLeastOne', 'Complete at least one furnace'));
      } else if (!this.isRunning) {
        this.updateStatus(getNuclearAlchemyText('ui.projects.nuclearAlchemy.status.runDisabled', 'Run disabled'));
      }
      this.shortfallLastTick = false;
      return;
    }

    const seconds = deltaTime / 1000;
    if (!(seconds > 0)) {
      this.setLastRunStats(0, {});
      this.updateStatus(getNuclearAlchemyText('ui.projects.nuclearAlchemy.status.idle', 'Idle'));
      this.shortfallLastTick = false;
      return;
    }

    this.normalizeAssignments();
    const storage = this.getSpaceStorageProject();
    if (!storage) {
      this.setLastRunStats(0, {});
      this.updateStatus(getNuclearAlchemyText('ui.projects.nuclearAlchemy.status.buildSpaceStorage', 'Build space storage'));
      this.shortfallLastTick = true;
      return;
    }

    const entries = this.buildConversionEntries(seconds, productivity);
    if (entries.length === 0) {
      this.setLastRunStats(0, {});
      this.updateStatus(getNuclearAlchemyText('ui.projects.nuclearAlchemy.status.noAssignments', 'No assignments'));
      this.shortfallLastTick = this.expansionShortfallLastTick || true;
      return;
    }

    let hydrogenRequested = 0;
    entries.forEach((entry) => {
      hydrogenRequested += entry.desired || 0;
    });
    if (!(hydrogenRequested > 0)) {
      this.setLastRunStats(0, {});
      const status = this.getOperationShortfallStatus(productivity);
      this.updateStatus(status);
      this.shortfallLastTick = status !== 'Idle';
      return;
    }

    const outputDisplayAmounts = {};
    let hydrogenDisplaySpent = 0;

    entries.forEach((entry) => {
      const requested = entry.desired || 0;
      outputDisplayAmounts[entry.key] = 0;
      if (!(requested > 0)) {
        return;
      }
      this.applySpaceStorageDeltaForTick('hydrogen', -requested, accumulatedChanges);
      outputDisplayAmounts[entry.key] = requested;
      hydrogenDisplaySpent += requested;
      this.applySpaceStorageDeltaForTick(entry.storageKey, requested, accumulatedChanges);
    });

    if (!accumulatedChanges) {
      storage.reconcileUsedStorage();
      updateSpaceStorageUI(storage);
    }

    if (!(hydrogenDisplaySpent > 0)) {
      this.setLastRunStats(0, {});
      this.updateStatus(getNuclearAlchemyText('ui.projects.nuclearAlchemy.status.idle', 'Idle'));
      this.shortfallLastTick = false;
      return;
    }

    const outputRates = {};
    entries.forEach((entry) => {
      outputRates[entry.key] = (outputDisplayAmounts[entry.key] || 0) / seconds;
      if (outputRates[entry.key] > 0) {
        resources?.spaceStorage?.[entry.storageKey]?.modifyRate?.(
          outputRates[entry.key],
          this.displayName,
          'project'
        );
      }
    });

    const hydrogenRate = hydrogenDisplaySpent / seconds;
    resources?.spaceStorage?.hydrogen?.modifyRate?.(
      -hydrogenRate,
      this.displayName,
      'project'
    );

    this.setLastRunStats(hydrogenRate, outputRates);
    if (hydrogenDisplaySpent > 0) {
      this.updateStatus(getNuclearAlchemyText('ui.projects.nuclearAlchemy.status.running', 'Running'));
    } else {
      this.updateStatus(getNuclearAlchemyText('ui.projects.nuclearAlchemy.status.idle', 'Idle'));
    }
    this.shortfallLastTick = false;
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
      const cost = this.getScaledCost();

      let progress = requestedProgress;
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
    this.normalizeAssignments();
    const storage = this.getSpaceStorageProject();
    if (!storage) {
      return totals;
    }
    const entries = this.buildConversionEntries(seconds, productivity);
    if (entries.length === 0) {
      return totals;
    }
    const outputDisplayAmounts = {};
    let hydrogenDisplaySpent = 0;

    entries.forEach((entry) => {
      const requested = entry.desired || 0;
      outputDisplayAmounts[entry.key] = requested;
      hydrogenDisplaySpent += requested;
    });

    if (!(hydrogenDisplaySpent > 0)) {
      return totals;
    }

    if (applyRates) {
      const hydrogenRate = hydrogenDisplaySpent / seconds;
      resources?.spaceStorage?.hydrogen?.modifyRate?.(
        -hydrogenRate,
        this.displayName,
        'project'
      );
      entries.forEach((entry) => {
        const outputRate = (outputDisplayAmounts[entry.key] || 0) / seconds;
        if (outputRate > 0) {
          resources?.spaceStorage?.[entry.storageKey]?.modifyRate?.(
            outputRate,
            this.displayName,
            'project'
          );
        }
      });
    }

    totals.cost.spaceStorage ||= {};
    totals.cost.spaceStorage.hydrogen =
      (totals.cost.spaceStorage.hydrogen || 0) + hydrogenDisplaySpent;

    totals.gain.spaceStorage ||= {};
    entries.forEach((entry) => {
      const amount = outputDisplayAmounts[entry.key] || 0;
      if (amount > 0) {
        totals.gain.spaceStorage[entry.storageKey] =
          (totals.gain.spaceStorage[entry.storageKey] || 0) + amount;
      }
    });

    return totals;
  }

  estimateExpansionCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
    if (this.isPermanentlyDisabled()) {
      return { cost: {}, gain: {} };
    }
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

    this.normalizeAssignments();
    const entries = this.buildConversionEntries(seconds, 1);
    if (entries.length === 0) {
      return totals;
    }

    let desiredHydrogen = 0;
    entries.forEach((entry) => {
      desiredHydrogen += entry.desired || 0;
    });
    if (!(desiredHydrogen > 0)) {
      return totals;
    }

    totals.cost.spaceStorage = {
      hydrogen: desiredHydrogen
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

  start(resources) {
    this.expansionProgress = 0;
    this.expansionShortfallLastTick = false;
    return this.startContinuousExpansion(resources);
  }

  renderUI(container) {
    const card = document.createElement('div');
    card.classList.add('info-card', 'nuclear-alchemy-card');

    const header = document.createElement('div');
    header.classList.add('card-header');
    const title = document.createElement('span');
    title.classList.add('card-title');
    title.textContent = this.getControlTitleText();
    header.appendChild(title);
    card.appendChild(header);

    const body = document.createElement('div');
    body.classList.add('card-body');

    const summaryGrid = document.createElement('div');
    summaryGrid.classList.add('stats-grid', 'three-col', 'project-summary-grid');

    const createStatBox = (labelText) => {
      const box = document.createElement('div');
      box.classList.add('stat-item', 'project-summary-box');
      const label = document.createElement('span');
      label.classList.add('stat-label');
      label.textContent = labelText;
      const value = document.createElement('span');
      value.classList.add('stat-value');
      box.append(label, value);
      summaryGrid.appendChild(box);
      return value;
    };

    const totalValue = createStatBox(this.getTotalUnitsLabelText());
    totalValue.dataset.nuclearUi = 'totalValue';
    const freeValue = createStatBox('Unassigned');
    freeValue.dataset.nuclearUi = 'freeValue';
    const expansionRateValue = createStatBox('Expansion');
    expansionRateValue.dataset.nuclearUi = 'expansionRateValue';
    body.appendChild(summaryGrid);

    const controlsGrid = document.createElement('div');
    controlsGrid.classList.add('stats-grid', 'three-col', 'nuclear-alchemy-controls-grid');

    const runField = document.createElement('div');
    runField.classList.add('stat-item');
    const runCheckbox = document.createElement('input');
    runCheckbox.type = 'checkbox';
    runCheckbox.dataset.nuclearUi = 'runCheckbox';
    runCheckbox.id = `${this.name}-run`;
    const runLabel = document.createElement('label');
    runLabel.htmlFor = runCheckbox.id;
    runLabel.textContent = this.getRunToggleText();
    runField.append(runCheckbox, runLabel);
    controlsGrid.appendChild(runField);

    const statusField = document.createElement('div');
    statusField.classList.add('stat-item');
    const statusLabel = document.createElement('span');
    statusLabel.classList.add('stat-label');
    statusLabel.textContent = getNuclearAlchemyText('ui.projects.common.status', 'Status');
    const statusValue = document.createElement('span');
    statusValue.classList.add('stat-value');
    statusValue.dataset.nuclearUi = 'statusValue';
    statusField.append(statusLabel, statusValue);
    controlsGrid.appendChild(statusField);

    const hydrogenField = document.createElement('div');
    hydrogenField.classList.add('stat-item');
    const hydrogenLabel = document.createElement('span');
    hydrogenLabel.classList.add('stat-label');
    hydrogenLabel.textContent = this.getPrimaryRateLabelText();
    const hydrogenRateValue = document.createElement('span');
    hydrogenRateValue.classList.add('stat-value');
    hydrogenRateValue.dataset.nuclearUi = 'hydrogenRateValue';
    hydrogenField.append(hydrogenLabel, hydrogenRateValue);
    controlsGrid.appendChild(hydrogenField);
    body.appendChild(controlsGrid);

    const assignmentGrid = document.createElement('div');
    assignmentGrid.classList.add('hephaestus-assignment-list', 'nuclear-alchemy-assignment-list');

    const stepButtons = this.createAssignmentStepButtons((key, fallback) => {
      const paths = {
        divideTen: 'ui.projects.common.divideTen',
        timesTen: 'ui.projects.common.timesTen'
      };
      return getNuclearAlchemyText(paths[key], fallback);
    });
    const stepDownButton = stepButtons.stepDownButton;
    stepDownButton.dataset.nuclearUi = 'stepDownButton';
    const stepUpButton = stepButtons.stepUpButton;
    stepUpButton.dataset.nuclearUi = 'stepUpButton';

    const headerRow = document.createElement('div');
    headerRow.classList.add('hephaestus-assignment-row', 'hephaestus-assignment-header-row', 'nuclear-alchemy-assignment-row');
    if (!this.showsComplexityColumn()) {
      headerRow.classList.add('nuclear-alchemy-assignment-row-no-complexity');
    }
    const headerName = document.createElement('span');
    headerName.classList.add('stat-label');
    headerName.textContent = this.getAssignmentNameHeaderText();
    const headerComplexity = document.createElement('span');
    headerComplexity.classList.add('stat-label');
    headerComplexity.textContent = this.getComplexityHeaderText();
    const headerAssigned = document.createElement('span');
    headerAssigned.classList.add('stat-label');
    headerAssigned.textContent = getNuclearAlchemyText('ui.projects.common.assigned', 'Assigned');
    const headerControls = document.createElement('div');
    headerControls.classList.add('hephaestus-assignment-controls');
    const headerButtons = document.createElement('div');
    headerButtons.classList.add('hephaestus-control-buttons', 'hephaestus-step-header');
    headerButtons.append(stepDownButton, stepUpButton);
    const weightHeader = document.createElement('span');
    weightHeader.classList.add('stat-label', 'hephaestus-weight-header');
    weightHeader.textContent = getNuclearAlchemyText('ui.projects.common.weight', 'Weight');
    headerControls.append(headerButtons, weightHeader);
    const headerRate = document.createElement('div');
    headerRate.classList.add('stat-label', 'nuclear-alchemy-rate-cell');
    headerRate.textContent = getNuclearAlchemyText('ui.projects.common.rate', 'Rate');
    if (!this.showsComplexityColumn()) {
      headerComplexity.style.display = 'none';
    }
    headerRow.append(headerName, headerComplexity, headerAssigned, headerControls, headerRate);
    assignmentGrid.appendChild(headerRow);

    const headerDivider = document.createElement('div');
    headerDivider.classList.add('hephaestus-header-divider');
    assignmentGrid.appendChild(headerDivider);

    const rowElements = {};
    this.getManagedAssignmentKeys().forEach((key) => {
      const isUnassigned = this.isUnassignedAssignmentKey(key);
      const recipe = isUnassigned ? null : this.getRecipe(key);
      const row = document.createElement('div');
      row.dataset.nuclearAssignmentKey = key;
      row.classList.add('hephaestus-assignment-row', 'nuclear-alchemy-assignment-row');
      if (isUnassigned) {
        row.classList.add('assignment-divider-row');
      }
      if (!this.showsComplexityColumn()) {
        row.classList.add('nuclear-alchemy-assignment-row-no-complexity');
      }

      const nameEl = document.createElement('span');
      nameEl.classList.add('stat-label');
      nameEl.textContent = isUnassigned ? this.getUnassignedAssignmentLabelText() : recipe.label;
      const tooltipText = isUnassigned ? '' : this.getRecipeTooltipText(key);
      if (tooltipText) {
        const icon = document.createElement('span');
        icon.classList.add('info-tooltip-icon');
        icon.innerHTML = '&#9432;';
        attachDynamicInfoTooltip(icon, tooltipText);
        nameEl.appendChild(document.createTextNode(' '));
        nameEl.appendChild(icon);
      }

      const complexityEl = document.createElement('span');
      complexityEl.classList.add('stat-value');
      complexityEl.textContent = this.getComplexityValueText(key);
      if (!this.showsComplexityColumn()) {
        complexityEl.style.display = 'none';
      }

      const amountEl = document.createElement('span');
      amountEl.classList.add('stat-value');
      amountEl.dataset.nuclearRole = 'value';

      const assignmentControls = this.createAssignmentControls(key, {
        rolePrefix: 'nuclear',
        textProvider: (controlKey, fallback) => {
          const paths = {
            zero: 'ui.projects.common.zero',
            max: 'ui.projects.common.max',
            auto: 'ui.projects.common.auto'
          };
          return getNuclearAlchemyText(paths[controlKey], fallback);
        }
      });

      const rateEl = document.createElement('div');
      rateEl.classList.add('stat-value', 'nuclear-alchemy-rate-cell');
      rateEl.dataset.nuclearRole = 'rate';

      row.append(nameEl, complexityEl, amountEl, assignmentControls.controls, rateEl);
      assignmentGrid.appendChild(row);

      rowElements[key] = {
        complexity: complexityEl,
        value: amountEl,
        zeroButton: assignmentControls.zeroButton,
        minusButton: assignmentControls.minusButton,
        plusButton: assignmentControls.plusButton,
        maxButton: assignmentControls.maxButton,
        autoAssign: assignmentControls.autoAssign,
        weightInput: assignmentControls.weightInput,
        rate: rateEl
      };
    });

    body.appendChild(assignmentGrid);

    const note = document.createElement('p');
    note.classList.add('project-description');
    note.dataset.nuclearUi = 'note';
    note.textContent = '';
    body.appendChild(note);

    runCheckbox.addEventListener('change', (event) => {
      this.setRunning(event.target.checked);
    });

    card.appendChild(body);
    container.appendChild(card);

    this.uiElements = {
      totalValue,
      freeValue,
      hydrogenRateValue,
      expansionRateValue,
      statusValue,
      runCheckbox,
      note,
      rowElements,
      stepDownButton,
      stepUpButton
    };

    this.updateUI();
  }

  updateUI() {
    const elements = this.resolveUIElements();
    if (!elements) {
      return;
    }

    this.normalizeAssignments();
    const total = this.getTotalFurnaces();
    const assigned = this.getAssignedTotal();
    const available = total > assigned ? (total - assigned) : 0n;
    const step = this.assignmentStep;

    elements.totalValue.textContent = formatNumber(total, true, 2);
    elements.freeValue.textContent = formatNumber(available, true, 2);
    elements.hydrogenRateValue.textContent = this.getPrimaryRateText();
    const expansionRate = this.isActive ? (1000 / this.getEffectiveDuration()) : 0;
    const limitedExpansion = this.expansionRateLimitedLastTick && this.lastExpansionRatePerSecond >= 0;
    const displayedExpansionRate = limitedExpansion ? this.lastExpansionRatePerSecond : expansionRate;
    elements.expansionRateValue.style.color = limitedExpansion ? 'orange' : '';
    elements.expansionRateValue.textContent = this.getExpansionRateText(displayedExpansionRate);
    elements.statusValue.textContent = this.statusText || getNuclearAlchemyText('ui.projects.nuclearAlchemy.status.idle', 'Idle');
    elements.runCheckbox.checked = this.isRunning;
    elements.runCheckbox.disabled = total <= 0;
    if (elements.note) {
      elements.note.textContent = this.getOperationNoteText();
    }

    this.getManagedAssignmentKeys().forEach((key) => {
      const row = elements.rowElements[key];
      if (!row) {
        return;
      }
      const storedCurrent = this.getStoredAssignmentAmount(key);
      const displayedCurrent = this.getDisplayedAssignmentAmount(key);
      const maxForKey = this.getAssignmentMaxTarget(key);

      row.value.textContent = formatNumber(displayedCurrent, true, 2);
      this.updateAssignmentControls(row, key, total, step);
      row.rate.textContent = this.isUnassignedAssignmentKey(key)
        ? ''
        : `${formatNumber(this.lastOutputRatesByResource[key] || 0, true, 3)}/s`;
    });
  }

  saveAutomationSettings() {
    return {
      ...super.saveAutomationSettings(),
      isRunning: this.isRunning === true,
      ...this.saveAssignmentSettings()
    };
  }

  loadAutomationSettings(settings = {}, options = {}) {
    super.loadAutomationSettings(settings);
    if (Object.prototype.hasOwnProperty.call(settings, 'isRunning')) {
      this.isRunning = settings.isRunning === true;
    }
    this.loadAssignmentSettings(settings, options);
  }

  saveState() {
    return {
      ...super.saveState(),
      isRunning: this.isRunning,
      expansionProgress: this.expansionProgress,
      ...this.saveAssignmentSettings()
    };
  }

  loadState(state = {}) {
    super.loadState(state);
    this.isRunning = state.isRunning === true;
    this.expansionProgress = state.expansionProgress || 0;
    this.loadAssignmentSettings(state);
    if (!this.isRunning) {
      this.setLastRunStats(0, {});
      this.updateStatus(getNuclearAlchemyText('ui.projects.nuclearAlchemy.status.idle', 'Idle'));
    }
  }

  saveTravelState() {
    const state = {
      repeatCount: this.repeatCount,
      expansionProgress: this.expansionProgress,
      isRunning: this.isRunning,
      ...this.saveAssignmentSettings()
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
    this.isRunning = state.isRunning === true;
    this.loadAssignmentSettings(state);
    this.isCompleted = false;
    this.setLastRunStats(0, {});
    this.updateStatus(
      this.isRunning
        ? getNuclearAlchemyText('ui.projects.nuclearAlchemy.status.idle', 'Idle')
        : getNuclearAlchemyText('ui.projects.nuclearAlchemy.status.runDisabled', 'Run disabled')
    );
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
  module.exports = NuclearAlchemyFurnaceProject;
} else if (typeof window !== 'undefined') {
  window.NuclearAlchemyFurnaceProject = NuclearAlchemyFurnaceProject;
}
