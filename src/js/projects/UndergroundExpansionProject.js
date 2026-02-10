class UndergroundExpansionProject extends AndroidProject {
  constructor(config, name) {
    super(config, name);
    // Track fractional progress for continuous mode
    this.fractionalRepeatCount = 0;
    this.prepaidPortion = 0;
  }

  getScaledCost() {
    const cost = super.getScaledCost();
    const land = this.getBaseLand();
    if (!land) {
      return cost;
    }
    const scaledCost = {};
    for (const category in cost) {
      scaledCost[category] = {};
      for (const resource in cost[category]) {
        scaledCost[category][resource] = cost[category][resource] * land;
      }
    }
    return scaledCost;
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
    let costPortion = Math.max(0, progress - this.prepaidPortion);
    this.prepaidPortion = Math.max(0, this.prepaidPortion - progress);

    const cost = this.getScaledCost();
    let shortfall = false;

    if (costPortion > 0) {
      for (const category in cost) {
        for (const resource in cost[category]) {
          const amount = cost[category][resource] * costPortion;
          const available = resources[category][resource].value || 0;
          if (available < amount) {
            shortfall = true;
          }
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

    const completed = this.applyContinuousProgress(progress);
    if (completed > 0) {
      this.prepaidPortion = 0;
    }
    this.shortfallLastTick = shortfall;
  }

  getAndroidSpeedMultiplier() {
    return 1 + Math.sqrt(this.assignedAndroids || 0);
  }

  getAndroidSpeedTooltip() {
    return '1 + sqrt(androids assigned)';
  }

  updateUI() {
    super.updateUI();
    const elements = projectElements[this.name];
    if (elements?.repeatCountElement) {
      const maxLand = this.getBaseLand();
      const perCompletion = this.getPerCompletionLand();
      const expanded = Math.min(this.getTotalProgress() * perCompletion, maxLand);
      elements.repeatCountElement.textContent = `Land Expansion: ${formatNumber(expanded, true)} / ${formatNumber(maxLand, true)}`;
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
