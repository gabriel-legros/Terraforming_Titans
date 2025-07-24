class DeeperMiningProject extends AndroidProject {
  constructor(config, name) {
    super(config, name);
    this.oreMineCount = 0;
    this.averageDepth = 1;
    this.maxDepth = config.maxDepth || Infinity;
  }

  registerMine() {
    let current = this.oreMineCount;
    let built = 0;
    if (typeof buildings !== 'undefined' && buildings.oreMine) {
      built = buildings.oreMine.count;
    } else if (typeof globalThis !== 'undefined' && globalThis.buildings?.oreMine) {
      built = globalThis.buildings.oreMine.count;
    }
    const delta = built - current;
    if (delta > 0) {
      const totalDepth = this.averageDepth * current;
      this.oreMineCount = built;
      this.averageDepth = (totalDepth + delta) / this.oreMineCount;
    }
  }

  canStart() {
    if (this.averageDepth >= this.maxDepth) {
      return false;
    }
    return super.canStart();
  }

  getScaledCost() {
    let cost = super.getScaledCost();
    if (this.attributes.costOreMineScaling) {
      const oreMines = Math.max(this.oreMineCount, 1);
      const depth = this.averageDepth;
      const multiplier = oreMines * (0.9 + 0.1 * depth);
      const scaledCost = {};
      for (const category in cost) {
        scaledCost[category] = {};
        for (const resource in cost[category]) {
          scaledCost[category][resource] = cost[category][resource] * multiplier;
        }
      }
      return scaledCost;
    }
    return cost;
  }

  updateUI() {
    super.updateUI();
    const elements = projectElements[this.name];
    if (elements?.androidSpeedDisplay) {
      const mult = this.getAndroidSpeedMultiplier();
      elements.androidSpeedDisplay.textContent = `Deepening speed boost x${formatNumber(mult, true)}`;
    }
  }

  renderUI(container) {
    super.renderUI(container);
    const elements = projectElements[this.name];
    if (elements?.costElement) {
      const info = document.createElement('span');
      info.classList.add('info-tooltip-icon');
      info.title = '90% of the cost scales with ore mines built. 10% also scales with average depth.';
      info.innerHTML = '&#9432;';
      elements.costElement.appendChild(info);
    }
  }

  applyCompletionEffect() {
    this.attributes.completionEffect.forEach((effect) => {
      const scaledEffect = { ...effect };

      // Apply effect scaling if the attribute is enabled
      if (this.attributes.effectScaling) {
        const baseValue = effect.value; // Use the base value from the project definition
        const n = this.repeatCount; // Total completions
        scaledEffect.value = (baseValue) * n * (n+1)/2 + 1; // Compute scaled value

        // Use addAndReplace to replace any existing effect with the same effectId
        addEffect({ ...scaledEffect, sourceId: this });
      } else {
        // If effectScaling is not enabled, add the effect normally
        addEffect({ ...effect, sourceId: this });
      }
    });
  }

  complete() {
    if (this.averageDepth < this.maxDepth) {
      this.averageDepth = Math.min(this.averageDepth + 1, this.maxDepth);
      super.complete();
      if (this.averageDepth >= this.maxDepth) {
        this.isCompleted = true;
      }
    }
  }

  saveState() {
    return {
      ...super.saveState(),
      oreMineCount: this.oreMineCount,
      averageDepth: this.averageDepth,
    };
  }

  loadState(state) {
    super.loadState(state);
    this.oreMineCount = state.oreMineCount || 0;
    this.averageDepth = state.averageDepth || 1;
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.DeeperMiningProject = DeeperMiningProject;
}

if (typeof module !== 'undefined') {
  module.exports = DeeperMiningProject;
}
