class ContinuousExpansionProject extends TerraformingDurationProject {
  constructor(config, name) {
    super(config, name);
    this.continuousThreshold = this.continuousThreshold || 1000;
  }

  isExpansionContinuous() {
    return this.getEffectiveDuration() < this.continuousThreshold;
  }

  isContinuous() {
    return this.isExpansionContinuous();
  }

  startContinuousExpansion(resources) {
    if (!this.isExpansionContinuous()) {
      return super.start(resources);
    }
    if (!this.canStart(resources)) {
      return false;
    }
    this.isActive = true;
    this.isPaused = false;
    this.isCompleted = false;
    this.startingDuration = Infinity;
    this.remainingTime = Infinity;
    return true;
  }

  getExpansionProgressField() {
    return 'expansionProgress';
  }

  getExpansionCompletedField() {
    return 'repeatCount';
  }

  getExpansionLimit() {
    return this.maxRepeatCount || Infinity;
  }

  getExpansionProgressValue(progressField = this.getExpansionProgressField()) {
    return Math.max(0, this[progressField] || 0);
  }

  setExpansionProgressValue(value, progressField = this.getExpansionProgressField()) {
    this[progressField] = Math.max(0, value || 0);
  }

  getExpansionCompletedValue(completedField = this.getExpansionCompletedField()) {
    return Math.max(0, this[completedField] || 0);
  }

  setExpansionCompletedValue(value, completedField = this.getExpansionCompletedField()) {
    this[completedField] = Math.max(0, value || 0);
  }

  getExpansionCompletedTotal(options = {}) {
    const completedField = options.completedField || this.getExpansionCompletedField();
    const progressField = options.progressField || this.getExpansionProgressField();
    return this.getExpansionCompletedValue(completedField) + this.getExpansionProgressValue(progressField);
  }

  getRemainingExpansionCapacity(options = {}) {
    const limit = options.limit === undefined ? this.getExpansionLimit() : options.limit;
    if (limit === Infinity) {
      return Infinity;
    }
    return Math.max(0, limit - this.getExpansionCompletedTotal(options));
  }

  createExpansionStorageState(accumulatedChanges = null, options = {}) {
    if (!this.attributes?.canUseSpaceStorage) {
      return null;
    }
    const storageProj = projectManager?.projects?.spaceStorage;
    if (!storageProj) {
      return null;
    }
    const getStoragePending = (resourceKey) => accumulatedChanges?.spaceStorage?.[resourceKey] ?? 0;
    const reconcileOnDirectSpend = options.reconcileOnDirectSpend === true;
    return {
      storageProject: storageProj,
      megaProjectResourceMode: storageProj.megaProjectResourceMode,
      getAvailableStoredResource: (resourceKey) => {
        const available = storageProj.getAvailableStoredResource(resourceKey);
        return Math.max(0, available + getStoragePending(resourceKey));
      },
      spendStoredResource: (resourceKey, amount) => {
        if (!(amount > 0)) {
          return 0;
        }
        if (!accumulatedChanges) {
          const spent = storageProj.spendStoredResource(resourceKey, amount);
          if (reconcileOnDirectSpend) {
            storageProj.reconcileUsedStorage?.();
          }
          return spent;
        }
        const available = Math.max(0, storageProj.getAvailableStoredResource(resourceKey) + getStoragePending(resourceKey));
        const spent = Math.min(amount, available);
        if (!(spent > 0)) {
          return 0;
        }
        accumulatedChanges.spaceStorage ||= {};
        if (accumulatedChanges.spaceStorage[resourceKey] === undefined) {
          accumulatedChanges.spaceStorage[resourceKey] = 0;
        }
        accumulatedChanges.spaceStorage[resourceKey] -= spent;
        return spent;
      },
    };
  }

  getAffordableExpansionProgress(requestedProgress, cost, storageState, accumulatedChanges = null) {
    if (!(requestedProgress > 0)) {
      return 0;
    }
    let affordableProgress = requestedProgress;
    for (const category in cost) {
      for (const resource in cost[category]) {
        const baseCost = cost[category][resource];
        if (!(baseCost > 0)) {
          continue;
        }
        const pending = accumulatedChanges?.[category]?.[resource] ?? 0;
        const colonyAvailable = (resources?.[category]?.[resource]?.value || 0) + pending;
        const storageKey = resource === 'water' ? 'liquidWater' : resource;
        const availableTotal = getMegaProjectResourceAvailability(
          storageState,
          storageKey,
          colonyAvailable
        );
        affordableProgress = Math.min(affordableProgress, availableTotal / baseCost);
      }
    }
    return Math.max(0, Math.min(requestedProgress, affordableProgress));
  }

  getContinuousExpansionTickState(deltaTime = 1000, options = {}) {
    const progressOptions = options.progressOptions || {};
    const capacityOptions = options.capacityOptions || progressOptions;
    const duration = this.getEffectiveDuration();
    if (!duration || duration === Infinity) {
      return { ready: false, duration };
    }

    if (this.getRemainingExpansionCapacity(capacityOptions) <= 0) {
      if (options.applyZeroProgressOnCap !== false) {
        this.applyExpansionProgress(0, progressOptions);
      }
      return { ready: false, duration };
    }

    this.carryDiscreteExpansionProgress(progressOptions);
    const remainingRepeats = this.getRemainingExpansionCapacity(capacityOptions);
    if (!(remainingRepeats > 0) || !this.isActive) {
      return { ready: false, duration, remainingRepeats };
    }

    const progressScale = options.progressScale || 1;
    const requestedProgress = Math.min((deltaTime / duration) * progressScale, remainingRepeats);
    if (!(requestedProgress > 0)) {
      return { ready: false, duration, remainingRepeats, requestedProgress: 0 };
    }

    return {
      ready: true,
      duration,
      remainingRepeats,
      requestedProgress,
      seconds: deltaTime / 1000,
    };
  }

  applyExpansionColonyChange(category, resource, amount, accumulatedChanges = null) {
    if (!(amount > 0)) {
      return;
    }
    if (accumulatedChanges) {
      accumulatedChanges[category] ||= {};
      if (accumulatedChanges[category][resource] === undefined) {
        accumulatedChanges[category][resource] = 0;
      }
      accumulatedChanges[category][resource] -= amount;
      return;
    }
    resources[category][resource].decrease(amount);
  }

  applyExpansionCostForProgress(cost, progress, accumulatedChanges = null, storageState = null) {
    const spentColonyByCategory = {};
    const spentStorageByKey = {};
    let shortfall = false;

    for (const category in cost) {
      for (const resource in cost[category]) {
        const amount = cost[category][resource] * progress;
        if (!(amount > 0)) {
          continue;
        }
        const resourceEntry = resources[category][resource];
        const storageKey = resource === 'water' ? 'liquidWater' : resource;
        const pending = accumulatedChanges?.[category]?.[resource] ?? 0;
        const colonyAvailable = Math.max(resourceEntry.value + pending, 0);
        const allocation = getMegaProjectResourceAllocation(storageState, storageKey, amount, colonyAvailable);

        let spentFromStorage = 0;
        if (allocation.fromStorage > 0 && storageState?.spendStoredResource) {
          spentFromStorage = storageState.spendStoredResource(storageKey, allocation.fromStorage);
        }

        const remainingAfterStorage = Math.max(0, amount - spentFromStorage);
        const spendFromColony = Math.min(colonyAvailable, remainingAfterStorage);
        if (spendFromColony > 0) {
          this.applyExpansionColonyChange(category, resource, spendFromColony, accumulatedChanges);
          spentColonyByCategory[category] ||= {};
          spentColonyByCategory[category][resource] =
            (spentColonyByCategory[category][resource] || 0) + spendFromColony;
        }
        if (spentFromStorage > 0) {
          spentStorageByKey[storageKey] = (spentStorageByKey[storageKey] || 0) + spentFromStorage;
        }
        if (spentFromStorage + spendFromColony + 1e-9 < amount) {
          shortfall = true;
        }
      }
    }

    return {
      shortfall,
      spentColonyByCategory,
      spentStorageByKey,
    };
  }

  applyExpansionSpentRates(spentColonyByCategory, spentStorageByKey, seconds, sourceLabel) {
    if (!(seconds > 0)) {
      return;
    }
    for (const category in spentColonyByCategory) {
      for (const resource in spentColonyByCategory[category]) {
        const spent = spentColonyByCategory[category][resource];
        if (spent > 0) {
          resources[category][resource].modifyRate(
            -(spent / seconds),
            sourceLabel,
            'project'
          );
        }
      }
    }
    for (const storageKey in spentStorageByKey) {
      const spent = spentStorageByKey[storageKey];
      if (spent > 0) {
        resources?.spaceStorage?.[storageKey]?.modifyRate?.(
          -(spent / seconds),
          sourceLabel,
          'project'
        );
      }
    }
  }

  applyRequestedExpansionProgress(requestedProgress, cost, accumulatedChanges = null, options = {}) {
    const normalizedRequested = Math.max(0, requestedProgress || 0);
    const result = {
      requestedProgress: normalizedRequested,
      progress: 0,
      resourceShortfall: false,
      shortfall: false,
      applied: false,
      spent: {
        shortfall: false,
        spentColonyByCategory: {},
        spentStorageByKey: {},
      },
      storageState: options.storageState || null,
      progressResult: null,
    };
    if (!(normalizedRequested > 0)) {
      return result;
    }

    const storageState = result.storageState || this.createExpansionStorageState(
      accumulatedChanges,
      options.storageOptions || {}
    );
    result.storageState = storageState;

    const progress = this.getAffordableExpansionProgress(
      normalizedRequested,
      cost,
      storageState,
      accumulatedChanges
    );
    result.progress = progress;
    result.resourceShortfall = progress + 1e-9 < normalizedRequested;
    result.shortfall = result.resourceShortfall;
    if (!(progress > 0)) {
      return result;
    }

    const spent = this.applyExpansionCostForProgress(cost, progress, accumulatedChanges, storageState);
    result.spent = spent;
    result.shortfall = result.shortfall || spent.shortfall;

    const seconds = options.seconds || 0;
    if (options.applyRates === true && seconds > 0) {
      const sourceLabel = options.rateSourceLabel || this.displayName || this.name;
      this.applyExpansionSpentRates(
        spent.spentColonyByCategory,
        spent.spentStorageByKey,
        seconds,
        sourceLabel
      );
    }

    if (options.applyProgress) {
      result.progressResult = options.applyProgress.call(this, progress, options.progressOptions || {});
    } else {
      result.progressResult = this.applyExpansionProgress(progress, options.progressOptions || {});
    }

    if (options.onApplied) {
      options.onApplied.call(this, result);
    }
    result.applied = true;
    return result;
  }

  estimateExpansionCostForProgress(
    cost,
    progress,
    deltaTime = 1000,
    accumulatedChanges = null,
    storageState = null,
    options = {}
  ) {
    const totals = {};
    if (!(progress > 0)) {
      return totals;
    }

    const applyRates = options.applyRates === true;
    const sourceLabel = options.sourceLabel || this.displayName || this.name;
    const perSecondFactor = deltaTime > 0 ? 1000 / deltaTime : 0;

    for (const category in cost) {
      totals[category] ||= {};
      for (const resource in cost[category]) {
        const baseCost = cost[category][resource];
        const tickAmount = baseCost * progress;
        const resourceEntry = resources?.[category]?.[resource];
        const storageKey = resource === 'water' ? 'liquidWater' : resource;
        const pending = accumulatedChanges?.[category]?.[resource] ?? 0;
        const colonyAvailable = (resourceEntry?.value || 0) + pending;
        const allocation = getMegaProjectResourceAllocation(
          storageState,
          storageKey,
          tickAmount,
          Math.max(colonyAvailable, 0)
        );

        if (applyRates) {
          const colonyRate = Math.min(allocation.fromColony, Math.max(colonyAvailable, 0)) * perSecondFactor;
          if (colonyRate > 0) {
            resourceEntry?.modifyRate?.(-colonyRate, sourceLabel, 'project');
          }
          const storageRate = Math.max(allocation.fromStorage, 0) * perSecondFactor;
          if (storageRate > 0) {
            resources?.spaceStorage?.[storageKey]?.modifyRate?.(
              -storageRate,
              sourceLabel,
              'project'
            );
          }
        }

        totals[category][resource] = (totals[category][resource] || 0) + tickAmount;
      }
    }

    return totals;
  }

  mergeResourceTotals(targetTotals = {}, sourceTotals = {}) {
    for (const category in sourceTotals) {
      targetTotals[category] ||= {};
      for (const resource in sourceTotals[category]) {
        targetTotals[category][resource] =
          (targetTotals[category][resource] || 0) + sourceTotals[category][resource];
      }
    }
    return targetTotals;
  }

  applyFractionalProgress(progress, options = {}) {
    const completedField = options.completedField || this.getExpansionCompletedField();
    const progressField = options.progressField || this.getExpansionProgressField();
    const limit = options.limit === undefined ? this.getExpansionLimit() : options.limit;

    const requestedProgress = Math.max(0, progress || 0);
    let completedValue = this.getExpansionCompletedValue(completedField);
    let progressValue = this.getExpansionProgressValue(progressField);
    let appliedProgress = requestedProgress;
    let capped = false;

    if (limit !== Infinity) {
      const remaining = Math.max(0, limit - (completedValue + progressValue));
      if (remaining <= 0) {
        this.setExpansionCompletedValue(completedValue, completedField);
        this.setExpansionProgressValue(Math.max(0, limit - completedValue), progressField);
        return {
          appliedProgress: 0,
          completedDelta: 0,
          capped: true,
          completedValue,
          progressValue: this.getExpansionProgressValue(progressField),
        };
      }
      if (appliedProgress > remaining) {
        appliedProgress = remaining;
        capped = true;
      }
    }

    const total = progressValue + appliedProgress;
    const completedDelta = Math.floor(total);
    completedValue += completedDelta;
    progressValue = total - completedDelta;

    if (limit !== Infinity && completedValue + progressValue >= limit) {
      capped = true;
      progressValue = Math.max(0, limit - completedValue);
    }

    this.setExpansionCompletedValue(completedValue, completedField);
    this.setExpansionProgressValue(progressValue, progressField);

    return {
      appliedProgress,
      completedDelta,
      capped,
      completedValue,
      progressValue,
    };
  }

  applyExpansionProgress(progress, options = {}) {
    const result = this.applyFractionalProgress(progress, options);
    if (result.capped) {
      if (options.deactivateOnCap !== false) {
        this.isActive = false;
      }
      if (options.completeOnCap !== false) {
        this.isCompleted = true;
      }
    }
    return result;
  }

  carryDiscreteExpansionProgress(options = {}) {
    if (this.startingDuration === Infinity || this.remainingTime === Infinity || this.startingDuration <= 0) {
      return {
        appliedProgress: 0,
        completedDelta: 0,
        capped: false,
      };
    }
    const carried = (this.startingDuration - this.remainingTime) / this.startingDuration;
    const result = carried > 0
      ? this.applyExpansionProgress(carried, options)
      : {
          appliedProgress: 0,
          completedDelta: 0,
          capped: false,
        };
    this.startingDuration = Infinity;
    this.remainingTime = Infinity;
    return result;
  }
}

try {
  window.ContinuousExpansionProject = ContinuousExpansionProject;
} catch (error) {}

try {
  module.exports = ContinuousExpansionProject;
} catch (error) {}
