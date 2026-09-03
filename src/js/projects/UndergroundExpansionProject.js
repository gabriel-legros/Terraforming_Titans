class UndergroundExpansionProject extends AndroidProject {
  constructor(config, name) {
    super(config, name);
    // Track fractional progress for continuous mode
    this.fractionalRepeatCount = 0;
    this.prepaidPortion = 0;
    this.dynamicMassGraceBase = -1;
  }

  getScaledCost() {
    const cost = super.getScaledCost();
    if (!this.requiresArtificialUnderground()) {
      return cost;
    }

    const artificialCost = this.attributes.artificialUndergroundCost;
    for (const category in artificialCost) {
      cost[category] ||= {};
      for (const resource in artificialCost[category]) {
        const multiplier = this.getEffectiveCostMultiplier(category, resource);
        cost[category][resource] = (cost[category][resource] || 0)
          + artificialCost[category][resource] * multiplier;
      }
    }
    return cost;
  }

  requiresArtificialUnderground() {
    if (!this.isBooleanFlagSet('shiivertArtificialUnderground')) {
      return false;
    }
    return spaceManager.isArtificialWorld()
      || hasGeologicalAccessBlockingHeat(terraforming, currentPlanetParameters);
  }

  start(resources) {
    this.fractionalRepeatCount = 0;
    this.prepaidPortion = 0;

    if (this.isContinuous()) {
      return this.startContinuousExpansion(resources);
    }

    return super.start(resources);
  }

  canStart() {
    if (this.repeatCount >= this.getMaxRepeats()) {
      return false;
    }
    return super.canStart();
  }

  canContinue() {
    return this.repeatCount < this.getMaxRepeats();
  }

  getCapLand() {
    return resolveWorldGeometricLand(terraforming, resources?.surface?.land);
  }

  getPerCompletionLand() {
    return 1;
  }

  shouldShowMaxRepeatState() {
    return false;
  }

  isDynamicMassEnabled() {
    return currentPlanetParameters.specialAttributes?.dynamicMass === true;
  }

  getRawMaxRepeats() {
    return Math.max(Math.floor(this.getCapLand()), 0);
  }

  syncCompletionState() {
    const rawMaxRepeats = this.getRawMaxRepeats();
    if (!this.isDynamicMassEnabled()) {
      this.dynamicMassGraceBase = -1;
      this.maxRepeatCount = rawMaxRepeats;
      this.isCompleted = this.repeatCount >= rawMaxRepeats;
      return rawMaxRepeats;
    }

    if (rawMaxRepeats > this.dynamicMassGraceBase) {
      this.dynamicMassGraceBase = rawMaxRepeats;
    }

    const maxRepeats =
      rawMaxRepeats === this.dynamicMassGraceBase && this.repeatCount >= rawMaxRepeats
        ? rawMaxRepeats + 1
        : rawMaxRepeats;
    this.maxRepeatCount = maxRepeats;
    this.isCompleted = this.repeatCount >= maxRepeats;
    return maxRepeats;
  }

  getMaxRepeats() {
    return this.syncCompletionState();
  }

  getEffectiveDuration() {
    const duration = super.getEffectiveDuration();
    const perCompletionLand = this.getPerCompletionLand();
    if (!perCompletionLand) {
      return duration;
    }
    return duration * perCompletionLand;
  }

  getRemainingRepeats() {
    const limit = this.getMaxRepeats();
    return Math.max(0, limit - this.repeatCount);
  }

  getContinuousProgressAllowance() {
    return this.getRemainingRepeats();
  }

  shouldReportLandExpansion() {
    return true;
  }

  getTotalProgress() {
    const limit = this.getMaxRepeats();
    const total = this.repeatCount + this.fractionalRepeatCount;
    return Math.min(total, limit);
  }

  onEnterContinuousMode(progressRatio) {
    if (!this.isActive) return;

    const remainingRepeats = this.getRemainingRepeats();
    if (!remainingRepeats) {
      this.isActive = false;
      this.fractionalRepeatCount = 0;
      this.prepaidPortion = 0;
      return;
    }

    const appliedProgress = Math.min(progressRatio, remainingRepeats);
    if (appliedProgress > 0) {
      this.applyContinuousProgress(appliedProgress);
    }

    // The upfront discrete cost already covered the current cycle.
    // Skip charging until the carried progress reaches the next repeat.
    this.prepaidPortion = Math.max(0, 1 - Math.min(appliedProgress, 1));
  }

  applyContinuousProgress(progress) {
    const remainingRepeats = this.getRemainingRepeats();
    if (!remainingRepeats) {
      this.isActive = false;
      this.fractionalRepeatCount = 0;
      this.prepaidPortion = 0;
      return 0;
    }

    const cappedProgress = Math.min(progress, remainingRepeats);
    const totalProgress = this.fractionalRepeatCount + cappedProgress;
    const completed = Math.floor(totalProgress);
    const leftover = totalProgress - completed;

    if (completed > 0) {
      this.repeatCount += completed;
    }

    const remainingAfter = this.getRemainingRepeats();
    this.fractionalRepeatCount = remainingAfter ? Math.min(leftover, remainingAfter) : 0;

    if (!remainingAfter) {
      this.isActive = false;
      this.fractionalRepeatCount = 0;
      this.prepaidPortion = 0;
    }

    return completed;
  }

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (!this.isContinuous() || !this.isActive) return;
    if (!this.canContinue()) {
      this.isActive = false;
      return;
    }

    const duration = this.getEffectiveDuration();
    if (!duration || duration === Infinity) {
      this.isActive = false;
      return;
    }

    const remainingRepeats = this.getRemainingRepeats();
    if (!remainingRepeats) {
      this.isActive = false;
      return;
    }

    const progressAllowance = Math.min(
      remainingRepeats,
      this.getContinuousProgressAllowance()
    );
    if (!(progressAllowance > 0)) {
      this.shortfallLastTick = true;
      return;
    }

    const progress = Math.min((deltaTime / duration) * productivity, progressAllowance);
    const prepaidCovered = Math.min(progress, this.prepaidPortion);
    const requestedCostPortion = Math.max(0, progress - prepaidCovered);
    this.prepaidPortion = Math.max(0, this.prepaidPortion - progress);

    const cost = this.getConsumableCost();
    const prepaidCompletions = this.applyContinuousProgress(prepaidCovered);
    const result = this.applyRequestedExpansionProgress(
      requestedCostPortion,
      cost,
      accumulatedChanges,
      {
        applyRates: this.showsInResourcesRate(),
        seconds: deltaTime / 1000,
        rateSourceLabel: this.getRateSource(),
        applyProgress(progress) {
          return this.applyContinuousProgress(progress);
        }
      }
    );
    const completed = prepaidCompletions + (result.progressResult || 0);
    if (completed > 0) {
      this.prepaidPortion = 0;
    }
    this.shortfallLastTick = result.shortfall;
  }

  estimateCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
    if (!this.isContinuous() || !this.isActive) {
      return super.estimateCostAndGain(deltaTime, applyRates, productivity, accumulatedChanges);
    }

    const totals = { cost: {}, gain: {} };
    const duration = this.getEffectiveDuration();
    if (!duration || duration === Infinity) {
      return totals;
    }

    const perCompletionLand = this.getPerCompletionLand();
    if (!(perCompletionLand > 0)) {
      return totals;
    }

    const remainingRepeats = this.getRemainingRepeats();
    if (!remainingRepeats) {
      return totals;
    }

    const progressAllowance = Math.min(
      remainingRepeats,
      this.getContinuousProgressAllowance()
    );
    if (!(progressAllowance > 0)) {
      return totals;
    }

    const requestedProgress = Math.min((deltaTime / duration) * productivity, progressAllowance);
    const prepaidCovered = Math.min(requestedProgress, this.prepaidPortion);
    const requestedCostPortion = Math.max(0, requestedProgress - prepaidCovered);
    const cost = this.getConsumableCost();
    const storageState = this.createExpansionStorageState(accumulatedChanges);
    const paidProgress = this.getAffordableExpansionProgress(
      requestedCostPortion,
      cost,
      storageState,
      accumulatedChanges
    );
    totals.cost = this.estimateExpansionCostForProgress(
      cost,
      paidProgress,
      deltaTime,
      accumulatedChanges,
      storageState,
      {
        applyRates: applyRates && this.showsInResourcesRate(),
        sourceLabel: this.getRateSource()
      }
    );

    const progress = prepaidCovered + paidProgress;
    if (!this.shouldReportLandExpansion()) {
      return totals;
    }
    const seconds = deltaTime / 1000;
    const landRate = seconds > 0 ? (progress * perCompletionLand) / seconds : 0;
    if (landRate > 0 && applyRates && this.showsInResourcesRate()) {
      resources.surface.land.modifyRate(landRate, this.getRateSource(), 'project');
    }

    if (progress > 0) {
      totals.gain.surface = {
        land: progress * perCompletionLand
      };
    }
    return totals;
  }

  getAndroidSpeedMultiplier() {
    return 1 + ((this.assignedAndroids || 0) / 100);
  }

  getAndroidSpeedTooltip() {
    return '1 + (androids assigned / 100)';
  }

  updateUI() {
    super.updateUI();
    const elements = projectElements[this.name];
    if (elements?.repeatCountElement) {
      const maxLand = this.getCapLand();
      const perCompletion = this.getPerCompletionLand();
      const expanded = Math.min(this.getTotalProgress() * perCompletion, maxLand);
      elements.repeatCountElement.textContent = t(
        'ui.projects.undergroundExpansion.landExpansion',
        {
          current: formatNumber(expanded, true, 3),
          max: formatNumber(maxLand, true, 3),
        },
        'Land Expansion: {current} / {max}'
      );
    }
  }

  complete() {
    this.fractionalRepeatCount = 0;
    this.prepaidPortion = 0;
    this.isActive = false;
    this.isPaused = false;

    if (this.repeatCount < this.getMaxRepeats()) {
      this.repeatCount++;
    }
    this.isCompleted = this.repeatCount >= this.getMaxRepeats();
  }

  saveState() {
    return {
      ...super.saveState(),
      fractionalRepeatCount: this.fractionalRepeatCount,
      prepaidPortion: this.prepaidPortion,
      dynamicMassGraceBase: this.dynamicMassGraceBase,
    };
  }

  loadState(state) {
    super.loadState(state);
    this.fractionalRepeatCount = state.fractionalRepeatCount || 0;
    this.prepaidPortion = state.prepaidPortion || 0;
    this.dynamicMassGraceBase = state.dynamicMassGraceBase ?? -1;
    this.syncCompletionState();
  }

  autoAssign() {
    this.syncCompletionState();
    super.autoAssign();
  }

  update(deltaTime) {
    this.syncCompletionState();
    super.update(deltaTime);
  }
}

ContinuousExpansionProject.applyCapabilityTo(UndergroundExpansionProject);

if (typeof globalThis !== 'undefined') {
  globalThis.UndergroundExpansionProject = UndergroundExpansionProject;
}

if (typeof module !== 'undefined') {
  module.exports = UndergroundExpansionProject;
}
