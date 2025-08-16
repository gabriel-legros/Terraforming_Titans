class UndergroundExpansionProject extends AndroidProject {
  getScaledCost() {
    const cost = super.getScaledCost();
    const land = (resources?.surface?.land?.value) || 0;
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
    return Project.prototype.canStart.call(this);
  }

  updateUI() {
    super.updateUI();
    const elements = projectElements[this.name];
    if (elements?.repeatCountElement && typeof terraforming !== 'undefined') {
      const maxLand = terraforming.initialLand || 0;
      const perCompletion = maxLand / 1000;
      const expanded = Math.min(this.repeatCount * perCompletion, maxLand);
      elements.repeatCountElement.textContent = `Land Expansion: ${formatNumber(expanded, true)} / ${formatNumber(maxLand, true)}`;
    }
  }

  complete() {
    super.complete();
    if (typeof terraforming !== 'undefined' && resources?.surface?.land) {
      const increase = (terraforming.initialLand || 0) / 1000;
      resources.surface.land.increase(increase);
    }
  }
}

if (typeof globalThis !== 'undefined') {
  globalThis.UndergroundExpansionProject = UndergroundExpansionProject;
}

if (typeof module !== 'undefined') {
  module.exports = UndergroundExpansionProject;
}
