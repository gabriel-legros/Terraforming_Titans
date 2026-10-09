class UndergroundExpansionProject extends AndroidProject {
  constructor(config, name) {
    super(config, name);
    // Track fractional progress for continuous mode
    this.fractionalRepeatCount = 0;
    this.prepaidPortion = 0;
    this.dynamicMassGraceBase = -1;
  }

  getExpansionUnitCost() {
    const cost = super.getScaledCost();
    if (this.requiresArtificialUnderground()) {
      const artificialCost = this.attributes.artificialUndergroundCost;
      for (const category in artificialCost) {
        cost[category] ||= {};
        for (const resource in artificialCost[category]) {
          const multiplier = this.getEffectiveCostMultiplier(category, resource);
          cost[category][resource] = (cost[category][resource] || 0)
            + artificialCost[category][resource] * multiplier;
        }
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

  hasIncompleteCrustBlocker() {
    if (!this.isBooleanFlagSet('shiivertArtificialUnderground')
        || !hasGeologicalAccessBlockingHeat(terraforming, currentPlanetParameters)) {
      return false;
    }

    const heatShares = getGeologicalHeatLandReservationShares(terraforming);
    return heatShares.coreHeatFlux > 0 || heatShares.fusionFlux > 0;
  }

  getWarningState() {
    if (!this.hasIncompleteCrustBlocker()) {
      return null;
    }
    return {
      blocksStart: true,
      blocksProgress: true,
      message: t(
        'ui.projects.undergroundExpansion.incompleteCrustWarning',
        null,
        'A complete crust is required before Underground Land Expansion can begin or continue.'
      ),
      statusText: t(
        'ui.projects.undergroundExpansion.incompleteCrustStatus',
        null,
        'Blocked: complete the crust first'
      )
    };
  }

  canStart() {
    if (this.repeatCount >= this.getMaxRepeats()) {
      return false;
    }
    return Project.prototype.canStart.call(this);
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
    return Math.max(0, limit - this.repeatCount - this.fractionalRepeatCount);
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

  applyContinuousProgress(progress) {
    const result = this.applyFractionalProgress(progress);
    // Dynamic-mass worlds may grant one more repeat after reaching the raw limit.
    if (!this.getRemainingRepeats()) {
      this.isActive = false;
      this.fractionalRepeatCount = 0;
      this.prepaidPortion = 0;
    }
    return result.completedDelta;
  }

  applyCostAndGain(deltaTime = 1000, accumulatedChanges, productivity = 1) {
    if (!this.isContinuous() || !this.isActive || this.isPaused) return;
    const result = this.applyRequestedExpansionProgress(
      deltaTime / this.getEffectiveDuration() * productivity, this.getConsumableCost(), accumulatedChanges, {
        remaining() { return this.getContinuousProgressAllowance(); },
        applyRates: this.showsInResourcesRate(), seconds: deltaTime / 1000,
      });
    this.shortfallLastTick = result.shortfall;
  }

  estimateCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
    if (this.isPaused) return { cost: {}, gain: {} };
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

    const estimate = this.estimateRequestedExpansionProgress(
      deltaTime / duration * productivity, this.getConsumableCost(), deltaTime, accumulatedChanges, {
        remaining() { return this.getContinuousProgressAllowance(); },
        applyRates: applyRates && this.showsInResourcesRate(), sourceLabel: this.getRateSource()
      });
    totals.cost = estimate.cost;
    const progress = estimate.progress;
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
    this.isActive = false;
    this.isPaused = false;

    this.applyContinuousProgress(this.prepaidPortion || (1 - this.fractionalRepeatCount));
    this.prepaidPortion = 0;
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

ContinuousExpansionProject.applyCapabilityTo(UndergroundExpansionProject, {
  progressField: 'fractionalRepeatCount', prepaidField: 'prepaidPortion',
  applyProgress(progress) { return this.applyContinuousProgress(progress); },
  limit() { return this.getMaxRepeats(); }
});

if (typeof globalThis !== 'undefined') {
  globalThis.UndergroundExpansionProject = UndergroundExpansionProject;
}

if (typeof module !== 'undefined') {
  module.exports = UndergroundExpansionProject;
}
