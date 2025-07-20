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
}

if (typeof globalThis !== 'undefined') {
  globalThis.DeeperMiningProject = DeeperMiningProject;
}

if (typeof module !== 'undefined') {
  module.exports = DeeperMiningProject;
}
