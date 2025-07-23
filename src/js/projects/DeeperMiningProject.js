class DeeperMiningProject extends AndroidProject {
  getScaledCost() {
    let cost = super.getScaledCost();
    if (this.attributes.costOreMineScaling) {
      const oreMines = Math.max((buildings?.oreMine?.count || 0), 1);
      const completions = this.repeatCount + 1;
      const multiplier = oreMines * completions;
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
}

if (typeof globalThis !== 'undefined') {
  globalThis.DeeperMiningProject = DeeperMiningProject;
}

if (typeof module !== 'undefined') {
  module.exports = DeeperMiningProject;
}
