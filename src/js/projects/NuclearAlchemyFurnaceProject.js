const NUCLEAR_ALCHEMY_RECIPES = {
  graphite: {
    label: 'Carbon (Graphite)',
    storageKey: 'graphite',
    complexity: 2
  },
  oxygen: {
    label: 'Oxygen',
    storageKey: 'oxygen',
    complexity: 3
  },
  inertGas: {
    label: 'Nitrogen',
    storageKey: 'inertGas',
    complexity: 4
  },
  silicon: {
    label: 'Silica',
    storageKey: 'silicon',
    complexity: 6
  },
  metal: {
    label: 'Metal',
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

class NuclearAlchemyFurnaceProject extends NuclearAlchemyContinuousExpansionBase {
  constructor(config, name) {
    super(config, name);
    this.continuousThreshold = 1000;
    this.expansionProgress = 0;
    this.furnaceAssignments = {};
    this.assignmentStep = 1;
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
  }

  getBaseDuration() {
    return this.getDurationWithTerraformBonus(this.duration);
  }

  getAlchemyParameter() {
    const parsed = Number(this.attributes?.alchemyParameter);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return 1;
  }

  getTotalFurnaces() {
    return this.repeatCount;
  }

  getAssignmentKeys() {
    return NUCLEAR_ALCHEMY_RECIPE_KEYS.slice();
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

  normalizeAssignments() {
    const keys = this.getAssignmentKeys();
    const keySet = new Set(keys);
    const total = this.getTotalFurnaces();

    keys.forEach((key) => {
      this.furnaceAssignments[key] = Math.max(0, Math.floor(this.furnaceAssignments[key] || 0));
      this.autoAssignFlags[key] = this.autoAssignFlags[key] === true;
      const weight = Number(this.autoAssignWeights[key]);
      this.autoAssignWeights[key] = Number.isFinite(weight) && weight > 0 ? weight : 1;
    });

    Object.keys(this.furnaceAssignments).forEach((key) => {
      if (!keySet.has(key)) {
        this.furnaceAssignments[key] = 0;
      }
    });

    let usedManual = 0;
    keys.forEach((key) => {
      if (!this.autoAssignFlags[key]) {
        usedManual += this.furnaceAssignments[key];
      }
    });

    const autoKeys = keys.filter((key) => this.autoAssignFlags[key]);
    const remaining = Math.max(0, total - usedManual);

    if (autoKeys.length > 0) {
      let totalWeight = 0;
      autoKeys.forEach((key) => {
        totalWeight += this.autoAssignWeights[key];
      });

      if (totalWeight <= 0) {
        autoKeys.forEach((key) => {
          this.furnaceAssignments[key] = 0;
        });
      } else {
        const remainders = [];
        let assigned = 0;
        autoKeys.forEach((key) => {
          const exact = remaining * (this.autoAssignWeights[key] / totalWeight);
          const floorValue = Math.floor(exact);
          this.furnaceAssignments[key] = floorValue;
          assigned += floorValue;
          remainders.push({ key, value: exact - floorValue });
        });
        let leftover = remaining - assigned;
        remainders.sort((left, right) => right.value - left.value);
        for (let i = 0; i < remainders.length && leftover > 0; i += 1) {
          this.furnaceAssignments[remainders[i].key] += 1;
          leftover -= 1;
        }
      }
    }

    let assignedTotal = keys.reduce((sum, key) => sum + (this.furnaceAssignments[key] || 0), 0);
    if (assignedTotal > total) {
      let excess = assignedTotal - total;
      for (let i = keys.length - 1; i >= 0 && excess > 0; i -= 1) {
        const key = keys[i];
        const current = this.furnaceAssignments[key] || 0;
        const reduction = Math.min(current, excess);
        this.furnaceAssignments[key] = current - reduction;
        excess -= reduction;
      }
      assignedTotal = keys.reduce((sum, key) => sum + (this.furnaceAssignments[key] || 0), 0);
    }
  }

  getAssignedTotal() {
    this.normalizeAssignments();
    return this.getAssignmentKeys().reduce((sum, key) => sum + (this.furnaceAssignments[key] || 0), 0);
  }

  getAvailableFurnaces() {
    return Math.max(0, this.getTotalFurnaces() - this.getAssignedTotal());
  }

  setAssignmentStep(step) {
    const next = Math.min(1_000_000_000, Math.max(1, Math.round(step)));
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
    const total = this.getTotalFurnaces();
    const current = this.furnaceAssignments[key] || 0;
    const usedOther = keys.reduce((sum, otherKey) => {
      if (otherKey === key) return sum;
      if (this.autoAssignFlags[otherKey]) return sum;
      return sum + (this.furnaceAssignments[otherKey] || 0);
    }, 0);
    const maxForKey = Math.max(0, total - usedOther);
    const next = Math.min(maxForKey, Math.max(0, current + delta));
    this.furnaceAssignments[key] = next;
    this.normalizeAssignments();
    this.updateUI();
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
      const assigned = this.furnaceAssignments[key] || 0;
      if (assigned <= 0 || !recipe) {
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
    const freeValue = createStatBox('Unassigned');
    const expansionRateValue = createStatBox('Expansion');
    body.appendChild(summaryGrid);

    const controlsGrid = document.createElement('div');
    controlsGrid.classList.add('stats-grid', 'three-col', 'nuclear-alchemy-controls-grid');

    const runField = document.createElement('div');
    runField.classList.add('stat-item');
    const runCheckbox = document.createElement('input');
    runCheckbox.type = 'checkbox';
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
    statusField.append(statusLabel, statusValue);
    controlsGrid.appendChild(statusField);

    const hydrogenField = document.createElement('div');
    hydrogenField.classList.add('stat-item');
    const hydrogenLabel = document.createElement('span');
    hydrogenLabel.classList.add('stat-label');
    hydrogenLabel.textContent = this.getPrimaryRateLabelText();
    const hydrogenRateValue = document.createElement('span');
    hydrogenRateValue.classList.add('stat-value');
    hydrogenField.append(hydrogenLabel, hydrogenRateValue);
    controlsGrid.appendChild(hydrogenField);
    body.appendChild(controlsGrid);

    const assignmentGrid = document.createElement('div');
    assignmentGrid.classList.add('hephaestus-assignment-list', 'nuclear-alchemy-assignment-list');

    const stepDownButton = document.createElement('button');
    stepDownButton.textContent = getNuclearAlchemyText('ui.projects.common.divideTen', '/10');
    stepDownButton.addEventListener('click', () => {
      this.setAssignmentStep(this.assignmentStep / 10);
      this.updateUI();
    });
    const stepUpButton = document.createElement('button');
    stepUpButton.textContent = getNuclearAlchemyText('ui.projects.common.timesTen', 'x10');
    stepUpButton.addEventListener('click', () => {
      this.setAssignmentStep(this.assignmentStep * 10);
      this.updateUI();
    });

    const headerRow = document.createElement('div');
    headerRow.classList.add('hephaestus-assignment-row', 'hephaestus-assignment-header-row', 'nuclear-alchemy-assignment-row');
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
    this.getAssignmentKeys().forEach((key) => {
      const recipe = this.getRecipe(key);
      const row = document.createElement('div');
      row.classList.add('hephaestus-assignment-row', 'nuclear-alchemy-assignment-row');

      const nameEl = document.createElement('span');
      nameEl.classList.add('stat-label');
      nameEl.textContent = recipe.label;

      const complexityEl = document.createElement('span');
      complexityEl.classList.add('stat-value');
      complexityEl.textContent = this.getComplexityValueText(key);
      if (!this.showsComplexityColumn()) {
        complexityEl.style.display = 'none';
      }

      const amountEl = document.createElement('span');
      amountEl.classList.add('stat-value');

      const zeroButton = document.createElement('button');
      zeroButton.textContent = getNuclearAlchemyText('ui.projects.common.zero', '0');
      zeroButton.addEventListener('click', () => {
        if (this.autoAssignFlags[key]) {
          return;
        }
        this.furnaceAssignments[key] = 0;
        this.normalizeAssignments();
        this.updateUI();
      });

      const minusButton = document.createElement('button');
      minusButton.addEventListener('click', () => this.adjustAssignment(key, -this.assignmentStep));

      const plusButton = document.createElement('button');
      plusButton.addEventListener('click', () => this.adjustAssignment(key, this.assignmentStep));

      const maxButton = document.createElement('button');
      maxButton.textContent = getNuclearAlchemyText('ui.projects.common.max', 'Max');
      maxButton.addEventListener('click', () => {
        if (this.autoAssignFlags[key]) {
          return;
        }
        this.normalizeAssignments();
        const keys = this.getAssignmentKeys();
        const total = this.getTotalFurnaces();
        const usedOther = keys.reduce((sum, otherKey) => {
          if (otherKey === key) return sum;
          if (this.autoAssignFlags[otherKey]) return sum;
          return sum + (this.furnaceAssignments[otherKey] || 0);
        }, 0);
        this.furnaceAssignments[key] = Math.max(0, total - usedOther);
        this.normalizeAssignments();
        this.updateUI();
      });

      const autoAssignContainer = document.createElement('div');
      autoAssignContainer.classList.add('hephaestus-auto-assign');
      const autoAssign = document.createElement('input');
      autoAssign.type = 'checkbox';
      autoAssign.addEventListener('change', () => {
        this.setAutoAssignTarget(key, autoAssign.checked);
      });
      const autoAssignLabel = document.createElement('span');
      autoAssignLabel.textContent = getNuclearAlchemyText('ui.projects.common.auto', 'Auto');
      autoAssignLabel.addEventListener('click', () => {
        autoAssign.checked = !autoAssign.checked;
        this.setAutoAssignTarget(key, autoAssign.checked);
      });
      autoAssignContainer.append(autoAssign, autoAssignLabel);

      const weightInput = document.createElement('input');
      weightInput.type = 'number';
      weightInput.min = '0';
      weightInput.step = '0.1';
      weightInput.value = String(this.autoAssignWeights[key] || 1);
      weightInput.classList.add('hephaestus-weight-input');
      weightInput.addEventListener('input', () => {
        const value = Number(weightInput.value);
        this.autoAssignWeights[key] = Number.isFinite(value) && value > 0 ? value : 0;
        this.normalizeAssignments();
        this.updateUI();
      });

      const controls = document.createElement('div');
      controls.classList.add('hephaestus-assignment-controls');
      const controlButtons = document.createElement('div');
      controlButtons.classList.add('hephaestus-control-buttons');
      controlButtons.append(zeroButton, minusButton, plusButton, maxButton, autoAssignContainer);
      controls.append(controlButtons, weightInput);

      const rateEl = document.createElement('div');
      rateEl.classList.add('stat-value', 'nuclear-alchemy-rate-cell');

      row.append(nameEl, complexityEl, amountEl, controls, rateEl);
      assignmentGrid.appendChild(row);

      rowElements[key] = {
        complexity: complexityEl,
        value: amountEl,
        zeroButton,
        minusButton,
        plusButton,
        maxButton,
        autoAssign,
        weightInput,
        rate: rateEl
      };
    });

    body.appendChild(assignmentGrid);

    const note = document.createElement('p');
    note.classList.add('project-description');
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
    const elements = this.uiElements;
    if (!elements) {
      return;
    }

    this.normalizeAssignments();
    const total = this.getTotalFurnaces();
    const assigned = this.getAssignedTotal();
    const available = Math.max(0, total - assigned);
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

    this.getAssignmentKeys().forEach((key) => {
      const row = elements.rowElements[key];
      if (!row) {
        return;
      }
      const current = this.furnaceAssignments[key] || 0;
      const keys = this.getAssignmentKeys();
      const usedOther = keys.reduce((sum, otherKey) => {
        if (otherKey === key) return sum;
        if (this.autoAssignFlags[otherKey]) return sum;
        return sum + (this.furnaceAssignments[otherKey] || 0);
      }, 0);
      const maxForKey = Math.max(0, total - usedOther);

      row.value.textContent = formatNumber(current, true);
      row.minusButton.textContent = `-${formatNumber(step, true)}`;
      row.plusButton.textContent = `+${formatNumber(step, true)}`;
      row.autoAssign.checked = this.autoAssignFlags[key] === true;
      row.autoAssign.disabled = total <= 0;
      if (document.activeElement !== row.weightInput) {
        row.weightInput.value = String(this.autoAssignWeights[key] || 1);
      }
      row.weightInput.disabled = total <= 0;
      row.zeroButton.disabled = current <= 0 || this.autoAssignFlags[key];
      row.maxButton.disabled = current >= maxForKey || total <= 0 || this.autoAssignFlags[key];
      row.minusButton.disabled = current <= 0 || this.autoAssignFlags[key];
      row.plusButton.disabled = current >= maxForKey || total <= 0 || this.autoAssignFlags[key];
      row.rate.textContent = `${formatNumber(this.lastOutputRatesByResource[key] || 0, true, 3)}/s`;
    });
  }

  saveAutomationSettings() {
    return {
      ...super.saveAutomationSettings(),
      isRunning: this.isRunning === true,
      furnaceAssignments: { ...this.furnaceAssignments },
      assignmentStep: this.assignmentStep,
      autoAssignFlags: { ...this.autoAssignFlags },
      autoAssignWeights: { ...this.autoAssignWeights }
    };
  }

  loadAutomationSettings(settings = {}) {
    super.loadAutomationSettings(settings);
    if (Object.prototype.hasOwnProperty.call(settings, 'isRunning')) {
      this.isRunning = settings.isRunning === true;
    }
    if (Object.prototype.hasOwnProperty.call(settings, 'furnaceAssignments')) {
      this.furnaceAssignments = { ...(settings.furnaceAssignments || {}) };
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
    this.normalizeAssignments();
  }

  saveState() {
    return {
      ...super.saveState(),
      isRunning: this.isRunning,
      expansionProgress: this.expansionProgress,
      furnaceAssignments: { ...this.furnaceAssignments },
      assignmentStep: this.assignmentStep,
      autoAssignFlags: { ...this.autoAssignFlags },
      autoAssignWeights: { ...this.autoAssignWeights }
    };
  }

  loadState(state = {}) {
    super.loadState(state);
    this.isRunning = state.isRunning === true;
    this.expansionProgress = state.expansionProgress || 0;
    this.furnaceAssignments = { ...(state.furnaceAssignments || {}) };
    this.assignmentStep = state.assignmentStep || 1;
    this.autoAssignFlags = { ...(state.autoAssignFlags || {}) };
    this.autoAssignWeights = { ...(state.autoAssignWeights || {}) };
    this.normalizeAssignments();
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
      furnaceAssignments: { ...this.furnaceAssignments },
      assignmentStep: this.assignmentStep,
      autoAssignFlags: { ...this.autoAssignFlags },
      autoAssignWeights: { ...this.autoAssignWeights }
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
    this.furnaceAssignments = { ...(state.furnaceAssignments || {}) };
    this.assignmentStep = state.assignmentStep || 1;
    this.autoAssignFlags = { ...(state.autoAssignFlags || {}) };
    this.autoAssignWeights = { ...(state.autoAssignWeights || {}) };
    this.isCompleted = false;
    this.setLastRunStats(0, {});
    this.updateStatus(
      this.isRunning
        ? getNuclearAlchemyText('ui.projects.nuclearAlchemy.status.idle', 'Idle')
        : getNuclearAlchemyText('ui.projects.nuclearAlchemy.status.runDisabled', 'Run disabled')
    );
    this.normalizeAssignments();
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
