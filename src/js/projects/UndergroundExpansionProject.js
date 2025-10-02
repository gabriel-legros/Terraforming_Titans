class UndergroundExpansionProject extends AndroidProject {
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
    return Project.prototype.canStart.call(this);
  }

  getAndroidSpeedMultiplier() {
    const initialLand = Math.max((typeof terraforming !== 'undefined' ? terraforming.initialLand : 0), 1);
    return 1 + Math.sqrt((10000*this.assignedAndroids || 0) / initialLand);
  }

  renderUI(container) {
    super.renderUI(container);
    const elements = projectElements[this.name];
    if (elements?.androidSpeedDisplay) {
      elements.androidSpeedDisplay.title = '1 + sqrt(10000*androids assigned / initial land)';
    }
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
}

if (typeof globalThis !== 'undefined') {
  globalThis.UndergroundExpansionProject = UndergroundExpansionProject;
}

if (typeof module !== 'undefined') {
  module.exports = UndergroundExpansionProject;
}
