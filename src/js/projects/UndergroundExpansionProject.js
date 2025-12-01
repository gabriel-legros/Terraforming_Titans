class UndergroundExpansionProject extends AndroidProject {
  constructor(config, name) {
    super(config, name);
    // Track fractional progress for continuous mode
    this.fractionalRepeatCount = 0;
  }

  getScaledCost() {
    const cost = super.getScaledCost();
    const land = (terraforming.initialLand) || 0;
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

  canStart() {
    if (this.repeatCount >= this.maxRepeatCount) {
      return false;
    }
    return super.canStart();
  }

  canContinue() {
    return this.repeatCount < this.maxRepeatCount;
  }

  applyContinuousProgress(fraction, productivity) {
    const progress = fraction * productivity;
    this.fractionalRepeatCount += progress;
    
    // When we accumulate a full repeat, trigger completion
    while (this.fractionalRepeatCount >= 1 && this.repeatCount < this.maxRepeatCount) {
      this.fractionalRepeatCount -= 1;
      this.repeatCount++;
      if (this.attributes?.completionEffect) {
        this.attributes.completionEffect.forEach((effect) => {
          addEffect({ ...effect, sourceId: this });
        });
      }
    }

    if (this.repeatCount >= this.maxRepeatCount) {
      this.isActive = false;
      this.isCompleted = true;
      this.fractionalRepeatCount = 0;
    }
  }

  getAndroidSpeedMultiplier() {
    const initialLand = Math.max((typeof terraforming !== 'undefined' ? terraforming.initialLand : 0), 1);
    return 1 + Math.sqrt((10000*this.assignedAndroids || 0) / initialLand);
  }

  getAndroidSpeedTooltip() {
    return '1 + sqrt(10000*androids assigned / initial land)';
  }

  updateUI() {
    super.updateUI();
    const elements = projectElements[this.name];
    if (elements?.repeatCountElement && typeof terraforming !== 'undefined') {
      const maxLand = terraforming.initialLand || 0;
      const perCompletion = maxLand / 10000;
      const expanded = Math.min(this.repeatCount * perCompletion, maxLand);
      elements.repeatCountElement.textContent = `Land Expansion: ${formatNumber(expanded, true)} / ${formatNumber(maxLand, true)}`;
    }
  }

  complete() {
    super.complete();
  }

  saveState() {
    return {
      ...super.saveState(),
      fractionalRepeatCount: this.fractionalRepeatCount,
    };
  }

  loadState(state) {
    super.loadState(state);
    this.fractionalRepeatCount = state.fractionalRepeatCount || 0;
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.UndergroundExpansionProject = UndergroundExpansionProject;
}

if (typeof module !== 'undefined') {
  module.exports = UndergroundExpansionProject;
}
