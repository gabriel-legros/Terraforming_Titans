class UndergroundExpansionProject extends AndroidProject {
  constructor(config, name) {
    super(config, name);
    // Track fractional progress for continuous mode
    this.fractionalRepeatCount = 0;
    this.prepaidPortion = 0;
  }

  getScaledCost() {
    return super.getScaledCost();
  }

  start(resources) {
    this.fractionalRepeatCount = 0;
    this.prepaidPortion = 0;

    if (this.isContinuous()) {
      if (!this.canStart()) {
        return false;
      }
      const duration = this.getEffectiveDuration();
      this.startingDuration = duration;
      this.remainingTime = duration;
      this.isActive = true;
      this.isPaused = false;
      return true;
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

  getBaseLand() {
    return terraforming.initialLand || 0;
  }

  getPerCompletionLand() {
    return 1;
  }

  getMaxRepeats() {
    const maxRepeats = Math.max(Math.floor(this.getBaseLand()), 0);
    this.maxRepeatCount = maxRepeats;
    return maxRepeats;
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
      this.isCompleted = true;
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
      this.isCompleted = true;
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
      this.isCompleted = true;
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
      this.isCompleted = true;
      return;
    }

    const progress = Math.min((deltaTime / duration) * productivity, remainingRepeats);
    const prepaidCovered = Math.min(progress, this.prepaidPortion);
    const requestedCostPortion = Math.max(0, progress - prepaidCovered);
    this.prepaidPortion = Math.max(0, this.prepaidPortion - progress);

    const cost = this.getScaledCost();
    let shortfall = false;
    let paidCostPortion = requestedCostPortion;

    if (requestedCostPortion > 0) {
      let maxAffordablePortion = requestedCostPortion;
      for (const category in cost) {
        for (const resource in cost[category]) {
          const perCompletionCost = cost[category][resource];
          if (perCompletionCost <= 0) {
            continue;
          }
          const pendingChange = accumulatedChanges && accumulatedChanges[category] && accumulatedChanges[category][resource] !== undefined
            ? accumulatedChanges[category][resource]
            : 0;
          const available = Math.max(0, (resources[category][resource].value || 0) + pendingChange);
          const affordablePortion = available / perCompletionCost;
          maxAffordablePortion = Math.min(maxAffordablePortion, affordablePortion);
        }
      }
      paidCostPortion = Math.max(0, Math.min(requestedCostPortion, maxAffordablePortion));
      shortfall = paidCostPortion < requestedCostPortion;
    }

    if (paidCostPortion > 0) {
      for (const category in cost) {
        for (const resource in cost[category]) {
          const amount = cost[category][resource] * paidCostPortion;
          if (accumulatedChanges) {
            if (!accumulatedChanges[category]) accumulatedChanges[category] = {};
            if (accumulatedChanges[category][resource] === undefined) {
              accumulatedChanges[category][resource] = 0;
            }
            accumulatedChanges[category][resource] -= amount;
          } else {
            resources[category][resource].decrease(amount);
          }
        }
      }
    }

    const totalPaidProgress = prepaidCovered + paidCostPortion;
    const completed = this.applyContinuousProgress(totalPaidProgress);
    if (completed > 0) {
      this.prepaidPortion = 0;
    }
    this.shortfallLastTick = shortfall;
  }

  estimateCostAndGain(deltaTime = 1000, applyRates = true, productivity = 1, accumulatedChanges = null) {
    const totals = super.estimateCostAndGain(deltaTime, applyRates, productivity, accumulatedChanges);

    if (!this.isContinuous() || !this.isActive) {
      return totals;
    }

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

    const seconds = deltaTime / 1000;
    const progressForRate = Math.min((deltaTime / duration) * productivity, remainingRepeats);
    const landRate = seconds > 0 ? (progressForRate * perCompletionLand) / seconds : 0;
    if (landRate > 0 && applyRates && this.showsInResourcesRate()) {
      resources.surface.land.modifyRate(landRate, this.displayName, 'project');
    }

    const progressForTotals = Math.min(deltaTime / duration, remainingRepeats);
    if (!totals.gain.surface) {
      totals.gain.surface = {};
    }
    totals.gain.surface.land = (totals.gain.surface.land || 0) + (progressForTotals * perCompletionLand);

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
      const maxLand = this.getBaseLand();
      const perCompletion = this.getPerCompletionLand();
      const expanded = Math.min(this.getTotalProgress() * perCompletion, maxLand);
      elements.repeatCountElement.textContent = `Land Expansion: ${formatNumber(expanded, true, 3)} / ${formatNumber(maxLand, true, 3)}`;
    }
  }

  complete() {
    this.fractionalRepeatCount = 0;
    this.prepaidPortion = 0;
    super.complete();
  }

  saveState() {
    return {
      ...super.saveState(),
      fractionalRepeatCount: this.fractionalRepeatCount,
      prepaidPortion: this.prepaidPortion,
    };
  }

  loadState(state) {
    super.loadState(state);
    this.fractionalRepeatCount = state.fractionalRepeatCount || 0;
    this.prepaidPortion = state.prepaidPortion || 0;
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.UndergroundExpansionProject = UndergroundExpansionProject;
}

if (typeof module !== 'undefined') {
  module.exports = UndergroundExpansionProject;
}
